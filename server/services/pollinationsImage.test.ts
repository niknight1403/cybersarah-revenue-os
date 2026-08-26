import { describe, expect, it } from "vitest";
import { buildPollinationsImageUrl, pollinationsConfigured } from "./pollinationsImage";

describe("Pollinations image adapter", () => {
  it("fails closed when the server key is absent", () => {
    expect(pollinationsConfigured({})).toBe(false);
  });

  it("builds a safe allowlisted image URL", () => {
    const url = buildPollinationsImageUrl({ prompt: "A clean cyberpunk revenue dashboard", model: "zimage", width: 1200, height: 800, seed: 7 });
    expect(url.origin).toBe("https://gen.pollinations.ai");
    expect(url.pathname).toContain("/image/");
    expect(url.searchParams.get("model")).toBe("zimage");
    expect(url.searchParams.get("safe")).toBe("true");
    expect(url.searchParams.get("seed")).toBe("7");
  });

  it("rejects unapproved models and oversized prompts", () => {
    expect(() => buildPollinationsImageUrl({ prompt: "valid prompt", model: "unknown" })).toThrow("pollinations-model-not-allowed");
    expect(() => buildPollinationsImageUrl({ prompt: "valid prompt" })).not.toThrow();
    expect(() => buildPollinationsImageUrl({ prompt: "x".repeat(32001) })).toThrow("pollinations-prompt-invalid");
  });
});
