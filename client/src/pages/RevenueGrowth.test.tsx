import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: 1, role: "admin", name: "Owner" } as any,
  growth: {
    isLoading: false,
    isError: false,
    data: {
      workspace: { id: 19, name: "Revenue Workspace" },
      metrics: { mrrCents: 0, checkoutCompleted: 0, checkoutStarted: 0, paymentFailures: 0, cancellations: 0, cacCents: 0, estimatedLtvCents: 0 },
      setting: { enabled: false, analyticsWriteKey: "track_key", lastRunAt: null },
      experiments: [],
      retention: [],
    },
  } as any,
  stripe: {
    isLoading: false,
    isError: false,
    data: {
      workspace: { id: 19 },
      config: { status: "active" },
      readiness: { mode: "test", secretKeyConfigured: true, webhookSecretConfigured: true, checkoutOriginConfigured: true },
    },
  } as any,
  mutation: { isPending: false, isError: false, mutate: vi.fn() },
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      growth: { status: { invalidate: vi.fn() } },
      stripe: { status: { invalidate: vi.fn() } },
    }),
    growth: {
      status: { useQuery: () => state.growth },
      runAnalysis: { useMutation: () => state.mutation },
      enableSchedule: { useMutation: () => state.mutation },
      pauseSchedule: { useMutation: () => state.mutation },
      activateExperiment: { useMutation: () => state.mutation },
      pauseExperiment: { useMutation: () => state.mutation },
      setMarketingSpend: { useMutation: () => state.mutation },
    },
    stripe: {
      status: { useQuery: () => state.stripe },
      requestApproval: { useMutation: () => state.mutation },
      approve: { useMutation: () => state.mutation },
      suspend: { useMutation: () => state.mutation },
      createPaymentLink: { useMutation: () => state.mutation },
      createCheckoutSession: { useMutation: () => state.mutation },
    },
  },
}));

import RevenueGrowth, { recordCheckoutStart } from "./RevenueGrowth";

describe("RevenueGrowth payment-link control", () => {
  beforeEach(() => {
    state.user = { id: 1, role: "admin", name: "Owner" };
    state.stripe = {
      isLoading: false,
      isError: false,
      data: {
        workspace: { id: 19 },
        config: { status: "active" },
        readiness: { mode: "test", secretKeyConfigured: true, webhookSecretConfigured: true, checkoutOriginConfigured: true },
      },
    };
  });

  it("zeigt die Payment-Link-Konfiguration nur für Admins mit aktivem Provider", () => {
    const markup = renderToStaticMarkup(<RevenueGrowth />);
    expect(markup).toContain("Checkout oder Zahlungslink vorbereiten");
    expect(markup).toContain("Zahlungsflow konfigurieren");
    expect(markup).toContain("explizite externe Aktion");
  });

  it("sperrt die Payment-Link-Konfiguration für Nicht-Admins", () => {
    state.user = { id: 2, role: "user", name: "Member" };
    const markup = renderToStaticMarkup(<RevenueGrowth />);
    expect(markup).toContain("ausschließlich für Admins verfügbar");
    expect(markup).not.toContain("Zahlungsflow konfigurieren");
  });

  it("sendet beim Öffnen eines Zahlungsflows nur ein pseudonymisiertes Checkout-Start-Ereignis", async () => {
    const calls: Array<[string, Blob]> = [];
    const sendBeacon = (path: string, blob: Blob) => {
      calls.push([path, blob]);
      return true;
    };
    vi.stubGlobal("navigator", { sendBeacon });
    recordCheckoutStart("analytics_key_123");
    expect(calls).toHaveLength(1);
    const [path, blob] = calls[0]!;
    expect(path).toBe("/api/events/funnel");
    expect(JSON.parse(await blob.text())).toMatchObject({ key: "analytics_key_123", eventType: "checkout.session.created" });
    vi.unstubAllGlobals();
  });

  it("ordnet einen Checkout-Start zusätzlich einer vorhandenen A/B-Variante zu", async () => {
    const calls: Array<[string, Blob]> = [];
    vi.stubGlobal("navigator", { sendBeacon: (path: string, blob: Blob) => { calls.push([path, blob]); return true; } });
    recordCheckoutStart("analytics_key_123", "9a84b447-2e99-4b6d-a7d5-655444bece4e", 7);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.[0]).toBe("/api/events/experiment");
    expect(JSON.parse(await calls[1]![1].text())).toEqual({ subjectKey: "9a84b447-2e99-4b6d-a7d5-655444bece4e", experimentId: 7, eventType: "checkout_start" });
    vi.unstubAllGlobals();
  });
});
