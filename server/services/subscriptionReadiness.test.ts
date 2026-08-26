import { describe, expect, it } from "vitest";
import { getSubscriptionReadiness } from "./subscriptionReadiness";

describe("subscription readiness", () => {
  it("liefert Trial-, Monats- und Jahresentitlements ohne Kauf-Ausführung", () => {
    const readiness = getSubscriptionReadiness();
    expect(readiness.provider).toBe("google_play_billing_via_revenuecat");
    expect(readiness.status).toBe("not_configured");
    expect(readiness.products.map(product => product.id)).toEqual(["free_trial", "monthly", "annual"]);
    expect(readiness.paywallReady).toBe(true);
    expect(readiness.purchaseExecution).toBe(false);
    expect(readiness.approvalRequired).toBe(true);
    expect(readiness.requiresProviderSetup).toBe(true);
  });
});
