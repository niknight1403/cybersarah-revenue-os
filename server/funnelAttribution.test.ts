import { describe, expect, it } from "vitest";
import { deriveFunnelAttribution } from "./db";

describe("Funnel-Attribution und Feedback", () => {
  it("ordnet Telemetrieereignisse stabil den Growth-Stufen zu", () => {
    expect(deriveFunnelAttribution("landing_view")).toEqual({ channel: "owned", stage: "acquisition", feedbackSignal: "engagement" });
    expect(deriveFunnelAttribution("cta_click")).toEqual({ channel: "owned", stage: "activation", feedbackSignal: "engagement" });
    expect(deriveFunnelAttribution("checkout.session.created")).toEqual({ channel: "owned", stage: "conversion", feedbackSignal: "checkout_intent" });
  });
});
