"""Prometheus text-format exporter for metrics.jsonl.
Used by `af metrics --prometheus` for Grafana/Prometheus scraping."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
METRICS = ROOT / "runtime" / "metrics.jsonl"


def export() -> str:
    """Render Prometheus text exposition format from metrics.jsonl."""
    if not METRICS.exists():
        return "# no metrics yet\n"

    calls_by_tier: dict[str, int] = {}
    cost_by_tier: dict[str, float] = {}
    calls_by_model: dict[str, int] = {}
    tokens_in_by_model: dict[str, int] = {}
    tokens_out_by_model: dict[str, int] = {}
    duration_sum_by_model: dict[str, int] = {}
    cache_hits = 0
    total_calls = 0
    total_cost = 0.0

    for line in METRICS.read_text().splitlines():
        try:
            r = json.loads(line)
        except Exception:
            continue
        tier = r.get("tier", "unknown")
        model = r.get("model", "unknown")
        calls_by_tier[tier] = calls_by_tier.get(tier, 0) + 1
        cost_by_tier[tier] = cost_by_tier.get(tier, 0.0) + r.get("cost_usd", 0.0)
        calls_by_model[model] = calls_by_model.get(model, 0) + 1
        tokens_in_by_model[model] = tokens_in_by_model.get(model, 0) + r.get("input_tokens", 0)
        tokens_out_by_model[model] = tokens_out_by_model.get(model, 0) + r.get("output_tokens", 0)
        duration_sum_by_model[model] = duration_sum_by_model.get(model, 0) + r.get("duration_ms", 0)
        if r.get("cache_hit"):
            cache_hits += 1
        total_calls += 1
        total_cost += r.get("cost_usd", 0.0)

    lines = [
        "# HELP af_calls_total Total LLM calls",
        "# TYPE af_calls_total counter",
        f"af_calls_total {total_calls}",
        "# HELP af_cost_usd_total Cumulative spend in USD",
        "# TYPE af_cost_usd_total counter",
        f"af_cost_usd_total {total_cost:.6f}",
        "# HELP af_cache_hits_total Cache hits",
        "# TYPE af_cache_hits_total counter",
        f"af_cache_hits_total {cache_hits}",
        "# HELP af_calls_by_tier Calls grouped by tier",
        "# TYPE af_calls_by_tier counter",
    ]
    for tier, n in calls_by_tier.items():
        lines.append(f'af_calls_by_tier{{tier="{tier}"}} {n}')
    lines.append("# HELP af_cost_usd_by_tier Cost grouped by tier")
    lines.append("# TYPE af_cost_usd_by_tier counter")
    for tier, c in cost_by_tier.items():
        lines.append(f'af_cost_usd_by_tier{{tier="{tier}"}} {c:.6f}')
    lines.append("# HELP af_calls_by_model Calls grouped by model")
    lines.append("# TYPE af_calls_by_model counter")
    for model, n in calls_by_model.items():
        lines.append(f'af_calls_by_model{{model="{model}"}} {n}')
    lines.append("# HELP af_tokens_input_total Input tokens per model")
    lines.append("# TYPE af_tokens_input_total counter")
    for model, n in tokens_in_by_model.items():
        lines.append(f'af_tokens_input_total{{model="{model}"}} {n}')
    lines.append("# HELP af_tokens_output_total Output tokens per model")
    lines.append("# TYPE af_tokens_output_total counter")
    for model, n in tokens_out_by_model.items():
        lines.append(f'af_tokens_output_total{{model="{model}"}} {n}')
    lines.append("# HELP af_duration_ms_total Cumulative call duration per model")
    lines.append("# TYPE af_duration_ms_total counter")
    for model, d in duration_sum_by_model.items():
        lines.append(f'af_duration_ms_total{{model="{model}"}} {d}')
    return "\n".join(lines) + "\n"
