import { Router, type IRouter, type Request, type Response } from "express";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const DEPLOY_TOKEN = process.env["DEPLOY_TOKEN"];
const PROJECT_DIR = path.resolve(import.meta.dirname ?? ".", "../../../..");

// Simple auth check
function checkToken(req: Request, res: Response): boolean {
  const token = req.headers["x-deploy-token"] || req.query["token"];
  if (token !== DEPLOY_TOKEN) {
    res.status(401).json({ success: false, message: "Invalid token" });
    return false;
  }
  return true;
}

// POST /api/admin/deploy — Pull latest code and restart server
router.post("/deploy", async (req: Request, res: Response) => {
  if (!checkToken(req, res)) return;

  try {
    logger.info("🚀 Deploy triggered via API");

    // Run git pull
    const pullResult = execSync("git fetch origin && git reset --hard origin/main", {
      cwd: PROJECT_DIR,
      timeout: 60000,
      encoding: "utf-8",
    });

    logger.info("📥 Git pull done");

    // Install dependencies
    const installResult = execSync("pnpm install --frozen-lockfile 2>/dev/null || pnpm install", {
      cwd: PROJECT_DIR,
      timeout: 120000,
      encoding: "utf-8",
    });

    logger.info("📦 Dependencies installed");

    // Copy .env
    try {
      execSync("cp .env artifacts/api-server/.env 2>/dev/null || true", {
        cwd: PROJECT_DIR,
        timeout: 5000,
      });
    } catch {}

    res.json({
      success: true,
      message: "Code updated. Restarting server...",
      pullOutput: pullResult.slice(-500),
    });

    // Restart PM2 process in background
    setTimeout(() => {
      try {
        execSync("pm2 restart cybersarah --update-env", {
          cwd: path.join(PROJECT_DIR, "artifacts/api-server"),
          timeout: 30000,
          stdio: "pipe",
        });
        logger.info("✅ Server restarted after deploy");
      } catch (e) {
        logger.error({ err: e }, "Server restart failed after deploy");
      }
    }, 1000);

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "Deploy failed");
    res.status(500).json({ success: false, message: msg });
  }
});

// ─── .env-Sync vom GitHub-Workflow ─────────────────────────────────────────────
// Nur diese Schluessel duerfen per API gesetzt werden (Allowlist).
const ENV_KEYS = [
  "PORT",
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PAYMENT_LINK",
  "OPENAI_API_KEY",
  "OPENAI_BACKUP_KEY",
  "GEMINI_API_KEY",
  "GEMINI_BACKUP_KEY",
  "GEMINI_MODEL",
  "DIGISTORE24_API_KEY",
  "DIGISTORE24_USERNAME",
  "DIGISTORE24_IPN_SECRET",
  "DIGISTORE24_VENDOR_ID",
  "DIGISTORE24_AFFILIATE_ID",
  "BEEHIIV_API_KEY",
  "MAILCHIMP_API_KEY",
  "TIKTOK_CLIENT_KEY",
  "TIKTOK_CLIENT_SECRET",
  "TIKTOK_ACCESS_TOKEN",
  "WHATSAPP_WEBHOOK_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "VITE_API_URL",
  "VITE_API_AUTH_TOKEN",
  "API_AUTH_TOKEN",
  "RESEND_API_KEY",
  "ADMIN_EMAIL",
  "SERVER_IP",
  "LIVE_MODE",
  "SIMULATION_MODE",
  "NODE_ENV",
  "DEPLOY_TOKEN",
  "ALLOWED_ORIGINS",
  "PORT",
] as const;

function liesEnvDatei(pfad: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(pfad)) return map;
  for (const zeile of fs.readFileSync(pfad, "utf-8").split("\n")) {
    const trimmed = zeile.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    map.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim());
  }
  return map;
}

function schreibeEnvDatei(pfad: string, werte: Map<string, string>) {
  const zeilen: string[] = [
    "# .env — von /api/admin/env verwaltet (DEPLOY_TOKEN-geschuetzt)",
    "",
  ];
  for (const [key, value] of werte) zeilen.push(`${key}=${value}`);
  fs.writeFileSync(pfad, zeilen.join("\n") + "\n", { encoding: "utf-8" });
}

// POST /api/admin/env — .env auf dem Server setzen/aktualisieren (Merge).
// Body: { "env": { "KEY": "wert", ... }, "restart": true }
router.post("/env", (req: Request, res: Response) => {
  if (!checkToken(req, res)) return;

  const body = req.body as { env?: Record<string, unknown>; restart?: boolean };
  const eingabe = body?.env;
  if (!eingabe || typeof eingabe !== "object" || Array.isArray(eingabe)) {
    res.status(400).json({ success: false, message: "Body benoetigt: { env: { KEY: wert } }" });
    return;
  }

  const erlaubt: Record<string, string> = {};
  const abgelehnt: string[] = [];
  for (const [rawKey, rawValue] of Object.entries(eingabe)) {
    const key = rawKey.trim().toUpperCase();
    if (!(ENV_KEYS as readonly string[]).includes(key)) {
      abgelehnt.push(key);
      continue;
    }
    if (rawValue === undefined || rawValue === null) continue;
    const value = String(rawValue);
    if (value.includes("\n") || value.includes("\r")) {
      res.status(400).json({ success: false, message: `Ungueltiger Wert fuer ${key}` });
      return;
    }
    erlaubt[key] = value;
  }

  try {
    const envPfad = path.join(PROJECT_DIR, ".env");
    const aktuell = liesEnvDatei(envPfad);
    for (const [key, value] of Object.entries(erlaubt)) aktuell.set(key, value);
    schreibeEnvDatei(envPfad, aktuell);

    // Sofort auch in den api-server uebernehmen (gleiche Logik wie deploy).
    try {
      execSync(`cp .env artifacts/api-server/.env`, { cwd: PROJECT_DIR, timeout: 5000 });
    } catch {}

    logger.info({ keys: Object.keys(erlaubt) }, ".env per API aktualisiert");

    res.json({
      success: true,
      aktualisiert: Object.keys(erlaubt),
      abgelehnt,
      restart: body?.restart !== false,
    });

    if (body?.restart !== false) {
      setTimeout(() => {
        try {
          execSync("pm2 restart cybersarah --update-env", {
            cwd: path.join(PROJECT_DIR, "artifacts/api-server"),
            timeout: 30000,
            stdio: "pipe",
          });
          logger.info("Server nach .env-Sync neu gestartet");
        } catch (e) {
          logger.error({ err: e }, "Restart nach .env-Sync fehlgeschlagen");
        }
      }, 1000);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, ".env-Sync fehlgeschlagen");
    res.status(500).json({ success: false, message: msg });
  }
});

// GET /api/admin/env — Zeigt welche Schluessel gesetzt sind (Werte maskiert).
router.get("/env", (req: Request, res: Response) => {
  if (!checkToken(req, res)) return;

  const envPfad = path.join(PROJECT_DIR, ".env");
  const aktuell = liesEnvDatei(envPfad);
  const zustand: Record<string, string> = {};
  for (const key of ENV_KEYS) {
    const value = aktuell.get(key);
    if (value === undefined) {
      zustand[key] = "<nicht gesetzt>";
    } else if (value.length <= 6) {
      zustand[key] = "***";
    } else {
      zustand[key] = `${value.slice(0, 3)}***${value.slice(-3)} (len=${value.length})`;
    }
  }
  res.json({ success: true, env: zustand });
});

// GET /api/admin/status — Detailed system status
router.get("/status", async (_req: Request, res: Response) => {
  try {
    const gitLog = execSync("git log --oneline -3", { cwd: PROJECT_DIR, timeout: 5000, encoding: "utf-8" });
    const gitBranch = execSync("git branch --show-current", { cwd: PROJECT_DIR, timeout: 5000, encoding: "utf-8" }).trim();
    const diskUsage = execSync("df -h / | tail -1", { timeout: 5000, encoding: "utf-8" }).trim();
    const memUsage = execSync("free -h | grep Mem", { timeout: 5000, encoding: "utf-8" }).trim();
    const uptime = execSync("uptime -p", { timeout: 5000, encoding: "utf-8" }).trim();
    const pm2Status = execSync("pm2 status cybersarah --no-color 2>/dev/null || echo 'PM2 not checked'", { timeout: 5000, encoding: "utf-8" }).trim();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      server: { uptime, disk: diskUsage, memory: memUsage },
      git: { branch: gitBranch, lastCommits: gitLog.trim().split("\n") },
      pm2: pm2Status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, message: msg });
  }
});

// POST /api/admin/watchdog-trigger — Force watchdog cycle
router.post("/watchdog-trigger", async (_req: Request, res: Response) => {
  try {
    const { triggereWatchdog } = await import("../agents/watchdog");
    const result = await triggereWatchdog();
    res.json({ success: true, message: "Watchdog triggered", result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, message: msg });
  }
});

// GET /api/admin/logs — Recent agent logs
router.get("/logs", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 50, 200);
    const { db } = await import("@workspace/db");
    const { agentLogsTable } = await import("@workspace/db");
    const { desc } = await import("drizzle-orm");

    const logs = await db
      .select()
      .from(agentLogsTable)
      .orderBy(desc(agentLogsTable.createdAt))
      .limit(limit);

    res.json({ success: true, logs, total: logs.length });
  } catch (err) {
    res.status(500).json({ success: false, message: "Logs not available" });
  }
});

export default router;
