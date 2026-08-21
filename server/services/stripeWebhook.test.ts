import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { createStripeWebhookHandler } from "./stripeWebhook";

function createResponse() {
  const result = { statusCode: 200, body: undefined as unknown };
  const response = {
    status: (statusCode: number) => {
      result.statusCode = statusCode;
      return response;
    },
    json: (body: unknown) => {
      result.body = body;
      return response;
    },
  };
  return { response: response as unknown as Response, result };
}

describe("Stripe-Webhook-Gate", () => {
  it("weist Requests ohne Stripe-Signatur vor jeder Verarbeitung zurück", async () => {
    const handler = createStripeWebhookHandler({
      constructEvent: vi.fn(),
      isProviderActive: vi.fn(),
      recordWebhook: vi.fn(),
      recordEvent: vi.fn(),
      recordAudit: vi.fn(),
      createRetentionDraft: vi.fn(),
    });
    const { response, result } = createResponse();
    await handler({ headers: {}, body: Buffer.from("{}") } as unknown as Request, response);
    expect(result.statusCode).toBe(400);
  });

  it("bestätigt verifizierte Events, verarbeitet sie aber nicht ohne Providerfreigabe", async () => {
    const recordEvent = vi.fn();
    const recordAudit = vi.fn(async () => true);
    const handler = createStripeWebhookHandler({
      constructEvent: vi.fn(() => ({ id: "evt_disabled", type: "invoice.payment_failed", created: 1, data: { object: { metadata: { workspace_id: "9" } } } })),
      isProviderActive: vi.fn(async () => false),
      recordWebhook: vi.fn(async () => undefined),
      recordEvent,
      recordAudit,
      createRetentionDraft: vi.fn(),
    });
    const { response, result } = createResponse();
    await handler({ headers: { "stripe-signature": "valid" }, body: Buffer.from("{}") } as unknown as Request, response);
    expect(result.statusCode).toBe(202);
    expect(recordEvent).not.toHaveBeenCalled();
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ eventType: "stripe.webhook_ignored", status: "skipped" }));
  });

  it("erfasst einen freigegebenen Zahlungsfehler idempotent und erzeugt nur einen Dunning-Entwurf", async () => {
    const createRetentionDraft = vi.fn(async () => ({ id: 21, created: true }));
    const handler = createStripeWebhookHandler({
      constructEvent: vi.fn(() => ({ id: "evt_failure", type: "invoice.payment_failed", created: 1_700_000_000, data: { object: { amount_paid: 4900, currency: "eur", customer: "cus_123", metadata: { workspace_id: "9" } } } })),
      isProviderActive: vi.fn(async () => true),
      recordWebhook: vi.fn(async () => undefined),
      recordEvent: vi.fn(async () => ({ event: { id: 13 }, inserted: true })),
      recordAudit: vi.fn(async () => true),
      createRetentionDraft,
    });
    const { response, result } = createResponse();
    await handler({ headers: { "stripe-signature": "valid" }, body: Buffer.from("{}") } as unknown as Request, response);
    expect(result.statusCode).toBe(200);
    expect(createRetentionDraft).toHaveBeenCalledWith(13, 9, "dunning", "cus_123", expect.stringContaining("Dunning-Entwurf"));
  });

  it("erfasst einen erfolgreichen Checkout als Umsatzsignal ohne Kundenkommunikation auszulösen", async () => {
    const recordEvent = vi.fn(async () => ({ event: { id: 41 }, inserted: true }));
    const createRetentionDraft = vi.fn();
    const handler = createStripeWebhookHandler({
      constructEvent: vi.fn(() => ({ id: "evt_success", type: "checkout.session.completed", created: 1_700_000_001, data: { object: { amount_total: 49900, currency: "eur", customer: "cus_success", metadata: { workspace_id: "9" } } } })),
      isProviderActive: vi.fn(async () => true),
      recordWebhook: vi.fn(async () => undefined),
      recordEvent,
      recordAudit: vi.fn(async () => true),
      createRetentionDraft,
    });
    const { response, result } = createResponse();
    await handler({ headers: { "stripe-signature": "valid" }, body: Buffer.from("{}") } as unknown as Request, response);
    expect(result.statusCode).toBe(200);
    expect(recordEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "checkout.session.completed", amountCents: 49900, subjectRef: "cus_success" }));
    expect(createRetentionDraft).not.toHaveBeenCalled();
  });

  it("erfasst eine Kündigung und erzeugt ausschließlich einen freigabepflichtigen Retention-Entwurf", async () => {
    const createRetentionDraft = vi.fn(async () => ({ id: 51, created: true }));
    const handler = createStripeWebhookHandler({
      constructEvent: vi.fn(() => ({ id: "evt_cancel", type: "customer.subscription.deleted", created: 1_700_000_002, data: { object: { subscription: "sub_cancel", customer: "cus_cancel", metadata: { workspace_id: "9" } } } })),
      isProviderActive: vi.fn(async () => true),
      recordWebhook: vi.fn(async () => undefined),
      recordEvent: vi.fn(async () => ({ event: { id: 52 }, inserted: true })),
      recordAudit: vi.fn(async () => true),
      createRetentionDraft,
    });
    const { response, result } = createResponse();
    await handler({ headers: { "stripe-signature": "valid" }, body: Buffer.from("{}") } as unknown as Request, response);
    expect(result.statusCode).toBe(200);
    expect(createRetentionDraft).toHaveBeenCalledWith(52, 9, "retention", "sub_cancel", expect.stringContaining("Retention-Angebot"));
  });
});
