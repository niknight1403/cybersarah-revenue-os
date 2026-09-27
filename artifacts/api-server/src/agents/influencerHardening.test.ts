import { describe, expect, it } from "vitest";
import { assessEvidenceSafety } from "./influencerEvidenceGuard";
import { validVariantMetrics, normalizeVariantMetrics } from "./influencerAnalytics";
import { selectMeasuredWinner } from "./influencerExperimentWinner";
import { buildPostingSchedule } from "./influencerScheduler";
import { scoreContentQuality } from "./influencerQualityGate";
import { evaluateRevenueGuard } from "./influencerRevenueGuard";
import { rankTrendSignals } from "./influencerTrendIntelligence";
import { updateLearningState } from "./influencerLearningLoop";
import { buildControlPlaneSnapshot } from "./influencerControlPlane";
import { buildInfluencerAutopilotPlan } from "./influencerAutopilot";

const metrics = (id: string, views: number, platform: "Instagram" | "TikTok" = "Instagram") => ({
  variantId: id, platform, impressions: 2500, views, clicks: Math.floor(views / 10),
  saves: Math.floor(views / 12), conversions: Math.floor(views / 100),
});

describe("Influencer Autopilot Sprints 14-23: guardrails", () => {
  it("14: source count alone is insufficient evidence provenance", () => {
    const unsafe = assessEvidenceSafety({claim:"Eine einfache Routine",sourceCount:3,sourceTypes:["study"]});
    expect(unsafe.publishable).toBe(false);
    const traced = assessEvidenceSafety({
      claim:"Eine einfache Routine",sourceCount:3,sourceTypes:["study"],
      references:[{url:"https://example.org/study",title:"Source",type:"study",checkedAt:"2026-09-27T00:00:00Z"}],
    });
    expect(traced.publishable).toBe(true);
    expect(traced.verifiedReferences).toBe(1);
  });

  it("15: rejects negative and inconsistent metrics", () => {
    expect(validVariantMetrics({...metrics("bad", 100), clicks: 3000})).toBe(false);
    expect(validVariantMetrics({...metrics("bad", 100), views: -1})).toBe(false);
    expect(() => normalizeVariantMetrics({...metrics("bad", 100), saves: 101})).toThrow();
  });

  it("16: refuses single-arm and cross-platform winners", () => {
    expect(selectMeasuredWinner([metrics("a",1800)]).winnerId).toBeNull();
    expect(selectMeasuredWinner([metrics("a",1800),metrics("b",800,"TikTok")]).winnerId).toBeNull();
    expect(selectMeasuredWinner([metrics("a",1800),metrics("b",800)]).winnerId).toBe("a");
  });

  it("17: schedules deterministically using UTC", () => {
    const slots=buildPostingSchedule(["Instagram"],new Date("2026-09-27T10:00:00Z"));
    expect(slots[0]?.timezone).toBe("UTC");
    expect(slots[0]?.scheduledAt).toBe("2026-09-27T11:30:00.000Z");
  });

  it("18: sponsorship requires disclosure, organic content does not", () => {
    const base={hook:"A sufficiently informative hook",script:"A sufficiently long informative script with relevant safe and practical advice for everyday use.",hasDisclosure:false,hasComplianceNote:true,targetSeconds:25,estimatedSeconds:25};
    expect(scoreContentQuality({...base,isSponsored:true}).ready).toBe(false);
    expect(scoreContentQuality({...base,isSponsored:false}).ready).toBe(true);
  });

  it("19: paid boost requires a budget authorization even if profitable", () => {
    expect(evaluateRevenueGuard({expectedRevenueCents:10000,variableCostCents:100,paidBoostCents:200}).allowed).toBe(false);
    expect(evaluateRevenueGuard({expectedRevenueCents:10000,variableCostCents:100,paidBoostCents:200,approvedPaidBudgetCents:200}).allowed).toBe(true);
  });

  it("20: drops invalid trend signal scores", () => {
    expect(rankTrendSignals([{topic:"bad",platform:"TikTok",velocity:Infinity,engagement:60,saturation:20,euRelevance:90}])).toEqual([]);
  });

  it("21: directional winner cannot train the learning loop", () => {
    const state={preferredHooks:[],preferredPlatforms:[],observations:0};
    expect(updateLearningState(state,{winnerId:"a",confidence:"directional",score:60,reason:"small sample"},{hook:"A"}).state.observations).toBe(0);
  });

  it("22: missing trend evidence blocks control plane", () => {
    expect(buildControlPlaneSnapshot({trendScore:0,evidencePublishable:true,qualityScore:100,scheduleCount:1,measuredWinner:true,revenueAllowed:true}).state).toBe("blocked");
  });

  it("23: plan never publishes with only claimed source counts", () => {
    const plan=buildInfluencerAutopilotPlan({
      trendSignals:[{topic:"Wellness",platform:"Instagram",velocity:90,engagement:80,saturation:10,euRelevance:95}],
      claim:"Alltagstaugliche Routine",sourceCount:3,sourceTypes:["study"],
      hook:"Sichere Wellness-Routine",script:"Lange und sachliche Erklärung mit praktischen, realistischen und sicheren Tipps für den Alltag.",
      hasDisclosure:true,hasComplianceNote:true,targetSeconds:27,estimatedSeconds:27,
      platforms:["Instagram"],metrics:[metrics("a",1900),metrics("b",1000)],
    });
    expect(plan.mayPublish).toBe(false);
    expect(plan.mayScale).toBe(false);
    expect(plan.control.state).toBe("blocked");
  });
});
