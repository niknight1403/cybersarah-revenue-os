import { describe, expect, it, vi } from "vitest";
import type { Aufgabe, AufgabeErgebnis } from "../AgentBase";
import { RevenueAnalystAgent } from "../RevenueAnalystAgent";
import { fuehreRevenueAnalystAutoAus } from "./revenueAnalystAuto";

function baueAufgabe(): Aufgabe {
  return {
    id: "aufgabe-test-1",
    typ: "revenue_analyst_auto",
    payload: { aktion: "auto_optimize_all" },
    prioritaet: 1,
    versuche: 0,
    maxVersuche: 3,
    erstelltAm: new Date(),
  };
}

function baueErgebnis(): AufgabeErgebnis {
  return { success: true, message: "auto_action_all ausgefuehrt", metadaten: {} };
}

describe("fuehreRevenueAnalystAutoAus", () => {
  it("leitet den Job an den RevenueAnalystAgent mit aktion auto_action_all weiter", async () => {
    const spy = vi.fn().mockResolvedValue(baueErgebnis());
    const agent = Object.create(RevenueAnalystAgent.prototype) as RevenueAnalystAgent;
    agent.fuehreAufgabeAus = spy;

    const ergebnis = await fuehreRevenueAnalystAutoAus([agent], baueAufgabe());

    expect(ergebnis).toEqual(baueErgebnis());
    expect(spy).toHaveBeenCalledTimes(1);
    const weitergegeben: Aufgabe = spy.mock.calls[0][0];
    expect(weitergegeben.typ).toBe("revenue_analyst_auto");
    expect(weitergegeben.id).toBe("aufgabe-test-1");
    expect(weitergegeben.payload).toEqual({ aktion: "auto_action_all" });
  });

  it("ignoriert andere Agenten und nutzt nur den RevenueAnalystAgent", async () => {
    const spy = vi.fn().mockResolvedValue(baueErgebnis());
    const agent = Object.create(RevenueAnalystAgent.prototype) as RevenueAnalystAgent;
    agent.fuehreAufgabeAus = spy;
    const fremd = { fuehreAufgabeAus: vi.fn() };

    await fuehreRevenueAnalystAutoAus([fremd, agent], baueAufgabe());

    expect(fremd.fuehreAufgabeAus).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("wirft einen Fehler, wenn kein RevenueAnalystAgent vorhanden ist", async () => {
    const fremd = { fuehreAufgabeAus: vi.fn() };
    await expect(fuehreRevenueAnalystAutoAus([fremd], baueAufgabe())).rejects.toThrow(
      "RevenueAnalystAgent nicht gefunden",
    );
  });
});
