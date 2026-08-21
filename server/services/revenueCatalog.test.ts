import { describe, expect, it } from "vitest";
import { DEFAULT_REVENUE_AGENTS } from "./revenueCatalog";

describe("DEFAULT_REVENUE_AGENTS", () => {
  it("liefert eindeutige, rein interne Systemagenten", () => {
    const agentKeys = DEFAULT_REVENUE_AGENTS.map(agent => agent.agentKey);
    expect(new Set(agentKeys).size).toBe(agentKeys.length);
    expect(DEFAULT_REVENUE_AGENTS.every(agent => agent.name.length > 2)).toBe(true);
  });
});
