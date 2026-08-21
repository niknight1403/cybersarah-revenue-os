import { boolean, decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Zivilisationen
export const civilizations = mysqlTable("civilizations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  gameId: int("gameId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  leader: varchar("leader", { length: 128 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(), // hex color
  gold: int("gold").default(100).notNull(),
  food: int("food").default(50).notNull(),
  production: int("production").default(30).notNull(),
  science: int("science").default(20).notNull(),
  culture: int("culture").default(20).notNull(),
  happiness: int("happiness").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Civilization = typeof civilizations.$inferSelect;
export type InsertCivilization = typeof civilizations.$inferInsert;

// Spiele
export const games = mysqlTable("games", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  currentRound: int("currentRound").default(1).notNull(),
  maxRounds: int("maxRounds").default(500).notNull(),
  status: mysqlEnum("status", ["active", "paused", "finished"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;

// Einheiten
export const units = mysqlTable("units", {
  id: int("id").autoincrement().primaryKey(),
  civilizationId: int("civilizationId").notNull(),
  gameId: int("gameId").notNull(),
  type: varchar("type", { length: 64 }).notNull(), // Warrior, Scout, etc.
  x: int("x").notNull(),
  y: int("y").notNull(),
  health: int("health").default(100).notNull(),
  maxHealth: int("maxHealth").default(100).notNull(),
  experience: int("experience").default(0).notNull(),
  status: mysqlEnum("status", ["active", "fortified", "healing"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Unit = typeof units.$inferSelect;
export type InsertUnit = typeof units.$inferInsert;

// Städte
export const cities = mysqlTable("cities", {
  id: int("id").autoincrement().primaryKey(),
  civilizationId: int("civilizationId").notNull(),
  gameId: int("gameId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  x: int("x").notNull(),
  y: int("y").notNull(),
  population: int("population").default(1).notNull(),
  maxPopulation: int("maxPopulation").default(10).notNull(),
  productionQueue: json("productionQueue").default([]).notNull(), // [{type: 'building'|'unit', item: 'name', progress: 0-100}]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type City = typeof cities.$inferSelect;
export type InsertCity = typeof cities.$inferInsert;

// Gebäude
export const buildings = mysqlTable("buildings", {
  id: int("id").autoincrement().primaryKey(),
  cityId: int("cityId").notNull(),
  type: varchar("type", { length: 64 }).notNull(), // Granary, Library, etc.
  goldPerTurn: int("goldPerTurn").default(0).notNull(),
  foodPerTurn: int("foodPerTurn").default(0).notNull(),
  productionPerTurn: int("productionPerTurn").default(0).notNull(),
  sciencePerTurn: int("sciencePerTurn").default(0).notNull(),
  culturePerTurn: int("culturePerTurn").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Building = typeof buildings.$inferSelect;
export type InsertBuilding = typeof buildings.$inferInsert;

// Technologien
export const technologies = mysqlTable("technologies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  scienceCost: int("scienceCost").notNull(),
  era: varchar("era", { length: 64 }).notNull(), // Ancient, Classical, Medieval, etc.
  description: text("description"),
  prerequisites: json("prerequisites").default([]).notNull(), // array of tech IDs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Technology = typeof technologies.$inferSelect;
export type InsertTechnology = typeof technologies.$inferInsert;

// Technologie-Fortschritt
export const technologyProgress = mysqlTable("technologyProgress", {
  id: int("id").autoincrement().primaryKey(),
  civilizationId: int("civilizationId").notNull(),
  technologyId: int("technologyId").notNull(),
  progress: int("progress").default(0).notNull(), // 0-100
  status: mysqlEnum("status", ["researching", "completed", "available"]).default("available").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TechnologyProgress = typeof technologyProgress.$inferSelect;
export type InsertTechnologyProgress = typeof technologyProgress.$inferInsert;

// Diplomatie
export const diplomacy = mysqlTable("diplomacy", {
  id: int("id").autoincrement().primaryKey(),
  civ1Id: int("civ1Id").notNull(),
  civ2Id: int("civ2Id").notNull(),
  gameId: int("gameId").notNull(),
  relationship: mysqlEnum("relationship", ["allied", "friendly", "neutral", "hostile", "at_war"]).default("neutral").notNull(),
  tradingAgreement: int("tradingAgreement").default(0).notNull(), // gold per turn
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Diplomacy = typeof diplomacy.$inferSelect;
export type InsertDiplomacy = typeof diplomacy.$inferInsert;

// Spielstände
export const gameStates = mysqlTable("gameStates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  gameId: int("gameId").notNull(),
  civilizationId: int("civilizationId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  currentRound: int("currentRound").default(1).notNull(),
  score: int("score").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GameState = typeof gameStates.$inferSelect;
export type InsertGameState = typeof gameStates.$inferInsert;

// Leaderboard
export const leaderboard = mysqlTable("leaderboard", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  score: int("score").default(0).notNull(),
  wins: int("wins").default(0).notNull(),
  losses: int("losses").default(0).notNull(),
  totalGames: int("totalGames").default(0).notNull(),
  averageRounds: decimal("averageRounds", { precision: 5, scale: 2 }).default("0"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Leaderboard = typeof leaderboard.$inferSelect;
export type InsertLeaderboard = typeof leaderboard.$inferInsert;

// Relationen
export const civilizationsRelations = relations(civilizations, ({ many, one }) => ({
  units: many(units),
  cities: many(cities),
  technologyProgress: many(technologyProgress),
  user: one(users, { fields: [civilizations.userId], references: [users.id] }),
  game: one(games, { fields: [civilizations.gameId], references: [games.id] }),
}));

export const unitsRelations = relations(units, ({ one }) => ({
  civilization: one(civilizations, { fields: [units.civilizationId], references: [civilizations.id] }),
  game: one(games, { fields: [units.gameId], references: [games.id] }),
}));

export const citiesRelations = relations(cities, ({ many, one }) => ({
  buildings: many(buildings),
  civilization: one(civilizations, { fields: [cities.civilizationId], references: [civilizations.id] }),
  game: one(games, { fields: [cities.gameId], references: [games.id] }),
}));

export const buildingsRelations = relations(buildings, ({ one }) => ({
  city: one(cities, { fields: [buildings.cityId], references: [cities.id] }),
}));

export const technologyProgressRelations = relations(technologyProgress, ({ one }) => ({
  civilization: one(civilizations, { fields: [technologyProgress.civilizationId], references: [civilizations.id] }),
  technology: one(technologies, { fields: [technologyProgress.technologyId], references: [technologies.id] }),
}));

export const gameStatesRelations = relations(gameStates, ({ one }) => ({
  user: one(users, { fields: [gameStates.userId], references: [users.id] }),
  game: one(games, { fields: [gameStates.gameId], references: [games.id] }),
  civilization: one(civilizations, { fields: [gameStates.civilizationId], references: [civilizations.id] }),
}));

export const leaderboardRelations = relations(leaderboard, ({ one }) => ({
  user: one(users, { fields: [leaderboard.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  civilizations: many(civilizations),
  gameStates: many(gameStates),
  leaderboard: many(leaderboard),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  civilizations: many(civilizations),
  units: many(units),
  cities: many(cities),
  diplomacy: many(diplomacy),
  gameStates: many(gameStates),
}));

export const technologiesRelations = relations(technologies, ({ many }) => ({
  progress: many(technologyProgress),
}));

export const diplomacyRelations = relations(diplomacy, ({ one }) => ({
  civ1: one(civilizations, { fields: [diplomacy.civ1Id], references: [civilizations.id] }),
  civ2: one(civilizations, { fields: [diplomacy.civ2Id], references: [civilizations.id] }),
  game: one(games, { fields: [diplomacy.gameId], references: [games.id] }),
}));

// CyberSarah Revenue OS – additive Kernmodelle. Bestehende Tabellen bleiben unverändert.
export const revenueWorkspaces = mysqlTable(
  "revenue_workspaces",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    status: mysqlEnum("status", ["setup", "active", "paused"]).default("setup").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("revenue_workspaces_user_idx").on(table.userId)]
);

export const revenueAgents = mysqlTable(
  "revenue_agents",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    agentKey: varchar("agentKey", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    status: mysqlEnum("status", ["waiting", "active", "paused", "error"]).default("waiting").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    lastRunAt: timestamp("lastRunAt"),
    lastError: text("lastError"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("revenue_agents_workspace_key_idx").on(table.workspaceId, table.agentKey),
    index("revenue_agents_status_idx").on(table.status),
  ]
);

export const revenueExternalActions = mysqlTable(
  "revenue_external_actions",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    actionKey: varchar("actionKey", { length: 120 }).notNull().unique(),
    actionType: varchar("actionType", { length: 100 }).notNull(),
    target: varchar("target", { length: 240 }).notNull(),
    payload: json("payload").$type<Record<string, unknown>>().notNull(),
    status: mysqlEnum("status", ["draft", "needs_approval", "approved", "rejected", "executed", "failed"]).default("draft").notNull(),
    requiresApproval: boolean("requiresApproval").default(true).notNull(),
    requestedAt: timestamp("requestedAt"),
    decidedAt: timestamp("decidedAt"),
    decidedByUserId: int("decidedByUserId"),
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("revenue_external_actions_workspace_status_idx").on(table.workspaceId, table.status),
  ]
);

export const revenueSystemAudits = mysqlTable(
  "revenue_system_audits",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    source: mysqlEnum("source", ["runtime", "manual", "integration"]).notNull(),
    score: int("score").notNull(),
    summary: text("summary").notNull(),
    findings: json("findings").$type<Array<{ priority: "low" | "medium" | "high"; title: string; detail: string }>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("revenue_system_audits_workspace_time_idx").on(table.workspaceId, table.createdAt)]
);

// Zahlungsprovider bleiben standardmäßig deaktiviert und werden erst nach Adminfreigabe aktiv.
export const revenueProviderConfigs = mysqlTable(
  "revenue_provider_configs",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    provider: mysqlEnum("provider", ["stripe"]).notNull(),
    status: mysqlEnum("status", ["disabled", "approval_requested", "active", "suspended"]).default("disabled").notNull(),
    requestedAt: timestamp("requestedAt"),
    requestedByUserId: int("requestedByUserId"),
    approvedAt: timestamp("approvedAt"),
    approvedByUserId: int("approvedByUserId"),
    lastWebhookAt: timestamp("lastWebhookAt"),
    lastWebhookEventType: varchar("lastWebhookEventType", { length: 120 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("revenue_provider_configs_workspace_provider_idx").on(table.workspaceId, table.provider)]
);

export const revenueProviderAudits = mysqlTable(
  "revenue_provider_audits",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    provider: mysqlEnum("provider", ["stripe"]).notNull(),
    eventType: mysqlEnum("eventType", ["approval_requested", "activated", "suspended", "webhook_received", "webhook_ignored"]).notNull(),
    actorUserId: int("actorUserId"),
    detail: json("detail").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("revenue_provider_audits_workspace_time_idx").on(table.workspaceId, table.createdAt)]
);

export const revenueEvents = mysqlTable(
  "revenue_events",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    source: mysqlEnum("source", ["stripe", "system"]).notNull(),
    externalEventId: varchar("externalEventId", { length: 180 }).notNull(),
    eventType: varchar("eventType", { length: 140 }).notNull(),
    subjectRef: varchar("subjectRef", { length: 180 }),
    amountCents: int("amountCents").default(0).notNull(),
    currency: varchar("currency", { length: 8 }).default("EUR").notNull(),
    occurredAt: timestamp("occurredAt").notNull(),
    metadata: json("metadata").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("revenue_events_source_external_idx").on(table.source, table.externalEventId),
    index("revenue_events_workspace_time_idx").on(table.workspaceId, table.occurredAt),
    index("revenue_events_workspace_type_idx").on(table.workspaceId, table.eventType),
  ]
);

export const revenueDailyMetrics = mysqlTable(
  "revenue_daily_metrics",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    metricDate: varchar("metricDate", { length: 10 }).notNull(),
    revenueCents: int("revenueCents").default(0).notNull(),
    mrrCents: int("mrrCents").default(0).notNull(),
    checkoutStarted: int("checkoutStarted").default(0).notNull(),
    checkoutCompleted: int("checkoutCompleted").default(0).notNull(),
    paymentFailures: int("paymentFailures").default(0).notNull(),
    cancellations: int("cancellations").default(0).notNull(),
    activeSubscriptions: int("activeSubscriptions").default(0).notNull(),
    marketingSpendCents: int("marketingSpendCents").default(0).notNull(),
    cacCents: int("cacCents").default(0).notNull(),
    estimatedLtvCents: int("estimatedLtvCents").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("revenue_daily_metrics_workspace_date_idx").on(table.workspaceId, table.metricDate)]
);

export const growthExperiments = mysqlTable(
  "growth_experiments",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    experimentType: mysqlEnum("experimentType", ["landing_page", "headline", "cta", "pricing"]).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    status: mysqlEnum("status", ["draft", "needs_approval", "active", "paused", "completed"]).default("draft").notNull(),
    variants: json("variants").$type<Array<{ key: string; label: string; value: string }>>().notNull(),
    maxTrafficPercent: int("maxTrafficPercent").default(0).notNull(),
    requiresApproval: boolean("requiresApproval").default(true).notNull(),
    approvedByUserId: int("approvedByUserId"),
    approvedAt: timestamp("approvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("growth_experiments_workspace_status_idx").on(table.workspaceId, table.status)]
);

export const retentionCases = mysqlTable(
  "retention_cases",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    revenueEventId: int("revenueEventId").notNull(),
    caseType: mysqlEnum("caseType", ["dunning", "retention", "upsell"]).notNull(),
    status: mysqlEnum("status", ["draft", "needs_approval", "approved", "closed"]).default("draft").notNull(),
    subjectRef: varchar("subjectRef", { length: 180 }),
    recommendedAction: text("recommendedAction").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("retention_cases_event_type_idx").on(table.revenueEventId, table.caseType),
    index("retention_cases_workspace_status_idx").on(table.workspaceId, table.status),
  ]
);

export const growthLoopSettings = mysqlTable(
  "growth_loop_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    cadenceCron: varchar("cadenceCron", { length: 64 }).default("0 0 7 * * *").notNull(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    analyticsWriteKey: varchar("analyticsWriteKey", { length: 64 }).unique(),
    lastRunAt: timestamp("lastRunAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("growth_loop_settings_workspace_idx").on(table.workspaceId),
    index("growth_loop_settings_task_uid_idx").on(table.scheduleCronTaskUid),
  ]
);

export const growthAuditEvents = mysqlTable(
  "growth_audit_events",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 190 }).notNull(),
    actor: mysqlEnum("actor", ["user", "system", "cron", "webhook"]).notNull(),
    eventType: varchar("eventType", { length: 140 }).notNull(),
    status: mysqlEnum("status", ["accepted", "skipped", "completed", "failed"]).notNull(),
    detail: json("detail").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("growth_audit_events_idempotency_idx").on(table.idempotencyKey),
    index("growth_audit_events_workspace_time_idx").on(table.workspaceId, table.createdAt),
  ]
);

export type RevenueWorkspace = typeof revenueWorkspaces.$inferSelect;
export type RevenueAgent = typeof revenueAgents.$inferSelect;
export type RevenueExternalAction = typeof revenueExternalActions.$inferSelect;
export type RevenueSystemAudit = typeof revenueSystemAudits.$inferSelect;
export type RevenueProviderConfig = typeof revenueProviderConfigs.$inferSelect;
export type RevenueProviderAudit = typeof revenueProviderAudits.$inferSelect;
export type RevenueEvent = typeof revenueEvents.$inferSelect;
export type RevenueDailyMetric = typeof revenueDailyMetrics.$inferSelect;
export type GrowthExperiment = typeof growthExperiments.$inferSelect;
export type RetentionCase = typeof retentionCases.$inferSelect;
export type GrowthLoopSetting = typeof growthLoopSettings.$inferSelect;
export type GrowthAuditEvent = typeof growthAuditEvents.$inferSelect;
