from __future__ import annotations

from .models import RuntimeConfig


async def run(config: RuntimeConfig) -> None:
    # Engagement recommendations may be generated later, but outbound contact is blocked.
    if config.external_execution:
        raise RuntimeError("Engagement-Außenwirkung ist ohne explizite Freigabe blockiert")
