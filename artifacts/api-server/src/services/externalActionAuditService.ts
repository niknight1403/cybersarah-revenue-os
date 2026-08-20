import { createHash } from "node:crypto";
import { desc } from "drizzle-orm";
import { db, externalActionAuditTable } from "@workspace/db";

export type DataClassification = "public" | "internal" | "sensitive" | "restricted";

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function recordExternalAction(input: {
  actionType: string;
  provider: string;
  approvalId: string;
  idempotencyKey: string;
  dataClassification: DataClassification;
  requestSummary: Record<string, string | number | boolean | null>;
  resultStatus: "approved" | "blocked" | "published" | "failed";
  providerObjectId?: string;
  createdBy?: string;
}): Promise<void> {
  if (!db) throw new Error("Audit-Log benötigt eine konfigurierte Datenbank");
  const [last] = await db.select({ entryHash: externalActionAuditTable.entryHash })
    .from(externalActionAuditTable)
    .orderBy(desc(externalActionAuditTable.id))
    .limit(1);
  const requestFingerprint = digest(JSON.stringify(input.requestSummary));
  const previousHash = last?.entryHash ?? null;
  const entryHash = digest(JSON.stringify({ ...input, requestFingerprint, previousHash }));
  await db.insert(externalActionAuditTable).values({
    actionType: input.actionType,
    provider: input.provider,
    approvalId: input.approvalId,
    idempotencyKey: input.idempotencyKey,
    dataClassification: input.dataClassification,
    requestFingerprint,
    previousHash,
    entryHash,
    resultStatus: input.resultStatus,
    providerObjectId: input.providerObjectId ?? null,
    createdBy: input.createdBy ?? null,
  });
}
