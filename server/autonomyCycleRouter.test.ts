import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({ getRevenueWorkspaceByUser: vi.fn(), recordGrowthAudit: vi.fn(), runGrowthAnalysis: vi.fn(), updateGrowthAudit: vi.fn() }));
vi.mock("./db", () => db);
import { appRouter } from "./routers";

function context(): TrpcContext {
  return { user: { id: 13, openId: "autonomy-user", name: "Autonomy", email: "autonomy@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {}, protocol: "https" } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("autonomy cycle router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("startet die interne Analyse einmalig, protokolliert sie und führt keine Außenwirkung aus", async () => {
    db.getRevenueWorkspaceByUser.mockResolvedValue({ id: 73, userId: 13 });
    db.recordGrowthAudit.mockResolvedValue(true);
    db.runGrowthAnalysis.mockResolvedValue({ recommendations: [{ type: "experiment" }] });
    const result = await appRouter.createCaller(context()).growth.startAutonomyCycle();
    expect(result).toEqual({ started: true, duplicate: false, recommendations: 1 });
    expect(db.runGrowthAnalysis).toHaveBeenCalledWith(73, "user");
    expect(db.recordGrowthAudit).toHaveBeenCalledWith(expect.objectContaining({ eventType: "autonomy.cycle.started", detail: { externalExecution: false, approvalRequired: true } }));
    expect(db.updateGrowthAudit).toHaveBeenCalledWith(expect.stringContaining("autonomy-cycle-start:73:"), "completed", expect.objectContaining({ externalExecution: false, approvalRequired: true }));
  });

  it("weist einen erneuten Start am selben Tag ohne zweiten Analyse-Lauf zurück", async () => {
    db.getRevenueWorkspaceByUser.mockResolvedValue({ id: 73, userId: 13 });
    db.recordGrowthAudit.mockResolvedValue(false);
    const result = await appRouter.createCaller(context()).growth.startAutonomyCycle();
    expect(result.duplicate).toBe(true);
    expect(db.runGrowthAnalysis).not.toHaveBeenCalled();
  });
});
