import { describe, expect, it } from "vitest";
import { summarizeExperimentResults } from "./db";

describe("A/B-Ergebnisaggregation", () => {
  it("aggregiert pseudonymisierte Einblendungen und Outcomes je Variante", () => {
    const results = summarizeExperimentResults({ id: 7, variants: [{ key: "control", label: "Kontrolle", value: "A" }, { key: "variant", label: "Variante", value: "B" }] }, [
      { experimentId: 7, variantKey: "control", eventType: "impression" },
      { experimentId: 7, variantKey: "control", eventType: "cta_click" },
      { experimentId: 7, variantKey: "variant", eventType: "impression" },
      { experimentId: 7, variantKey: "variant", eventType: "impression" },
      { experimentId: 7, variantKey: "variant", eventType: "checkout_start" },
    ]);
    expect(results).toEqual([
      expect.objectContaining({ variantKey: "control", impressions: 1, ctaClicks: 1, checkoutStarts: 0, ctaRate: 1 }),
      expect.objectContaining({ variantKey: "variant", impressions: 2, ctaClicks: 0, checkoutStarts: 1, checkoutRate: 0.5 }),
    ]);
  });
});
