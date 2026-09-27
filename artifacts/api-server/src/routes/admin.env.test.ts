import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import type { Server } from "http";

process.env["DEPLOY_TOKEN"] = "test-deploy-token-123";

const { planeSelbstNeustart } = await import("./admin");
const adminRouter = (await import("./admin")).default;

let app: Express;
let server: Server;
let basisUrl = "";

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter);
  server = app.listen(0);
  const addr = server.address();
  if (typeof addr === "object" && addr) basisUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => {
  server?.close();
});

describe("planeSelbstNeustart", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("beendet den Prozess nach Ablauf der Verzoegerung mit Code 0 (pm2 relauncht)", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    expect(exitSpy).not.toHaveBeenCalled();

    planeSelbstNeustart();

    vi.advanceTimersByTime(999);
    expect(exitSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("unterstuetzt eigene Verzoegerungen", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);

    planeSelbstNeustart(5000);
    vi.advanceTimersByTime(4999);
    expect(exitSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

describe("POST /api/admin/env — Guards", () => {
  it("weist Anfragen ohne Token mit 401 ab", async () => {
    const res = await fetch(`${basisUrl}/api/admin/env`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ env: { RESEND_API_KEY: "re_x" } }),
    });
    expect(res.status).toBe(401);
  });

  it("weist Bodies ohne env-Objekt mit 400 ab", async () => {
    const res = await fetch(`${basisUrl}/api/admin/env`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Deploy-Token": "test-deploy-token-123" },
      body: JSON.stringify({ env: "kein-objekt" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });
});
