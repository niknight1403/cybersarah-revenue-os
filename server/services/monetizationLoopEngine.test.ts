import { describe, expect, it } from "vitest";
import { buildMonetizationLoopSnapshot } from "./monetizationLoopEngine";

describe("monetization loop engine", () => {
  it("liefert vier Loops mit realer Checkout-Rate und ohne zugeschriebenen Fantasieumsatz", () => {
    const loops = buildMonetizationLoopSnapshot({ mrrCents: 12000, checkoutStarted: 4, checkoutCompleted: 1, paymentFailures: 1, cancellations: 0 });
    expect(loops).toHaveLength(4);
    expect(loops.find(loop => loop.id === "cart_recovery")?.conversionRate).toBe(0.25);
    expect(loops.every(loop => loop.mode === "manual_approval" && loop.approvalRequired && !loop.externalExecution)).toBe(true);
    expect(loops.every(loop => loop.revenueCents === null)).toBe(true);
  });

  it("meldet bei fehlenden Checkout-Events keine künstliche Conversion", () => {
    expect(buildMonetizationLoopSnapshot(null).every(loop => loop.conversionRate === null)).toBe(true);
  });
});
