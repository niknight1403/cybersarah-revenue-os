import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { createGoogleAuthorization, exchangeGoogleCode, googleOAuthConfigured } from "../services/googleOAuth";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function requestOrigin(req: Request) {
  const proto = typeof req.headers["x-forwarded-proto"] === "string" ? req.headers["x-forwarded-proto"] : req.protocol;
  return `${proto}://${req.get("host")}`;
}

function readCookie(req: Request, name: string) {
  const raw = req.headers.cookie ?? "";
  const entry = raw.split(";").map(item => item.trim()).find(item => item.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/google", (req: Request, res: Response) => {
    if (!googleOAuthConfigured()) { res.status(503).json({ error: "google-oauth-not-configured" }); return; }
    const redirectUri = `${requestOrigin(req)}/api/oauth/google/callback`;
    const authorization = createGoogleAuthorization({ redirectUri });
    if (!authorization) { res.status(503).json({ error: "google-oauth-not-configured" }); return; }
    res.cookie("google_oauth_state", JSON.stringify({ state: authorization.state, verifier: authorization.verifier }), { httpOnly: true, sameSite: "lax", secure: req.secure || req.headers["x-forwarded-proto"] === "https", maxAge: 10 * 60 * 1000, path: "/api/oauth/google" });
    res.redirect(302, authorization.url);
  });

  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const stored = readCookie(req, "google_oauth_state");
    res.clearCookie("google_oauth_state", { path: "/api/oauth/google" });
    if (!code || !state || !stored) { res.status(400).json({ error: "google-code-state-required" }); return; }
    try {
      const parsed = JSON.parse(stored) as { state?: string; verifier?: string };
      if (parsed.state !== state || !parsed.verifier) { res.status(400).json({ error: "google-state-mismatch" }); return; }
      const userInfo = await exchangeGoogleCode({ code, verifier: parsed.verifier, redirectUri: `${requestOrigin(req)}/api/oauth/google/callback` });
      await db.upsertUser({ openId: userInfo.openId, name: userInfo.name, email: userInfo.email, loginMethod: userInfo.loginMethod, lastSignedIn: new Date() });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, { name: userInfo.name || "", expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Google callback failed", error);
      res.status(502).json({ error: "google-oauth-callback-failed" });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
