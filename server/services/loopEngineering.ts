export type RetryClassification = "rate_limited" | "unauthorized" | "schema_mismatch" | "transient" | "non_retryable";

export type ResilientLoopResult<T> = {
  value: T;
  attempts: number;
  retryable: boolean;
  fallbackUsed: boolean;
};

export function classifyLoopError(error: unknown): RetryClassification {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("401") || message.includes("unauthorized") || message.includes("invalid key")) return "unauthorized";
  if (message.includes("429") || message.includes("rate limit") || message.includes("too many")) return "rate_limited";
  if (message.includes("schema") || message.includes("column") || message.includes("migration")) return "schema_mismatch";
  if (message.includes("timeout") || message.includes("temporar") || message.includes("econnreset")) return "transient";
  return "non_retryable";
}

export async function runResilientInternalLoop<T>(
  task: () => Promise<T>,
  options: { maxAttempts?: number; fallback?: () => Promise<T>; onRetry?: (classification: RetryClassification, attempt: number) => Promise<void> } = {},
): Promise<ResilientLoopResult<T>> {
  const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 3, 3));
  let attempts = 0;
  let lastError: unknown;
  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      return { value: await task(), attempts, retryable: attempts > 1, fallbackUsed: false };
    } catch (error) {
      lastError = error;
      const classification = classifyLoopError(error);
      const mayRetry = classification !== "non_retryable" && attempts < maxAttempts;
      if (!mayRetry) break;
      await options.onRetry?.(classification, attempts);
    }
  }
  if (options.fallback) {
    return { value: await options.fallback(), attempts, retryable: true, fallbackUsed: true };
  }
  throw lastError instanceof Error ? lastError : new Error("Interner Loop-Lauf fehlgeschlagen.");
}

export type ContentCriticResult = {
  score: number;
  status: "ready_for_approval" | "needs_revision";
  feedback: string[];
  approvalRequired: true;
  externalExecution: false;
};

export function evaluateContentDraft(content: { title: string; body: string; channel: string }): ContentCriticResult {
  const feedback: string[] = [];
  let score = 5;
  if (content.title.trim().length >= 12) score += 1; else feedback.push("Hook-Titel auf mindestens 12 Zeichen mit klarem Nutzen schärfen.");
  if (content.body.trim().length >= 80) score += 1; else feedback.push("Body um einen konkreten Nutzen und Kontext erweitern.");
  if (/call|start|mehr erfahren|jetzt|demo|angebot/i.test(content.body)) score += 1; else feedback.push("Einen klaren, nicht irreführenden Call-to-Action ergänzen.");
  if (/ai agent|affiliate|sponsored|werbung|anzeige/i.test(content.body)) score += 1; else feedback.push("Transparenzhinweis vor Veröffentlichung ergänzen.");
  if (content.channel === "social" && /\n/.test(content.body)) score += 1;
  score = Math.min(10, score);
  return { score, status: score >= 8 ? "ready_for_approval" : "needs_revision", feedback, approvalRequired: true, externalExecution: false };
}

export function buildInternalGoalPlan(input: { targetMrrCents: number; actualMrrCents: number }) {
  const gapCents = Math.max(0, input.targetMrrCents - input.actualMrrCents);
  const actions = gapCents > 0
    ? ["review_abandoned_checkout_draft", "seo_experiment_draft", "content_refresh_draft"]
    : ["monitor_conversion_signals"];
  return {
    targetMrrCents: input.targetMrrCents,
    actualMrrCents: input.actualMrrCents,
    gapCents,
    actions,
    status: "internal_plan" as const,
    approvalRequired: true as const,
    externalExecution: false as const,
  };
}

export function buildStrategyTuningRecommendation(input: { topSignal: string; weakSignal?: string }) {
  return {
    type: "strategy_tuning_recommendation" as const,
    source: "internal_feedback_loop" as const,
    recommendation: `Muster mit Signal ${input.topSignal} für den nächsten internen Draft priorisieren.`,
    weakPattern: input.weakSignal ?? null,
    approvalRequired: true as const,
    externalExecution: false as const,
  };
}
