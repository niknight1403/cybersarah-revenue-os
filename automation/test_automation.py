from __future__ import annotations

import asyncio
import json
import tempfile
import unittest
from pathlib import Path

from automation.config import ConfigError, load_runtime_config
from automation.models import ActionMode, PaymentTransaction
from automation.revenue_agent import validate_payout_candidate
from automation.telemetry import JsonlTelemetry


class AutomationTests(unittest.TestCase):
    def test_defaults_are_draft_and_disabled(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            config_path = Path(directory) / "config.json"
            config_path.write_text(json.dumps({}), encoding="utf-8")
            config = load_runtime_config(config_path)
            self.assertFalse(config.enabled)
            self.assertEqual(config.action_mode, ActionMode.DRAFT)
            self.assertFalse(config.external_execution)

    def test_live_external_execution_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            config_path = Path(directory) / "config.json"
            config_path.write_text(json.dumps({"action_mode": "draft", "external_execution": True}), encoding="utf-8")
            with self.assertRaises(ConfigError):
                load_runtime_config(config_path)

    def test_minimum_payout_is_enforced(self) -> None:
        transaction = PaymentTransaction(transaction_id="txn-12345678", currency="eur", amount_cents=4999, status="draft", idempotency_key="idem-12345678")
        with tempfile.TemporaryDirectory() as directory:
            config_path = Path(directory) / "config.json"
            config_path.write_text(json.dumps({}), encoding="utf-8")
            config = load_runtime_config(config_path)
            with self.assertRaises(ValueError):
                validate_payout_candidate(transaction, config)

    def test_telemetry_redacts_secret_like_fields(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "csro.log"
            JsonlTelemetry(str(path)).emit("test", payload={"api_key": "hidden", "status": "ok"})
            record = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(record["payload"]["api_key"], "[redacted]")
            self.assertEqual(record["payload"]["status"], "ok")


if __name__ == "__main__":
    unittest.main()
