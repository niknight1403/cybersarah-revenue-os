import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerMcpHealthProbe } from "./auth";

const servers: Array<ReturnType<express.Express["listen"]>> = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
  vi.unstubAllEnvs();
});

describe("MCP-Bearer-Token", () => {
  it("schützt den leichten MCP-Health-Endpoint mit dem hinterlegten Secret", async () => {
    const token = "mcp-test-token-with-at-least-thirty-two-characters";
    vi.stubEnv("MCP_SERVER_TOKEN", token);
    const app = express();
    registerMcpHealthProbe(app);
    const server = app.listen(0);
    servers.push(server);
    await new Promise<void>(resolve => server.once("listening", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Testserver konnte nicht gebunden werden.");

    const unauthorized = await fetch(`http://127.0.0.1:${address.port}/api/mcp/health`);
    expect(unauthorized.status).toBe(401);
    const authorized = await fetch(`http://127.0.0.1:${address.port}/api/mcp/health`, { headers: { authorization: `Bearer ${token}` } });
    expect(authorized.status).toBe(200);
    await expect(authorized.json()).resolves.toMatchObject({ ok: true, service: "cybersarah-mcp" });
  });
});
