"""Cache warmup: pre-load hot models in Ollama so the first user call is fast.
Triggers a tiny generation (1 token) to bring the model into RAM."""
from __future__ import annotations
import json
import os
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
ROUTING = ROOT / "config" / "routing.yaml"
OLLAMA = os.getenv("OLLAMA_HOST", "http://localhost:11434")


def _warm_one(model: str, is_embed: bool = False, timeout: int = 60) -> tuple[bool, str]:
    if is_embed:
        url = f"{OLLAMA}/api/embeddings"
        payload = {"model": model, "prompt": "warmup", "keep_alive": "10m"}
    else:
        url = f"{OLLAMA}/api/generate"
        payload = {
            "model": model,
            "prompt": "warmup",
            "stream": False,
            "keep_alive": "10m",
            "options": {"num_predict": 1, "temperature": 0, "seed": 42},
        }
    try:
        req = urllib.request.Request(
            url, data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as r:
            r.read()
        return True, "ok"
    except Exception as e:
        return False, f"{e.__class__.__name__}: {e}"


def warm(roles: list[str] | None = None) -> dict:
    """Warm models declared in routing.yaml. Default: coder-fast + embed (most common)."""
    cfg = yaml.safe_load(ROUTING.read_text())
    declared = cfg["tiers"]["local"]["models"]
    target_roles = roles or ["coder-fast", "embed"]
    results = {}
    for role in target_roles:
        full = declared.get(role)
        if not full:
            results[role] = {"ok": False, "msg": "role not declared"}
            continue
        ok, msg = _warm_one(full, is_embed=(role == "embed"))
        results[role] = {"model": full, "ok": ok, "msg": msg}
    return results
