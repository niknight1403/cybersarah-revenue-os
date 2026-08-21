import { describe, expect, it, vi } from "vitest";
import { buildRevenueApprovalDraftRecord } from "./db";
import { buildInfluenceDraft } from "../client/src/pages/InfluenceCenter";
import { buildProductMarketingDraft } from "../client/src/pages/ProductMarketing";

describe("persistierte Autonomie-Freigabeentwürfe", () => {
  it("persistiert KI-Influence als reinen needs_approval-Entwurf ohne Außenwirkung", () => {
    const input = buildInfluenceDraft("Gründerinnen mit Bedarf an auditierbarer Revenue-Automation");
    expect(buildRevenueApprovalDraftRecord(19, input, "draft-influence")).toMatchObject({
      workspaceId: 19,
      actionKey: "draft-influence",
      actionType: "ai_influence_campaign_draft",
      status: "needs_approval",
      requiresApproval: true,
      payload: { externalExecution: false, consentRequired: true },
    });
  });

  it("persistiert Produktmarketing als reinen needs_approval-Entwurf ohne Preis- oder Kampagnenaktivierung", () => {
    const input = buildProductMarketingDraft("Revenue OS Pro", "Mehr Kontrolle für auditierbares Wachstum");
    expect(buildRevenueApprovalDraftRecord(19, input, "draft-product")).toMatchObject({
      workspaceId: 19,
      actionKey: "draft-product",
      actionType: "product_marketing_integration_draft",
      status: "needs_approval",
      requiresApproval: true,
      payload: { externalExecution: false, content: { guardrail: expect.stringContaining("keine automatische") } },
    });
  });
});
