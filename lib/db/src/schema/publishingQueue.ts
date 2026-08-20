import { pgTable, serial, varchar, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const publishingQueueTable = pgTable("publishing_queue", {
  id: serial("id").primaryKey(),
  idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull().unique(),
  provider: varchar("provider", { length: 32 }).notNull(),
  contentId: integer("content_id"),
  personaId: varchar("persona_id", { length: 128 }),
  campaignId: integer("campaign_id"),
  offerId: varchar("offer_id", { length: 128 }),
  approvalId: varchar("approval_id", { length: 180 }),
  governanceApproved: boolean("governance_approved").notNull().default(false),
  caption: text("caption").notNull(),
  title: varchar("title", { length: 220 }),
  mediaUrl: text("media_url"),
  status: varchar("status", { length: 24 }).notNull().default("queued"),
  attemptCount: integer("attempt_count").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  providerPostId: varchar("provider_post_id", { length: 220 }),
  providerUrl: text("provider_url"),
  lastError: text("last_error"),
  utmSource: varchar("utm_source", { length: 120 }),
  utmMedium: varchar("utm_medium", { length: 120 }),
  utmCampaign: varchar("utm_campaign", { length: 180 }),
  utmContent: varchar("utm_content", { length: 180 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PublishingQueueEntry = typeof publishingQueueTable.$inferSelect;
export type NewPublishingQueueEntry = typeof publishingQueueTable.$inferInsert;
