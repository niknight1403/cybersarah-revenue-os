import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({ getGrowthLoopStatus: vi.fn(), saveGrowthLoopSchedule: vi.fn(), recordGrowthAudit: vi.fn() }));
const heartbeat = vi.hoisted(() => ({ createHeartbeatJob: vi.fn(), updateHeartbeatJob: vi.fn() }));

vi.mock("./db", () => db);
vi.mock("./_core/heartbeat", () => heartbeat);

import { appRouter } from "./routers";

function context(): TrpcContext {
  return {
    user: { id: 7, openId: "schedule-user", name: "Schedule User", email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { headers: { cookie: "app_session_id=session-token" }, protocol: "https" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("growth schedule lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    db.recordGrowthAudit.mockResolvedValue(true);
    db.saveGrowthLoopSchedule.mockResolvedValue({ id: 4, enabled: true });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("erstellt nach Veröffentlichung einen taskUid-gebundenen Zeitplan und protokolliert ihn", async () => {
    db.getGrowthLoopStatus.mockResolvedValue({ workspace: { id: 19 }, setting: { scheduleCronTaskUid: null } });
    heartbeat.createHeartbeatJob.mockResolvedValue({ taskUid: "cron_growth_19" });
    const caller = appRouter.createCaller(context());
    await expect(caller.growth.enableSchedule({ cron: "0 0 7 * * *" })).resolves.toMatchObject({ enabled: true });
    expect(heartbeat.createHeartbeatJob).toHaveBeenCalledWith(expect.objectContaining({ name: "cybersarah-growth-19", path: "/api/scheduled/growth-analysis", cron: "0 0 7 * * *" }), "session-token");
    expect(db.saveGrowthLoopSchedule).toHaveBeenCalledWith(19, { enabled: true, cadenceCron: "0 0 7 * * *", scheduleCronTaskUid: "cron_growth_19" });
    expect(db.recordGrowthAudit).toHaveBeenCalledWith(expect.objectContaining({ eventType: "growth.schedule.enabled", status: "completed" }));
  });

  it("aktualisiert einen vorhandenen Zeitplan und pausiert ihn anschließend anhand der taskUid", async () => {
    db.getGrowthLoopStatus.mockResolvedValueOnce({ workspace: { id: 19 }, setting: { scheduleCronTaskUid: "cron_growth_19" } }).mockResolvedValueOnce({ workspace: { id: 19 }, setting: { scheduleCronTaskUid: "cron_growth_19", cadenceCron: "0 0 7 * * *" } });
    heartbeat.updateHeartbeatJob.mockResolvedValue({});
    const caller = appRouter.createCaller(context());
    await caller.growth.enableSchedule({ cron: "0 30 8 * * *" });
    await caller.growth.pauseSchedule();
    expect(heartbeat.updateHeartbeatJob).toHaveBeenCalledWith("cron_growth_19", expect.objectContaining({ cron: "0 30 8 * * *", enable: true }), "session-token");
    expect(heartbeat.updateHeartbeatJob).toHaveBeenCalledWith("cron_growth_19", { enable: false }, "session-token");
    expect(db.recordGrowthAudit).toHaveBeenCalledWith(expect.objectContaining({ eventType: "growth.schedule.paused", status: "completed" }));
  });

  it("verweigert die Zeitplanaktivierung in nicht veröffentlichter Entwicklungslaufzeit", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const caller = appRouter.createCaller(context());
    await expect(caller.growth.enableSchedule({ cron: "0 0 7 * * *" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(heartbeat.createHeartbeatJob).not.toHaveBeenCalled();
  });
});
