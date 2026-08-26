export type SecretEnvironment = "staging" | "production";

const SECRET_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "REVENUECAT_API_KEY",
  "REVENUECAT_WEBHOOK_SECRET",
  "SHOPIFY_STOREFRONT_API_ACCESS_TOKEN",
  "SHOPIFY_STORE_DOMAIN",
  "META_GRAPH_API_TOKEN",
  "WHATSAPP_ACCESS_TOKEN",
] as const;

export function resolveStagingSecrets(env: NodeJS.ProcessEnv = process.env) {
  const environment: SecretEnvironment = env.REVENUE_OS_MODE === "production" ? "production" : "staging";
  const configured = SECRET_KEYS.filter(key => Boolean(env[key]?.trim()));
  return {
    environment,
    configuredKeys: configured,
    missingKeys: SECRET_KEYS.filter(key => !configured.includes(key)),
    hasPlaceholders: false as const,
    exposesValues: false as const,
    externalExecution: false as const,
    note: "Nur Secret-Präsenz wird klassifiziert; Werte werden nie zurückgegeben und fehlende Keys werden nicht durch Stubs ersetzt.",
  };
}
