/**
 * InfluencerAutoPostAgent
 * Autonomes Posten von KI-Content auf TikTok, Instagram, YouTube etc. via Webhooks.
 * Läuft 3x täglich (08:00, 13:00, 19:00) und postet den neuesten generierten Content.
 */
import { db } from "@workspace/db";
import {
  contentTable, influencerPlatformenTable, influencerPostingsTable, influencerPersonasTable,
  type InfluencerPlattform, type Content,
} from "@workspace/db";
import { eq, desc, and, gte, notInArray } from "drizzle-orm";
import { logger } from "../lib/logger";
import { openai, openaiVerfuegbar } from "../lib/openaiClient";
import { ObjectStorageService } from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";
import { haengeUtmAnLinksAn } from "../lib/attribution";

const objectStorageService = new ObjectStorageService();

// ─── Bildgenerierung für bildbasierte Plattformen (Instagram, Pinterest) ─────

const BILD_PLATTFORMEN = new Set(["instagram", "pinterest"]);

/** Lädt ein extern erreichbares Bild (URL oder /api/storage/... Pfad) als Buffer. */
async function ladeBildAlsBuffer(bildUrl: string): Promise<Buffer | null> {
  try {
    const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0] ?? process.env["REPLIT_DEV_DOMAIN"];
    const absoluteUrl = bildUrl.startsWith("http") ? bildUrl : (domain ? `https://${domain}${bildUrl}` : null);
    if (!absoluteUrl) return null;
    const resp = await fetch(absoluteUrl);
    if (!resp.ok) return null;
    return Buffer.from(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

/** Lädt einen Bild-Buffer in Object Storage hoch und liefert die öffentliche Pfad-URL zurück. */
async function speicherePngInObjectStorage(buffer: Buffer, contextLabel: string): Promise<string | null> {
  const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
  const putResp = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: buffer,
  });
  if (!putResp.ok) {
    logger.warn({ context: contextLabel, status: putResp.status }, "Bild-Upload zu Object Storage fehlgeschlagen");
    return null;
  }

  const objectPath = objectStorageService.normalizeObjectEntityPath(uploadUrl);
  try {
    await objectStorageService.enforceUploadCompliance(objectPath, {
      allowedContentTypes: new Set(["image/png", "image/jpeg", "image/webp"]),
      maxSizeBytes: 15 * 1024 * 1024,
    });
  } catch (err) {
    logger.warn({ context: contextLabel, objectPath, err }, "Hochgeladenes Bild verstößt gegen Richtlinie — gelöscht");
    return null;
  }
  await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
    owner: "system",
    visibility: "public",
  });

  return `/api${objectPath.replace("/objects/", "/storage/objects/")}`;
}

/** Erstellt (oder ersetzt) das feste Persona-Referenzbild einer Marke für konsistente Charakter-Bilder. */
export async function generiereReferenzBildFuerMarke(marke: string): Promise<string | null> {
  if (!openaiVerfuegbar) {
    logger.warn({ marke }, "Persona-Referenzbild übersprungen — kein OpenAI-Key");
    return null;
  }

  try {
    const referenzPrompt = `Professional, consistent digital avatar/mascot portrait representing the AI brand persona "${marke}". Modern flat-design or semi-realistic style, clean neutral background, centered composition, no text overlays, no logos. This exact character/style must be reusable as a visual identity across many future social media posts.`;

    const bildResp = await openai.images.generate({
      model: "gpt-image-1",
      prompt: referenzPrompt,
      n: 1,
      size: "1024x1024",
    });

    const b64 = bildResp.data?.[0]?.b64_json;
    const bildUrlExtern = bildResp.data?.[0]?.url;
    let buffer: Buffer | null = null;
    if (b64) buffer = Buffer.from(b64, "base64");
    else if (bildUrlExtern) buffer = await ladeBildAlsBuffer(bildUrlExtern);

    if (!buffer) {
      logger.warn({ marke }, "Persona-Referenzbild: keine Bilddaten von OpenAI erhalten");
      return null;
    }

    const oeffentlicheUrl = await speicherePngInObjectStorage(buffer, `persona:${marke}`);
    if (!oeffentlicheUrl) return null;

    await db.insert(influencerPersonasTable).values({
      marke,
      referenzBildUrl: oeffentlicheUrl,
      referenzBildPrompt: referenzPrompt,
    }).onConflictDoUpdate({
      target: influencerPersonasTable.marke,
      set: { referenzBildUrl: oeffentlicheUrl, referenzBildPrompt: referenzPrompt, updatedAt: new Date() },
    });

    logger.info({ marke, oeffentlicheUrl }, "🎭 Persona-Referenzbild generiert");
    return oeffentlicheUrl;
  } catch (err) {
    logger.warn({ marke, err }, "Persona-Referenzbild-Generierung fehlgeschlagen");
    return null;
  }
}

async function ladePersonaReferenzbild(marke: string): Promise<string | null> {
  const [row] = await db.select().from(influencerPersonasTable).where(eq(influencerPersonasTable.marke, marke));
  return row?.referenzBildUrl ?? null;
}

async function generiereUndSpeichereBild(content: Content): Promise<string | null> {
  if (!openaiVerfuegbar) {
    logger.warn({ contentId: content.id }, "Bildgenerierung übersprungen — kein OpenAI-Key");
    return null;
  }

  try {
    const promptResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: "Erstelle einen kurzen, präzisen Bildgenerierungs-Prompt auf Englisch (max. 40 Wörter) für ein Social-Media-Bild. Fotorealistisch oder modernes Flat-Design, keine Texte/Schriftzüge im Bild, thematisch passend zu KI/Business/Finanzen. Antworte NUR mit dem Prompt.",
        },
        { role: "user", content: `Marke: ${content.marke}\nTitel: ${content.titel}\nThema: ${(content.inhalt ?? "").slice(0, 300)}` },
      ],
    });
    const bildPrompt = promptResp.choices[0]?.message?.content?.trim()
      || `Modern, professional social media image about ${content.titel}, no text overlays`;

    // Feste visuelle Identität pro Marke: existiert bereits ein Referenzbild,
    // wird per Bild-Edit (image-to-image) darauf aufgebaut, statt komplett neu
    // zu generieren — dadurch bleiben Charakter/Stil über alle Posts konsistent.
    const referenzBildUrl = await ladePersonaReferenzbild(content.marke);
    const referenzBuffer = referenzBildUrl ? await ladeBildAlsBuffer(referenzBildUrl) : null;

    let buffer: Buffer | null = null;

    if (referenzBuffer) {
      try {
        const { toFile } = await import("openai");
        const bildEditResp = await openai.images.edit({
          model: "gpt-image-1",
          image: await toFile(referenzBuffer, "referenz.png", { type: "image/png" }),
          prompt: `Keep the same character/visual identity as the reference image. Adapt the scene to: ${bildPrompt}`,
          n: 1,
          size: "1024x1024",
        });
        const editB64 = bildEditResp.data?.[0]?.b64_json;
        const editUrl = bildEditResp.data?.[0]?.url;
        if (editB64) buffer = Buffer.from(editB64, "base64");
        else if (editUrl) buffer = await ladeBildAlsBuffer(editUrl);
      } catch (err) {
        logger.warn({ contentId: content.id, err }, "Bild-Edit mit Persona-Referenz fehlgeschlagen — Fallback auf Neugenerierung");
      }
    }

    if (!buffer) {
      const bildResp = await openai.images.generate({
        model: "gpt-image-1",
        prompt: bildPrompt,
        n: 1,
        size: "1024x1024",
      });
      const b64 = bildResp.data?.[0]?.b64_json;
      const bildUrlExtern = bildResp.data?.[0]?.url;
      if (b64) buffer = Buffer.from(b64, "base64");
      else if (bildUrlExtern) buffer = await ladeBildAlsBuffer(bildUrlExtern);
    }

    if (!buffer) {
      logger.warn({ contentId: content.id }, "Bildgenerierung: keine Bilddaten von OpenAI erhalten");
      return null;
    }

    const oeffentlicheUrl = await speicherePngInObjectStorage(buffer, `content:${content.id}`);
    if (!oeffentlicheUrl) return null;

    await db.update(contentTable)
      .set({ bildUrl: oeffentlicheUrl })
      .where(eq(contentTable.id, content.id));

    // Bootstrap: gibt es noch kein Persona-Referenzbild für diese Marke,
    // wird das erste generierte Bild direkt als künftige visuelle Basis übernommen.
    if (!referenzBildUrl) {
      await db.insert(influencerPersonasTable).values({
        marke: content.marke,
        referenzBildUrl: oeffentlicheUrl,
        referenzBildPrompt: bildPrompt,
      }).onConflictDoNothing({ target: influencerPersonasTable.marke });
    }

    logger.info({ contentId: content.id, oeffentlicheUrl }, "🖼️ Bild generiert und gespeichert");
    return oeffentlicheUrl;
  } catch (err) {
    logger.warn({ contentId: content.id, err }, "Bildgenerierung fehlgeschlagen — Post läuft ohne Bild weiter");
    return null;
  }
}

// ─── Platform-spezifische Inhalt-Optimierung ─────────────────────────────────

async function optimiereInhaltFuerPlattform(
  content: Content,
  plattform: string,
): Promise<string> {
  if (!openaiVerfuegbar) return (content.inhalt ?? content.titel).slice(0, 500);

  const anweisungen: Record<string, string> = {
    tiktok:    "Kürze auf max. 150 Zeichen. Hook in Zeile 1. Energetisch, direkt, mit 3-5 passenden Hashtags. Kein Markdown.",
    instagram: "Max. 300 Zeichen Caption + 10 Hashtags. Emojis nutzen. Story-Format. Call-to-Action am Ende.",
    youtube:   "YouTube Shorts Skript: Hook (0-3s), Hauptinhalt (15-50s), CTA (5s). Max. 200 Wörter.",
    linkedin:  "Professionell, Insights-fokussiert. Max. 300 Zeichen. 3 Business-Hashtags. Wertversprechen klar.",
    pinterest: "Beschreibung mit Keywords. SEO-optimiert. Max. 200 Zeichen. Pin-Titel + Beschreibung.",
    twitter:   "Max. 280 Zeichen. Prägnant, Meinung/Frage, 2-3 Hashtags. Engagement-Trigger.",
  };

  const anweisung = anweisungen[plattform] ?? "Kürze auf max. 200 Zeichen für Social Media.";

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages: [
        { role: "system", content: `Du bist ein Social-Media-Experte. Optimiere den folgenden Content für ${plattform.toUpperCase()}. ${anweisung} Sprache: Deutsch. Antworte NUR mit dem optimierten Text.` },
        { role: "user", content: `Titel: ${content.titel}\n\nInhalt: ${(content.inhalt ?? "").slice(0, 800)}` },
      ],
    });
    return resp.choices[0]?.message?.content?.trim() ?? content.titel;
  } catch {
    return (content.inhalt ?? content.titel).slice(0, 300);
  }
}

// ─── Webhook-Post ─────────────────────────────────────────────────────────────

export async function posteAufPlatform(
  content: Content,
  plattform: InfluencerPlattform,
): Promise<{ erfolg: boolean; plattform: string }> {
  if (!plattform.webhookUrl) {
    logger.warn({ plattform: plattform.name }, `Kein Webhook für ${plattform.anzeigeName} — übersprungen`);
    return { erfolg: false, plattform: plattform.name };
  }

  const optimierterInhaltRoh = await optimiereInhaltFuerPlattform(content, plattform.name);

  // UTM-Tracking: eindeutige Kampagne pro Content+Plattform, damit Klicks/Käufe
  // später pro Post/Plattform/Marke im Web-Analytics zurückverfolgbar sind.
  const utmCampaign = `influencer-${content.id}-${plattform.name}`;
  const optimierterInhalt = haengeUtmAnLinksAn(optimierterInhaltRoh, {
    source: plattform.name,
    medium: "social",
    campaign: utmCampaign,
  });

  // Bildbasierte Plattformen (Instagram, Pinterest) brauchen zwingend ein Bild.
  // Bild wird pro Content einmal generiert und in content.bildUrl gecacht.
  let bildUrl: string | null = content.bildUrl ?? null;
  if (BILD_PLATTFORMEN.has(plattform.name) && !bildUrl) {
    bildUrl = await generiereUndSpeichereBild(content);
  }

  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0] ?? process.env["REPLIT_DEV_DOMAIN"];
  const bildUrlAbsolut = bildUrl && domain ? `https://${domain}${bildUrl}` : bildUrl;
  const callbackUrl = domain ? `https://${domain}/api/influencer/webhook` : null;

  // Posting-Row VORAB anlegen (Status "gesendet"), damit die ID im ausgehenden
  // Payload mitgeschickt werden kann — Make.com/Zapier/n8n können sie beim
  // Rückmelden von Ergebnissen (Erfolg, Engagement) als Korrelations-ID nutzen.
  const [vorabPosting] = await db.insert(influencerPostingsTable).values({
    contentId: content.id,
    plattform: plattform.name,
    marke: content.marke,
    utmCampaign,
    status: "gesendet",
    inhaltKurz: optimierterInhalt.slice(0, 500),
  }).returning();
  const postingId = vorabPosting!.id;

  const payload = {
    postingId,
    plattform: plattform.name,
    anzeigeName: plattform.anzeigeName,
    marke: content.marke,
    typ: content.typ,
    titel: content.titel,
    inhalt: optimierterInhalt,
    originalInhalt: (content.inhalt ?? "").slice(0, 1000),
    bildUrl: bildUrlAbsolut,
    contentId: content.id,
    zeitstempel: new Date().toISOString(),
    system: "CyberSarah Revenue OS — KI-Influencer",
    // Optionaler Rückmelde-Endpoint: Ergebnis (Posting-Erfolg, Engagement)
    // kann hierher per POST zurückgemeldet werden (Secret via /api/einstellungen/influencer-webhook-secret).
    callbackUrl,
  };

  let status = "fehler";
  let webhookResponse: string | null = null;
  let fehler: string | null = null;

  try {
    const resp = await fetch(plattform.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
    });
    webhookResponse = `HTTP ${resp.status}`;
    status = resp.ok ? "gepostet" : "fehler";
    if (!resp.ok) fehler = `HTTP ${resp.status}`;
  } catch (err) {
    fehler = err instanceof Error ? err.message : "Verbindungsfehler";
    status = "fehler";
  }

  // Posting-Row mit dem Ergebnis des Sende-Vorgangs aktualisieren
  await db.update(influencerPostingsTable)
    .set({
      status,
      webhookResponse,
      fehler,
      gepostetAm: status === "gepostet" ? new Date() : null,
    })
    .where(eq(influencerPostingsTable.id, postingId));

  // Plattform-Zähler aktualisieren
  if (status === "gepostet") {
    await db.update(influencerPlatformenTable)
      .set({
        postingsHeute: (plattform.postingsHeute ?? 0) + 1,
        postingsGesamt: (plattform.postingsGesamt ?? 0) + 1,
        letzterPost: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(influencerPlatformenTable.id, plattform.id));
  }

  logger.info(
    { plattform: plattform.name, contentId: content.id, status },
    `${plattform.symbol} ${plattform.anzeigeName}: ${status === "gepostet" ? "✅ Gepostet" : "❌ Fehler — " + (fehler ?? "")}`,
  );

  return { erfolg: status === "gepostet", plattform: plattform.name };
}

// ─── Auto-Post-Zyklus ─────────────────────────────────────────────────────────

export async function starteAutoPost(): Promise<{
  gepostet: number; fehler: number; plattformen: string[]; contentId: number | null;
}> {
  const aktivePlattformen = await db.select()
    .from(influencerPlatformenTable)
    .where(and(eq(influencerPlatformenTable.aktiv, true)));

  if (aktivePlattformen.length === 0) {
    logger.info("Auto-Post: Keine aktiven Plattformen konfiguriert");
    return { gepostet: 0, fehler: 0, plattformen: [], contentId: null };
  }

  // Bereiter Content (nur echte KI-generierte Inhalte, keine Fallback-Templates),
  // UND manuell freigegeben (Freigabe-Dashboard) — kein autonomes Posten ohne
  // vorherige Sichtprüfung durch den Operator. Neuester zuerst → höchste
  // Qualität + aktuellste Monetarisierungs-Links zuerst.
  const bereiterContent = await db.select().from(contentTable)
    .where(and(eq(contentTable.status, "generiert"), eq(contentTable.influencerFreigegeben, true)))
    .orderBy(desc(contentTable.createdAt))
    .limit(20);

  if (bereiterContent.length === 0) {
    logger.info("Auto-Post: Kein freigegebener Content vorhanden");
    return { gepostet: 0, fehler: 0, plattformen: [], contentId: null };
  }

  // Pro Plattform bereits gepostete Content-IDs separat tracken —
  // jede Plattform bekommt unabhängig ihren nächsten frischen Beitrag,
  // statt einen einzigen global geteilten Content-Slot pro Zyklus.
  const bereitsProPlattform = await db.select({
    contentId: influencerPostingsTable.contentId,
    plattform: influencerPostingsTable.plattform,
  }).from(influencerPostingsTable).where(eq(influencerPostingsTable.status, "gepostet"));

  const gepostetSet = new Map<string, Set<number>>();
  for (const row of bereitsProPlattform) {
    if (row.contentId === null) continue;
    if (!gepostetSet.has(row.plattform)) gepostetSet.set(row.plattform, new Set());
    gepostetSet.get(row.plattform)!.add(row.contentId);
  }

  const aufgaben: Array<Promise<{ erfolg: boolean; plattform: string }>> = [];
  const verwendeteContentIds = new Set<number>();

  for (const plattform of aktivePlattformen) {
    const bereitsGepostetHier = gepostetSet.get(plattform.name) ?? new Set<number>();
    const naechster = bereiterContent.find(c => !bereitsGepostetHier.has(c.id));
    // Falls alles bereits gepostet wurde: neuesten Content erneut posten (Recycling statt Stillstand)
    const ausgewaehlterContent = naechster ?? bereiterContent[0]!;
    verwendeteContentIds.add(ausgewaehlterContent.id);
    aufgaben.push(posteAufPlatform(ausgewaehlterContent, plattform));
  }

  const ergebnisse = await Promise.allSettled(aufgaben);
  const erfolgreich = ergebnisse.filter(r => r.status === "fulfilled" && r.value.erfolg);

  logger.info(
    { contentIds: [...verwendeteContentIds], gepostet: erfolgreich.length, gesamt: aktivePlattformen.length },
    `🚀 Auto-Post-Zyklus: ${erfolgreich.length}/${aktivePlattformen.length} Plattformen erfolgreich`,
  );

  return {
    gepostet: erfolgreich.length,
    fehler: ergebnisse.length - erfolgreich.length,
    plattformen: aktivePlattformen.map(p => p.name),
    contentId: [...verwendeteContentIds][0] ?? null,
  };
}

// ─── Cron-Export (für orchestrator.ts) ───────────────────────────────────────

export async function starteInfluencerCron(cron: typeof import("node-cron")): Promise<void> {
  // 3x täglich: 08:00, 13:00, 19:00
  cron.schedule("0 8,13,19 * * *", async () => {
    logger.info("⏰ Influencer Auto-Post — geplanter Zyklus startet");
    await starteAutoPost();
  });

  // Täglicher Reset der "heute"-Zähler um Mitternacht
  cron.schedule("0 0 * * *", async () => {
    await db.update(influencerPlatformenTable).set({ postingsHeute: 0, updatedAt: new Date() });
    logger.info("🔄 Influencer: Tages-Zähler zurückgesetzt");
  });

  logger.info("✅ Influencer Auto-Post Cron gestartet (08:00 / 13:00 / 19:00)");
}
