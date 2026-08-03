import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { db } from "@workspace/db";
import {
  contentCharactersTable,
  contentItemsTable,
  contentTemplatesTable,
  contentIdeasTable,
} from "@workspace/db/schema/contentEngine";
import {
  contentCharactersTable as cc,
  contentItemsTable as ci,
  contentTemplatesTable as ct,
  contentIdeasTable as cideas,
} from "@workspace/db/schema/contentEngine";
import { eq, desc, and, sql, inArray, isNull } from "drizzle-orm";
import { logger } from "../lib/logger";
import { openai, openaiVerfuegbar } from "../lib/openaiClient";

interface ContentGenerationResult {
  title: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  qualityScores: {
    readability: number;
    brandVoice: number;
    personalVoice: number;
    marketingSpeak: number;
    transparency: number;
    overall: number;
  };
}

export class ContentEngineAgent extends AgentBase {
  constructor() {
    super("Content Engine Agent", "content_engine");
  }

  protected beschreibungText(): string {
    return "Zentrale Content-Engine: Verwaltet KI-Charaktere, generiert Content über Pipeline (Ideation → Draft → Review → Schedule → Publish), Qualitätssicherung & KI-Transparenz-Labeling";
  }

  async initialisieren(): Promise<void> {
    await super.initialisieren();
    await this.ensureDefaultCharacters();
    await this.ensureDefaultTemplates();
    logger.info({ agentName: this.agentName }, "Content Engine Agent initialisiert");
  }

  private async ensureDefaultCharacters(): Promise<void> {
    const existing = await db.select().from(contentCharactersTable).limit(1);
    if (existing.length > 0) return;

    const defaultCharacters = [
      {
        name: "Sarah — Die Strategin",
        archetype: "expert_mentor" as const,
        personalityDescription: "Erfahrene Online-Business-Mentorin, die seit 10 Jahren digitale Produkte baut und verkauft. Spricht aus Erfahrung, nicht aus Theorie. Direkt, klar, ermutigend.",
        writingStyle: "Klar strukturiert, 'Du'-Form, konkrete Beispiele aus der Praxis, Metaphern für komplexe Themen, keine Floskeln.",
        toneOfVoice: "Autoritär aber warm, 'Ich zeig dir wie's geht', kein Marketing-Bullshit, Ehrlichkeit vor Höflichkeit.",
        vocabularyLevel: "accessible",
        expertiseAreas: ["Online-Business", "Digitale Produkte", "Automatisierung", "Stripe/Checkout", "E-Mail-Marketing", "Funnel-Bau"],
        forbiddenTopics: ["Get-rich-quick", "Unethisches Marketing", "Spam-Taktiken"],
        preferredFormats: ["blog", "newsletter", "linkedin", "twitter_thread", "youtube_long"],
        brandAffinity: { "CyberSarah": 0.9, "GeldPilot AI": 0.7, "UnternehmerGPT": 0.6 },
        publishingSchedule: { "monday": ["09:00", "18:00"], "wednesday": ["12:00"], "friday": ["09:00", "16:00"] },
        maxPostsPerDay: 2,
        qualityThresholds: { minReadabilityScore: 65, maxMarketingSpeak: 0.25, minPersonalVoice: 0.8, requireTransparencyLabel: true },
        systemPrompt: `Du bist Sarah, eine erfahrene Online-Business-Mentorin (10 Jahre Erfahrung). Du schreibst für Solo-Selbstständige und kleine Teams, die digitale Produkte verkaufen wollen.

DEIN STIL:
- Du-Form, direkt, klar, keine Floskeln
- Konkrete Beispiele aus deiner Praxis ("Als ich 2019 mein erstes Produkt launched habe...")
- Metaphern für komplexe Themen ("Ein Funnel ist wie ein Trichter...")
- Struktur: Hook → Problem → Lösung → Beweis → CTA
- Ehrlichkeit: "Das dauert 3 Monate, nicht 3 Tage"
- Kein Marketing-Sprech: keine "game-changer", "skyrocket", "unlock your potential"

QUALITÄTSREGELN:
- Readability Score > 65 (Flesch-Kincaid)
- Marketing-Speak < 25%
- Personal Voice > 80%
- IMMER Transparenz-Label: "🤖 KI-generiert & menschlich geprüft"

PLATTFORM-ANPASSUNG:
- Blog: 1500-2500 Wörter, tiefgehend
- Newsletter: 800-1200 Wörter, persönlich, ein Thema
- LinkedIn: 1300 Zeichen, professionell aber menschlich
- Twitter Thread: 8-12 Tweets, hook im ersten Tweet
- YouTube Script: Hook (0-30s) → Content → CTA`,
        modelPreference: "gpt-4o-mini",
        temperature: 70,
        isActive: true,
      },
      {
        name: "Alex — Der Explorer",
        archetype: "curious_explorer" as const,
        personalityDescription: "Neugieriger Technik-Enthusiast, der neue KI-Tools sofort testet und ehrlich berichtet: 'Ich hab's getestet, hier sind die Ergebnisse'. Experimentell, spielerisch, transparent bei Fehlern.",
        writingStyle: "Conversational, 'Ich habe getestet...', Screenshots/Metriken teilen, ehrlich über Limits, 'Probier's selbst aus'.",
        toneOfVoice: "Neugierig, experimentell, 'Lass uns gemeinsam rausfinden', keine Autorität vortäuschen.",
        vocabularyLevel: "accessible",
        expertiseAreas: ["KI-Tools", "Prompt Engineering", "Automatisierung", "No-Code", "Neue Tech-Trends", "Tool-Reviews"],
        forbiddenTopics: ["Theoretische Konzepte ohne Praxis", "Tools die er nicht getestet hat"],
        preferredFormats: ["tiktok", "instagram_reel", "youtube_shorts", "twitter_thread", "blog"],
        brandAffinity: { "CyberSarah": 0.6, "GeldPilot AI": 0.8, "UnternehmerGPT": 0.9 },
        publishingSchedule: { "tuesday": ["10:00", "19:00"], "thursday": ["14:00"], "saturday": ["11:00"] },
        maxPostsPerDay: 3,
        qualityThresholds: { minReadabilityScore: 60, maxMarketingSpeak: 0.3, minPersonalVoice: 0.75, requireTransparencyLabel: true },
        systemPrompt: `Du bist Alex, ein neugieriger KI-Tool-Explorer. Du testest neue Tools SOFORT und berichtest ehrlich: Was funktioniert, was nicht, was kostet es.

DEIN STIL:
- "Ich habe [Tool] getestet — hier sind meine ehrlichen Ergebnisse"
- Screenshots, Metriken, konkrete Zahlen
- Ehrlich über Limits: "Kostet $20/Monat, lohnt sich nur wenn..."
- Vergleich: "Besser als [Alternative] weil..."
- Schritt-für-Schritt-Anleitungen zum Nachmachen
- Keine Theorie ohne Praxis

QUALITÄTSREGELN:
- Readability > 60
- Marketing-Speak < 30%
- Personal Voice > 75%
- Transparenz-Label IMMER

PLATTFORM-FOKUS:
- TikTok/Reels/Shorts: 15-60s, visuell, Hook in 3s
- Twitter Thread: Technisch, Screenshots als Bilder
- Blog: Deep-dive mit Screenshots & Kostenanalyse`,
        modelPreference: "gpt-4o-mini",
        temperature: 75,
        isActive: true,
      },
      {
        name: "Mara — Die Pragmatikerin",
        archetype: "pragmatic_builder" as const,
        personalityDescription: "No-BS Umsetzerin. 'Vergiss die Theorie, hier ist der Exact-Workflow.' Schritt-für-Schritt, Checklisten, Vorlagen, sofort umsetzbar. Kein Inspirations-Porno.",
        writingStyle: "Imperativ, Checklisten, Copy-Paste-Vorlagen, 'Tu Schritt 1, dann Schritt 2', Tools & Links direkt im Text.",
        toneOfVoice: "Direkt, effizient, 'Zeit ist Geld', keine Motivation — nur Anleitung.",
        vocabularyLevel: "simple",
        expertiseAreas: ["Workflows", "Automatisierung", "Make/n8n/Zapier", "Content-Produktion", "Systeme bauen", "Templates"],
        forbiddenTopics: ["Mindset", "Motivation", "Theorie ohne sofortige Anwendung"],
        preferredFormats: ["blog", "newsletter", "linkedin", "youtube_long"],
        brandAffinity: { "CyberSarah": 0.8, "GeldPilot AI": 0.9, "UnternehmerGPT": 0.5 },
        publishingSchedule: { "monday": ["07:00"], "wednesday": ["07:00"], "friday": ["07:00"] },
        maxPostsPerDay: 1,
        qualityThresholds: { minReadabilityScore: 70, maxMarketingSpeak: 0.15, minPersonalVoice: 0.85, requireTransparencyLabel: true },
        systemPrompt: `Du bist Mara, eine pragmatische Builderin. Du gibst KEINE Motivation, nur KLAR ANLEITUNGEN.

DEIN STIL:
- Imperativ: "Tu das. Dann das. Fertig."
- Checklisten mit ✅
- Copy-Paste-Ready Vorlagen (Prompts, Workflows, Skripte)
- Tools & Links direkt im Text
- "Dauert 15 Min. Kostet $0. Ergebnis: X."
- Kein "Du kannst das schaffen!" — nur "Hier ist wie."

QUALITÄTSREGELN:
- Readability > 70 (einfachste Sprache)
- Marketing-Speak < 15% (fast null)
- Personal Voice > 85% (deine Art zu erklären)
- Transparenz-Label IMMER

FORMAT: Blog/Newsletter mit sofort umsetzbaren Schritten`,
        modelPreference: "gpt-4o-mini",
        temperature: 60,
        isActive: true,
      },
    ];

    for (const char of defaultCharacters) {
      await db.insert(contentCharactersTable).values(char).onConflictDoNothing();
    }
    logger.info({ count: defaultCharacters.length }, "Default Content Characters erstellt");
  }

  private async ensureDefaultTemplates(): Promise<void> {
    const existing = await db.select().from(contentTemplatesTable).limit(1);
    if (existing.length > 0) return;

    const templates = [
      {
        name: "Blog: Problem-Lösung-Deep-Dive",
        description: "Klassischer Blog-Artikel: Problem → Analyse → Lösung → Beweis → CTA",
        platform: "blog" as const,
        format: "article",
        structure: {
          hook: "Starte mit einem konkreten Problem, das deine Zielgruppe hat",
          sections: [
            { name: "Problem", prompt: "Beschreibe das Problem lebendig, mit Zahlen/Beispielen", required: true },
            { name: "Warum bisherige Lösungen scheitern", prompt: "Analysiere gängige Ansätze und warum sie nicht funktionieren", required: true },
            { name: "Deine Lösung", prompt: "Schritt-für-Schritt deine Methode, mit Screenshots/Beispielen", required: true },
            { name: "Beweis/Case Study", prompt: "Echte Zahlen, Screenshots, Kundenstimmen", required: false },
            { name: "Häufige Fehler vermeiden", prompt: "3-5 Fehler die du selbst gemacht hast", required: true },
          ],
          cta: "Nächster logischer Schritt (kostenloses Template, Checkliste, Mini-Kurs)",
          hashtagStrategy: "3-5 spezifische Hashtags + 1 Marken-Hashtag",
        },
        suitableArchetypes: ["expert_mentor", "pragmatic_builder", "analytical_critic"],
        isActive: true,
      },
      {
        name: "Newsletter: Eine Erkenntnis + Eine Aktion",
        description: "Wöchentlicher Newsletter: Eine wichtige Erkenntnis + eine sofort umsetzbare Aktion",
        platform: "newsletter" as const,
        format: "newsletter",
        structure: {
          hook: "Betreff: Eine Sache, die ich diese Woche gelernt habe",
          sections: [
            { name: "Persönlicher Einstieg", prompt: "2-3 Sätze: Was ist diese Woche passiert? (Privat/Business)", required: true },
            { name: "Die Erkenntnis", prompt: "Eine wichtige Erkenntnis, die du teilen willst — mit Begründung", required: true },
            { name: "Die Aktion", prompt: "Eine konkrete 15-Minuten-Aufgabe für den Leser diese Woche", required: true },
            { name: "Tool/Tipp der Woche", prompt: "Ein Tool, Shortcut oder Ressource", required: false },
          ],
          cta: "Antworte auf diese Mail — ich lese jede Antwort",
          hashtagStrategy: "Keine Hashtags im Newsletter",
        },
        suitableArchetypes: ["expert_mentor", "friendly_peer", "curious_explorer"],
        isActive: true,
      },
      {
        name: "TikTok/Reel/Short: Hook → Value → CTA",
        description: "Kurzvideo-Skript: 3-Sekunden-Hook → 3 Wert-Punkte → CTA",
        platform: "tiktok" as const,
        format: "script",
        structure: {
          hook: "Visueller + verbaler Hook in Sekunde 1-3 (z.B. 'Hör auf, X zu machen')",
          sections: [
            { name: "Hook (0-3s)", prompt: "Visuelle Aktion + Statement, das Scrollen stoppt", required: true },
            { name: "Punkt 1 (3-15s)", prompt: "Erster Wert — überraschend, gegen Intuition", required: true },
            { name: "Punkt 2 (15-30s)", prompt: "Zweiter Wert — konkret, zeigbar", required: true },
            { name: "Punkt 3 (30-45s)", prompt: "Dritter Wert — der 'Aha!' Moment", required: true },
            { name: "CTA (45-60s)", prompt: "Eine klare Aktion: 'Folge für mehr', 'Link in Bio', 'Kommentiere X'", required: true },
          ],
          cta: "In Caption: Link in Bio / Folge für Part 2",
          hashtagStrategt: "3-5 Nischen-Hashtags + 2 breite",
        },
        suitableArchetypes: ["curious_explorer", "inspiring_visionary", "friendly_peer"],
        isActive: true,
      },
      {
        name: "Twitter Thread: 8 Tweets, ein Thema",
        description: "Thread-Struktur: Hook → 6 Value-Tweets → Zusammenfassung + CTA",
        platform: "twitter_thread" as const,
        format: "thread",
        structure: {
          hook: "Tweet 1: Kontroverse These oder überraschende Zahl — 'Die meisten machen X falsch...'",
          sections: [
            { name: "Tweet 2: Problem", prompt: "Warum der Status Quo scheitert", required: true },
            { name: "Tweet 3: Insight", prompt: "Deine Kern-Erkenntnis", required: true },
            { name: "Tweet 4: Beweis", prompt: "Screenshot, Zahl, Beispiel", required: true },
            { name: "Tweet 5: Wie-to", prompt: "Konkret: Schritt 1, Schritt 2, Schritt 3", required: true },
            { name: "Tweet 6: Fehler vermeiden", prompt: "Top 3 Fehler", required: true },
            { name: "Tweet 7: Ressource", prompt: "Template/Tool/Guide (kostenlos)", required: true },
            { name: "Tweet 8: Zusammenfassung + CTA", prompt: "TL;DR + 'Folge mir für mehr X'", required: true },
          ],
          cta: "Letzter Tweet: Newsletter-Link / kostenloses Asset",
          hashtagStrategy: "Keine Hashtags in Threads (außer Marken-Hashtag im letzten Tweet)",
        },
        suitableArchetypes: ["expert_mentor", "analytical_critic", "pragmatic_builder", "curious_explorer"],
        isActive: true,
      },
      {
        name: "LinkedIn: Professionell & Persönlich",
        description: "LinkedIn Post: Persönliche Story + Business-Lesson + Discussion-Starter",
        platform: "linkedin" as const,
        format: "post",
        structure: {
          hook: "Erste 2 Zeilen: Persönlicher Moment + Überraschung",
          sections: [
            { name: "Story", prompt: "Kurze persönliche Anekdote (3-5 Sätze)", required: true },
            { name: "Lesson", prompt: "Was du daraus fürs Business gelernt hast", required: true },
            { name: "Anwendung", prompt: "Wie der Leser das morgen anwenden kann", required: true },
            { name: "Frage", prompt: "Offene Frage an die Community", required: true },
          ],
          cta: "In Kommentaren: 'Was ist deine Erfahrung?'",
          hashtagStrategy: "3-5 Hashtags am Ende",
        },
        suitableArchetypes: ["expert_mentor", "friendly_peer", "inspiring_visionary"],
        isActive: true,
      },
    ];

    for (const tmpl of templates) {
      await db.insert(contentTemplatesTable).values(tmpl).onConflictDoNothing();
    }
    logger.info({ count: templates.length }, "Default Content Templates erstellt");
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const aktion = aufgabe.payload?.aktion as string;

    switch (aktion) {
      case "generate_ideas":
        return this.generateIdeas(aufgabe);
      case "draft_content":
        return this.draftContent(aufgabe);
      case "quality_check":
        return this.qualityCheck(aufgabe);
      case "schedule_publish":
        return this.schedulePublish(aufgabe);
      case "publish_due":
        return this.publishDue(aufgabe);
      case "analyze_performance":
        return this.analyzePerformance(aufgabe);
      case "full_pipeline":
        return this.runFullPipeline(aufgabe);
      default:
        return { success: false, message: `Unbekannte Aktion: ${aktion}` };
    }
  }

  private async generateIdeas(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const characterId = aufgabe.payload?.characterId as string;
    const count = (aufgabe.payload?.count as number) || 10;
    const platform = aufgabe.payload?.platform as string;

    if (!openaiVerfuegbar || !openai) {
      return { success: false, message: "OpenAI nicht verfügbar" };
    }

    const character = await db.select().from(contentCharactersTable).where(eq(contentCharactersTable.id, characterId)).limit(1);
    if (!character[0]) return { success: false, message: "Charakter nicht gefunden" };

    const char = character[0];

    const prompt = `Generiere ${count} Content-Ideen für ${char.name} (${char.archetype}).

PERSONALITÄT: ${char.personalityDescription}
EXPERTISE: ${char.expertiseAreas.join(", ")}
PLATTFORM: ${platform || "alle"}
THEMEN-FOKUS: ${char.expertiseAreas.slice(0, 3).join(", ")}

Liefere JSON Array:
[
  {"title": "...", "description": "...", "platform": "...", "topic": "...", "keywords": ["..."], "priority": 1-3, "estimatedReach": 1000, "estimatedEngagement": 50}
]`;

    try {
      const response = await openai.chat.completions.create({
        model: char.modelPreference,
        temperature: char.temperature / 100,
        messages: [
          { role: "system", content: char.systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const ideas = JSON.parse(response.choices[0].message.content ?? "[]");
      let created = 0;

      for (const idea of ideas) {
        try {
          await db.insert(contentIdeasTable).values({
            characterId,
            title: idea.title,
            description: idea.description,
            platform: idea.platform || platform || "blog",
            topic: idea.topic,
            keywords: idea.keywords || [],
            priority: idea.priority || 2,
            estimatedReach: idea.estimatedReach,
            estimatedEngagement: idea.estimatedEngagement,
            source: "ai_generated",
            status: "pending",
          });
          created++;
        } catch {}
      }

      return { success: true, message: `${created} Content-Ideen generiert für ${char.name}`, metadaten: { created, characterId } };
    } catch (err) {
      logger.error({ err, characterId }, "Ideen-Generierung fehlgeschlagen");
      return { success: false, message: `Fehler: ${err}` };
    }
  }

  private async draftContent(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const ideaId = aufgabe.payload?.ideaId as string;
    const templateId = aufgabe.payload?.templateId as string;

    if (!openaiVerfuegbar || !openai) {
      return { success: false, message: "OpenAI nicht verfügbar" };
    }

    const [idea] = await db.select().from(contentIdeasTable).where(eq(contentIdeasTable.id, ideaId)).limit(1);
    if (!idea) return { success: false, message: "Idee nicht gefunden" };

    const [character] = await db.select().from(contentCharactersTable).where(eq(contentCharactersTable.id, idea.characterId)).limit(1);
    if (!character) return { success: false, message: "Charakter nicht gefunden" };

    let template = null;
    if (templateId) {
      const [t] = await db.select().from(contentTemplatesTable).where(eq(contentTemplatesTable.id, templateId)).limit(1);
      template = t;
    } else {
      const [t] = await db.select().from(contentTemplatesTable)
        .where(and(eq(contentTemplatesTable.platform, idea.platform), eq(contentTemplatesTable.isActive, true)))
        .limit(1);
      template = t;
    }

    const structurePrompt = template
      ? `Nutze diese Template-Struktur: ${JSON.stringify(template.structure, null, 2)}`
      : "Erstelle eine passende Struktur für die Plattform.";

    const prompt = `Erstelle Content für ${character.name} basierend auf dieser Idee:

TITEL: ${idea.title}
BESCHREIBUNG: ${idea.description}
PLATTFORM: ${idea.platform}
THEMA: ${idea.topic}
KEYWORDS: ${idea.keywords.join(", ")}

${structurePrompt}

CHARAKTER-STIL:
- Personality: ${character.personalityDescription}
- Writing Style: ${character.writingStyle}
- Tone: ${character.toneOfVoice}
- Vocabulary: ${character.vocabularyLevel}

QUALITÄTSZIELE:
- Readability > ${character.qualityThresholds?.minReadabilityScore || 60}
- Marketing-Speak < ${(character.qualityThresholds?.maxMarketingSpeak || 0.3) * 100}%
- Personal Voice > ${(character.qualityThresholds?.minPersonalVoice || 0.7) * 100}%
- Transparenz-Label: ${character.qualityThresholds?.requireTransparencyLabel ? "JA" : "NEIN"}

Liefere JSON:
{
  "title": "...",
  "hook": "...",
  "body": "...",
  "cta": "...",
  "hashtags": ["..."],
  "qualityScores": {
    "readability": 0-100,
    "brandVoice": 0-100,
    "personalVoice": 0-100,
    "marketingSpeak": 0-100,
    "transparency": 0-100,
    "overall": 0-100
  }
}`;

    try {
      const response = await openai.chat.completions.create({
        model: character.modelPreference,
        temperature: character.temperature / 100,
        messages: [
          { role: "system", content: character.systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const result: ContentGenerationResult = JSON.parse(response.choices[0].message.content ?? "{}");

      // Content Item erstellen
      const [newItem] = await db.insert(contentItemsTable).values({
        characterId: character.id,
        title: result.title,
        hook: result.hook,
        body: result.body,
        cta: result.cta,
        hashtags: result.hashtags,
        platform: idea.platform,
        format: template?.format || "article",
        topic: idea.topic,
        keywords: idea.keywords,
        status: "drafting",
        readabilityScore: result.qualityScores?.readability,
        brandVoiceScore: result.qualityScores?.brandVoice,
        personalVoiceScore: result.qualityScores?.personalVoice,
        marketingSpeakScore: result.qualityScores?.marketingSpeak,
        transparencyScore: result.qualityScores?.transparency,
        overallQualityScore: result.qualityScores?.overall,
        generatedByModel: character.modelPreference,
        generationPrompt: prompt,
        generationTokens: response.usage?.total_tokens,
        generationCost: Math.round((response.usage?.total_tokens || 0) * 0.00015 * 100), // ca. Kosten in cents
        aiTransparencyLabel: character.qualityThresholds?.requireTransparencyLabel ? "🤖 KI-generiert & menschlich geprüft" : "",
        showTransparencyLabel: character.qualityThresholds?.requireTransparencyLabel ?? true,
      }).returning();

      // Idee als verwendet markieren
      await db.update(contentIdeasTable)
        .set({ status: "used", usedAt: new Date() })
        .where(eq(contentIdeasTable.id, ideaId));

      return {
        success: true,
        message: `Content-Entwurf erstellt: ${result.title}`,
        metadaten: { contentItemId: newItem.id, qualityScores: result.qualityScores },
      };
    } catch (err) {
      logger.error({ err, ideaId }, "Content-Drafting fehlgeschlagen");
      return { success: false, message: `Fehler: ${err}` };
    }
  }

  private async qualityCheck(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const itemId = aufgabe.payload?.itemId as string;
    const autoApprove = (aufgabe.payload?.autoApprove as boolean) || false;
    const threshold = (aufgabe.payload?.threshold as number) || 70;

    const [item] = await db.select().from(contentItemsTable).where(eq(contentItemsTable.id, itemId)).limit(1);
    if (!item) return { success: false, message: "Content-Item nicht gefunden" };

    const [character] = await db.select().from(contentCharactersTable).where(eq(contentCharactersTable.id, item.characterId)).limit(1);
    if (!character) return { success: false, message: "Charakter nicht gefunden" };

    const scores = {
      readability: item.readabilityScore || 0,
      brandVoice: item.brandVoiceScore || 0,
      personalVoice: item.personalVoiceScore || 0,
      marketingSpeak: item.marketingSpeakScore || 0,
      transparency: item.transparencyScore || 0,
      overall: item.overallQualityScore || 0,
    };

    const minReadability = character.qualityThresholds?.minReadabilityScore || 60;
    const maxMarketingSpeak = character.qualityThresholds?.maxMarketingSpeak || 0.3;
    const minPersonalVoice = character.qualityThresholds?.minPersonalVoice || 0.7;

    const passed =
      scores.readability >= minReadability &&
      scores.marketingSpeak <= maxMarketingSpeak * 100 &&
      scores.personalVoice >= minPersonalVoice * 100 &&
      scores.overall >= threshold;

    if (passed && autoApprove) {
      await db.update(contentItemsTable)
        .set({ status: "approved", reviewedAt: new Date(), reviewedBy: "auto_quality_check" })
        .where(eq(contentItemsTable.id, itemId));
      return { success: true, message: `Qualität geprüft & auto-approved (Score: ${scores.overall})`, metadaten: { scores, passed: true } };
    }

    await db.update(contentItemsTable)
      .set({ status: "review" })
      .where(eq(contentItemsTable.id, itemId));

    return {
      success: true,
      message: passed ? `Qualität OK (${scores.overall}) — wartet auf menschliche Review` : `Qualität UNTER Schwelle (${scores.overall}) — Revision nötig`,
      metadaten: { scores, passed, threshold, minReadability, maxMarketingSpeak: maxMarketingSpeak * 100, minPersonalVoice: minPersonalVoice * 100 },
    };
  }

  private async schedulePublish(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const itemId = aufgabe.payload?.itemId as string;
    const scheduledAt = aufgabe.payload?.scheduledAt ? new Date(aufgabe.payload.scheduledAt as string) : null;

    const [item] = await db.select().from(contentItemsTable).where(eq(contentItemsTable.id, itemId)).limit(1);
    if (!item) return { success: false, message: "Content-Item nicht gefunden" };

    if (item.status !== "approved") {
      return { success: false, message: `Item muss 'approved' sein, ist: ${item.status}` };
    }

    let publishTime = scheduledAt;
    if (!publishTime) {
      // Nächsten Slot aus Charakter-Schedule nehmen
      const [character] = await db.select().from(contentCharactersTable).where(eq(contentCharactersTable.id, item.characterId)).limit(1);
      if (character && character.publishingSchedule) {
        // Einfache Logik: nächstes passendes Zeitfenster
        publishTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // +2h default
      } else {
        publishTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      }
    }

    await db.update(contentItemsTable)
      .set({ status: "scheduled", scheduledAt: publishTime })
      .where(eq(contentItemsTable.id, itemId));

    return { success: true, message: `Content für ${publishTime.toISOString()} geplant`, metadaten: { scheduledAt: publishTime.toISOString() } };
  }

  private async publishDue(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const now = new Date();
    const dueItems = await db.select().from(contentItemsTable)
      .where(and(
        eq(contentItemsTable.status, "scheduled"),
        sql`${contentItemsTable.scheduledAt} <= ${now.toISOString()}`
      ))
      .limit(10);

    let published = 0;
    let failed = 0;

    for (const item of dueItems) {
      try {
        // Hier: Plattform-spezifisches Publishing (API-Calls)
        // Für jetzt: Simuliert als erfolgreich
        await db.update(contentItemsTable)
          .set({
            status: "published",
            publishedAt: new Date(),
            publishedUrl: `https://example.com/${item.platform}/${item.id}`,
            platformPostId: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          })
          .where(eq(contentItemsTable.id, item.id));
        published++;
      } catch (err) {
        failed++;
        logger.error({ err, itemId: item.id }, "Publishing fehlgeschlagen");
      }
    }

    return { success: true, message: `${published} veröffentlicht, ${failed} fehlgeschlagen`, metadaten: { published, failed } };
  }

  private async analyzePerformance(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const characterId = aufgabe.payload?.characterId as string;
    const days = (aufgabe.payload?.days as number) || 30;

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const items = await db.select().from(contentItemsTable)
      .where(and(
        eq(contentItemsTable.characterId, characterId),
        eq(contentItemsTable.status, "published"),
        sql`${contentItemsTable.publishedAt} >= ${since.toISOString()}`
      ));

    if (items.length === 0) {
      return { success: true, message: "Keine veröffentlichten Items in Zeitraum", metadaten: { items: 0 } };
    }

    const totals = items.reduce((acc, item) => ({
      views: acc.views + (item.views || 0),
      likes: acc.likes + (item.likes || 0),
      comments: acc.comments + (item.comments || 0),
      shares: acc.shares + (item.shares || 0),
      clicks: acc.clicks + (item.clicks || 0),
      conversions: acc.conversions + (item.conversions || 0),
    }), { views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, conversions: 0 });

    const avgQuality = items.reduce((sum, i) => sum + (i.overallQualityScore || 0), 0) / items.length;

    // Top performer
    const topByEngagement = [...items].sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares)).slice(0, 3);
    const topByConversions = [...items].sort((a, b) => (b.conversions || 0) - (a.conversions || 0)).slice(0, 3);

    return {
      success: true,
      message: `Performance-Analyse: ${items.length} Items, Ø Quality: ${avgQuality.toFixed(1)}`,
      metadaten: {
        periodDays: days,
        totalItems: items.length,
        totals,
        avgQuality,
        topByEngagement: topByEngagement.map(i => ({ id: i.id, title: i.title, engagement: i.likes + i.comments + i.shares, platform: i.platform })),
        topByConversions: topByConversions.map(i => ({ id: i.id, title: i.title, conversions: i.conversions, platform: i.platform })),
      },
    };
  }

  private async runFullPipeline(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const characterId = aufgabe.payload?.characterId as string;
    const ideasCount = (aufgabe.payload?.ideasCount as number) || 5;
    const autoApprove = (aufgabe.payload?.autoApprove as boolean) || false;

    const [character] = await db.select().from(contentCharactersTable).where(eq(contentCharactersTable.id, characterId)).limit(1);
    if (!character) return { success: false, message: "Charakter nicht gefunden" };

    if (!character.isActive) {
      return { success: false, message: `Charakter ${character.name} ist nicht aktiv` };
    }

    // 1. Ideen generieren
    const ideasResult = await this.generateIdeas({
      ...aufgabe,
      payload: { characterId, count: ideasCount },
    });
    if (!ideasResult.success) return ideasResult;

    // 2. Für jede Idee Content draften
    const pendingIdeas = await db.select().from(contentIdeasTable)
      .where(and(eq(contentIdeasTable.characterId, characterId), eq(contentIdeasTable.status, "used")))
      .orderBy(desc(contentIdeasTable.createdAt))
      .limit(ideasCount);

    let drafted = 0;
    for (const idea of pendingIdeas) {
      const draftResult = await this.draftContent({
        ...aufgabe,
        payload: { ideaId: idea.id },
      });
      if (draftResult.success) drafted++;
    }

    // 3. Quality Check & Auto-Approve
    const draftItems = await db.select().from(contentItemsTable)
      .where(and(eq(contentItemsTable.characterId, characterId), eq(contentItemsTable.status, "drafting")))
      .limit(ideasCount);

    let approved = 0;
    for (const item of draftItems) {
      const qcResult = await this.qualityCheck({
        ...aufgabe,
        payload: { itemId: item.id, autoApprove },
      });
      if (qcResult.metadaten?.passed && autoApprove) approved++;
    }

    // 4. Schedule approved items
    const approvedItems = await db.select().from(contentItemsTable)
      .where(and(eq(contentItemsTable.characterId, characterId), eq(contentItemsTable.status, "approved")))
      .limit(ideasCount);

    let scheduled = 0;
    for (const item of approvedItems) {
      const schedResult = await this.schedulePublish({
        ...aufgabe,
        payload: { itemId: item.id },
      });
      if (schedResult.success) scheduled++;
    }

    return {
      success: true,
      message: `Full Pipeline für ${character.name}: ${drafted} entworfen, ${approved} approved, ${scheduled} geplant`,
      metadaten: { drafted, approved, scheduled, characterId },
    };
  }
}
