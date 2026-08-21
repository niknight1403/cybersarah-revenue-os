import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({
  isStripeProviderActive: vi.fn(),
  recordGrowthAudit: vi.fn(),
}));

const stripe = vi.hoisted(() => ({
  createStripeCheckoutSession: vi.fn(),
  createStripePaymentLink: vi.fn(),
  getStripeProviderReadiness: vi.fn(() => ({ mode: "test" })),
}));

vi.mock("./db", () => db);
vi.mock("./services/stripeProvider", () => stripe);

import { appRouter } from "./routers";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: `${role}-checkout-user`,
      name: role,
      email: null,
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: {}, protocol: "https" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const input = { workspaceId: 19, productName: "Revenue Operations Pro", unitAmount: 49900, currency: "EUR", recurring: true, origin: "https://revenue.example" };

describe("stripe.createCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stripe.createStripeCheckoutSession.mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.test/cs_test_1", productId: "prod_1", priceId: "price_1", mode: "test" });
    db.recordGrowthAudit.mockResolvedValue(true);
  });

  it("blockiert Checkout-Session-Erstellung für Nicht-Admins", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.stripe.createCheckoutSession(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.isStripeProviderActive).not.toHaveBeenCalled();
  });

  it("blockiert Checkout-Session-Erstellung bei nicht freigegebenem Provider", async () => {
    db.isStripeProviderActive.mockResolvedValue(false);
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.stripe.createCheckoutSession(input)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(stripe.createStripeCheckoutSession).not.toHaveBeenCalled();
  });

  it("erstellt und auditiert eine Checkout-Session nur nach Admin- und Provider-Gate", async () => {
    db.isStripeProviderActive.mockResolvedValue(true);
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.stripe.createCheckoutSession(input)).resolves.toMatchObject({ id: "cs_test_1", mode: "test" });
    expect(stripe.createStripeCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
      ...input,
      createdBy: 1,
      idempotencyKey: "stripe-checkout:19:Revenue Operations Pro:49900:true",
    }));
    expect(db.recordGrowthAudit).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 19,
      eventType: "stripe.checkout_session_created",
      status: "completed",
    }));
  });
});
