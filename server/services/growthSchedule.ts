import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import * as db from "../db";

export async function handleGrowthAnalysisSchedule(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const setting = await db.getGrowthLoopSettingsByTaskUid(user.taskUid);
    if (!setting || !setting.enabled) return res.json({ ok: true, skipped: "inactive-or-orphan" });

    const result = await db.runGrowthAnalysis(setting.workspaceId, "cron");
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
    return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
  }
}
