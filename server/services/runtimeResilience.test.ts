import { describe, expect, it } from "vitest";
import { createRuntimeHealthState } from "./runtimeResilience";

describe("runtimeHealth", () => {
  it("meldet den Prozess vor und während eines kontrollierten Shutdowns korrekt", () => {
    const now = () => new Date("2026-08-21T00:00:00.000Z");
    const state = createRuntimeHealthState(now);

    expect(state.snapshot()).toMatchObject({ ok: true, status: "ready" });
    state.markDraining();
    expect(state.snapshot()).toMatchObject({ ok: false, status: "draining" });
  });
});
