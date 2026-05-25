"""Orchestrator: ejecuta un agente con contexto mínimo, cache, router y métricas."""
from __future__ import annotations
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import nullcontext as _nullctx
from pathlib import Path

import yaml

from . import cache, llm, lockfile, logger, memory, resources, router, tokens, validators

ROOT = Path(__file__).resolve().parents[1]
AGENTS_CFG = ROOT / "config" / "agents.yaml"
AGENTS_DIR = ROOT / "agents"

# Hard caps to prevent prompt injection / runaway prompts from external inputs.
_MAX_USER_TASK_CHARS = 8000


def _sanitize_user_task(task: str) -> str:
    """Escape XML-like tags that could break out of the <task> envelope. Cap length."""
    if not task:
        return ""
    import re
    # Replace <task>, </context>, <SYSTEM attr="x">, etc. with HTML-escaped versions.
    cleaned = re.sub(
        r"<(/?)(task|context|draft|system|tools|thinking)\b([^>]*)>",
        r"&lt;\1\2\3&gt;",
        task,
        flags=re.IGNORECASE,
    )
    return cleaned[:_MAX_USER_TASK_CHARS]


def _load_agent(name: str) -> tuple[dict, str]:
    cfg = yaml.safe_load(AGENTS_CFG.read_text())["agents"]
    if name not in cfg:
        raise ValueError(f"agent '{name}' not in agents.yaml")
    spec_file = AGENTS_DIR / f"{name}.agent.md"
    system = spec_file.read_text() if spec_file.exists() else ""
    return cfg[name], system


def run(agent_name: str, user_task: str, extra_needs: list[str] | None = None,
        force_tier: str | None = None) -> dict:
    agent, system = _load_agent(agent_name)
    user_task = _sanitize_user_task(user_task)
    needs = agent["context_needs"] + (extra_needs or [])
    ctx = memory.build_context(needs)

    choice = router.choose(agent["task"], required_ctx=max(256, tokens.estimate_tokens(ctx)),
                           force_tier=force_tier)

    # Cap context using system profile (from `af init`) or sensible defaults.
    profile = router._load_profile()
    if choice.tier == "local":
        sys_res = resources.snapshot()
        if profile:
            base_cap = profile["conditions"]["max_context_chars_local"]
        else:
            base_cap = 4000
        max_ctx_chars = base_cap // 2 if sys_res.ram_pressure else base_cap
    else:
        max_ctx_chars = 60000
    if len(ctx) > max_ctx_chars:
        ctx = ctx[:max_ctx_chars]

    prompt = (
        f"<context>\n{ctx}\n</context>\n\n"
        f"<task>\n{user_task}\n</task>\n\n"
        f"Output: {agent.get('output_format', 'concise text')}. "
        f"Verbose={agent.get('verbose', False)}. Max tokens: {agent['max_tokens_response']}."
    )

    # Hard guard: ensure prompt fits in model's context window.
    max_resp = agent["max_tokens_response"]
    fits, est = tokens.fits_context(prompt, choice.context_window, max_resp)
    if not fits:
        new_prompt, truncated = tokens.truncate_to_fit(prompt, choice.context_window, max_resp)
        if truncated:
            logger.log("agent.prompt_truncated", agent=agent_name, model=choice.model,
                       est_tokens=est, ctx_window=choice.context_window)
            print(f"[orchestrator] prompt {est}tok > ctx {choice.context_window}, truncated")
            prompt = new_prompt

    # Pre-flight cost estimation for cloud tiers.
    if choice.tier.startswith("cloud"):
        est_cost = router.estimate_cost(choice.model, tokens.estimate_tokens(prompt), max_resp)
        if est_cost > 0.50:
            logger.log("agent.expensive_call", agent=agent_name, model=choice.model,
                       est_cost_usd=est_cost)
            print(f"[orchestrator] pre-flight: ~${est_cost:.3f} for {choice.model}")

    cached = cache.get(choice.model, prompt)
    if cached:
        logger.log("agent.cache_hit", agent=agent_name, model=choice.model, tier=choice.tier)
        return {"agent": agent_name, "model": choice.model, "tier": choice.tier,
                "cached": True, "output": cached, "duration_ms": 0}

    started = time.time()
    logger.log("agent.start", agent=agent_name, model=choice.model, tier=choice.tier,
               task=agent["task"], timeout_s=choice.timeout_s, ctx_chars=len(ctx))

    # Agent-level config for extended thinking and tools (optional keys in agents.yaml).
    thinking_budget = agent.get("thinking_budget_tokens", 0) if choice.tier.startswith("cloud") else 0
    agent_tools = agent.get("tools") if choice.tier.startswith("cloud") else None

    # Serialize concurrent CPU-bound calls to avoid Ollama saturation.
    sys_res = resources.snapshot()
    needs_lock = choice.tier == "local" and sys_res.gpu_vram_total_mb == 0
    lock_ctx = lockfile.acquire(timeout_s=choice.timeout_s) if needs_lock else _nullctx()
    with lock_ctx:
        try:
            resp = llm.dispatch(choice, prompt, system=system,
                                max_tokens=agent["max_tokens_response"],
                                tools=agent_tools,
                                thinking_budget_tokens=thinking_budget)
        except (TimeoutError, OSError, ConnectionError) as exc:
            if choice.tier != "local":
                raise
            minimal_prompt = (
                f"<task>\n{user_task}\n</task>\n\n"
                f"Output: {agent.get('output_format', 'concise text')}. "
                f"Max tokens: {agent['max_tokens_response']}."
            )
            try:
                resp = llm.dispatch(choice, minimal_prompt, system=system,
                                    max_tokens=agent["max_tokens_response"])
            except (TimeoutError, OSError, ConnectionError):
                print(f"[orchestrator] local failed twice ({exc.__class__.__name__}), "
                      f"escalating to cloud-mid")
                choice = router.choose(agent["task"],
                                       required_ctx=max(256, len(ctx) // 4),
                                       force_tier="cloud-mid")
                resp = llm.dispatch(choice, prompt, system=system,
                                    max_tokens=agent["max_tokens_response"],
                                    tools=agent_tools,
                                    thinking_budget_tokens=thinking_budget)
    duration_ms = int((time.time() - started) * 1000)

    # Quality gate: validate output format. On failure, attempt draft_and_refine.
    out_format = agent.get("output_format", "")
    ok, reason = validators.validate(out_format, resp.text)
    refined = False
    if not ok and choice.tier == "local":
        routing_cfg = yaml.safe_load(router.ROUTING.read_text())
        dr = routing_cfg.get("draft_and_refine", {})
        if dr.get("enabled") and agent["task"] in dr.get("applies_to", []):
            print(f"[orchestrator] quality gate failed ({reason}), "
                  f"refining via {dr.get('refine_tier', 'cloud-mid')}")
            refine_choice = router.choose(agent["task"],
                                          required_ctx=max(256, tokens.estimate_tokens(ctx)),
                                          force_tier=dr.get("refine_tier", "cloud-mid"))
            refine_prompt = (f"{prompt}\n\n<draft>\n{resp.text}\n</draft>\n\n"
                             f"Refine the draft above to satisfy: {out_format}.")
            try:
                resp = llm.dispatch(refine_choice, refine_prompt, system=system,
                                    max_tokens=agent["max_tokens_response"])
                choice = refine_choice
                refined = True
            except Exception as e:
                print(f"[orchestrator] refine failed: {e}; keeping draft")
        duration_ms = int((time.time() - started) * 1000)

    cache.put(choice.model, prompt, resp.text)
    router.record(agent["task"], choice, resp.input_tokens, resp.output_tokens,
                  duration_ms=duration_ms, cache_hit=False,
                  cache_creation_tokens=getattr(resp, "cache_creation_input_tokens", 0),
                  cache_read_tokens=getattr(resp, "cache_read_input_tokens", 0))
    logger.log("agent.done", agent=agent_name, model=choice.model, tier=choice.tier,
               duration_ms=duration_ms, in_tokens=resp.input_tokens,
               out_tokens=resp.output_tokens,
               cache_creation_tokens=getattr(resp, "cache_creation_input_tokens", 0),
               cache_read_tokens=getattr(resp, "cache_read_input_tokens", 0),
               quality_ok=ok or refined, refined=refined)

    return {"agent": agent_name, "model": choice.model, "tier": choice.tier,
            "cached": False, "input_tokens": resp.input_tokens,
            "output_tokens": resp.output_tokens, "duration_ms": duration_ms,
            "quality_ok": ok or refined, "refined": refined,
            "output": resp.text}


def _run_parallel(jobs: list[tuple[str, str, list[str] | None]]) -> list[dict]:
    """Run agents concurrently. Each job: (agent_name, task, extra_needs)."""
    results: list[dict] = [None] * len(jobs)  # type: ignore
    with ThreadPoolExecutor(max_workers=min(len(jobs), 3)) as ex:
        future_to_idx = {
            ex.submit(run, name, task, extra_needs=needs): i
            for i, (name, task, needs) in enumerate(jobs)
        }
        for fut in as_completed(future_to_idx):
            i = future_to_idx[fut]
            try:
                results[i] = fut.result()
            except Exception as exc:
                results[i] = {"agent": jobs[i][0], "error": str(exc),
                              "tier": "n/a", "model": "n/a"}
    return results


_FEATURE_SLUG_RE = __import__("re").compile(r"[^a-z0-9._-]+")


def _slug(feature: str) -> str:
    return _FEATURE_SLUG_RE.sub("-", feature.strip().lower()).strip("-") or "feature"


def pipeline(feature: str) -> list[dict]:
    """ASDD pipeline: Spec → [BE ∥ FE ∥ DB] → [Tests BE ∥ Tests FE] → QA.
    Downstream phases reference the feature-scoped spec (spec:<slug>), never
    spec:current, to avoid picking the wrong file when other specs race-edit."""
    results: list[dict] = []
    slug = _slug(feature)
    spec_ref = f"spec:{slug}"

    # Phase 1 — Spec (sequential, blocking).
    results.append(run("spec-generator", f"Generate spec for: {feature}"))

    # Phase 2 — Implementation (parallel).
    phase2 = _run_parallel([
        ("backend-dev",  f"Implement backend for: {feature}",  [spec_ref]),
        ("frontend-dev", f"Implement frontend for: {feature}", [spec_ref]),
        ("database",     f"Design DB schema for: {feature}",   [spec_ref]),
    ])
    results.extend(phase2)

    # Phase 3 — Tests (parallel).
    phase3 = _run_parallel([
        ("test-backend",  f"Generate backend tests for: {feature}",  [spec_ref]),
        ("test-frontend", f"Generate frontend tests for: {feature}", [spec_ref]),
    ])
    results.extend(phase3)

    # Phase 4 — QA (sequential, needs all prior context).
    results.append(run("qa", f"QA strategy for: {feature}", extra_needs=[spec_ref]))
    return results
