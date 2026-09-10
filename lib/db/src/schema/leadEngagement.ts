import { pgTable, serial, integer, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LEAD-NURTURE-ENGAGEMENT — konsentbasiertes Follow-up, nie Kaltakquise
 * ═══════════════════════════════════════════════════════════════════════════════
 * WICHTIG, damit dieses Modul nie missbraucht wird:
 *  - Verarbeitet AUSSCHLIESSLICH bestehende Einträge aus leadsTable — Leute,
 *    die sich irgendwo selbst eingetragen haben (Freebie, Newsletter, Formular).
 *  - KEINE Funktion hier importiert, scraped oder kauft neue Kontakte.
 *  - status === "abgemeldet" wird an jeder Stelle sofort respektiert.
 *  - Jede Nachricht muss einen funktionierenden Abmelde-Link enthalten.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const leadEngagementTable = pgTable("lead_engagement", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  nachrichtenAnzahl: integer("nachrichten_anzahl").notNull().default(0),
  geoeffnetAnzahl: integer("geoeffnet_anzahl").notNull().default(0),
  geklicktAnzahl: integer("geklickt_anzahl").notNull().default(0),
  letzteNachrichtAm: timestamp("letzte_nachricht_am", { withTimezone: true }),
  letzteInteraktionAm: timestamp("letzte_interaktion_am", { withTimezone: true }),
  naechsteNachrichtAm: timestamp("naechste_nachricht_am", { withTimezone: true }),
  pausiert: boolean("pausiert").notNull().default(false),
  // true nach 3 Versuchen ohne jede Reaktion — wir drängen uns nicht auf
  letzterBetreff: text("letzter_betreff"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type LeadEngagement = typeof leadEngagementTable.$inferSelect;
