import { db } from "@workspace/db";
import { agentsTable, agentLogsTable, revenueOpportunitiesTable, expansionChancenTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { globalQueue } from "./JobQueue";
import { generiereAutoRevenueStreams } from "./expansionAgent";

interface SystemAnalyse {
  gesamtAgenten: number;
  aktivAgenten: number;
  fehlerAgenten: number;
  queueGroesse: number;
  offeneChancen: number;
  aktiveChancen: number;
  empfehlungen: string[];
  prioritaetAktionen: string[];
}

export class MasterAgent extends AgentBase {
  constructor() {
    super("Master Agent", "master");
  }

  protected beschreibungText(): string {
    return "Zentrale Kommandozentrale — koordiniert alle Agenten, setzt Prioritäten, optimiert das Gesamtsystem kontinuierlich";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const aktion = (aufgabe.payload as Record<string, string>)?.aktion ?? "system_analyse";

    switch (aktion) {
      case "system_analyse":
        return this.systemAnalyse();
      case "optimierung":
        return this.optimiereSystem();
      case "deep_optimierung":
        return this.optimiereSystemDeep();
      case "chancen_priorisierung":
        return this.priorisierChancen();
      default:
        return this.systemAnalyse();
    }
  }

  private async systemAnalyse(): Promise<AufgabeErgebnis> {
    const [agenten, chancenStats, queueStatus] = await Promise.all([
      db.select().from(agentsTable),
      db.select({
        offen: sql<number>`COUNT(*) FILTER (WHERE status = 'entdeckt')`,
        aktiv: sql<number>`COUNT(*) FILTER (WHERE status = 'aktiv')`,
        getestet: sql<number>`COUNT(*) FILTER (WHERE status = 'getestet')`,
      }).from(revenueOpportunitiesTable),
      Promise.resolve(globalQueue.holeStatus()),
    ]);

    const fehlerAgenten = agenten.filter(a => a.status === "fehler");
    const aktiveAgenten = agenten.filter(a => a.status === "aktiv");
    const empfehlungen: string[] = [];
    const prioritaetAktionen: string[] = [];

    for (const agent of fehlerAgenten) {
      empfehlungen.push(`${agent.name} hat ${agent.fehlerAnzahl} Fehler — Neu-Initialisierung empfohlen`);
      prioritaetAktionen.push(`agent_restart:${agent.id}`);
    }

    const stats = chancenStats[0];
    if (stats && Number(stats.offen) > 5) {
      prioritaetAktionen.push("chancen_aktivieren");
      empfehlungen.push(`${stats.offen} offene Revenue-Chancen warten auf Aktivierung`);
    }

    if (queueStatus.wartend > 20) {
      empfehlungen.push(`Job-Queue überlastet (${queueStatus.wartend} Jobs) — Prioritäten neu setzen`);
    }

    if (fehlerAgenten.length > 0) {
      await db.update(agentsTable)
        .set({ status: "wartend", updatedAt: new Date() })
        .where(eq(agentsTable.status, "fehler"));

      for (const agent of fehlerAgenten) {
        await db.insert(agentLogsTable).values({
          agentId: agent.id,
          agentName: agent.name,
          aktion: "Master-Reset",
          status: "erfolgreich",
          nachricht: `Master Agent hat ${agent.name} zurückgesetzt (${agent.fehlerAnzahl} Fehler bereinigt)`,
        });
      }
    }

    const analyse: SystemAnalyse = {
      gesamtAgenten: agenten.length,
      aktivAgenten: aktiveAgenten.length,
      fehlerAgenten: fehlerAgenten.length,
      queueGroesse: queueStatus.wartend,
      offeneChancen: Number(stats?.offen ?? 0),
      aktiveChancen: Number(stats?.aktiv ?? 0),
      empfehlungen,
      prioritaetAktionen,
    };

    logger.info({ analyse }, "Master Agent: System-Analyse abgeschlossen");

    return {
      success: true,
      message: `System-Check: ${agenten.length} Agenten | ${fehlerAgenten.length} zurückgesetzt | ${queueStatus.wartend} Jobs | ${analyse.offeneChancen} Chancen offen`,
      metadaten: analyse as unknown as Record<string, unknown>,
    };
  }

  private async optimiereSystem(): Promise<AufgabeErgebnis> {
    const topChancen = await db
      .select()
      .from(revenueOpportunitiesTable)
      .where(eq(revenueOpportunitiesTable.status, "entdeckt"))
      .orderBy(desc(revenueOpportunitiesTable.geschaetzterMonatsumsatz))
      .limit(3);

    for (const chance of topChancen) {
      await db.update(revenueOpportunitiesTable)
        .set({ status: "aktiv", prioritaet: 1, updatedAt: new Date() })
        .where(eq(revenueOpportunitiesTable.id, chance.id));
    }

    globalQueue.fuegeHinzu("revenue_analyse", { aktion: "roi_berechnen", zeitraum: "woche" }, { prioritaet: 1, maxVersuche: 3 });
    globalQueue.fuegeHinzu("monetization_affiliate", { aktion: "affiliate_analyse" }, { prioritaet: 1 });
    globalQueue.fuegeHinzu("sales_optimierung", {}, { prioritaet: 1 });

    return {
      success: true,
      message: `Optimierung: ${topChancen.length} Chancen aktiviert | Revenue-Jobs mit Prio 1 in Queue`,
      metadaten: { aktivierteChancen: topChancen.map(c => c.titel) },
    };
  }

  // ─── Deep-Optimization-Pipeline (True-ROI + Autopilot + Pricing) ────────────
  // True-ROI = (Umsatz − API-Kosten − Zeitaufwand) / Gesamtkosten × 100
  //  > 500 %  → Chance AUTO-aktivieren
  //  < 50 %   → Chance pausieren
  // Läuft rein DB-basiert (kein OpenAI-Call) → schnelle Antwort für One-Click.
  private async optimiereSystemDeep(): Promise<AufgabeErgebnis> {
    const start = Date.now();

    // ── 1. True-ROI-Pass über alle Expansion-Chancen ──
    const chancen = await db.select().from(expansionChancenTable);
    let aktiviert = 0;
    let pausiert = 0;

    for (const chance of chancen) {
      const umsatz = parseFloat(chance.geschaetzterUmsatz ?? "0");
      const kosten = parseFloat(chance.kosten ?? "0");
      const apiKosten = this.schaetzeApiKosten(chance.kategorie);
      const zeitKosten = this.schaetzeZeitKosten(chance.zeitBisErstemUmsatz, chance.sofortStartbar);
      const gesamtKosten = Math.max(kosten + apiKosten + zeitKosten, 1);
      const trueRoi = ((umsatz - apiKosten - zeitKosten) / gesamtKosten) * 100;
      const trueRoiGekappt = Math.max(Math.min(trueRoi, 999999), -100);

      let neuerStatus = chance.status;
      if (trueRoi > 500 && chance.status !== "aktiv") {
        neuerStatus = "aktiv";
        aktiviert++;
      } else if (trueRoi < 50 && chance.status === "aktiv") {
        neuerStatus = "pausiert";
        pausiert++;
      }

      await db.update(expansionChancenTable)
        .set({
          roi: trueRoiGekappt.toFixed(2),
          status: neuerStatus,
          ...(neuerStatus === "aktiv" && { prioritaet: 1 }),
          validiert: trueRoi > 200,
          updatedAt: new Date(),
        })
        .where(eq(expansionChancenTable.id, chance.id));
    }

    // ── 2. Expansion-Autopilot (Top-3 Formate × Partnerprogramme) ──
    let autoStreams = 0;
    let topFormate: Array<{ typ: string; plattform: string; anzahl: number }> = [];
    try {
      const autopilot = await generiereAutoRevenueStreams();
      autoStreams = autopilot.erstellteStreams;
      topFormate = autopilot.topFormate;
    } catch (err) {
      logger.warn({ err }, "Deep-Optimierung: Autopilot fehlgeschlagen (nicht kritisch)");
    }

    // ── 3. RevenueOptimizer sofort für Preis-Strategie triggern ──
    const jobIds: string[] = [];
    jobIds.push(globalQueue.fuegeHinzu("revenue_analyse", { aktion: "roi_berechnen", zeitraum: "woche" }, { prioritaet: 1, maxVersuche: 3 }));
    jobIds.push(globalQueue.fuegeHinzu("monetization_affiliate", { aktion: "affiliate_analyse" }, { prioritaet: 1 }));
    jobIds.push(globalQueue.fuegeHinzu("monetization_funnel", { aktion: "funnel_optimieren" }, { prioritaet: 1 }));

    const dauerMs = Date.now() - start;
    const dauerSek = Math.max(1, Math.round(dauerMs / 1000));
    const quellenAnalysiert = chancen.length;

    logger.info(
      { quellenAnalysiert, aktiviert, pausiert, autoStreams, dauerMs, topFormate },
      "Master Agent: Deep-Optimierung abgeschlossen",
    );

    return {
      success: true,
      message: `Optimierungs-Zyklus abgeschlossen — Analyse von ${quellenAnalysiert} Quellen in ${dauerSek}s: ${aktiviert} aktiviert, ${pausiert} pausiert, ${autoStreams} Auto-Streams`,
      metadaten: {
        dauerMs,
        quellenAnalysiert,
        aktiviert,
        pausiert,
        autoStreams,
        topFormate,
        jobIds,
      },
    };
  }

  /** API-Kosten-Heuristik pro Kategorie (KI-Content kostet Tokens, Affiliate nichts). */
  private schaetzeApiKosten(kategorie: string): number {
    switch (kategorie) {
      case "content":
        return 15;
      case "eigenes_produkt":
        return 10;
      case "coaching":
      case "freelance":
        return 5;
      default:
        return 0; // affiliate, abo → kein API-Einsatz
    }
  }

  /** Zeitaufwand-Heuristik in € (Opportunitätskosten) aus Time-to-Revenue. */
  private schaetzeZeitKosten(zeitBisErstemUmsatz: string | null, sofortStartbar: boolean | null): number {
    if (sofortStartbar) return 5;
    switch (zeitBisErstemUmsatz) {
      case "sofort":
        return 5;
      case "1-7 Tage":
        return 20;
      case "1-4 Wochen":
        return 60;
      default:
        return 30;
    }
  }

  private async priorisierChancen(): Promise<AufgabeErgebnis> {
    const chancen = await db
      .select()
      .from(revenueOpportunitiesTable)
      .where(eq(revenueOpportunitiesTable.status, "entdeckt"))
      .orderBy(desc(revenueOpportunitiesTable.geschaetzterMonatsumsatz))
      .limit(10);

    let aktiviert = 0;
    for (const chance of chancen) {
      const geschaetzt = Number(chance.geschaetzterMonatsumsatz ?? 0);
      if (geschaetzt >= 100) {
        await db.update(revenueOpportunitiesTable)
          .set({ status: "aktiv", prioritaet: 1, updatedAt: new Date() })
          .where(eq(revenueOpportunitiesTable.id, chance.id));
        aktiviert++;
      } else if (geschaetzt >= 30) {
        await db.update(revenueOpportunitiesTable)
          .set({ prioritaet: 2, updatedAt: new Date() })
          .where(eq(revenueOpportunitiesTable.id, chance.id));
      }
    }

    return {
      success: true,
      message: `Chancen-Priorisierung: ${aktiviert} Hochprioritäts-Chancen aktiviert`,
      metadaten: { gepruefte: chancen.length, aktiviert },
    };
  }
}
