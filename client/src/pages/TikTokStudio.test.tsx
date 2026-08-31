import { describe, expect, it } from "vitest";
import { buildRevenueApprovalDraftRecord } from "../../../server/db";
import { buildTikTokContentDraft } from "./TikTokStudio";

describe("TikTok-Studio Freigabeentwuerfe", () => {
  it("persistiert einen TikTok-Video-Entwurf als reinen needs_approval-Datensatz ohne Aussenwirkung", () => {
    const input = buildTikTokContentDraft("CyberSarah", "KI-Agenten Kundennachfragen automatisch qualifizieren");
    expect(buildRevenueApprovalDraftRecord(19, input, "draft-tiktok")).toMatchObject({
      workspaceId: 19,
      actionKey: "draft-tiktok",
      actionType: "tiktok_content_draft",
      status: "needs_approval",
      requiresApproval: true,
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

  it("kuerzt ueberlange Persona- und Themeneingaben ab, statt sie ungeprueft zu uebernehmen", () => {
    const langePersona = "x".repeat(200);
    const langesThema = "y".repeat(500);
    const draft = buildTikTokContentDraft(langePersona, langesThema);
    expect((draft.payload.content as { persona: string }).persona.length).toBeLessThanOrEqual(80);
    expect((draft.payload.content as { hook: string }).hook.length).toBeLessThan(230);
  });
});
