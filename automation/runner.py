from __future__ import annotations

import asyncio

from .content_agent import run as content_run
from .engagement_agent import run as engagement_run
from .orchestrator import Orchestrator
from .revenue_agent import run as revenue_run


async def main() -> None:
    orchestrator = Orchestrator()
    await orchestrator.start([
        ("content_agent", content_run),
        ("engagement_agent", engagement_run),
        ("revenue_agent", revenue_run),
    ])


if __name__ == "__main__":
    asyncio.run(main())
