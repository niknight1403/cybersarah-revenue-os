import type { Express, Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import helmet from "helmet";

export type HttpSecurityConfig = {
  trustProxyHops: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  contentSecurityPolicyEnabled: boolean;
};

function parseBoundedInteger(raw: string | undefined, fallback: number, minimum: number, maximum: number) {
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}

export function resolveHttpSecurityConfig(env: Record<string, string | undefined> = process.env): HttpSecurityConfig {
  const isProduction = env.NODE_ENV === "production";
  return {
    trustProxyHops: isProduction ? parseBoundedInteger(env.TRUST_PROXY_HOPS, 1, 1, 5) : 0,
    rateLimitWindowMs: parseBoundedInteger(env.API_RATE_LIMIT_WINDOW_MS, 60_000, 1_000, 3_600_000),
    rateLimitMax: parseBoundedInteger(env.API_RATE_LIMIT_MAX, 180, 10, 10_000),
    contentSecurityPolicyEnabled: isProduction,
  };
}

function skipRateLimit(request: Request) {
  const path = request.originalUrl.split("?", 1)[0] ?? request.path;
  return path === "/api/oauth/callback" || path === "/api/stripe/webhook";
}

export function configureHttpSecurity(app: Express, env: Record<string, string | undefined> = process.env) {
  const config = resolveHttpSecurityConfig(env);
  app.disable("x-powered-by");
  if (config.trustProxyHops > 0) app.set("trust proxy", config.trustProxyHops);
  app.use(helmet({
    contentSecurityPolicy: config.contentSecurityPolicyEnabled ? {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: ["'self'", "https:", "wss:"],
        fontSrc: ["'self'", "data:", "https:"],
        imgSrc: ["'self'", "data:", "https:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));
  app.use("/api", rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: request => ipKeyGenerator(request.ip ?? "unknown"),
    skip: skipRateLimit,
    handler: (_request, response) => response.status(429).json({ ok: false, error: "Zu viele Anfragen. Bitte versuchen Sie es in Kürze erneut." }),
  }));
  return config;
}
