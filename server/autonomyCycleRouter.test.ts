import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({ getRevenueWorkspaceByUser: vi.fn(), getGrowthLoopStatus: vi.fn(), getAutonomyCycleStatus: vi.fn(), saveAutonomyMode: vi.fn(), recordGrowthAudit: vi.fn(), runGrowthAnalysis: vi.fn(), runHaraOrchestrator: vi.fn(), updateGrowthAudit: vi.fn() }));
vi.mock("./db", () => db);
import { appRouter } from "./routers";

function context(): TrpcContext {
  return { user: { id: 13, openId: "autonomy-user", name: "Autonomy", email: "autonomy@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {}, protocol: "https" } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function anonymousContext(): TrpcContext {
  return { user: null, req: { headers: {}, protocol: "https" } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("autonomy cycle router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getGrowthLoopStatus.mockResolvedValue({ setting: { autonomyMode: "semi" } });
  });
  it("wechselt den Semi-Autopilot reversibel und auditiert den sicheren Modus", async () => {
    db.getRevenueWorkspaceByUser.mockResolvedValue({ id: 73, userId: 13 });
    db.saveAutonomyMode.mockResolvedValue({ autonomyMode: "paused" });
    await expect(appRouter.createCaller(context()).growth.setAutonomyMode({ mode: "paused" })).resolves.toEqual({ mode: "paused", externalExecution: false, approvalRequired: true });
    expect(db.recordGrowthAudit).toHaveBeenCalledWith(expect.objectContaining({ eventType: "autonomy.mode.changed", detail: { mode: "paused", externalExecution: false, approvalRequired: true } }));
  });

  it("blockiert den Startzyklus im pausierten Modus ohne Analyse oder Außenwirkung", async () => {
    db.getRevenueWorkspaceByUser.mockResolvedValue({ id: 73, userId: 13 });
    db.getGrowthLoopStatus.mockResolvedValue({ setting: { autonomyMode: "paused" } });
    await expect(appRouter.createCaller(context()).growth.startAutonomyCycle()).resolves.toMatchObject({ started: false, paused: true });
    expect(db.runHaraOrchestrator).not.toHaveBeenCalled();
    expect(db.recordGrowthAudit).not.toHaveBeenCalled();
  });

  it("startet die interne Analyse einmalig, protokolliert sie und führt keine Außenwirkung aus", async () => {
    db.getRevenueWorkspaceByUser.mockResolvedValue({ id: 73, userId: 13 });
    db.recordGrowthAudit.mockResolvedValue(true);
    db.runHaraOrchestrator.mockResolvedValue({ recommendations: [{ type: "experiment" }], workflow: "hara-revenue-orchestration", modules: { hara: { status: "completed", recommendationCount: 1 }, influence: { status: "draft_only", draftEligible: true }, marketing: { status: "draft_only", draftEligible: true } } });
    const result = await appRouter.createCaller(context()).growth.startAutonomyCycle();
    expect(result).toMatchObject({ started: true, duplicate: false, recommendations: 1, workflow: "hara-revenue-orchestration", modules: { hara: { status: "completed" }, influence: { status: "draft_only" }, marketing: { status: "draft_only" } } });
    expect(db.runHaraOrchestrator).toHaveBeenCalledWith(73, "user");
    expect(db.recordGrowthAudit).toHaveBeenCalledWith(expect.objectContaining({ eventType: "autonomy.cycle.started", detail: { externalExecution: false, approvalRequired: true } }));
    expect(db.updateGrowthAudit).toHaveBeenCalledWith(expect.stringContaining("autonomy-cycle-start:73:"), "completed", expect.objectContaining({ externalExecution: false, approvalRequired: true, workflow: "hara-revenue-orchestration", modules: { hara: { status: "completed", recommendationCount: 1 }, influence: { status: "draft_only", draftEligible: true }, marketing: { status: "draft_only", draftEligible: true } } }));
  });

  it.each([
    ["idle", null, 0],
    ["started", new Date("2026-08-26T07:00:00.000Z"), 2],
    ["failed", new Date("2026-08-26T07:05:00.000Z"), 0],
  ] as const)("liest den persistenten %s Zyklusstatus geschützt und ohne Außenwirkung", async (status, startedAt, recommendations) => {
    db.getAutonomyCycleStatus.mockResolvedValue({ status, startedAt, recommendations, externalExecution: false });
    await expect(appRouter.createCaller(context()).growth.autonomyCycleStatus()).resolves.toMatchObject({ status, recommendations, externalExecution: false });
    expect(db.getAutonomyCycleStatus).toHaveBeenCalledWith(13);
    expect(db.runHaraOrchestrator).not.toHaveBeenCalled();
    expect(db.recordGrowthAudit).not.toHaveBeenCalled();
    expect(db.updateGrowthAudit).not.toHaveBeenCalled();
  });

  it("verweigert anonymen Zugriff auf die Zyklusdiagnose", async () => {
    await expect(appRouter.createCaller(anonymousContext()).growth.autonomyCycleStatus()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.getAutonomyCycleStatus).not.toHaveBeenCalled();
  });

  it("weist einen erneuten Start am selben Tag ohne zweiten Analyse-Lauf zurück", async () => {
    db.getRevenueWorkspaceByUser.mockResolvedValue({ id: 73, userId: 13 });
    db.recordGrowthAudit.mockResolvedValue(false);
    const result = await appRouter.createCaller(context()).growth.startAutonomyCycle();
    expect(result.duplicate).toBe(true);
    expect(db.runHaraOrchestrator).not.toHaveBeenCalled();
  });
});
