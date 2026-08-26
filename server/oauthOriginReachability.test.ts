import { describe, expect, it } from "vitest";

describe("configured OAuth origin reachability", () => {
  it("uses a reachable HTTPS origin for the published health endpoint", async () => {
    const configured = process.env.OAUTH_PUBLIC_ORIGIN?.trim();
    expect(configured).toBeTruthy();
    const origin = new URL(configured!).origin;
    expect(origin.toLowerCase().startsWith("https://")).toBe(true);
    const response = await fetch(`${origin}/api/healthz`, { signal: AbortSignal.timeout(12000) });
    expect(response.status).toBe(200);
  }, 15000);
});
