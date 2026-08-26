import { createRemoteJWKSet, jwtVerify } from "jose";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function base64Url(bytes: Uint8Array) { return Buffer.from(bytes).toString("base64url"); }

export function googleOAuthConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.GOOGLE_OAUTH_CLIENT_ID?.trim() && env.GOOGLE_OAUTH_CLIENT_SECRET?.trim());
}

export function createGoogleAuthorization({ redirectUri }: { redirectUri: string }) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  if (!clientId || !googleOAuthConfigured()) return null;
  const state = randomUUID();
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  const url = new URL(GOOGLE_AUTH);
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile", state, code_challenge: challenge, code_challenge_method: "S256", access_type: "online", prompt: "select_account" }).toString();
  return { url: url.toString(), state, verifier };
}


export async function exchangeGoogleCode({ code, verifier, redirectUri }: { code: string; verifier: string; redirectUri: string }) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("google-oauth-not-configured");
  const response = await fetch(GOOGLE_TOKEN, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier }) });
  if (!response.ok) throw new Error(`google-token-exchange-${response.status}`);
  const payload = await response.json() as { id_token?: string };
  if (!payload.id_token) throw new Error("google-id-token-missing");
  const verified = await jwtVerify(payload.id_token, GOOGLE_JWKS, { issuer: GOOGLE_ISSUERS, audience: clientId });
  const claims = verified.payload;
  if (!claims.sub || claims.email_verified !== true) throw new Error("google-account-not-verified");
  return { openId: `google:${claims.sub}`, name: typeof claims.name === "string" ? claims.name : null, email: typeof claims.email === "string" ? claims.email : null, loginMethod: "google" };
}
