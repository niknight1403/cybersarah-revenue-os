import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { agentStripeWritePolicy } from "../stripeAgentSafety";

describe("Revenue OS: unattended Stripe product creation safety", () => {
  it("never grants live-mode writes to self-running agents", () => {
    expect(agentStripeWritePolicy({STRIPE_MODE:"live",STRIPE_AUTONOMOUS_WRITES_APPROVED:"on"}).allowed).toBe(false);
    expect(agentStripeWritePolicy({STRIPE_MODE:"live"}).allowed).toBe(false);
    expect(agentStripeWritePolicy({}).allowed).toBe(false);
  });
  it("requires explicit sandbox and opt-in for agent product creation", () => {
    expect(agentStripeWritePolicy({STRIPE_MODE:"test"}).allowed).toBe(false);
    expect(agentStripeWritePolicy({STRIPE_MODE:"test", STRIPE_AUTONOMOUS_WRITES_APPROVED:"on"}).allowed).toBe(true);
  });
  it("guards V5 mutating methods before constructing any Stripe client", () => {
    const methods = {
      RevenueAnalystAgent:["dynamicPricing","autoCrossSell","autoDiscount"],
      MonetizationAgent:["erstelleUpsellProdukte","dynamicPricing","autoBundle","flashSale"],
    };
    for (const [agent,names] of Object.entries(methods)) {
      const src=readFileSync(new URL("../../agents/"+agent+".ts",import.meta.url),"utf8");
      for (const name of names) {
        const start=src.indexOf("private async "+name+"(");
        const guard=src.indexOf("agentStripeWritePolicy(process.env)",start);
        const client=src.indexOf("const stripe = getStripeClient()",start);
        expect(start,agent+"."+name).toBeGreaterThan(-1);
        expect(guard).toBeGreaterThan(start);
        expect(client).toBeGreaterThan(guard);
        expect(src.slice(guard,client)).toContain("if (!policy.allowed) return");
      }
    }
  });
});
