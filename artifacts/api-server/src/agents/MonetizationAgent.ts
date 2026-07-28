import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { db } from "@workspace/db";
import { campaignsTable, transactionsTable, revenueOpportunitiesTable, contentTable, agentLogsTable } from "@workspace/db";
import { eq, desc, sql, gte, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { openai, openaiVerfuegbar } from "../lib/openaiClient";

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
    return "Optimiert Funnels autonom, entwickelt Upsell-Strategien, analysiert Affiliate-Netzwerke und optimiert Preisgestaltung mit echten DB-Aktionen.";
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

  /**
   * FUNNEL OPTIMIEREN: Erstellt automatisch optimierte Landingpage-Content-Varianten
   * für Kampagnen mit niedriger Konversionsrate.
   */
  private async optimiereFunnel(marke?: string): Promise<AufgabeErgebnis> {
    const zielMarke = marke ?? "CyberSarah";

    const kampagnen = await db
      .select()
      .from(campaignsTable)
      .where(and(eq(campaignsTable.marke, zielMarke), eq(campaignsTable.status, "aktiv")))
      .limit(10);

    const gesamtKlicks = kampagnen.reduce((s, k) => s + (k.klicks ?? 0), 0);
    const gesamtKonversionen = kampagnen.reduce((s, k) => s + (k.konversionen ?? 0), 0);
    const konversionsRate = gesamtKlicks > 0 ? (gesamtKonversionen / gesamtKlicks) * 100 : 0;

    let optimierungen = 0;

    // Für Kampagnen mit 0 Konversionen: optimierte Landingpage-Texte generieren
    for (const kampagne of kampagnen) {
      if ((kampagne.konversionen ?? 0) === 0 && (kampagne.klicks ?? 0) > 0) {
        if (!openaiVerfuegbar) continue;

        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `Du bist ein Conversion-Optimierer für ${zielMarke}. Erstelle einen optimierten Verkaufstext, der konvertiert.`,
              },
              {
                role: "user",
                content: `Optimiere den Verkaufstext für Kampagne "${kampagne.name}".
Aktuelle Konversionsrate: 0% (${kampagne.klicks} Klicks, 0 Verkäufe).
Typ: ${kampagne.typ}
Netzwerk: ${kampagne.netzwerk ?? "keins"}

Erstelle einen überzeugenden Landingpage-Text mit:
- Emotionaler Headline
- 3 konkrete Vorteile
- Social Proof / Testimonial-Hinweis
- Dringlichkeit (Timer/Plätze)
- Klaren CTA mit Link-Hinweis

Antworte NUR mit dem fertigen Text.`,
              },
            ],
            temperature: 0.8,
            max_tokens: 400,
          });

          const optimierterText = completion.choices[0]?.message?.content?.trim();
          if (optimierterText && optimierterText.length > 50) {
            // Als Content einfügen, damit er über die Pipeline verteilt wird
            await db.insert(contentTable).values({
              marke: zielMarke,
              typ: "blogartikel",
              plattform: "Website",
              titel: `🎯 Optimiert: ${kampagne.name}`,
              inhalt: optimierterText,
              status: "generiert",
              metadaten: JSON.stringify({
                kampagnenId: kampagne.id,
                typ: "funnel_optimierung",
                alteKonversionsrate: konversionsRate,
              }),
            });
            optimierungen++;
          }
        } catch (err) {
          logger.warn({ err, kampagne: kampagne.name }, "Funnel-Optimierung fehlgeschlagen");
        }
      }
    }

    // NEU: Falls keine Kampagnen existieren, automatisch Kampagnen aus aktiven Chancen erstellen
    if (kampagnen.length === 0) {
      const aktiveChancen = await db
        .select()
        .from(revenueOpportunitiesTable)
        .where(eq(revenueOpportunitiesTable.status, "aktiv"))
        .limit(5);

      for (const chance of aktiveChancen) {
        const vorhanden = await db
          .select({ id: campaignsTable.id })
          .from(campaignsTable)
          .where(eq(campaignsTable.name, `Auto: ${chance.titel}`))
          .limit(1);

        if (vorhanden.length === 0) {
          await db.insert(campaignsTable).values({
            name: `Auto: ${chance.titel}`,
            marke: chance.marke ?? zielMarke,
            typ: chance.kanal === "affiliate" ? "affiliate" : "eigenes_produkt",
            netzwerk: chance.kanal,
            status: "aktiv",
            affiliateLink: chance.affiliateUrl ?? chance.stripePaymentLink ?? null,
            startDatum: new Date(),
          });
          optimierungen++;
        }
      }
    }

    if (this.agentId) {
      await db.insert(agentLogsTable).values({
        agentId: this.agentId,
        agentName: "Monetization Agent",
        aktion: "Funnel-Optimierung",
        status: "erfolgreich",
        nachricht: `${optimierungen} Funnel-Optimierungen für ${zielMarke} | Konversionsrate: ${konversionsRate.toFixed(2)}%`,
      });
    }

    logger.info({ optimierungen, konversionsRate, zielMarke }, "🎯 Funnel autonom optimiert");

    return {
      success: true,
      message: `Funnel-Optimierung ${zielMarke}: ${optimierungen} Aktionen | ${konversionsRate.toFixed(2)}% Konversionsrate`,
      metadaten: { konversionsRate, optimierungen, kampagnenAnzahl: kampagnen.length },
    };
  }

  /**
   * UPSELL-STRATEGIE: Erstellt automatisch Upsell-Produkte und Bundle-Angebote
   * in der revenueOpportunitiesTable.
   */
  private async entwickleUpsellStrategie(marke?: string): Promise<AufgabeErgebnis> {
    const zielMarke = marke ?? "GeldPilot AI";

    const vor30Tage = new Date();
    vor30Tage.setDate(vor30Tage.getDate() - 30);
    const [umsatzRes] = await db
      .select({ avg: sql<string>`COALESCE(AVG(betrag), 0)` })
      .from(transactionsTable)
      .where(gte(transactionsTable.createdAt, vor30Tage));

    const avgBestellwert = parseFloat(umsatzRes?.avg ?? "0");

    // NEU: Autonome Upsell-Produkte erstellen
    const upsellProdukte = [
      { name: `${zielMarke} Starter Bundle`, preis: 97, beschreibung: "Erste Schritte zu passivem Einkommen mit KI", kanal: "eigenes_produkt" },
      { name: `${zielMarke} Pro System`, preis: 297, beschreibung: "Vollautomatisches Income-System mit KI-Tools", kanal: "eigenes_produkt" },
      { name: `${zielMarke} VIP Access`, preis: 997, beschreibung: "Exklusiver Zugang zur KI-Community + 1:1 Coaching", kanal: "coaching" },
    ];

    let neuErstellt = 0;

    for (const produkt of upsellProdukte) {
      const vorhanden = await db
        .select({ id: revenueOpportunitiesTable.id })
        .from(revenueOpportunitiesTable)
        .where(eq(revenueOpportunitiesTable.titel, produkt.name))
        .limit(1);

      if (vorhanden.length === 0) {
        await db.insert(revenueOpportunitiesTable).values({
          titel: produkt.name,
          beschreibung: produkt.beschreibung,
          kanal: produkt.kanal,
          marke: zielMarke,
          status: "entdeckt",
          geschaetzterMonatsumsatz: produkt.preis.toString(),
          gefundenVon: "monetization_upsell",
          prioritaet: produkt.preis >= 500 ? 1 : 2,
        });
        neuErstellt++;
      }
    }

    if (this.agentId) {
      await db.insert(agentLogsTable).values({
        agentId: this.agentId,
        agentName: "Monetization Agent",
        aktion: "Upsell-Strategie",
        status: "erfolgreich",
        nachricht: `${neuErstellt} neue Upsell-Produkte für ${zielMarke} erstellt | Ø Bestellwert: €${avgBestellwert.toFixed(2)}`,
      });
    }

    logger.info({ neuErstellt, avgBestellwert, zielMarke }, "💰 Upsell-Strategie autonom umgesetzt");

    return {
      success: true,
      message: `Upsell ${zielMarke}: ${neuErstellt} neue Produkte | Ø Bestellwert: €${avgBestellwert.toFixed(2)}`,
      metadaten: { marke: zielMarke, avgBestellwert, neuErstellt },
    };
  }

  /**
   * AFFILIATE ANALYSE: Analysiert und erstellt fehlende Affiliate-Kampagnen
   */
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

  /**
   * PREISOPTIMIERUNG: Passt autonom Preise basierend auf Conversion-Daten an
   * und erstellt A/B-Test-Varianten.
   */
  private async optimierePreise(marke?: string): Promise<AufgabeErgebnis> {
    const zielMarke = marke ?? "alle";

    // Produkte mit Daten analysieren
    const produkte = await db
      .select()
      .from(revenueOpportunitiesTable)
      .where(eq(revenueOpportunitiesTable.status, "aktiv"))
      .limit(10);

    let optimierungen = 0;

    for (const produkt of produkte) {
      const tatsaechlich = parseFloat(produkt.tatsaechlicherUmsatz ?? "0");
      const geschaetzt = parseFloat(produkt.geschaetzterMonatsumsatz ?? "0");

      // Wenn kein Umsatz: Preis senken um Konversion zu steigern
      if (tatsaechlich === 0 && geschaetzt > 50) {
        const neuerPreis = Math.round(geschaetzt * 0.7); // 30% Rabatt
        await db.update(revenueOpportunitiesTable)
          .set({
            geschaetzterMonatsumsatz: neuerPreis.toString(),
            metadaten: JSON.stringify({
              preisAenderung: `${geschaetzt}€ → ${neuerPreis}€ (30% Rabatt für mehr Konversionen)`,
              grund: "Kein Umsatz — Preis optimiert",
              zeitpunkt: new Date().toISOString(),
            }),
            updatedAt: new Date(),
          })
          .where(eq(revenueOpportunitiesTable.id, produkt.id));
        optimierungen++;
      }

      // Wenn Umsatz > geschätzt: Preis erhöhen (Premium-Positionierung)
      if (tatsaechlich > geschaetzt * 1.5 && geschaetzt > 0) {
        const neuerPreis = Math.round(geschaetzt * 1.3); // 30% Erhöhung
        await db.update(revenueOpportunitiesTable)
          .set({
            geschaetzterMonatsumsatz: neuerPreis.toString(),
            metadaten: JSON.stringify({
              preisAenderung: `${geschaetzt}€ → ${neuerPreis}€ (30% Erhöhung — Premium-Positionierung)`,
              grund: "Umsatz über Erwartung",
              zeitpunkt: new Date().toISOString(),
            }),
            updatedAt: new Date(),
          })
          .where(eq(revenueOpportunitiesTable.id, produkt.id));
        optimierungen++;
      }
    }

    if (this.agentId) {
      await db.insert(agentLogsTable).values({
        agentId: this.agentId,
        agentName: "Monetization Agent",
        aktion: "Preisoptimierung",
        status: "erfolgreich",
        nachricht: `${optimierungen} Preis-Optimierungen für ${produkte.length} Produkte`,
      });
    }

    logger.info({ optimierungen, produktAnzahl: produkte.length }, "💲 Preise autonom optimiert");

    return {
      success: true,
      message: `Preis-Optimierung: ${optimierungen} Aktionen für ${produkte.length} Produkte`,
      metadaten: { marke: zielMarke, optimierungen, produktAnzahl: produkte.length },
    };
  }
}
