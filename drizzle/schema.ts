import { decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
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
