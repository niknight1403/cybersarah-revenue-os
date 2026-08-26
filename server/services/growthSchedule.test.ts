import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({ authenticateRequest: vi.fn(), getGrowthLoopSettingsByTaskUid: vi.fn(), runHaraOrchestrator: vi.fn(), recordGrowthAudit: vi.fn() }));
vi.mock("../_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("../db", () => ({ getGrowthLoopSettingsByTaskUid: mocks.getGrowthLoopSettingsByTaskUid, runHaraOrchestrator: mocks.runHaraOrchestrator, recordGrowthAudit: mocks.recordGrowthAudit }));
import { handleGrowthAnalysisSchedule } from "./growthSchedule";

function responseCapture() {
  const state = { status: 200, body: undefined as unknown };
  const response = { status: (status: number) => { state.status = status; return response; }, json: (body: unknown) => { state.body = body; return response; } };
  return { response: response as unknown as Response, state };
}

describe("geplanter Growth-Analysejob", () => {
  beforeEach(() => { mocks.authenticateRequest.mockReset(); mocks.getGrowthLoopSettingsByTaskUid.mockReset(); mocks.runHaraOrchestrator.mockReset(); mocks.recordGrowthAudit.mockReset(); });

  it("verweigert jeden Aufruf ohne verwaltete Cron-Identität", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });
    const { response, state } = responseCapture();
    await handleGrowthAnalysisSchedule({} as Request, response);
    expect(state.status).toBe(403);
  });

  it("liefert bei einem fehlgeschlagenen HARA-Lauf einen retrybaren, extern wirkungslosen Fallback", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron_growth_1" });
    mocks.getGrowthLoopSettingsByTaskUid.mockResolvedValue({ workspaceId: 7, enabled: true });
    mocks.runHaraOrchestrator.mockRejectedValue(new Error("Provider timeout"));
    const { response, state } = responseCapture();
    await handleGrowthAnalysisSchedule({} as Request, response);
    expect(state.status).toBe(500);
    expect(state.body).toMatchObject({ error: "Provider timeout", retryable: true });
    expect(mocks.recordGrowthAudit).toHaveBeenCalledWith(expect.objectContaining({ eventType: "growth.analysis.retry_hint", status: "failed", detail: { retryable: true, externalExecution: false, approvalRequired: true, error: "Provider timeout" } }));
  });

  it("führt ausschließlich eine aktivierte, über taskUid gebundene Analyse aus", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron_growth_1" });
    mocks.getGrowthLoopSettingsByTaskUid.mockResolvedValue({ workspaceId: 7, enabled: true });
    mocks.runHaraOrchestrator.mockResolvedValue({ revenueCents: 4900, recommendations: [], workflow: "hara-revenue-orchestration", modules: {}, drafts: [], externalExecution: false, approvalRequired: true });
    mocks.recordGrowthAudit.mockResolvedValue(true);
    const { response, state } = responseCapture();
    await handleGrowthAnalysisSchedule({} as Request, response);
    expect(state.status).toBe(200);
    expect(mocks.runHaraOrchestrator).toHaveBeenCalledWith(7, "cron");
  });
});
