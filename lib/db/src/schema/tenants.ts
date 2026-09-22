import { pgTable, serial, text, timestamp, varchar, integer, numeric, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-TENANT BILLING & COST-GUARDRAIL SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * tenants        — Ein Tenant = ein B2B-Kunde (Stripe Customer + Subscription)
 * token_logs     — Exakte Echtzeit-Verbrauchsprotokollierung je Agenten-Aufruf
 * blacklists     — DSGVO-Opt-out: E-Mails/Domains, die KEINEN Outreach erhalten
 */

// ─── Plan-Tiers mit Budget-Limits ──────────────────────────────────────────────

export const PLAN_TIERS = ["starter", "pro", "scale"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const TENANT_STATI = ["active", "past_due", "canceled"] as const;
export type TenantStatus = (typeof TENANT_STATI)[number];

/** Standard-Budgets je Plan-Tier (Token/Monat, Leads/Monat) */
export const PLAN_BUDGETS: Record<PlanTier, { tokens: number; leads: number }> = {
  starter: { tokens: 500_000, leads: 100 },
  pro: { tokens: 2_000_000, leads: 1_000 },
  scale: { tokens: 10_000_000, leads: 10_000 },
};

// ─── tenants ────────────────────────────────────────────────────────────────────

export const tenantsTable = pgTable(
  "tenants",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).unique(),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).unique(),
    planTier: varchar("plan_tier", { length: 16 }).notNull().default("starter"), // starter | pro | scale
    monthlyTokenBudget: integer("monthly_token_budget").notNull().default(500_000),
    usedTokensThisMonth: integer("used_tokens_this_month").notNull().default(0),
    monthlyLeadBudget: integer("monthly_lead_budget").notNull().default(100),
    usedLeadsThisMonth: integer("used_leads_this_month").notNull().default(0),
    status: varchar("status", { length: 16 }).notNull().default("active"), // active | past_due | canceled
    /** true = interner System-Tenant (eigene Agenten) — kein Billing, kein Budget-Stopp */
    intern: boolean("intern").notNull().default(false),
    /** Schutz gegen doppelte Upsell-Trigger (max. 1x pro Abrechnungsmonat) */
    lastUpsellTriggerAt: timestamp("last_upsell_trigger_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("tenants_status_idx").on(table.status),
    index("tenants_customer_idx").on(table.stripeCustomerId),
  ]
);

// ─── token_logs ────────────────────────────────────────────────────────────────

export const tokenLogsTable = pgTable(
  "token_logs",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    agentName: varchar("agent_name", { length: 255 }).notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    totalCostUsd: numeric("total_cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    model: varchar("model", { length: 64 }),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("token_logs_tenant_idx").on(table.tenantId),
    index("token_logs_agent_idx").on(table.agentName),
    index("token_logs_ts_idx").on(table.timestamp),
  ]
);

// ─── blacklists (DSGVO-Opt-out) ─────────────────────────────────────────────────

export const blacklistsTable = pgTable(
  "blacklists",
  {
    id: serial("id").primaryKey(),
    /** Wert kann eine konkrete E-Mail oder eine ganze Domain sein */
    typ: varchar("typ", { length: 16 }).notNull().default("email"), // email | domain
    wert: varchar("wert", { length: 320 }).notNull(),
    /** Woher stammt der Eintrag: inbound_reply | manuell | spam_bounce */
    quelle: varchar("quelle", { length: 64 }).notNull().default("inbound_reply"),
    grund: text("grund"),
    /** Bei Opt-out verlangen wir Nachweisbarkeit (DSGVO Art. 21/7 UWG) */
    herkunftsNachrichtId: varchar("herkunfts_nachricht_id", { length: 255 }),
    tenantId: integer("tenant_id").references(() => tenantsTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("blacklists_typ_wert_idx").on(table.typ, table.wert),
    index("blacklists_wert_idx").on(table.wert),
  ]
);

// ─── Insert-Schemas & Typen ─────────────────────────────────────────────────────

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTokenLogSchema = createInsertSchema(tokenLogsTable).omit({ id: true, timestamp: true });
export const insertBlacklistSchema = createInsertSchema(blacklistsTable).omit({ id: true, createdAt: true });

export type Tenant = typeof tenantsTable.$inferSelect;
export type TokenLog = typeof tokenLogsTable.$inferSelect;
export type Blacklist = typeof blacklistsTable.$inferSelect;

export const planTierSchema = z.enum(PLAN_TIERS);
export const tenantStatusSchema = z.enum(TENANT_STATI);
