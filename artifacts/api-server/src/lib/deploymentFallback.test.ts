import { describe, expect, it } from "vitest";
import {
  buildHealthCheckUrl,
  isSafeFreeProvider,
  selectFreeDeploymentFallback,
} from "./deploymentFallback";

describe("deploymentFallback", () => {
  it("selects Render for a Vercel quota failure", () => {
    const result = selectFreeDeploymentFallback({
      provider: "vercel",
      context: "Vercel",
      status: "failure",
      reason: "build rate limit / resource quota exceeded",
    });
    expect(result.shouldFailover).toBe(true);
    expect(result.selectedProvider).toBe("render");
    expect(result.candidates.map((p) => p.id)).toContain("koyeb");
  });

  it("does not fail over without a failure signal", () => {
    const result = selectFreeDeploymentFallback({
      provider: "vercel",
      status: "success",
    });
    expect(result.shouldFailover).toBe(false);
    expect(result.selectedProvider).toBeNull();
  });

  it("never treats paid Hetzner as a free automatic provider", () => {
    expect(isSafeFreeProvider("hetzner")).toBe(false);
    expect(isSafeFreeProvider("render")).toBe(true);
  });

  it("builds the liveness URL safely", () => {
    expect(buildHealthCheckUrl("https://example.onrender.com/"))
      .toBe("https://example.onrender.com/api/healthz");
  });
});
