export type LeadCandidateInput = { companyName: string; domain: string; source: "user_submitted" | "approved_directory"; consentEvidence?: string; fitScore?: number };

export function buildLeadQualificationDraft(input: LeadCandidateInput) {
  const fitScore = Math.max(0, Math.min(100, Math.round(input.fitScore ?? 0)));
  const hasConsentEvidence = Boolean(input.consentEvidence?.trim());
  return {
    kind: "b2b_lead_qualification_draft" as const,
    companyName: input.companyName.trim().slice(0, 160),
    domain: input.domain.trim().slice(0, 240),
    source: input.source,
    fitScore,
    contactAllowed: false as const,
    consentEvidence: hasConsentEvidence ? "provided-reference" : null,
    restrictions: ["robots.txt und Nutzungsbedingungen prüfen", "Rate-Limit einhalten", "keine privaten Kontaktdaten sammeln", "Opt-out und Rechtsgrundlage dokumentieren"],
    suggestedNextStep: hasConsentEvidence ? "Manuelle Prüfung und freigegebener Entwurf" : "Einwilligung oder zulässige Kontaktgrundlage nachfordern",
    status: "needs_approval" as const,
    requiresApproval: true as const,
    externalExecution: false as const,
    crmWriteReady: false as const,
  };
}
