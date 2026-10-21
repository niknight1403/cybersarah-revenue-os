import type { HealthContentPlatform } from "./influencerContentEngine";
import { buildPostingSchedule } from "./influencerScheduler";
import { assessEvidenceSafety, buildEvidenceDisclaimer } from "./influencerEvidenceGuard";
import { scoreContentQuality } from "./influencerQualityGate";
import { pickTrendCandidate, type TrendSignal } from "./influencerTrendIntelligence";
import { selectMeasuredWinner } from "./influencerExperimentWinner";
import { evaluateRevenueGuard } from "./influencerRevenueGuard";
import { buildControlPlaneSnapshot } from "./influencerControlPlane";
import type { VariantMetrics } from "./influencerAnalytics";

export interface AutopilotPlanInput {
  trendSignals: TrendSignal[];
  claim: string;
  sourceCount?: number;
  sourceTypes?: string[];
  references?: Array<{ url: string; title: string; type: string; checkedAt: string }>;
  hook: string;
  script: string;
  hasDisclosure: boolean;
  isSponsored?: boolean;
  hasComplianceNote: boolean;
  targetSeconds: number;
  estimatedSeconds: number;
  platforms: HealthContentPlatform[];
  metrics?: VariantMetrics[];
  expectedRevenueCents?: number;
  variableCostCents?: number;
  paidBoostCents?: number;
  approvedPaidBudgetCents?: number;
}

export function buildInfluencerAutopilotPlan(input: AutopilotPlanInput) {
  const trend = pickTrendCandidate(input.trendSignals);
  const evidence = assessEvidenceSafety({
    claim: input.claim,
    sourceCount: input.sourceCount,
    sourceTypes: input.sourceTypes,
    references: input.references,
  });
  const quality = scoreContentQuality({
    hook: input.hook,
    script: input.script,
    hasDisclosure: input.hasDisclosure,
    isSponsored: input.isSponsored,
    hasComplianceNote: input.hasComplianceNote,
    targetSeconds: input.targetSeconds,
    estimatedSeconds: input.estimatedSeconds,
  });
  const schedule = buildPostingSchedule(input.platforms);
  const winner = selectMeasuredWinner(input.metrics ?? []);
  const revenue = evaluateRevenueGuard({
    expectedRevenueCents: input.expectedRevenueCents ?? 0,
    variableCostCents: input.variableCostCents ?? 0,
    paidBoostCents: input.paidBoostCents ?? 0,
    approvedPaidBudgetCents: input.approvedPaidBudgetCents ?? 0,
  });
  const control = buildControlPlaneSnapshot({
    trendScore: trend?.opportunityScore ?? 0,
    evidencePublishable: evidence.publishable,
    qualityScore: quality.score,
    scheduleCount: schedule.length,
    measuredWinner: Boolean(winner.winnerId) && winner.confidence === "strong",
    revenueAllowed: revenue.allowed,
  });

  return {
    trend,
    evidence: { ...evidence, disclaimer: buildEvidenceDisclaimer(evidence) },
    quality,
    schedule,
    winner,
    revenue,
    control,
    mayPublish: evidence.publishable && quality.ready && schedule.length > 0 && revenue.allowed,
    mayScale: winner.confidence === "strong" && evidence.publishable && quality.ready && revenue.allowed,
    policy: "Health-Claims und Qualität müssen vor Veröffentlichung bestehen; Varianten erst nach ausreichenden Messdaten skalieren; bezahlte Skalierung nur bei positiver Sicherheitsmarge.",
  };
}
