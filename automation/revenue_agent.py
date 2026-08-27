from __future__ import annotations

from .models import PaymentTransaction, RuntimeConfig


async def run(config: RuntimeConfig) -> None:
    # Revenue analysis only. No payouts, checkout creation, or fund transfers are performed.
    if config.external_execution:
        raise RuntimeError("Revenue-Außenwirkung ist ohne explizite Freigabe blockiert")


def validate_payout_candidate(transaction: PaymentTransaction, config: RuntimeConfig) -> PaymentTransaction:
    if transaction.amount_cents < config.min_payout_cents:
        raise ValueError(f"Mindestauszahlung nicht erreicht: {config.min_payout_cents} Cent")
    if transaction.external_execution or not transaction.approval_required:
        raise ValueError("Finanztransaktion benötigt Approval und darf nicht direkt ausgeführt werden")
    return transaction
