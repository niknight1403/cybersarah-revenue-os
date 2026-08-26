import { evaluateContentDraft } from "./loopEngineering";

export type MonetizationChannel = "affiliate" | "social" | "ads";

type MonetizationDraftInput = {
  channel: MonetizationChannel;
  target: string;
  title: string;
  content: string;
  affiliate: boolean;
  sponsored: boolean;
};

const actionTypeByChannel: Record<MonetizationChannel, string> = {
  affiliate: "affiliate_link_draft",
  social: "social_distribution_draft",
  ads: "ad_placement_draft",
};

export function buildMarketingDisclosure({ affiliate, sponsored }: Pick<MonetizationDraftInput, "affiliate" | "sponsored">) {
  const labels = ["🤖 Posted by AI Agent"];
  if (affiliate) labels.push("Affiliate Link");
  if (sponsored) labels.push("Sponsored Link");
  return labels.join(" | ");
}

export function appendMarketingDisclosure(content: string, disclosure: string) {
  const normalized = content.trim();
  return normalized.includes(disclosure) ? normalized : `${normalized}\n\n${disclosure}`;
}

export function buildMonetizationApprovalDraft(input: MonetizationDraftInput) {
  const disclosure = buildMarketingDisclosure(input);
  const decoratedContent = appendMarketingDisclosure(input.content, disclosure);
  const quality = evaluateContentDraft({ title: input.title, body: decoratedContent, channel: input.channel });
  return {
    actionType: actionTypeByChannel[input.channel],
    target: input.target.trim(),
    payload: {
      source: "monetization_hub",
      channel: input.channel,
      externalExecution: false,
        consentRequired: true,
        providerConfigured: false,
        quality,
      compliance: {
        aiDisclosure: disclosure,
        affiliate: input.affiliate,
        sponsored: input.sponsored,
        requiresHumanApproval: true,
      },
      content: {
        title: input.title.trim(),
        body: decoratedContent,
        socialCopy: decoratedContent,
        guardrail: "Entwurf ohne Veröffentlichung, Link-Injektion, Anzeigenplatzierung oder externe Kontaktaufnahme. Erst nach expliziter Freigabe und Providerkonfiguration ausführen.",
      },
    },
  };
}
