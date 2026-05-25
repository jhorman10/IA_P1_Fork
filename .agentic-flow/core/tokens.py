"""Token estimation + context-window guard.
Stdlib-only heuristic: ~3.5 chars/token for mixed text/code (Anthropic & GPT avg).
Used for pre-flight cost checks and ctx truncation decisions."""
from __future__ import annotations


def estimate_tokens(text: str) -> int:
    """Conservative estimate (rounded up). 3.5 chars/token covers code+ES+JSON."""
    if not text:
        return 0
    return max(1, int(len(text) / 3.5) + 1)


def fits_context(text: str, context_window: int, max_response_tokens: int = 0,
                 safety_margin: int = 256) -> tuple[bool, int]:
    """Returns (fits, estimated_tokens). Reserves max_response_tokens + safety."""
    est = estimate_tokens(text)
    budget = context_window - max_response_tokens - safety_margin
    return est <= budget, est


def truncate_to_fit(text: str, context_window: int, max_response_tokens: int = 0,
                    safety_margin: int = 256) -> tuple[str, bool]:
    """Truncate from the end if needed. Returns (new_text, was_truncated)."""
    fits, _ = fits_context(text, context_window, max_response_tokens, safety_margin)
    if fits:
        return text, False
    budget_tokens = context_window - max_response_tokens - safety_margin
    keep_chars = max(256, int(budget_tokens * 3.5))
    return text[:keep_chars], True
