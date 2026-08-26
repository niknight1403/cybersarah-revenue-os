import { describe, expect, it } from "vitest";
import type { Request, Response } from "express";
import { aggregateGrowthMetrics, selectExperimentVariant, summarizeExperimentResults } from "./db";
import { createFunnelTrackingHandler } from "./services/funnelTracking";
import { createExperimentOutcomeHandler } from "./services/experimentTracking";

function responseCapture() {
  const state = { status: 200, body: undefined as unknown };
  const response = { status: (status: number) => { state.status = status; return response; }, json: (body: unknown) => { state.body = body; return response; } };
  return { response: response as unknown as Response, state };
}

describe("öffentlicher Growth-Telemetriefluss", () => {
  it("führt Variantenzuordnung, CTA- und Checkout-Handler durch und aggregiert die zugehörigen Ergebnisse", async () => {
    const experiment = { id: 7, maxTrafficPercent: 25, variants: [{ key: "control", label: "Kontrolle", value: "Mit Manus anmelden" }, { key: "variant", label: "Variante", value: "Revenue-Prozess einrichten" }] };
    const subjectKey = "9a84b447-2e99-4b6d-a7d5-655444bece4e";
    const assignment = selectExperimentVariant(experiment, subjectKey)!;
    const experimentEvents: Array<{ experimentId: number; variantKey: string; eventType: "impression" | "cta_click" | "checkout_start" }> = [{ experimentId: experiment.id, variantKey: assignment.key, eventType: "impression" }];
    const recordOutcome = (async (input: { experimentId: number; eventType: "cta_click" | "checkout_start" }) => {
      experimentEvents.push({ experimentId: input.experimentId, variantKey: assignment.key, eventType: input.eventType });
      return { recorded: true } as const;
    }) as never;
    const handler = createExperimentOutcomeHandler({ recordOutcome });
    for (const eventType of ["cta_click", "checkout_start"] as const) {
      const captured = responseCapture();
      await handler({ body: { subjectKey, experimentId: experiment.id, eventType } } as Request, captured.response);
      expect(captured.state.status).toBe(202);
    }
    const result = summarizeExperimentResults(experiment, experimentEvents).find(item => item.variantKey === assignment.key);
    expect(result).toMatchObject({ impressions: 1, ctaClicks: 1, checkoutStarts: 1, ctaRate: 1, checkoutRate: 1 });
  });

  it("nimmt Funnel-Events über den Handler auf und bildet daraus die für die Growth-Analyse benötigten Kennzahlen", async () => {
    const telemetry: Array<{ eventType: string; amountCents: number; metadata?: unknown }> = [];
    const recordEvent = (async (input: { eventType: "landing_view" | "cta_click" | "checkout.session.created" }) => {
      const stage = input.eventType === "landing_view" ? "acquisition" : input.eventType === "cta_click" ? "activation" : "conversion";
      telemetry.push({ eventType: input.eventType, amountCents: 0, metadata: { attribution: { channel: "owned", stage, feedbackSignal: input.eventType === "checkout.session.created" ? "checkout_intent" : "engagement" } } });
      return { workspaceId: 19, inserted: true };
    }) as never;
    const handler = createFunnelTrackingHandler({ recordEvent });
    for (const eventType of ["landing_view", "cta_click", "checkout.session.created"] as const) {
      const captured = responseCapture();
      await handler({ body: { key: "f1ce1bc2-bd0b-4ab3-b684-dc8a9a90e856", eventId: `event-${eventType}`, eventType } } as Request, captured.response);
      expect(captured.state.status).toBe(202);
    }
    telemetry.push({ eventType: "checkout.session.completed", amountCents: 49900 }, { eventType: "customer.subscription.created", amountCents: 0 });
    expect(aggregateGrowthMetrics(telemetry, 10000)).toMatchObject({ revenueCents: 49900, checkoutStarted: 1, checkoutCompleted: 1, cacCents: 10000, estimatedLtvCents: 49900, attribution: { acquisition: 1, activation: 1, conversion: 1, owned: 3, checkoutIntent: 1 } });
  });
});
