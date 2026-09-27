import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { db } from "@workspace/db";
import { contentTable } from "@workspace/db";
import { desc, gte } from "drizzle-orm";
import { generiereContent, type ContentAuftrag } from "./contentAgent";
import { globalQueue } from "./JobQueue";
import {
  buildContentEnginePackage,
  buildCampaignVariants,
  selectBestReadyVariant,
  scoreEngagementDistribution,
  type HealthContentPlatform,
  type HealthContentAngle,
} from "./influencerContentEngine";

export interface InfluencerAufgabePayload {
  aktion:
    | "content_generieren"
    | "trend_analyse"
    | "engagement_optimieren"
    | "content_paket"
    | "kampagne_generieren";
  marke?: "CyberSarah" | "GeldPilot AI" | "UnternehmerGPT";
  plattform?: "TikTok" | "Instagram" | "YouTube" | "Google" | "Blog";
  plattformen?: HealthContentPlatform[];
  thema?: string;
  zielgruppe?: string;
  angle?: HealthContentAngle;
  affiliateProdukt?: string;
}

const DEFAULT_HEALTH_TOPIC = "alltagstaugliche Wellness-Routinen für Erwachsene 35-60";

export class InfluencerAgent extends AgentBase {
  constructor() {
    super("Influencer Agent", "influencer");
  }

  protected beschreibungText(): string {
    return "AI Influencer & Content Engine: erstellt EU-taugliche Health/Wellness-Shorts, visuelle Prompts, Affiliate-Strategien und autonome Multi-Plattform-Kampagnen.";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const payload = aufgabe.payload as unknown as InfluencerAufgabePayload;

    switch (payload.aktion) {
      case "content_generieren":
        return this.generiereInfluencerContent(payload);
      case "content_paket":
        return this.erstelleContentPaket(payload);
      case "kampagne_generieren":
        return this.generiereKampagne(payload);
      case "trend_analyse":
        return this.analysiereTrends();
      case "engagement_optimieren":
        return this.optimiereEngagement();
      default:
        return { success: false, message: `Unbekannte Aktion: ${payload.aktion}` };
    }
  }

  private normalisierePlattform(plattform?: InfluencerAufgabePayload["plattform"]): HealthContentPlatform {
    if (plattform === "Instagram" || plattform === "YouTube") return plattform;
    return "TikTok";
  }

  private erstelleContentPaket(payload: InfluencerAufgabePayload): Promise<AufgabeErgebnis> {
    const plattform = this.normalisierePlattform(payload.plattform);
    const thema = payload.thema?.trim() || DEFAULT_HEALTH_TOPIC;
    const paket = buildContentEnginePackage({
      thema,
      plattform,
      zielgruppe: payload.zielgruppe,
      angle: payload.angle,
      affiliateProdukt: payload.affiliateProdukt,
    });

    return Promise.resolve({
      success: true,
      message: `Content-Paket für ${plattform} erstellt: Script-Brief, Image-Prompt, Affiliate-Strategie und Compliance-Checks.`,
      metadaten: { thema, plattform, ...paket },
    });
  }

  private async generiereInfluencerContent(payload: InfluencerAufgabePayload): Promise<AufgabeErgebnis> {
    const angefordertePlattform = payload.plattform ?? "Instagram";
    const shortPlattform = this.normalisierePlattform(angefordertePlattform);
    const thema = payload.thema?.trim() || DEFAULT_HEALTH_TOPIC;
    const paket = buildContentEnginePackage({
      thema,
      plattform: shortPlattform,
      zielgruppe: payload.zielgruppe,
      angle: payload.angle,
      affiliateProdukt: payload.affiliateProdukt,
    });
    const istLongform = angefordertePlattform === "Google" || angefordertePlattform === "Blog";

    const auftrag: ContentAuftrag = {
      marke: payload.marke ?? "CyberSarah",
      typ: istLongform
        ? "blogartikel"
        : shortPlattform === "Instagram"
          ? "reel"
          : shortPlattform === "TikTok"
            ? "tiktok"
            : "kurzVideo",
      plattform: angefordertePlattform,
      thema: istLongform
        ? `${thema}\n\nCOMPLIANCE:\n- ${paket.complianceNotes.join("\n- ")}`
        : `${thema}\n\nPRODUKTIONS-BRIEF:\n${paket.scriptBrief}\n\nCOMPLIANCE:\n- ${paket.complianceNotes.join("\n- ")}`,
    };

    const agentId = this.holeAgentId() ?? 0;
    const contentId = await generiereContent(auftrag, agentId);

    return {
      success: true,
      message: `AI-Influencer-Content generiert (ID: ${contentId}) für ${auftrag.marke} auf ${auftrag.plattform}`,
      metadaten: {
        contentId,
        marke: auftrag.marke,
        plattform: auftrag.plattform,
        imagePrompt: paket.imagePrompt,
        affiliateStrategy: paket.affiliateStrategy,
        hashtags: paket.hashtags,
        complianceNotes: paket.complianceNotes,
      },
    };
  }

  private async generiereKampagne(payload: InfluencerAufgabePayload): Promise<AufgabeErgebnis> {
    const thema = payload.thema?.trim() || DEFAULT_HEALTH_TOPIC;
    const plattformen = payload.plattformen?.length
      ? [...new Set(payload.plattformen)]
      : ["TikTok", "Instagram", "YouTube"] as HealthContentPlatform[];

    // Jede Plattform wird als eigener Queue-Job ausgeführt. Dadurch sind Retries
    // pro Plattform isoliert und bereits erfolgreiche Plattformen werden bei einem
    // transienten Fehler einer anderen Plattform nicht erneut erzeugt.
    const variants = buildCampaignVariants({
      thema,
      zielgruppe: payload.zielgruppe,
      affiliateProdukt: payload.affiliateProdukt,
    }, plattformen);
    const bestVariant = selectBestReadyVariant(variants);

    const jobs = plattformen.map((plattform) => ({
      plattform,
      jobId: globalQueue.fuegeHinzu("influencer_content", {
        aktion: "content_generieren",
        marke: payload.marke ?? "CyberSarah",
        plattform,
        thema,
        zielgruppe: payload.zielgruppe,
        angle: payload.angle,
        affiliateProdukt: payload.affiliateProdukt,
      }, { prioritaet: 3, maxVersuche: 3 }),
    }));

    return {
      success: true,
      message: `Autonome Influencer-Kampagne für ${thema} auf ${plattformen.length} Plattformen eingeplant.`,
      metadaten: {
        thema,
        anzahl: jobs.length,
        jobs,
        experiments: variants,
        bestVariant,
        experimentPolicy: "2 Hook-Angles pro Plattform; primäre Plattform-Metrik messen; Gewinner erst nach Messdaten skalieren.",
      },
    };
  }

  private async analysiereTrends(): Promise<AufgabeErgebnis> {
    const letzteWoche = new Date();
    letzteWoche.setDate(letzteWoche.getDate() - 7);

    const recentContent = await db
      .select({ plattform: contentTable.plattform, marke: contentTable.marke })
      .from(contentTable)
      .where(gte(contentTable.createdAt, letzteWoche))
      .limit(100);

    const plattformVerteilung = recentContent.reduce<Record<string, number>>((acc, c) => {
      acc[c.plattform] = (acc[c.plattform] ?? 0) + 1;
      return acc;
    }, {});
    const score = scoreEngagementDistribution(plattformVerteilung);

    return {
      success: true,
      message: `Trend-Analyse: Top-Plattform ist ${score.topPlatform} (${score.total} Contents analysiert)`,
      metadaten: {
        plattformVerteilung,
        topPlattform: score.topPlatform,
        analysiertContent: score.total,
        konzentration: score.concentration,
        naechsteAktion: score.total < 6 ? "Mehr Test-Content über alle Plattformen verteilen" : "Top-Plattform priorisieren und Varianten testen",
      },
    };
  }

  private async optimiereEngagement(): Promise<AufgabeErgebnis> {
    const letzterContent = await db
      .select({ plattform: contentTable.plattform, typ: contentTable.typ, status: contentTable.status })
      .from(contentTable)
      .orderBy(desc(contentTable.createdAt))
      .limit(30);

    const counts = letzterContent.reduce<Record<string, number>>((acc, item) => {
      acc[item.plattform] = (acc[item.plattform] ?? 0) + 1;
      return acc;
    }, {});
    const score = scoreEngagementDistribution(counts);
    const empfehlung = score.total === 0
      ? "Starte mit je einem TikTok, Reel und YouTube Short und messe CTR/Retention als Baseline."
      : score.concentration > 0.65
        ? `Content ist stark auf ${score.topPlatform} konzentriert. Teste mindestens 30% der nächsten Inhalte auf den anderen Plattformen.`
        : `${score.topPlatform} führt aktuell. Erzeuge dort zwei Hook-Varianten und behalte parallel Cross-Platform-Tests bei.`;

    return {
      success: true,
      message: `Engagement-Optimierung: ${empfehlung}`,
      metadaten: {
        empfehlung,
        analysierteInhalte: letzterContent.length,
        topPlattform: score.topPlatform,
        konzentration: score.concentration,
        naechsteAktion: "Hook-A/B-Test + Retention/CTR messen",
      },
    };
  }
}
