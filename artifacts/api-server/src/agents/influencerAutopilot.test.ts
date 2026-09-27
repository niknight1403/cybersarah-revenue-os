import { describe, expect, it } from "vitest";
import { rankTrendSignals, pickTrendCandidate } from "./influencerTrendIntelligence";
import { assessEvidenceSafety } from "./influencerEvidenceGuard";
import { scoreContentQuality } from "./influencerQualityGate";
import { buildPostingSchedule } from "./influencerScheduler";
import { normalizeVariantMetrics, isSufficientSample } from "./influencerAnalytics";
import { selectMeasuredWinner } from "./influencerExperimentWinner";
import { evaluateRevenueGuard } from "./influencerRevenueGuard";
import { updateLearningState } from "./influencerLearningLoop";
import { buildControlPlaneSnapshot } from "./influencerControlPlane";
import { buildInfluencerAutopilotPlan } from "./influencerAutopilot";

describe("Influencer Autopilot Sprints 4-13", () => {
  it("Sprint 4 ranks EU-relevant trend opportunities", () => {
    const ranked = rankTrendSignals([
      { topic: "A", platform: "TikTok", velocity: 80, engagement: 75, saturation: 30, euRelevance: 90 },
      { topic: "B", platform: "Instagram", velocity: 30, engagement: 40, saturation: 80, euRelevance: 50 },
    ]);
    expect(ranked[0]?.topic).toBe("A");
    expect(pickTrendCandidate(ranked, 60)?.topic).toBe("A");
  });

  it("Sprint 5 blocks risky unsupported health claims", () => {
    const result = assessEvidenceSafety({ claim: "Das heilt garantiert Beschwerden", sourceCount: 0 });
    expect(result.publishable).toBe(false);
    expect(result.requiresDisclaimer).toBe(true);
  });

  it("Sprint 6 requires quality and compliance", () => {
    const good = scoreContentQuality({
      hook: "Drei einfache Dinge, die deine Routine realistischer machen.",
      script: "Eine ausreichend lange, sachliche Erklärung mit konkreten alltagstauglichen Punkten und einem vorsichtigen CTA ohne Heilversprechen.",
      hasDisclosure: true,
      hasComplianceNote: true,
      targetSeconds: 25,
      estimatedSeconds: 27,
    });
    expect(good.ready).toBe(true);
    expect(good.score).toBeGreaterThanOrEqual(70);
  });

  it("Sprint 7 builds a slot for every requested platform", () => {
    const schedule = buildPostingSchedule(["TikTok", "Instagram", "YouTube"], new Date("2026-09-27T10:00:00Z"));
    expect(schedule).toHaveLength(3);
    expect(schedule.every((slot) => Boolean(slot.scheduledAt))).toBe(true);
  });

  it("Sprint 8 normalizes analytics and enforces sample size", () => {
    const metrics = { variantId: "v1", platform: "TikTok" as const, impressions: 1000, views: 700, clicks: 40, saves: 35, conversions: 4 };
    const normalized = normalizeVariantMetrics(metrics);
    expect(normalized.retentionRate).toBe(70);
    expect(normalized.ctr).toBe(4);
    expect(isSufficientSample(metrics)).toBe(true);
  });

  it("Sprint 9 selects only measured winners", () => {
    const winner = selectMeasuredWinner([
      { variantId: "a", platform: "TikTok", impressions: 1500, views: 1000, clicks: 70, saves: 50, conversions: 8 },
      { variantId: "b", platform: "TikTok", impressions: 1500, views: 800, clicks: 40, saves: 25, conversions: 3 },
    ]);
    expect(winner.winnerId).toBe("a");
    expect(winner.confidence).not.toBe("insufficient");
  });

  it("Sprint 10 blocks unprofitable paid scaling", () => {
    const result = evaluateRevenueGuard({ expectedRevenueCents: 1000, variableCostCents: 900, paidBoostCents: 500 });
    expect(result.allowed).toBe(false);
  });

  it("Sprint 11 learns only from measured winners", () => {
    const update = updateLearningState(
      { preferredHooks: [], preferredPlatforms: [], observations: 0 },
      { winnerId: "v1", confidence: "strong", score: 90, reason: "clear" },
      { hook: "Hook A", platform: "TikTok" },
    );
    expect(update.state.preferredHooks).toContain("Hook A");
    expect(update.state.observations).toBe(1);
  });

  it("Sprint 12 blocks the control plane on evidence/quality failures", () => {
    const snapshot = buildControlPlaneSnapshot({
      trendScore: 90,
      evidencePublishable: false,
      qualityScore: 60,
      scheduleCount: 3,
      measuredWinner: false,
      revenueAllowed: true,
    });
    expect(snapshot.state).toBe("blocked");
    expect(snapshot.blockers.length).toBeGreaterThan(0);
  });

  it("Sprint 13 composes a ready autonomous plan", () => {
    const plan = buildInfluencerAutopilotPlan({
      trendSignals: [
        { topic: "Abendroutine", platform: "Instagram", velocity: 90, engagement: 85, saturation: 20, euRelevance: 95 },
      ],
      claim: "Eine einfache Abendroutine kann beim Entspannen helfen.",
      sourceCount: 3,
      sourceTypes: ["systematic review", "guideline", "study"],
      references: [{url:"https://www.who.int/",title:"WHO source for review",type:"authority",checkedAt:"2026-09-27T00:00:00Z"}],
      hook: "Diese drei kleinen Schritte machen eine Abendroutine leichter.",
      script: "Eine sachliche, ausreichend lange Erklärung mit drei alltagstauglichen Schritten, realistischer Einordnung und transparentem Hinweis auf allgemeine Wellness-Informationen.",
      hasDisclosure: true,
      hasComplianceNote: true,
      targetSeconds: 27,
      estimatedSeconds: 27,
      platforms: ["Instagram"],
      metrics: [
        { variantId: "ig-a", platform: "Instagram", impressions: 2500, views: 1900, clicks: 130, saves: 150, conversions: 18 },
        { variantId: "ig-b", platform: "Instagram", impressions: 2500, views: 1200, clicks: 65, saves: 75, conversions: 9 },
      ],
      expectedRevenueCents: 2000,
      variableCostCents: 200,
      paidBoostCents: 0,
    });
    expect(plan.control.state).toBe("ready");
    expect(plan.winner.winnerId).toBe("ig-a");
    expect(plan.evidence.publishable).toBe(true);
  });
});
