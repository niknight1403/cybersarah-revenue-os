import { pgTable, serial, varchar, text, timestamp, numeric, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VOICE-AGENT-SERVICE — KI-Telefonassistent als Produkt
 * ═══════════════════════════════════════════════════════════════════════════════
 * Providerunabhängig gebaut: Egal ob Vapi, Synthflow, Twilio+ElevenLabs oder ein
 * anderer Voice-AI-Anbieter dahintersteckt — dieses System speichert Kunden,
 * empfängt Anruf-Ereignisse per Webhook (Standard bei allen gängigen Anbietern)
 * und kümmert sich um Abrechnung, Reporting und Lead-Erkennung.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─── KUNDEN: Wer hat einen Voice-Agent gebucht ───────────────────────────────
export const voiceAgentClientsTable = pgTable("voice_agent_clients", {
  id: serial("id").primaryKey(),
  firma: varchar("firma", { length: 255 }).notNull(),
  ansprechpartner: varchar("ansprechpartner", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  telefon: varchar("telefon", { length: 32 }),
  branche: varchar("branche", { length: 128 }),
  paket: varchar("paket", { length: 32 }).notNull().default("starter"),
  // "starter" (85€, 200 Min) | "business" (149€, 500 Min) | "scale" (299€, unbegrenzt)
  monatlicherPreis: numeric("monatlicher_preis", { precision: 10, scale: 2 }).notNull(),
  inkludierteMinuten: integer("inkludierte_minuten").notNull().default(200),
  verbrauchteMinutenDiesenMonat: numeric("verbrauchte_minuten_diesen_monat", { precision: 10, scale: 2 }).notNull().default("0"),
  minutenPreisUeberschreitung: numeric("minuten_preis_ueberschreitung", { precision: 6, scale: 3 }).notNull().default("0.15"),
  telefonnummer: varchar("telefonnummer", { length: 32 }), // die vom Provider zugewiesene Nummer
  providerAgentId: varchar("provider_agent_id", { length: 255 }), // ID beim Voice-AI-Anbieter
  status: varchar("status", { length: 32 }).notNull().default("onboarding"),
  // "onboarding" | "aktiv" | "pausiert" | "gekuendigt"
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  systemPrompt: text("system_prompt"), // wie der Voice-Agent sich verhalten soll (Begrüßung, Ziel, Ton)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ─── ANRUFE: Jeder einzelne Anruf-Datensatz ──────────────────────────────────
export const voiceAgentCallsTable = pgTable("voice_agent_calls", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => voiceAgentClientsTable.id).notNull(),
  anruferNummer: varchar("anrufer_nummer", { length: 32 }),
  richtung: varchar("richtung", { length: 16 }).notNull().default("eingehend"), // "eingehend" | "ausgehend"
  dauerSekunden: integer("dauer_sekunden").notNull().default(0),
  transkript: text("transkript"),
  ergebnis: varchar("ergebnis", { length: 64 }),
  // "termin_gebucht" | "info_gegeben" | "weitergeleitet" | "lead_qualifiziert" | "sonstiges"
  zusammenfassung: text("zusammenfassung"), // KI-generierte Kurzfassung
  hoheDringlichkeit: boolean("hohe_dringlichkeit").notNull().default(false),
  providerCallId: varchar("provider_call_id", { length: 255 }),
  rohdaten: jsonb("rohdaten"), // komplettes Webhook-Payload, für Debugging/Nachvollziehbarkeit
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVoiceAgentClientSchema = createInsertSchema(voiceAgentClientsTable)
  .omit({ id: true, createdAt: true, updatedAt: true, verbrauchteMinutenDiesenMonat: true, status: true, stripeSubscriptionId: true, providerAgentId: true });

export type InsertVoiceAgentClient = z.infer<typeof insertVoiceAgentClientSchema>;
export type VoiceAgentClient = typeof voiceAgentClientsTable.$inferSelect;
export type VoiceAgentCall = typeof voiceAgentCallsTable.$inferSelect;
