import type { Aufgabe, AufgabeErgebnis } from "../AgentBase";
import { RevenueAnalystAgent } from "../RevenueAnalystAgent";

/**
 * Fuehrt die regelmaessige Auto-Optimierung des Revenue-Analysten aus
 * (Job-Typ "revenue_analyst_auto", Alle-5-Minuten-Loop des Orchestrators).
 *
 * Der Job wird mit der Aktion "auto_optimize_all" eingereiht, der Agent
 * erwartet dafuer intern "auto_action_all" (Anomalie-Scan, Cross-Sell,
 * Dynamic Pricing, Rabatte, Forecast, Warenkorb-Recovery).
 */
export async function fuehreRevenueAnalystAutoAus(
  agentKandidaten: Array<{ fuehreAufgabeAus(aufgabe: Aufgabe): Promise<AufgabeErgebnis> }>,
  aufgabe: Aufgabe,
): Promise<AufgabeErgebnis> {
  const agent = agentKandidaten.find((a): a is RevenueAnalystAgent => a instanceof RevenueAnalystAgent);
  if (!agent) throw new Error("RevenueAnalystAgent nicht gefunden");
  return agent.fuehreAufgabeAus({ ...aufgabe, payload: { aktion: "auto_action_all" } });
}
