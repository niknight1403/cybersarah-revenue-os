import type { Request, Response } from "express";
import * as db from "../db";
import { classifyStripeFailure, constructStripeEvent } from "./stripeProvider";
import { z } from "zod";

type StripeEventObject = {
  id?: string;
  amount_paid?: number | null;
  amount_received?: number | null;
  amount_total?: number | null;
  currency?: string | null;
  customer?: string | { id?: string } | null;
  subscription?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
};

type StripeEventLike = { id: string; type: string; created: number; data: { object: StripeEventObject } };

const stripeEventSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.string().min(1).max(120),
  created: z.number().int().nonnegative(),
  data: z.object({
    object: z.object({
      amount_paid: z.number().int().nonnegative().nullable().optional(),
      amount_received: z.number().int().nonnegative().nullable().optional(),
      amount_total: z.number().int().nonnegative().nullable().optional(),
      currency: z.string().length(3).nullable().optional(),
      customer: z.union([z.string().min(1), z.object({ id: z.string().min(1).optional() })]).nullable().optional(),
      subscription: z.union([z.string().min(1), z.object({ id: z.string().min(1).optional() })]).nullable().optional(),
      metadata: z.record(z.string(), z.string()).nullable().optional(),
    }).passthrough(),
  }),
}).passthrough();

type StripeWebhookDependencies = {
  constructEvent: (rawBody: Buffer, signature: string) => StripeEventLike;
  isProviderActive: (workspaceId: number) => Promise<boolean>;
  recordWebhook: (workspaceId: number, eventType: string, accepted: boolean) => Promise<void>;
  recordEvent: typeof db.recordRevenueEvent;
  recordAudit: typeof db.recordGrowthAudit;
  createRetentionDraft: typeof db.createRetentionDraftFromRevenueEvent;
};

function referenceOf(value: StripeEventObject["customer"] | StripeEventObject["subscription"]) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function workspaceIdOf(event: StripeEventLike) {
  const raw = event.data.object.metadata?.workspace_id;
  const workspaceId = Number(raw ?? "");
  return Number.isInteger(workspaceId) && workspaceId > 0 ? workspaceId : null;
}

function amountOf(object: StripeEventObject) {
  return object.amount_paid ?? object.amount_received ?? object.amount_total ?? 0;
}

export function createStripeWebhookHandler(dependencies: StripeWebhookDependencies) {
  return async (req: Request, res: Response) => {
    let context: { workspaceId: number; eventId: string; eventType: string } | undefined;
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string" || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({ error: "Ungültige Stripe-Signatur oder Rohdaten." });
    }

    try {
      const event = stripeEventSchema.parse(dependencies.constructEvent(req.body, signature)) as StripeEventLike;
      const workspaceId = workspaceIdOf(event);
      if (!workspaceId) {
        return res.status(202).json({ verified: true, processed: false, reason: "Kein Revenue-Workspace im Stripe-Ereignis hinterlegt." });
      }

      context = { workspaceId, eventId: event.id, eventType: event.type };
      const providerActive = await dependencies.isProviderActive(workspaceId);
      await dependencies.recordWebhook(workspaceId, event.type, providerActive);
      if (!providerActive) {
        await dependencies.recordAudit({ workspaceId, idempotencyKey: `stripe-gate:${event.id}`, actor: "webhook", eventType: "stripe.webhook_ignored", status: "skipped", detail: { stripeEventId: event.id, stripeEventType: event.type, reason: "provider_not_approved" } });
        return res.status(202).json({ verified: true, processed: false, reason: "Stripe-Provider ist nicht explizit freigegeben." });
      }

      const object = event.data.object;
      const subjectRef = referenceOf(object.subscription) ?? referenceOf(object.customer);
      const recorded = await dependencies.recordEvent({
        workspaceId,
        source: "stripe",
        externalEventId: event.id,
        eventType: event.type,
        subjectRef,
        amountCents: amountOf(object),
        currency: object.currency ?? "EUR",
        occurredAt: new Date(event.created * 1000),
        metadata: { workspaceId, subjectRef, provider: "stripe" },
      });
      if (!recorded.inserted) {
        return res.status(200).json({ verified: true, processed: false, duplicate: true });
      }

      if (event.type === "invoice.payment_failed") {
        await dependencies.createRetentionDraft(recorded.event.id, workspaceId, "dunning", subjectRef, "Einwilligungsbasierten Dunning-Entwurf mit Zahlungsaktualisierung und klarer Opt-out-Möglichkeit vorbereiten.");
      }
      if (event.type === "customer.subscription.deleted") {
        await dependencies.createRetentionDraft(recorded.event.id, workspaceId, "retention", subjectRef, "Freiwilliges Retention-Angebot als Entwurf vorbereiten; keine automatische Kontaktaufnahme ohne berechtigte Kommunikationsgrundlage.");
      }

      await dependencies.recordAudit({ workspaceId, idempotencyKey: `stripe-accepted:${event.id}`, actor: "webhook", eventType: "stripe.webhook_accepted", status: "completed", detail: { stripeEventId: event.id, stripeEventType: event.type, amountCents: amountOf(object), subjectRef } });
      return res.status(200).json({ verified: true, processed: true, eventType: event.type });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Stripe-Webhook-Verarbeitung fehlgeschlagen.";
      if (context) {
        try {
          await dependencies.recordAudit({ workspaceId: context.workspaceId, idempotencyKey: `stripe-webhook-retry:${context.eventId}`, actor: "webhook", eventType: "stripe.webhook_retry_hint", status: "failed", detail: { stripeEventId: context.eventId, stripeEventType: context.eventType, ...classifyStripeFailure(error, "webhook") } });
        } catch (auditError) {
          console.error("[Stripe] Webhook-Fehler konnte nicht auditiert werden", auditError);
        }
      }
      return res.status(400).json({ error: message, retryable: true, fallback: "approval_draft" });
    }
  };
}

export const handleStripeWebhook = createStripeWebhookHandler({
  constructEvent: constructStripeEvent as unknown as (rawBody: Buffer, signature: string) => StripeEventLike,
  isProviderActive: db.isStripeProviderActive,
  recordWebhook: db.recordStripeWebhookForWorkspace,
  recordEvent: db.recordRevenueEvent,
  recordAudit: db.recordGrowthAudit,
  createRetentionDraft: db.createRetentionDraftFromRevenueEvent,
});
