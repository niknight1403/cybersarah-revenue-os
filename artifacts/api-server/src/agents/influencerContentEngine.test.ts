import { describe, expect, it } from "vitest";
import {
  buildAffiliateStrategy,
  buildContentEnginePackage,
  buildHashtags,
  buildScriptBrief,
  containsRiskyHealthClaim,
  scoreEngagementDistribution,
} from "./influencerContentEngine";

describe("influencerContentEngine", () => {
  it("builds a 15-30 second EU-safe script brief", () => {
    const brief = buildScriptBrief({ thema: "Abendroutine mit Magnesium", plattform: "TikTok" });
    expect(brief).toContain("15-30 Sekunden");
    expect(brief).toContain("0-3s");
    expect(brief).toContain("Keine Heilversprechen");
  });

  it("flags risky health claims", () => {
    expect(containsRiskyHealthClaim("Dieses Mittel heilt garantiert")).toBe(true);
    expect(containsRiskyHealthClaim("Allgemeine Wellness-Routine")).toBe(false);
  });

  it("creates a complete influencer package", () => {
    const pkg = buildContentEnginePackage({
      thema: "Morgenroutine für mehr Wohlbefinden",
      plattform: "Instagram",
      affiliateProdukt: "Beispiel Wellness Guide",
    });
    expect(pkg.imagePrompt).toContain("9:16");
    expect(pkg.affiliateStrategy).toContain("Affiliate-Produkt");
    expect(pkg.complianceNotes.length).toBeGreaterThanOrEqual(5);
    expect(pkg.hashtags.length).toBeGreaterThan(0);
  });

  it("keeps affiliate strategy transparent", () => {
    expect(buildAffiliateStrategy({
      thema: "Routine",
      plattform: "YouTube",
      affiliateProdukt: "Guide",
    })).toContain("Werbung/Affiliate-Link");
  });

  it("creates stable hashtag output", () => {
    expect(buildHashtags("Natürliche Abend Routine")).toContain("#Wellness");
  });

  it("scores engagement distribution deterministically", () => {
    expect(scoreEngagementDistribution({ TikTok: 6, Instagram: 3, YouTube: 1 })).toEqual({
      topPlatform: "TikTok",
      total: 10,
      concentration: 0.6,
    });
  });
});
