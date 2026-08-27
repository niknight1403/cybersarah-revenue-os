from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ActionMode(str, Enum):
    DRAFT = "draft"
    SIMULATION = "simulation"
    LIVE = "live"


class AgentStatus(str, Enum):
    STARTING = "starting"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    STOPPED = "stopped"


class RuntimeConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool = False
    interval_seconds: int = Field(default=60, ge=15, le=86_400)
    worker_timeout_seconds: int = Field(default=30, ge=1, le=300)
    max_restarts: int = Field(default=3, ge=0, le=20)
    backoff_base_seconds: float = Field(default=1.0, ge=0.1, le=60.0)
    backoff_max_seconds: float = Field(default=60.0, ge=1.0, le=900.0)
    action_mode: ActionMode = ActionMode.DRAFT
    external_execution: bool = False
    telemetry_path: str = "./csro.log"
    replit_base_url: str | None = None
    min_payout_cents: int = Field(default=5000, ge=0, le=10_000_000)
    max_request_per_minute: int = Field(default=60, ge=1, le=10_000)

    @field_validator("external_execution")
    @classmethod
    def require_live_mode_for_external_execution(cls, value: bool, info: Any) -> bool:
        if value and info.data.get("action_mode") != ActionMode.LIVE:
            raise ValueError("external_execution darf nur im LIVE-Modus aktiviert werden")
        return value


class RevenueSignal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    signal_id: str = Field(min_length=1, max_length=120)
    source: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=240)
    score: float = Field(ge=0, le=1)
    estimated_value_cents: int | None = Field(default=None, ge=0, le=100_000_000)
    approval_required: bool = True
    external_execution: bool = False
    metadata: dict[str, str] = Field(default_factory=dict)


class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transaction_id: str = Field(min_length=1, max_length=160)
    currency: str = Field(min_length=3, max_length=3)
    amount_cents: int = Field(gt=0, le=100_000_000)
    status: str = Field(min_length=1, max_length=40)
    approval_required: bool = True
    external_execution: bool = False
    idempotency_key: str = Field(min_length=8, max_length=200)

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str) -> str:
        return value.upper()


class AgentSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agent: str = Field(min_length=1, max_length=80)
    status: AgentStatus
    last_run_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    run_count: int = Field(default=0, ge=0)
    restart_count: int = Field(default=0, ge=0)
    signals: list[RevenueSignal] = Field(default_factory=list)
    error: str | None = Field(default=None, max_length=500)
    approval_required: bool = True
    external_execution: bool = False


class TelemetryEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event: str = Field(min_length=1, max_length=120)
    agent: str | None = Field(default=None, max_length=80)
    level: str = Field(default="info", max_length=20)
    payload: dict[str, Any] = Field(default_factory=dict)
