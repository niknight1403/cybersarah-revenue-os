import { describe, expect, it } from "vitest";
import { buildCheckoutTrackingEvents, isSafeStripeCheckoutUrl } from "./RevenueCheckout";

describe("öffentlicher Checkout-Einstieg", () => {
  it("akzeptiert ausschließlich sichere Stripe-Checkout- und Payment-Link-Ziele", () => {
    expect(isSafeStripeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test_123")).toBe(true);
    expect(isSafeStripeCheckoutUrl("https://buy.stripe.com/test_123")).toBe(true);
    expect(isSafeStripeCheckoutUrl("https://evil.example/checkout")).toBe(false);
    expect(isSafeStripeCheckoutUrl("javascript:alert(1)")).toBe(false);
  });

  it("bildet beim öffentlichen Checkout beide datensparsamen Funnel- und A/B-Outcome-Signale", () => {
    const events = buildCheckoutTrackingEvents({ analyticsWriteKey: "f1ce1bc2-bd0b-4ab3-b684-dc8a9a90e856", subjectKey: "9a84b447-2e99-4b6d-a7d5-655444bece4e", experimentId: 7 });
    expect(events).toEqual([
      expect.objectContaining({ path: "/api/events/funnel", payload: expect.objectContaining({ eventType: "checkout.session.created" }) }),
      { path: "/api/events/experiment", payload: { subjectKey: "9a84b447-2e99-4b6d-a7d5-655444bece4e", experimentId: 7, eventType: "checkout_start" } },
    ]);
  });
});
