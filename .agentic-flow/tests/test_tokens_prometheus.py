"""Tests for tokens, prometheus, warmup."""
from __future__ import annotations
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core import prometheus, tokens  # noqa: E402


class TestTokens(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(tokens.estimate_tokens(""), 0)

    def test_estimate_monotonic(self):
        a = tokens.estimate_tokens("hello")
        b = tokens.estimate_tokens("hello world how are you")
        self.assertGreater(b, a)

    def test_fits_context(self):
        ok, _ = tokens.fits_context("x" * 100, context_window=4096)
        self.assertTrue(ok)
        ok, _ = tokens.fits_context("x" * 100_000, context_window=4096)
        self.assertFalse(ok)

    def test_truncate_preserves_prefix(self):
        text = "a" * 50_000
        new, truncated = tokens.truncate_to_fit(text, context_window=4096, max_response_tokens=512)
        self.assertTrue(truncated)
        self.assertTrue(new.startswith("a"))
        self.assertLess(len(new), len(text))

    def test_truncate_noop_when_fits(self):
        new, truncated = tokens.truncate_to_fit("short", context_window=4096)
        self.assertFalse(truncated)
        self.assertEqual(new, "short")


class TestPrometheus(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self._orig = prometheus.METRICS
        prometheus.METRICS = Path(self._tmp.name) / "m.jsonl"

    def tearDown(self):
        prometheus.METRICS = self._orig
        self._tmp.cleanup()

    def test_no_metrics(self):
        out = prometheus.export()
        self.assertIn("no metrics", out)

    def test_renders_counters(self):
        prometheus.METRICS.write_text("\n".join([
            json.dumps({"tier": "local", "model": "qwen", "cost_usd": 0,
                        "input_tokens": 100, "output_tokens": 50, "duration_ms": 1500,
                        "cache_hit": False}),
            json.dumps({"tier": "cloud-mid", "model": "gpt-4o-mini", "cost_usd": 0.01,
                        "input_tokens": 200, "output_tokens": 80, "duration_ms": 800,
                        "cache_hit": True}),
        ]) + "\n")
        out = prometheus.export()
        self.assertIn("af_calls_total 2", out)
        self.assertIn('af_calls_by_tier{tier="local"} 1', out)
        self.assertIn('af_calls_by_tier{tier="cloud-mid"} 1', out)
        self.assertIn("af_cache_hits_total 1", out)
        self.assertIn("af_cost_usd_total 0.010000", out)


if __name__ == "__main__":
    unittest.main()
