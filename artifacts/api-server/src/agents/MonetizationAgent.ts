/**
 * MonetizationAgent V4 — MAX AUTONOMY
 *
 * Autonome Aktionen:
 *  - Dynamic Pricing alle 15 Min
 *  - Auto-Bundles aus Top-Verkäufen
 *  - Upsell-Produkte via Stripe
 *  - Flash Sales bei schwacher Performance
 *  - Automatische Preis-Anpassung + Cross-Sell
 *  - Kein manuelles Eingreifen nötig
 */
import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { db } from "@workspace/db";
import { campaignsTable, transactionsTable, agentLogsTable, revenueOpportunitiesTable, produkteTable } from "@workspace/db";
import { eq, desc, sql, gte, and, lt } from "drizzle-orm";
import { logger } from "../lib/logger";
import { openai, openaiVerfuegbar } from "../lib/openaiClient";
import { getStripeClient } from "../lib/stripeClient";

export type MonetizierungAktion =
  | "funnel_optimieren"
  | "upsell_strategie"
  | "affiliate_analyse"
  | "preisoptimierung"
  | "upsell_produkte_erstellen"
  | "tracking_fix"
  | "auto_optimize_all"
  | "dynamic_pricing"
  | "auto_bundle"
  | "flash_sale";

// 25 Premium-Upsell-Produkte für maximale Revenue
const UPSELL_PRODUKTE: Array<{
  name: string; marke: string; beschreibung: string; preis: string;
}> = [
  { name: "KI-Workflow Automatisierung Pro", marke: "CyberSarah", beschreibung: "25 automatisierte KI-Workflows — spart 30+ Stunden/Woche", preis: "147.00" },
  { name: "GeldPilot Trading Signals Premium", marke: "GeldPilot AI", beschreibung: "Daily KI-Trading-Signale + Portfolio + Risikomanagement", preis: "79.00" },
  { name: "UnternehmerGPT Enterprise Suite", marke: "UnternehmerGPT", beschreibung: "Vollständiges KI-Business-System + 24/7 Support + Live-Coaching", preis: "297.00" },
  { name: "CyberSarah Content Mastery Pack", marke: "CyberSarah", beschreibung: "250+ KI-Content-Vorlagen + Automatisierungen", preis: "49.00" },
  { name: "GeldPilot AI Trading Bot", marke: "GeldPilot AI", beschreibung: "Autonomer KI-Trading-Bot mit 24/7 Überwachung", preis: "197.00" },
  { name: "Social Media KI-Autopilot", marke: "CyberSarah", beschreibung: "Vollautomatische Social-Media-Posting-Maschine", preis: "39.00" },
  { name: "KI E-Mail Automation Suite", marke: "UnternehmerGPT", beschreibung: "Komplette E-Mail-Marketing-Automation mit KI", preis: "59.00" },
  { name: "Affiliate Empire Baukasten", marke: "GeldPilot AI", beschreibung: "30+ Affiliate-Programme + KI-Inhalte + Funnels", preis: "97.00" },
  { name: "KI-Video Factory Pro", marke: "CyberSarah", beschreibung: "Autonome Faceless-Video-Produktion für TikTok/YT", preis: "67.00" },
  { name: "SEO-RankBot KI", marke: "UnternehmerGPT", beschreibung: "Autonome SEO-Optimierung + Content-Generierung", preis: "89.00" },
  { name: "Funnel Builder Enterprise", marke: "CyberSarah", beschreibung: "KI-optimierte Sales-Funnels mit A/B-Testing", preis: "129.00" },
  { name: "KI-Coaching Zertifizierung", marke: "GeldPilot AI", beschreibung: "Werde zertifizierter KI-Business-Coach", preis: "497.00" },
  { name: "OnlyFans KI-Management", marke: "CyberSarah", beschreibung: "KI-gestütztes Creator-Management (20% Provision)", preis: "199.00" },
  { name: "Nischen-Website Empire", marke: "UnternehmerGPT", beschreibung: "10 KI-optimierte Nischen-Websites + Automatisierung", preis: "149.00" },
  { name: "KI-Product Launch Kit", marke: "CyberSarah", beschreibung: "Komplettes Launch-System: KI-Content + Funnels + E-Mail", preis: "79.00" },
];

export class MonetizationAgent extends AgentBase {
  constructor() {
    super("Monetization Agent", "monetization");
  }

  protected beschreibungText(): string {
    return "V4 MAX AUTONOMY: Dynamic Pricing alle 15 Min, Auto-Bundles, Flash Sales, Upsells";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const payload = aufgabe.payload as unknown as { aktion?: string; marke?: string };
    const aktion = payload?.aktion ?? "auto_optimize_all";

    switch (aktion) {
      case "dynamic_pricing": return this.dynamicPricing();
      case "auto_bundle": return this.autoBundle();
      case "flash_sale": return this.flashSale();
      case "upsell_produkte_erstellen": return this.erstelleUpsellProdukte(payload.marke);
      case "preisoptimierung": return this.dynamicPricing();
      case "auto_optimize_all": return this.autoOptimizeAll();
      default: return this.autoOptimizeAll();
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // AUTO-OPTIMIZE-ALL: Führt ALLE Revenue-Aktionen aus
  // ═══════════════════════════════════════════════════════════════════
  private async autoOptimizeAll(): Promise<AufgabeErgebnis> {
    logger.info("🤖 Monetization-V4: Auto-Optimize-All");
    const upsellResult = await this.erstelleUpsellProdukte();
    const pricingResult = await this.dynamicPricing();
    const bundleResult = await this.autoBundle();
    const flashResult = await this.flashSale();

    const ergebnisse = [
      upsellResult.metadaten?.erstellt ?? 0,
      pricingResult.metadaten?.preiseAngepasst ?? 0,
      bundleResult.metadaten?.bundlesErstellt ?? 0,
      flashResult.metadaten?.flashSales ?? 0,
    ];

    if (this.agentId) {
      await db.insert(agentLogsTable).values({
        agentId: this.agentId, agentName: "Monetization Agent V4",
        aktion: "auto_optimize_all", status: "erfolgreich",
        nachricht: `✅ ${ergebnisse[0]} Upsells | ${ergebnisse[1]} Preise | ${ergebnisse[2]} Bundles | ${ergebnisse[3]} Flash Sales`,
      });
    }

    return {
      success: true,
      message: `Auto: ${ergebnisse[0]} Upsells, ${ergebnisse[1]} Preise, ${ergebnisse[2]} Bundles, ${ergebnisse[3]} Flash Sales`,
      metadaten: { upsells: ergebnisse[0], preise: ergebnisse[1], bundles: ergebnisse[2], flash: ergebnisse[3] },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // UPSELL PRODUKTE ERSTELLEN: Erstellt Stripe-Produkte aus UPSELL_LISTE
  // ═══════════════════════════════════════════════════════════════════
  private async erstelleUpsellProdukte(marke?: string): Promise<AufgabeErgebnis> {
    logger.info("🆙 Monetization: Upsell-Produkte erstellen");
    const stripe = getStripeClient();
    let erstellt = 0;

    const filter = marke
      ? UPSELL_PRODUKTE.filter(p => p.marke === marke)
      : UPSELL_PRODUKTE;

    for (const upsell of filter) {
      try {
        const existing = await db.select()
          .from(revenueOpportunitiesTable)
          .where(eq(revenueOpportunitiesTable.titel, upsell.name))
          .limit(1);

        if (existing.length > 0) continue;

        const prod = await stripe.products.create({
          name: upsell.name.slice(0, 100),
          description: upsell.beschreibung,
          metadata: { quelle: "monetization_v4_upsell", marke: upsell.marke },
        });
        const preisCent = Math.round(parseFloat(upsell.preis) * 100);
        const price = await stripe.prices.create({
          product: prod.id, unit_amount: preisCent, currency: "eur",
        });
        const link = await stripe.paymentLinks.create({
          line_items: [{ price: price.id, quantity: 1 }],
          after_completion: { type: "redirect", redirect: { url: "https://cybersarah.de/danke" } },
        });

        await db.insert(revenueOpportunitiesTable).values({
          titel: upsell.name, typ: "upsell", kanal: "eigenes_produkt",
          status: "aktiv", geschaetzterMonatsumsatz: (preisCent * 10).toString(),
          stripePaymentLink: link.url, beschreibung: upsell.beschreibung,
          quelle: "Monetization-V4-Upsell",
        }).onConflictDoNothing();
        erstellt++;
        logger.info({ name: upsell.name, preis: upsell.preis }, "🆙 Upsell-Produkt erstellt");
      } catch (err) {
        logger.warn({ err, name: upsell.name }, "Upsell-Erstellung fehlgeschlagen");
      }
    }

    return {
      success: true,
      message: `${erstellt} neue Upsell-Produkte via Stripe erstellt`,
      metadaten: { erstellt, gesamt: filter.length },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // DYNAMIC PRICING: Aggressive Preis-Optimierung alle 15 Min
  // ═══════════════════════════════════════════════════════════════════
  private async dynamicPricing(): Promise<AufgabeErgebnis> {
    logger.info("📊 Monetization-V4: Dynamic Pricing");
    const stripe = getStripeClient();
    const aktiv = await db.select().from(revenueOpportunitiesTable)
      .where(eq(revenueOpportunitiesTable.status, "aktiv"))
      .limit(30);

    let preiseAngepasst = 0;
    let einnahmenExtra = 0;

    for (const opp of aktiv) {
      if (!opp.stripePaymentLink || !opp.titel) continue;
      try {
        const existing = await db.select({ anzahl: sql<number>`COUNT(*)` })
          .from(transactionsTable)
          .where(eq(transactionsTable.produktName, opp.titel));

        const anzahl = existing[0]?.anzahl ?? 0;
        const avgPreis = parseInt(opp.geschaetzterMonatsumsatz ?? "1999") || 1999;
        let neuerPreis = avgPreis;

        if (anzahl > 10) {
          neuerPreis = Math.round(avgPreis * 1.35); // +35% bei Boom
        } else if (anzahl > 3) {
          neuerPreis = Math.round(avgPreis * 1.2); // +20%
        } else if (anzahl === 0 && opp.createdAt) {
          const altertage = (Date.now() - new Date(opp.createdAt).getTime()) / 86400000;
          if (altertage > 3) neuerPreis = Math.round(avgPreis * 0.6); // -40% nach 3 Tagen
          else if (altertage > 1) neuerPreis = Math.round(avgPreis * 0.8); // -20% nach 1 Tag
        }

        if (neuerPreis !== avgPreis && neuerPreis > 99) {
          const price = await stripe.prices.create({
            product: "prod_default", unit_amount: neuerPreis, currency: "eur",
            metadata: { angepasstVon: "monetization_v4", vorher: String(avgPreis) },
          });
          const link = await stripe.paymentLinks.create({
            line_items: [{ price: price.id, quantity: 1 }],
            after_completion: { type: "redirect", redirect: { url: "https://cybersarah.de/danke" } },
          });
          await db.update(revenueOpportunitiesTable)
            .set({ stripePaymentLink: link.url, updatedAt: new Date() })
            .where(eq(revenueOpportunitiesTable.id, opp.id));
          preiseAngepasst++;
          einnahmenExtra += (neuerPreis - avgPreis) * Math.max(anzahl, 1);
        }
      } catch (err) {
        logger.warn({ err, titel: opp.titel }, "Dynamic Pricing fehlgeschlagen");
      }
    }

    return {
      success: true,
      message: `${preiseAngepasst} Preise optimiert, €${einnahmenExtra.toFixed(0)} Extra-Einnahmen`,
      metadaten: { preiseAngepasst, einnahmenExtra },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // AUTO BUNDLE: Erstellt Bundles aus Top-Verkäufen
  // ═══════════════════════════════════════════════════════════════════
  private async autoBundle(): Promise<AufgabeErgebnis> {
    logger.info("📦 Monetization-V4: Auto-Bundle");
    const vor14Tagen = new Date();
    vor14Tagen.setDate(vor14Tagen.getDate() - 14);

    const topProdukte = await db
      .select({ name: transactionsTable.produktName, anzahl: sql<number>`COUNT(*)`, umsatz: sql<number>`SUM(betrag)` })
      .from(transactionsTable)
      .where(gte(transactionsTable.createdAt, vor14Tagen))
      .groupBy(transactionsTable.produktName)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(5);

    let bundlesErstellt = 0;
    const stripe = getStripeClient();

    // Erstelle Bundles aus Top-2 und Top-3 Kombinationen
    const kombinationen = [
      { indices: [0, 1], nameSuffix: "Premium Bundle" },
      { indices: [0, 2], nameSuffix: "Power Pack" },
      { indices: [1, 2], nameSuffix: "Starter Bundle" },
    ];

    for (const combo of kombinationen) {
      if (topProdukte.length < Math.max(...combo.indices) + 1) continue;
      const p1 = topProdukte[combo.indices[0]];
      const p2 = topProdukte[combo.indices[1]];
      if (!p1?.name || !p2?.name) continue;

      try {
        const bundleName = `${p1.name} + ${p2.name} ${combo.nameSuffix}`;
        const preis1 = Number(p1.umsatz ?? 0) / Math.max(Number(p1.anzahl), 1);
        const preis2 = Number(p2.umsatz ?? 0) / Math.max(Number(p2.anzahl), 1);
        const bundlePreis = Math.round((preis1 + preis2) * 0.75); // 25% Rabatt

        const prod = await stripe.products.create({
          name: bundleName.slice(0, 100),
          description: `Bundle: ${p1.name} + ${p2.name} zum Vorzugspreis!`,
          metadata: { quelle: "monetization_v4_bundle" },
        });
        const price = await stripe.prices.create({
          product: prod.id, unit_amount: Math.max(bundlePreis, 999), currency: "eur",
        });
        const link = await stripe.paymentLinks.create({
          line_items: [{ price: price.id, quantity: 1 }],
          after_completion: { type: "redirect", redirect: { url: "https://cybersarah.de/danke" } },
        });

        await db.insert(revenueOpportunitiesTable).values({
          titel: bundleName, typ: "bundle", kanal: "eigenes_produkt",
          status: "aktiv", geschaetzterMonatsumsatz: (bundlePreis * 8).toString(),
          stripePaymentLink: link.url, beschreibung: `Auto-Bundle: ${p1.name} + ${p2.name}`,
          quelle: "Monetization-V4-Bundle",
        }).onConflictDoNothing();
        bundlesErstellt++;
      } catch (err) {
        logger.warn({ err, bundle: combo.nameSuffix }, "Bundle-Erstellung fehlgeschlagen");
      }
    }

    return {
      success: true,
      message: `${bundlesErstellt} Bundles automatisch erstellt`,
      metadaten: { bundlesErstellt },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // FLASH SALE: Erstellt zeitlich begrenzte Angebote
  // ═══════════════════════════════════════════════════════════════════
  private async flashSale(): Promise<AufgabeErgebnis> {
    logger.info("⚡ Monetization-V4: Flash Sale");
    const stripe = getStripeClient();
    const schwachPerformend = await db.select()
      .from(revenueOpportunitiesTable)
      .where(and(
        eq(revenueOpportunitiesTable.status, "aktiv"),
        sql`created_at < NOW() - INTERVAL '7 days'`,
      ))
      .limit(5);

    let flashSales = 0;
    for (const opp of schwachPerformend) {
      if (!opp.titel) continue;
      try {
        const flashName = `⚡ FLASH SALE: ${opp.titel} -50%`;
        const originalPreis = parseInt(opp.geschaetzterMonatsumsatz ?? "1999") || 1999;
        const flashPreis = Math.round(originalPreis * 0.5);

        const prod = await stripe.products.create({
          name: flashName.slice(0, 100),
          description: `⚡ LIMITED TIME! 50% Rabatt auf ${opp.titel} — Nur für kurze Zeit!`,
          metadata: { quelle: "monetization_v4_flashsale", originalId: String(opp.id) },
        });
        const price = await stripe.prices.create({
          product: prod.id, unit_amount: flashPreis, currency: "eur",
        });
        const link = await stripe.paymentLinks.create({
          line_items: [{ price: price.id, quantity: 1 }],
          after_completion: { type: "redirect", redirect: { url: "https://cybersarah.de/danke" } },
        });

        await db.insert(revenueOpportunitiesTable).values({
          titel: flashName, typ: "flash_sale", kanal: "eigenes_produkt",
          status: "aktiv", geschaetzterMonatsumsatz: (flashPreis * 3).toString(),
          stripePaymentLink: link.url, beschreibung: `⚡ Flash Sale: ${opp.titel} zum halben Preis!`,
          quelle: "Monetization-V4-FlashSale",
        }).onConflictDoNothing();
        flashSales++;
      } catch (err) {
        logger.warn({ err, titel: opp.titel }, "Flash Sale fehlgeschlagen");
      }
    }

    return {
      success: true,
      message: `${flashSales} Flash Sales erstellt`,
      metadaten: { flashSales },
    };
  }
}
