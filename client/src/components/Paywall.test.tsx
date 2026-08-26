import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/trpc", () => ({ trpc: { subscriptions: { readiness: { useQuery: () => ({ isLoading: false, data: { subscription: { status: "not_configured", products: [{ id: "monthly", label: "HARA Monat", entitlement: "hara_pro", billingPeriod: "month" }], requiresProviderSetup: true }, production: { mode: "sandbox" } } }) } } } }));

import Paywall from "./Paywall";

describe("paywall readiness", () => {
  it("zeigt Produkte und blockiert den Kauf ohne Provider-Setup", () => {
    const html = renderToStaticMarkup(<Paywall />);
    expect(html).toContain("HARA-Zugriff transparent freischalten");
    expect(html).toContain("HARA Monat");
    expect(html).toContain("Provider: not_configured");
    expect(html).toContain("Kauf: blockiert");
    expect(html).toContain("/privacy");
    expect(html).toContain("/terms");
  });
});
