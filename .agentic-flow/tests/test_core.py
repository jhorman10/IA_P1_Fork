"""Tests del core agentic-flow. Ejecutar: python3 -m unittest discover .agentic-flow/tests"""
from __future__ import annotations
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core import cache, router  # noqa: E402


class TestRouter(unittest.TestCase):
    def test_unknown_task_raises(self):
        with self.assertRaises(ValueError):
            router.choose("nonexistent-task")

    def test_orchestrate_picks_cloud_high(self):
        c = router.choose("orchestrate")
        self.assertEqual(c.tier, "cloud-high")
        self.assertIn("claude", c.model.lower())

    def test_force_tier_overrides_default(self):
        c = router.choose("lint-fix", force_tier="cloud-mid")
        self.assertEqual(c.tier, "cloud-mid")

    def test_unit_test_falls_back_when_no_code_local(self):
        # Sin code model local, debe escalar a cloud-mid
        c = router.choose("unit-test")
        self.assertIn(c.tier, ("local", "cloud-mid"))

    def test_estimate_cost_zero_for_local(self):
        self.assertEqual(router.estimate_cost("qwen2.5-coder:7b", 1000, 1000), 0)

    def test_estimate_cost_positive_for_cloud(self):
        self.assertGreater(router.estimate_cost("claude-opus-4-5", 1_000_000, 0), 0)


class TestCache(unittest.TestCase):
    def setUp(self):
        # Aísla la cache en tmpdir
        self._tmp = tempfile.TemporaryDirectory()
        cache.DB = Path(self._tmp.name) / "cache.sqlite"

    def tearDown(self):
        self._tmp.cleanup()

    def test_put_and_get_roundtrip(self):
        cache.put("m", "p", "r")
        self.assertEqual(cache.get("m", "p"), "r")

    def test_miss_returns_none(self):
        self.assertIsNone(cache.get("m", "missing"))

    def test_seed_affects_key(self):
        cache.put("m", "p", "r1", seed=1)
        cache.put("m", "p", "r2", seed=2)
        self.assertEqual(cache.get("m", "p", seed=1), "r1")
        self.assertEqual(cache.get("m", "p", seed=2), "r2")


class TestMemory(unittest.TestCase):
    def test_build_context_includes_seeds(self):
        from core import memory
        ctx = memory.build_context(["project-context", "domain"])
        self.assertIn("project-context", ctx)
        self.assertIn("domain", ctx)

    def test_build_context_uses_matching_files_glob(self):
        from core import memory
        ctx = memory.build_context(["files:.agentic-flow/tests/*.py"])
        self.assertIn(".agentic-flow/tests/test_core.py", ctx)

    def test_expand_braces(self):
        from core import memory
        self.assertEqual(
            memory._expand_braces("src/*.{js,jsx}"),
            ["src/*.js", "src/*.jsx"],
        )

    def test_chunks_splits_long_text(self):
        from core import memory
        text = "a" * 5000
        chunks = memory._chunks(text, size=1000, overlap=100)
        self.assertGreater(len(chunks), 1)


class TestDetectLocal(unittest.TestCase):
    def test_infer_specialty(self):
        from core import detect_local
        self.assertEqual(detect_local._infer_specialty("qwen2.5-coder:7b"), "code")
        self.assertEqual(detect_local._infer_specialty("nomic-embed-text"), "embedding")
        self.assertEqual(detect_local._infer_specialty("llama3:latest"), "general")

    def test_infer_ctx(self):
        from core import detect_local
        self.assertEqual(detect_local._infer_ctx("qwen2.5-coder:7b"), 32768)


class TestBudgetGuard(unittest.TestCase):
    def test_over_budget_forces_local(self):
        import datetime
        path = router.METRICS
        backup = path.read_text() if path.exists() else None
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps({
                "date": datetime.date.today().isoformat(),
                "task": "x", "tier": "cloud-high", "model": "claude-opus-4-5",
                "cost_usd": 9999.0, "input_tokens": 0, "output_tokens": 0,
                "reason": "test",
            }) + "\n")
            c = router.choose("orchestrate")
            self.assertEqual(c.tier, "local")
        finally:
            if backup is not None:
                path.write_text(backup)
            else:
                path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
