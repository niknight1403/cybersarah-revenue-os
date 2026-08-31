import { pgTable, serial, text, timestamp, varchar, boolean, integer, unique } from "drizzle-orm/pg-core";
import { contentTable } from "./content";

export const influencerPlatformenTable = pgTable("influencer_plattformen", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  anzeigeName: varchar("anzeige_name", { length: 128 }).notNull(),
  symbol: varchar("symbol", { length: 8 }).notNull().default("📱"),
  webhookUrl: text("webhook_url"),
  aktiv: boolean("aktiv").notNull().default(false),
  postingsProTag: integer("postings_pro_tag").notNull().default(3),
  besteZeiten: varchar("beste_zeiten", { length: 256 }).notNull().default("08:00,13:00,19:00"),
  postingsHeute: integer("postings_heute").notNull().default(0),
  postingsGesamt: integer("postings_gesamt").notNull().default(0),
  letzterPost: timestamp("letzter_post", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const influencerPostingsTable = pgTable("influencer_postings", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").references(() => contentTable.id),
  plattform: varchar("plattform", { length: 64 }).notNull(),
  marke: varchar("marke", { length: 64 }),
  status: varchar("status", { length: 32 }).notNull().default("ausstehend"),
  inhaltKurz: text("inhalt_kurz"),
  webhookResponse: text("webhook_response"),
  gepostetAm: timestamp("gepostet_am", { withTimezone: true }),
  fehler: text("fehler"),
  // UTM-Tracking: an alle Links im Post angehängt, damit Klicks/Käufe später
  // pro Post/Plattform/Marke auswertbar sind (z.B. via Web-Analytics).
  utmCampaign: varchar("utm_campaign", { length: 128 }),
  // Extern gemeldete Ergebnisse (via inbound Callback-Webhook von Make.com/Zapier/n8n)
  externeId: varchar("externe_id", { length: 256 }),
  aufrufe: integer("aufrufe"),
  likes: integer("likes"),
  kommentare: integer("kommentare"),
  ergebnisGemeldetAm: timestamp("ergebnis_gemeldet_am", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Feste visuelle Identität pro Marke — ein Referenzbild, das für konsistente
// Charakter-Bilder bei allen künftigen Posts als Basis für Bild-Edits dient.
export const influencerPersonasTable = pgTable("influencer_personas", {
  id: serial("id").primaryKey(),
  marke: varchar("marke", { length: 64 }).notNull().unique(),
  referenzBildUrl: text("referenz_bild_url"),
  referenzBildPrompt: text("referenz_bild_prompt"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// Eingehende Kommentare (via Callback-Webhook) + automatisch generierte,
// markenkonforme Antworten, die über den Plattform-Webhook zurückgesendet werden.
export const influencerKommentareTable = pgTable("influencer_kommentare", {
  id: serial("id").primaryKey(),
  postingId: integer("posting_id").references(() => influencerPostingsTable.id).notNull(),
  externeKommentarId: varchar("externe_kommentar_id", { length: 256 }).notNull(),
  autorName: varchar("autor_name", { length: 128 }),
  kommentarText: text("kommentar_text").notNull(),
  antwortText: text("antwort_text"),
  antwortStatus: varchar("antwort_status", { length: 32 }).notNull().default("ausstehend"),
  antwortGesendetAm: timestamp("antwort_gesendet_am", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("influencer_kommentare_posting_externe_id_unique").on(t.postingId, t.externeKommentarId),
]);

export type InfluencerPlattform = typeof influencerPlatformenTable.$inferSelect;
export type InfluencerPosting = typeof influencerPostingsTable.$inferSelect;
export type InfluencerPersona = typeof influencerPersonasTable.$inferSelect;
export type InfluencerKommentar = typeof influencerKommentareTable.$inferSelect;
