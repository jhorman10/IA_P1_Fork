"""Memoria incremental: indexa archivos por hash, genera embeddings con modelo local.
Solo reindexa lo que cambió. Vector store: SQLite (sin deps externas pesadas)."""
from __future__ import annotations
import hashlib
import json
import os
import sqlite3
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parent
MEMORY = ROOT / "memory"
INDEX_DB = MEMORY / "index.sqlite"
INDEX_META = MEMORY / "index.json"

EMBED_MODEL = "nomic-embed-text"
OLLAMA = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
SEARCH_ROW_LIMIT = int(os.environ.get("AF_SEARCH_ROW_LIMIT", "5000"))
FILES_CONTEXT_LIMIT = int(os.environ.get("AF_FILES_CONTEXT_LIMIT", "3"))


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", "ignore")).hexdigest()


def _db() -> sqlite3.Connection:
    MEMORY.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(INDEX_DB, timeout=10)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=5000")
    con.execute("""CREATE TABLE IF NOT EXISTS chunks(
        id INTEGER PRIMARY KEY,
        path TEXT, chunk_idx INTEGER, hash TEXT,
        content TEXT, embedding BLOB,
        UNIQUE(path, chunk_idx))""")
    con.execute("CREATE INDEX IF NOT EXISTS idx_path ON chunks(path)")
    con.execute("CREATE INDEX IF NOT EXISTS idx_hash ON chunks(hash)")
    return con


def _embed(text: str, max_attempts: int = 3) -> list[float] | None:
    """Embed with exponential backoff. None on persistent failure (caller handles)."""
    import time as _t
    delay = 0.5
    for attempt in range(1, max_attempts + 1):
        try:
            req = urllib.request.Request(
                f"{OLLAMA}/api/embeddings",
                data=json.dumps({"model": EMBED_MODEL, "prompt": text}).encode(),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read()).get("embedding")
        except Exception:
            if attempt == max_attempts:
                return None
            _t.sleep(delay)
            delay *= 2


def _chunks(text: str, size: int = 1500, overlap: int = 150) -> list[str]:
    if len(text) <= size:
        return [text]
    out, i = [], 0
    while i < len(text):
        out.append(text[i:i + size])
        i += size - overlap
    return out


def _vec_to_blob(v: list[float]) -> bytes:
    import struct
    return struct.pack(f"{len(v)}f", *v)


def _blob_to_vec(b: bytes) -> list[float]:
    import struct
    return list(struct.unpack(f"{len(b)//4}f", b))


def _cos(a: list[float], b: list[float]) -> float:
    import math
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na and nb else 0.0


def _expand_braces(pattern: str) -> list[str]:
    """Expand a single brace group like `*.{js,jsx}` into two patterns.
    Falls back to the original pattern when no braces are present."""
    start = pattern.find("{")
    end = pattern.find("}", start + 1)
    if start == -1 or end == -1 or end < start:
        return [pattern]
    prefix = pattern[:start]
    suffix = pattern[end + 1:]
    options = [item.strip() for item in pattern[start + 1:end].split(",") if item.strip()]
    if not options:
        return [pattern]
    expanded: list[str] = []
    for option in options:
        expanded.extend(_expand_braces(f"{prefix}{option}{suffix}"))
    return expanded


def _matching_files(pattern: str, limit: int = FILES_CONTEXT_LIMIT) -> list[Path]:
    """Resolve a files:<glob> pattern relative to the workspace root.
    Supports one-level brace expansion and directory inputs."""
    matches: list[Path] = []
    seen: set[Path] = set()
    for expanded in _expand_braces(pattern):
        candidate = PROJECT / expanded
        if not any(ch in expanded for ch in "*?[") and candidate.exists():
            found = [candidate]
        else:
            found = list(PROJECT.glob(expanded))
        for path in sorted(found):
            items = [path]
            if path.is_dir():
                items = [child for child in path.rglob("*") if child.is_file()]
            for item in items:
                if item.is_symlink() or not item.is_file():
                    continue
                try:
                    item.resolve().relative_to(PROJECT.resolve())
                except (ValueError, OSError):
                    continue
                if item not in seen:
                    matches.append(item)
                    seen.add(item)
                if len(matches) >= limit:
                    return matches
    return matches


def _file_snippet(path: Path) -> str | None:
    try:
        con = _db()
        row = con.execute(
            "SELECT content FROM chunks WHERE path=? ORDER BY chunk_idx LIMIT 1",
            (str(path),),
        ).fetchone()
        if row and row[0]:
            return row[0]
    except sqlite3.OperationalError:
        pass
    try:
        text = path.read_text(errors="ignore")
    except Exception:
        return None
    pieces = _chunks(text)
    return pieces[0] if pieces else None


def index_paths(paths: list[Path], workers: int = 4) -> dict:
    """Index files. Embeddings are computed concurrently in batches to amortize
    Ollama HTTP overhead (one model load, many sequential generations)."""
    con = _db()
    added = updated = skipped = 0

    # Step 1: enumerate chunks that need embedding (cheap, no I/O).
    pending: list[tuple[str, int, str, str, bool]] = []  # (rel, i, hash, content, is_update)
    for p in paths:
        if not p.is_file() or p.is_symlink():
            continue
        try:
            resolved = p.resolve()
            # Reject anything outside the project root (prevents symlink escapes).
            resolved.relative_to(PROJECT.resolve())
        except (ValueError, OSError):
            continue
        try:
            text = p.read_text(errors="ignore")
        except Exception:
            continue
        rel = str(p)
        for i, ch in enumerate(_chunks(text)):
            h = _hash(ch)
            row = con.execute(
                "SELECT hash FROM chunks WHERE path=? AND chunk_idx=?", (rel, i)
            ).fetchone()
            if row and row[0] == h:
                skipped += 1
                continue
            pending.append((rel, i, h, ch, row is not None))

    # Step 2: embed pending chunks concurrently (bounded).
    embeddings: dict[int, list[float] | None] = {}
    if pending:
        with ThreadPoolExecutor(max_workers=workers) as ex:
            futures = {ex.submit(_embed, item[3]): idx for idx, item in enumerate(pending)}
            for fut in as_completed(futures):
                idx = futures[fut]
                try:
                    embeddings[idx] = fut.result()
                except Exception:
                    embeddings[idx] = None

    # Step 3: persist.
    for idx, (rel, i, h, ch, is_update) in enumerate(pending):
        emb = embeddings.get(idx)
        blob = _vec_to_blob(emb) if emb else None
        if is_update:
            con.execute("UPDATE chunks SET hash=?, content=?, embedding=? WHERE path=? AND chunk_idx=?",
                        (h, ch, blob, rel, i))
            updated += 1
        else:
            con.execute("INSERT INTO chunks(path,chunk_idx,hash,content,embedding) VALUES(?,?,?,?,?)",
                        (rel, i, h, ch, blob))
            added += 1
    con.commit()
    stats = {"added": added, "updated": updated, "skipped": skipped}
    INDEX_META.write_text(json.dumps(stats, indent=2))
    return stats


def search(query: str, k: int = 5, path_prefix: str | None = None) -> list[dict]:
    qemb = _embed(query)
    if not qemb:
        return []
    try:
        con = _db()
        if path_prefix:
            rows = con.execute(
                "SELECT path, chunk_idx, content, embedding FROM chunks "
                "WHERE embedding IS NOT NULL AND path LIKE ? LIMIT ?",
                (f"{path_prefix}%", SEARCH_ROW_LIMIT),
            ).fetchall()
        else:
            rows = con.execute(
                "SELECT path, chunk_idx, content, embedding FROM chunks "
                "WHERE embedding IS NOT NULL LIMIT ?",
                (SEARCH_ROW_LIMIT,),
            ).fetchall()
    except sqlite3.OperationalError:
        return []
    scored = []
    for path, idx, content, emb in rows:
        score = _cos(qemb, _blob_to_vec(emb))
        scored.append({"path": path, "chunk": idx, "score": score, "content": content})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:k]


def build_context(needs: list[str]) -> str:
    """Construye bloque de contexto compactado según context_needs declarados."""
    parts = []
    for need in needs:
        if need in ("project-context", "domain", "conventions", "architecture"):
            f = MEMORY / f"{need}.md"
            if f.exists():
                text = f.read_text()
                # strip leading header if file already starts with it to avoid duplication
                first_line = text.split("\n", 1)[0].lstrip("# ").strip()
                if first_line == need:
                    parts.append(text)
                else:
                    parts.append(f"# {need}\n{text}")
        elif need.startswith("files:"):
            pattern = need.split(":", 1)[1]
            for path in _matching_files(pattern):
                snippet = _file_snippet(path)
                if snippet:
                    parts.append(f"# {path}#chunk0\n{snippet}")
        elif need.startswith("spec:"):
            name = need.split(":", 1)[1]
            spec_dir = ROOT / "specs"
            if name == "current":
                latest = sorted(spec_dir.glob("*.spec.md"), key=lambda p: p.stat().st_mtime)
                if latest:
                    parts.append(f"# spec\n{latest[-1].read_text()}")
            else:
                f = spec_dir / f"{name}.spec.md"
                if f.exists():
                    parts.append(f"# spec\n{f.read_text()}")
    return "\n\n---\n\n".join(parts)
