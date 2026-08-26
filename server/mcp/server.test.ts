import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

const mocks = vi.hoisted(() => ({
  getMcpOwnerWorkspace: vi.fn(),
  recordGrowthAudit: vi.fn(),
  updateGrowthAudit: vi.fn(),
  getMcpRevenueMetrics: vi.fn(),
  getMcpMonetizationOverview: vi.fn(),
  getMcpSystemLogs: vi.fn(),
  getMcpExperiments: vi.fn(),
  triggerMcpDunningDraft: vi.fn(),
  updateMcpPricingExperiment: vi.fn(),
  getMcpAuditTrail: vi.fn(),
}));

vi.mock("../db", () => mocks);
import { auditMcpOperation, createRevenueMcpServer, redactMcpData } from "./server";

describe("CyberSarah Revenue OS MCP-Server", () => {
  let client: Client;
  let server: ReturnType<typeof createRevenueMcpServer>;

  beforeEach(async () => {
    Object.values(mocks).forEach(mock => mock.mockReset());
    mocks.getMcpOwnerWorkspace.mockResolvedValue({ id: 42 });
    mocks.recordGrowthAudit.mockResolvedValue(true);
    mocks.updateGrowthAudit.mockResolvedValue(undefined);
    mocks.getMcpRevenueMetrics.mockResolvedValue({ mrrCents: 12900, arrCents: 154800, conversionRate: 0.2, churnRate: 0.05 });
    mocks.getMcpMonetizationOverview.mockResolvedValue({ totalCents: 12900, currency: "EUR", sources: [{ source: "Stripe", status: "active", amountCents: 12900 }, { source: "Affiliate", status: "not_connected", amountCents: null }] });
    mocks.getMcpSystemLogs.mockResolvedValue({ events: [] });
    mocks.getMcpExperiments.mockResolvedValue([{ id: 7, status: "needs_approval" }]);
    mocks.triggerMcpDunningDraft.mockResolvedValue({ id: 5, created: true });
    mocks.updateMcpPricingExperiment.mockResolvedValue({ experimentId: 8, status: "needs_approval", maxTrafficPercent: 20, requiresApproval: true });
    mocks.getMcpAuditTrail.mockResolvedValue({ events: [] });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createRevenueMcpServer();
    client = new Client({ name: "mcp-test-client", version: "1.0.0" }, { capabilities: {} });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => { await client.close(); await server.close(); });

  it("stellt alle geforderten Ressourcen und geschützten Tools bereit", async () => {
    const [resources, tools] = await Promise.all([client.listResources(), client.listTools()]);
    expect(resources.resources.map(resource => resource.uri)).toEqual(expect.arrayContaining(["metrics://revenue", "logs://system", "experiments://ab-testing"]));
    expect(tools.tools.map(tool => tool.name)).toEqual(expect.arrayContaining(["get_financial_summary", "get_total_earnings", "trigger_dunning_sequence", "update_pricing_experiment", "query_audit_trail"]));
  });

  it("liefert die Finanzzusammenfassung und protokolliert den MCP-Toolaufruf", async () => {
    const result = await client.callTool({ name: "get_financial_summary", arguments: {} });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.content)).toContain("12900");
    expect(mocks.recordGrowthAudit).toHaveBeenCalledWith(expect.objectContaining({ eventType: "mcp.tool.financial_summary", status: "accepted" }));
    expect(mocks.updateGrowthAudit).toHaveBeenCalledWith(expect.any(String), "completed", expect.objectContaining({ operation: "tool.financial_summary" }));
  });

  it("liefert den redigierten konsolidierten Einnahmenstatus und protokolliert den Lesezugriff", async () => {
    const result = await client.callTool({ name: "get_total_earnings", arguments: {} });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.content)).toContain("12900");
    expect(mocks.getMcpMonetizationOverview).toHaveBeenCalledTimes(1);
    expect(mocks.recordGrowthAudit).toHaveBeenCalledWith(expect.objectContaining({ eventType: "mcp.tool.total_earnings", status: "accepted" }));
  });

  it("liest alle drei MCP-Ressourcen über das Protokoll", async () => {
    const [metrics, logs, experiments] = await Promise.all([
      client.readResource({ uri: "metrics://revenue" }),
      client.readResource({ uri: "logs://system" }),
      client.readResource({ uri: "experiments://ab-testing" }),
    ]);
    expect(JSON.stringify(metrics.contents)).toContain("12900");
    expect(JSON.stringify(logs.contents)).toContain("events");
    expect(JSON.stringify(experiments.contents)).toContain("needs_approval");
    expect(mocks.getMcpRevenueMetrics).toHaveBeenCalled();
    expect(mocks.getMcpSystemLogs).toHaveBeenCalledWith(50);
    expect(mocks.getMcpExperiments).toHaveBeenCalled();
  });

  it("hält Pricing-Änderungen als Freigabeentwurf mit begrenztem Traffic fest", async () => {
    const result = await client.callTool({ name: "update_pricing_experiment", arguments: { experimentId: 8, variantKey: "variant", proposedValue: "49 EUR", maxTrafficPercent: 20 } });
    expect(result.isError).not.toBe(true);
    expect(mocks.updateMcpPricingExperiment).toHaveBeenCalledWith(8, "variant", "49 EUR", 20);
    expect(JSON.stringify(result.content)).toContain("needs_approval");
  });

  it("stellt Dunning-Entwurf und Audit-Trail über MCP-Tools bereit", async () => {
    const dunning = await client.callTool({ name: "trigger_dunning_sequence", arguments: { revenueEventId: 31 } });
    const audit = await client.callTool({ name: "query_audit_trail", arguments: { limit: 10 } });
    expect(dunning.isError).not.toBe(true);
    expect(audit.isError).not.toBe(true);
    expect(mocks.triggerMcpDunningDraft).toHaveBeenCalledWith(31);
    expect(mocks.getMcpAuditTrail).toHaveBeenCalledWith(10);
    expect(mocks.recordGrowthAudit).toHaveBeenCalledWith(expect.objectContaining({ eventType: "mcp.tool.dunning_draft", status: "accepted" }));
    expect(mocks.recordGrowthAudit).toHaveBeenCalledWith(expect.objectContaining({ eventType: "mcp.tool.audit_trail", status: "accepted" }));
    expect(mocks.updateGrowthAudit).toHaveBeenCalledWith(expect.any(String), "completed", expect.objectContaining({ operation: "tool.dunning_draft" }));
    expect(mocks.updateGrowthAudit).toHaveBeenCalledWith(expect.any(String), "completed", expect.objectContaining({ operation: "tool.audit_trail" }));
  });

  it("führt denselben requestbezogenen MCP-Aufruf nach einem Audit-Claim nicht erneut aus", async () => {
    mocks.recordGrowthAudit.mockReset().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const execute = vi.fn(async () => ({ ok: true }));
    const first = await auditMcpOperation("tool.idempotency", "rpc-17", execute);
    const repeated = await auditMcpOperation("tool.idempotency", "rpc-17", execute);
    expect(first).toEqual({ ok: true });
    expect(repeated).toEqual({ duplicate: true });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("redigiert potentielle Secrets aus jeder MCP-Ausgabe", () => {
    expect(redactMcpData({ apiKey: "secret", safe: { token: "hidden", value: 1 } })).toEqual({ apiKey: "[redacted]", safe: { token: "[redacted]", value: 1 } });
    expect(redactMcpData({ summary: "Stripe sk_live_verysecret should not be returned" })).toEqual({ summary: "[redacted]" });
  });
});
