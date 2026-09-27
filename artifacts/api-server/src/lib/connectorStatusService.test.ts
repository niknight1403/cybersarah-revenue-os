import { describe, expect, it, vi } from "vitest";
import type { ConnectorZustand } from "./toolConnectorManager";
import { baueConnectorStatusBericht } from "./connectorStatusService";

function zustand(teil: Partial<ConnectorZustand> & { id: string }): ConnectorZustand {
  return {
    name: teil.id,
    kategorie: "dev",
    konfiguriert: true,
    aktiv: true,
    letztePruefung: null,
    fehlerHintereinander: 0,
    notiz: "",
    ...teil,
  };
}

const snapshot = [
  zustand({ id: "github", konfiguriert: true, aktiv: true }),
  zustand({ id: "gitlab", konfiguriert: true, aktiv: false, notiz: "Nicht erreichbar (1× hintereinander)" }),
  zustand({ id: "hubspot", konfiguriert: false, aktiv: false, notiz: "Credentials fehlen" }),
];

describe("baueConnectorStatusBericht", () => {
  it("gruppiert den Live-Sweep nach konfiguriert, aktiv, inaktiv und nicht konfiguriert", async () => {
    const pruefeAlle = vi.fn().mockResolvedValue({ geprueft: 2, aktiv: 1, deaktiviert: 1, reaktiviert: 0 });

    const bericht = await baueConnectorStatusBericht(pruefeAlle, () => snapshot);

    expect(pruefeAlle).toHaveBeenCalledTimes(1);
    expect(bericht.gesamt).toBe(3);
    expect(bericht.konfiguriert).toBe(2);
    expect(bericht.aktiv).toBe(1);
    expect(bericht.inaktiv).toBe(1);
    expect(bericht.connectoren).toHaveLength(3);
    expect(bericht.nichtKonfiguriert.map(c => c.id)).toEqual(["hubspot"]);
    expect(bericht.geprueftAm).toBeTruthy();
  });

  it("uebernimmt Fehler des Live-Sweeps ungefaehrisiert nach oben", async () => {
    const pruefeAlle = vi.fn().mockRejectedValue(new Error("Netzwerk down"));
    await expect(baueConnectorStatusBericht(pruefeAlle, () => [])).rejects.toThrow("Netzwerk down");
  });

  it("meldet eine leere Connector-Liste korrekt", async () => {
    const pruefeAlle = vi.fn().mockResolvedValue({ geprueft: 0, aktiv: 0, deaktiviert: 0, reaktiviert: 0 });
    const bericht = await baueConnectorStatusBericht(pruefeAlle, () => []);
    expect(bericht).toMatchObject({ gesamt: 0, konfiguriert: 0, aktiv: 0, inaktiv: 0 });
    expect(bericht.nichtKonfiguriert).toEqual([]);
  });
});
