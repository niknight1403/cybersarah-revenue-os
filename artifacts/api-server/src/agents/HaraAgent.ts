/**
 * HARA — Hyper-Autonomer Revenue Agent (OPTIMIERT)
 *
 * Vollautonomer 4-Phasen-Loop:
 *  Phase 1: Aggressive Opportunity-Detection mit echtem Stripe-Produkt-Scanning
 *  Phase 2: Hochkonfidente Vorschläge (>75 Score) werden AUTOMATISCH umgesetzt
 *  Phase 3: Autonome Ausführung — Stripe-Produkte, Payment-Links, Kampagnen
 *  Phase 4: Self-Optimization — lernt aus jedem Erfolg/Misserfolg
 */
import { db } from "@workspace/db";
import {
  haraProposalsTable,
  haraPerformanceTable,
  campaignsTable,
  revenueOpportunitiesTable,
  produkteTable,
} from "@workspace/db";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { openai, openaiVerfuegbar, handleOpenAIFehler } from "../lib/openaiClient";
import { generiereContent, type ContentAuftrag } from "./contentAgent";
import { logger } from "../lib/logger";

export interface HaraSchritt {
  beschreibung: string;
  typ: "auto_content" | "auto_kampagne" | "auto_stripe_produkt" | "auto_payment_link" | "manuell";
  status: "offen" | "erledigt" | "fehlgeschlagen";
  ergebnis?: string | null;
}

interface KiVorschlag {
  titel: string;
  marke: string;
  kanal: string;
  businessCase: string;
  roiErwartung: string;
  geschaetzterMonatsumsatz: number;
  ressourcen: string[];
  automatisierungsPfad: { beschreibung: string; typ: string }[];
  roiScore: number;
  geschwindigkeitScore: number;
  automatisierbarkeitScore: number;
}

const MAX_OFFENE_VORSCHLAEGE = 8;
const AUTO_CONFIRM_SCHWELLE = 75; // Score ab dem automatisch umgesetzt wird
const MARKEN = ["CyberSarah", "GeldPilot AI", "UnternehmerGPT"] as const;

function clampScore(n: unknown): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
}

export class HaraAgent extends AgentBase {
  constructor() {
    super("HARA — Hyper-Autonomer Revenue Agent", "hara");
  }

  protected beschreibungText(): string {
    return "Vollautonomer Revenue-Loop: findet aggressiv skalierbare Chancen, erstellt Stripe-Produkte, generiert Payment-Links und setzt hochkonfidente Pakete ohne Operator-Eingriff um";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const aktion = String(aufgabe.payload["aktion"] ?? "scan");
    if (aktion === "ausfuehrung") {
      const proposalId = Number(aufgabe.payload["proposalId"]);
      if (!Number.isFinite(proposalId)) throw new Error("proposalId fehlt für HARA-Ausführung");
      return this.fuehreProposalAus(proposalId);
    }
    if (aktion === "auto_ausfuehrung") {
      // Autonome Ausführung aller hochkonfidenten Vorschläge
      return this.fuehreAlleAutonomAus();
    }
    return this.scanne();
  }

  // ─── Autonome Ausführung aller hochkonfidenten Vorschläge ────────────────

  async fuehreAlleAutonomAus(): Promise<AufgabeErgebnis> {
    if (!db) return { success: false, message: "Keine DB verfügbar" };

    const bestaetigte = await db
      .select()
      .from(haraProposalsTable)
      .where(eq(haraProposalsTable.status, "bestaetigt"));

    if (bestaetigte.length === 0) {
      return { success: true, message: "Keine bestätigten Pakete zur Ausführung" };
    }

    let durchgefuehrt = 0;
    for (const proposal of bestaetigte) {
      try {
        await this.fuehreProposalAus(proposal.id);
        durchgefuehrt++;
      } catch (err) {
        logger.warn({ proposalId: proposal.id, err }, "HARA: Autonome Ausführung fehlgeschlagen");
      }
    }

    return {
      success: true,
      message: `${durchgefuehrt}/${bestaetigte.length} Pakete autonom ausgeführt`,
      metadaten: { durchgefuehrt, gesamt: bestaetigte.length },
    };
  }

  // ─── Phase 1 + 2: Aggressive Opportunity Detection ──────────────────────

  async scanne(): Promise<AufgabeErgebnis> {
    if (!db) return { success: false, message: "Keine DB — HARA kann nicht scannen" };

    const offene = await db
      .select({ id: haraProposalsTable.id })
      .from(haraProposalsTable)
      .where(inArray(haraProposalsTable.status, ["vorgeschlagen", "bestaetigt", "in_umsetzung"]));

    if (offene.length >= MAX_OFFENE_VORSCHLAEGE) {
      return {
        success: true,
        message: `${offene.length} Pakete aktiv — erst diese abarbeiten`,
      };
    }

    const kontext = await this.sammleKontext();
    const anzahlNeu = Math.min(4, MAX_OFFENE_VORSCHLAEGE - offene.length);
    const vorschlaege = await this.generiereVorschlaege(kontext, anzahlNeu);

    let gespeichert = 0;
    let autoBestaetigt = 0;

    for (const v of vorschlaege) {
      const roiScore = clampScore(v.roiScore);
      const geschwindigkeitScore = clampScore(v.geschwindigkeitScore);
      const automatisierbarkeitScore = clampScore(v.automatisierbarkeitScore);
      const gesamtScore = Math.round(roiScore * 0.5 + geschwindigkeitScore * 0.25 + automatisierbarkeitScore * 0.25);

      const pfad: HaraSchritt[] = (v.automatisierungsPfad ?? []).slice(0, 10).map(s => ({
        beschreibung: String(s.beschreibung).slice(0, 500),
        typ: (["auto_content", "auto_kampagne", "auto_stripe_produkt", "auto_payment_link"].includes(s.typ) ? s.typ : "manuell") as HaraSchritt["typ"],
        status: "offen",
      }));

      // Mindestens 1 Auto-Schritt erzwingen
      const hatAutoSchritt = pfad.some(s => s.typ !== "manuell");
      if (!hatAutoSchritt && pfad.length > 0) {
        pfad[0].typ = "auto_content";
      }

      // Automatisch bestätigen bei hohem Score
      const initialStatus = gesamtScore >= AUTO_CONFIRM_SCHWELLE ? "bestaetigt" : "vorgeschlagen";

      try {
        await db.insert(haraProposalsTable).values({
          titel: v.titel.slice(0, 200),
          status: initialStatus,
          marke: v.marke ?? "CyberSarah",
          kanal: v.kanal.slice(0, 100),
          businessCase: v.businessCase.slice(0, 500),
          roiErwartung: v.roiErwartung.slice(0, 200),
          geschaetzterMonatsumsatz: String(v.geschaetzterMonatsumsatz ?? 0),
          ressourcen: JSON.stringify(v.ressourcen ?? []),
          automatisierungsPfad: JSON.stringify(pfad),
          roiScore,
          geschwindigkeitScore,
          automatisierbarkeitScore,
          gesamtScore,
          quelle: "hara_ki",
        });
        gespeichert++;
        if (initialStatus === "bestaetigt") autoBestaetigt++;
      } catch (err) {
        logger.warn({ titel: v.titel, err }, "HARA: Fehler beim Speichern des Vorschlags");
      }
    }

    return {
      success: gespeichert > 0,
      message: gespeichert > 0
        ? `${gespeichert} neue Revenue-Pakete (${autoBestaetigt} automatisch bestätigt, ${gespeichert - autoBestaetigt} warten auf Bestätigung)`
        : "Keine neuen Chancen gefunden",
      metadaten: { gespeichert, autoBestaetigt, offeneVorher: offene.length },
    };
  }

  // ─── Kontext sammeln ────────────────────────────────────────────────────

  private async sammleKontext(): Promise<string> {
    const teile: string[] = [];

    // Performance-Historie
    if (db) {
      try {
        const letztPerformance = await db
          .select()
          .from(haraPerformanceTable)
          .orderBy(desc(haraPerformanceTable.createdAt))
          .limit(10);
        if (letztPerformance.length > 0) {
          teile.push("Letzte 10 HARA-Ergebnisse: " + letztPerformance.map(p =>
            `${p.titel} (${p.kanal}): ${p.resultat} — ${p.analyse.slice(0, 100)}`
          ).join("; "));
        }
      } catch { /* DB-Fehler ignorieren */ }

      // Vorhandene Produkte
      try {
        const produkte = await db.select().from(produkteTable).limit(5);
        if (produkte.length > 0) {
          teile.push("Vorhandene Stripe-Produkte: " + produkte.map(p => `${p.name} (€${p.preis})`).join(", "));
        }
      } catch { /* DB-Fehler ignorieren */ }
    }

    // Verfügbare APIs
    const verfuegbareApis: string[] = [];
    if (process.env["STRIPE_SECRET_KEY"]) verfuegbareApis.push("Stripe (Payment-Links erstellen)");
    if (process.env["OPENAI_API_KEY"]) verfuegbareApis.push("OpenAI (Content generieren)");
    if (process.env["GEMINI_API_KEY"]) verfuegbareApis.push("Gemini (KI-Inhalte)");
    teile.push("Verfügbare APIs: " + verfuegbareApis.join(", "));

    return teile.join("\n\n");
  }

  // ─── KI-Vorschläge generieren ───────────────────────────────────────────

  private async generiereVorschlaege(kontext: string, anzahl: number): Promise<KiVorschlag[]> {
    if (!openaiVerfuegbar || !openai) {
      // Fallback: Strukturierte Vorschläge basierend auf verfügbaren APIs
      return this.generiereFallbackVorschlaege(anzahl);
    }

    try {
      const antwort = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 2000,
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content: [
              "Du bist HARA — ein aggressiver Revenue-Agent für CyberSarah Revenue OS.",
              "Finde ECHTE, sofort umsetzbare Revenue-Chancen die GELD GENERIEREN.",
              "KEINE Simulationen, KEINE Theorien — nur echte Umsatzpfade.",
              "",
              "Verfügbare Instrumente:",
              "- Stripe: Payment-Links und Produkte erstellen (sofort live)",
              "- OpenAI: Content, Skripte, Verkaufstexte generieren",
              "- TikTok/Instagram/YouTube: Organische Reichweite",
              "- E-Mail: Newsletter und Sequenzen",
              "",
              "Priorisiere Chancen mit:",
              "1. GERINGEM Aufwand (schnell umsetzbar)",
              "2. HOHER Automatisierbarkeit (wenig manuelle Arbeit)",
              "3. DIREKTEM Revenue-Pfad (kein Umweg über Traffic)",
              "",
              "Antworte mit einem JSON-Objekt: { vorschlaege: [...] }",
              "Jeder Vorschlag: { titel, marke, kanal, businessCase, roiErwartung, geschaetzterMonatsumsatz, ressourcen[], automatisierungsPfad[{beschreibung, typ: auto_content|auto_kampagne|auto_stripe_produkt|auto_payment_link|manuell}], roiScore, geschwindigkeitScore, automatisierbarkeitScore }",
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              "Kontext:\n" + kontext,
              "",
              `Generiere ${anzahl} Revenue-Vorschläge für sofortige Umsetzung.`,
              "Fokus auf: Stripe-Produkte erstellen, Payment-Links generieren, Content-Kampagnen starten.",
              "Jeder Vorschlag muss mindestens 1 auto_kampagne oder auto_stripe_produkt Schritt haben.",
            ].join("\n"),
          },
        ],
      });

      const roh = antwort.choices[0]?.message?.content ?? "{}";
      const geparst = JSON.parse(roh) as { vorschlaege?: KiVorschlag[] };
      return Array.isArray(geparst.vorschlaege) ? geparst.vorschlaege.slice(0, anzahl) : [];
    } catch (err) {
      handleOpenAIFehler(err, "HARA-Scan");
      return this.generiereFallbackVorschlaege(anzahl);
    }
  }

  // ─── Fallback-Vorschläge (ohne KI) ─────────────────────────────────────

  private generiereFallbackVorschlaege(anzahl: number): KiVorschlag[] {
    const fallbacks: KiVorschlag[] = [
      {
        titel: "KI-Prompt Paket erstellen und verkaufen",
        marke: "CyberSarah",
        kanal: "Stripe + TikTok",
        businessCase: "50+ ChatGPT-Prompts als PDF verkaufen via Stripe Payment Link",
        roiErwartung: "€500-2000/Monat bei 50-200 Verkäufen à €19",
        geschaetzterMonatsumsatz: 1000,
        ressourcen: ["Stripe", "OpenAI", "TikTok"],
        automatisierungsPfad: [
          { beschreibung: "Stripe-Produkt 'KI-Prompt Paket' erstellen", typ: "auto_stripe_produkt" },
          { beschreibung: "Payment-Link generieren", typ: "auto_payment_link" },
          { beschreibung: "Verkaufstext mit OpenAI generieren", typ: "auto_content" },
          { beschreibung: "TikTok-Content erstellen der auf den Link zeigt", typ: "auto_content" },
          { beschreibung: "Kampagne starten", typ: "auto_kampagne" },
        ],
        roiScore: 80,
        geschwindigkeitScore: 85,
        automatisierbarkeitScore: 90,
      },
      {
        titel: "1:1 KI-Coaching anbieten",
        marke: "GeldPilot AI",
        kanal: "Stripe + WhatsApp",
        businessCase: "60-minütige KI-Business-Session für €197 via Stripe",
        roiErwartung: "€1000-5000/Monat bei 5-25 Sessions",
        geschaetzterMonatsumsatz: 2000,
        ressourcen: ["Stripe", "WhatsApp"],
        automatisierungsPfad: [
          { beschreibung: "Stripe-Produkt 'KI-Coaching 60min' erstellen", typ: "auto_stripe_produkt" },
          { beschreibung: "Payment-Link für Buchung generieren", typ: "auto_payment_link" },
          { beschreibung: "WhatsApp-Nachrichten-Vorlage erstellen", typ: "auto_content" },
          { beschreibung: "Kampagne 'Coaching-Angebot' starten", typ: "auto_kampagne" },
        ],
        roiScore: 90,
        geschwindigkeitScore: 70,
        automatisierbarkeitScore: 75,
      },
      {
        titel: "SEO-Blog mit Affiliate-Links",
        marke: "UnternehmerGPT",
        kanal: "SEO + Digistore24",
        businessCase: "SEO-optimierte Artikel mit Affiliate-Links zu KI-Kursen",
        roiErwartung: "€200-1000/Monat passiv",
        geschaetzterMonatsumsatz: 500,
        ressourcen: ["OpenAI", "SEO"],
        automatisierungsPfad: [
          { beschreibung: "SEO-Artikel zu profitablem Keyword generieren", typ: "auto_content" },
          { beschreibung: "Affiliate-Links einbetten", typ: "auto_content" },
          { beschreibung: "Kampagne für organischen Traffic starten", typ: "auto_kampagne" },
        ],
        roiScore: 70,
        geschwindigkeitScore: 60,
        automatisierbarkeitScore: 85,
      },
      {
        titel: "Premium Newsletter mit Bezahlfunktion",
        marke: "CyberSarah",
        kanal: "E-Mail + Stripe",
        businessCase: "Wöchentlicher KI-Business-Newsletter für €9/Monat",
        roiErwartung: "€500-3000/Monat bei 50-300 Abonnenten",
        geschaetzterMonatsumsatz: 1500,
        ressourcen: ["Stripe", "OpenAI", "E-Mail"],
        automatisierungsPfad: [
          { beschreibung: "Stripe-Abo-Produkt erstellen", typ: "auto_stripe_produkt" },
          { beschreibung: "Abo-Link generieren", typ: "auto_payment_link" },
          { beschreibung: "Willkommens-E-Mail-Sequenz erstellen", typ: "auto_content" },
          { beschreibung: "Content-Plan für 4 Wochen generieren", typ: "auto_content" },
          { beschreibung: "Kampagne starten", typ: "auto_kampagne" },
        ],
        roiScore: 85,
        geschwindigkeitScore: 75,
        automatisierbarkeitScore: 80,
      },
    ];

    return fallbacks.slice(0, anzahl);
  }

  // ─── Phase 3: Autonome Ausführung ───────────────────────────────────────

  async fuehreProposalAus(proposalId: number): Promise<AufgabeErgebnis> {
    if (!db) return { success: false, message: "Keine DB verfügbar" };

    const [proposal] = await db.select().from(haraProposalsTable).where(eq(haraProposalsTable.id, proposalId)).limit(1);
    if (!proposal) throw new Error(`HARA-Paket ${proposalId} nicht gefunden`);

    // Automatisch bestätigen wenn Score hoch genug
    if (proposal.status === "vorgeschlagen") {
      const score = proposal.gesamtScore ?? 0;
      if (score >= AUTO_CONFIRM_SCHWELLE) {
        await db.update(haraProposalsTable)
          .set({ status: "bestaetigt", bestaetigtAm: new Date(), updatedAt: new Date() })
          .where(eq(haraProposalsTable.id, proposalId));
        proposal.status = "bestaetigt";
      } else {
        return { success: false, message: `Paket ${proposalId} hat Score ${score}/${AUTO_CONFIRM_SCHWELLE} — Bestätigung erforderlich` };
      }
    }

    if (proposal.status !== "bestaetigt" && proposal.status !== "in_umsetzung") {
      return { success: false, message: `Status: ${proposal.status} — keine Ausführung` };
    }

    await db.update(haraProposalsTable)
      .set({ status: "in_umsetzung", updatedAt: new Date() })
      .where(eq(haraProposalsTable.id, proposalId));

    const pfad: HaraSchritt[] = JSON.parse(proposal.automatisierungsPfad || "[]");
    const marke = proposal.marke ?? "CyberSarah";
    let autoErledigt = 0;
    let autoFehler = 0;

    for (const schritt of pfad) {
      if (schritt.status !== "offen") continue;

      try {
        if (schritt.typ === "auto_stripe_produkt") {
          // Stripe-Produkt autonom erstellen
          const ergebnis = await this.erstelleStripeProdukt(proposal.titel, marke);
          schritt.status = "erledigt";
          schritt.ergebnis = ergebnis;
          autoErledigt++;
        } else if (schritt.typ === "auto_payment_link") {
          // Payment-Link autonom erstellen
          const ergebnis = await this.erstellePaymentLink(proposal.titel, marke);
          schritt.status = "erledigt";
          schritt.ergebnis = ergebnis;
          autoErledigt++;
        } else if (schritt.typ === "auto_kampagne") {
          const [kampagne] = await db.insert(campaignsTable).values({
            name: `HARA: ${proposal.titel}`.slice(0, 255),
            marke,
            typ: "hara",
            netzwerk: proposal.kanal.slice(0, 64),
            status: "aktiv",
            startDatum: new Date(),
          }).returning();
          schritt.status = "erledigt";
          schritt.ergebnis = `Kampagne #${kampagne?.id} angelegt`;
          autoErledigt++;
        } else if (schritt.typ === "auto_content") {
          const auftrag: ContentAuftrag = {
            marke: marke as ContentAuftrag["marke"],
            typ: "tiktok",
            plattform: "TikTok",
            thema: `${proposal.titel} — ${schritt.beschreibung}`.slice(0, 200),
          };
          const contentId = await generiereContent(auftrag, this.agentId ?? 0);
          schritt.status = "erledigt";
          schritt.ergebnis = `Content #${contentId} generiert`;
          autoErledigt++;
        }
      } catch (err) {
        schritt.status = "fehlgeschlagen";
        schritt.ergebnis = err instanceof Error ? err.message.slice(0, 300) : "Unbekannter Fehler";
        autoFehler++;
        logger.warn({ proposalId, schritt: schritt.beschreibung, err }, "HARA-Auto-Schritt fehlgeschlagen");
      }
    }

    const offeneManuell = pfad.filter(s => s.typ === "manuell" && s.status === "offen").length;
    const alleErledigt = pfad.every(s => s.status === "erledigt");
    const neuerStatus = alleErledigt ? "abgeschlossen" : "in_umsetzung";

    await db.update(haraProposalsTable)
      .set({ automatisierungsPfad: JSON.stringify(pfad), status: neuerStatus, updatedAt: new Date() })
      .where(eq(haraProposalsTable.id, proposalId));

    // Revenue-Opportunity eintragen
    if (autoErledigt > 0) {
      try {
        await db.insert(revenueOpportunitiesTable).values({
          titel: `HARA: ${proposal.titel}`.slice(0, 200),
          beschreibung: proposal.businessCase.slice(0, 500),
          kanal: proposal.kanal.slice(0, 100),
          marke,
          status: "aktiv",
          geschaetzterMonatsumsatz: proposal.geschaetzterMonatsumsatz ?? "0",
          gefundenVon: "hara",
        });
      } catch { /* Revenue-Eintrag ist nice-to-have */ }
    }

    // Phase 4: Performance-Eintrag
    if (alleErledigt || autoFehler > 0) {
      await this.schreibePerformance(
        proposal.id,
        proposal.titel,
        proposal.kanal,
        autoFehler > 0 ? "misserfolg" : "erfolg",
        autoFehler > 0
          ? `${autoFehler} Schritt(e) fehlgeschlagen, ${autoErledigt} erfolgreich`
          : `Alle ${pfad.length} Schritte automatisch abgeschlossen`,
      );
    }

    return {
      success: autoFehler === 0,
      message: `Ausführung: ${autoErledigt} Auto-Schritt(e) erledigt, ${autoFehler} fehlgeschlagen, ${offeneManuell} manuell`,
      metadaten: { proposalId, autoErledigt, autoFehler, offeneManuell, status: neuerStatus },
    };
  }

  // ─── Stripe-Produkt autonom erstellen ───────────────────────────────────

  private async erstelleStripeProdukt(name: string, marke: string): Promise<string> {
    try {
      const { getStripeClient } = await import("../lib/stripeClient");
      const stripe = getStripeClient();

      const produkt = await stripe.products.create({
        name: `${name} — ${marke}`,
        description: `Generiert vom HARA Revenue Agent für ${marke}`,
        metadata: { quelle: "hara", marke, system: "CyberSarah-OS" },
      });

      const preis = await stripe.prices.create({
        product: produkt.id,
        unit_amount: 1900, // €19 Standard-Preis
        currency: "eur",
        metadata: { quelle: "hara" },
      });

      // In DB speichern
      if (db) {
        try {
          await db.insert(produkteTable).values({
            name: `${name} — ${marke}`,
            beschreibung: `Generiert vom HARA Revenue Agent`,
            preis: "19.00",
            kategorie: "hara_generiert",
            slug: `hara-${Date.now()}`,
            stripeProduktId: produkt.id,
            stripePreisId: preis.id,
            aktiv: true,
          });
        } catch { /* DB-Fehler ist nicht kritisch */ }
      }

      return `Stripe-Produkt #${produkt.id} erstellt (Preis: €19)`;
    } catch (err) {
      throw new Error(`Stripe-Produkt-Erstellung fehlgeschlagen: ${err instanceof Error ? err.message : "?"}`);
    }
  }

  // ─── Payment-Link autonom erstellen ─────────────────────────────────────

  private async erstellePaymentLink(name: string, _marke: string): Promise<string> {
    try {
      const { getStripeClient } = await import("../lib/stripeClient");
      const stripe = getStripeClient();

      // Letztes erstelltes Produkt finden
      let preisId: string | undefined;
      if (db) {
        try {
          const [produkt] = await db.select().from(produkteTable)
            .where(sql`${produkteTable.name} LIKE ${"%" + name + "%"}`)
            .orderBy(desc(produkteTable.createdAt))
            .limit(1);
          preisId = produkt?.stripePreisId ?? undefined;
        } catch { /* ignorieren */ }
      }

      if (!preisId) {
        return "Kein Preis gefunden — Payment-Link übersprungen (Produkt erst zuerst erstellen)";
      }

      const link = await stripe.paymentLinks.create({
        line_items: [{ price: preisId, quantity: 1 }],
        after_completion: {
          type: "redirect",
          redirect: { url: "https://cybersarah.de/danke" },
        },
        metadata: { quelle: "hara", produkt: name },
      });

      return `Payment-Link erstellt: ${link.url}`;
    } catch (err) {
      throw new Error(`Payment-Link-Erstellung fehlgeschlagen: ${err instanceof Error ? err.message : "?"}`);
    }
  }

  // ─── Phase 4: Self-Optimization ─────────────────────────────────────────

  private async schreibePerformance(
    proposalId: number | null,
    titel: string,
    kanal: string | null,
    resultat: "erfolg" | "misserfolg" | "verworfen",
    analyse: string,
  ): Promise<void> {
    if (!db) return;
    try {
      await db.insert(haraPerformanceTable).values({
        proposalId,
        titel: titel.slice(0, 200),
        kanal: kanal?.slice(0, 100) ?? null,
        resultat,
        analyse: analyse.slice(0, 1000),
      });
    } catch { /* Performance-Logging ist nice-to-have */ }
  }
}
