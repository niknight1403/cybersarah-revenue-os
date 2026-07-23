import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { db } from "@workspace/db";
import { campaignsTable, transactionsTable, agentLogsTable } from "@workspace/db";
import { eq, desc, sql, gte, and } from "drizzle-orm";
import { logger } from "../lib/logger";

export type MonetizierungAktion =
  | "funnel_optimieren"
  | "upsell_strategie"
  | "affiliate_analyse"
  | "preisoptimierung";

export interface MonetizierungPayload {
  aktion: MonetizierungAktion;
  marke?: "CyberSarah" | "GeldPilot AI" | "UnternehmerGPT";
}

const AFFILIATE_NETZWERKE = {
  "Digistore24": { provision: 0.4, minAuszahlung: 50 },
  "Awin": { provision: 0.08, minAuszahlung: 20 },
  "Amazon PartnerNet": { provision: 0.05, minAuszahlung: 10 },
};

export class MonetizationAgent extends AgentBase {
  constructor() {
    super("Monetization Agent", "monetization");
  }

  protected beschreibungText(): string {
    return "Optimiert Funnels, entwickelt Upsell-Strategien, analysiert Affiliate-Netzwerke und optimiert Preisgestaltung.";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const payload = aufgabe.payload as unknown as MonetizierungPayload;

    switch (payload.aktion) {
      case "funnel_optimieren":
        return this.optimiereFunnel(payload.marke);
      case "upsell_strategie":
        return this.entwickleUpsellStrategie(payload.marke);
      case "affiliate_analyse":
        return this.analysiereAffiliate();
      case "preisoptimierung":
        return this.optimierePreise(payload.marke);
      default:
        return { success: false, message: `Unbekannte Monetisierungs-Aktion: ${payload.aktion}` };
    }
  }

  private async optimiereFunnel(marke?: string): Promise<AufgabeErgebnis> {
    const zielMarke = marke ?? "CyberSarah";

    const kampagnen = await db
      .select()
      .from(campaignsTable)
      .where(and(eq(campaignsTable.marke, zielMarke), eq(campaignsTable.status, "aktiv")))
      .limit(5);

    const gesamtKlicks = kampagnen.reduce((s, k) => s + (k.klicks ?? 0), 0);
    const gesamtKonversionen = kampagnen.reduce((s, k) => s + (k.konversionen ?? 0), 0);
    const konversionsRate = gesamtKlicks > 0 ? (gesamtKonversionen / gesamtKlicks) * 100 : 0;

    const empfehlungen: string[] = [];

    if (konversionsRate < 2) {
      empfehlungen.push("Headline auf Landingpage A/B-testen — Ziel: >2% Konversionsrate");
      empfehlungen.push("Social Proof (Testimonials) über dem Fold platzieren");
    }
    if (konversionsRate >= 2 && konversionsRate < 5) {
      empfehlungen.push("Exit-Intent Popup mit 10% Rabatt aktivieren");
      empfehlungen.push("Checkout-Prozess auf 1-Klick optimieren");
    }
    if (gesamtKlicks > 1000 && gesamtKonversionen === 0) {
      empfehlungen.push("KRITISCH: Tracking-Pixel überprüfen — Konversionen werden nicht erfasst");
    }

    const funnel_schritte = [
      { schritt: "Awareness", kanal: "TikTok/Instagram", ziel: "10.000 Views/Tag" },
      { schritt: "Interest", kanal: "YouTube/Blog", ziel: "500 Klicks/Tag" },
      { schritt: "Decision", kanal: "Landingpage", ziel: "5% Konversionsrate" },
      { schritt: "Action", kanal: "Checkout", ziel: "€50 CAC" },
    ];

    return {
      success: true,
      message: `Funnel-Analyse ${zielMarke}: ${konversionsRate.toFixed(2)}% Konversionsrate | ${empfehlungen.length} Optimierungen`,
      metadaten: { konversionsRate, empfehlungen, funnel_schritte, kampagnenAnzahl: kampagnen.length },
    };
  }

  private async entwickleUpsellStrategie(marke?: string): Promise<AufgabeErgebnis> {
    const zielMarke = marke ?? "GeldPilot AI";

    const vor30Tage = new Date();
    vor30Tage.setDate(vor30Tage.getDate() - 30);
    const [umsatzRes] = await db
      .select({ avg: sql<string>`COALESCE(AVG(betrag), 0)` })
      .from(transactionsTable)
      .where(gte(transactionsTable.createdAt, vor30Tage));

    const avgBestellwert = parseFloat(umsatzRes?.avg ?? "0");

    const strategien = {
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

    const markenStrategien = strategien[zielMarke as keyof typeof strategien] ?? strategien["CyberSarah"];

    return {
      success: true,
      message: `Upsell-Strategie ${zielMarke}: ${markenStrategien.length} Produkte | Ø Bestellwert: €${avgBestellwert.toFixed(2)}`,
      metadaten: { marke: zielMarke, avgBestellwert, upsellProdukte: markenStrategien },
    };
  }

  private async analysiereAffiliate(): Promise<AufgabeErgebnis> {
    const affiliateKampagnen = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.typ, "affiliate"))
      .limit(20);

    const netzwerkPerformance = affiliateKampagnen.reduce(
      (acc, k) => {
        const netzwerk = k.netzwerk ?? "keins";
        if (!acc[netzwerk]) {
          acc[netzwerk] = { umsatz: 0, klicks: 0, konversionen: 0, provision: 0 };
        }
        const umsatz = parseFloat(k.umsatz ?? "0");
        const prov = parseFloat(k.provision ?? "0");
        acc[netzwerk]!.umsatz += umsatz;
        acc[netzwerk]!.klicks += k.klicks ?? 0;
        acc[netzwerk]!.konversionen += k.konversionen ?? 0;
        acc[netzwerk]!.provision += umsatz * (prov / 100);
        return acc;
      },
      {} as Record<string, { umsatz: number; klicks: number; konversionen: number; provision: number }>,
    );

    const topNetzwerk = Object.entries(netzwerkPerformance).sort(
      ([, a], [, b]) => b.provision - a.provision,
    )[0];

    return {
      success: true,
      message: `Affiliate-Analyse: ${affiliateKampagnen.length} Kampagnen | Top-Netzwerk: ${topNetzwerk?.[0] ?? "keins"}`,
      metadaten: {
        netzwerkPerformance,
        topNetzwerk: topNetzwerk?.[0] ?? null,
        gesamtKampagnen: affiliateKampagnen.length,
        netzwerkKonfig: AFFILIATE_NETZWERKE,
      },
    };
  }

  private async optimierePreise(marke?: string): Promise<AufgabeErgebnis> {
    const empfehlungen = [
      { strategie: "Psychological Pricing", beispiel: "€197 statt €200 — erhöht Konversionen um ~15%" },
      { strategie: "Anchoring", beispiel: "Teuerste Option zuerst zeigen, mittlere Wahl attraktiver machen" },
      { strategie: "Bundle-Discount", beispiel: "3-Monats-Bundle mit 20% Rabatt → höherer LTV" },
      { strategie: "Urgency", beispiel: "Timer + 'Nur noch 3 Plätze' → 30% mehr sofortige Konversionen" },
    ];

    return {
      success: true,
      message: `Preis-Optimierung: ${empfehlungen.length} Strategien identifiziert für ${marke ?? "alle Marken"}`,
      metadaten: { marke: marke ?? "alle", empfehlungen },
    };
  }
}
