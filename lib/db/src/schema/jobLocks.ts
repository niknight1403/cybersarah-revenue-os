import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const jobLocksTable = pgTable("job_execution_locks", {
  id: serial("id").primaryKey(),
  lockKey: varchar("lock_key", { length: 180 }).notNull().unique(),
  ownerToken: varchar("owner_token", { length: 120 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
