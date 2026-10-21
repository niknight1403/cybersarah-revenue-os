import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Der Connector-Zustand ist modulglobal. Damit Tests unabhaengig sind,
 * wird das Modul pro Test neu geladen (vi.resetModules + dynamischer Import).
 */
async function frischesModul(): Promise<typeof import("./toolConnectorManager")> {
  vi.resetModules();
  return await import("./toolConnectorManager");
}

const FETCH_ORIGINAL = globalThis.fetch;

/** Mockt fetch: nur Anfragen mit "Bearer <gueltig>" bekommen ok:true. */
function stubFetchGueltig(gueltig: string[]): void {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const auth = init?.headers ? Object.values(init.headers as Record<string, string>)[0] : "";
    if (gueltig.some((g) => auth === `Bearer ${g}`)) {
      return new Response("ok", { status: 200 });
    }
    return new Response("Bad credentials", { status: 401 });
  });
  vi.stubGlobal("fetch", mock);
}

function stubFetchFehler(): void {
  const mock = vi.fn(async () => {
    throw new Error("network down");
  });
  vi.stubGlobal("fetch", mock);
}

const GESETZTE_KEYS = [
  "GITHUB_TOKEN",
  "ADMIN_GITHUB_TOKEN",
  "OPENAI_API_KEY",
  "OPENAI_BACKUP_KEY",
  "OPENAI_ADDITIONAL_KEYS",
  "NIKOKEY",
];

const gespeichert: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of GESETZTE_KEYS) {
    gespeichert[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of GESETZTE_KEYS) {
    const v = gespeichert[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  globalThis.fetch = FETCH_ORIGINAL;
});

describe("pruefeConnector — Multi-Key-bearerCheck", () => {
  it("markiert github aktiv, wenn erst der zweite Kandidat (ADMIN_GITHUB_TOKEN) gueltig ist", async () => {
    process.env["GITHUB_TOKEN"] = "bogus-30-zeichen-placeholder";
    process.env["ADMIN_GITHUB_TOKEN"] = "gueltiger-admin-token";
    stubFetchGueltig(["gueltiger-admin-token"]);

    const z = await (await frischesModul()).pruefeConnector("github");

    expect(z).not.toBeNull();
    expect(z?.konfiguriert).toBe(true);
    expect(z?.aktiv).toBe(true);
    expect(z?.notiz).toBe("Erreichbar");
  });

  it("markiert github inaktiv, wenn alle Kandidaten 401 liefern", async () => {
    process.env["GITHUB_TOKEN"] = "bogus";
    process.env["ADMIN_GITHUB_TOKEN"] = "auch-bogus";
    stubFetchGueltig([]);

    const z = await (await frischesModul()).pruefeConnector("github");

    expect(z?.konfiguriert).toBe(true);
    expect(z?.aktiv).toBe(false);
    expect(z?.notiz).toContain("Nicht erreichbar");
  });

  it("bewertet github als nicht konfiguriert, wenn beide Env-Keys fehlen", async () => {
    stubFetchGueltig([]);
    const z = await (await frischesModul()).pruefeConnector("github");

    expect(z?.konfiguriert).toBe(false);
    expect(z?.aktiv).toBe(false);
    expect(z?.notiz).toContain("Credentials fehlen");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("markiert openai aktiv, wenn nur ein Additional-Key gueltig ist", async () => {
    process.env["OPENAI_API_KEY"] = "sk-primär-ungültig";
    process.env["OPENAI_ADDITIONAL_KEYS"] = "sk-add1-ungueltig, sk-add2-gueltig";
    stubFetchGueltig(["sk-add2-gueltig"]);

    const z = await (await frischesModul()).pruefeConnector("openai");

    expect(z?.konfiguriert).toBe(true);
    expect(z?.aktiv).toBe(true);
  });

  it("faellt bei Netzwerkfehlern auf inaktiv zurueck", async () => {
    process.env["GITHUB_TOKEN"] = "irgendwas";
    stubFetchFehler();

    const z = await (await frischesModul()).pruefeConnector("github");

    expect(z?.aktiv).toBe(false);
    expect(z?.notiz).toContain("Nicht erreichbar (1");
  });

  it("gibt null fuer unbekannte Connector-IDs zurueck", async () => {
    const z = await (await frischesModul()).pruefeConnector("gibt-es-nicht");
    expect(z).toBeNull();
  });
});
