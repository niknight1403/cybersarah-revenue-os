import { trpc } from "@/lib/trpc";
import React, { useEffect, useState } from "react";

const EXPERIMENT_SUBJECT_STORAGE_KEY = "revenue-experiment-subject";

export function isSafeStripeCheckoutUrl(value: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["checkout.stripe.com", "buy.stripe.com"].includes(url.hostname) && url.pathname.length > 1;
  } catch {
    return false;
  }
}

function sendBeacon(path: string, payload: Record<string, unknown>) {
  if (typeof navigator === "undefined") return;
  navigator.sendBeacon(path, new Blob([JSON.stringify(payload)], { type: "application/json" }));
}

export function buildCheckoutTrackingEvents(input: { analyticsWriteKey: string | null | undefined; subjectKey: string; experimentId: number | undefined }) {
  const events: Array<{ path: string; payload: Record<string, unknown> }> = [];
  if (input.analyticsWriteKey) events.push({ path: "/api/events/funnel", payload: { key: input.analyticsWriteKey, eventId: crypto.randomUUID(), eventType: "checkout.session.created" } });
  if (input.experimentId) events.push({ path: "/api/events/experiment", payload: { subjectKey: input.subjectKey, experimentId: input.experimentId, eventType: "checkout_start" } });
  return events;
}

export default function RevenueCheckout() {
  const [target] = useState(() => {
    if (typeof window === "undefined") return null;
    const value = new URLSearchParams(window.location.search).get("stripe_url");
    return isSafeStripeCheckoutUrl(value) ? value : null;
  });
  const [subjectKey] = useState(() => {
    if (typeof window === "undefined") return "server-render-checkout-subject";
    const existing = sessionStorage.getItem(EXPERIMENT_SUBJECT_STORAGE_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(EXPERIMENT_SUBJECT_STORAGE_KEY, created);
    return created;
  });
  const tracking = trpc.app.tracking.useQuery();
  const experiment = trpc.app.experimentVariant.useQuery({ subjectKey });

  useEffect(() => {
    if (!target) return;
    for (const event of buildCheckoutTrackingEvents({ analyticsWriteKey: tracking.data?.key, subjectKey, experimentId: experiment.data?.experimentId })) sendBeacon(event.path, event.payload);
    window.location.replace(target);
  }, [experiment.data, subjectKey, target, tracking.data?.key]);

  if (!target) return <main className="cyber-grid min-h-screen p-6"><section className="cyber-panel mx-auto max-w-lg p-6"><h1 className="text-2xl font-bold text-white">Ungültiger Checkout-Einstieg</h1><p className="mt-3 text-sm text-muted-foreground">Der Checkout-Link konnte aus Sicherheitsgründen nicht geöffnet werden.</p></section></main>;
  return <main className="cyber-grid min-h-screen p-6"><section className="cyber-panel mx-auto max-w-lg p-6"><p className="mono text-[10px] tracking-[0.16em] text-cyan-200">CHECKOUT // VERIFIED REDIRECT</p><h1 className="mt-3 text-2xl font-bold text-white">Sicherer Checkout wird geöffnet …</h1><p className="mt-3 text-sm text-muted-foreground">Der Checkout-Start wird pseudonymisiert erfasst. Zahlungsdaten werden ausschließlich von Stripe verarbeitet.</p></section></main>;
}
