export interface RevenueGuardInput {
  expectedRevenueCents: number;
  variableCostCents: number;
  affiliateCommissionRate?: number;
  paidBoostCents?: number;
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
  const allowed = (input.paidBoostCents ?? 0) === 0 || (projectedMarginCents > 0 && projectedMarginRate >= 20);

  return {
    allowed,
    projectedMarginCents,
    projectedMarginRate,
    reason: allowed
      ? "Kostenlose/positive-Marge-Ausführung zulässig."
      : "Bezahlte Skalierung blockiert: erwartete Marge unter Sicherheitsgrenze.",
  };
}
