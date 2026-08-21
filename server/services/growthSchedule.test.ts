import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({ authenticateRequest: vi.fn(), getGrowthLoopSettingsByTaskUid: vi.fn(), runGrowthAnalysis: vi.fn(), recordGrowthAudit: vi.fn() }));
vi.mock("../_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("../db", () => ({ getGrowthLoopSettingsByTaskUid: mocks.getGrowthLoopSettingsByTaskUid, runGrowthAnalysis: mocks.runGrowthAnalysis, recordGrowthAudit: mocks.recordGrowthAudit }));
import { handleGrowthAnalysisSchedule } from "./growthSchedule";

function responseCapture() {
  const state = { status: 200, body: undefined as unknown };
  const response = { status: (status: number) => { state.status = status; return response; }, json: (body: unknown) => { state.body = body; return response; } };
  return { response: response as unknown as Response, state };
}

describe("geplanter Growth-Analysejob", () => {
  beforeEach(() => { mocks.authenticateRequest.mockReset(); mocks.getGrowthLoopSettingsByTaskUid.mockReset(); mocks.runGrowthAnalysis.mockReset(); mocks.recordGrowthAudit.mockReset(); });

  it("verweigert jeden Aufruf ohne verwaltete Cron-Identität", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });
    const { response, state } = responseCapture();
    await handleGrowthAnalysisSchedule({} as Request, response);
    expect(state.status).toBe(403);
  });

  it("führt ausschließlich eine aktivierte, über taskUid gebundene Analyse aus", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron_growth_1" });
    mocks.getGrowthLoopSettingsByTaskUid.mockResolvedValue({ workspaceId: 7, enabled: true });
    mocks.runGrowthAnalysis.mockResolvedValue({ revenueCents: 4900, recommendations: [] });
    mocks.recordGrowthAudit.mockResolvedValue(true);
    const { response, state } = responseCapture();
    await handleGrowthAnalysisSchedule({} as Request, response);
    expect(state.status).toBe(200);
    expect(mocks.runGrowthAnalysis).toHaveBeenCalledWith(7, "cron");
  });
});
