export interface QualityGateInput {
  hook: string;
  script: string;
  hasDisclosure: boolean;
  isSponsored?: boolean;
  hasComplianceNote: boolean;
  targetSeconds: number;
  estimatedSeconds: number;
}

export interface QualityGateResult {
  score: number;
  ready: boolean;
  issues: string[];
}

export function scoreContentQuality(input: QualityGateInput): QualityGateResult {
  const issues: string[] = [];
  let score = 100;

  if (input.hook.trim().length < 12) {
    score -= 20;
    issues.push("Hook zu schwach oder zu kurz.");
  }
  if (input.script.trim().length < 80) {
    score -= 20;
    issues.push("Skript liefert zu wenig Substanz.");
  }
  if (input.isSponsored && !input.hasDisclosure) {
    score -= 15;
    issues.push("Affiliate-/Werbehinweis fehlt.");
  }
  if (!input.hasComplianceNote) {
    score -= 20;
    issues.push("Compliance-Hinweis fehlt.");
  }
  const deviation = Math.abs(input.estimatedSeconds - input.targetSeconds);
  if (deviation > 8) {
    score -= 15;
    issues.push("Laufzeit liegt deutlich außerhalb des Zielbereichs.");
  }

  score = Math.max(0, Math.min(100, score));
  return { score, ready: score >= 70 && input.hasComplianceNote && (!input.isSponsored || input.hasDisclosure) && issues.every((issue) => !issue.includes("Compliance")), issues };
}
