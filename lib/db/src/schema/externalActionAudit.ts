import { pgTable, serial, varchar, text, timestamp, integer } from "drizzle-orm/pg-core";

export const externalActionAuditTable = pgTable("external_action_audit", {
  id: serial("id").primaryKey(),
  actionType: varchar("action_type", { length: 80 }).notNull(),
  provider: varchar("provider", { length: 40 }).notNull(),
  approvalId: varchar("approval_id", { length: 180 }).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull().unique(),
  dataClassification: varchar("data_classification", { length: 24 }).notNull().default("internal"),
  requestFingerprint: varchar("request_fingerprint", { length: 128 }).notNull(),
  previousHash: varchar("previous_hash", { length: 128 }),
  entryHash: varchar("entry_hash", { length: 128 }).notNull().unique(),
  resultStatus: varchar("result_status", { length: 24 }).notNull(),
  providerObjectId: varchar("provider_object_id", { length: 220 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: varchar("created_by", { length: 120 }),
});
