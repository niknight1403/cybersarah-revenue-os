import { describe, expect, it } from "vitest";
import { getProductionReadiness } from "./services/productionReadiness";

describe("production readiness", () => {
  it("fails closed without provider credentials", () => {
    const result = getProductionReadiness({ REVENUE_OS_MODE: "production" });
    expect(result.mode).toBe("production");
    expect(result.liveTransactionsEnabled).toBe(false);
    expect(result.externalExecution).toBe(false);
    expect(result.providers.stripe).toBe("not_configured");
    expect(result.providers.whatsapp).toBe("not_configured");
  });

  it("classifies complete configured providers without enabling execution", () => {
    const result = getProductionReadiness({ REVENUE_OS_MODE: "production", STRIPE_SECRET_KEY: "live_test", STRIPE_WEBHOOK_SECRET: "whsec_test", SHOPIFY_STORE_DOMAIN: "shop.example", SHOPIFY_STOREFRONT_API_ACCESS_TOKEN: "token", REVENUECAT_API_KEY: "rc", META_GRAPH_API_TOKEN: "meta", META_PAGE_ID: "page", WHATSAPP_ACCESS_TOKEN: "wa", WHATSAPP_PHONE_NUMBER_ID: "phone" });
    expect(result.providers).toEqual({ stripe: "production_ready", shopify: "production_ready", revenueCat: "production_ready", meta: "production_ready", whatsapp: "production_ready" });
    expect(result.liveTransactionsEnabled).toBe(false);
  });
});
