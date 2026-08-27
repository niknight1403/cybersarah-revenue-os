import type { Express, Request, Response } from "express";
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

function configuredOrigins(env: Record<string, string | undefined>) {
  return (env.CORS_ALLOWED_ORIGINS ?? env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[]) {
  if (!origin) return false;
  return allowedOrigins.includes(origin) || (origin.startsWith("exp://") && allowedOrigins.includes("exp://"));
}

function applyCors(response: Response, origin: string | undefined, allowedOrigins: string[]) {
  if (!origin) return;
  const allowed = isAllowedOrigin(origin, allowedOrigins);
  if (!allowed) return;
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-CSRF-Token");
  response.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
}

function skipRateLimit(request: Request) {
  const path = request.originalUrl.split("?", 1)[0] ?? request.path;
  return path === "/api/oauth/callback" || path === "/api/stripe/webhook";
}

export function configureHttpSecurity(app: Express, env: Record<string, string | undefined> = process.env) {
  const config = resolveHttpSecurityConfig(env);
  app.disable("x-powered-by");
  const allowedOrigins = configuredOrigins(env);
  app.use((request, response, next) => {
    applyCors(response, request.headers.origin, allowedOrigins);
    if (request.method === "OPTIONS") return response.sendStatus(204);
    return next();
  });
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
