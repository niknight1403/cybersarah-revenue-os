import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { configureHttpSecurity } from "./httpSecurity";
import { runtimeHealth } from "../services/runtimeResilience";
import { handleStripeWebhook } from "../services/stripeWebhook";
import { handleGrowthAnalysisSchedule } from "../services/growthSchedule";
import { handleFunnelTracking } from "../services/funnelTracking";
import { handleExperimentOutcome } from "../services/experimentTracking";
import { handleAccountDeletionRequest, handleRevenueCatWebhook } from "../services/playStoreContracts";
import * as db from "../db";
import { requireMcpBearer, registerMcpHealthProbe } from "../mcp/auth";
import { handleMcpRequest } from "../mcp/server";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => server.close(() => resolve(true)));
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const httpSecurity = configureHttpSecurity(app);
  const server = createServer(app);
  let shutdownStarted = false;

  const shutdown = (signal: string) => {
    if (shutdownStarted) return;
    shutdownStarted = true;
    runtimeHealth.markDraining();
    console.info(`[Runtime] ${signal} empfangen; kontrollierter Shutdown wird gestartet.`);
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();
    server.close(error => {
      clearTimeout(forceExit);
      process.exit(error ? 1 : 0);
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  app.get("/healthz", (_req, res) => {
    const health = runtimeHealth.snapshot();
    return res.status(health.ok ? 200 : 503).json(health);
  });
  app.get("/readyz", (_req, res) => {
    const health = runtimeHealth.snapshot();
    return res.status(health.ok ? 200 : 503).json(health);
  });
  app.get("/health", (_req, res) => {
    const health = runtimeHealth.snapshot();
    return res.status(health.ok ? 200 : 503).json({ ok: health.ok, status: health.status });
  });

  app.post("/api/stripe/webhook", express.raw({ type: "application/json", limit: "1mb" }), handleStripeWebhook);
  app.post("/api/v1/webhooks/revenuecat", express.json({ limit: "256kb" }), handleRevenueCatWebhook);
  app.post("/api/v1/user/delete-account", express.json({ limit: "32kb" }), handleAccountDeletionRequest);
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));
  app.get("/api/v1/analytics/loop-snapshots", async (req, res, next) => {
    try {
      const context = await createContext({ req, res, info: { accept: null, type: "unknown", isBatchCall: false, calls: [], connectionParams: null, signal: new AbortController().signal, url: new URL(`${req.protocol}://${req.get("host")}${req.originalUrl}`) } });
      if (!context.user) return res.status(401).json({ ok: false, error: "authentication-required" });
      const limit = Math.min(Math.max(Number(req.query.limit ?? 30) || 30, 1), 180);
      return res.json({ ok: true, snapshots: await db.getLoopSnapshots(context.user.id, limit) });
    } catch (error) {
      return next(error);
    }
  });
  app.post("/api/events/funnel", handleFunnelTracking);
  app.post("/api/events/experiment", handleExperimentOutcome);
  app.post("/api/scheduled/growth-analysis", handleGrowthAnalysisSchedule);
  registerMcpHealthProbe(app);
  app.all("/api/mcp", requireMcpBearer, handleMcpRequest);
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(error);
    console.error("[HTTP] Unbehandelter Request-Fehler", error);
    return res.status(500).json({ ok: false, error: "Interner Serverfehler" });
  });

  const preferredPort = Number.parseInt(process.env.PORT || "3000", 10);
  const isProduction = process.env.NODE_ENV === "production";
  const port = isProduction ? preferredPort : await findAvailablePort(preferredPort);
  const host = process.env.HOST || "0.0.0.0";

  if (!isProduction && port !== preferredPort) {
    console.info(`[Runtime] Bevorzugter Port ${preferredPort} belegt; nutze Port ${port}.`);
  }
  console.info(`[Security] HTTP-Schutz aktiv: RateLimit=${httpSecurity.rateLimitMax}/${httpSecurity.rateLimitWindowMs}ms.`);
  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
  });
}

startServer().catch(error => {
  console.error("[Runtime] Serverstart fehlgeschlagen", error);
  process.exit(1);
});
