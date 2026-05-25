"""Detecta LLMs locales disponibles y persiste capacidades en runtime/local-models.json."""
from __future__ import annotations
import json
import os
import socket
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "runtime" / "local-models.json"

OLLAMA = os.getenv("OLLAMA_HOST", "http://localhost:11434")
LMSTUDIO = os.getenv("LMSTUDIO_HOST", "http://localhost:1234")


def _http(url: str, timeout: float = 1.5) -> dict | None:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return json.loads(r.read())
    except Exception:
        return None


def _port_open(host: str, port: int, timeout: float = 0.3) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def detect_ollama() -> list[dict]:
    data = _http(f"{OLLAMA}/api/tags")
    if not data:
        return []
    out = []
    for m in data.get("models", []):
        name = m.get("name", "")
        size = m.get("size", 0)
        details = m.get("details", {})
        out.append({
            "provider": "ollama",
            "name": name,
            "endpoint": OLLAMA,
            "size_bytes": size,
            "family": details.get("family"),
            "param_size": details.get("parameter_size"),
            "quant": details.get("quantization_level"),
            "specialty": _infer_specialty(name),
            "context_window": _infer_ctx(name),
        })
    return out


def detect_lmstudio() -> list[dict]:
    if not _port_open("localhost", 1234):
        return []
    data = _http(f"{LMSTUDIO}/v1/models")
    if not data:
        return []
    return [{
        "provider": "lmstudio",
        "name": m.get("id"),
        "endpoint": LMSTUDIO,
        "specialty": _infer_specialty(m.get("id", "")),
        "context_window": _infer_ctx(m.get("id", "")),
    } for m in data.get("data", [])]


def _infer_specialty(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ["embed", "nomic"]):
        return "embedding"
    if any(k in n for k in ["coder", "code", "starcoder", "deepseek-coder"]):
        return "code"
    if any(k in n for k in ["phi", "gemma", "mistral"]):
        return "reason"
    return "general"


def _infer_ctx(name: str) -> int:
    n = name.lower()
    if "128k" in n: return 131072
    if "32k" in n: return 32768
    if "starcoder2" in n: return 16384
    if "qwen2.5" in n: return 32768
    if "phi4" in n: return 16384
    if "phi3" in n: return 8192
    if "gemma" in n: return 8192
    if "deepseek-coder-v2" in n: return 163840
    if "llama3" in n: return 8192
    if "nomic-embed" in n: return 8192
    return 8192


def detect_all() -> dict:
    models = detect_ollama() + detect_lmstudio()
    return {
        "detected_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat().replace("+00:00", "Z"),
        "count": len(models),
        "models": models,
        "has_code_model": any(m["specialty"] == "code" for m in models),
        "has_embed_model": any(m["specialty"] == "embedding" for m in models),
    }


def main() -> int:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    result = detect_all()
    OUT.write_text(json.dumps(result, indent=2))
    print(f"detected={result['count']} code={result['has_code_model']} embed={result['has_embed_model']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
