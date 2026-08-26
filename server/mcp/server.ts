import type { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import * as db from "../db";

const sensitiveKey = /(?:api[_-]?key|authorization|cookie|password|secret|token|webhook|private)/i;

export function redactMcpData(value: unknown): unknown {
  if (typeof value === "string" && /(?:\bsk_(?:live|test)_[A-Za-z0-9_]+|\bwhsec_[A-Za-z0-9_]+|\bBearer\s+[A-Za-z0-9._-]+)/i.test(value)) return "[redacted]";
  if (Array.isArray(value)) return value.map(redactMcpData);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, sensitiveKey.test(key) ? "[redacted]" : redactMcpData(nested)]));
}

function asText(value: unknown) {
  return JSON.stringify(redactMcpData(value), null, 2);
}

export async function auditMcpOperation(operation: string, requestId: string | number, execute: () => Promise<unknown>) {
  const workspace = await db.getMcpOwnerWorkspace();
  const idempotencyKey = `mcp:${operation}:${String(requestId)}`;
  const claimed = await db.recordGrowthAudit({ workspaceId: workspace.id, idempotencyKey, actor: "system", eventType: `mcp.${operation}`, status: "accepted", detail: { operation, requestId: String(requestId) } });
  if (!claimed) return { duplicate: true };
  try {
    const result = await execute();
    await db.updateGrowthAudit(idempotencyKey, "completed", { operation, requestId: String(requestId) });
    return result;
  } catch (error) {
    await db.updateGrowthAudit(idempotencyKey, "failed", { operation, requestId: String(requestId), error: error instanceof Error ? error.message : "Unbekannter Fehler" });
    throw error;
  }
}

function toolError(error: unknown) {
  return { content: [{ type: "text" as const, text: error instanceof Error ? error.message : "MCP-Operation fehlgeschlagen." }], isError: true };
}

export function createRevenueMcpServer() {
  const server = new McpServer({ name: "cybersarah-revenue-os", version: "1.0.0" }, { capabilities: { logging: {} } });

  server.registerResource("revenue-metrics", "metrics://revenue", { title: "Revenue-Metriken", description: "Redigierte aggregierte Revenue-, Funnel- und Retention-Kennzahlen.", mimeType: "application/json" }, async (uri, extra) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: asText(await auditMcpOperation("resource.metrics", extra.requestId, () => db.getMcpRevenueMetrics())) }] }));
  server.registerResource("system-logs", "logs://system", { title: "System-Audit-Logs", description: "Redigierte Runtime-Audits des eigenen Revenue-Arbeitsbereichs.", mimeType: "application/json" }, async (uri, extra) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: asText(await auditMcpOperation("resource.system_logs", extra.requestId, () => db.getMcpSystemLogs(50))) }] }));
  server.registerResource("ab-testing", "experiments://ab-testing", { title: "A/B-Test-Status", description: "Aktuelle CRO-, Landingpage- und Pricing-Experimente mit Freigabestatus.", mimeType: "application/json" }, async (uri, extra) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: asText(await auditMcpOperation("resource.experiments", extra.requestId, () => db.getMcpExperiments())) }] }));

  server.registerTool("get_financial_summary", { title: "Finanzzusammenfassung", description: "Liest MRR, ARR, Umsatz-, Churn- und Conversion-Signale des Revenue-Arbeitsbereichs.", inputSchema: z.object({}) }, async (_input, extra) => {
    try { return { content: [{ type: "text", text: asText(await auditMcpOperation("tool.financial_summary", extra.requestId, () => db.getMcpRevenueMetrics())) }] }; } catch (error) { return toolError(error); }
  });
  server.registerTool("get_total_earnings", { title: "Konsolidierte Einnahmen", description: "Liest den redigierten Status aggregierter Stripe-Einnahmen und nicht verbundener Monetarisierungsquellen. Es werden keine Providerzugangsdaten offengelegt.", inputSchema: z.object({}) }, async (_input, extra) => {
    try { return { content: [{ type: "text", text: asText(await auditMcpOperation("tool.total_earnings", extra.requestId, () => db.getMcpMonetizationOverview())) }] }; } catch (error) { return toolError(error); }
  });
  server.registerTool("trigger_dunning_sequence", { title: "Dunning-Entwurf", description: "Erstellt ausschließlich einen auditierten, freigabepflichtigen Dunning-Entwurf für einen registrierten Zahlungsfehler; es wird keine Nachricht versendet.", inputSchema: z.object({ revenueEventId: z.number().int().positive() }) }, async ({ revenueEventId }, extra) => {
    try { return { content: [{ type: "text", text: asText(await auditMcpOperation("tool.dunning_draft", extra.requestId, () => db.triggerMcpDunningDraft(revenueEventId))) }] }; } catch (error) { return toolError(error); }
  });
  server.registerTool("update_pricing_experiment", { title: "Pricing-Experiment anpassen", description: "Aktualisiert nur eine nicht aktive Pricing-Variante und setzt den Status zwingend auf Freigabe erforderlich. Es werden keine Live-Preise verändert.", inputSchema: z.object({ experimentId: z.number().int().positive(), variantKey: z.string().trim().min(1).max(80), proposedValue: z.string().trim().min(1).max(200), maxTrafficPercent: z.number().int().min(0).max(25) }) }, async (input, extra) => {
    try { return { content: [{ type: "text", text: asText(await auditMcpOperation("tool.pricing_experiment", extra.requestId, () => db.updateMcpPricingExperiment(input.experimentId, input.variantKey, input.proposedValue, input.maxTrafficPercent))) }] }; } catch (error) { return toolError(error); }
  });
  server.registerTool("query_audit_trail", { title: "Audit-Trail abfragen", description: "Liest redigierte historische MCP-, Growth- und Agentenaktionen des eigenen Revenue-Arbeitsbereichs.", inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(25) }) }, async ({ limit }, extra) => {
    try { return { content: [{ type: "text", text: asText(await auditMcpOperation("tool.audit_trail", extra.requestId, () => db.getMcpAuditTrail(limit))) }] }; } catch (error) { return toolError(error); }
  });
  return server;
}

export async function handleMcpRequest(req: Request, res: Response) {
  const server = createRevenueMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: error instanceof Error ? error.message : "MCP-Transportfehler" });
  } finally {
    await server.close().catch(() => undefined);
  }
}
