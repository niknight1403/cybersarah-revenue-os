/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VOICE-AGENT-SERVICE-AGENT — KI-Telefonassistent als Produkt (Sprint 9)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Was dieser Agent automatisiert:
 *  - Verarbeitet eingehende Anruf-Webhooks vom Voice-AI-Provider
 *  - Erstellt KI-Zusammenfassung + erkennt Dringlichkeit aus dem Transkript
 *  - Benachrichtigt den Kunden bei dringenden Anrufen sofort per E-Mail
 *  - Trackt Minutenverbrauch, warnt bei Überschreitung des inkludierten Kontingents
 *  - Setzt am Monatsanfang den Minutenzähler zurück
 *  - Sendet wöchentliche Zusammenfassungs-Reports an jeden Kunden
 *
 * Was bewusst NICHT hier passiert (Provider-Aufgabe, nicht unsere):
 *  - Die eigentliche Sprachverarbeitung (STT/TTS/Konversationslogik) — das
 *    übernimmt der gewählte Voice-AI-Anbieter (Vapi/Synthflow/Twilio+ElevenLabs).
 *    Wir empfangen nur das Ergebnis per Webhook und kümmern uns um Business-Logik.
 */
import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { db } from "@workspace/db";
import { voiceAgentClientsTable, voiceAgentCallsTable, agentLogsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { openai, openaiVerfuegbar, handleOpenAIFehler } from "../lib/openaiClient";
import { logger } from "../lib/logger";
import { sendEmail } from "../lib/emailClient";

const AGENT_NAME = "Voice-Agent-Service";

export const PAKETE = {
  starter: { name: "Starter", preis: "85.00", minuten: 200 },
  business: { name: "Business", preis: "149.00", minuten: 500 },
  scale: { name: "Scale", preis: "299.00", minuten: 99999 },
} as const;

export class VoiceAgentServiceAgent extends AgentBase {
  constructor() {
    super(AGENT_NAME, "voice_agent_service");
  }

  protected beschreibungText(): string {
    return "AUTONOM: Verarbeitet Anruf-Webhooks, erstellt KI-Zusammenfassungen, erkennt dringende Anrufe, überwacht Minutenkontingente, versendet wöchentliche Reports";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const aktion = String(aufgabe.payload?.["aktion"] ?? "stats");

    switch (aktion) {
      case "verarbeite_anruf":
        return this.verarbeiteAnruf(Number(aufgabe.payload?.["callId"]));
      case "monatszaehler_zuruecksetzen":
        return this.setzeMonatszaehlerZurueck();
      case "woechentlicher_report":
        return this.sendeWoechentlicheReports();
      case "stats":
      default:
        return this.holeStats();
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // ANRUF VERARBEITEN: KI-Zusammenfassung + Dringlichkeit + Minutenzähler
  // ═════════════════════════════════════════════════════════════════════════════
  private async verarbeiteAnruf(callId: number): Promise<AufgabeErgebnis> {
    const [call] = await db.select().from(voiceAgentCallsTable).where(eq(voiceAgentCallsTable.id, callId)).limit(1);
    if (!call) return { success: false, message: `Anruf #${callId} nicht gefunden` };

    const [client] = await db.select().from(voiceAgentClientsTable).where(eq(voiceAgentClientsTable.id, call.clientId)).limit(1);
    if (!client) return { success: false, message: `Kunde für Anruf #${callId} nicht gefunden` };

    let zusammenfassung = "Keine KI-Zusammenfassung verfügbar.";
    let hoheDringlichkeit = false;
    let ergebnis = "sonstiges";

    if (openaiVerfuegbar && call.transkript) {
      try {
        const resp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 250,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [{
            role: "system",
            content: `Du fasst Telefonat-Transkripte für ein Unternehmen (${client.firma}, Branche: ${client.branche ?? "unbekannt"}) zusammen. Sei präzise und geschäftsrelevant.`,
          }, {
            role: "user",
            content: `Transkript:\n"${call.transkript.slice(0, 3000)}"\n\nAntworte NUR als JSON:
{
  "zusammenfassung": "[2-3 Sätze: worum ging es, was wurde vereinbart/erledigt]",
  "ergebnis": "termin_gebucht" | "info_gegeben" | "weitergeleitet" | "lead_qualifiziert" | "sonstiges",
  "hoheDringlichkeit": true/false (true wenn: Beschwerde, dringendes Anliegen, hochwertiger Neukunde, Notfall)
}`,
          }],
        });

        const raw = resp.choices[0]?.message.content ?? "{}";
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
          zusammenfassung?: string; ergebnis?: string; hoheDringlichkeit?: boolean;
        };
        zusammenfassung = parsed.zusammenfassung ?? zusammenfassung;
        ergebnis = parsed.ergebnis ?? ergebnis;
        hoheDringlichkeit = parsed.hoheDringlichkeit ?? false;
      } catch (err) {
        handleOpenAIFehler(err, 0, AGENT_NAME);
      }
    }

    await db.update(voiceAgentCallsTable)
      .set({ zusammenfassung, ergebnis, hoheDringlichkeit })
      .where(eq(voiceAgentCallsTable.id, callId));

    // Minutenverbrauch hochzählen
    const minuten = call.dauerSekunden / 60;
    await db.update(voiceAgentClientsTable)
      .set({ verbrauchteMinutenDiesenMonat: sql`verbrauchte_minuten_diesen_monat + ${minuten}` })
      .where(eq(voiceAgentClientsTable.id, client.id));

    // Bei hoher Dringlichkeit: Kunden sofort benachrichtigen
    if (hoheDringlichkeit) {
      await sendEmail({
        to: client.email,
        subject: `🔥 Dringender Anruf bei ${client.firma}`,
        text: `Ein Anruf mit hoher Dringlichkeit ist eingegangen:\n\nVon: ${call.anruferNummer ?? "unbekannt"}\nDauer: ${Math.round(minuten)} Min\n\nZusammenfassung: ${zusammenfassung}\n\n👉 Zeitnah zurückrufen!`,
      });
    }

    // Kontingent-Überschreitung prüfen und warnen
    const [aktuellerClient] = await db.select().from(voiceAgentClientsTable).where(eq(voiceAgentClientsTable.id, client.id)).limit(1);
    if (aktuellerClient && Number(aktuellerClient.verbrauchteMinutenDiesenMonat) > aktuellerClient.inkludierteMinuten) {
      logger.info({ clientId: client.id, verbrauch: aktuellerClient.verbrauchteMinutenDiesenMonat, inklusive: aktuellerClient.inkludierteMinuten },
        "📞 Voice-Agent: Kontingent überschritten — Zusatzkosten fallen an");
    }

    return {
      success: true,
      message: `Anruf #${callId} verarbeitet: ${ergebnis}${hoheDringlichkeit ? " (DRINGEND)" : ""}`,
      metadaten: { callId, ergebnis, hoheDringlichkeit, minuten },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // MONATSZÄHLER ZURÜCKSETZEN (per Cron am 1. jedes Monats)
  // ═════════════════════════════════════════════════════════════════════════════
  private async setzeMonatszaehlerZurueck(): Promise<AufgabeErgebnis> {
    const result = await db.update(voiceAgentClientsTable)
      .set({ verbrauchteMinutenDiesenMonat: "0" })
      .where(eq(voiceAgentClientsTable.status, "aktiv"))
      .returning({ id: voiceAgentClientsTable.id });

    logger.info({ anzahl: result.length }, "📞 Voice-Agent: Monatszähler zurückgesetzt");
    return { success: true, message: `${result.length} Kunden-Zähler zurückgesetzt`, metadaten: { anzahl: result.length } };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // WÖCHENTLICHE REPORTS
  // ═════════════════════════════════════════════════════════════════════════════
  private async sendeWoechentlicheReports(): Promise<AufgabeErgebnis> {
    const aktiveKunden = await db.select().from(voiceAgentClientsTable).where(eq(voiceAgentClientsTable.status, "aktiv"));
    const vor7Tagen = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let versendet = 0;
    for (const client of aktiveKunden) {
      const anrufe = await db.select().from(voiceAgentCallsTable)
        .where(and(eq(voiceAgentCallsTable.clientId, client.id), gte(voiceAgentCallsTable.createdAt, vor7Tagen)));

      if (anrufe.length === 0) continue;

      const dringend = anrufe.filter(a => a.hoheDringlichkeit).length;
      const gesamtMinuten = anrufe.reduce((s, a) => s + a.dauerSekunden / 60, 0);

      try {
        await sendEmail({
          to: client.email,
          subject: `📞 Dein wöchentlicher Anruf-Report — ${client.firma}`,
          text: `Hallo ${client.ansprechpartner},\n\nletzte Woche hat dein KI-Telefonassistent ${anrufe.length} Anrufe bearbeitet (${Math.round(gesamtMinuten)} Minuten gesamt).${dringend > 0 ? `\n\n⚠️ Davon waren ${dringend} als dringend markiert.` : ""}\n\nDein aktueller Verbrauch: ${Number(client.verbrauchteMinutenDiesenMonat).toFixed(0)}/${client.inkludierteMinuten} Minuten diesen Monat.\n\nAlle Details im Dashboard.`,
        });
        versendet++;
      } catch (err) {
        logger.warn({ err, clientId: client.id }, "Voice-Agent: Wochenreport fehlgeschlagen");
      }
    }

    return { success: true, message: `${versendet} Wochenreports versendet`, metadaten: { versendet } };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STATISTIK
  // ═════════════════════════════════════════════════════════════════════════════
  private async holeStats(): Promise<AufgabeErgebnis> {
    const clients = await db.select().from(voiceAgentClientsTable);
    const aktiveClients = clients.filter(c => c.status === "aktiv");
    const mrr = aktiveClients.reduce((s, c) => s + parseFloat(c.monatlicherPreis), 0);

    const vor30Tagen = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const anrufeLetzte30Tage = await db.select({ count: sql<number>`COUNT(*)` })
      .from(voiceAgentCallsTable).where(gte(voiceAgentCallsTable.createdAt, vor30Tagen));

    return {
      success: true,
      message: `${aktiveClients.length} aktive Kunden, €${mrr.toFixed(2)} MRR`,
      metadaten: {
        kundenGesamt: clients.length,
        kundenAktiv: aktiveClients.length,
        mrr: mrr.toFixed(2),
        anrufeLetzte30Tage: Number(anrufeLetzte30Tage[0]?.count ?? 0),
      },
    };
  }
}
