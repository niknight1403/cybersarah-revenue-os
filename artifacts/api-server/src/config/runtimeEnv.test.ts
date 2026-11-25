import { describe, it, expect } from "vitest";
import { loadRuntimeEnv } from "./runtimeEnv";
const base = { NODE_ENV: "production", DATABASE_URL: "postgresql://localhost/test", DEPLOY_TOKEN: "x".repeat(32), JWT_SECRET: "y".repeat(32), STRIPE_SECRET_KEY: "test-placeholder" };
describe("production runtime validation", () => {
  it.each(["GROQ_API_KEY", "GROQCLOUD_API_KEY"])("accepts %s without paid provider", (key) => {
    expect(loadRuntimeEnv({ ...base, [key]: "test-placeholder" }).NODE_ENV).toBe("production");
  });
  it("rejects missing LLM credentials", () => {
    expect(() => loadRuntimeEnv(base)).toThrow(/GROQ_API_KEY/);
  });
  it("still rejects missing database", () => {
    expect(() => loadRuntimeEnv({ ...base, DATABASE_URL: undefined, GROQ_API_KEY: "test-placeholder" })).toThrow(/DATABASE_URL/);
  });
});
