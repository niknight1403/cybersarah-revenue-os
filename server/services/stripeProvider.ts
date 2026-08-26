import Stripe from "stripe";

export type StripeProviderReadiness = {
  mode: "unconfigured" | "test" | "live";
  secretKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  checkoutOriginConfigured: boolean;
};

export function getStripeProviderReadiness(env: Record<string, string | undefined> = process.env): StripeProviderReadiness {
  const secretKey = env.STRIPE_SECRET_KEY ?? "";
  const mode = secretKey.startsWith("sk_live_") ? "live" : secretKey.startsWith("sk_test_") ? "test" : "unconfigured";
  return {
    mode,
    secretKeyConfigured: mode !== "unconfigured",
    webhookSecretConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET || env.STRIPE_TEST_WEBHOOK_SECRET),
    checkoutOriginConfigured: Boolean(env.PUBLIC_APP_ORIGIN || env.VITE_APP_URL),
  };
}

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe ist nicht serverseitig konfiguriert.");
  return new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 15_000 });
}

export function classifyStripeFailure(error: unknown, operation: "checkout" | "payment_link" | "webhook") {
  const message = error instanceof Error ? error.message : "Unbekannter Stripe-Fehler.";
  return { provider: "stripe" as const, operation, retryable: true as const, fallback: "approval_draft" as const, externalExecution: false as const, message: message.replace(/sk_(?:test|live)_[A-Za-z0-9_]+/g, "[redacted]").slice(0, 240) };
}

export function constructStripeEvent(rawBody: Buffer, signature: string) {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_TEST_WEBHOOK_SECRET].filter((secret): secret is string => Boolean(secret));
  if (!secrets.length) throw new Error("Kein Stripe-Webhook-Signaturgeheimnis ist konfiguriert.");

  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return getStripeClient().webhooks.constructEvent(rawBody, signature, secret);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Stripe-Webhook-Signatur konnte nicht geprüft werden.");
}

export async function createStripePaymentLink(input: {
  productName: string;
  unitAmount: number;
  currency: string;
  recurring: boolean;
  origin: string;
  workspaceId: number;
  createdBy: number;
  idempotencyKey: string;
}) {
  const configuredOrigin = process.env.PUBLIC_APP_ORIGIN || process.env.VITE_APP_URL;
  if (!configuredOrigin) throw new Error("PUBLIC_APP_ORIGIN ist für sichere Checkout-Redirects nicht konfiguriert.");
  const safeOrigin = configuredOrigin.replace(/\/$/, "");
  if (input.origin.replace(/\/$/, "") !== safeOrigin) throw new Error("Checkout-Redirect-Origin stimmt nicht mit PUBLIC_APP_ORIGIN überein.");

  const stripe = getStripeClient();
  const metadata = { source: "cybersarah-revenue-os", workspace_id: String(input.workspaceId), created_by_user_id: String(input.createdBy) };
  const product = await stripe.products.create({ name: input.productName, metadata }, { idempotencyKey: `${input.idempotencyKey}:product` });
  const price = await stripe.prices.create({ product: product.id, unit_amount: input.unitAmount, currency: input.currency.toLowerCase(), ...(input.recurring ? { recurring: { interval: "month" as const } } : {}) }, { idempotencyKey: `${input.idempotencyKey}:price` });
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    allow_promotion_codes: true,
    after_completion: { type: "redirect", redirect: { url: `${safeOrigin}/?checkout=success` } },
    metadata,
  }, { idempotencyKey: `${input.idempotencyKey}:payment-link` });
  return { id: paymentLink.id, url: paymentLink.url, productId: product.id, priceId: price.id, mode: getStripeProviderReadiness().mode };
}

export async function createStripeCheckoutSession(input: {
  productName: string;
  unitAmount: number;
  currency: string;
  recurring: boolean;
  origin: string;
  workspaceId: number;
  createdBy: number;
  idempotencyKey: string;
}) {
  const configuredOrigin = process.env.PUBLIC_APP_ORIGIN || process.env.VITE_APP_URL;
  if (!configuredOrigin) throw new Error("PUBLIC_APP_ORIGIN ist für sichere Checkout-Redirects nicht konfiguriert.");
  const safeOrigin = configuredOrigin.replace(/\/$/, "");
  if (input.origin.replace(/\/$/, "") !== safeOrigin) throw new Error("Checkout-Redirect-Origin stimmt nicht mit PUBLIC_APP_ORIGIN überein.");

  const stripe = getStripeClient();
  const metadata = { source: "cybersarah-revenue-os", workspace_id: String(input.workspaceId), created_by_user_id: String(input.createdBy) };
  const product = await stripe.products.create({ name: input.productName, metadata }, { idempotencyKey: `${input.idempotencyKey}:product` });
  const price = await stripe.prices.create({ product: product.id, unit_amount: input.unitAmount, currency: input.currency.toLowerCase(), ...(input.recurring ? { recurring: { interval: "month" as const } } : {}) }, { idempotencyKey: `${input.idempotencyKey}:price` });
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: input.recurring ? "subscription" : "payment",
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${safeOrigin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${safeOrigin}/?checkout=cancelled`,
    metadata,
    ...(input.recurring ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
  }, { idempotencyKey: `${input.idempotencyKey}:checkout-session` });
  if (!checkoutSession.url) throw new Error("Stripe hat keine Checkout-URL zurückgegeben.");
  return { id: checkoutSession.id, url: checkoutSession.url, productId: product.id, priceId: price.id, mode: getStripeProviderReadiness().mode };
}
