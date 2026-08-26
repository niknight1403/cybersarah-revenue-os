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

export function requestOrigin(req: Request) {
  const configured = process.env.OAUTH_PUBLIC_ORIGIN?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === "https:") return parsed.origin;
    } catch { /* fallback to forwarded request origin */ }
  }
  const forwardedProto = typeof req.headers["x-forwarded-proto"] === "string" ? req.headers["x-forwarded-proto"].split(",")[0]?.trim() : undefined;
  const forwardedHost = typeof req.headers["x-forwarded-host"] === "string" ? req.headers["x-forwarded-host"].split(",")[0]?.trim() : undefined;
  return `${forwardedProto || req.protocol}://${forwardedHost || req.get("host")}`;
}

export function googleCallbackUris(req: Request) {
  const origin = requestOrigin(req);
  return { login: `${origin}/api/oauth/google/callback`, link: `${origin}/api/oauth/google/link/callback` };
}

function readCookie(req: Request, name: string) {
  const raw = req.headers.cookie ?? "";
  const entry = raw.split(";").map(item => item.trim()).find(item => item.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/google/link", async (req: Request, res: Response) => {
    try {
      const currentUser = await sdk.authenticateRequest(req);
      if (!currentUser?.openId) { res.status(401).json({ error: "authentication-required" }); return; }
      const authorization = createGoogleAuthorization({ redirectUri: googleCallbackUris(req).link });
      if (!authorization) { res.status(503).json({ error: "google-oauth-not-configured" }); return; }
      res.cookie("google_oauth_link_state", JSON.stringify({ state: authorization.state, verifier: authorization.verifier, sessionOpenId: currentUser.openId }), { httpOnly: true, sameSite: "lax", secure: req.secure || req.headers["x-forwarded-proto"] === "https", maxAge: 10 * 60 * 1000, path: "/api/oauth/google/link" });
      res.redirect(302, authorization.url);
    } catch { res.status(401).json({ error: "authentication-required" }); }
  });

  app.get("/api/oauth/google/link/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const stored = readCookie(req, "google_oauth_link_state");
    res.clearCookie("google_oauth_link_state", { path: "/api/oauth/google/link" });
    if (!code || !state || !stored) { res.status(400).json({ error: "google-link-code-state-required" }); return; }
    try {
      const currentUser = await sdk.authenticateRequest(req);
      if (!currentUser?.openId) { res.status(401).json({ error: "authentication-required" }); return; }
      const parsed = JSON.parse(stored) as { state?: string; verifier?: string; sessionOpenId?: string };
      if (parsed.state !== state || !parsed.verifier || parsed.sessionOpenId !== currentUser.openId) { res.status(400).json({ error: "google-link-state-mismatch" }); return; }
      const googleUser = await exchangeGoogleCode({ code, verifier: parsed.verifier, redirectUri: googleCallbackUris(req).link });
      const existingUser = await db.getUserByOpenId(currentUser.openId);
      if (!existingUser) { res.status(404).json({ error: "current-user-not-found" }); return; }
      const result = await db.linkGoogleIdentity({ userId: existingUser.id, providerSubject: googleUser.openId.slice("google:".length), providerEmail: googleUser.email });
      const workspace = await db.getRevenueWorkspaceByUser(existingUser.id);
      if (workspace) await db.recordGrowthAudit({ workspaceId: workspace.id, idempotencyKey: `google-account-link:${existingUser.id}:${googleUser.openId}`, actor: "user", eventType: result.status === "linked" ? "account.google.linked" : "account.google.link.rejected", status: result.status === "linked" || result.status === "already_linked" ? "completed" : "failed", detail: { provider: "google", result: result.status, externalExecution: false, approvalRequired: false } });
      if (result.status === "identity_conflict") { res.status(409).json({ error: "google-identity-already-linked", externalExecution: false }); return; }
      if (result.status === "provider_already_linked") { res.status(409).json({ error: "google-provider-already-linked", externalExecution: false }); return; }
      res.redirect(302, "/account?linked=google");
    } catch (error) {
      console.error("[OAuth] Google link callback failed", error);
      res.status(502).json({ error: "google-link-failed", externalExecution: false });
    }
  });

  app.get("/api/oauth/google", (req: Request, res: Response) => {
    if (!googleOAuthConfigured()) { res.status(503).json({ error: "google-oauth-not-configured" }); return; }
    const redirectUri = googleCallbackUris(req).login;
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
      const userInfo = await exchangeGoogleCode({ code, verifier: parsed.verifier, redirectUri: googleCallbackUris(req).login });
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
