"""Tests for schema validation and structured logger."""
from __future__ import annotations
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core import logger, schema  # noqa: E402


class TestSchemaValid(unittest.TestCase):
    def test_real_configs_validate(self):
        warns = schema.validate_all()
        self.assertIsInstance(warns, list)


class TestSchemaRouting(unittest.TestCase):
    def _base(self):
        return {
            "tiers": {
                "local": {"models": {"coder-fast": "starcoder2:3b", "coder": "qwen2.5-coder:7b",
                                     "embed": "nomic-embed-text"}},
                "cloud-mid": {"models": ["gpt-4o-mini"]},
                "cloud-high": {"models": ["claude-opus-4.7"]},
            },
            "tasks": {"x": {"tier": "local", "fallback": ["cloud-mid"]}},
        }

    def test_valid_routing(self):
        warns = schema.validate_routing(self._base())
        self.assertEqual(warns, [])

    def test_invalid_tier_raises(self):
        cfg = self._base()
        cfg["tasks"]["x"]["tier"] = "ultra"
        with self.assertRaises(schema.SchemaError):
            schema.validate_routing(cfg)

    def test_invalid_fallback_raises(self):
        cfg = self._base()
        cfg["tasks"]["x"]["fallback"] = ["nope"]
        with self.assertRaises(schema.SchemaError):
            schema.validate_routing(cfg)

    def test_missing_tasks_raises(self):
        with self.assertRaises(schema.SchemaError):
            schema.validate_routing({"tiers": self._base()["tiers"]})


class TestSchemaAgents(unittest.TestCase):
    def _routing(self):
        return {"tasks": {"foo": {"tier": "local"}}}

    def test_valid_agents(self):
        cfg = {"agents": {"a": {"task": "foo", "context_needs": [], "max_tokens_response": 100}}}
        warns = schema.validate_agents(cfg, self._routing())
        self.assertEqual(warns, [])

    def test_undeclared_task_raises(self):
        cfg = {"agents": {"a": {"task": "bar", "context_needs": [], "max_tokens_response": 100}}}
        with self.assertRaises(schema.SchemaError):
            schema.validate_agents(cfg, self._routing())

    def test_zero_max_tokens_raises(self):
        cfg = {"agents": {"a": {"task": "foo", "context_needs": [], "max_tokens_response": 0}}}
        with self.assertRaises(schema.SchemaError):
            schema.validate_agents(cfg, self._routing())


class TestLogger(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self._orig_logs = logger.LOGS
        logger.LOGS = Path(self._tmp.name)
        logger.ENABLED = True

    def tearDown(self):
        logger.LOGS = self._orig_logs
        self._tmp.cleanup()

    def test_log_writes_jsonl(self):
        logger.log("test.event", foo="bar", n=42)
        files = list(Path(self._tmp.name).glob("*.jsonl"))
        self.assertEqual(len(files), 1)
        rec = json.loads(files[0].read_text().strip())
        self.assertEqual(rec["event"], "test.event")
        self.assertEqual(rec["foo"], "bar")
        self.assertEqual(rec["n"], 42)

    def test_log_disabled_writes_nothing(self):
        logger.ENABLED = False
        logger.log("x")
        self.assertFalse(list(Path(self._tmp.name).glob("*.jsonl")))

    def test_log_never_raises(self):
        # Path that doesn't exist and can't be created -> should still not raise
        logger.LOGS = Path("/proc/cannot/write/here")
        try:
            logger.log("safe")
        except Exception:
            self.fail("logger.log raised on bad path")


if __name__ == "__main__":
    unittest.main()
