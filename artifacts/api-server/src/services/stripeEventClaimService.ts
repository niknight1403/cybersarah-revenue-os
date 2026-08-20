import { and, eq } from "drizzle-orm";
import { db, stripeEventClaimsTable } from "@workspace/db";

const localClaims = new Set<string>();

export async function claimStripeEvent(eventId: string, eventType: string): Promise<boolean> {
  if (!db) {
    if (localClaims.has(eventId)) return false;
    localClaims.add(eventId);
    return true;
  }
  const inserted = await db.insert(stripeEventClaimsTable).values({ eventId, eventType }).onConflictDoNothing().returning({ id: stripeEventClaimsTable.id });
  return inserted.length > 0;
}

export async function markStripeEventProcessed(eventId: string): Promise<void> {
  if (!db) return;
  await db.update(stripeEventClaimsTable).set({ processed: true, processedAt: new Date(), error: null }).where(eq(stripeEventClaimsTable.eventId, eventId));
}

export async function markStripeEventFailed(eventId: string, error: string): Promise<void> {
  if (!db) return;
  await db.update(stripeEventClaimsTable).set({ processed: false, error: error.slice(0, 500) }).where(eq(stripeEventClaimsTable.eventId, eventId));
}
