"""Cache de respuestas por hash(prompt+model). TTL configurable. Reduce coste con tareas deterministas."""
from __future__ import annotations
import hashlib
import json
import sqlite3
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "runtime" / "cache" / "responses.sqlite"
TTL_S = 60 * 60 * 24  # 24h


def _db() -> sqlite3.Connection:
    DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB, timeout=10)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=5000")
    con.execute("""CREATE TABLE IF NOT EXISTS cache(
        key TEXT PRIMARY KEY, model TEXT, ts INTEGER, response TEXT)""")
    return con


def _safe(fn):
    """Wrap reads to return None/no-op when DB is locked instead of crashing."""
    def wrapped(*a, **kw):
        try:
            return fn(*a, **kw)
        except sqlite3.OperationalError:
            return None
    return wrapped


def _key(model: str, prompt: str, temperature: float, seed: int | None) -> str:
    h = hashlib.sha256()
    h.update(model.encode()); h.update(b"|")
    h.update(prompt.encode()); h.update(b"|")
    h.update(f"{temperature}|{seed}".encode())
    return h.hexdigest()


@_safe
def get(model: str, prompt: str, temperature: float = 0, seed: int | None = 42) -> str | None:
    con = _db()
    row = con.execute("SELECT ts, response FROM cache WHERE key=?",
                      (_key(model, prompt, temperature, seed),)).fetchone()
    if not row:
        return None
    ts, resp = row
    if time.time() - ts > TTL_S:
        return None
    return resp


def put(model: str, prompt: str, response: str, temperature: float = 0, seed: int | None = 42) -> None:
    try:
        con = _db()
        con.execute("INSERT OR REPLACE INTO cache VALUES(?,?,?,?)",
                    (_key(model, prompt, temperature, seed), model, int(time.time()), response))
        con.commit()
    except sqlite3.OperationalError:
        return  # cache miss is acceptable; never block the caller on lock
