import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const db = vi.hoisted(() => ({ recordPublicExperimentOutcome: vi.fn() }));
vi.mock("../db", () => db);

import { handleExperimentOutcome } from "./experimentTracking";

function responseCapture() {
  const state = { status: 200, body: undefined as unknown };
  const response = { status: (status: number) => { state.status = status; return response; }, json: (body: unknown) => { state.body = body; return response; } };
  return { response: response as unknown as Response, state };
}

describe("Experiment-Outcome-Tracking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("akzeptiert nur pseudonymisierte, zuordenbare CTA- und Checkout-Outcomes", async () => {
    db.recordPublicExperimentOutcome.mockResolvedValue({ recorded: true });
    const { response, state } = responseCapture();
    await handleExperimentOutcome({ body: { subjectKey: "9a84b447-2e99-4b6d-a7d5-655444bece4e", experimentId: 7, eventType: "cta_click" } } as Request, response);
    expect(state.status).toBe(202);
    expect(db.recordPublicExperimentOutcome).toHaveBeenCalledWith({ subjectKey: "9a84b447-2e99-4b6d-a7d5-655444bece4e", experimentId: 7, eventType: "cta_click" });
  });

  it("lehnt unvollständige oder nicht zuordenbare Ereignisse ab", async () => {
    const invalid = responseCapture();
    await handleExperimentOutcome({ body: { experimentId: 7 } } as Request, invalid.response);
    expect(invalid.state.status).toBe(400);
    db.recordPublicExperimentOutcome.mockRejectedValue(new Error("Keine Variantenzuordnung"));
    const unassigned = responseCapture();
    await handleExperimentOutcome({ body: { subjectKey: "9a84b447-2e99-4b6d-a7d5-655444bece4e", experimentId: 7, eventType: "checkout_start" } } as Request, unassigned.response);
    expect(unassigned.state.status).toBe(409);
  });
});
