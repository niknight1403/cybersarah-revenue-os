import { describe, expect, it } from "vitest";

describe("OAuth public origin configuration", () => {
  it.skipIf(!process.env.OAUTH_PUBLIC_ORIGIN)("is HTTPS and reaches its health endpoint without exposing configuration", async () => {
    const configured = process.env.OAUTH_PUBLIC_ORIGIN?.trim();
    expect(configured).toBeTruthy();
    const origin = new URL(configured!).origin;
    expect(new URL(origin).protocol).toBe("https:");
    const response = await fetch(`${origin}/api/healthz`);
    expect(response.status).toBe(200);
    expect(origin).not.toContain("client_secret");
  });
});
