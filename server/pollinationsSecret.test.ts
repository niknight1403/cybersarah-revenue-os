import { describe, expect, it } from "vitest";

describe("Pollinations server secret", () => {
  it.skipIf(!process.env.POLLINATIONS_API_KEY)("authenticates a lightweight model-catalog request without exposing the key", async () => {
    const key = process.env.POLLINATIONS_API_KEY?.trim();
    expect(key).toBeTruthy();
    expect(key).not.toContain("client_secret");
    const response = await fetch("https://gen.pollinations.ai/image/models?community=0", {
      headers: { accept: "application/json", authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12000),
    });
    expect(response.status).toBe(200);
    expect(key).not.toContain(" ");
  }, 15000);
});
