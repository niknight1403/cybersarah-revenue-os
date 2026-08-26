import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import * as db from "../db";

export async function handleGrowthAnalysisSchedule(req: Request, res: Response) {
  let workspaceId: number | undefined;
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    taskUid = user.taskUid;
    const setting = await db.getGrowthLoopSettingsByTaskUid(user.taskUid);
    if (!setting || !setting.enabled) return res.json({ ok: true, skipped: "inactive-or-orphan" });
    workspaceId = setting.workspaceId;

    const result = await db.runHaraOrchestrator(setting.workspaceId, "cron");
    await db.recordGrowthAudit({
      workspaceId: setting.workspaceId,
      idempotencyKey: `growth-cron:${user.taskUid}:${new Date().toISOString().slice(0, 10)}`,
      actor: "cron",
      eventType: "growth.analysis.completed",
      status: "completed",
      detail: result,
    });
    return res.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Growth-Analyse fehlgeschlagen.";
    console.error("[Growth] Geplanter Analyselauf fehlgeschlagen", error);
    if (workspaceId && taskUid) {
      try {
        await db.recordGrowthAudit({ workspaceId, idempotencyKey: `growth-cron-failed:${taskUid}:${new Date().toISOString().slice(0, 10)}`, actor: "cron", eventType: "growth.analysis.retry_hint", status: "failed", detail: { retryable: true, externalExecution: false, approvalRequired: true, error: message } });
      } catch (auditError) {
        console.error("[Growth] Fehler-Fallback konnte nicht auditiert werden", auditError);
      }
    }
    return res.status(500).json({ error: message, retryable: true, timestamp: new Date().toISOString() });
  }
}
