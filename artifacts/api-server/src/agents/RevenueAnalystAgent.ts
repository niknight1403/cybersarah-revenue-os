import { db } from "@workspace/db";
import { revenueOpportunitiesTable, agentLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { openai, openaiVerfuegbar } from "../lib/openaiClient";
import { getStripeClient } from "../lib/stripeClient";
import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";

const AFFILIATE_PROGRAMME = [
  { name: "Digistore24 KI-Kurse", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.digistore24.com", geschaetzt: 500, beschreibung: "KI-Kurs-Affiliate mit 40-60% Provision auf digitale Produkte" },
  { name: "Amazon Affiliate KI-Bücher", kanal: "affiliate", marke: "CyberSarah", url: "https://affiliate-program.amazon.de", geschaetzt: 150, beschreibung: "Amazon Partnerprogramm für KI- und Business-Bücher" },
  { name: "Awin Digital Tools", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://www.awin.com/de", geschaetzt: 300, beschreibung: "Awin-Netzwerk: SaaS-Tools, Business-Software, Kurse" },
  { name: "Notion Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.notion.so/affiliates", geschaetzt: 80, beschreibung: "Notion-Affiliate: Produktivitäts-Tool mit recurring Provision" },
  { name: "Canva Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://www.canva.com/affiliates", geschaetzt: 120, beschreibung: "Canva Pro-Affiliate für Content Creator" },
  { name: "MidJourney TikTok Shop", kanal: "eigenes_produkt", marke: "CyberSarah", url: "", geschaetzt: 800, beschreibung: "KI-generierte Prints und Merchandise über TikTok Shop" },
  { name: "KI-Prompt-Pakete", kanal: "eigenes_produkt", marke: "UnternehmerGPT", url: "", geschaetzt: 600, beschreibung: "Premium ChatGPT-Prompt-Pakete für Selbstständige (19-49€)" },
  { name: "1:1 KI-Coaching", kanal: "coaching", marke: "GeldPilot AI", url: "", geschaetzt: 2000, beschreibung: "Hochpreisiges 1:1 KI-Business-Coaching (297-997€/Session)" },
  { name: "Community Membership", kanal: "abo", marke: "CyberSarah", url: "", geschaetzt: 1500, beschreibung: "Monatliches Abo für exklusiven Content + KI-Tools (19€/Monat)" },
  { name: "KI-Masterclass Bundle", kanal: "eigenes_produkt", marke: "UnternehmerGPT", url: "", geschaetzt: 3000, beschreibung: "Komplettes KI-Business-Mastery-Bundle (197€ einmalig)" },
  { name: "Fiverr KI-Services", kanal: "freelance", marke: "CyberSarah", url: "https://www.fiverr.com", geschaetzt: 400, beschreibung: "KI-Content-Erstellung als Service auf Fiverr anbieten" },
  { name: "ClickBank Digitalprodukte", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.clickbank.com", geschaetzt: 350, beschreibung: "ClickBank-Affiliate für Finanz- und Business-Kurse" },
];

export class RevenueAnalystAgent extends AgentBase {
  constructor() {
    super("Revenue Analyst Agent", "revenue_analyst");
  }

  protected beschreibungText(): string {
    return "Scannt Affiliate-Programme, findet echte Umsatzchancen, erstellt Stripe Payment Links — aktiv bei echtem Umsatz";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const aktion = (aufgabe.payload as Record<string, string>)?.aktion ?? "chancen_scannen";

    switch (aktion) {
      case "chancen_scannen":
        return this.scanneChancen();
      case "stripe_link_erstellen":
        return this.erstelleStripeLinks();
      case "ki_chancen_analysieren":
        return this.analysiereKiChancen();
      default:
        return this.scanneChancen();
    }
  }

  private async scanneChancen(): Promise<AufgabeErgebnis> {
    let neue = 0;

    for (const prog of AFFILIATE_PROGRAMME) {
      const vorhandene = await db
        .select()
        .from(revenueOpportunitiesTable)
        .where(eq(revenueOpportunitiesTable.titel, prog.name))
        .limit(1);

      if (vorhandene.length === 0) {
        await db.insert(revenueOpportunitiesTable).values({
          titel: prog.name,
          beschreibung: prog.beschreibung,
          kanal: prog.kanal,
          marke: prog.marke,
          status: "entdeckt",
          geschaetzterMonatsumsatz: prog.geschaetzt.toString(),
          affiliateUrl: prog.url || null,
          gefundenVon: "revenue_analyst",
          prioritaet: prog.geschaetzt >= 500 ? 1 : prog.geschaetzt >= 200 ? 2 : 3,
        });
        neue++;
      }
    }

    if (this.agentId) {
      await db.insert(agentLogsTable).values({
        agentId: this.agentId,
        agentName: "Revenue Analyst Agent",
        aktion: "Chancen-Scan",
        status: "erfolgreich",
        nachricht: `${neue} neue Revenue-Chancen entdeckt | ${AFFILIATE_PROGRAMME.length} Programme gescannt`,
      });
    }

    return {
      success: true,
      message: `Revenue-Scan: ${neue} neue Chancen entdeckt | Gesamt: ${AFFILIATE_PROGRAMME.length} Programme`,
      metadaten: { neueChancen: neue, gesamtProgramme: AFFILIATE_PROGRAMME.length },
    };
  }

  private async erstelleStripeLinks(): Promise<AufgabeErgebnis> {
    const eigeneProdukte = await db
      .select()
      .from(revenueOpportunitiesTable)
      .where(eq(revenueOpportunitiesTable.kanal, "eigenes_produkt"))
      .limit(5);

    let erstellt = 0;

    for (const produkt of eigeneProdukte) {
      if (produkt.stripePaymentLink) continue;

      try {
        const stripe = getStripeClient();
        const preis = Math.round(Number(produkt.geschaetzterMonatsumsatz ?? 97) * 0.1 * 100);

        const stripeProdukt = await stripe.products.create({
          name: produkt.titel,
          description: produkt.beschreibung ?? undefined,
          metadata: { marke: produkt.marke ?? "CyberSarah", kanal: produkt.kanal },
        });

        const stripePreis = await stripe.prices.create({
          product: stripeProdukt.id,
          unit_amount: Math.max(preis, 1900),
          currency: "eur",
        });

        const paymentLink = await stripe.paymentLinks.create({
          line_items: [{ price: stripePreis.id, quantity: 1 }],
          after_completion: { type: "redirect", redirect: { url: "https://cybersarah.de/danke" } },
        });

        await db.update(revenueOpportunitiesTable)
          .set({
            stripePaymentLink: paymentLink.url,
            status: "aktiv",
            updatedAt: new Date(),
          })
          .where(eq(revenueOpportunitiesTable.id, produkt.id));

        erstellt++;
        logger.info({ produkt: produkt.titel, link: paymentLink.url }, "Stripe Payment Link erstellt");
      } catch (err) {
        logger.warn({ err, produkt: produkt.titel }, "Stripe Payment Link Erstellung fehlgeschlagen");
      }
    }

    return {
      success: true,
      message: `${erstellt} Stripe Payment Links erstellt — Produkte sofort verkaufbar`,
      metadaten: { erstellteLinks: erstellt },
    };
  }

  private async analysiereKiChancen(): Promise<AufgabeErgebnis> {
    const aktiveChancen = await db
      .select()
      .from(revenueOpportunitiesTable)
      .where(eq(revenueOpportunitiesTable.status, "aktiv"))
      .orderBy(desc(revenueOpportunitiesTable.tatsaechlicherUmsatz))
      .limit(5);

    const prompt = `Du bist ein Revenue-Stratege für ein KI-Business-System mit 3 Marken: CyberSarah, GeldPilot AI, UnternehmerGPT.

Aktive Revenue-Kanäle: ${aktiveChancen.map(c => `${c.titel} (${c.kanal}): ${c.tatsaechlicherUmsatz}€ tatsächlich`).join(", ")}

Generiere 3 neue, spezifische Revenue-Chancen für den deutschsprachigen Markt 2026. 
Fokus: digitale Produkte, Affiliate-Marketing, Coaching.
Antworte als JSON: {"chancen": [{"titel": "...", "beschreibung": "...", "kanal": "affiliate|eigenes_produkt|abo|coaching", "marke": "CyberSarah|GeldPilot AI|UnternehmerGPT", "geschaetzterMonatsumsatz": 0}]}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: "json_object" },
      });

      const rawContent = completion.choices[0]?.message?.content ?? "{}";
      let chancen: Array<{ titel: string; beschreibung: string; kanal: string; marke: string; geschaetzterMonatsumsatz: number }> = [];

      try {
        const parsed = JSON.parse(rawContent) as Record<string, unknown>;
        chancen = (parsed.chancen as typeof chancen) ?? [];
      } catch {
        return { success: false, message: "KI-Antwort konnte nicht geparst werden", metadaten: {} };
      }

      let neue = 0;
      for (const chance of chancen) {
        if (!chance.titel) continue;
        const vorhandene = await db
          .select()
          .from(revenueOpportunitiesTable)
          .where(eq(revenueOpportunitiesTable.titel, chance.titel))
          .limit(1);

        if (vorhandene.length === 0) {
          await db.insert(revenueOpportunitiesTable).values({
            titel: chance.titel,
            beschreibung: chance.beschreibung,
            kanal: chance.kanal,
            marke: chance.marke,
            status: "entdeckt",
            geschaetzterMonatsumsatz: (chance.geschaetzterMonatsumsatz ?? 0).toString(),
            gefundenVon: "ki_analyse",
            prioritaet: chance.geschaetzterMonatsumsatz >= 500 ? 1 : 2,
          });
          neue++;
        }
      }

      if (this.agentId) {
        await db.insert(agentLogsTable).values({
          agentId: this.agentId,
          agentName: "Revenue Analyst Agent",
          aktion: "KI-Chancen-Analyse",
          status: "erfolgreich",
          nachricht: `GPT-4o-mini: ${neue} neue Revenue-Chancen identifiziert`,
        });
      }

      return {
        success: true,
        message: `KI-Analyse: ${neue} neue Revenue-Chancen entdeckt`,
        metadaten: { neueChancen: neue, analysierte: chancen.length },
      };
    } catch (err) {
      logger.error({ err }, "KI-Chancen-Analyse fehlgeschlagen");
      return { success: false, message: "KI-Analyse fehlgeschlagen", metadaten: {} };
    }
  }
}
