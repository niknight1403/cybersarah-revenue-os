export type VideoDraftInput = { productName: string; priceCents?: number; benefit: string; source: "shopify_sandbox" | "approved_catalog"; destination: "meta" | "tiktok" | "youtube_shorts" };

export function buildFacelessVideoDraft(input: VideoDraftInput) {
  const safeProduct = input.productName.trim().slice(0, 120);
  const safeBenefit = input.benefit.trim().slice(0, 240);
  return {
    kind: "faceless_short_video_draft" as const,
    title: `${safeProduct} — kurzer Produktentwurf`,
    destination: input.destination,
    source: input.source,
    scenes: [
      { seconds: 0, text: safeProduct, visual: "neutrale Produktgrafik oder lizenzierter Katalog-Asset" },
      { seconds: 3, text: safeBenefit, visual: "ruhige Textanimation ohne Personen-Imitation" },
      { seconds: 8, text: "Mehr erfahren", visual: "klarer CTA-Platzhalter; kein automatischer Link" },
    ],
    caption: `${safeProduct}: ${safeBenefit}`,
    disclosure: "Werblicher Entwurf. Vor Veröffentlichung Produktdaten, Preis, Rechte und Kennzeichnung prüfen.",
    status: "needs_approval" as const,
    requiresApproval: true as const,
    externalExecution: false as const,
    uploadReady: false as const,
  };
}
