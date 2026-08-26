import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/trpc", () => ({ trpc: { trading: { status: { useQuery: () => ({ isLoading: false, data: { connected: false, mode: "unconfigured", roi: null, openTrades: null, strategy: null, liveExecution: false, approvalRequired: true, message: "Dry-Run-Connector bereit; Freqtrade-URL und Token fehlen." } }) } } } }));

import TradingPanel from "./TradingPanel";

describe("trading panel", () => {
  it("zeigt Dry-Run-Readiness und blockierte Außenwirkung transparent", () => {
    const html = renderToStaticMarkup(<TradingPanel />);
    expect(html).toContain("Freqtrade-Status");
    expect(html).toContain("unconfigured");
    expect(html).toContain("Live-Trading: blockiert");
    expect(html).toContain("Freqtrade-URL und Token fehlen");
  });
});
