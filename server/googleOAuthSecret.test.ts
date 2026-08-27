import { describe, expect, it } from "vitest";

describe("Google OAuth secret configuration", () => {
  it.skipIf(!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET)("has a server-side client configuration and reaches the token endpoint without exposing values", async () => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
    expect(clientSecret).toBeTruthy();

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId!, client_secret: clientSecret!, grant_type: "authorization_code", code: "invalid-test-code", redirect_uri: "https://civappopt-itwkmp92.manus.space/api/oauth/google/callback" }),
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    const body = await response.text();
    expect(body).not.toContain(clientSecret!);
  });
});
