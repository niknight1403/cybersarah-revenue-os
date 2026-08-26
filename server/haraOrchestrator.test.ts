import { describe, expect, it, vi } from "vitest";
import { runHaraOrchestrator } from "./db";

describe("HARA-Orchestrator-Workflow", () => {
  it("führt Analyse, reale Draft-Builder, Modulzuordnung und Abschlussaudit zusammen", async () => {
    const analyze = vi.fn().mockResolvedValue({
      revenueCents: 12000,
      paymentFailures: 0,
      cancellations: 0,
      checkoutStarted: 4,
      checkoutCompleted: 2,
      cacCents: 500,
      estimatedLtvCents: 6000,
      recommendations: [
        { type: "experiment", message: "Checkout-Abbrüche erkannt." },
        { type: "upsell", message: "Wertbasierter Upsell prüfen." },
      ],
    });
    const audit = vi.fn().mockResolvedValue(true);

    const result = await runHaraOrchestrator(73, "user", { analyze, audit });

    expect(analyze).toHaveBeenCalledWith(73, "user");
    expect(result.workflow).toBe("hara-revenue-orchestration");
    expect(result.modules).toEqual({
      hara: { status: "completed", recommendationCount: 2 },
      influence: { status: "draft_only", draftEligible: true },
      marketing: { status: "draft_only", draftEligible: true },
    });
    expect(result.drafts.map(draft => draft.actionType)).toEqual(["seo_landing_draft", "outreach_draft", "upsell_draft"]);
    expect(result.drafts.every(draft => draft.payload.externalExecution === false)).toBe(true);
    expect(result.externalExecution).toBe(false);
    expect(result.approvalRequired).toBe(true);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ eventType: "hara.orchestration.completed", status: "completed", detail: expect.objectContaining({ workflow: "hara-revenue-orchestration", draftCount: 3, externalExecution: false, approvalRequired: true }) }));
  });
});
