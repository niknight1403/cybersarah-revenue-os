import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({ activateGrowthExperiment: vi.fn(), pauseGrowthExperiment: vi.fn() }));
vi.mock("./db", () => db);

import { appRouter } from "./routers";

function context(role: "admin" | "user"): TrpcContext {
  return { user: { id: role === "admin" ? 1 : 2, openId: `${role}-experiment`, name: role, email: null, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {}, protocol: "https" } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("growth experiment admin gates", () => {
  beforeEach(() => { vi.clearAllMocks(); db.activateGrowthExperiment.mockResolvedValue({ experimentId: 7, status: "active", maxTrafficPercent: 10 }); db.pauseGrowthExperiment.mockResolvedValue({ experimentId: 7, status: "paused" }); });

  it("überlässt Aktivierung und Pausierung ausschließlich Admins", async () => {
    const admin = appRouter.createCaller(context("admin"));
    await expect(admin.growth.activateExperiment({ experimentId: 7, maxTrafficPercent: 10 })).resolves.toMatchObject({ status: "active" });
    await expect(admin.growth.pauseExperiment({ experimentId: 7 })).resolves.toMatchObject({ status: "paused" });
    expect(db.activateGrowthExperiment).toHaveBeenCalledWith(1, { experimentId: 7, maxTrafficPercent: 10 });
    expect(db.pauseGrowthExperiment).toHaveBeenCalledWith(1, 7);
    const user = appRouter.createCaller(context("user"));
    await expect(user.growth.activateExperiment({ experimentId: 7, maxTrafficPercent: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
