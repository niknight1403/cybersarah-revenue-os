export type ProviderReadiness = "not_configured" | "sandbox" | "production_ready";

function has(env: NodeJS.ProcessEnv, key: string) { return Boolean(env[key]?.trim()); }

export function getProductionReadiness(env: NodeJS.ProcessEnv = process.env) {
  const stripe = has(env, "STRIPE_SECRET_KEY") && has(env, "STRIPE_WEBHOOK_SECRET");
  const shopify = has(env, "SHOPIFY_STORE_DOMAIN") && has(env, "SHOPIFY_STOREFRONT_API_ACCESS_TOKEN");
  const revenueCat = has(env, "REVENUECAT_API_KEY");
  const meta = has(env, "META_GRAPH_API_TOKEN") && has(env, "META_PAGE_ID");
  const whatsapp = has(env, "WHATSAPP_ACCESS_TOKEN") && has(env, "WHATSAPP_PHONE_NUMBER_ID");
  const pollinations = has(env, "POLLINATIONS_API_KEY");
  const mode = env.REVENUE_OS_MODE === "production" ? "production" : "sandbox";
  return {
    mode,
    providers: {
      stripe: stripe ? (mode === "production" ? "production_ready" : "sandbox") : "not_configured",
      shopify: shopify ? (mode === "production" ? "production_ready" : "sandbox") : "not_configured",
      revenueCat: revenueCat ? (mode === "production" ? "production_ready" : "sandbox") : "not_configured",
      meta: meta ? (mode === "production" ? "production_ready" : "sandbox") : "not_configured",
      whatsapp: whatsapp ? (mode === "production" ? "production_ready" : "sandbox") : "not_configured",
      pollinations: pollinations ? (mode === "production" ? "production_ready" : "sandbox") : "not_configured",
    } satisfies Record<string, ProviderReadiness>,
    externalExecution: false as const,
    approvalRequired: true as const,
    liveTransactionsEnabled: false as const,
    note: "Produktionsbereitschaft ist nur ein Readiness-Signal; externe Zahlung, Veröffentlichung, Nachricht und Providerwechsel bleiben approval-first.",
  };
}
