"""Adaptador unificado: misma interfaz para Ollama (local) y APIs cloud.
Soporta tool-calling estilo OpenAI. Devuelve también token usage para métricas."""
from __future__ import annotations
import json
import os
import socket
import urllib.error
import urllib.request
from dataclasses import dataclass


@dataclass
class LLMResponse:
    text: str
    input_tokens: int
    output_tokens: int
    model: str
    # Prompt-cache breakdown (Anthropic). Zero on providers without caching.
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0
    stop_reason: str = ""


def _post(url: str, payload: dict, headers: dict | None = None, timeout: int = 120) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except socket.timeout as e:
        raise TimeoutError(f"request timed out after {timeout}s: {url}") from e
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8", "ignore")[:500]
        except Exception:
            body = ""
        raise ConnectionError(f"HTTP {e.code} from {url}: {body}") from e
    except urllib.error.URLError as e:
        if isinstance(e.reason, socket.timeout):
            raise TimeoutError(f"request timed out after {timeout}s: {url}") from e
        raise ConnectionError(f"cannot reach {url}: {e.reason}") from e


def call_ollama(model: str, prompt: str, system: str = "", endpoint: str = "http://localhost:11434",
                temperature: float = 0, seed: int = 42, max_tokens: int = 4096,
                timeout_s: int = 300) -> LLMResponse:
    endpoint = os.getenv("OLLAMA_HOST", endpoint)
    payload = {
        "model": model,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "keep_alive": "10m",
        "options": {"temperature": temperature, "seed": seed, "num_predict": max_tokens},
    }
    r = _post(f"{endpoint}/api/generate", payload, timeout=timeout_s)
    return LLMResponse(
        text=r.get("response", ""),
        input_tokens=r.get("prompt_eval_count", 0),
        output_tokens=r.get("eval_count", 0),
        model=model,
    )


def call_openai_compatible(model: str, prompt: str, system: str = "",
                           api_key_env: str = "OPENAI_API_KEY",
                           base_url: str = "https://api.openai.com/v1",
                           temperature: float = 0, max_tokens: int = 4096) -> LLMResponse:
    key = os.getenv(api_key_env)
    if not key:
        raise RuntimeError(f"missing env {api_key_env}")
    payload = {
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    r = _post(f"{base_url}/chat/completions", payload,
              headers={"Authorization": f"Bearer {key}"}, timeout=180)
    return LLMResponse(
        text=r["choices"][0]["message"]["content"],
        input_tokens=r.get("usage", {}).get("prompt_tokens", 0),
        output_tokens=r.get("usage", {}).get("completion_tokens", 0),
        model=model,
    )


def call_anthropic(model: str, prompt: str, system: str = "", temperature: float = 0,
                   max_tokens: int = 4096, cache_system: bool = True,
                   cache_context: bool = True,
                   tools: list[dict] | None = None,
                   tool_choice: dict | None = None,
                   thinking_budget_tokens: int = 0) -> LLMResponse:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("missing ANTHROPIC_API_KEY")
    sys_block = None
    if system:
        block: dict = {"type": "text", "text": system}
        if cache_system:
            block["cache_control"] = {"type": "ephemeral"}
        sys_block = [block]

    # Cache the <context> block too — that's where the real token savings are.
    user_content: list[dict] | str = prompt
    if cache_context and "<context>" in prompt and "</context>" in prompt:
        ctx_start = prompt.index("<context>")
        ctx_end = prompt.index("</context>") + len("</context>")
        context_part = prompt[ctx_start:ctx_end]
        rest = prompt[:ctx_start] + prompt[ctx_end:]
        # Only cache if context is large enough to matter (>1024 chars ~ 300 tokens).
        if len(context_part) > 1024:
            user_content = [
                {"type": "text", "text": context_part,
                 "cache_control": {"type": "ephemeral"}},
                {"type": "text", "text": rest},
            ]
    payload: dict = {
        "model": model,
        "system": sys_block,
        "messages": [{"role": "user", "content": user_content}],
        "max_tokens": max_tokens,
    }
    if thinking_budget_tokens <= 0:
        payload["temperature"] = temperature
    if tools:
        payload["tools"] = tools
        if tool_choice:
            payload["tool_choice"] = tool_choice
    if thinking_budget_tokens > 0:
        # Omit visible thinking text for lower latency in non-interactive pipelines.
        payload["thinking"] = {
            "type": "enabled",
            "budget_tokens": thinking_budget_tokens,
            "display": "omitted",
        }
    headers = {"x-api-key": key, "anthropic-version": "2023-06-01"}
    if thinking_budget_tokens > 0:
        headers["anthropic-beta"] = "interleaved-thinking-2025-05-14"
    r = _post("https://api.anthropic.com/v1/messages", payload,
              headers=headers, timeout=180)
    text = "".join(b.get("text", "") for b in r.get("content", []) if b.get("type") == "text")
    u = r.get("usage", {})
    return LLMResponse(
        text=text,
        input_tokens=u.get("input_tokens", 0),
        output_tokens=u.get("output_tokens", 0),
        model=model,
        cache_creation_input_tokens=u.get("cache_creation_input_tokens", 0),
        cache_read_input_tokens=u.get("cache_read_input_tokens", 0),
        stop_reason=r.get("stop_reason", ""),
    )


def dispatch(choice, prompt: str, system: str = "", max_tokens: int = 4096,
             tools: list[dict] | None = None,
             thinking_budget_tokens: int = 0) -> LLMResponse:
    """Entrypoint unico basado en ModelChoice del router.
    Cloud calls retry up to 2 times on transient errors (429, 529, timeouts)."""
    import time as _t

    if choice.tier == "local":
        return call_ollama(choice.model, prompt, system, choice.endpoint or "http://localhost:11434",
                           max_tokens=max_tokens, timeout_s=getattr(choice, "timeout_s", 300))

    # Cloud dispatch with retries for transient errors.
    max_retries = 2
    delay = 1.0
    last_exc: Exception | None = None
    for attempt in range(1, max_retries + 2):
        try:
            if "claude" in choice.model.lower():
                return call_anthropic(choice.model, prompt, system, max_tokens=max_tokens,
                                      tools=tools, thinking_budget_tokens=thinking_budget_tokens)
            if "gemini" in choice.model.lower():
                return call_openai_compatible(
                    choice.model, prompt, system,
                    api_key_env="GEMINI_API_KEY",
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai",
                    max_tokens=max_tokens,
                )
            return call_openai_compatible(choice.model, prompt, system, max_tokens=max_tokens)
        except (TimeoutError, ConnectionError) as exc:
            last_exc = exc
            # Retry only on rate-limit (429) or overloaded (529) or timeout.
            err_msg = str(exc)
            is_transient = ("429" in err_msg or "529" in err_msg
                           or "timed out" in err_msg or "overloaded" in err_msg)
            if not is_transient or attempt > max_retries:
                raise
            _t.sleep(delay)
            delay *= 2
    raise last_exc  # type: ignore[misc]
