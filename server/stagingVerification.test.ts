import { describe, expect, it } from "vitest";
import { resolveStagingSecrets } from "./services/stagingSecrets";
import { classifyRevenueCatEvent } from "./services/playStoreContracts";

describe("staging verification contracts", () => {
  it("reports only presence and never exposes secret values", () => {
    const result = resolveStagingSecrets({ REVENUE_OS_MODE: "staging", STRIPE_SECRET_KEY: "sk_test_hidden", REVENUECAT_WEBHOOK_SECRET: "rc_hidden" });
    expect(result.environment).toBe("staging");
    expect(result.configuredKeys).toEqual(expect.arrayContaining(["STRIPE_SECRET_KEY", "REVENUECAT_WEBHOOK_SECRET"]));
    expect(result).not.toHaveProperty("values");
    expect(result.exposesValues).toBe(false);
    expect(result.hasPlaceholders).toBe(false);
  });

  it.each(["INITIAL_PURCHASE", "RENEWAL", "CANCELLATION", "EXPIRATION"])("classifies %s as review-only", type => {
    expect(classifyRevenueCatEvent({ event: { type } })).toMatchObject({ type, status: "accepted_for_review", approvalRequired: true, externalExecution: false });
  });
});
