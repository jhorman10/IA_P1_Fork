"""YAML schema validation using only stdlib (no pydantic dep).
Fails fast on misconfigured agents.yaml / routing.yaml with actionable errors."""
from __future__ import annotations
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


class SchemaError(ValueError):
    pass


def _require(d: dict, key: str, where: str) -> None:
    if key not in d:
        raise SchemaError(f"{where}: missing required key '{key}'")


def _require_type(value, expected, where: str) -> None:
    if not isinstance(value, expected):
        raise SchemaError(f"{where}: expected {expected.__name__}, got {type(value).__name__}")


def validate_routing(cfg: dict) -> list[str]:
    """Validate routing.yaml. Returns list of non-fatal warnings; raises on fatal."""
    warnings: list[str] = []
    for key in ("tiers", "tasks"):
        _require(cfg, key, "routing")

    tiers = cfg["tiers"]
    for tier_name in ("local", "cloud-mid", "cloud-high"):
        if tier_name not in tiers:
            warnings.append(f"routing.tiers: missing '{tier_name}'")

    if "local" in tiers:
        local = tiers["local"]
        _require(local, "models", "routing.tiers.local")
        _require_type(local["models"], dict, "routing.tiers.local.models")
        for role in ("coder-fast", "coder", "embed"):
            if role not in local["models"]:
                warnings.append(f"routing.tiers.local.models: missing role '{role}'")

    valid_tiers = {"local", "cloud-mid", "cloud-high"}
    for task, rule in cfg["tasks"].items():
        where = f"routing.tasks.{task}"
        _require_type(rule, dict, where)
        _require(rule, "tier", where)
        if rule["tier"] not in valid_tiers:
            raise SchemaError(f"{where}.tier: '{rule['tier']}' not in {valid_tiers}")
        for fb in rule.get("fallback", []):
            if fb not in valid_tiers:
                raise SchemaError(f"{where}.fallback: '{fb}' not in {valid_tiers}")
    return warnings


def validate_agents(cfg: dict, routing: dict) -> list[str]:
    """Validate agents.yaml. Cross-references tasks against routing."""
    warnings: list[str] = []
    _require(cfg, "agents", "agents")
    declared_tasks = set(routing.get("tasks", {}).keys())

    for name, agent in cfg["agents"].items():
        where = f"agents.{name}"
        _require_type(agent, dict, where)
        for key in ("task", "context_needs", "max_tokens_response"):
            _require(agent, key, where)
        if agent["task"] not in declared_tasks:
            raise SchemaError(
                f"{where}.task: '{agent['task']}' not declared in routing.tasks"
            )
        _require_type(agent["context_needs"], list, f"{where}.context_needs")
        _require_type(agent["max_tokens_response"], int, f"{where}.max_tokens_response")
        if agent["max_tokens_response"] <= 0:
            raise SchemaError(f"{where}.max_tokens_response must be > 0")
    return warnings


def validate_all() -> list[str]:
    """Validate routing + agents from disk. Returns combined warnings."""
    routing = yaml.safe_load((ROOT / "config" / "routing.yaml").read_text())
    agents = yaml.safe_load((ROOT / "config" / "agents.yaml").read_text())
    warns = validate_routing(routing)
    warns += validate_agents(agents, routing)
    return warns
