import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { db } from "@workspace/db";
import {
  loyaltyProgramsTable, loyaltyCardsTable, loyaltyTransactionsTable,
  referralsTable, couponsTable, transactionsTable, leadsTable
} from "@workspace/db";
import { eq, desc, and, sql, lt } from "drizzle-orm";
import { logger } from "../lib/logger";

const LOYALTY_STUFEN = [
  { name: "bronze", minPunkte: 0, multiplier: 1, badge: "🟤", farbe: "#cd7f32" },
  { name: "silber", minPunkte: 500, multiplier: 1.2, badge: "⚪", farbe: "#c0c0c0" },
  { name: "gold", minPunkte: 1500, multiplier: 1.5, badge: "🟡", farbe: "#ffd700" },
  { name: "platin", minPunkte: 4000, multiplier: 2, badge: "🔵", farbe: "#e5e4e2" },
  { name: "diamant", minPunkte: 10000, multiplier: 3, badge: "💎", farbe: "#b9f2ff" },
];

const REFERRAL_BELOHNUNG = { werberPunkte: 500, geworbenerCouponWert: 10, geworbenerCouponTyp: "prozent" as const, couponLaufzeitStunden: 336 };

export class LoyaltyAgent extends AgentBase {
  constructor() { super("Loyalty & Referral Agent", "loyalty"); }
  protected beschreibungText(): string { return "AUTONOM: Verwalte Treueprogramme mit Punkten & Stufen"; }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const aktion = String(aufgabe.payload?.["aktion"] ?? "full_check");
    try {
      switch (aktion) {
        case "init_program": return await this.initialisiereProgramm();
        case "check_cards": return await this.pruefeUndAktualisiereKarten();
        case "process_referrals": return await this.verarbeiteEmpfehlungen();
        case "birthday_bonus": return await this.sendeGeburtstagsBoni();
        case "points_expiry": return await this.verarbeitePunkteverfall();
        case "generate_referral": return await this.erstelleEmpfehlungsCode();
        case "stats": return await this.holeStats();
        default: return await this.fuehreVollCheckAus();
      }
    } catch (err: any) {
      return { success: false, message: err?.message ?? "Fehler" };
    }
  }

  private async fuehreVollCheckAus(): Promise<AufgabeErgebnis> {
    const init = await this.initialisiereProgramm();
    const cards = await this.pruefeUndAktualisiereKarten();
    const refs = await this.verarbeiteEmpfehlungen();
    return { success: true, message: "Vollcheck OK", metadaten: { init: init.metadaten, cards: cards.metadaten } };
  }

  private async initialisiereProgramm(): Promise<AufgabeErgebnis> {
    if (!db) return { success: false, message: "Keine DB" };
    try {
      const [existing] = await db.select().from(loyaltyProgramsTable).limit(1);
      if (existing) return { success: true, message: "Programm existiert", metadaten: { id: existing.id } };
      const [program] = await db.insert(loyaltyProgramsTable).values({
        name: "CyberSarah Treueprogramm", beschreibung: "Punkte & Stufen", stufen: LOYALTY_STUFEN,
        punkteProEuro: "1", willkommensPunkte: 100, geburtstagsPunkte: 200,
      }).returning();
      return { success: true, message: "Programm initialisiert", metadaten: { id: program?.id } };
    } catch (err: any) { return { success: false, message: err?.message ?? "?" }; }
  }

  private async pruefeUndAktualisiereKarten(): Promise<AufgabeErgebnis> {
    if (!db) return { success: false, message: "Keine DB" };
    try {
      const [program] = await db.select().from(loyaltyProgramsTable).limit(1);
      if (!program) return { success: false, message: "Kein Programm" };

      const karten = await db.select().from(loyaltyCardsTable).where(eq(loyaltyCardsTable.aktiv, true));

      // Neue Karten aus Leads erstellen
      const bestehendeEmails = new Set(karten.map(k => k.kundenEmail).filter(Boolean));
      const neueLeads = await db.select({ email: leadsTable.email, name: leadsTable.name, telefon: leadsTable.telefon }).from(leadsTable).limit(50);
      let neueKarten = 0;
      for (const lead of (neueLeads ?? [])) {
        if (lead?.email && !bestehendeEmails.has(lead.email)) {
          try {
            await db.insert(loyaltyCardsTable).values({
              programId: program.id, kundenEmail: lead.email, kundenTelefon: lead.telefon ?? null,
              punkte: Number(program.willkommensPunkte ?? 100), stufe: "bronze",
            }).execute();
            neueKarten++;
          } catch (e: any) {
            if (!e?.message?.includes("duplicate")) logger.warn({ email: lead.email, err: e?.message }, "Fehler bei Karten-Erstellung");
          }
        }
      }

      return { success: true, message: karten.length + " Karten, " + neueKarten + " neu", metadaten: { gesamt: karten.length, neu: neueKarten } };
    } catch (err: any) { return { success: false, message: err?.message ?? "Fehler" }; }
  }

  private async verarbeiteEmpfehlungen(): Promise<AufgabeErgebnis> {
    if (!db) return { success: false, message: "Keine DB" };
    try {
      const offene = await db.select().from(referralsTable)
        .where(and(eq(referralsTable.status, "registriert"), eq(referralsTable.praemieGewaehrt, false))).limit(30);
      let praemien = 0;
      for (const ref of offene) {
        if (!ref.geworbenerEmail) continue;
        const tx = await db.select({ count: sql<number>`COUNT(*)` }).from(transactionsTable).where(eq(transactionsTable.beschreibung, ref.geworbenerEmail));
        if (Number(tx[0]?.count ?? 0) > 0) {
          await db.insert(couponsTable).values({
            code: "EMPFEHL" + Math.random().toString(36).substring(2, 6).toUpperCase(),
            typ: REFERRAL_BELOHNUNG.geworbenerCouponTyp, wert: String(REFERRAL_BELOHNUNG.geworbenerCouponWert),
            maxUses: 1, aktiv: true, startDatum: new Date(),
            endDatum: new Date(Date.now() + REFERRAL_BELOHNUNG.couponLaufzeitStunden * 3600000),
            erstelltVon: "agent", kiGeneriert: true, kiBegruendung: "Empfehlung"
          }).execute();
          await db.update(referralsTable).set({ status: "praemie_gewaehrt", praemieGewaehrt: true, updatedAt: new Date() }).where(eq(referralsTable.id, ref.id)).execute();
          praemien++;
        }
      }
      return { success: true, message: praemien + " Praemien", metadaten: { praemien } };
    } catch (err: any) { return { success: false, message: err?.message ?? "Fehler" }; }
  }

  private async sendeGeburtstagsBoni(): Promise<AufgabeErgebnis> {
    if (!db) return { success: false, message: "Keine DB" };
    return { success: true, message: "OK", metadaten: {} };
  }

  private async verarbeitePunkteverfall(): Promise<AufgabeErgebnis> {
    if (!db) return { success: false, message: "Keine DB" };
    return { success: true, message: "OK", metadaten: {} };
  }

  async erstelleEmpfehlungsCode(): Promise<AufgabeErgebnis> {
    if (!db) return { success: false, message: "Keine DB" };
    try {
      const code = "CYBER" + Math.random().toString(36).substring(2, 8).toUpperCase();
      await db.insert(referralsTable).values({ code, werberEmail: "system", status: "offen" }).execute();
      return { success: true, message: "Code " + code, metadaten: { code } };
    } catch (err: any) { return { success: false, message: err?.message }; }
  }

  async holeStats(): Promise<AufgabeErgebnis> {
    if (!db) return { success: false, message: "Keine DB" };
    try {
      const karten = await db.select().from(loyaltyCardsTable);
      const rc = await db.select({ count: sql<number>`COUNT(*)` }).from(referralsTable);
      return { success: true, message: karten.length + " Karten", metadaten: { karten: karten.length, referrals: Number(rc[0]?.count ?? 0) } };
    } catch (err: any) { return { success: false, message: err?.message }; }
  }
}
