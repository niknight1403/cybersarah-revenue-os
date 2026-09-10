import { pgTable, serial, varchar, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";

export const stripeEventClaimsTable = pgTable("stripe_event_claims", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id", { length: 255 }).notNull(),
  eventType: varchar("event_type", { length: 128 }).notNull(),
  processed: boolean("processed").notNull().default(false),
  error: varchar("error", { length: 500 }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, (table) => ({ eventIdIdx: uniqueIndex("stripe_event_claims_event_id_idx").on(table.eventId) }));
