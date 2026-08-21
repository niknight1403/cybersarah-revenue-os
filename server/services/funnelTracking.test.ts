import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({ recordFunnelEvent: vi.fn() }));
vi.mock("../db", () => ({ recordFunnelEvent: mocks.recordFunnelEvent }));
import { handleFunnelTracking } from "./funnelTracking";

function responseCapture() {
  const state = { status: 200, body: undefined as unknown };
  const response = { status: (status: number) => { state.status = status; return response; }, json: (body: unknown) => { state.body = body; return response; } };
  return { response: response as unknown as Response, state };
}

describe("Funnel-Tracking", () => {
  beforeEach(() => mocks.recordFunnelEvent.mockReset());

  it("weist unvollständige, nicht pseudonymisierte Ereignisse ab", async () => {
    const { response, state } = responseCapture();
    await handleFunnelTracking({ body: { eventType: "landing_view" } } as Request, response);
    expect(state.status).toBe(400);
  });

  it("nimmt ein gültiges Funnel-Ereignis idempotent zur Verarbeitung an", async () => {
    mocks.recordFunnelEvent.mockResolvedValue({ inserted: true });
    const { response, state } = responseCapture();
    await handleFunnelTracking({ body: { key: "8fbc23d2-7a1a-4f4f-b569-92cfe0c0ae61", eventId: "event_01H6X8A4T6D3", eventType: "cta_click" } } as Request, response);
    expect(state.status).toBe(202);
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith(expect.objectContaining({ analyticsWriteKey: "8fbc23d2-7a1a-4f4f-b569-92cfe0c0ae61", eventType: "cta_click" }));
  });
});
