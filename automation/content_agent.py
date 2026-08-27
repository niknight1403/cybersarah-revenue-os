from __future__ import annotations

from .models import RuntimeConfig


async def run(config: RuntimeConfig) -> None:
    # Read-only signal collection; publishing is intentionally not implemented here.
    if config.action_mode.value == "live":
        raise RuntimeError("Content-Publishing ist im Orchestrator nicht freigegeben")
