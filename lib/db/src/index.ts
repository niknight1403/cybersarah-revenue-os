import * as schema from "./schema";

let db: any = null;
const DATABASE_URL = process.env["DATABASE_URL"];

if (DATABASE_URL && (DATABASE_URL.startsWith("postgres") || DATABASE_URL.startsWith("postgresql"))) {
  try {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const needsSSL = DATABASE_URL.includes("sslmode=require") || DATABASE_URL.includes("ssl=true");
    const pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      ssl: needsSSL ? { rejectUnauthorized: false } : false,
    });
    db = drizzle(pool, { schema });
    console.log("🐘 PostgreSQL verbunden" + (needsSSL ? " (SSL)" : ""));
  } catch (err) {
    console.warn("⚠️ PostgreSQL Fehler:", (err as Error).message?.slice(0, 80));
  }
} else {
  console.warn("⚠️ Keine DATABASE_URL — DB deaktiviert. Für volle Funktionalität: DATABASE_URL in .env setzen.");
}

export { db };
export * from "./schema";
