import { describe, expect, it, vi } from "vitest";
import type { Aufgabe, AufgabeErgebnis } from "../AgentBase";
import { JobQueue } from "./JobQueue";

function baueErgebnis(message: string): AufgabeErgebnis {
  return { success: true, message, metadaten: {} };
}

/** Hilfsfunktion: laesst die Queue intern verarbeiten und wartet auf Ruhe. */
async function warteBisRuhe(queue: JobQueue, pruefung: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!pruefung() && Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 10));
  }
  expect(pruefung(), "Zustand nicht rechtzeitig erreicht").toBe(true);
  void queue;
}

describe("JobQueue", () => {
  it("verarbeitet einen Job mit registriertem Handler bis zum Abschluss", async () => {
    const queue = new JobQueue(1);
    const abgeschlossen = vi.fn();
    queue.on("job:abgeschlossen", abgeschlossen);

    queue.registriereHandler("revenue_analyst_auto", async (aufgabe: Aufgabe) =>
      baueErgebnis(`fertig: ${aufgabe.typ}`),
    );
    queue.fuegeHinzu("revenue_analyst_auto", { aktion: "auto_optimize_all" }, { prioritaet: 1 });

    await warteBisRuhe(queue, () => abgeschlossen.mock.calls.length === 1);
    expect(abgeschlossen).toHaveBeenCalledWith(
      expect.objectContaining({ typ: "revenue_analyst_auto" }),
      expect.objectContaining({ success: true }),
    );
    queue.stoppeVerarbeitungsschleife();
  });

  it("markiert Jobs ohne Handler als fehlgeschlagen (Regression: revenue_analyst_auto hatte keinen Handler)", async () => {
    const queue = new JobQueue(1);
    const fehlgeschlagen = vi.fn();
    queue.on("job:fehlgeschlagen", fehlgeschlagen);

    queue.fuegeHinzu("unbekannter_typ", {}, { prioritaet: 3 });

    await warteBisRuhe(queue, () => fehlgeschlagen.mock.calls.length === 1);
    const [aufgabe, fehler] = fehlgeschlagen.mock.calls[0];
    expect(aufgabe.typ).toBe("unbekannter_typ");
    expect(fehler).toContain("Kein Handler für Typ");
    queue.stoppeVerarbeitungsschleife();
  });

  it("wiederholt einen fehlschlagenden Job bis zur Obergrenze und scheitert dann endgueltig", async () => {
    const queue = new JobQueue(1, );
    const wiederholt = vi.fn();
    const endgueltig = vi.fn();
    queue.on("job:wiederholt", wiederholt);
    queue.on("job:fehlgeschlagen", endgueltig);

    queue.registriereHandler("fehler_typ", async () => {
      throw new Error("Kuenstlicher Fehler");
    });
    queue.fuegeHinzu("fehler_typ", {}, { prioritaet: 2, maxVersuche: 2 });

    // 1. Versuch schlaegt fehl -> Wiederholung mit Backoff (bis 60s, hier per Warten abgefangen)
    await warteBisRuhe(queue, () => wiederholt.mock.calls.length === 1);
    expect(wiederholt).toHaveBeenCalledWith(expect.objectContaining({ typ: "fehler_typ" }), 1, expect.any(Number));

    // Backoff verkuerzen: Faelligkeit in die Vergangenheit legen, damit der 2. Versuch sofort laeuft
    const jobs = queue["queue"] as Map<string, { aufgabe: Aufgabe }>;
    for (const job of jobs.values()) {
      job.aufgabe.faelligAb = new Date(Date.now() - 1000);
    }
    queue["verarbeite"]();
    await warteBisRuhe(queue, () => endgueltig.mock.calls.length === 1);

    expect(endgueltig).toHaveBeenCalledWith(expect.objectContaining({ typ: "fehler_typ" }), "Kuenstlicher Fehler");
    queue.stoppeVerarbeitungsschleife();
  });

  it("bevorzugt bei freiem Slot Jobs hoeherer Prioritaet (1 vor 2 vor 3)", async () => {
    const queue = new JobQueue(1); // sequentiell: ein Slot, Auswahl muss priorisieren
    const gestartet: string[] = [];
    queue.on("job:gestartet", (aufgabe: Aufgabe) => {
      gestartet.push(String(aufgabe.payload["name"]));
    });

    let frei = false;
    const ersterLauf = new Promise<void>(r => {
      const poll = setInterval(() => {
        if (frei) {
          clearInterval(poll);
          r();
        }
      }, 5);
    });
    queue.registriereHandler("prio_typ", async (aufgabe: Aufgabe) => {
      if (aufgabe.payload["name"] === "blocker") await ersterLauf;
      return baueErgebnis(`fertig: ${String(aufgabe.payload["name"])}`);
    });

    // Blocker belegt den einzigen Slot; beide Kandidaten warten parallel
    queue.fuegeHinzu("prio_typ", { name: "blocker" }, { prioritaet: 3 });
    queue.fuegeHinzu("prio_typ", { name: "niedrig" }, { prioritaet: 3 });
    queue.fuegeHinzu("prio_typ", { name: "hoch" }, { prioritaet: 1 });
    queue.fuegeHinzu("prio_typ", { name: "mittel" }, { prioritaet: 2 });

    frei = true;
    await warteBisRuhe(queue, () => gestartet.length === 4);
    expect(gestartet).toEqual(["blocker", "hoch", "mittel", "niedrig"]);
    queue.stoppeVerarbeitungsschleife();
  });
});
