import type { NextFunction, Request, Response } from "express";

export function isValidMcpBearer(value: string | undefined) {
  const expected = process.env.MCP_SERVER_TOKEN;
  if (!expected || expected.length < 32 || !value?.startsWith("Bearer ")) return false;
  return value.slice("Bearer ".length) === expected;
}

export function requireMcpBearer(req: Request, res: Response, next: NextFunction) {
  if (!isValidMcpBearer(req.headers.authorization)) {
    return res.status(401).json({ error: "MCP-Authentifizierung erforderlich." });
  }
  return next();
}

export function registerMcpHealthProbe(app: { get: (path: string, ...handlers: Array<unknown>) => unknown }) {
  app.get("/api/mcp/health", requireMcpBearer, (_req: Request, res: Response) => res.json({ ok: true, service: "cybersarah-mcp" }));
}
