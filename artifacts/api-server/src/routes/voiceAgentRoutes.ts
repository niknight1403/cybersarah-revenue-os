/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VOICE-AGENT-SERVICE API
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ WICHTIGER INTEGRATIONSSCHRITT (manuell, einmalig) — genau wie bei den
 * B2B-Service- und Sales-Chat-Sprints:
 * POST /api/voice-agent/webhook/call wird vom Voice-AI-Provider aufgerufen
 * (Vapi/Synthflow/Twilio o.ä.), nicht von einem eingeloggten Nutzer. Diese
 * EINE Route muss in `lib/apiAuth.ts` von der Bearer-Token-Prüfung
 * ausgenommen werden:
 *
 *   if (req.path === "/healthz" || req.path === "/b2b-service/anfrage"
 *       || req.path === "/chat/message" || req.path === "/chat/widget.js"
 *       || req.path === "/voice-agent/webhook/call") {
 *     next(); return;
 *   }
 *
 * ZUSÄTZLICH empfehlenswert (aber nicht in diesem Sprint umgesetzt, da
 * providerspezifisch): den Webhook zusätzlich mit einem Secret-Header oder
 * einer Signaturprüfung absichern, die dein gewählter Voice-AI-Anbieter
 * mitliefert (z.B. Vapi sendet "x-vapi-secret" — Doku des jeweiligen
 * Anbieters prüfen und hier ergänzen, sobald der Anbieter feststeht).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { voiceAgentClientsTable, voiceAgentCallsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { globalQueue } from "../agents/JobQueue";
import { PAKETE } from "../agents/VoiceAgentServiceAgent";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// ÖFFENTLICH: Webhook vom Voice-AI-Provider (siehe Hinweis oben — kein Auth!)
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/voice-agent/webhook/call", async (req, res) => {
  // Providerformate unterscheiden sich leicht — dieses Mapping deckt die
  // gängigsten Feldnamen ab (Vapi/Synthflow-ähnlich). Beim tatsächlichen
  // Anbieter ggf. anpassen.
  const body = req.body as Record<string, any>;

  const providerAgentId = body.agentId ?? body.assistant_id ?? body.assistantId;
  const providerCallId = body.callId ?? body.call_id ?? body.id;
  const anruferNummer = body.from ?? body.caller_number ?? body.customer?.number;
  const dauerSekunden = Number(body.duration ?? body.call_duration_seconds ?? 0);
  const transkript = body.transcript ?? body.call_transcript ?? null;

  if (!providerAgentId) {
    res.status(400).json({ error: "agentId/assistantId fehlt im Webhook-Payload" });
    return;
  }

  const [client] = await db.select().from(voiceAgentClientsTable)
    .where(eq(voiceAgentClientsTable.providerAgentId, String(providerAgentId))).limit(1);

  if (!client) {
    logger.warn({ providerAgentId }, "Voice-Agent-Webhook: kein Kunde für diese Agent-ID gefunden");
    res.status(404).json({ error: "Kein Kunde für diese Agent-ID registriert" });
    return;
  }

  const [call] = await db.insert(voiceAgentCallsTable).values({
    clientId: client.id,
    anruferNummer: anruferNummer ?? null,
    dauerSekunden,
    transkript,
    providerCallId: providerCallId ? String(providerCallId) : null,
    rohdaten: body,
  }).returning();

  if (call) {
    globalQueue.fuegeHinzu("voice_agent_verarbeite_anruf", { aktion: "verarbeite_anruf", callId: call.id }, { prioritaet: 1, maxVersuche: 2 });
  }

  logger.info({ clientId: client.id, callId: call?.id }, "📞 Neuer Anruf empfangen");
  res.json({ erfolg: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTIFIZIERT: Verwaltung (Dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/voice-agent/pakete", (_req, res) => {
  res.json({ pakete: PAKETE });
});

router.get("/voice-agent/clients", async (_req, res) => {
  const clients = await db.select().from(voiceAgentClientsTable).orderBy(desc(voiceAgentClientsTable.createdAt));
  res.json({ clients, anzahl: clients.length });
});

router.post("/voice-agent/clients", async (req, res) => {
  const { firma, ansprechpartner, email, telefon, branche, paket, systemPrompt } = req.body as {
    firma: string; ansprechpartner: string; email: string; telefon?: string;
    branche?: string; paket?: keyof typeof PAKETE; systemPrompt?: string;
  };

  if (!firma || !ansprechpartner || !email) {
    res.status(400).json({ error: "firma, ansprechpartner und email sind erforderlich" });
    return;
  }

  const gewaehltesPaket = PAKETE[paket ?? "starter"] ?? PAKETE.starter;

  const [client] = await db.insert(voiceAgentClientsTable).values({
    firma, ansprechpartner, email,
    telefon: telefon ?? null,
    branche: branche ?? null,
    paket: paket ?? "starter",
    monatlicherPreis: gewaehltesPaket.preis,
    inkludierteMinuten: gewaehltesPaket.minuten,
    systemPrompt: systemPrompt ?? null,
  }).returning();

  res.json({ erfolg: true, client });
});

router.patch("/voice-agent/clients/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, providerAgentId, telefonnummer, stripeSubscriptionId } = req.body as {
    status?: string; providerAgentId?: string; telefonnummer?: string; stripeSubscriptionId?: string;
  };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status) updates["status"] = status;
  if (providerAgentId !== undefined) updates["providerAgentId"] = providerAgentId;
  if (telefonnummer !== undefined) updates["telefonnummer"] = telefonnummer;
  if (stripeSubscriptionId !== undefined) updates["stripeSubscriptionId"] = stripeSubscriptionId;

  await db.update(voiceAgentClientsTable).set(updates).where(eq(voiceAgentClientsTable.id, id));
  res.json({ erfolg: true });
});

router.get("/voice-agent/calls", async (req, res) => {
  const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
  const limit = Math.min(parseInt(String(req.query.limit ?? "50")), 200);

  const calls = clientId
    ? await db.select().from(voiceAgentCallsTable)
        .where(eq(voiceAgentCallsTable.clientId, clientId))
        .orderBy(desc(voiceAgentCallsTable.createdAt))
        .limit(limit)
    : await db.select().from(voiceAgentCallsTable)
        .orderBy(desc(voiceAgentCallsTable.createdAt))
        .limit(limit);

  res.json({ calls, anzahl: calls.length });
});

router.get("/voice-agent/stats", async (_req, res) => {
  const clients = await db.select().from(voiceAgentClientsTable);
  const aktiveClients = clients.filter(c => c.status === "aktiv");
  const mrr = aktiveClients.reduce((s, c) => s + parseFloat(c.monatlicherPreis), 0);

  const gesamtAnrufe = await db.select({ count: sql<number>`COUNT(*)` }).from(voiceAgentCallsTable);
  const dringendeAnrufe = await db.select({ count: sql<number>`COUNT(*)` })
    .from(voiceAgentCallsTable).where(eq(voiceAgentCallsTable.hoheDringlichkeit, true));

  res.json({
    kundenGesamt: clients.length,
    kundenAktiv: aktiveClients.length,
    mrr: mrr.toFixed(2),
    anrufeGesamt: Number(gesamtAnrufe[0]?.count ?? 0),
    dringendeAnrufe: Number(dringendeAnrufe[0]?.count ?? 0),
  });
});

export default router;
