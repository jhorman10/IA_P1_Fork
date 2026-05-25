"""Lightweight output validators. Returns (ok, reason). Used by orchestrator
to decide whether to accept a model response or escalate (draft_and_refine)."""
from __future__ import annotations
import json


def validate(output_format: str, text: str) -> tuple[bool, str]:
    """Validate model response against declared output_format. Permissive by design:
    only flag clear failures; never reject ambiguous good output."""
    if not text or not text.strip():
        return False, "empty response"
    fmt = (output_format or "").lower()

    if fmt == "yaml-dense":
        try:
            import yaml
            yaml.safe_load(text)
            return True, "yaml-ok"
        except Exception as e:
            return False, f"invalid yaml: {e.__class__.__name__}"

    if fmt == "json":
        try:
            json.loads(text)
            return True, "json-ok"
        except Exception as e:
            return False, f"invalid json: {e.__class__.__name__}"

    if fmt == "unified-diff":
        markers = ("---", "+++", "@@")
        if not any(m in text for m in markers):
            return False, "no diff markers"
        return True, "diff-ok"

    return True, "no-check"
