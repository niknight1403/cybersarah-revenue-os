import { randomUUID } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { db, jobLocksTable } from "@workspace/db";

const localLocks = new Set<string>();
const LOCK_TTL_MS = 5 * 60_000;

type ReleaseLock = () => Promise<void>;

export async function acquireJobLock(lockKey: string): Promise<ReleaseLock | null> {
  if (!db) {
    if (localLocks.has(lockKey)) return null;
    localLocks.add(lockKey);
    return async () => { localLocks.delete(lockKey); };
  }

  const ownerToken = randomUUID();
  const expiresAt = new Date(Date.now() + LOCK_TTL_MS);
  await db.delete(jobLocksTable).where(lt(jobLocksTable.expiresAt, new Date()));
  try {
    await db.insert(jobLocksTable).values({ lockKey, ownerToken, expiresAt });
  } catch {
    return null;
  }
  return async () => {
    await db.delete(jobLocksTable).where(and(eq(jobLocksTable.lockKey, lockKey), eq(jobLocksTable.ownerToken, ownerToken)));
  };
}

export async function withJobLock<T>(lockKey: string, work: () => Promise<T>): Promise<T | undefined> {
  const release = await acquireJobLock(lockKey);
  if (!release) return undefined;
  try {
    return await work();
  } finally {
    await release();
  }
}

export const jobLockConfig = { ttlMs: LOCK_TTL_MS } as const;
