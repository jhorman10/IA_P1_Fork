"""Tests para módulos nuevos: llm, resources, validators, lockfile, router."""
from __future__ import annotations
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core import llm, lockfile, resources, router, validators  # noqa: E402


class TestLLM(unittest.TestCase):
    def setUp(self):
        self._orig_post = llm._post
        self._orig_key = os.environ.get("ANTHROPIC_API_KEY")
        os.environ["ANTHROPIC_API_KEY"] = "test-key"

    def tearDown(self):
        llm._post = self._orig_post
        if self._orig_key is None:
            os.environ.pop("ANTHROPIC_API_KEY", None)
        else:
            os.environ["ANTHROPIC_API_KEY"] = self._orig_key

    def test_call_anthropic_omits_temperature_with_thinking(self):
        captured = {}

        def fake_post(url, payload, headers=None, timeout=120):
            captured["url"] = url
            captured["payload"] = payload
            captured["headers"] = headers or {}
            captured["timeout"] = timeout
            return {
                "content": [{"type": "text", "text": "ok"}],
                "usage": {},
                "stop_reason": "end_turn",
            }

        llm._post = fake_post
        resp = llm.call_anthropic("claude-opus-4-5", "hello", thinking_budget_tokens=2048)

        self.assertEqual(resp.text, "ok")
        self.assertNotIn("temperature", captured["payload"])
        self.assertEqual(captured["payload"]["thinking"]["display"], "omitted")
        self.assertIn("anthropic-beta", captured["headers"])

    def test_call_anthropic_keeps_temperature_without_thinking(self):
        captured = {}

        def fake_post(url, payload, headers=None, timeout=120):
            captured["payload"] = payload
            return {
                "content": [{"type": "text", "text": "ok"}],
                "usage": {},
                "stop_reason": "end_turn",
            }

        llm._post = fake_post
        llm.call_anthropic("claude-opus-4-5", "hello", temperature=0.2)

        self.assertEqual(captured["payload"]["temperature"], 0.2)


class TestResources(unittest.TestCase):
    def test_snapshot_returns_populated(self):
        r = resources.snapshot()
        self.assertGreater(r.ram_total_mb, 0)
        self.assertGreater(r.cpu_count, 0)
        self.assertIsInstance(r.ollama_loaded_models, list)

    def test_generate_profile_has_required_keys(self):
        r = resources.snapshot()
        p = resources.generate_system_profile(r)
        for key in ("execution_mode", "hardware", "conditions", "model_conditions"):
            self.assertIn(key, p)
        self.assertIn("max_context_chars_local", p["conditions"])

    def test_profile_modes_are_known(self):
        r = resources.snapshot()
        p = resources.generate_system_profile(r)
        self.assertIn(p["execution_mode"],
                      ("gpu-full", "gpu-light", "cpu-high-ram", "cpu-standard", "cpu-minimal"))


class TestValidators(unittest.TestCase):
    def test_empty_response_invalid(self):
        ok, _ = validators.validate("yaml-dense", "")
        self.assertFalse(ok)

    def test_unknown_format_accepts_anything(self):
        ok, _ = validators.validate("freeform", "hello")
        self.assertTrue(ok)

    def test_valid_yaml(self):
        ok, _ = validators.validate("yaml-dense", "name: x\nvalue: 1\n")
        self.assertTrue(ok)

    def test_invalid_yaml(self):
        ok, _ = validators.validate("yaml-dense", "key: [unclosed")
        self.assertFalse(ok)

    def test_valid_diff(self):
        ok, _ = validators.validate("unified-diff",
                                    "--- a/x\n+++ b/x\n@@ -1 +1 @@\n-old\n+new")
        self.assertTrue(ok)

    def test_invalid_diff(self):
        ok, _ = validators.validate("unified-diff", "just some text")
        self.assertFalse(ok)


class TestLockfile(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self._orig = lockfile.LOCK
        lockfile.LOCK = Path(self._tmp.name) / "test.lock"

    def tearDown(self):
        lockfile.LOCK = self._orig
        self._tmp.cleanup()

    def test_acquire_release(self):
        with lockfile.acquire(timeout_s=5):
            self.assertTrue(lockfile.LOCK.exists())
        self.assertFalse(lockfile.LOCK.exists())

    def test_stale_lock_reclaimed(self):
        lockfile.LOCK.parent.mkdir(parents=True, exist_ok=True)
        lockfile.LOCK.write_text("9999")
        old = time.time() - 10000
        import os
        os.utime(lockfile.LOCK, (old, old))
        with lockfile.acquire(timeout_s=1):
            self.assertTrue(lockfile.LOCK.exists())


class TestRouterValidation(unittest.TestCase):
    def test_validate_declared_models_returns_list(self):
        result = router.validate_declared_models()
        self.assertIsInstance(result, list)


if __name__ == "__main__":
    unittest.main()
