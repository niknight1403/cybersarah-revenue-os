import { pgTable, serial, varchar, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * API-KEY-GUARDIAN — unabhängige Ergänzung zum bestehenden API-Manager
 * ═══════════════════════════════════════════════════════════════════════════════
 * WICHTIG zur Ehrlichkeit: Kein Agent kann sich selbstständig bei OpenAI,
 * Telegram, TikTok etc. einloggen und dort neue Keys erstellen — das geht nur
 * über die jeweilige Web-Oberfläche mit menschlichem Login (oft inkl. 2FA).
 * Dieser Agent übernimmt, was tatsächlich automatisierbar ist:
 *  - Unabhängige Live-Prüfung (eigener, minimaler Testaufruf, nicht auf den
 *    bestehenden API-Manager angewiesen)
 *  - Alterungs-Erinnerung (Sicherheits-Hygiene: Keys sollten regelmäßig rotiert werden)
 *  - Sofort-E-Mail-Warnung, wenn ein Dienst KOMPLETT ausfällt (kein
 *    funktionierender Key mehr übrig)
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const apiKeyRegistryTable = pgTable("api_key_registry", {
  id: serial("id").primaryKey(),
  service: varchar("service", { length: 64 }).notNull().unique(),
  // "openai" | "openai_backup" | "gemini" | "gemini_backup" | "telegram" |
  // "digistore24" | "tiktok" | "stripe" | "deploy_token" | "api_auth_token"
  anzeigename: varchar("anzeigename", { length: 128 }).notNull(),
  pruefTyp: varchar("pruef_typ", { length: 16 }).notNull().default("nur_alter"),
  // "live_check" (echter Testaufruf) | "nur_alter" (nur Alterungs-Erinnerung)
  status: varchar("status", { length: 16 }).notNull().default("unbekannt"),
  // "ok" | "fehler" | "unbekannt"
  letzterFehler: text("letzter_fehler"),
  letzterCheckAm: timestamp("letzter_check_am", { withTimezone: true }),
  ersteErkennungAm: timestamp("erste_erkennung_am", { withTimezone: true }).notNull().defaultNow(),
  // Fallback-Datum für die Alters-Berechnung, falls nie manuell bestätigt
  zuletztRotiertAm: timestamp("zuletzt_rotiert_am", { withTimezone: true }),
  // Wird gesetzt, wenn der Nutzer im Dashboard "Als rotiert markieren" klickt
  letzteErinnerungGesendetAm: timestamp("letzte_erinnerung_gesendet_am", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ApiKeyRegistryEntry = typeof apiKeyRegistryTable.$inferSelect;
