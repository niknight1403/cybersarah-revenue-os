import { describe, expect, it, vi } from "vitest";
import { buildInternalGoalPlan, buildStrategyTuningRecommendation, classifyLoopError, evaluateContentDraft, runResilientInternalLoop } from "./loopEngineering";

describe("loop engineering safety contracts", () => {
  it("klassifiziert retrybare Laufzeitfehler und begrenzt Retries auf drei Versuche", async () => {
    expect(classifyLoopError(new Error("429 rate limit"))).toBe("rate_limited");
    const task = vi.fn().mockRejectedValue(new Error("timeout"));
    const result = await runResilientInternalLoop(task, { fallback: async () => "gemini-fallback" });
    expect(task).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ value: "gemini-fallback", attempts: 3, retryable: true, fallbackUsed: true });
  });

  it("bewertet Content intern und hält ihn bei niedriger Qualität im Revisionstatus", () => {
    const result = evaluateContentDraft({ title: "Kurz", body: "Zu kurz", channel: "social" });
    expect(result.status).toBe("needs_revision");
    expect(result.score).toBeLessThan(8);
    expect(result.approvalRequired).toBe(true);
    expect(result.externalExecution).toBe(false);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it("übersetzt eine MRR-Abweichung nur in interne Draft-Aufgaben", () => {
    const plan = buildInternalGoalPlan({ targetMrrCents: 100_000, actualMrrCents: 60_000 });
    expect(plan.gapCents).toBe(40_000);
    expect(plan.actions).toContain("review_abandoned_checkout_draft");
    expect(plan.approvalRequired).toBe(true);
    expect(plan.externalExecution).toBe(false);
  });

  it("gibt Strategie-Tuning nur als auditable Empfehlung aus", () => {
    expect(buildStrategyTuningRecommendation({ topSignal: "checkout_start", weakSignal: "low_activation" })).toEqual({
      type: "strategy_tuning_recommendation",
      source: "internal_feedback_loop",
      recommendation: "Muster mit Signal checkout_start für den nächsten internen Draft priorisieren.",
      weakPattern: "low_activation",
      approvalRequired: true,
      externalExecution: false,
    });
  });
});
