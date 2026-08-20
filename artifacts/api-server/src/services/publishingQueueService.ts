import { and, asc, eq, lte, or, isNull } from "drizzle-orm";
import { db, publishingQueueTable, type NewPublishingQueueEntry, type PublishingQueueEntry } from "@workspace/db";
import { maxAttemptsReached, preflightPublishing, publishWithProvider, retryDelayMs, type PublishingProvider } from "./socialPublishingService";

function requireDb() {
  if (!db) throw new Error("Datenbank ist nicht konfiguriert");
  return db;
}

export async function enqueuePublishingJob(input: {
  idempotencyKey: string;
  provider: PublishingProvider;
  contentId?: number;
  personaId?: string;
  campaignId?: number;
  offerId?: string;
  approvalId?: string;
  governanceApproved: boolean;
  caption: string;
  title?: string;
  mediaUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
}): Promise<PublishingQueueEntry> {
  const database = requireDb();
  const preflight = preflightPublishing(input);
  const row: NewPublishingQueueEntry = {
    ...input,
    status: preflight.allowed ? "queued" : "blocked",
    lastError: preflight.allowed ? null : preflight.reason,
  };
  const existing = await database.select().from(publishingQueueTable).where(eq(publishingQueueTable.idempotencyKey, input.idempotencyKey)).limit(1);
  if (existing[0]) return existing[0];
  const inserted = await database.insert(publishingQueueTable).values(row).returning();
  if (!inserted[0]) throw new Error("Publishing-Job konnte nicht angelegt werden");
  return inserted[0];
}

export async function listPublishingJobs(limit = 50): Promise<PublishingQueueEntry[]> {
  const database = requireDb();
  return database.select().from(publishingQueueTable).orderBy(asc(publishingQueueTable.createdAt)).limit(Math.min(Math.max(limit, 1), 200));
}

export async function processPublishingQueue(limit = 10): Promise<{ processed: number; published: number; failed: number; blocked: number }> {
  const database = requireDb();
  const now = new Date();
  const jobs = await database.select().from(publishingQueueTable)
    .where(and(
      or(eq(publishingQueueTable.status, "queued"), eq(publishingQueueTable.status, "retrying")),
      or(isNull(publishingQueueTable.nextAttemptAt), lte(publishingQueueTable.nextAttemptAt, now)),
    ))
    .orderBy(asc(publishingQueueTable.createdAt)).limit(Math.min(Math.max(limit, 1), 50));

  let published = 0;
  let failed = 0;
  let blocked = 0;
  for (const job of jobs) {
    const preflight = preflightPublishing(job);
    if (!preflight.allowed) {
      await database.update(publishingQueueTable).set({ status: "blocked", lastError: preflight.reason }).where(eq(publishingQueueTable.id, job.id));
      blocked++;
      continue;
    }
    const attemptCount = job.attemptCount + 1;
    await database.update(publishingQueueTable).set({ status: "processing", attemptCount, lastError: null }).where(eq(publishingQueueTable.id, job.id));
    const result = await publishWithProvider({ ...job, attemptCount });
    if (result.success) {
      await database.update(publishingQueueTable).set({ status: "published", providerPostId: result.postId ?? null, providerUrl: result.url ?? null, nextAttemptAt: null }).where(eq(publishingQueueTable.id, job.id));
      published++;
    } else if (maxAttemptsReached(attemptCount)) {
      await database.update(publishingQueueTable).set({ status: "failed", lastError: result.error?.slice(0, 500) ?? "Providerfehler", nextAttemptAt: null }).where(eq(publishingQueueTable.id, job.id));
      failed++;
    } else {
      await database.update(publishingQueueTable).set({ status: "retrying", lastError: result.error?.slice(0, 500) ?? "Providerfehler", nextAttemptAt: new Date(Date.now() + retryDelayMs(attemptCount)) }).where(eq(publishingQueueTable.id, job.id));
      failed++;
    }
  }
  return { processed: jobs.length, published, failed, blocked };
}
