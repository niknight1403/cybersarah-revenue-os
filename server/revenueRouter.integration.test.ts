import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({
  getRevenueOverview: vi.fn(),
  getRevenueWorkspaceByUser: vi.fn(),
  saveAutonomyMode: vi.fn(),
  recordGrowthAudit: vi.fn(),
  createRevenueWorkspace: vi.fn(),
  setRevenueAgentEnabled: vi.fn(),
  createRevenueApprovalDraft: vi.fn(),
}));

vi.mock("./db", () => db);

import { appRouter } from "./routers";

function createAuthenticatedContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "revenue-test-user",
      name: "Revenue Test",
      email: "revenue@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: {}, protocol: "https" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createAnonymousContext(): TrpcContext {
  return { user: null, req: { headers: {}, protocol: "https" } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("revenue router integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.createRevenueApprovalDraft.mockResolvedValue({ status: "needs_approval", requiresApproval: true, externalExecution: false });
  });

  it("initialisiert einen fehlenden persönlichen Arbeitsbereich", async () => {
    db.getRevenueWorkspaceByUser.mockResolvedValueOnce(undefined);
    db.createRevenueWorkspace.mockResolvedValue({ id: 19, userId: 7, name: "Revenue Test" });
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(caller.revenue.initialize({ name: "Revenue Test" })).resolves.toMatchObject({ id: 19 });
    expect(db.getRevenueWorkspaceByUser).toHaveBeenCalledWith(7);
    expect(db.createRevenueWorkspace).toHaveBeenCalledWith(7, "Revenue Test");
  });

  it("liefert Übersicht und übergibt Agentensteuerung nur für den aktuellen Nutzer", async () => {
    db.getRevenueOverview.mockResolvedValue({ workspace: { id: 19 }, agents: [], pendingApprovals: 0, approvalActions: [], latestAudit: null });
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(caller.revenue.overview()).resolves.toMatchObject({ workspace: { id: 19 } });
    await expect(caller.revenue.setAgentEnabled({ agentId: 23, enabled: false })).resolves.toEqual({ success: true });
    expect(db.getRevenueOverview).toHaveBeenCalledWith(7);
    expect(db.setRevenueAgentEnabled).toHaveBeenCalledWith(7, 23, false);
  });

  it("legt nur bei bestehendem Arbeitsbereich einen Freigabeentwurf an", async () => {
    db.getRevenueWorkspaceByUser.mockResolvedValue({ id: 19, userId: 7 });
    const caller = appRouter.createCaller(createAuthenticatedContext());
    const input = { actionType: "Campaign review", target: "Kampagne Q4", payload: { source: "test" } };

    await expect(caller.revenue.createApprovalDraft(input)).resolves.toMatchObject({ success: true, status: "needs_approval", requiresApproval: true, externalExecution: false });
    expect(db.createRevenueApprovalDraft).toHaveBeenCalledWith(7, input);
  });

  it("hält nach dem Semi-Autopilot-Moduswechsel externe Marketing-Wirkungen im Approval-Draft-Pfad", async () => {
    db.getRevenueWorkspaceByUser.mockResolvedValue({ id: 19, userId: 7 });
    db.saveAutonomyMode.mockResolvedValue({ autonomyMode: "semi" });
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.growth.setAutonomyMode({ mode: "semi" })).resolves.toMatchObject({ mode: "semi", externalExecution: false, approvalRequired: true });
    const input = { actionType: "social_distribution_draft", target: "LinkedIn", payload: { externalExecution: false, consentRequired: true } };
    await expect(caller.revenue.createApprovalDraft(input)).resolves.toMatchObject({ success: true, status: "needs_approval", requiresApproval: true, externalExecution: false });
    expect(db.createRevenueApprovalDraft).toHaveBeenCalledWith(7, input);
    expect(db.createRevenueApprovalDraft).not.toHaveBeenCalledWith(7, expect.objectContaining({ payload: expect.objectContaining({ externalExecution: true }) }));
  });

  it("leitet KI-Influence- und Produktmarketing-Entwürfe unverändert an den geschützten Draft-Pfad weiter", async () => {
    db.getRevenueWorkspaceByUser.mockResolvedValue({ id: 19, userId: 7 });
    const caller = appRouter.createCaller(createAuthenticatedContext());
    const influence = { actionType: "ai_influence_campaign_draft", target: "KI-Influence-Kampagne", payload: { externalExecution: false, consentRequired: true } };
    const marketing = { actionType: "product_marketing_integration_draft", target: "Revenue OS Pro", payload: { externalExecution: false } };
    await caller.revenue.createApprovalDraft(influence);
    await caller.revenue.createApprovalDraft(marketing);
    expect(db.createRevenueApprovalDraft).toHaveBeenCalledWith(7, influence);
    expect(db.createRevenueApprovalDraft).toHaveBeenCalledWith(7, marketing);
  });

  it("verweigert nicht angemeldeten Aufrufen den Zugriff auf freigabepflichtige Autonomie-Entwürfe", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.revenue.createApprovalDraft({ actionType: "ai_influence_campaign_draft", target: "KI-Influence-Kampagne", payload: { externalExecution: false } })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.createRevenueApprovalDraft).not.toHaveBeenCalled();
  });
});
