export type EvidenceLevel = "high" | "medium" | "low" | "unknown";

export interface EvidenceAssessment {
  level: EvidenceLevel;
  publishable: boolean;
  requiresDisclaimer: boolean;
  reasons: string[];
}

const HIGH_RISK = [
  /heilt?/i,
  /garantiert/i,
  /ersetzt.*medikament/i,
  /arzt.*nicht/i,
  /100\s*%/i,
];

export function assessEvidenceSafety(input: {
  claim: string;
  sourceCount?: number;
  sourceTypes?: string[];
}): EvidenceAssessment {
  const claim = input.claim.trim();
  const sourceCount = input.sourceCount ?? 0;
  const sourceTypes = input.sourceTypes ?? [];
  const highRisk = HIGH_RISK.some((pattern) => pattern.test(claim));
  const authoritative = sourceTypes.some((type) => /guideline|systematic|authority|study/i.test(type));

  let level: EvidenceLevel = "unknown";
  if (sourceCount >= 3 && authoritative) level = "high";
  else if (sourceCount >= 1 && authoritative) level = "medium";
  else if (sourceCount >= 1) level = "low";

  const reasons: string[] = [];
  if (highRisk) reasons.push("Riskante Health-Claim-Formulierung erkannt.");
  if (sourceCount === 0) reasons.push("Keine Evidenzquelle hinterlegt.");
  if (!authoritative && sourceCount > 0) reasons.push("Keine belastbare Leitlinie, Studie oder Behörde als Quelle markiert.");

  return {
    level,
    publishable: !highRisk && level !== "unknown",
    requiresDisclaimer: level !== "high" || highRisk,
    reasons,
  };
}

export function buildEvidenceDisclaimer(assessment: EvidenceAssessment): string | null {
  if (!assessment.requiresDisclaimer) return null;
  return "Allgemeine Information, keine medizinische Beratung. Aussagen mit Quellen prüfen und bei Beschwerden fachlichen Rat einholen.";
}
