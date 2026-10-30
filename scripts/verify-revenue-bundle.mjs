/**
 * Catches the production outage where esbuild externally required @workspace/db,
 * whose package exports raw .ts sources that Node 20 cannot execute.
 */
import { readFileSync } from "node:fs";
const script = readFileSync("artifacts/api-server/build.mjs","utf8");
const compiled = readFileSync("artifacts/api-server/dist/index.mjs","utf8");
if (/^\s*["']@workspace\/\*["']\s*,/m.test(script)) {
  throw new Error("Workspace packages still external: Render will attempt raw TS imports.");
}
if (/\b(?:from|import)\s*\(?\s*["']@workspace\//.test(compiled)) {
  throw new Error("Production bundle contains unresolved internal workspace package imports.");
}
if (!compiled.includes("PostgreSQL") && !compiled.includes("DATABASE_URL")) {
  throw new Error("DB integration missing from final API artifact.");
}
console.log("Verified self-contained workspace sources in production server bundle.");
