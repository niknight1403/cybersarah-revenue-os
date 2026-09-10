import Stripe from "stripe";

export type RevenueAttribution = {
  status: "attributed" | "unattributed";
  personaId: string | null;
  contentId: string | null;
  campaignId: number | null;
  offerId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  referenceKey: string | null;
};

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 255) : null;
}

function numberOrNull(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function resolveRevenueAttribution(input: {
  metadata?: Stripe.Metadata | Record<string, unknown> | null;
  clientReferenceId?: string | null;
}): RevenueAttribution {
  const metadata = input.metadata ?? {};
  const referenceKey = clean(input.clientReferenceId) ?? clean(metadata.client_reference_id) ?? clean(metadata.referenceKey);
  const result = {
    status: "unattributed" as const,
    personaId: clean(metadata.persona_id ?? metadata.personaId),
    contentId: clean(metadata.content_id ?? metadata.contentId),
    campaignId: numberOrNull(clean(metadata.campaign_id ?? metadata.campaignId)),
    offerId: clean(metadata.offer_id ?? metadata.offerId),
    utmSource: clean(metadata.utm_source),
    utmMedium: clean(metadata.utm_medium),
    utmCampaign: clean(metadata.utm_campaign),
    utmContent: clean(metadata.utm_content),
    referenceKey,
  };
  const attributed = Boolean(result.personaId || result.contentId || result.campaignId || result.offerId || result.utmCampaign || result.referenceKey);
  return { ...result, status: attributed ? "attributed" : "unattributed" };
}
