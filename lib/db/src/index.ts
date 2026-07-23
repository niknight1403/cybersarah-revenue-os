import * as schema from "./schema";

let db: any = null;
const DATABASE_URL = process.env["DATABASE_URL"];

if (DATABASE_URL && (DATABASE_URL.startsWith("postgres") || DATABASE_URL.startsWith("postgresql"))) {
  try {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: DATABASE_URL, max: 10, idleTimeoutMillis: 30000 });
    db = drizzle(pool, { schema });
    console.log("🐘 PostgreSQL verbunden");
  } catch (err) {
    console.warn("⚠️ PostgreSQL Fehler:", (err as Error).message?.slice(0, 80));
  }
} else {
  console.warn("⚠️ Keine DATABASE_URL — DB deaktiviert. Für volle Funktionalität: DATABASE_URL in .env setzen.");
  console.warn("  → Kostenloser PostgreSQL: https://neon.tech (Free Tier) oder https://supabase.com");
}

export { db };
export * from "./schema";
