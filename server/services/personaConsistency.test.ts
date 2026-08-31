import { describe, expect, it, afterEach } from "vitest";
import { checkSocialConnectorAvailable, checkAllSocialConnectors } from "./socialConnectors";
import { buildUtmCampaign, appendUtmToLinks } from "./socialUtm";
import { buildPersonaReferenceDraft } from "./personaConsistency";

describe("Social-Connector-Verfuegbarkeit", () => {
  const ENV_KEY = "TIKTOK_ACCESS_TOKEN";
  const original = process.env[ENV_KEY];

  afterEach(() => {
    if (original === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = original;
  });

  it("meldet ehrlich, wenn kein Token gesetzt ist", () => {
    delete process.env[ENV_KEY];
    const status = checkSocialConnectorAvailable("tiktok");
    expect(status).toMatchObject({ available: false, platform: "tiktok" });
  });

  it("meldet verfuegbar, sobald ein Token gesetzt ist", () => {
    process.env[ENV_KEY] = "test-token-123";
    const status = checkSocialConnectorAvailable("tiktok");
    expect(status).toEqual({ available: true, platform: "tiktok" });
  });

  it("prueft alle drei Plattformen unabhaengig voneinander", () => {
    const results = checkAllSocialConnectors();
    expect(results).toHaveLength(3);
    expect(results.map(r => r.platform).sort()).toEqual(["instagram", "tiktok", "youtube_shorts"]);
  });
});

describe("UTM-Tracking pro Post", () => {
  it("baut eine eindeutige Kampagnen-Kennung aus Persona, Plattform und Tag", () => {
    const campaign = buildUtmCampaign({ persona: "CyberSarah", platform: "tiktok", currentDay: "2026-08-31" });
    expect(campaign).toBe("cybersarah-tiktok-2026-08-31");
  });

  it("haengt UTM-Parameter an alle Links im Text an", () => {
    const text = "Schau dir das an: https://cybersarah-ki.de/produkt und teile es!";
    const result = appendUtmToLinks(text, "cybersarah-tiktok-2026-08-31");
    expect(result).toContain("utm_campaign=cybersarah-tiktok-2026-08-31");
    expect(result).toContain("Schau dir das an:");
  });

  it("nutzt Et-Zeichen statt Fragezeichen wenn die URL bereits Parameter hat", () => {
    const text = "https://example.com/x?ref=abc";
    const result = appendUtmToLinks(text, "test-campaign");
    expect(result).toContain("?ref=abc&utm_source=");
  });
});

describe("Persona-Referenzbild-Entwurf", () => {
  it("erstellt einen reinen needs_approval-Entwurf ohne automatische Bildgenerierung", () => {
    const draft = buildPersonaReferenceDraft("CyberSarah", "freundlich, professionell, dunkelblauer Hintergrund");
    expect(draft).toMatchObject({
      actionType: "persona_reference_image_draft",
      payload: {
        externalExecution: false,
        consentRequired: true,
        uploadReady: false,
        content: {
          persona: "CyberSarah",
          guardrail: expect.stringContaining("keine automatische"),
        },
      },
    });
  });

  it("zeigt an, welche Plattformen noch nicht verbunden sind", () => {
    const draft = buildPersonaReferenceDraft("CyberSarah", "Stil");
    const content = draft.payload.content as { offenePlattformen: string[] };
    expect(Array.isArray(content.offenePlattformen)).toBe(true);
  });
});
