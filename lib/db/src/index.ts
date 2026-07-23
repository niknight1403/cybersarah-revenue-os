import * as schema from "./schema";

let db: any = null;
const DATABASE_URL = process.env["DATABASE_URL"];

if (DATABASE_URL && (DATABASE_URL.startsWith("postgres") || DATABASE_URL.startsWith("postgresql"))) {
  try {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: DATABASE_URL });
    db = drizzle(pool, { schema });
    console.log("🐘 PostgreSQL verbunden");
  } catch (err) {
    console.warn("⚠️ PostgreSQL Fehler:", (err as Error).message?.slice(0, 80));
  }
} else {
  console.warn("⚠️ Keine DATABASE_URL — DB deaktiviert (API-Endpunkte die DB brauchen geben Fehler)");
}

export { db };
export * from "./schema";
