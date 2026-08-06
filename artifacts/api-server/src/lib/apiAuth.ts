import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const OEFFENTLICHE_PFADE = new Set([
  "/healthz",
  "/b2b-service/anfrage",
  "/chat/message",
  "/chat/widget.js",
  "/voice-agent/webhook/call",
  "/voice-agent/clients",
]);

const OEFFENTLICHE_PRAEFIXE = [
  "/lead-nurture/pixel/",
  "/lead-nurture/klick/",
  "/lead-nurture/abmelden/",
];

export function apiAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const pfad = req.path;

  if (OEFFENTLICHE_PFADE.has(pfad) || OEFFENTLICHE_PRAEFIXE.some(p => pfad.startsWith(p))) {
    next();
    return;
  }

  const erwarteterToken = process.env["API_AUTH_TOKEN"];

  if (!erwarteterToken) {
    if (process.env["NODE_ENV"] === "production") {
      logger.error("API_AUTH_TOKEN fehlt in Produktion — Server verweigert Anfragen an geschützte Routen");
      res.status(500).json({ error: "Server-Konfigurationsfehler" });
      return;
    }
    next();
    return;
  }

  const authHeader = req.headers["authorization"];
  const mitgegebenerToken = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "") : undefined;

  if (mitgegebenerToken !== erwarteterToken) {
    res.status(401).json({ error: "Nicht autorisiert" });
    return;
  }

  next();
}
