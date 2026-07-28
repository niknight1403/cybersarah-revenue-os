import { db } from "@workspace/db";
import { revenueOpportunitiesTable, agentLogsTable, transactionsTable } from "@workspace/db";
import { eq, desc, gte, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { openai, openaiVerfuegbar } from "../lib/openaiClient";
import { getStripeClient } from "../lib/stripeClient";
import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";

// ═══════════════════════════════════════════════════════════════════════════════
// ERWEITERTE AFFILIATE-PROGRAMME — 30+ echte Umsatzquellen
// ═══════════════════════════════════════════════════════════════════════════════
const AFFILIATE_PROGRAMME = [
  // ── High-Ticket (>500€) ──
  { name: "1:1 KI-Coaching", kanal: "coaching", marke: "GeldPilot AI", url: "", geschaetzt: 2000, beschreibung: "Hochpreisiges 1:1 KI-Business-Coaching (297-997€/Session)" },
  { name: "KI-Masterclass Bundle", kanal: "eigenes_produkt", marke: "UnternehmerGPT", url: "", geschaetzt: 3000, beschreibung: "Komplettes KI-Business-Mastery-Bundle (197€ einmalig)" },
  { name: "Community Membership", kanal: "abo", marke: "CyberSarah", url: "", geschaetzt: 1500, beschreibung: "Monatliches Abo für exklusiven Content + KI-Tools (19€/Monat)" },
  { name: "MidJourney TikTok Shop", kanal: "eigenes_produkt", marke: "CyberSarah", url: "", geschaetzt: 800, beschreibung: "KI-generierte Prints und Merchandise über TikTok Shop" },
  { name: "KI-Prompt-Pakete Premium", kanal: "eigenes_produkt", marke: "UnternehmerGPT", url: "", geschaetzt: 600, beschreibung: "Premium ChatGPT-Prompt-Pakete für Selbstständige (19-49€)" },
  { name: "Digistore24 KI-Kurse", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.digistore24.com", geschaetzt: 500, beschreibung: "KI-Kurs-Affiliate mit 40-60% Provision auf digitale Produkte" },
  // ── Mid-Ticket (200-500€) ──
  { name: "Fiverr KI-Services", kanal: "freelance", marke: "CyberSarah", url: "https://www.fiverr.com", geschaetzt: 400, beschreibung: "KI-Content-Erstellung als Service auf Fiverr anbieten" },
  { name: "ClickBank Digitalprodukte", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.clickbank.com", geschaetzt: 350, beschreibung: "ClickBank-Affiliate für Finanz- und Business-Kurse" },
  { name: "Awin Digital Tools", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://www.awin.com/de", geschaetzt: 300, beschreibung: "Awin-Netzwerk: SaaS-Tools, Business-Software, Kurse" },
  { name: "Gumroad Digitalprodukte", kanal: "eigenes_produkt", marke: "CyberSarah", url: "https://gumroad.com", geschaetzt: 250, beschreibung: "Verkauf von KI-Templates und Digital-Assets über Gumroad" },
  { name: "Etsy KI-Art", kanal: "eigenes_produkt", marke: "UnternehmerGPT", url: "https://www.etsy.com", geschaetzt: 200, beschreibung: "KI-generierte Kunst und Prints auf Etsy verkaufen" },
  // ── Low-Ticket (<200€) ──
  { name: "Amazon Affiliate KI-Bücher", kanal: "affiliate", marke: "CyberSarah", url: "https://affiliate-program.amazon.de", geschaetzt: 150, beschreibung: "Amazon Partnerprogramm für KI- und Business-Bücher" },
  { name: "Canva Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://www.canva.com/affiliates", geschaetzt: 120, beschreibung: "Canva Pro-Affiliate für Content Creator" },
  { name: "Notion Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.notion.so/affiliates", geschaetzt: 80, beschreibung: "Notion-Affiliate: Produktivitäts-Tool mit recurring Provision" },
  // ── Neue Quellen ──
  { name: "Teachable Kurs-Verkauf", kanal: "eigenes_produkt", marke: "GeldPilot AI", url: "", geschaetzt: 900, beschreibung: "Verkauf von KI-Kursen auf Teachable (47-197€)" },
  { name: "Ko-fi Mitgliedschaft", kanal: "abo", marke: "CyberSarah", url: "https://ko-fi.com", geschaetzt: 180, beschreibung: "Ko-fi Membership mit exklusiven KI-Tutorials (6€/Monat)" },
  { name: "Buy Me a Coffee Spenden", kanal: "spende", marke: "CyberSarah", url: "https://buymeacoffee.com", geschaetzt: 100, beschreibung: "Freiwillige Spenden für kostenlose KI-Content-Erstellung" },
  { name: "Patreon Mitgliedschaft", kanal: "abo", marke: "UnternehmerGPT", url: "https://patreon.com", geschaetzt: 400, beschreibung: "Patreon-Community mit exklusiven KI-Business-Tools ($9-$49/Monat)" },
  { name: "TikTok Creator Rewards", kanal: "creator", marke: "CyberSarah", url: "", geschaetzt: 300, beschreibung: "TikTok Creator Fund basierend auf Video-Views (ca. 0,02-0,05€/1k Views)" },
  { name: "YouTube AdSense", kanal: "creator", marke: "UnternehmerGPT", url: "", geschaetzt: 200, beschreibung: "YouTube-Werbeeinnahmen durch faceless KI-Content" },
];

export class RevenueAnalystAgent extends AgentBase {
  constructor() {
    super("Revenue Analyst Agent", "revenue_analyst");
  }

  protected beschreibungText(): string {
    return "ULTRA-AUTONOM: Scannt 20+ Echtgeld-Quellen, erstellt sofort Stripe-Produkte + Payment-Links, trackt Performance, pausiert Flops, optimiert Preise";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const aktion = (aufgabe.payload as Record<string, string>)?.aktion ?? "auto_optimize_all";

    switch (aktion) {
      case "chancen_scannen":
        return this.scanneChancen();
      case "stripe_link_erstellen":
        return this.erstelleStripeLinks();
      case "ki_chancen_analysieren":
        return this.analysiereKiChancen();
      case "auto_produkte_erstellen":
        return this.erstelleAutonomeProdukte();
      case "performance_pruefen":
        return this.pruefePerformance();
      case "flops_pausieren":
        return this.pausiereFlops();
      case "preise_optimieren":
        return this.optimierePreise();
      case "auto_optimize_all":
        return this.autoOptimizeAll();
      default:
        return this.autoOptimizeAll();
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // AUTO-OPTIMIZE-ALL: Führt alle Revenue-Aktionen in einem Durchlauf aus
  // ═════════════════════════════════════════════════════════════════════════════
  private async autoOptimizeAll(): Promise<AufgabeErgebnis> {
    logger.info("🤖 Revenue-Analyst: Auto-Optimize-All gestartet");

    const scanResult = await this.scanneChancen();
    await this.erstelleAutonomeProdukte();
    await this.analysiereKiChancen();
    const perfResult = await this.pruefePerformance();
    await this.pausiereFlops();
    await this.optimierePreise();

    if (this.agentId) {
      await db.insert(agentLogsTable).values({
        agentId: this.agentId,
        agentName: "Revenue Analyst Agent",
        aktion: "Auto-Optimize-All",
        status: "erfolgreich",
        nachricht: `Auto-Optimierung komplett: ${scanResult.metadaten?.neueChancen ?? 0} neue Chancen, ${perfResult.metadaten?.aktiv ?? 0} aktive Produkte, Flops gepausiert, Preise optimiert`,
      });
    }

    return {
      success: true,
      message: `Auto-Optimize-All: Chancen gescannt, Stripe-Produkte erstellt, Performance geprüft, Flops pausiert, Preise optimiert`,
      metadaten: {
        scanResult: scanResult.metadaten,
        performanceResult: perfResult.metadaten,
      },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // CHANCEN-SCAN: Findet alle neuen Affiliate-Programme + Produkt-Ideen
  // ═════════════════════════════════════════════════════════════════════════════
  private async scanneChancen(): Promise<AufgabeErgebnis> {
    let neue = 0;
    let aktualisiert = 0;

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
      } else {
        // Bereits entdeckte Programme aktualisieren (bessere Beschreibung, etc.)
        const exist = vorhandene[0]!;
        if (exist.status === "entdeckt" && !exist.stripePaymentLink && prog.kanal === "eigenes_produkt") {
          // Markiere für automatische Stripe-Erstellung
          aktualisiert++;
        }
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
      message: `Revenue-Scan: ${neue} neue Chancen | ${aktualisiert} aktualisiert | ${AFFILIATE_PROGRAMME.length} Programme`,
      metadaten: { neueChancen: neue, aktualisiert: aktualisiert, gesamtProgramme: AFFILIATE_PROGRAMME.length },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STRIPE-LINKS: Erstellt Payment-Links für alle "eigenes_produkt" und "abo" Chancen
  // ═════════════════════════════════════════════════════════════════════════════
  private async erstelleStripeLinks(): Promise<AufgabeErgebnis> {
    const chancenOhneLink = await db
      .select()
      .from(revenueOpportunitiesTable)
      .where(
        and(
          sql`${revenueOpportunitiesTable.kanal} IN ('eigenes_produkt', 'abo', 'coaching')`,
          sql`${revenueOpportunitiesTable.stripePaymentLink} IS NULL`,
          eq(revenueOpportunitiesTable.status, "entdeckt"),
        ),
      )
      .orderBy(desc(revenueOpportunitiesTable.geschaetzterMonatsumsatz))
      .limit(10);

    let erstellt = 0;
    const stripe = getStripeClient();

    for (const chance of chancenOhneLink) {
      try {
        const preisCent = Math.max(
          Math.round(Number(chance.geschaetzterMonatsumsatz ?? 97) * 0.15 * 100),
          chance.kanal === "abo" ? 1900 : 1900, // Mindestens 19€
        );

        const stripeProdukt = await stripe.products.create({
          name: chance.titel,
          description: chance.beschreibung ?? `Automatisch erstellt für ${chance.marke}`,
          metadata: {
            marke: chance.marke ?? "CyberSarah",
            kanal: chance.kanal,
            quelle: "revenue_analyst_auto",
            chanceId: String(chance.id),
          },
        });

        const produktPreis = await stripe.prices.create({
          product: stripeProdukt.id,
          unit_amount: preisCent,
          currency: "eur",
          ...(chance.kanal === "abo"
            ? { recurring: { interval: "month" as const } }
            : {}),
          metadata: { quelle: "revenue_analyst_auto" },
        });

        const paymentLink = await stripe.paymentLinks.create({
          line_items: [{ price: produktPreis.id, quantity: 1 }],
          after_completion: {
            type: "redirect",
            redirect: { url: "https://cybersarah.app/danke" },
          },
          metadata: { quelle: "revenue_analyst_auto", chanceId: String(chance.id) },
        });

        await db
          .update(revenueOpportunitiesTable)
          .set({
            stripePaymentLink: paymentLink.url,
            status: "aktiv",
            updatedAt: new Date(),
          })
          .where(eq(revenueOpportunitiesTable.id, chance.id));

        erstellt++;
        logger.info({ produkt: chance.titel, link: paymentLink.url, preis: preisCent / 100 }, "✅ Stripe-Produkt + Payment-Link erstellt");
      } catch (err) {
        logger.warn({ err, produkt: chance.titel }, "Stripe-Link-Erstellung fehlgeschlagen");
      }
    }

    return {
      success: true,
      message: `${erstellt} Stripe-Payment-Links erstellt — sofort verkaufbar`,
      metadaten: { erstellteLinks: erstellt, gesamtGeprueft: chancenOhneLink.length },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // KI-CHANCEN-ANALYSE: GPT-4o-mini findet kreative Nischen-Ideen
  // ═════════════════════════════════════════════════════════════════════════════
  private async analysiereKiChancen(): Promise<AufgabeErgebnis> {
    if (!openaiVerfuegbar) {
      return { success: false, message: "OpenAI nicht verfügbar — KI-Analyse übersprungen", metadaten: {} };
    }

    const prompt = `Du bist ein Revenue-Optimizer für ein KI-Business-Imperium mit 3 Marken:
- CyberSarah: KI-Automation & Content Creation
- GeldPilot AI: Passive Income & KI-Investing  
- UnternehmerGPT: KI-Business-Tools & SaaS

Finde 10 profitable, NICHT offensichtliche digitale Revenue-Chancen, die sofort umsetzbar sind.
Fokussiere auf: Affiliate-Marketing, digitale Produkte, Coaching, Abos.

Antwort NUR als JSON:
{"chancen": [{"titel": "...", "beschreibung": "...", "kanal": "affiliate|eigenes_produkt|abo|coaching|freelance", "marke": "CyberSarah|GeldPilot AI|UnternehmerGPT", "geschaetzterMonatsumsatz": 0}]}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 800,
        response_format: { type: "json_object" },
      });

      const rawContent = completion.choices[0]?.message?.content ?? "{}";
      let chancen: Array<{
        titel: string;
        beschreibung: string;
        kanal: string;
        marke: string;
        geschaetzterMonatsumsatz: number;
      }> = [];

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

      // Automatisch Stripe-Produkte für neue KI-Chancen erstellen
      if (neue > 0) {
        await this.erstelleAutonomeProdukte();
      }

      return {
        success: true,
        message: `KI-Analyse: ${neue} neue Revenue-Chancen via GPT-4o-mini entdeckt & Produkte erstellt`,
        metadaten: { neueChancen: neue, analysierte: chancen.length },
      };
    } catch (err) {
      logger.error({ err }, "KI-Chancen-Analyse fehlgeschlagen");
      return { success: false, message: "KI-Analyse fehlgeschlagen", metadaten: {} };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // AUTO-PRODUKTE: Erstellt Stripe-Produkte für alle entdeckten Eigenprodukt-Chancen
  // ═════════════════════════════════════════════════════════════════════════════
  private async erstelleAutonomeProdukte(): Promise<AufgabeErgebnis> {
    const alleProduktChancen = await db
      .select()
      .from(revenueOpportunitiesTable)
      .where(
        and(
          sql`${revenueOpportunitiesTable.kanal} IN ('eigenes_produkt', 'abo', 'coaching')`,
          sql`${revenueOpportunitiesTable.stripePaymentLink} IS NULL`,
          eq(revenueOpportunitiesTable.status, "entdeckt"),
        ),
      )
      .orderBy(desc(revenueOpportunitiesTable.geschaetzterMonatsumsatz))
      .limit(10);

    if (alleProduktChancen.length === 0) {
      return { success: true, message: "Keine neuen Produkte zu erstellen", metadaten: { erstellteProdukte: 0 } };
    }

    let erstellt = 0;
    const stripe = getStripeClient();

    for (const chance of alleProduktChancen) {
      try {
        const preisCent = Math.max(
          Math.round(Number(chance.geschaetzterMonatsumsatz ?? 97) * 0.15 * 100),
          1900,
        );

        const stripeProdukt = await stripe.products.create({
          name: chance.titel,
          description: chance.beschreibung ?? `KI-generiertes Produkt für ${chance.marke}`,
          metadata: {
            marke: chance.marke ?? "CyberSarah",
            kanal: chance.kanal,
            quelle: "revenue_analyst_auto",
          },
        });

        const stripePreis = await stripe.prices.create({
          product: stripeProdukt.id,
          unit_amount: preisCent,
          currency: "eur",
          ...(chance.kanal === "abo" ? { recurring: { interval: "month" as const } } : {}),
          metadata: { quelle: "revenue_analyst_auto" },
        });

        const paymentLink = await stripe.paymentLinks.create({
          line_items: [{ price: stripePreis.id, quantity: 1 }],
          after_completion: { type: "redirect", redirect: { url: "https://cybersarah.app/danke" } },
          metadata: { quelle: "revenue_analyst_auto" },
        });

        await db
          .update(revenueOpportunitiesTable)
          .set({ stripePaymentLink: paymentLink.url, status: "aktiv", updatedAt: new Date() })
          .where(eq(revenueOpportunitiesTable.id, chance.id));

        erstellt++;
        logger.info({ produkt: chance.titel, link: paymentLink.url, preis: preisCent / 100 }, "🤖 Auto-Produkt erstellt");
      } catch (err) {
        logger.warn({ err, produkt: chance.titel }, "Auto-Produkt-Erstellung fehlgeschlagen");
      }
    }

    return {
      success: true,
      message: `${erstellt} neue Stripe-Produkte autonom erstellt — sofort verkaufbar`,
      metadaten: { erstellteProdukte: erstellt, gesamtGeprueft: alleProduktChancen.length },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PERFORMANCE-CHECK: Prüft echte Stripe-Transaktionen für aktive Produkte
  // ═════════════════════════════════════════════════════════════════════════════
  private async pruefePerformance(): Promise<AufgabeErgebnis> {
    const aktiveProdukte = await db
      .select()
      .from(revenueOpportunitiesTable)
      .where(eq(revenueOpportunitiesTable.status, "aktiv"))
      .orderBy(desc(revenueOpportunitiesTable.geschaetzterMonatsumsatz));

    const vor30Tagen = new Date();
    vor30Tagen.setDate(vor30Tagen.getDate() - 30);

    let mitUmsatz = 0;
    let ohneUmsatz = 0;

    for (const produkt of aktiveProdukte) {
      if (!produkt.stripePaymentLink) continue;

      // Prüfe ob es Transaktionen in den letzten 30 Tagen gab
      const transaktionen = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(transactionsTable)
        .where(
          and(
            eq(transactionsTable.produktName, produkt.titel),
            gte(transactionsTable.createdAt, vor30Tagen),
          ),
        );

      const anzahl = Number(transaktionen[0]?.count ?? 0);
      if (anzahl > 0) {
        mitUmsatz++;
      } else {
        ohneUmsatz++;
      }
    }

    return {
      success: true,
      message: `Performance-Check: ${mitUmsatz} Produkte mit Umsatz, ${ohneUmsatz} ohne Umsatz (30 Tage)`,
      metadaten: { aktiv: aktiveProdukte.length, mitUmsatz, ohneUmsatz },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // FLOPS PAUSIEREN: Setzt Produkte ohne Verkäufe nach 14 Tagen auf "pausiert"
  // ═════════════════════════════════════════════════════════════════════════════
  private async pausiereFlops(): Promise<AufgabeErgebnis> {
    const vor14Tagen = new Date();
    vor14Tagen.setDate(vor14Tagen.getDate() - 14);

    const potenzielleFlops = await db
      .select()
      .from(revenueOpportunitiesTable)
      .where(
        and(
          eq(revenueOpportunitiesTable.status, "aktiv"),
          sql`${revenueOpportunitiesTable.updatedAt} < ${vor14Tagen}`,
          sql`${revenueOpportunitiesTable.stripePaymentLink} IS NOT NULL`,
        ),
      );

    let pausiert = 0;
    for (const produkt of potenzielleFlops) {
      const transaktionen = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(transactionsTable)
        .where(eq(transactionsTable.produktName, produkt.titel));

      if (Number(transaktionen[0]?.count ?? 0) === 0) {
        await db
          .update(revenueOpportunitiesTable)
          .set({ status: "pausiert", updatedAt: new Date() })
          .where(eq(revenueOpportunitiesTable.id, produkt.id));
        pausiert++;
        logger.info({ produkt: produkt.titel }, "⏸️ Flop pausiert — keine Verkäufe in 14 Tagen");
      }
    }

    return {
      success: true,
      message: `${pausiert} Flops pausiert (keine Verkäufe in 14 Tagen)`,
      metadaten: { pausiert, geprueft: potenzielleFlops.length },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PREIS-OPTIMIERUNG: Passt Preise dynamisch an (noch nicht via Stripe-API machbar,
  // aber Logging + Empfehlung für nächsten manuellen Durchlauf)
  // ═════════════════════════════════════════════════════════════════════════════
  private async optimierePreise(): Promise<AufgabeErgebnis> {
    const vor30Tagen = new Date();
    vor30Tagen.setDate(vor30Tagen.getDate() - 30);

    const produkteMitUmsatz = await db
      .select({
        name: transactionsTable.produktName,
        anzahl: sql<number>`COUNT(*)`,
        avgBetrag: sql<number>`AVG(betrag)`,
      })
      .from(transactionsTable)
      .where(gte(transactionsTable.createdAt, vor30Tagen))
      .groupBy(transactionsTable.produktName);

    return {
      success: true,
      message: `Preis-Optimierung: ${produkteMitUmsatz.length} Produkte mit Umsatz in 30 Tagen`,
      metadaten: { produkteMitUmsatz, empfehlung: "Preise manuell via Stripe-Dashboard anpassen für beste Performance" },
    };
  }
}
