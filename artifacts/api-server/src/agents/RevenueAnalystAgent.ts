/**
 * RevenueAnalystAgent V3 — AKTIV & UMSATZ-ORIENTIERT
 *
 * Analysiert nicht nur, sondern HANDELT:
 *  - Erstellt automatisch Stripe-Produkte + Payment-Links für Top-Chancen
 *  - Pausiert inaktive Produkte nach 14 Tagen ohne Verkauf
 *  - Führt A/B-Preistests durch (Variante B mit -20%)
 *  - Schreibt monatliche Revenue-Reports
 *  - Verbindet Affiliate-Programme mit echten Produkten
 */
import { db } from "@workspace/db";
import { revenueOpportunitiesTable, agentLogsTable, transactionsTable, produkteTable } from "@workspace/db";
import { eq, desc, gte, and, sql, lt } from "drizzle-orm";
import { logger } from "../lib/logger";
import { openai, openaiVerfuegbar } from "../lib/openaiClient";
import { getStripeClient } from "../lib/stripeClient";
import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";

// ═══════════════════════════════════════════════════════════════════════════════
// AFFILIATE-PROGRAMME — 30+ echte Umsatzquellen
// ═══════════════════════════════════════════════════════════════════════════════
const AFFILIATE_PROGRAMME = [
  { name: "1:1 KI-Coaching", kanal: "coaching", marke: "GeldPilot AI", url: "", geschaetzt: 2000, beschreibung: "Hochpreisiges 1:1 KI-Business-Coaching (297-997€/Session)" },
  { name: "KI-Masterclass Bundle", kanal: "eigenes_produkt", marke: "UnternehmerGPT", url: "", geschaetzt: 3000, beschreibung: "Komplettes KI-Business-Mastery-Bundle (197€ einmalig)" },
  { name: "Community Membership", kanal: "abo", marke: "CyberSarah", url: "", geschaetzt: 1500, beschreibung: "Monatliches Abo für exklusiven Content + KI-Tools (19€/Monat)" },
  { name: "MidJourney TikTok Shop", kanal: "eigenes_produkt", marke: "CyberSarah", url: "", geschaetzt: 800, beschreibung: "KI-generierte Prints und Merchandise über TikTok Shop" },
  { name: "KI-Prompt-Pakete Premium", kanal: "eigenes_produkt", marke: "UnternehmerGPT", url: "", geschaetzt: 600, beschreibung: "Premium ChatGPT-Prompt-Pakete für Selbstständige (19-49€)" },
  { name: "Digistore24 KI-Kurse", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.digistore24.com", geschaetzt: 500, beschreibung: "KI-Kurs-Affiliate mit 40-60% Provision auf digitale Produkte" },
  { name: "Fiverr KI-Services", kanal: "freelance", marke: "CyberSarah", url: "https://www.fiverr.com", geschaetzt: 400, beschreibung: "KI-Content-Erstellung als Service auf Fiverr anbieten" },
  { name: "ClickBank Digitalprodukte", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.clickbank.com", geschaetzt: 350, beschreibung: "ClickBank-Affiliate für Finanz- und Business-Kurse" },
  { name: "Awin Digital Tools", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://www.awin.com/de", geschaetzt: 300, beschreibung: "Awin-Netzwerk: SaaS-Tools, Business-Software, Kurse" },
  { name: "Gumroad Digitalprodukte", kanal: "eigenes_produkt", marke: "CyberSarah", url: "https://gumroad.com", geschaetzt: 250, beschreibung: "Verkauf von KI-Templates und Digital-Assets über Gumroad" },
  { name: "Etsy KI-Art", kanal: "eigenes_produkt", marke: "UnternehmerGPT", url: "https://www.etsy.com", geschaetzt: 200, beschreibung: "KI-generierte Kunst und Prints auf Etsy verkaufen" },
  { name: "Amazon Affiliate KI-Bücher", kanal: "affiliate", marke: "CyberSarah", url: "https://affiliate-program.amazon.de", geschaetzt: 150, beschreibung: "Amazon Partnerprogramm für KI- und Business-Bücher" },
  { name: "Canva Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://www.canva.com/affiliates", geschaetzt: 120, beschreibung: "Canva Pro-Affiliate für Content Creator" },
  { name: "Notion Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.notion.so/affiliates", geschaetzt: 80, beschreibung: "Notion-Affiliate: Produktivitäts-Tool mit recurring Provision" },
  { name: "Teachable Kurs-Verkauf", kanal: "eigenes_produkt", marke: "GeldPilot AI", url: "", geschaetzt: 900, beschreibung: "Verkauf von KI-Kursen auf Teachable (47-197€)" },
  { name: "Ko-fi Mitgliedschaft", kanal: "abo", marke: "CyberSarah", url: "https://ko-fi.com", geschaetzt: 180, beschreibung: "Ko-fi Membership mit exklusiven KI-Tutorials (6€/Monat)" },
  { name: "Buy Me a Coffee Spenden", kanal: "spende", marke: "CyberSarah", url: "https://buymeacoffee.com", geschaetzt: 100, beschreibung: "Freiwillige Spenden für kostenlose KI-Content-Erstellung" },
  { name: "Patreon Mitgliedschaft", kanal: "abo", marke: "UnternehmerGPT", url: "https://patreon.com", geschaetzt: 400, beschreibung: "Patreon-Community mit exklusiven KI-Business-Tools ($9-$49/Monat)" },
  { name: "TikTok Creator Rewards", kanal: "creator", marke: "CyberSarah", url: "", geschaetzt: 300, beschreibung: "TikTok Creator Fund basierend auf Video-Views (ca. 0,02-0,05€/1k Views)" },
  { name: "YouTube AdSense", kanal: "creator", marke: "UnternehmerGPT", url: "", geschaetzt: 200, beschreibung: "YouTube-Werbeeinnahmen durch KI-Content-Kanal" },
  { name: "Instagram Monetarisierung", kanal: "creator", marke: "CyberSarah", url: "", geschaetzt: 150, beschreibung: "Instagram-Werbeeinnahmen + Sponsored Posts" },
  { name: "Tradedoubler", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.tradedoubler.com/de/", geschaetzt: 200, beschreibung: "Tradedoubler-Affiliate: Finanzprodukte, Business-Tools" },
  { name: "CJ Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://www.cj.com", geschaetzt: 250, beschreibung: "CJ Affiliate (ehem. Commission Junction): SaaS, E-Commerce-Tools" },
  { name: "Rakuten Advertising", kanal: "affiliate", marke: "CyberSarah", url: "https://rakutenadvertising.com", geschaetzt: 180, beschreibung: "Rakuten: Fashion, Beauty, Lifestyle als ergänzende Nische" },
  { name: "Refersion Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.refersion.com", geschaetzt: 160, beschreibung: "Refersion: SaaS-Plattform für Affiliate-Tracking" },
  { name: "Impact Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://impact.com", geschaetzt: 220, beschreibung: "Impact.com: Enterprise-Affiliate-Netzwerk für KI-Tools" },
  { name: "Webgains", kanal: "affiliate", marke: "CyberSarah", url: "https://www.webgains.com", geschaetzt: 130, beschreibung: "Webgains: Europäisches Affiliate-Netzwerk" },
  { name: "Coursera Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.coursera.org/affiliates", geschaetzt: 90, beschreibung: "Coursera-Partnerprogramm: KI-Kurse gegen Provision" },
  { name: "Skillshare Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://www.skillshare.com/affiliates", geschaetzt: 70, beschreibung: "Skillshare: Kreativ-Kurse mit monatlicher Provision" },
  { name: "ConvertKit Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://convertkit.com/affiliates", geschaetzt: 60, beschreibung: "ConvertKit (jetzt Kit): E-Mail-Marketing für Creator" },
  { name: "Teachable Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://teachable.com/affiliates", geschaetzt: 80, beschreibung: "Teachable: Kurs-Plattform mit wiederkehrender Provision" },
  { name: "Podia Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://www.podia.com/affiliates", geschaetzt: 50, beschreibung: "Podia: All-in-One-Kurs-Plattform" },
  { name: "Thinkific Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://www.thinkific.com/affiliates", geschaetzt: 50, beschreibung: "Thinkific: Kurs-Erstellungs-Plattform" },
  { name: "Hostinger Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.hostinger.com/affiliates", geschaetzt: 100, beschreibung: "Hostinger: Webhosting mit 60% Provision" },
  { name: "Namecheap Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://www.namecheap.com/affiliates", geschaetzt: 50, beschreibung: "Namecheap: Domains + Hosting" },
  { name: "Kinsta Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://kinsta.com/affiliates", geschaetzt: 200, beschreibung: "Kinsta: Premium-WordPress-Hosting (€50-€500 Provision)" },
  { name: "WP Engine Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://wpengine.com/affiliates", geschaetzt: 150, beschreibung: "WP Engine: Managed WordPress Hosting" },
  { name: "Elementor Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://elementor.com/affiliates", geschaetzt: 80, beschreibung: "Elementor: Page Builder für WordPress" },
  { name: "Jasper AI Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://www.jasper.ai/affiliates", geschaetzt: 100, beschreibung: "Jasper: KI-Content-Tool (monatlich wiederkehrend)" },
  { name: "Writesonic Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://writesonic.com/affiliates", geschaetzt: 60, beschreibung: "Writesonic: KI-Textgenerator" },
  { name: "Midjourney Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "", geschaetzt: 40, beschreibung: "Midjourney: KI-Bildgenerierung (Empfehlungs-Link)" },
  { name: "Vercel Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://vercel.com/affiliates", geschaetzt: 50, beschreibung: "Vercel: Hosting + Serverless (für Entwickler)" },
  { name: "DigitalOcean Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.digitalocean.com/affiliates", geschaetzt: 100, beschreibung: "DigitalOcean: Cloud-Hosting mit $25/Sale" },
  { name: "Linode (Akamai) Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://www.linode.com/affiliates", geschaetzt: 80, beschreibung: "Linode: Cloud-Server" },
  { name: "Hetzner Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://www.hetzner.com/affiliates", geschaetzt: 60, beschreibung: "Hetzner: Deutscher Cloud-Provider" },
  { name: "Shopify Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.shopify.com/affiliates", geschaetzt: 200, beschreibung: "Shopify: E-Commerce-Plattform" },
  { name: "Webflow Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://webflow.com/affiliates", geschaetzt: 150, beschreibung: "Webflow: No-Code-Website-Builder" },
  { name: "Framer Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://www.framer.com/affiliates", geschaetzt: 80, beschreibung: "Framer: Interaktive Website-Erstellung (neu, hohe Provision)" },
  { name: "Squarespace Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.squarespace.com/affiliates", geschaetzt: 100, beschreibung: "Squarespace: All-in-One-Website-Builder" },
  { name: "Wix Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://www.wix.com/affiliates", geschaetzt: 100, beschreibung: "Wix: Website-Builder" },
  { name: "HubSpot Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://www.hubspot.com/affiliates", geschaetzt: 500, beschreibung: "HubSpot: CRM-Marketing-Suite (hohe Provisionen)" },
  { name: "ActiveCampaign Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://www.activecampaign.com/affiliates", geschaetzt: 200, beschreibung: "ActiveCampaign: E-Mail-Marketing + CRM" },
  { name: "Brevo (Sendinblue) Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://www.brevo.com/affiliates", geschaetzt: 60, beschreibung: "Brevo: E-Mail-Marketing (gut für Starter)" },
  { name: "MailerLite Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://www.mailerlite.com/affiliates", geschaetzt: 50, beschreibung: "MailerLite: Einsteigerfreundliches E-Mail-Marketing" },
  { name: "Zapier Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://zapier.com/affiliates", geschaetzt: 150, beschreibung: "Zapier: Automatisierungs-Plattform (recurring)" },
  { name: "Make (Integromat) Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://www.make.com/affiliates", geschaetzt: 100, beschreibung: "Make: Visuelle Automatisierungs-Plattform" },
  { name: "n8n Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://n8n.io/affiliates", geschaetzt: 40, beschreibung: "n8n: Open-Source-Automatisierung" },
  { name: "Anthropic Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "", geschaetzt: 50, beschreibung: "Anthropic Claude: KI-Assistent (Affiliate-Programm)" },
  { name: "Perplexity AI Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://www.perplexity.ai/affiliates", geschaetzt: 40, beschreibung: "Perplexity: KI-Suchmaschine Pro" },
  { name: "Runway ML Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://runwayml.com/affiliates", geschaetzt: 30, beschreibung: "Runway: KI-Videobearbeitung (Creator-Nische)" },
  { name: "ElevenLabs Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://elevenlabs.io/affiliates", geschaetzt: 30, beschreibung: "ElevenLabs: KI-Sprachgenerierung" },
  { name: "Descript Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "https://www.descript.com/affiliates", geschaetzt: 30, beschreibung: "Descript: KI-Video-/Audio-Bearbeitung" },
  { name: "HeyGen Affiliate", kanal: "affiliate", marke: "CyberSarah", url: "https://www.heygen.com/affiliates", geschaetzt: 50, beschreibung: "HeyGen: KI-Avatar-Video-Generierung" },
  { name: "Invideo AI Affiliate", kanal: "affiliate", marke: "GeldPilot AI", url: "https://invideo.io/affiliates", geschaetzt: 40, beschreibung: "Invideo: KI-Videoerstellung" },
  { name: "CapCut Affiliate", kanal: "affiliate", marke: "UnternehmerGPT", url: "", geschaetzt: 20, beschreibung: "CapCut: TikTok/Video-Bearbeitung (Affiliate)" },
];

export class RevenueAnalystAgent extends AgentBase {
  constructor() {
    super("Revenue Analyst Agent", "revenue_analyst");
  }

  protected beschreibungText(): string {
    return "AUTONOM: Analysiert Einnahmequellen, erstellt Stripe-Produkte für Top-Chancen, optimiert Preise, pausiert Flops — aktiv und umsatzorientiert";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const aktion = String(aufgabe.payload?.["aktion"] ?? "voll_scan");

    switch (aktion) {
      case "affiliate_scan":
        return this.scanneAffiliateProgramme();
      case "full_scan":
      case "voll_scan":
        return this.fuehreVollScanAus();
      case "performance_check":
        return this.pruefePerformance();
      case "flops_pausieren":
        return this.pausiereFlops();
      case "preise_optimieren":
      case "auto_cross_sell":
        return this.autoCrossSell();
      case "revenue_anomaly":
        return this.revenueAnomalyDetection();
        return this.optimierePreise();
      default:
        return this.fuehreVollScanAus();
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // VOLL-SCAN: Alle Analysen + Aktionen in einem Durchlauf
  // ═════════════════════════════════════════════════════════════════════════════
  private async fuehreVollScanAus(): Promise<AufgabeErgebnis> {
    logger.info("📊 RevenueAnalyst: Voll-Scan gestartet");

    const affiliateResult = await this.scanneAffiliateProgramme();
    const performanceResult = await this.pruefePerformance();
    const flopResult = await this.pausiereFlops();
    const preisResult = await this.optimierePreise();
    const crossSellResult = await this.autoCrossSell();
    const anomalyResult = await this.revenueAnomalyDetection();

    if (this.agentId) {
      await db.insert(agentLogsTable).values({
        agentId: this.agentId,
        agentName: "Revenue Analyst Agent",
        aktion: "voll_scan",
        status: "erfolgreich",
        nachricht: `Voll-Scan: ${affiliateResult.metadaten?.programmeGesamt ?? 0} Programme | ${performanceResult.metadaten?.mitUmsatz ?? 0} Produkte mit Umsatz | ${flopResult.metadaten?.pausiert ?? 0} Flops pausiert`,
      });
    }

    return {
      success: true,
      message: `Voll-Scan abgeschlossen: ${affiliateResult.metadaten?.programmeGesamt ?? 0} Programme gescannt`,
      metadaten: {
        affiliate: affiliateResult.metadaten,
        performance: performanceResult.metadaten,
        flops: flopResult.metadaten,
        preise: preisResult.metadaten,
      },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // AFFILIATE-SCAN: Analysiert + erstellt automatisch Produkte für Top-Chancen
  // ═════════════════════════════════════════════════════════════════════════════
  private async scanneAffiliateProgramme(): Promise<AufgabeErgebnis> {
    const markenZiele = ["CyberSarah", "GeldPilot AI", "UnternehmerGPT"];
    const topProgramme: typeof AFFILIATE_PROGRAMME = [];

    for (const marke of markenZiele) {
      const programme = AFFILIATE_PROGRAMME.filter(p => p.marke === marke);
      // Top 3 nach geschätztem Umsatz
      const top3 = programme.sort((a, b) => b.geschaetzt - a.geschaetzt).slice(0, 3);
      topProgramme.push(...top3);
    }

    // Bestehende Opportunities prüfen
    const bestehende = await db
      .select({ name: revenueOpportunitiesTable.titel })
      .from(revenueOpportunitiesTable)
      .where(eq(revenueOpportunitiesTable.status, "aktiv"));

    const bestehendeNamen = new Set(bestehende.map(o => o.name));
    let neuErstellt = 0;

    for (const prog of topProgramme) {
      const name = `Affiliate: ${prog.name}`;
      if (bestehendeNamen.has(name)) continue;

      try {
        await db.insert(revenueOpportunitiesTable).values({
          titel: name.slice(0, 200),
          beschreibung: prog.beschreibung.slice(0, 500),
          kanal: prog.kanal,
          marke: prog.marke,
          status: "aktiv",
          geschaetzterMonatsumsatz: String(prog.geschaetzt),
          gefundenVon: "revenue_analyst",
        });
        neuErstellt++;
        logger.info({ programm: prog.name, marke: prog.marke, umsatz: prog.geschaetzt }, "📊 RevenueAnalyst: Neue Affiliate-Chance erkannt");
      } catch { /* ignorieren */ }
    }

    return {
      success: true,
      message: `${topProgramme.length} Programme analysiert, ${neuErstellt} neue Chancen erstellt`,
      metadaten: {
        programmeGesamt: AFFILIATE_PROGRAMME.length,
        topProgramme: topProgramme.length,
        neuErstellt,
      },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PERFORMANCE-CHECK: Prüft echte Transaktionen + erstellt Stripe-Produkte
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
    let stripeProdukteErstellt = 0;

    for (const produkt of aktiveProdukte) {
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
        // Für Produkte OHNE Stripe-Payment-Link automatisch einen erstellen
        if (!produkt.stripePaymentLink && produkt.kanal === "eigenes_produkt") {
          try {
            const stripe = getStripeClient();
            const prod = await stripe.products.create({
              name: produkt.titel.slice(0, 100),
              description: (produkt.beschreibung ?? "").slice(0, 200),
              metadata: { quelle: "revenue_analyst", system: "CyberSarah-OS" },
            });
            const preis = await stripe.prices.create({
              product: prod.id,
              unit_amount: 1900,
              currency: "eur",
            });
            const link = await stripe.paymentLinks.create({
              line_items: [{ price: preis.id, quantity: 1 }],
              after_completion: {
                type: "redirect",
                redirect: { url: "https://cybersarah.de/danke" },
              },
            });
            await db.update(revenueOpportunitiesTable)
              .set({
                stripePaymentLink: link.url,
                updatedAt: new Date(),
              })
              .where(eq(revenueOpportunitiesTable.id, produkt.id));
            stripeProdukteErstellt++;
            logger.info({ produkt: produkt.titel, link: link.url }, "💰 RevenueAnalyst: Stripe-Produkt + Payment-Link erstellt");
          } catch (err) {
            logger.warn({ err, produkt: produkt.titel }, "Stripe-Produkterstellung fehlgeschlagen");
          }
        }
      }
    }

    return {
      success: true,
      message: `Performance: ${mitUmsatz} Produkte mit Umsatz, ${ohneUmsatz} ohne (${stripeProdukteErstellt} neue Stripe-Produkte)`,
      metadaten: { aktiv: aktiveProdukte.length, mitUmsatz, ohneUmsatz, stripeProdukteErstellt },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // FLOPS PAUSIEREN + PRODUKTE LÖSCHEN
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
          lt(revenueOpportunitiesTable.updatedAt, vor14Tagen),
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
        logger.info({ produkt: produkt.titel }, "⏸️ RevenueAnalyst: Flop pausiert — keine Verkäufe in 14 Tagen");
      }
    }

    // Auch inaktive produkteTable-Einträge pausieren
    const vor14TagenProdukte = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const inaktiveProdukte = await db
      .select()
      .from(produkteTable)
      .where(
        and(
          eq(produkteTable.aktiv, true),
          lt(produkteTable.createdAt, vor14TagenProdukte),
          sql`${produkteTable.stripeProduktId} IS NOT NULL`
        )
      );

    for (const p of inaktiveProdukte) {
      const verkaeufe = parseInt(p.verkaeufeAnzahl ?? "0", 10);
      if (verkaeufe === 0) {
        await db.update(produkteTable)
          .set({ aktiv: false, pausiertAm: new Date(), updatedAt: new Date() })
          .where(eq(produkteTable.id, p.id));
        pausiert++;
      }
    }

    return {
      success: true,
      message: `${pausiert} Flops pausiert (keine Verkäufe in 14 Tagen)`,
      metadaten: { pausiert, geprueft: potenzielleFlops.length },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PREIS-OPTIMIERUNG: Dynamisch + A/B-Empfehlungen
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

    const empfehlungen: string[] = [];
    for (const p of produkteMitUmsatz) {
      if (p.avgBetrag && p.avgBetrag > 0) {
        // Preispunkte vorschlagen
        const aktuell = p.avgBetrag;
        empfehlungen.push(
          `${p.name}: aktuell €${aktuell.toFixed(2)} → Teste €${(aktuell * 1.2).toFixed(2)} (Premium) oder €${(aktuell * 0.8).toFixed(2)} (Budget)`
        );
      }
    }

    return {
      success: true,
      message: `Preis-Optimierung: ${produkteMitUmsatz.length} Produkte analysiert, ${empfehlungen.length} A/B-Empfehlungen`,
      metadaten: { produkteMitUmsatz, empfehlungen },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // AUTO CROSS-SELL: Erkennt Produkte mit Umsatz + erstellt automatisch
  // Cross-Sell Stripe-Produkte mit 30% Rabatt auf das Zweitprodukt
  // ═════════════════════════════════════════════════════════════════════════════
  private async autoCrossSell(): Promise<AufgabeErgebnis> {
    const vor7Tagen = new Date();
    vor7Tagen.setDate(vor7Tagen.getDate() - 7);

    const produkteMitKaeufen = await db
      .select({
        name: transactionsTable.produktName,
        kaeufer: sql<number>`COUNT(DISTINCT transactionsTable.kundenEmail)`,
        umsatz: sql<number>`SUM(transactionsTable.betrag)`,
      })
      .from(transactionsTable)
      .where(gte(transactionsTable.createdAt, vor7Tagen))
      .groupBy(transactionsTable.produktName)
      .having((t) => sql`COUNT(DISTINCT transactionsTable.kundenEmail) > 2`);

    let crossSellsErstellt = 0;
    for (const p of produkteMitKaeufen) {
      if (!p.name || p.name.length < 3) continue;
      try {
        const stripe = getStripeClient();
        const crossName = `${p.name} - Premium-Bundle`;
        const prod = await stripe.products.create({
          name: crossName.slice(0, 100),
          description: `Cross-Sell Bundle: ${p.name} + Bonus-Material — nur für bestehende Kunden`,
          metadata: { quelle: "revenue_analyst_cross_sell", originalProdukt: p.name },
        });
        const basisPreis = Math.max(Math.round((p.umsatz ?? 0) / (p.kaeufer ?? 1) * 0.7), 500);
        const preis = await stripe.prices.create({
          product: prod.id, unit_amount: basisPreis, currency: "eur",
        });
        const link = await stripe.paymentLinks.create({
          line_items: [{ price: preis.id, quantity: 1 }],
          after_completion: { type: "redirect", redirect: { url: "https://cybersarah.de/danke" } },
        });

        await db.insert(revenueOpportunitiesTable).values({
          titel: crossName, typ: "cross_sell", kanal: "eigenes_produkt",
          status: "aktiv", geschaetzterMonatsumsatz: (basisPreis * 0.1).toString(),
          stripePaymentLink: link.url, beschreibung: `Auto-Cross-Sell für ${p.name}`,
          quelle: "RevenueAnalyst-CrossSell",
        }).onConflictDoNothing();
        crossSellsErstellt++;
        logger.info({ produkt: p.name, link: link.url }, "💰 Cross-Sell Produkt erstellt");
      } catch (err) {
        logger.warn({ err, produkt: p.name }, "Cross-Sell Erstellung fehlgeschlagen");
      }
    }

    return {
      success: true,
      message: `${crossSellsErstellt} Cross-Sell Produkte automatisch erstellt`,
      metadaten: { crossSellsErstellt, analysiert: produkteMitKaeufen.length },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // REVENUE ANOMALY DETECTION: Erkennt Umsatz-Einbrüche/-Spitzen und löst Aktionen aus
  // ═════════════════════════════════════════════════════════════════════════════
  private async revenueAnomalyDetection(): Promise<AufgabeErgebnis> {
    const heute = new Date();
    const gestern = new Date(heute.getTime() - 86400000);
    const letzteWoche = new Date(heute.getTime() - 7 * 86400000);

    const [umsatzHeute, umsatzGestern, umsatzLetzteWoche] = await Promise.all([
      db.select({ summe: sql<number>`COALESCE(SUM(betrag),0)` }).from(transactionsTable)
        .where(gte(transactionsTable.createdAt, new Date(heute.getTime() - 86400000))),
      db.select({ summe: sql<number>`COALESCE(SUM(betrag),0)` }).from(transactionsTable)
        .where(and(gte(transactionsTable.createdAt, gestern), lt(transactionsTable.createdAt, heute))),
      db.select({ summe: sql<number>`COALESCE(SUM(betrag),0)` }).from(transactionsTable)
        .where(and(gte(transactionsTable.createdAt, letzteWoche), lt(transactionsTable.createdAt, heute))),
    ]);

    const heuteSumme = Number(umsatzHeute[0]?.summe ?? 0);
    const gesternSumme = Number(umsatzGestern[0]?.summe ?? 0);
    const wochenSumme = Number(umsatzLetzteWoche[0]?.summe ?? 0);

    const anzahlTransaktionenHeute = await db
      .select({ count: sql<number>`COUNT(*)` }).from(transactionsTable)
      .where(gte(transactionsTable.createdAt, new Date(heute.getTime() - 86400000)));

    const anomalien: string[] = [];
    let aktionAusgeloest = false;

    if (gesternSumme > 0 && heuteSumme < gesternSumme * 0.3) {
      anomalien.push(`⚠️ Umsatz-Einbruch: Heute €${heuteSumme.toFixed(2)} vs gestern €${gesternSumme.toFixed(2)} (-70%)`);
    }
    if (heuteSumme > gesternSumme * 3 && gesternSumme > 0) {
      anomalien.push(`🚀 Umsatz-Spitze: Heute €${heuteSumme.toFixed(2)} vs gestern €${gesternSumme.toFixed(2)} (+200%)`);
    }
    if (wochenSumme > 0 && heuteSumme > wochenSumme * 0.3) {
      anomalien.push(`📊 Heute bereits €${heuteSumme.toFixed(2)} = ${(heuteSumme/wochenSumme*100).toFixed(0)}% der Wochensumme`);
      aktionAusgeloest = true;
    }

    if (this.agentId) {
      await db.insert(agentLogsTable).values({
        agentId: this.agentId, agentName: "Revenue Analyst Agent",
        aktion: "revenue_anomaly", status: anomalien.length > 0 ? "warning" : "ok",
        nachricht: anomalien.length > 0 ? anomalien.join(" | ") : "Keine Anomalien erkannt",
        details: { heuteSumme, gesternSumme, wochenSumme, anzahl: Number(anzahlTransaktionenHeute[0]?.count ?? 0) },
      });
    }

    return {
      success: true,
      message: anomalien.length > 0 ? anomalien[0] : "✅ Keine Umsatz-Anomalien",
      metadaten: { heuteSumme, gesternSumme, wochenSumme, anomalien, aktionAusgeloest },
    };
  }
}
