import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";

export type RevenueCatEventType = "INITIAL_PURCHASE" | "RENEWAL" | "CANCELLATION" | "NON_RENEWING_PURCHASE" | "EXPIRATION" | "BILLING_ISSUE" | "UNCATEGORIZED";

export function classifyRevenueCatEvent(input: unknown) {
  const event = input && typeof input === "object" && "event" in input ? (input as { event?: unknown }).event : input;
  const type = event && typeof event === "object" && "type" in event ? String((event as { type?: unknown }).type) : "UNCATEGORIZED";
  const allowed: RevenueCatEventType[] = ["INITIAL_PURCHASE", "RENEWAL", "CANCELLATION", "NON_RENEWING_PURCHASE", "EXPIRATION", "BILLING_ISSUE"];
  return {
    type: allowed.includes(type as RevenueCatEventType) ? type as RevenueCatEventType : "UNCATEGORIZED" as const,
    received: true,
    provider: "revenuecat" as const,
    status: "accepted_for_review" as const,
    approvalRequired: true,
    externalExecution: false,
  };
}

export async function handleRevenueCatWebhook(req: Request, res: Response) {
  const configuredSecret = process.env.REVENUECAT_WEBHOOK_SECRET?.trim();
  const explicitDeploymentMode = process.env.REVENUE_OS_MODE === "staging" || process.env.REVENUE_OS_MODE === "production";
  if (explicitDeploymentMode && !configuredSecret) return res.status(503).json({ ok: false, error: "webhook-secret-not-configured", externalExecution: false });
  if (configuredSecret && req.header("x-revenuecat-webhook-secret") !== configuredSecret) return res.status(401).json({ ok: false, error: "invalid-webhook-secret" });
  const result = classifyRevenueCatEvent(req.body);
  return res.status(202).json({ ok: true, result, note: "Event angenommen; Entitlement- und Außenwirkung bleiben bis Providerkonfiguration und Freigabe blockiert." });
}

export async function handleAccountDeletionRequest(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user || !user.openId) return res.status(401).json({ ok: false, error: "authentication-required" });
    if (req.body?.confirmation !== "DELETE MY ACCOUNT") return res.status(400).json({ ok: false, error: "confirmation-required", requiredConfirmation: "DELETE MY ACCOUNT" });
    return res.status(202).json({ ok: true, status: "deletion_requested", openIdRedacted: `${user.openId.slice(0, 4)}…`, dataDeletion: "pending_manual_verification", externalExecution: false, note: "Die irreversible Löschung wird nicht automatisch ausgelöst; der Antrag ist authentifiziert und muss vor Store-Release an die produktive Löschroutine gebunden werden." });
  } catch {
    return res.status(401).json({ ok: false, error: "authentication-required" });
  }
}
