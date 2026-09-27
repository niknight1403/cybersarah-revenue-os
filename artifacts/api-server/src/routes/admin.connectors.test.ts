import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express, { type Express } from "express";
import type { Server } from "http";

process.env["DEPLOY_TOKEN"] = "test-deploy-token-123";

const adminRouter = (await import("./admin")).default;

interface ConnectorAntwort {
  success: boolean;
  gesamt: number;
  konfiguriert: number;
  aktiv: number;
  inaktiv: number;
  connectoren: Array<{ id: string; name: string; kategorie: string; konfiguriert: boolean; aktiv: boolean }>;
  nichtKonfiguriert: Array<{ id: string }>;
  geprueftAm: string;
}

let app: Express;
let server: Server;
let basisUrl = "";

beforeAll(async () => {
  app = express();
  app.use("/api/admin", adminRouter);
  server = app.listen(0);
  const addr = server.address();
  if (typeof addr === "object" && addr) basisUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => {
  server?.close();
});

describe("GET /api/admin/connectors", () => {
  it("weist Anfragen ohne Token mit 401 ab", async () => {
    const res = await fetch(`${basisUrl}/api/admin/connectors`);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });

  it("weist falsche Tokens mit 401 ab", async () => {
    const res = await fetch(`${basisUrl}/api/admin/connectors`, {
      headers: { "x-deploy-token": "falsch" },
    });
    expect(res.status).toBe(401);
  });

  it("liefert mit gueltigem Token den vollstaendigen Connector-Statusbericht", async () => {
    const res = await fetch(`${basisUrl}/api/admin/connectors`, {
      headers: { "x-deploy-token": "test-deploy-token-123" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as ConnectorAntwort;

    expect(body.success).toBe(true);
    expect(body.gesamt).toBeGreaterThan(0);
    expect(body.konfiguriert + body.nichtKonfiguriert.length).toBe(body.gesamt);
    expect(body.aktiv + body.inaktiv).toBe(body.konfiguriert);
    expect(body.connectoren.length).toBe(body.gesamt);
    expect(body.geprueftAm).toBeTruthy();
    for (const c of body.connectoren) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(typeof c.konfiguriert).toBe("boolean");
    }
  });
});
