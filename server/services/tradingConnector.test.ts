import { describe, expect, it, vi } from "vitest";
import { createTradingConnector, getTradingReadiness } from "./tradingConnector";

describe("trading connector", () => {
  it("bleibt ohne Credentials unconfigured und führt keinen Request aus", async () => {
    const fetcher = vi.fn();
    const connector = createTradingConnector(fetcher);
    expect(getTradingReadiness({ FREQTRADE_DRY_RUN: "true" }).mode).toBe("unconfigured");
    expect((await connector.snapshot({ FREQTRADE_DRY_RUN: "true" })).externalExecution).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("liest Profit und offene Trades ausschließlich im Dry-Run", async () => {
    const fetcher = vi.fn(async (url: string) => new Response(url.endsWith("profit") ? JSON.stringify({ profit_all_pct: 2.5, strategy: "SampleStrategy" }) : JSON.stringify([{ trade_id: 1 }]), { status: 200 }));
    const connector = createTradingConnector(fetcher);
    const snapshot = await connector.snapshot({ FREQTRADE_API_URL: "http://127.0.0.1:8080", FREQTRADE_API_TOKEN: "test-only", FREQTRADE_DRY_RUN: "true" });
    expect(snapshot).toMatchObject({ connected: true, mode: "dry_run", roi: 2.5, openTrades: 1, liveExecution: false, approvalRequired: true });
  });

  it("blockiert Start und Stop als externe Steueraktionen", async () => {
    const connector = createTradingConnector();
    await expect(connector.start()).rejects.toThrow("approval-first blockiert");
    await expect(connector.stop()).rejects.toThrow("nicht automatisch ausgelöst");
  });
});
