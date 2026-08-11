/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * API-KEY-GUARDIAN-AGENT (Sprint 12)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Was dieser Agent WIRKLICH automatisiert (ehrlich, kein Übertreiben):
 *  - Unabhängige Live-Prüfung für Dienste mit sicherem, schreibgeschütztem
 *    Test-Endpunkt (OpenAI, Gemini, Telegram) — eigene, minimale Anfragen,
 *    unabhängig vom bestehenden API-Manager
 *  - Für Dienste ohne sicheren Test-Endpunkt (Digistore24, TikTok, Stripe,
 *    interne Tokens): reine Alterungs-Überwachung
 *  - Sofort-E-Mail, wenn ein Dienst KOMPLETT ausfällt (Haupt- UND Backup-Key
 *    beide fehlerhaft)
 *  - Wöchentliche Erinnerung, wenn ein Key seit >90 Tagen nicht als rotiert
 *    markiert wurde
 *
 * Was dieser Agent NICHT kann (bewusst, ehrlich kommuniziert):
 *  - Sich selbst bei einem Anbieter einloggen und einen neuen Key erstellen
 *  - 2FA-geschützte Web-Oberflächen bedienen
 *  → Diese Schritte bleiben beim Menschen. Der Agent sorgt nur dafür, dass du
 *    rechtzeitig erfährst, WANN und WOFÜR das nötig ist.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { db } from "@workspace/db";
import { apiKeyRegistryTable } from "@workspace/db";
import { eq, isNull, or, lte, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendEmail } from "../lib/emailClient";

const AGENT_NAME = "API-Key-Guardian";
const ROTATIONS_ERINNERUNG_TAGE = 90;
const ERINNERUNGS_ABSTAND_TAGE = 30; // nicht öfter als alle 30 Tage nerven

interface KeyDefinition {
  service: string;
  anzeigename: string;
  envVar: string;
  pruefTyp: "live_check" | "nur_alter";
}

// Bekannte Keys — bei neuen Diensten hier einfach ergänzen
const BEKANNTE_KEYS: KeyDefinition[] = [
  { service: "openai", anzeigename: "OpenAI (Haupt)", envVar: "OPENAI_API_KEY", pruefTyp: "live_check" },
  { service: "openai_backup", anzeigename: "OpenAI (Backup)", envVar: "OPENAI_BACKUP_KEY", pruefTyp: "live_check" },
  { service: "gemini", anzeigename: "Gemini (Haupt)", envVar: "GEMINI_API_KEY", pruefTyp: "live_check" },
  { service: "gemini_backup", anzeigename: "Gemini (Backup)", envVar: "GEMINI_BACKUP_KEY", pruefTyp: "live_check" },
  { service: "telegram", anzeigename: "Telegram Bot", envVar: "TELEGRAM_BOT_TOKEN", pruefTyp: "live_check" },
  { service: "digistore24", anzeigename: "Digistore24", envVar: "DIGISTORE24_API_KEY", pruefTyp: "nur_alter" },
  { service: "tiktok", anzeigename: "TikTok", envVar: "TIKTOK_CLIENT_SECRET", pruefTyp: "nur_alter" },
  { service: "stripe", anzeigename: "Stripe", envVar: "STRIPE_SECRET_KEY", pruefTyp: "nur_alter" },
  { service: "deploy_token", anzeigename: "Deploy-Token", envVar: "DEPLOY_TOKEN", pruefTyp: "nur_alter" },
  { service: "api_auth_token", anzeigename: "API-Auth-Token", envVar: "API_AUTH_TOKEN", pruefTyp: "nur_alter" },
];

export class ApiKeyGuardianAgent extends AgentBase {
  constructor() {
    super(AGENT_NAME, "api_key_guardian");
  }

  protected beschreibungText(): string {
    return "AUTONOM: Unabhängige Live-Prüfung von API-Keys, Sofort-Warnung bei Totalausfall, Alterungs-Erinnerung für Rotation";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const aktion = String(aufgabe.payload?.["aktion"] ?? "full_check");

    switch (aktion) {
      case "keys_registrieren":
        return this.registriereFehlendeKeys();
      case "live_pruefung":
        return this.fuehreLivePruefungAus();
      case "alterung_pruefen":
        return this.pruefeAlterung();
      case "full_check":
      default:
        await this.registriereFehlendeKeys();
        const live = await this.fuehreLivePruefungAus();
        const alterung = await this.pruefeAlterung();
        return {
          success: true,
          message: "Voll-Check abgeschlossen",
          metadaten: { live: live.metadaten, alterung: alterung.metadaten },
        };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // NEUE KEYS AUS .ENV AUTOMATISCH REGISTRIEREN
  // ═════════════════════════════════════════════════════════════════════════════
  private async registriereFehlendeKeys(): Promise<AufgabeErgebnis> {
    let neu = 0;
    for (const def of BEKANNTE_KEYS) {
      const wertVorhanden = !!process.env[def.envVar];
      if (!wertVorhanden) continue;

      const [bestehend] = await db.select().from(apiKeyRegistryTable)
        .where(eq(apiKeyRegistryTable.service, def.service)).limit(1);
      if (bestehend) continue;

      await db.insert(apiKeyRegistryTable).values({
        service: def.service,
        anzeigename: def.anzeigename,
        pruefTyp: def.pruefTyp,
      });
      neu++;
    }
    return { success: true, message: `${neu} neue Keys registriert`, metadaten: { neu } };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // UNABHÄNGIGE LIVE-PRÜFUNG — eigene, minimale, schreibgeschützte Testaufrufe
  // ═════════════════════════════════════════════════════════════════════════════
  private async fuehreLivePruefungAus(): Promise<AufgabeErgebnis> {
    const zuPruefen = BEKANNTE_KEYS.filter(k => k.pruefTyp === "live_check");
    let geprueft = 0;
    const komplettAusgefallen: string[] = [];

    for (const def of zuPruefen) {
      const wert = process.env[def.envVar];
      let status: "ok" | "fehler" = "fehler";
      let fehlerText: string | null = wert ? null : "Kein Wert in .env gesetzt";

      if (wert) {
        try {
          status = await this.testeKeyLive(def.service, wert);
        } catch (err) {
          fehlerText = (err as Error).message?.slice(0, 200) ?? "Unbekannter Fehler";
        }
      }

      await db.update(apiKeyRegistryTable)
        .set({ status, letzterFehler: fehlerText, letzterCheckAm: new Date() })
        .where(eq(apiKeyRegistryTable.service, def.service));

      geprueft++;
    }

    // Totalausfall erkennen: Haupt + Backup beide fehlerhaft
    const paare: [string, string, string][] = [
      ["openai", "openai_backup", "OpenAI"],
      ["gemini", "gemini_backup", "Gemini"],
    ];
    for (const [haupt, backup, label] of paare) {
      const rows = await db.select().from(apiKeyRegistryTable)
        .where(sql`service IN (${haupt}, ${backup})`);
      const beideFehlerhaft = rows.length === 2 && rows.every(r => r.status === "fehler");
      if (beideFehlerhaft) {
        komplettAusgefallen.push(label);
      }
    }

    // Telegram hat keinen Backup-Key im System — einzeln prüfen
    const [telegram] = await db.select().from(apiKeyRegistryTable).where(eq(apiKeyRegistryTable.service, "telegram")).limit(1);
    if (telegram?.status === "fehler") komplettAusgefallen.push("Telegram");

    if (komplettAusgefallen.length > 0) {
      await this.sendeTotalausfallWarnung(komplettAusgefallen);
    }

    return {
      success: true,
      message: `${geprueft} Keys live geprüft${komplettAusgefallen.length ? `, ${komplettAusgefallen.length} Totalausfall(-Warnung) versendet` : ""}`,
      metadaten: { geprueft, komplettAusgefallen },
    };
  }

  /**
   * Ein einziger, minimaler, ausschließlich lesender Testaufruf pro Dienst.
   * Bewusst so gewählt, dass er nichts verändert und kein Kontingent verbraucht,
   * das nennenswert kostet.
   */
  private async testeKeyLive(service: string, wert: string): Promise<"ok" | "fehler"> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      let antwort: Response;
      if (service === "openai" || service === "openai_backup") {
        antwort = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${wert}` },
          signal: controller.signal,
        });
      } else if (service === "gemini" || service === "gemini_backup") {
        antwort = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${wert}`, {
          signal: controller.signal,
        });
      } else if (service === "telegram") {
        antwort = await fetch(`https://api.telegram.org/bot${wert}/getMe`, { signal: controller.signal });
      } else {
        return "fehler"; // sollte nie erreicht werden, da nur live_check-Dienste hier landen
      }
      return antwort.ok ? "ok" : "fehler";
    } finally {
      clearTimeout(timeout);
    }
  }

  private async sendeTotalausfallWarnung(dienste: string[]): Promise<void> {
    // Nicht öfter als alle 6 Stunden pro Lauf nerven — einfacher Schutz: prüfen
    // ob schon eine Erinnerung in den letzten 6h für einen der Dienste raus ist
    const seit = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const kuerzlichGewarnt = await db.select().from(apiKeyRegistryTable)
      .where(sql`letzte_erinnerung_gesendet_am > ${seit}`);
    const bereitsGewarnteDienste = new Set(kuerzlichGewarnt.map(r => r.anzeigename.split(" ")[0]));
    const wirklichNeu = dienste.filter(d => !bereitsGewarnteDienste.has(d));
    if (wirklichNeu.length === 0) return;

    const empfaenger = process.env["ADMIN_EMAIL"] ?? process.env["SMTP_FROM"];
    if (!empfaenger) {
      logger.error({ dienste: wirklichNeu }, "🔥 API-Key-Guardian: Totalausfall, aber keine ADMIN_EMAIL gesetzt — keine Warnung versendet!");
      return;
    }

    try {
      await sendEmail({
        to: empfaenger,
        subject: `🔥 Kompletter API-Ausfall: ${wirklichNeu.join(", ")}`,
        text: `Achtung — folgende Dienste haben aktuell KEINEN funktionierenden API-Key mehr (Haupt und Backup beide fehlgeschlagen):\n\n${wirklichNeu.map(d => `- ${d}`).join("\n")}\n\nBitte zeitnah neuen Key beim jeweiligen Anbieter erstellen und in .env eintragen.`,
      });
      logger.info({ dienste: wirklichNeu }, "🔥 API-Key-Guardian: Totalausfall-Warnung versendet");
    } catch (err) {
      logger.error({ err }, "API-Key-Guardian: Warnung konnte nicht versendet werden");
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // ALTERUNGS-ERINNERUNG
  // ═════════════════════════════════════════════════════════════════════════════
  private async pruefeAlterung(): Promise<AufgabeErgebnis> {
    const grenze = new Date(Date.now() - ROTATIONS_ERINNERUNG_TAGE * 24 * 60 * 60 * 1000);
    const erinnerungsSperre = new Date(Date.now() - ERINNERUNGS_ABSTAND_TAGE * 24 * 60 * 60 * 1000);

    const alteKeys = await db.select().from(apiKeyRegistryTable).where(
      sql`COALESCE(zuletzt_rotiert_am, erste_erkennung_am) < ${grenze}
          AND (letzte_erinnerung_gesendet_am IS NULL OR letzte_erinnerung_gesendet_am < ${erinnerungsSperre})`
    );

    if (alteKeys.length === 0) {
      return { success: true, message: "Keine überfälligen Rotationen", metadaten: { anzahl: 0 } };
    }

    const empfaenger = process.env["ADMIN_EMAIL"] ?? process.env["SMTP_FROM"];
    if (empfaenger) {
      try {
        await sendEmail({
          to: empfaenger,
          subject: `🔑 ${alteKeys.length} API-Key(s) sollten rotiert werden`,
          text: `Diese Keys wurden seit über ${ROTATIONS_ERINNERUNG_TAGE} Tagen nicht als rotiert markiert:\n\n${alteKeys.map(k => `- ${k.anzeigename}`).join("\n")}\n\nAus Sicherheitsgründen empfehlen wir eine regelmäßige Rotation. Im Dashboard kannst du jeden Key nach dem Erneuern als "rotiert" markieren.`,
        });
      } catch (err) {
        logger.warn({ err }, "API-Key-Guardian: Alterungs-Erinnerung konnte nicht versendet werden");
      }
    }

    for (const key of alteKeys) {
      await db.update(apiKeyRegistryTable)
        .set({ letzteErinnerungGesendetAm: new Date() })
        .where(eq(apiKeyRegistryTable.id, key.id));
    }

    return { success: true, message: `${alteKeys.length} Alterungs-Erinnerungen versendet`, metadaten: { anzahl: alteKeys.length } };
  }
}
