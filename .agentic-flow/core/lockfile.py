"""Inter-process + intra-process lock for serializing CPU-bound Ollama calls.
Uses fcntl.flock for cross-process exclusion and a threading.Lock for hot
contention inside the same process (ThreadPoolExecutor in the orchestrator).
Skipped automatically on GPU systems where parallelism is safe."""
from __future__ import annotations
import os
import threading
import time
from contextlib import contextmanager
from pathlib import Path

try:
    import fcntl  # POSIX only; absent on Windows
    _HAS_FCNTL = True
except ImportError:  # pragma: no cover
    _HAS_FCNTL = False

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "runtime" / "ollama.lock"

_THREAD_LOCK = threading.Lock()


@contextmanager
def acquire(timeout_s: int = 600):
    """Acquire thread-lock first, then exclusive flock on LOCK file.
    Stale-file safety: flock is released automatically on process death by the
    kernel — no orphaned locks. Falls back to mtime-based reclaim only when
    fcntl is unavailable (Windows)."""
    LOCK.parent.mkdir(parents=True, exist_ok=True)
    got_thread = _THREAD_LOCK.acquire(timeout=timeout_s)
    if not got_thread:
        # Best-effort: proceed even if thread lock timed out.
        pass

    fh = None
    try:
        if _HAS_FCNTL:
            fh = open(LOCK, "w")
            deadline = time.time() + timeout_s
            while True:
                try:
                    fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except BlockingIOError:
                    if time.time() >= deadline:
                        break
                    time.sleep(0.2)
            fh.write(str(os.getpid()))
            fh.flush()
        else:
            # Windows fallback: mtime-based stale-lock reclaim.
            waited = 0.0
            while LOCK.exists():
                try:
                    if time.time() - LOCK.stat().st_mtime > timeout_s:
                        LOCK.unlink(missing_ok=True)
                        break
                except FileNotFoundError:
                    break
                if waited >= timeout_s:
                    break
                time.sleep(0.5)
                waited += 0.5
            LOCK.write_text(str(os.getpid()))
        yield
    finally:
        if fh is not None:
            try:
                fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
                fh.close()
            except Exception:
                pass
            try:
                LOCK.unlink(missing_ok=True)
            except Exception:
                pass
        else:
            try:
                LOCK.unlink(missing_ok=True)
            except Exception:
                pass
        if got_thread:
            _THREAD_LOCK.release()
