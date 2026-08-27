from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from .models import TelemetryEvent


class JsonlTelemetry:
    def __init__(self, path: str) -> None:
        self.path = Path(path).expanduser()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.logger = logging.getLogger("csro")

    def emit(self, event: str, *, agent: str | None = None, level: str = "info", payload: dict[str, Any] | None = None) -> None:
        safe_payload = _redact(payload or {})
        record = TelemetryEvent(event=event, agent=agent, level=level, payload=safe_payload)
        line = record.model_dump_json()
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")
        getattr(self.logger, level if level in {"debug", "info", "warning", "error"} else "info")(line)


def _redact(value: Any) -> Any:
    secret_markers = ("key", "token", "secret", "password", "authorization", "signature")
    if isinstance(value, dict):
        return {
            str(key): "[redacted]" if any(marker in str(key).lower() for marker in secret_markers) else _redact(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact(item) for item in value]
    if isinstance(value, str) and len(value) > 80:
        return value[:80] + "…"
    return value
