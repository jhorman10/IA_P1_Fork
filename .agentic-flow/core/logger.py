"""Structured JSON line logger. Appends to runtime/logs/<date>.jsonl.
Replaces ad-hoc prints in long-running paths (orchestrator, router, memory)."""
from __future__ import annotations
import datetime
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOGS = ROOT / "runtime" / "logs"
ENABLED = os.getenv("AF_LOG_STRUCTURED", "1") != "0"
ECHO = os.getenv("AF_LOG_ECHO", "0") == "1"


def _path() -> Path:
    LOGS.mkdir(parents=True, exist_ok=True)
    return LOGS / f"{datetime.date.today().isoformat()}.jsonl"


def log(event: str, **fields) -> None:
    """Emit a single structured log line. Safe: never raises."""
    if not ENABLED:
        return
    rec = {
        "ts": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
        "event": event,
        **fields,
    }
    line = json.dumps(rec, default=str)
    try:
        with _path().open("a") as f:
            f.write(line + "\n")
    except Exception:
        pass
    if ECHO:
        print(f"[log] {line}", file=sys.stderr)
