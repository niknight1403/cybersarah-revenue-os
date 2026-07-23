/**
 * HARA — Hyper-Autonomer Revenue Agent
 *
 * Rekursiver 4-Phasen-Loop:
 *  Phase 1 (Opportunity Detection): scannt System-Daten + Lern-Historie und
 *    generiert per KI strukturierte Revenue-Pakete ("Path of Least Resistance",
 *    Scoring nach ROI × Geschwindigkeit × Automatisierbarkeit).
 *  Phase 2 (Proposal & Validation): Pakete warten als "vorgeschlagen" auf das
 *    CONFIRM-Signal des Operators. Keine eigenmächtige Ausführung.
 *  Phase 3 (Autonome Ausführung): nach CONFIRM werden alle automatisierbaren
 *    Schritte sofort ausgeführt (Kampagne anlegen, Content generieren);
 *    manuelle Schritte bleiben als präzise Checkliste übrig.
 *  Phase 4 (Self-Optimization): jedes Ergebnis (Erfolg/Misserfolg/Verworfen)
 *    wird als Performance-Eintrag gespeichert und beim nächsten Scan als
 *    Kontext-Wissen eingelesen — nur konvertierende Strategien steigen auf.
 */
import { db } from "@workspace/db";
import {
  haraProposalsTable,
  haraPerformanceTable,
  campaignsTable,
  revenueOpportunitiesTable,
  transactionsTable,
} from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { openai, openaiVerfuegbar, handleOpenAIFehler } from "../lib/openaiClient";
import { generiereContent, type ContentAuftrag } from "./contentAgent";
import { logger } from "../lib/logger";

// ─── Typen ───────────────────────────────────────────────────────────────────

export interface HaraSchritt {
  beschreibung: string;
  typ: "auto_content" | "auto_kampagne" | "manuell";
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
  automatisierungsPfad: { beschreibung: string; typ: "auto_content" | "auto_kampagne" | "manuell" }[];
  roiScore: number;
  geschwindigkeitScore: number;
  automatisierbarkeitScore: number;
}

const MAX_OFFENE_VORSCHLAEGE = 6;
const MARKEN = ["CyberSarah", "GeldPilot AI", "UnternehmerGPT"] as const;
const SEED_TRANSAKTIONS_ID = /^txn_\d+$/;

function clampScore(n: unknown): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
}

export class HaraAgent extends AgentBase {
  constructor() {
    super("HARA — Hyper-Autonomer Revenue Agent", "hara");
  }

  protected beschreibungText(): string {
    return "Rekursiver Revenue-Loop: findet aggressiv skalierbare Chancen, erstellt Revenue-Pakete zur Bestätigung, setzt nach CONFIRM autonom um und lernt aus jedem Ergebnis";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const aktion = String(aufgabe.payload["aktion"] ?? "scan");
    if (aktion === "ausfuehrung") {
      const proposalId = Number(aufgabe.payload["proposalId"]);
      if (!Number.isFinite(proposalId)) throw new Error("proposalId fehlt für HARA-Ausführung");
      return this.fuehreProposalAus(proposalId);
    }
    return this.scanne();
  }

  // ─── Phase 1 + 2: Opportunity Detection → Vorschläge ──────────────────────

  async scanne(): Promise<AufgabeErgebnis> {
    const offene = await db
      .select({ id: haraProposalsTable.id })
      .from(haraProposalsTable)
      .where(inArray(haraProposalsTable.status, ["vorgeschlagen", "bestaetigt", "in_umsetzung"]));

    if (offene.length >= MAX_OFFENE_VORSCHLAEGE) {
      return {
        success: true,
        message: `Scan übersprungen — ${offene.length} Pakete warten bereits auf Bestätigung oder Umsetzung. Erst entscheiden, dann neu scannen.`,
      };
    }

    const kontext = await this.sammleKontext();
    const anzahlNeu = Math.min(3, MAX_OFFENE_VORSCHLAEGE - offene.length);
    const vorschlaege = await this.generiereVorschlaege(kontext, anzahlNeu);

    let gespeichert = 0;
    for (const v of vorschlaege) {
      const roiScore = clampScore(v.roiScore);
      const geschwindigkeitScore = clampScore(v.geschwindigkeitScore);
      const automatisierbarkeitScore = clampScore(v.automatisierbarkeitScore);
      // Path of Least Resistance: Geschwindigkeit + Automatisierbarkeit zählen zusammen so viel wie ROI
      const gesamtScore = Math.round(roiScore * 0.5 + geschwindigkeitScore * 0.25 + automatisierbarkeitScore * 0.25);

      const pfad: HaraSchritt[] = (v.automatisierungsPfad ?? []).slice(0, 8).map(s => ({
        beschreibung: String(s.beschreibung).slice(0, 500),
        typ: s.typ === "auto_content" || s.typ === "auto_kampagne" ? s.typ : "manuell",
        status: "offen",
      }));

      // Strukturelle Mindestregeln (nicht nur dem LLM überlassen):
      // 2-8 Schritte, mindestens 1 Auto-Schritt, höchstens 1 auto_kampagne.
      const autoSchritte = pfad.filter(s => s.typ !== "manuell").length;
      const kampagnenSchritte = pfad.filter(s => s.typ === "auto_kampagne").length;
      if (pfad.length < 2 || autoSchritte === 0 || kampagnenSchritte > 1) {
        logger.warn(
          { titel: String(v.titel).slice(0, 60), schritte: pfad.length, autoSchritte, kampagnenSchritte },
          "HARA-Vorschlag verworfen: ungültiger Automatisierungs-Pfad",
        );
        continue;
      }

      await db.insert(haraProposalsTable).values({
        titel: String(v.titel).slice(0, 200),
        status: "vorgeschlagen",
        marke: MARKEN.includes(v.marke as (typeof MARKEN)[number]) ? v.marke : "CyberSarah",
        kanal: String(v.kanal).slice(0, 100),
        businessCase: String(v.businessCase).slice(0, 2000),
        roiErwartung: String(v.roiErwartung).slice(0, 1000),
        geschaetzterMonatsumsatz: String(Math.max(0, Number(v.geschaetzterMonatsumsatz) || 0)),
        ressourcen: JSON.stringify((v.ressourcen ?? []).slice(0, 10).map(r => String(r).slice(0, 200))),
        automatisierungsPfad: JSON.stringify(pfad),
        roiScore,
        geschwindigkeitScore,
        automatisierbarkeitScore,
        gesamtScore,
      });
      gespeichert++;
    }

    return {
      success: true,
      message: gespeichert > 0
        ? `${gespeichert} neue Revenue-Paket(e) erstellt — warten auf CONFIRM im HARA-Tab`
        : "Keine neuen Pakete generiert (KI nicht verfügbar oder keine sinnvollen Chancen gefunden)",
      metadaten: { gespeichert, offeneVorher: offene.length },
    };
  }

  private async sammleKontext(): Promise<string> {
    const [performance, kampagnen, chancen, transaktionen, bestehende] = await Promise.all([
      db.select().from(haraPerformanceTable).orderBy(desc(haraPerformanceTable.createdAt)).limit(10),
      db.select().from(campaignsTable).limit(100),
      db.select().from(revenueOpportunitiesTable).orderBy(desc(revenueOpportunitiesTable.geschaetzterMonatsumsatz)).limit(20),
      db.select().from(transactionsTable).limit(200),
      db.select({ titel: haraProposalsTable.titel, status: haraProposalsTable.status }).from(haraProposalsTable).orderBy(desc(haraProposalsTable.createdAt)).limit(20),
    ]);

    const aktiveKampagnen = kampagnen.filter(k => k.status === "aktiv");
    const echteTransaktionen = transaktionen.filter(t => !SEED_TRANSAKTIONS_ID.test(String(t.id)));

    const lernHistorie = performance.length > 0
      ? performance.map(p => `- [${p.resultat}] ${p.titel} (${p.kanal ?? "?"}) → ${p.analyse}`).join("\n")
      : "Noch keine Lern-Einträge vorhanden — erste Iteration.";

    return [
      `SYSTEM-ZUSTAND:`,
      `- Aktive Kampagnen: ${aktiveKampagnen.length} (Kanäle: ${[...new Set(aktiveKampagnen.map(k => k.netzwerk))].join(", ") || "keine"})`,
      `- Echte Zahlungen bisher: ${echteTransaktionen.length} (${echteTransaktionen.reduce((s, t) => s + Number(t.betrag ?? 0), 0).toFixed(2)}€)`,
      `- Top bekannte Chancen: ${chancen.slice(0, 5).map(c => `${c.titel} (${c.kanal}, ~${c.geschaetzterMonatsumsatz}€/M)`).join("; ") || "keine"}`,
      `- Bereits vorgeschlagene HARA-Pakete (NICHT duplizieren): ${bestehende.map(b => b.titel).join("; ") || "keine"}`,
      ``,
      `LERN-HISTORIE (Self-Optimization — priorisiere was funktioniert hat, vermeide was verworfen/gescheitert ist):`,
      lernHistorie,
    ].join("\n");
  }

  private async generiereVorschlaege(kontext: string, anzahl: number): Promise<KiVorschlag[]> {
    if (!openaiVerfuegbar) {
      logger.warn("HARA-Scan: OpenAI nicht verfügbar — kein Scan möglich");
      return [];
    }

    try {
      const antwort = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "Du bist HARA, ein hyper-autonomer Revenue-Stratege für einen deutschen Solo-Operator mit drei Marken:",
              "CyberSarah (KI/Automatisierung), GeldPilot AI (Online-Geld-verdienen), UnternehmerGPT (KMU-Beratung).",
              "Verfügbare Fähigkeiten des Systems: automatische Content-Generierung (TikTok/Reels/Blog via GPT), Kampagnen-Verwaltung, Stripe-Zahlungen, Affiliate-Links.",
              "KEIN Werbebudget, KEINE bestehende große Reichweite. Finde den Path of Least Resistance: maximaler Ertrag bei minimalem Widerstand.",
              "Sei aggressiv-pragmatisch: schnelle MVP-Tests statt langer Planung. Aber bleib realistisch und seriös — keine Fantasie-Umsätze, keine unlauteren Methoden.",
              "Antworte NUR mit validem JSON.",
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              kontext,
              "",
              `Erstelle genau ${anzahl} NEUE, voneinander verschiedene Revenue-Pakete als JSON:`,
              `{"vorschlaege": [{`,
              `  "titel": "kurzer prägnanter Titel",`,
              `  "marke": "CyberSarah" | "GeldPilot AI" | "UnternehmerGPT",`,
              `  "kanal": "z.B. TikTok, Digistore24, Gumroad, YouTube, Blog/SEO",`,
              `  "businessCase": "Was + Warum + realistische ROI-Erwartung in 2-4 Sätzen",`,
              `  "roiErwartung": "konkrete, ehrliche Einschätzung inkl. Zeithorizont",`,
              `  "geschaetzterMonatsumsatz": Zahl in Euro (konservativ),`,
              `  "ressourcen": ["benötigte Tools/APIs/Budget, max 5"],`,
              `  "automatisierungsPfad": [{"beschreibung": "konkreter Schritt", "typ": "auto_content" | "auto_kampagne" | "manuell"}],`,
              `  "roiScore": 0-100, "geschwindigkeitScore": 0-100, "automatisierbarkeitScore": 0-100`,
              `}]}`,
              "",
              "Regeln für den automatisierungsPfad (3-6 Schritte):",
              "- 'auto_kampagne' = System legt Tracking-Kampagne automatisch an (max 1x pro Paket)",
              "- 'auto_content' = System generiert sofort passenden Content (Skripte/Artikel)",
              "- 'manuell' = Operator-Schritt mit präziser Anleitung (z.B. Konto anlegen, Video aufnehmen, Link einfügen)",
              "Plattform-Registrierungen sind IMMER 'manuell' (Operator behält Kontrolle über Konten).",
            ].join("\n"),
          },
        ],
      });

      const roh = antwort.choices[0]?.message?.content ?? "{}";
      const geparst = JSON.parse(roh) as { vorschlaege?: KiVorschlag[] };
      return Array.isArray(geparst.vorschlaege) ? geparst.vorschlaege.slice(0, anzahl) : [];
    } catch (err) {
      handleOpenAIFehler(err, "HARA-Scan");
      return [];
    }
  }

  // ─── Phase 3: Autonome Ausführung nach CONFIRM ─────────────────────────────

  async fuehreProposalAus(proposalId: number): Promise<AufgabeErgebnis> {
    const [proposal] = await db.select().from(haraProposalsTable).where(eq(haraProposalsTable.id, proposalId)).limit(1);
    if (!proposal) throw new Error(`HARA-Paket ${proposalId} nicht gefunden`);
    if (proposal.status !== "bestaetigt" && proposal.status !== "in_umsetzung") {
      return { success: false, message: `Paket ${proposalId} ist nicht bestätigt (Status: ${proposal.status}) — keine Ausführung ohne CONFIRM` };
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
        if (schritt.typ === "auto_kampagne") {
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
          schritt.ergebnis = `Content #${contentId} generiert (im Content-Tab)`;
          autoErledigt++;
        }
        // "manuell" bleibt offen — Checkliste für den Operator
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

    // Phase 4: Lern-Eintrag bei Abschluss oder Fehlern
    if (alleErledigt || autoFehler > 0) {
      await this.schreibePerformance(
        proposal.id,
        proposal.titel,
        proposal.kanal,
        autoFehler > 0 ? "misserfolg" : "erfolg",
        autoFehler > 0
          ? `${autoFehler} Auto-Schritt(e) fehlgeschlagen, ${autoErledigt} erfolgreich. Fehlerdetails im Automatisierungs-Pfad.`
          : `Alle ${pfad.length} Schritte automatisch abgeschlossen — vollautomatisierbare Strategie, Muster wiederholen.`,
      );
    }

    return {
      success: autoFehler === 0,
      message: `Ausführung: ${autoErledigt} Auto-Schritt(e) erledigt, ${autoFehler} fehlgeschlagen, ${offeneManuell} manuelle(r) Schritt(e) warten auf dich`,
      metadaten: { proposalId, autoErledigt, autoFehler, offeneManuell, status: neuerStatus },
    };
  }

  // ─── Phase 4: Self-Optimization ────────────────────────────────────────────

  async schreibePerformance(
    proposalId: number | null,
    titel: string,
    kanal: string | null,
    resultat: "erfolg" | "misserfolg" | "verworfen",
    analyse: string,
  ): Promise<void> {
    await db.insert(haraPerformanceTable).values({
      proposalId,
      titel: titel.slice(0, 200),
      kanal: kanal?.slice(0, 100) ?? null,
      resultat,
      analyse: analyse.slice(0, 1000),
    });
  }
}
