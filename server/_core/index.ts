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

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));
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
