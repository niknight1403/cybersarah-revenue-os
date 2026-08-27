import { describe, expect, it } from "vitest";
import { createGoogleAuthorization, googleOAuthConfigured } from "./googleOAuth";

describe("Google OAuth", () => {
  it("reports configuration only when both server credentials exist", () => {
    expect(googleOAuthConfigured({ GOOGLE_OAUTH_CLIENT_ID: "id", GOOGLE_OAUTH_CLIENT_SECRET: "secret" })).toBe(true);
    expect(googleOAuthConfigured({ GOOGLE_OAUTH_CLIENT_ID: "id" })).toBe(false);
  });

  it.skipIf(!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET)("creates a PKCE authorization request without exposing the client secret", () => {
    const result = createGoogleAuthorization({ redirectUri: "https://example.test/api/oauth/google/callback" });
    if (!result) throw new Error("Google OAuth test credentials are not configured");
    const url = new URL(result.url);
    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe(result.state);
    expect(url.searchParams.get("client_secret")).toBeNull();
    expect(result.verifier.length).toBeGreaterThan(30);
  });
});
