import { pgTable, serial, varchar, text, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const haraSignalsTable = pgTable("hara_signals", {
  id: serial("id").primaryKey(),
  signalKey: varchar("signal_key", { length: 255 }).notNull(),
  signalType: varchar("signal_type", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("observed"),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 3 }),
  attributionStatus: varchar("attribution_status", { length: 24 }).notNull().default("unattributed"),
  personaId: varchar("persona_id", { length: 128 }),
  campaignId: varchar("campaign_id", { length: 128 }),
  offerId: varchar("offer_id", { length: 128 }),
  utmCampaign: varchar("utm_campaign", { length: 180 }),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ signalKeyIdx: uniqueIndex("hara_signals_signal_key_idx").on(table.signalKey) }));
