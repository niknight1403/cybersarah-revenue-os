export interface RevenueGuardInput {
  expectedRevenueCents: number;
  variableCostCents: number;
  affiliateCommissionRate?: number;
  paidBoostCents?: number;
  approvedPaidBudgetCents?: number;
}

export interface RevenueGuardResult {
  allowed: boolean;
  projectedMarginCents: number;
  projectedMarginRate: number;
  reason: string;
}

export function evaluateRevenueGuard(input: RevenueGuardInput): RevenueGuardResult {
  const commission = Math.round(input.expectedRevenueCents * ((input.affiliateCommissionRate ?? 0) / 100));
  const costs = input.variableCostCents + (input.paidBoostCents ?? 0);
  const projectedMarginCents = input.expectedRevenueCents + commission - costs;
  const base = Math.max(1, input.expectedRevenueCents + commission);
  const projectedMarginRate = Math.round((projectedMarginCents / base) * 10000) / 100;
  const boost = input.paidBoostCents ?? 0;
  const approved = input.approvedPaidBudgetCents ?? 0;
  const allowed = [input.expectedRevenueCents, input.variableCostCents, boost, approved].every((v) => Number.isSafeInteger(v) && v >= 0) &&
    (boost === 0 || (boost <= approved && projectedMarginCents > 0 && projectedMarginRate >= 20));

  return {
    allowed,
    projectedMarginCents,
    projectedMarginRate,
    reason: allowed
      ? "Kostenlose/positive-Marge-Ausführung zulässig."
      : "Bezahlte Skalierung blockiert: Freigabe, gültige Kosten oder Sicherheitsmarge fehlen.",
  };
}
