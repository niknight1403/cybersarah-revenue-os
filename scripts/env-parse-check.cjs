// Diagnose: parst api-server/.env genau wie die App (dotenv/config) und zeigt,
// welche Keys im Prozess-Env landen. Deckt Formatfehler in der verwalteten .env auf.
require("dotenv").config({ quiet: true });

const KEYS = [
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "DEPLOY_TOKEN",
  "ADMIN_GITHUB_TOKEN",
  "OPENAI_API_KEY",
  "TELEGRAM_BOT_TOKEN",
];

for (const k of KEYS) {
  const v = process.env[k];
  console.log(`${k}: ${v ? `geladen laenge=${v.length} ende=${JSON.stringify(v.slice(-8))}` : "FEHLT"}`);
}
