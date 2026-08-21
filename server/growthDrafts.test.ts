import { describe, expect, it } from "vitest";
import { buildGrowthActionDrafts } from "./db";

describe("konkrete Growth-Entwurfsvorlagen", () => {
  it("erstellt SEO-, Landingpage-, Outreach- und Social-Inhalte ausschließlich als gesperrte Freigabeentwürfe", () => {
    const drafts = buildGrowthActionDrafts({ workspaceId: 19, currentDay: "2026-08-21", recommendation: { type: "experiment", message: "Checkout-Abbrüche erkannt." } });
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      actionType: "seo_landing_draft",
      payload: { externalExecution: false, content: { headline: "Wachstum messbar steuern statt blind skalieren." } },
    });
    expect(drafts[1]).toMatchObject({
      actionType: "outreach_draft",
      payload: { externalExecution: false, consentRequired: true, content: { socialCopy: expect.any(String), outreachAngle: expect.any(String) } },
    });
  });

  it("erstellt Upsell-Inhalte nur als einwilligungs- und freigabepflichtigen Entwurf", () => {
    const drafts = buildGrowthActionDrafts({ workspaceId: 19, currentDay: "2026-08-21", recommendation: { type: "upsell", message: "Aktive Kundschaft erkannt." } });
    expect(drafts).toEqual([expect.objectContaining({
      actionType: "upsell_draft",
      payload: expect.objectContaining({ externalExecution: false, consentRequired: true, content: expect.objectContaining({ offer: expect.any(String), guardrail: expect.stringContaining("keine automatische") }) }),
    })]);
  });
});
