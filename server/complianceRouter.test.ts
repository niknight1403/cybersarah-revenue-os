import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({ getRevenueWorkspaceByUser: vi.fn(), createRevenueApprovalDraft: vi.fn(), recordGrowthAudit: vi.fn(), getComplianceStatus: vi.fn() }));
vi.mock("./db", () => db);
import { appRouter } from "./routers";

function context(): TrpcContext {
  return { user: { id: 9, openId: "compliance-user", name: "Compliance", email: "compliance@example.com", loginMethod: "manus", role: "user", is21Verified: false, verificationMethod: null, verificationTimestamp: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {}, protocol: "https" } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("compliance router", () => {
  it("bereitet eine Drittanbieter-KYC-Anbindung nur als Entwurf ohne KYC-Speicherung oder Freischaltung vor", async () => {
    db.getRevenueWorkspaceByUser.mockResolvedValue({ id: 51, userId: 9 });
    const result = await appRouter.createCaller(context()).compliance.requestVerificationProviderSetup({ method: "third_party_kyc" });
    expect(result).toEqual({ success: true, verified: false });
    expect(db.createRevenueApprovalDraft).toHaveBeenCalledWith(9, expect.objectContaining({ actionType: "age_verification_provider_setup_draft", payload: expect.objectContaining({ externalExecution: false, storesKycDocuments: false, vaultAccess: false }) }));
    expect(db.recordGrowthAudit).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 51, eventType: "compliance.verification_provider_setup_draft", status: "accepted" }));
  });
});
