/**
 * API Server Build Script (esbuild)
 * Baut TypeScript → ES Module (.mjs)
 */
import { build } from "esbuild";

const result = await build({
  entryPoints: ["artifacts/api-server/src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "artifacts/api-server/dist/index.mjs",
  external: [
    "@google-cloud/storage",
    "pg",
    "node-cron",
    "openai",
    "stripe",
    "pino",
    "pino-http",
    "cookie-parser",
    "cors",
    "express",
    "google-auth-library",
    "drizzle-orm",
    "zod",
    "@workspace/*",
    "resend",
    "form-data",
    "mailgun.js",
    "nodemailer",
  ],
  sourcemap: true,
  minify: false,
  metafile: true,
  logLevel: "info",
});

console.log("✅ Build abgeschlossen:", Object.keys(result.metafile.outputs));
