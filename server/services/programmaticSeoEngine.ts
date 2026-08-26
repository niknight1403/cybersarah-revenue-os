export type SeoDraftInput = { topic: string; source: "approved_source" | "shopify_sandbox"; affiliateUrl?: string; locale?: "de-DE" | "en-US" };

export function buildProgrammaticSeoDraft(input: SeoDraftInput) {
  const slug = input.topic.trim().toLowerCase().replace(/[^a-z0-9äöüß]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "revenue-guide";
  const title = `${input.topic.trim().slice(0, 120)} | CyberSarah Revenue Guide`;
  return {
    kind: "programmatic_seo_draft" as const,
    slug,
    title,
    locale: input.locale ?? "de-DE",
    canonical: `/insights/${slug}`,
    sections: ["Problem und Kontext", "Nachvollziehbare Kriterien", "Vergleich ohne unbelegte Versprechen", "Nächste Schritte"],
    source: input.source,
    affiliateUrl: input.affiliateUrl ?? null,
    disclosure: input.affiliateUrl ? "Affiliate-Link möglich. Preis, Verfügbarkeit und Provisionsbeziehung vor Veröffentlichung prüfen." : "Redaktioneller Entwurf; Quellen und Aktualität vor Veröffentlichung prüfen.",
    qualityGate: { factualReviewRequired: true, duplicateReviewRequired: true, thinContentBlocked: true },
    status: "needs_approval" as const,
    requiresApproval: true as const,
    externalExecution: false as const,
    publishReady: false as const,
  };
}
