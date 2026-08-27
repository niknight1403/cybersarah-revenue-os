from __future__ import annotations

import asyncio
import signal
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine

from .config import load_runtime_config
from .models import AgentSnapshot, AgentStatus, RuntimeConfig
from .telemetry import JsonlTelemetry


class Orchestrator:
    def __init__(self) -> None:
        self.config: RuntimeConfig = load_runtime_config()
        self.telemetry = JsonlTelemetry(self.config.telemetry_path)
        self.snapshots: dict[str, AgentSnapshot] = {}
        self.running = False
        self._tasks: list[asyncio.Task[None]] = []

    async def start(self, workers: list[tuple[str, Callable[[RuntimeConfig], Coroutine[Any, Any, None]]]]) -> None:
        self.running = True
        self.telemetry.emit("orchestrator_starting", payload={"worker_count": len(workers)})
        
        for name, func in workers:
            self.snapshots[name] = AgentSnapshot(agent=name, status=AgentStatus.STARTING)
            task = asyncio.create_task(self._run_worker_loop(name, func))
            self._tasks.append(task)

        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, lambda: asyncio.create_task(self.stop()))

        while self.running:
            await asyncio.sleep(self.config.interval_seconds)
            self._health_check()

    async def stop(self) -> None:
        if not self.running:
            return
        self.running = False
        self.telemetry.emit("orchestrator_stopping")
        for task in self._tasks:
            task.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)
        self.telemetry.emit("orchestrator_stopped")

    def _health_check(self) -> None:
        self.config = load_runtime_config()  # Dynamic reload
        active = [n for n, s in self.snapshots.items() if s.status == AgentStatus.HEALTHY]
        self.telemetry.emit("orchestrator_health_check", payload={"active_workers": active, "config_enabled": self.config.enabled})

    async def _run_worker_loop(self, name: str, func: Callable[[RuntimeConfig], Coroutine[Any, Any, None]]) -> None:
        backoff = self.config.backoff_base_seconds
        while self.running:
            snapshot = self.snapshots[name]
            try:
                if not self.config.enabled:
                    snapshot.status = AgentStatus.STOPPED
                    await asyncio.sleep(self.config.interval_seconds)
                    continue

                snapshot.status = AgentStatus.HEALTHY
                snapshot.last_run_at = datetime.now(timezone.utc)
                snapshot.run_count += 1
                
                async with asyncio.timeout(self.config.worker_timeout_seconds):
                    await func(self.config)
                
                backoff = self.config.backoff_base_seconds
                await asyncio.sleep(self.config.interval_seconds)
            except asyncio.CancelledError:
                snapshot.status = AgentStatus.STOPPED
                break
            except Exception as exc:
                snapshot.status = AgentStatus.DEGRADED
                snapshot.restart_count += 1
                snapshot.error = str(exc)[:500]
                self.telemetry.emit("worker_error", agent=name, level="error", payload={"error": snapshot.error, "backoff": backoff})
                
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, self.config.backoff_max_seconds)
                
                if snapshot.restart_count > self.config.max_restarts:
                    self.telemetry.emit("worker_halted", agent=name, level="error", payload={"restarts": snapshot.restart_count})
                    snapshot.status = AgentStatus.STOPPED
                    break
