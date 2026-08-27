import { describe, expect, it } from "vitest";
import { isAllowedOrigin, resolveHttpSecurityConfig } from "./httpSecurity";

describe("resolveHttpSecurityConfig", () => {
  it("begrenzt unzulässige Konfigurationswerte auf sichere Standardwerte", () => {
    expect(resolveHttpSecurityConfig({ NODE_ENV: "production", API_RATE_LIMIT_MAX: "0", API_RATE_LIMIT_WINDOW_MS: "invalid" })).toMatchObject({
      trustProxyHops: 1,
      rateLimitMax: 180,
      rateLimitWindowMs: 60_000,
      contentSecurityPolicyEnabled: true,
    });
  });

  it("aktiviert den Proxy-Vertrauenswert nur in der Produktion", () => {
    expect(resolveHttpSecurityConfig({ NODE_ENV: "development", TRUST_PROXY_HOPS: "4" }).trustProxyHops).toBe(0);
    expect(resolveHttpSecurityConfig({ NODE_ENV: "production", TRUST_PROXY_HOPS: "4" }).trustProxyHops).toBe(4);
  });
});


describe("isAllowedOrigin", () => {
  it("akzeptiert nur explizit konfigurierte Origins", () => {
    expect(isAllowedOrigin("https://cybersarah-ki.de", ["https://cybersarah-ki.de"])).toBe(true);
    expect(isAllowedOrigin("https://evil.example", ["https://cybersarah-ki.de"])).toBe(false);
    expect(isAllowedOrigin(undefined, ["https://cybersarah-ki.de"])).toBe(false);
  });

  it("akzeptiert Expo-Native-Origin nur mit explizitem Expo-Eintrag", () => {
    expect(isAllowedOrigin("exp://192.168.1.2:8081", ["exp://"])).toBe(true);
    expect(isAllowedOrigin("exp://192.168.1.2:8081", [])).toBe(false);
  });
});
