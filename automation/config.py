from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from .models import RuntimeConfig


class ConfigError(RuntimeError):
    pass


def _config_path() -> Path:
    raw = os.getenv("CSRO_CONFIG_PATH", "./automation/config.json")
    return Path(raw).expanduser().resolve()


def load_runtime_config(path: Path | None = None) -> RuntimeConfig:
    config_path = path or _config_path()
    try:
        payload: dict[str, Any] = {}
        if config_path.exists():
            raw = config_path.read_text(encoding="utf-8")
            payload = json.loads(raw)
        config = RuntimeConfig.model_validate(payload)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise ConfigError(f"Runtime-Konfiguration ungültig: {config_path}") from exc

    # Environment overrides are intentionally limited to operational controls.
    # Secrets and payment credentials must never be read into telemetry or config JSON.
    if os.getenv("CSRO_AUTONOMY_ENABLED") is not None:
        config = config.model_copy(update={"enabled": os.getenv("CSRO_AUTONOMY_ENABLED") == "true"})
    if os.getenv("CSRO_ACTION_MODE") is not None:
        config = config.model_copy(update={"action_mode": os.getenv("CSRO_ACTION_MODE")})
    if os.getenv("CSRO_EXTERNAL_EXECUTION") is not None:
        requested = os.getenv("CSRO_EXTERNAL_EXECUTION") == "true"
        if requested:
            raise ConfigError("Externe Ausführung bleibt per Environment fail-closed deaktiviert")
    return config
