import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, civilizations, games, units, cities, buildings, technologies, technologyProgress, diplomacy, gameStates, leaderboard } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Civilization queries
export async function getCivilizationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(civilizations).where(eq(civilizations.userId, userId));
}

export async function getCivilizationById(civId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(civilizations).where(eq(civilizations.id, civId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCivilization(data: {
  userId: number;
  gameId: number;
  name: string;
  leader: string;
  color: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(civilizations).values(data);
  return result;
}

export async function updateCivilizationResources(civId: number, resources: {
  gold?: number;
  food?: number;
  production?: number;
  science?: number;
  culture?: number;
  happiness?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: Record<string, unknown> = {};
  if (resources.gold !== undefined) updates.gold = resources.gold;
  if (resources.food !== undefined) updates.food = resources.food;
  if (resources.production !== undefined) updates.production = resources.production;
  if (resources.science !== undefined) updates.science = resources.science;
  if (resources.culture !== undefined) updates.culture = resources.culture;
  if (resources.happiness !== undefined) updates.happiness = resources.happiness;

  return await db.update(civilizations).set(updates).where(eq(civilizations.id, civId));
}

// Game queries
export async function createGame(data: {
  name: string;
  maxRounds?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(games).values({
    name: data.name,
    maxRounds: data.maxRounds || 500,
  });
}

export async function getGameById(gameId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Unit queries
export async function createUnit(data: {
  civilizationId: number;
  gameId: number;
  type: string;
  x: number;
  y: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(units).values(data);
}

export async function getUnitsByCivilization(civId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(units).where(eq(units.civilizationId, civId));
}

export async function updateUnitHealth(unitId: number, health: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(units).set({ health }).where(eq(units.id, unitId));
}

// City queries
export async function createCity(data: {
  civilizationId: number;
  gameId: number;
  name: string;
  x: number;
  y: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(cities).values(data);
}

export async function getCitiesByCivilization(civId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(cities).where(eq(cities.civilizationId, civId));
}

export async function updateCityPopulation(cityId: number, population: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(cities).set({ population }).where(eq(cities.id, cityId));
}

// Building queries
export async function createBuilding(data: {
  cityId: number;
  type: string;
  goldPerTurn?: number;
  foodPerTurn?: number;
  productionPerTurn?: number;
  sciencePerTurn?: number;
  culturePerTurn?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(buildings).values(data);
}

export async function getBuildingsByCity(cityId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(buildings).where(eq(buildings.cityId, cityId));
}

// Technology queries
export async function getAllTechnologies() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(technologies);
}

export async function getTechnologyById(techId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(technologies).where(eq(technologies.id, techId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTechnologyProgress(civId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(technologyProgress).where(eq(technologyProgress.civilizationId, civId));
}

export async function updateTechnologyProgress(civId: number, techId: number, progress: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(technologyProgress)
    .where(and(eq(technologyProgress.civilizationId, civId), eq(technologyProgress.technologyId, techId)))
    .limit(1);

  if (existing.length > 0) {
    return await db
      .update(technologyProgress)
      .set({ progress })
      .where(and(eq(technologyProgress.civilizationId, civId), eq(technologyProgress.technologyId, techId)));
  } else {
    return await db.insert(technologyProgress).values({
      civilizationId: civId,
      technologyId: techId,
      progress,
      status: "researching",
    });
  }
}

// Diplomacy queries
export async function getDiplomacyRelations(civId: number, gameId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(diplomacy)
    .where(
      and(
        eq(diplomacy.gameId, gameId),
      )
    );
}

// Leaderboard queries
export async function getLeaderboard(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(leaderboard).limit(limit);
}

export async function updateLeaderboardEntry(userId: number, data: {
  score?: number;
  wins?: number;
  losses?: number;
  totalGames?: number;
  averageRounds?: string | number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(leaderboard).where(eq(leaderboard.userId, userId)).limit(1);

  const updateData: any = { ...data };
  if (typeof updateData.averageRounds === 'number') {
    updateData.averageRounds = updateData.averageRounds.toString();
  }

  if (existing.length > 0) {
    return await db.update(leaderboard).set(updateData).where(eq(leaderboard.userId, userId));
  } else {
    return await db.insert(leaderboard).values({
      userId,
      ...updateData,
    });
  }
}
