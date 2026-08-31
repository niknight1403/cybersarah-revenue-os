import { Router } from "express";
import { db } from "@workspace/db";
import {
  influencerPlatformenTable, influencerPostingsTable, influencerPersonasTable, influencerKommentareTable,
  contentTable, webhookLogsTable,
} from "@workspace/db";
import { eq, desc, gte, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { posteAufPlatform, generiereReferenzBildFuerMarke } from "../agents/InfluencerAutoPostAgent";
import { ladeOderErstelleInfluencerWebhookSecret } from "./einstellungen";
import { openai, openaiVerfuegbar } from "../lib/openaiClient";
import { MARKEN_PERSONAS } from "../agents/contentAgent";

const router = Router();

const STANDARD_PLATTFORMEN = [
  { name: "tiktok",    anzeigeName: "TikTok",     symbol: "📱", besteZeiten: "19:00,20:00,21:00", postingsProTag: 3 },
  { name: "instagram", anzeigeName: "Instagram",  symbol: "📸", besteZeiten: "08:00,12:00,19:00", postingsProTag: 3 },
  { name: "youtube",   anzeigeName: "YouTube",     symbol: "🎥", besteZeiten: "15:00,18:00,20:00", postingsProTag: 1 },
  { name: "linkedin",  anzeigeName: "LinkedIn",   symbol: "💼", besteZeiten: "08:00,12:00,17:00", postingsProTag: 2 },
  { name: "pinterest", anzeigeName: "Pinterest",  symbol: "📌", besteZeiten: "20:00,21:00,22:00", postingsProTag: 2 },
  { name: "twitter",   anzeigeName: "Twitter / X", symbol: "🐦", besteZeiten: "09:00,13:00,17:00", postingsProTag: 5 },
];

async function sicherePlatformen() {
  for (const p of STANDARD_PLATTFORMEN) {
    const vorhanden = await db.select().from(influencerPlatformenTable)
      .where(eq(influencerPlatformenTable.name, p.name)).limit(1);
    if (vorhanden.length === 0) {
      await db.insert(influencerPlatformenTable).values({
        name: p.name, anzeigeName: p.anzeigeName, symbol: p.symbol,
        besteZeiten: p.besteZeiten, postingsProTag: p.postingsProTag,
        aktiv: false,
      });
    }
  }
}

// GET /api/influencer/plattformen
router.get("/influencer/plattformen", async (_req, res) => {
  await sicherePlatformen();
  const plattformen = await db.select().from(influencerPlatformenTable).orderBy(influencerPlatformenTable.id);
  res.json({ plattformen });
});

// POST /api/influencer/plattformen/:name — Webhook + Toggle setzen
router.post("/influencer/plattformen/:name", async (req, res) => {
  const { name } = req.params;
  const { webhookUrl, aktiv } = req.body as { webhookUrl?: string; aktiv?: boolean };

  const [updated] = await db.update(influencerPlatformenTable)
    .set({
      ...(webhookUrl !== undefined && { webhookUrl }),
      ...(aktiv !== undefined && { aktiv }),
      updatedAt: new Date(),
    })
    .where(eq(influencerPlatformenTable.name, name!))
    .returning();

  if (!updated) { res.status(404).json({ fehler: "Plattform nicht gefunden" }); return; }
  req.log.info({ name, aktiv }, `Influencer-Plattform aktualisiert: ${name}`);
  res.json({ gespeichert: true, plattform: updated });
});

// GET /api/influencer/postings — Posting-Historie
router.get("/influencer/postings", async (req, res) => {
  const limit = Math.min(parseInt(req.query["limit"] as string ?? "50"), 100);
  const postings = await db.select().from(influencerPostingsTable)
    .orderBy(desc(influencerPostingsTable.createdAt)).limit(limit);
  res.json({ postings });
});

// GET /api/influencer/stats — Statistiken
router.get("/influencer/stats", async (_req, res) => {
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const dieseWoche = new Date(); dieseWoche.setDate(dieseWoche.getDate() - 7);

  const [postingsHeute, postingsWoche, aktivePlattformen] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(influencerPostingsTable)
      .where(and(gte(influencerPostingsTable.createdAt, heute), eq(influencerPostingsTable.status, "gepostet"))),
    db.select({ count: sql<number>`count(*)` }).from(influencerPostingsTable)
      .where(and(gte(influencerPostingsTable.createdAt, dieseWoche), eq(influencerPostingsTable.status, "gepostet"))),
    db.select({ count: sql<number>`count(*)` }).from(influencerPlatformenTable)
      .where(and(eq(influencerPlatformenTable.aktiv, true))),
  ]);

  const contentBereit = await db.select({ count: sql<number>`count(*)` })
    .from(contentTable).where(eq(contentTable.status, "generiert"));

  res.json({
    postingsHeute: Number(postingsHeute[0]?.count ?? 0),
    postingsWoche: Number(postingsWoche[0]?.count ?? 0),
    aktivePlattformen: Number(aktivePlattformen[0]?.count ?? 0),
    contentBereit: Number(contentBereit[0]?.count ?? 0),
  });
});

// POST /api/influencer/posten/:contentId — Manuell auf alle aktiven Plattformen posten
router.post("/influencer/posten/:contentId", async (req, res) => {
  const contentId = parseInt(req.params["contentId"] ?? "0");
  const { plattform } = req.body as { plattform?: string };

  const [content] = await db.select().from(contentTable).where(eq(contentTable.id, contentId));
  if (!content) { res.status(404).json({ fehler: "Content nicht gefunden" }); return; }

  const plattformenQuery = db.select().from(influencerPlatformenTable)
    .where(eq(influencerPlatformenTable.aktiv, true));
  const aktive = plattform
    ? (await db.select().from(influencerPlatformenTable).where(eq(influencerPlatformenTable.name, plattform)))
    : await plattformenQuery;

  if (aktive.length === 0) {
    res.status(400).json({ fehler: "Keine aktiven Plattformen — bitte Webhook-URL eingeben und aktivieren" });
    return;
  }

  const ergebnisse = await Promise.allSettled(aktive.map(p => posteAufPlatform(content, p)));
  const erfolgreich = ergebnisse.filter(r => r.status === "fulfilled").length;

  req.log.info({ contentId, plattformen: aktive.length, erfolgreich }, "Manueller Post ausgeführt");
  res.json({ erfolg: true, gepostetAuf: erfolgreich, gesamt: aktive.length });
});

// POST /api/influencer/auto-post — Auto-Posting-Zyklus starten
router.post("/influencer/auto-post", async (req, res) => {
  const { starteAutoPost } = await import("../agents/InfluencerAutoPostAgent");
  const ergebnis = await starteAutoPost();
  req.log.info(ergebnis, "Auto-Post-Zyklus ausgeführt");
  res.json(ergebnis);
});

// ─── INBOUND CALLBACK-WEBHOOK ────────────────────────────────────────────────
// Make.com / Zapier / n8n melden hier Posting-Ergebnisse (Erfolg, Engagement)
// zurück. Muster: sofort 202 antworten + im Hintergrund verarbeiten + loggen,
// damit der Aufrufer nie auf DB-/Netzwerk-Latenz wartet (analog Stripe-Pattern).
// Sicherheit: geteiltes Secret per Header erforderlich (fail-closed), siehe
// GET /api/einstellungen/influencer-webhook-secret.

interface EingehenderKommentar {
  externeKommentarId: string;
  autorName?: string;
  kommentarText: string;
}

interface InfluencerWebhookPayload {
  postingId?: number;
  status?: "erfolgreich" | "fehlgeschlagen" | string;
  externeId?: string;
  aufrufe?: number;
  likes?: number;
  kommentare?: number;
  fehler?: string;
  // Neue Kommentare, die automatisch beantwortet werden sollen (ohne Freigabe).
  neueKommentare?: EingehenderKommentar[];
}

/**
 * Generiert eine markenkonforme Antwort auf einen Kommentar und sendet sie
 * über den Plattform-Webhook zurück (aktion: "kommentar_antwort"). Läuft
 * bewusst OHNE Freigabe-Gate — der Nutzer hat dies explizit bestätigt.
 */
async function beantworteKommentar(
  postingId: number,
  kommentarId: number,
  kommentarText: string,
  autorName: string | undefined,
): Promise<void> {
  try {
    const [posting] = await db.select().from(influencerPostingsTable).where(eq(influencerPostingsTable.id, postingId));
    if (!posting) throw new Error(`Posting ${postingId} nicht gefunden für Kommentar-Antwort`);

    const persona = posting.marke ? MARKEN_PERSONAS[posting.marke] : undefined;
    let antwortText: string;

    if (openaiVerfuegbar) {
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 150,
        messages: [
          {
            role: "system",
            content: `${persona ?? "Du bist eine freundliche KI-Influencerin."} Antworte kurz (max. 2 Sätze), freundlich und markenkonform auf Deutsch auf einen Social-Media-Kommentar. Kein übertriebenes Marketing, keine Emojis-Spam.`,
          },
          { role: "user", content: `Kommentar von ${autorName ?? "einem Follower"}: "${kommentarText}"` },
        ],
      });
      antwortText = resp.choices[0]?.message?.content?.trim() || "Danke für deinen Kommentar! 🙌";
    } else {
      antwortText = "Danke für deinen Kommentar! 🙌";
    }

    const plattform = await db.select().from(influencerPlatformenTable)
      .where(eq(influencerPlatformenTable.name, posting.plattform)).then(r => r[0]);

    let antwortStatus = "gesendet";
    if (plattform?.webhookUrl) {
      try {
        const resp = await fetch(plattform.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aktion: "kommentar_antwort",
            plattform: posting.plattform,
            postingId,
            externeId: posting.externeId,
            antwortText,
            zeitstempel: new Date().toISOString(),
            system: "CyberSarah Revenue OS — KI-Influencer",
          }),
          signal: AbortSignal.timeout(12_000),
        });
        antwortStatus = resp.ok ? "gesendet" : "fehler";
      } catch {
        antwortStatus = "fehler";
      }
    } else {
      antwortStatus = "fehler";
    }

    await db.update(influencerKommentareTable)
      .set({ antwortText, antwortStatus, antwortGesendetAm: antwortStatus === "gesendet" ? new Date() : null })
      .where(eq(influencerKommentareTable.id, kommentarId));

    logger.info({ postingId, kommentarId, antwortStatus }, "💬 Kommentar automatisch beantwortet");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
    await db.update(influencerKommentareTable)
      .set({ antwortStatus: "fehler" })
      .where(eq(influencerKommentareTable.id, kommentarId));
    logger.warn({ err: msg, postingId, kommentarId }, "Automatische Kommentar-Antwort fehlgeschlagen");
  }
}

async function verarbeiteNeueKommentare(postingId: number, kommentare: EingehenderKommentar[]): Promise<void> {
  for (const k of kommentare) {
    if (!k.externeKommentarId || !k.kommentarText) continue;
    try {
      const [row] = await db.insert(influencerKommentareTable).values({
        postingId,
        externeKommentarId: k.externeKommentarId,
        autorName: k.autorName ?? null,
        kommentarText: k.kommentarText,
      }).onConflictDoNothing({
        target: [influencerKommentareTable.postingId, influencerKommentareTable.externeKommentarId],
      }).returning();

      // onConflictDoNothing liefert bei Duplikat keine Zeile zurück → bereits verarbeitet, überspringen (Dedupe).
      if (!row) continue;

      void beantworteKommentar(postingId, row.id, k.kommentarText, k.autorName);
    } catch (err) {
      logger.warn({ err, postingId, externeKommentarId: k.externeKommentarId }, "Kommentar konnte nicht gespeichert werden");
    }
  }
}

async function verarbeiteInfluencerWebhook(logId: number, payload: InfluencerWebhookPayload): Promise<void> {
  try {
    const postingId = Number(payload.postingId);
    if (!postingId || Number.isNaN(postingId)) {
      throw new Error("postingId fehlt oder ungültig");
    }

    const [posting] = await db.select().from(influencerPostingsTable)
      .where(eq(influencerPostingsTable.id, postingId));
    if (!posting) {
      throw new Error(`Posting ${postingId} nicht gefunden`);
    }

    const neuerStatus = payload.status === "fehlgeschlagen" ? "fehler_extern" : "bestaetigt";

    await db.update(influencerPostingsTable)
      .set({
        status: neuerStatus,
        externeId: payload.externeId ?? posting.externeId,
        aufrufe: typeof payload.aufrufe === "number" ? payload.aufrufe : posting.aufrufe,
        likes: typeof payload.likes === "number" ? payload.likes : posting.likes,
        kommentare: typeof payload.kommentare === "number" ? payload.kommentare : posting.kommentare,
        ergebnisGemeldetAm: new Date(),
        ...(payload.fehler && { fehler: payload.fehler }),
      })
      .where(eq(influencerPostingsTable.id, postingId));

    await db.update(webhookLogsTable)
      .set({ status: "erfolgreich" })
      .where(eq(webhookLogsTable.id, logId));

    if (Array.isArray(payload.neueKommentare) && payload.neueKommentare.length > 0) {
      await verarbeiteNeueKommentare(postingId, payload.neueKommentare);
    }

    logger.info({ postingId, status: neuerStatus }, "📥 Influencer-Callback verarbeitet");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
    await db.update(webhookLogsTable)
      .set({ status: "fehler", fehler: msg })
      .where(eq(webhookLogsTable.id, logId));
    logger.warn({ err: msg, logId }, "Influencer-Callback-Verarbeitung fehlgeschlagen");
  }
}

router.post("/influencer/webhook", async (req, res) => {
  const erwartetesSecret = await ladeOderErstelleInfluencerWebhookSecret();
  const gesendetesSecret = req.headers["x-webhook-secret"];

  if (!erwartetesSecret || gesendetesSecret !== erwartetesSecret) {
    logger.warn({ ip: req.ip }, "Influencer-Callback abgelehnt — Secret fehlt oder ungültig");
    res.status(401).json({ fehler: "Ungültiges oder fehlendes Secret" });
    return;
  }

  const payload = req.body as InfluencerWebhookPayload;

  const [log] = await db.insert(webhookLogsTable).values({
    quelle: "influencer_callback",
    payload,
    status: "empfangen",
  }).returning();

  // Sofort antworten — Verarbeitung läuft asynchron im Hintergrund,
  // damit der Aufrufer (Make.com etc.) nicht auf DB-Schreibvorgänge warten muss.
  res.status(202).json({ empfangen: true, logId: log!.id });

  void verarbeiteInfluencerWebhook(log!.id, payload);
});

// ─── FREIGABE-DASHBOARD ───────────────────────────────────────────────────────
// Normale Posts brauchen vor dem autonomen Posten eine manuelle Sichtprüfung
// (influencerFreigegeben). Betrifft NICHT die automatischen Kommentar-Antworten.

// GET /api/influencer/ausstehend — generierter Content, der noch nicht freigegeben/abgelehnt wurde
router.get("/influencer/ausstehend", async (_req, res) => {
  const ausstehend = await db.select().from(contentTable)
    .where(and(eq(contentTable.status, "generiert"), eq(contentTable.influencerFreigegeben, false)))
    .orderBy(desc(contentTable.createdAt))
    .limit(50);
  res.json({ ausstehend });
});

// PATCH /api/influencer/content/:id/freigeben — Post für den Auto-Post-Zyklus freigeben
router.patch("/influencer/content/:id/freigeben", async (req, res) => {
  const id = parseInt(req.params["id"] ?? "0");
  const [updated] = await db.update(contentTable)
    .set({ influencerFreigegeben: true, influencerFreigegebenAm: new Date() })
    .where(eq(contentTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ fehler: "Content nicht gefunden" }); return; }
  req.log.info({ contentId: id }, "✅ Content für Auto-Post freigegeben");
  res.json({ freigegeben: true, content: updated });
});

// PATCH /api/influencer/content/:id/ablehnen — Post aus der Auto-Post-Pipeline nehmen
router.patch("/influencer/content/:id/ablehnen", async (req, res) => {
  const id = parseInt(req.params["id"] ?? "0");
  const [updated] = await db.update(contentTable)
    .set({ status: "abgelehnt", influencerFreigegeben: false })
    .where(eq(contentTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ fehler: "Content nicht gefunden" }); return; }
  req.log.info({ contentId: id }, "🚫 Content abgelehnt");
  res.json({ abgelehnt: true, content: updated });
});

// ─── PERSONAS (feste Charakter-Referenzbilder pro Marke) ─────────────────────

// GET /api/influencer/personas
router.get("/influencer/personas", async (_req, res) => {
  const personas = await db.select().from(influencerPersonasTable).orderBy(influencerPersonasTable.marke);
  res.json({ personas });
});

// POST /api/influencer/personas/:marke/regenerieren — Referenzbild neu generieren
router.post("/influencer/personas/:marke/regenerieren", async (req, res) => {
  const marke = req.params["marke"] ?? "";
  const url = await generiereReferenzBildFuerMarke(marke);
  if (!url) { res.status(502).json({ fehler: "Referenzbild konnte nicht generiert werden" }); return; }
  req.log.info({ marke }, "🎭 Persona-Referenzbild neu generiert");
  res.json({ generiert: true, referenzBildUrl: url });
});

// GET /api/influencer/kommentare — Kommentar-Log (zur Sichtprüfung im Dashboard)
router.get("/influencer/kommentare", async (req, res) => {
  const limit = Math.min(parseInt(req.query["limit"] as string ?? "50"), 100);
  const kommentare = await db.select().from(influencerKommentareTable)
    .orderBy(desc(influencerKommentareTable.createdAt)).limit(limit);
  res.json({ kommentare });
});

export default router;
