export type LoopMode = "manual_approval" | "semi_autopilot_internal";

export const monetizationLoops = [
  { id: "viral_content", label: "Viral Content & DM-Sales", externalChannels: "Social / DMs", guardrail: "Draft-only; keine automatische Nachricht oder Veröffentlichung." },
  { id: "retention_upsell", label: "Predictive Upsell & Retention", externalChannels: "In-App / Abo", guardrail: "Empfehlung-only; keine automatische Preis- oder Aboänderung." },
  { id: "cart_recovery", label: "Cart Recovery & Re-Engagement", externalChannels: "E-Mail / WhatsApp / Telegram", guardrail: "Draft-only; keine automatische Kontaktaufnahme oder Rabattaktivierung." },
  { id: "affiliate_arbitrage", label: "Affiliate & Product Arbitrage", externalChannels: "Shopify / Affiliate", guardrail: "Sandbox-/Kataloganalyse; keine automatische Partner- oder Linkveröffentlichung." },
] as const;

export function buildMonetizationLoopSnapshot(metrics: { mrrCents?: number; checkoutCompleted?: number; checkoutStarted?: number; paymentFailures?: number; cancellations?: number } | null | undefined) {
  const checkoutStarted = metrics?.checkoutStarted ?? 0;
  const checkoutCompleted = metrics?.checkoutCompleted ?? 0;
  const conversionRate = checkoutStarted > 0 ? checkoutCompleted / checkoutStarted : null;
  return monetizationLoops.map(loop => ({
    ...loop,
    mode: "manual_approval" as LoopMode,
    conversionRate: loop.id === "cart_recovery" || loop.id === "retention_upsell" ? conversionRate : null,
    revenueCents: null as number | null,
    availableSignals: {
      mrrCents: metrics?.mrrCents ?? 0,
      checkoutStarted,
      checkoutCompleted,
      paymentFailures: metrics?.paymentFailures ?? 0,
      cancellations: metrics?.cancellations ?? 0,
    },
    approvalRequired: true,
    externalExecution: false,
  }));
}
