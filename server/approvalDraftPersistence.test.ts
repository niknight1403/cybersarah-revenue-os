import { describe, expect, it, vi } from "vitest";
import { createRevenueApprovalDraft } from "./db";

describe("Approval-Draft-Persistenzgrenze", () => {
  it("persistiert nach einem sicheren Moduswechsel ausschließlich needs_approval", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const result = await createRevenueApprovalDraft(7, { actionType: "social_distribution_draft", target: "LinkedIn", payload: { externalExecution: false, consentRequired: true } }, {
      getWorkspace: vi.fn().mockResolvedValue({ id: 19, userId: 7 }),
      persist,
    });

    expect(result).toEqual({ status: "needs_approval", requiresApproval: true, externalExecution: false });
    expect(persist).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 19, status: "needs_approval", requiresApproval: true, payload: { externalExecution: false, consentRequired: true } }));
    expect(persist).not.toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ externalExecution: true }) }));
  });
});
