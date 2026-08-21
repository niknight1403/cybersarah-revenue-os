import { describe, expect, it } from "vitest";
import { selectExperimentVariant, summarizeExperimentResults } from "./db";

describe("integrierter A/B-Flow", () => {
  it("ordnet eine pseudonymisierte Sitzung stabil zu und aggregiert CTA- sowie Checkout-Outcomes in derselben Variante", () => {
    const experiment = {
      id: 7,
      maxTrafficPercent: 25,
      variants: [{ key: "control", label: "Kontrolle", value: "Mit Manus anmelden" }, { key: "variant", label: "Variante", value: "Revenue-Prozess einrichten" }],
    };
    const subjectKey = "9a84b447-2e99-4b6d-a7d5-655444bece4e";
    const assignment = selectExperimentVariant(experiment, subjectKey);
    expect(assignment).not.toBeNull();
    expect(selectExperimentVariant(experiment, subjectKey)).toEqual(assignment);
    const results = summarizeExperimentResults(experiment, [
      { experimentId: 7, variantKey: assignment!.key, eventType: "impression" },
      { experimentId: 7, variantKey: assignment!.key, eventType: "cta_click" },
      { experimentId: 7, variantKey: assignment!.key, eventType: "checkout_start" },
    ]);
    const assignedResult = results.find(result => result.variantKey === assignment!.key);
    expect(assignedResult).toMatchObject({ impressions: 1, ctaClicks: 1, checkoutStarts: 1, ctaRate: 1, checkoutRate: 1 });
  });
});
