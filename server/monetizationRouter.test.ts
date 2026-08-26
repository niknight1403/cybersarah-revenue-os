import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({ getRevenueWorkspaceByUser: vi.fn(), createRevenueApprovalDraft: vi.fn(), recordGrowthAudit: vi.fn(), getMonetizationOverview: vi.fn() }));
vi.mock("./db", () => db);
import { appRouter } from "./routers";

function context(): TrpcContext {
  return { user: { id: 8, openId: "monetization-user", name: "Revenue", email: "revenue@example.com", loginMethod: "manus", role: "user", is21Verified: false, verificationMethod: null, verificationTimestamp: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {}, protocol: "https" } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("monetization router", () => {
  it("erstellt Social-Entwürfe nur als gekennzeichnete, nicht externe Freigabeaktion", async () => {
    db.getRevenueWorkspaceByUser.mockResolvedValue({ id: 41, userId: 8 });
    const result = await appRouter.createCaller(context()).monetization.createDraft({ channel: "social", target: "LinkedIn", title: "Launch", content: "Ein transparenter Launch-Entwurf", affiliate: false, sponsored: false });
    expect(result).toMatchObject({ success: true, actionType: "social_distribution_draft", disclosure: "🤖 Posted by AI Agent" });
    expect(db.createRevenueApprovalDraft).toHaveBeenCalledWith(8, expect.objectContaining({ actionType: "social_distribution_draft", payload: expect.objectContaining({ externalExecution: false, consentRequired: true }) }));
    expect(db.recordGrowthAudit).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 41, eventType: "monetization.draft.created", status: "accepted" }));
  });
});
