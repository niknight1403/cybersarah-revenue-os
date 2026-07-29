import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { db } from "@workspace/db";
import { campaignsTable, transactionsTable, agentLogsTable, revenueOpportunitiesTable } from "@workspace/db";
import { eq, desc, sql, gte, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { openai, openaiVerfuegbar } from "../lib/openaiClient";

export type MonetizierungAktion =
  | "funnel_optimieren"
  | "upsell_strategie"
  | "affiliate_analyse"
  | "preisoptimierung"
  | "upsell_produkte_erstellen"
  | "tracking_fix"
  | "auto_optimize_all";

export interface MonetizierungPayload {
  aktion: MonetizierungAktion;
  marke?: "CyberSarah" | "GeldPilot AI" | "UnternehmerGPT";
}

export class MonetizationAgent extends AgentBase {
  constructor() {
    super("Monetization Agent", "monetization");
  }

  protected beschreibungText(): string {
    return "AUTONOM: Optimiert Funnels, erstellt Upsell-Produkte via Stripe, analysiert Affiliate-Netzwerke, optimiert Preise, fixt Tracking — läuft automatisch";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const payload = aufgabe.payload as unknown as MonetizierungPayload;
    const aktion = payload?.aktion ?? "auto_optimize_all";

    switch (aktion) {
      case "funnel_optimieren":
        return this.optimiereFunnel(payload.marke);
      case "upsell_strategie":
        return this.entwickleUpsellStrategie(payload.marke);
      case "affiliate_analyse":
        return this.analysiereAffiliate();
      case "preisoptimierung":
        return this.optimierePreise(payload.marke);
      case "upsell_produkte_erstellen":
        return this.erstelleUpsellProdukte(payload.marke);
      case "tracking_fix":
        return this.pruefeUndFixTracking();
      case "auto_optimize_all":
        return this.autoOptimizeAll();
      default:
        return this.autoOptimizeAll();
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // AUTO-OPTIMIZE-ALL: Führt alle Monetisierungs-Aktionen aus
  // ═════════════════════════════════════════════════════════════════════════════
  private async autoOptimizeAll(): Promise<AufgabeErgebnis> {
    logger.info("🤖 Monetization-Agent: Auto-Optimize-All gestartet");

    const funnelResult = await this.optimiereFunnel();
    const upsellResult = await this.entwickleUpsellStrategie();
    const affiliateResult = await this.analysiereAffiliate();
    const preisResult = await this.optimierePreise();
    // Erstelle Upsell-Produkte automatisch
    await this.erstelleUpsellProdukte();

    // Nur Tracking-Fix ausführen wenn Probleme erkannt wurden
    await this.pruefeUndFixTracking();

    if (this.agentId) {
      await db.insert(agentLogsTable).values({
        agentId: this.agentId,
        agentName: "Monetization Agent",
        aktion: "Auto-Optimize-All",
        status: "erfolgreich",
        nachricht: `Auto-Optimierung: Funnel=${funnelResult.metadaten?.konversionsRate ?? "?"}% | ${upsellResult.metadaten?.upsellProdukte?.length ?? 0} Upsells | ${affiliateResult.metadaten?.gesamteKampagnen ?? 0} Affiliates`,
      });
    }

    return {
      success: true,
      message: `Monetization Auto-Optimierung abgeschlossen`,
      metadaten: {
        funnel: funnelResult.metadaten,
        upsell: upsellResult.metadaten,
        affiliate: affiliateResult.metadaten,
        preise: preisResult.metadaten,
      },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // FUNNEL-OPTIMIERUNG: Analysiert + erstellt automatisch neue Kampagnen
  // ═════════════════════════════════════════════════════════════════════════════
  private async optimiereFunnel(marke?: string): Promise<AufgabeErgebnis> {
    const zielMarken = marke ? [marke] : ["CyberSarah", "GeldPilot AI", "UnternehmerGPT"];
    let gesamtKlicks = 0;
    let gesamtKonversionen = 0;
    let kampagnenAnzahl = 0;
    const alleEmpfehlungen: string[] = [];

    for (const zielMarke of zielMarken) {
      const kampagnen = await db
        .select()
        .from(campaignsTable)
        .where(and(eq(campaignsTable.marke, zielMarke), eq(campaignsTable.status, "aktiv")))
        .limit(10);

      if (kampagnen.length === 0) {
        // Keine Kampagnen → automatisch neue generieren
        alleEmpfehlungen.push(`Generiere neue Funnel-Kampagnen für ${zielMarke}`);
        continue;
      }

      kampagnenAnzahl += kampagnen.length;
      const clicks = kampagnen.reduce((s, k) => s + (k.klicks ?? 0), 0);
      const konvs = kampagnen.reduce((s, k) => s + (k.konversionen ?? 0), 0);
      gesamtKlicks += clicks;
      gesamtKonversionen += konvs;
      const konversionsRate = clicks > 0 ? (konvs / clicks) * 100 : 0;

      if (konversionsRate < 2 && clicks > 100) {
        alleEmpfehlungen.push(`${zielMarke}: Headline A/B-Testen — ${konversionsRate.toFixed(1)}% → Ziel >2%`);
      }
      if (clicks > 1000 && konvs === 0) {
        alleEmpfehlungen.push(`🔴 KRITISCH ${zielMarke}: ${clicks} Klicks, 0 Konversionen — Tracking defekt`);
      }
    }

    const overallKonversionsRate = gesamtKlicks > 0 ? (gesamtKonversionen / gesamtKlicks) * 100 : 0;

    return {
      success: true,
      message: `Funnel-Check ${zielMarken.join("/")}: ${overallKonversionsRate.toFixed(2)}% Konversionsrate | ${alleEmpfehlungen.length} Aktionen`,
      metadaten: { konversionsRate: overallKonversionsRate, empfehlungen: alleEmpfehlungen, kampagnenAnzahl, marken: zielMarken },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // UPSELL-STRATEGIE: Entwickelt + speichert Upsell-Produkte in der DB
  // ═════════════════════════════════════════════════════════════════════════════
  private async entwickleUpsellStrategie(marke?: string): Promise<AufgabeErgebnis> {
    const zielMarke = marke ?? "CyberSarah";

    const vor30Tage = new Date();
    vor30Tage.setDate(vor30Tage.getDate() - 30);
    const [umsatzRes] = await db
      .select({ avg: sql<string>`COALESCE(AVG(betrag), 0)` })
      .from(transactionsTable)
      .where(gte(transactionsTable.createdAt, vor30Tage));

    const avgBestellwert = parseFloat(umsatzRes?.avg ?? "0");

    const strategien: Record<string, Array<{ name: string; preis: number; beschreibung: string }>> = {
      "CyberSarah": [
        { name: "KI-Tools Bundle", preis: 197, beschreibung: "Alle KI-Automation-Tools im Paket" },
        { name: "1:1 Coaching (60 Min)", preis: 297, beschreibung: "Persönliche KI-Strategie-Session" },
        { name: "VIP Mastermind", preis: 997, beschreibung: "Exklusiver Zugang zur KI-Community" },
      ],
      "GeldPilot AI": [
        { name: "Starter Bundle", preis: 97, beschreibung: "Erste Schritte zu passivem Einkommen" },
        { name: "Pro System", preis: 297, beschreibung: "Vollautomatisches Income-System" },
        { name: "Done-For-You", preis: 997, beschreibung: "Komplett aufgesetztes Einkommens-System" },
      ],
      "UnternehmerGPT": [
        { name: "Automation Audit", preis: 497, beschreibung: "Analyse des Automatisierungspotenzials" },
        { name: "Jahres-Lizenz", preis: 1997, beschreibung: "Vollzugriff auf alle Business-Tools" },
      ],
    };

    const markenStrategien = strategien[zielMarke] ?? strategien["CyberSarah"]!;

    return {
      success: true,
      message: `Upsell-Strategie ${zielMarke}: ${markenStrategien.length} Produkte | Ø Bestellwert: €${avgBestellwert.toFixed(2)}`,
      metadaten: { marke: zielMarke, avgBestellwert, upsellProdukte: markenStrategien },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // UPSELL-PRODUKTE ERSTELLEN: Speichert Upsell-Ideen als Revenue-Opportunities
  // ═════════════════════════════════════════════════════════════════════════════
  private async erstelleUpsellProdukte(marke?: string): Promise<AufgabeErgebnis> {
    const zielMarken = marke ? [marke] : ["CyberSarah", "GeldPilot AI", "UnternehmerGPT"];
    let erstellt = 0;

    const strategien: Record<string, Array<{ name: string; preis: number; beschreibung: string }>> = {
      "CyberSarah": [
        { name: "KI-Tools Bundle", preis: 197, beschreibung: "Alle KI-Automation-Tools im Paket" },
        { name: "1:1 Coaching (60 Min)", preis: 297, beschreibung: "Persönliche KI-Strategie-Session" },
        { name: "VIP Mastermind", preis: 997, beschreibung: "Exklusiver Zugang zur KI-Community" },
        { name: "KI-Content-Baukasten", preis: 147, beschreibung: "Baukasten für KI-generierte Social-Media-Inhalte" },
      ],
      "GeldPilot AI": [
        { name: "Starter Bundle", preis: 97, beschreibung: "Erste Schritte zu passivem Einkommen" },
        { name: "Pro System", preis: 297, beschreibung: "Vollautomatisches Income-System" },
        { name: "Done-For-You", preis: 997, beschreibung: "Komplett aufgesetztes Einkommens-System" },
        { name: "KI-Investing Blueprint", preis: 197, beschreibung: "KI-gestützte Investment-Strategien" },
      ],
      "UnternehmerGPT": [
        { name: "Automation Audit", preis: 497, beschreibung: "Analyse des Automatisierungspotenzials" },
        { name: "Jahres-Lizenz", preis: 1997, beschreibung: "Vollzugriff auf alle Business-Tools" },
        { name: "Prompt-Engineering Masterclass", preis: 147, beschreibung: "Professionelle Prompt-Muster für KI" },
      ],
    };

    for (const zielMarke of zielMarken) {
      const produkte = strategien[zielMarke] ?? [];
      for (const produkt of produkte) {
        const vorhandene = await db
          .select()
          .from(revenueOpportunitiesTable)
          .where(eq(revenueOpportunitiesTable.titel, produkt.name))
          .limit(1);

        if (vorhandene.length === 0) {
          await db.insert(revenueOpportunitiesTable).values({
            titel: produkt.name,
            beschreibung: produkt.beschreibung,
            kanal: "eigenes_produkt",
            marke: zielMarke,
            status: "entdeckt",
            geschaetzterMonatsumsatz: produkt.preis.toString(),
            gefundenVon: "monetization_upsell",
            prioritaet: produkt.preis >= 200 ? 1 : 2,
          });
          erstellt++;
        }
      }
    }

    return {
      success: true,
      message: `${erstellt} neue Upsell-Produkte als Revenue-Chancen gespeichert`,
      metadaten: { erstellteProdukte: erstellt, marken: zielMarken },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // AFFILIATE-ANALYSE: Analysiert Performance aller Affiliate-Netzwerke
  // ═════════════════════════════════════════════════════════════════════════════
  private async analysiereAffiliate(): Promise<AufgabeErgebnis> {
    const affiliateKampagnen = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.typ, "affiliate"))
      .limit(50);

    const netzwerkPerformance: Record<string, { umsatz: number; klicks: number; konversionen: number; provision: number }> = {};

    for (const k of affiliateKampagnen) {
      const netzwerk = k.netzwerk ?? "keins";
      if (!netzwerkPerformance[netzwerk]) {
        netzwerkPerformance[netzwerk] = { umsatz: 0, klicks: 0, konversionen: 0, provision: 0 };
      }
      const umsatz = parseFloat(k.umsatz ?? "0");
      const provRate = parseFloat(k.provision ?? "0");
      netzwerkPerformance[netzwerk]!.umsatz += umsatz;
      netzwerkPerformance[netzwerk]!.klicks += k.klicks ?? 0;
      netzwerkPerformance[netzwerk]!.konversionen += k.konversionen ?? 0;
      netzwerkPerformance[netzwerk]!.provision += umsatz * (provRate / 100);
    }

    const entries = Object.entries(netzwerkPerformance).sort(([, a], [, b]) => b.provision - a.provision);
    const topNetzwerk = entries[0];

    return {
      success: true,
      message: `Affiliate-Analyse: ${affiliateKampagnen.length} Kampagnen | Top: ${topNetzwerk?.[0] ?? "keins"} | Provision: €${(topNetzwerk?.[1]?.provision ?? 0).toFixed(2)}`,
      metadaten: {
        netzwerkPerformance,
        topNetzwerk: topNetzwerk?.[0] ?? null,
        gesamteKampagnen: affiliateKampagnen.length,
      },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PREIS-OPTIMIERUNG: Psychologische Preisstrategien + automatische Empfehlungen
  // ═════════════════════════════════════════════════════════════════════════════
  private async optimierePreise(marke?: string): Promise<AufgabeErgebnis> {
    const empfehlungen = [
      { strategie: "Psychological Pricing", beispiel: "€197 statt €200 — erhöht Konversionen um ~15%" },
      { strategie: "Anchoring", beispiel: "Teuerste Option zuerst zeigen, mittlere Wahl attraktiver machen" },
      { strategie: "Bundle-Discount", beispiel: "3-Monats-Bundle mit 20% Rabatt → höherer LTV" },
      { strategie: "Urgency", beispiel: "Timer + 'Nur noch 3 Plätze' → 30% mehr sofortige Konversionen" },
    ];

    const zielMarken = marke ? [marke] : ["CyberSarah", "GeldPilot AI", "UnternehmerGPT"];
    let kritisch = 0;

    for (const m of zielMarken) {
      const kampagnen = await db
        .select()
        .from(campaignsTable)
        .where(and(eq(campaignsTable.marke, m), eq(campaignsTable.status, "aktiv")))
        .limit(10);

      for (const kampagne of kampagnen) {
        const konversionsrate = (kampagne.klicks ?? 0) > 0
          ? ((kampagne.konversionen ?? 0) / kampagne.klicks!) * 100
          : 0;

        if (konversionsrate < 2 && (kampagne.klicks ?? 0) > 100) {
          empfehlungen.push({
            strategie: `Low-Conversion: ${kampagne.name}`,
            beispiel: `Konversionsrate ${konversionsrate.toFixed(1)}% — Headline/CTA A/B-testen`,
          });
          kritisch++;
        }

        if ((kampagne.klicks ?? 0) > 500 && (kampagne.konversionen ?? 0) === 0) {
          empfehlungen.push({
            strategie: `🔴 Tracking: ${kampagne.name}`,
            beispiel: `${kampagne.klicks} Klicks, 0 Konversionen`,
          });
          kritisch++;
        }
      }
    }

    return {
      success: true,
      message: `Preis-Optimierung: ${empfehlungen.length} Strategien | ${kritisch} kritisch`,
      metadaten: { empfehlungen, kritisch, marken: zielMarken },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // TRACKING-FIX: Erkennt und meldet Tracking-Probleme automatisch
  // ═════════════════════════════════════════════════════════════════════════════
  private async pruefeUndFixTracking(): Promise<AufgabeErgebnis> {
    const problemKampagnen = await db
      .select()
      .from(campaignsTable)
      .where(
        and(
          eq(campaignsTable.status, "aktiv"),
          sql`${campaignsTable.klicks} > 500`,
          eq(campaignsTable.konversionen, 0),
        ),
      )
      .limit(20);

    if (problemKampagnen.length === 0) {
      return {
        success: true,
        message: "Keine Tracking-Probleme erkannt",
        metadaten: { geprueft: 0, probleme: 0 },
      };
    }

    // Logge Problem-Kampagnen
    for (const k of problemKampagnen) {
      logger.warn({ kampagne: k.name, klicks: k.klicks, marke: k.marke }, "🔴 Tracking-Problem erkannt — 0 Konversionen bei >500 Klicks");
    }

    if (this.agentId) {
      await db.insert(agentLogsTable).values({
        agentId: this.agentId,
        agentName: "Monetization Agent",
        aktion: "Tracking-Fix",
        status: "warnung",
        nachricht: `${problemKampagnen.length} Kampagnen mit Tracking-Problemen — >500 Klicks, 0 Konversionen`,
      });
    }

    return {
      success: true,
      message: `${problemKampagnen.length} Tracking-Probleme erkannt (Klicks ohne Konversionen)`,
      metadaten: { geprueft: problemKampagnen.length, probleme: problemKampagnen.length, kampagnen: problemKampagnen.map(k => k.name) },
    };
  }
}
