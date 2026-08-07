/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LEAD-NURTURE-AGENT (Sprint 10)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Die konsentbasierte Alternative zu automatisiertem Kaltakquise-Scraping:
 *  - Verarbeitet NUR Leads, die sich selbst eingetragen haben (leadsTable)
 *  - Personalisiert Follow-up-Nachrichten per KI, aber ausschließlich auf
 *    Basis dessen, was der Lead selbst angegeben hat (marke, quelle) —
 *    KEIN Scraping von LinkedIn, Firmenwebsites o.ä.
 *  - Passt die Taktung individuell an die Reaktion jedes einzelnen Leads an:
 *    geöffnet → früher nachfassen mit konkreterem Angebot
 *    geklickt → sehr zeitnah mit stärkerem CTA nachfassen
 *    keine Reaktion nach 3 Versuchen → pausiert automatisch (kein Spam)
 *  - Respektiert `status === "abgemeldet"` an jeder Stelle sofort
 *  - Jede Nachricht enthält einen echten Abmelde-Link
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { db } from "@workspace/db";
import { leadsTable, leadEngagementTable, agentLogsTable } from "@workspace/db";
import { eq, and, lte, isNull, or, sql } from "drizzle-orm";
import { openai, openaiVerfuegbar, handleOpenAIFehler } from "../lib/openaiClient";
import { logger } from "../lib/logger";
import { sendEmail } from "../lib/emailClient";

const AGENT_NAME = "Lead-Nurture-Agent";
const PUBLIC_URL = process.env["PUBLIC_APP_URL"] ?? "https://cybersarah-ki.de";
const MAX_VERSUCHE_OHNE_REAKTION = 3;

// Wartezeiten je nach Engagement-Stufe (in Stunden)
const TAKTUNG = {
  keineReaktion: 96, // 4 Tage — Standard-Rhythmus ohne besondere Reaktion
  geoeffnet: 48,      // 2 Tage — hat geöffnet, zeigt Interesse, schneller nachfassen
  geklickt: 24,       // 1 Tag — hat geklickt, ist "heiß", sehr zeitnah
} as const;

export class LeadNurtureAgent extends AgentBase {
  constructor() {
    super(AGENT_NAME, "lead_nurture");
  }

  protected beschreibungText(): string {
    return "AUTONOM: Sendet personalisierte Follow-up-Nachrichten an eingewilligte Leads, passt Taktung an echtes Engagement an, pausiert automatisch bei Desinteresse";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const aktion = String(aufgabe.payload?.["aktion"] ?? "verarbeite_faellige");

    switch (aktion) {
      case "verarbeite_faellige":
        return this.verarbeiteFaelligeLeads();
      case "tracke_oeffnung":
        return this.trackeOeffnung(Number(aufgabe.payload?.["leadId"]));
      case "tracke_klick":
        return this.trackeKlick(Number(aufgabe.payload?.["leadId"]));
      default:
        return this.holeStats();
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // FÄLLIGE LEADS VERARBEITEN — Kernschleife, läuft per Cron
  // ═════════════════════════════════════════════════════════════════════════════
  private async verarbeiteFaelligeLeads(): Promise<AufgabeErgebnis> {
    const jetzt = new Date();

    // Neue, aktive Leads ohne Engagement-Datensatz zuerst aufnehmen —
    // sie starten sofort im Zyklus (naechsteNachrichtAm = jetzt)
    const leadsOhneEngagement = await db
      .select({ id: leadsTable.id })
      .from(leadsTable)
      .leftJoin(leadEngagementTable, eq(leadsTable.id, leadEngagementTable.leadId))
      .where(and(eq(leadsTable.status, "aktiv"), isNull(leadEngagementTable.id)))
      .limit(100);

    for (const { id } of leadsOhneEngagement) {
      await db.insert(leadEngagementTable).values({ leadId: id, naechsteNachrichtAm: jetzt });
    }

    // Engagement-Datensätze für fällige, nicht pausierte, nicht abgemeldete Leads
    const faellige = await db
      .select({ engagement: leadEngagementTable, lead: leadsTable })
      .from(leadEngagementTable)
      .innerJoin(leadsTable, eq(leadEngagementTable.leadId, leadsTable.id))
      .where(and(
        eq(leadsTable.status, "aktiv"), // NIE an abgemeldete Leads senden
        eq(leadEngagementTable.pausiert, false),
        or(
          isNull(leadEngagementTable.naechsteNachrichtAm),
          lte(leadEngagementTable.naechsteNachrichtAm, jetzt),
        ),
      ))
      .limit(30);

    let versendet = 0;
    let pausiert = 0;

    for (const { engagement, lead } of faellige) {
      // Nach zu vielen Versuchen ohne jede Reaktion: automatisch pausieren,
      // statt sich weiter aufzudrängen
      if (
        engagement.nachrichtenAnzahl >= MAX_VERSUCHE_OHNE_REAKTION &&
        engagement.geoeffnetAnzahl === 0 &&
        engagement.geklicktAnzahl === 0
      ) {
        await db.update(leadEngagementTable)
          .set({ pausiert: true })
          .where(eq(leadEngagementTable.id, engagement.id));
        pausiert++;
        continue;
      }

      const nachricht = await this.generiereNachricht(lead, engagement);

      try {
        await sendEmail({
          to: lead.email,
          subject: nachricht.betreff,
          html: this.erstelleEmailHtml(lead, nachricht),
        });

        const naechsteTaktungStunden = engagement.geklicktAnzahl > 0
          ? TAKTUNG.geklickt
          : engagement.geoeffnetAnzahl > 0
            ? TAKTUNG.geoeffnet
            : TAKTUNG.keineReaktion;

        await db.update(leadEngagementTable)
          .set({
            nachrichtenAnzahl: sql`nachrichten_anzahl + 1`,
            letzteNachrichtAm: new Date(),
            letzterBetreff: nachricht.betreff,
            naechsteNachrichtAm: new Date(Date.now() + naechsteTaktungStunden * 60 * 60 * 1000),
          })
          .where(eq(leadEngagementTable.id, engagement.id));

        versendet++;
      } catch (err) {
        logger.warn({ err, email: lead.email }, "Lead-Nurture: E-Mail fehlgeschlagen");
      }
    }

    if (this.agentId) {
      await db.insert(agentLogsTable).values({
        agentId: this.agentId, agentName: AGENT_NAME,
        aktion: "verarbeite_faellige", status: "erfolgreich",
        nachricht: `${versendet} Nachrichten gesendet, ${pausiert} automatisch pausiert (keine Reaktion)`,
      });
    }

    return {
      success: true,
      message: `${versendet} Nurture-Nachrichten gesendet, ${pausiert} pausiert`,
      metadaten: { versendet, pausiert, geprueft: faellige.length },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PERSONALISIERTE NACHRICHT GENERIEREN — nur aus Selbstangaben, nie Scraping
  // ═════════════════════════════════════════════════════════════════════════════
  private async generiereNachricht(
    lead: typeof leadsTable.$inferSelect,
    engagement: typeof leadEngagementTable.$inferSelect,
  ): Promise<{ betreff: string; inhalt: string }> {
    const stufe = engagement.geklicktAnzahl > 0 ? "heiss" : engagement.geoeffnetAnzahl > 0 ? "interessiert" : "kalt";

    if (!openaiVerfuegbar) {
      return {
        betreff: stufe === "heiss" ? "Bereit für den nächsten Schritt?" : "Nur kurz nachgefragt",
        inhalt: `Hallo,\n\nwir wollten uns kurz melden — falls du Fragen zu ${lead.quelle ?? "unserem Angebot"} hast, sind wir da.\n\nViele Grüße,\nDein ${lead.marke}-Team`,
      };
    }

    try {
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 300,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [{
          role: "system",
          content: `Du schreibst Follow-up-E-Mails für ${lead.marke}. Ton: freundlich, direkt, nie aufdringlich oder verkäuferisch. Der Empfänger hat sich selbst für "${lead.quelle ?? "ein Angebot"}" eingetragen — du kennst NICHTS über ihn außer dieser einen Angabe. Erfinde keine Details über die Person oder ihr Unternehmen.`,
        }, {
          role: "user",
          content: `Engagement-Stufe: ${stufe} (${engagement.nachrichtenAnzahl}. Nachricht, ${engagement.geoeffnetAnzahl}x geöffnet, ${engagement.geklicktAnzahl}x geklickt)

Antworte NUR als JSON:
{
  "betreff": "[max 50 Zeichen, ${stufe === "heiss" ? "konkreter Call-to-Action" : stufe === "interessiert" ? "neugierig machend" : "kurz und locker"}]",
  "inhalt": "[2-4 Sätze Fließtext, KEIN HTML, keine Anrede mit Namen falls unbekannt]"
}`,
        }],
      });

      const raw = resp.choices[0]?.message.content ?? "{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as { betreff?: string; inhalt?: string };
      return {
        betreff: parsed.betreff ?? "Kurz nachgefragt",
        inhalt: parsed.inhalt ?? `Falls du Fragen hast, melde dich gerne.\n\nViele Grüße,\nDein ${lead.marke}-Team`,
      };
    } catch (err) {
      handleOpenAIFehler(err, 0, AGENT_NAME);
      return { betreff: "Kurz nachgefragt", inhalt: `Falls du Fragen hast, melde dich gerne.\n\nViele Grüße,\nDein ${lead.marke}-Team` };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // E-MAIL-HTML MIT TRACKING-PIXEL + KLICK-WEITERLEITUNG + ABMELDE-LINK
  // ═════════════════════════════════════════════════════════════════════════════
  private erstelleEmailHtml(lead: typeof leadsTable.$inferSelect, nachricht: { betreff: string; inhalt: string }): string {
    const klickUrl = `${PUBLIC_URL}/api/lead-nurture/klick/${lead.id}`;
    const pixelUrl = `${PUBLIC_URL}/api/lead-nurture/pixel/${lead.id}.png`;
    const abmeldeUrl = `${PUBLIC_URL}/api/lead-nurture/abmelden/${lead.id}`;

    return `
      <div style="max-width:560px;margin:0 auto;font-family:-apple-system,sans-serif;color:#1a1a2e;line-height:1.6;">
        <p>${nachricht.inhalt.replace(/\n/g, "<br>")}</p>
        <p style="margin-top:20px;">
          <a href="${klickUrl}" style="background:#7c3aed;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;">Mehr erfahren →</a>
        </p>
        <p style="font-size:11px;color:#999;margin-top:32px;">
          Du bekommst diese Mail, weil du dich für "${lead.quelle ?? "ein Angebot"}" bei ${lead.marke} eingetragen hast.
          <a href="${abmeldeUrl}" style="color:#999;">Keine weiteren Mails erhalten</a>
        </p>
        <img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;">
      </div>`;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // ENGAGEMENT TRACKEN
  // ═════════════════════════════════════════════════════════════════════════════
  private async trackeOeffnung(leadId: number): Promise<AufgabeErgebnis> {
    await db.update(leadEngagementTable)
      .set({ geoeffnetAnzahl: sql`geoeffnet_anzahl + 1`, letzteInteraktionAm: new Date() })
      .where(eq(leadEngagementTable.leadId, leadId));
    return { success: true, message: `Öffnung getrackt für Lead ${leadId}` };
  }

  private async trackeKlick(leadId: number): Promise<AufgabeErgebnis> {
    await db.update(leadEngagementTable)
      .set({ geklicktAnzahl: sql`geklickt_anzahl + 1`, letzteInteraktionAm: new Date() })
      .where(eq(leadEngagementTable.leadId, leadId));
    return { success: true, message: `Klick getrackt für Lead ${leadId}` };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STATISTIK
  // ═════════════════════════════════════════════════════════════════════════════
  private async holeStats(): Promise<AufgabeErgebnis> {
    const alle = await db.select().from(leadEngagementTable);
    const aktiv = alle.filter(e => !e.pausiert);
    const pausiert = alle.filter(e => e.pausiert);
    const geoeffnetGesamt = alle.reduce((s, e) => s + e.geoeffnetAnzahl, 0);
    const geklicktGesamt = alle.reduce((s, e) => s + e.geklicktAnzahl, 0);
    const nachrichtenGesamt = alle.reduce((s, e) => s + e.nachrichtenAnzahl, 0);

    return {
      success: true,
      message: `${aktiv.length} aktiv, ${pausiert.length} pausiert`,
      metadaten: {
        leadsAktiv: aktiv.length,
        leadsPausiert: pausiert.length,
        nachrichtenGesamt,
        oeffnungsrate: nachrichtenGesamt > 0 ? ((geoeffnetGesamt / nachrichtenGesamt) * 100).toFixed(1) + "%" : "0%",
        klickrate: nachrichtenGesamt > 0 ? ((geklicktGesamt / nachrichtenGesamt) * 100).toFixed(1) + "%" : "0%",
      },
    };
  }
}
