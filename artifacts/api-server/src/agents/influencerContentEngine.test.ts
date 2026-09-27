import { describe, expect, it } from "vitest";
import {
  buildAffiliateStrategy,
  buildCampaignVariants,
  buildContentEnginePackage,
  buildHashtags,
  buildProductionPlan,
  buildScriptBrief,
  containsRiskyHealthClaim,
  evaluateAffiliateFit,
  sanitizeHealthCopy,
  scoreEngagementDistribution,
  selectBestReadyVariant,
} from "./influencerContentEngine";

describe("influencerContentEngine", () => {
  it("builds a platform-specific EU-safe script brief", () => {
    const brief = buildScriptBrief({ thema: "Abendroutine mit Magnesium", plattform: "TikTok" });
    expect(brief).toContain("Sekunden Laufzeit");
    expect(brief).toContain("Avatar-ID");
    expect(brief).toContain("Keine Heilversprechen");
  });

  it("builds a deterministic production plan", () => {
    const plan = buildProductionPlan({ thema: "Morgenroutine", plattform: "Instagram", angle: "checkliste" });
    expect(plan.avatar.id).toBe("cybersarah-health-eu-v1");
    expect(plan.playbook.platform).toBe("Instagram");
    expect(plan.structure.length).toBe(3);
  });

  it("flags and sanitizes risky health claims", () => {
    expect(containsRiskyHealthClaim("Dieses Mittel heilt garantiert")).toBe(true);
    expect(sanitizeHealthCopy("Dieses Mittel heilt garantiert")).not.toMatch(/heilt|garantiert/i);
  });

  it("creates a complete influencer package", () => {
    const pkg = buildContentEnginePackage({
      thema: "Morgenroutine für mehr Wohlbefinden",
      plattform: "Instagram",
      affiliateProdukt: "Beispiel Wellness Guide",
    });
    expect(pkg.imagePrompt).toContain("9:16");
    expect(pkg.affiliateStrategy).toContain("Affiliate-Produkt");
    expect(pkg.productionPlan.hook.length).toBeGreaterThan(10);
    expect(pkg.complianceNotes.length).toBeGreaterThanOrEqual(5);
  });

  it("scores affiliate fit conservatively", () => {
    const safe = evaluateAffiliateFit({
      thema: "Alltagstaugliche Wellness Routine",
      plattform: "YouTube",
      affiliateProdukt: "Guide",
      zielgruppe: "Erwachsene 35-60 mit Interesse an Wellness im Alltag",
    });
    const risky = evaluateAffiliateFit({
      thema: "Heilt garantiert Beschwerden",
      plattform: "YouTube",
      affiliateProdukt: "Guide",
    });
    expect(safe.eligible).toBe(true);
    expect(risky.score).toBeLessThan(safe.score);
    expect(safe.disclosure).toContain("Affiliate-Link");
  });

  it("keeps affiliate strategy transparent", () => {
    expect(buildAffiliateStrategy({ thema: "Routine", plattform: "YouTube", affiliateProdukt: "Guide" }))
      .toContain("Werbung/Affiliate-Link");
  });

  it("creates stable hashtag output", () => {
    expect(buildHashtags("Natürliche Abend Routine")).toContain("#Wellness");
  });

  it("creates two experiment variants per platform", () => {
    const variants = buildCampaignVariants({
      thema: "Abendroutine für Wohlbefinden",
      affiliateProdukt: "Wellness Guide",
    }, ["TikTok", "Instagram", "YouTube"]);
    expect(variants).toHaveLength(6);
    expect(variants.map((v) => v.primaryMetric)).toContain("retention");
    expect(selectBestReadyVariant(variants)?.readinessScore).toBeGreaterThan(0);
  });

  it("scores engagement distribution deterministically", () => {
    expect(scoreEngagementDistribution({ TikTok: 6, Instagram: 3, YouTube: 1 })).toEqual({
      topPlatform: "TikTok",
      total: 10,
      concentration: 0.6,
    });
  });
});
