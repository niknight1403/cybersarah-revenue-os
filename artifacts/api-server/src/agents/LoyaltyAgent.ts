/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOYALTY & REFERRAL AGENT (Sprint 4.2)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Kundenbindungssystem mit:
 *  - Treuepunkten & Stufen (Bronze → Silber → Gold → Platin → Diamant)
 *  - Automatische Punktgutschrift bei Transaktionen
 *  - Willkommens- & Geburtstagsboni
 *  - Empfehlungsmarketing mit personalisierten Referral-Links
 *  - Automatische Prämien bei erfolgreichen Empfehlungen
 *  - Punkteverfall bei Inaktivität (nach 12 Monaten)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { db } from "@workspace/db";
import {
  loyaltyProgramsTable, loyaltyCardsTable, loyaltyTransactionsTable,
  referralsTable, couponsTable, transactionsTable, leadsTable, agentLogsTable
} from "@workspace/db";
import { eq, desc, gte, and, sql, lt, or } from "drizzle-orm";
import { logger } from "../lib/logger";
import { openai, openaiVerfuegbar } from "../lib/openaiClient";

const LOYALTY_STUFEN = [
  { name: "bronze", minPunkte: 0, multiplier: 1, badge: "🟤", farbe: "#cd7f32" },
  { name: "silber", minPunkte: 500, multiplier: 1.2, badge: "⚪", farbe: "#c0c0c0" },
  { name: "gold", minPunkte: 1500, multiplier: 1.5, badge: "🟡", farbe: "#ffd700" },
  { name: "platin", minPunkte: 4000, multiplier: 2, badge: "🔵", farbe: "#e5e4e2" },
  { name: "diamant", minPunkte: 10000, multiplier: 3, badge: "💎", farbe: "#b9f2ff" },
];

const REFERRAL_BELOHNUNG = {
  werberPunkte: 500,
  geworbenerCouponWert: 10,
  geworbenerCouponTyp: "prozent" as const,
  couponLaufzeitStunden: 336, // 14 Tage
};

export class LoyaltyAgent extends AgentBase {
  constructor() {
    super("Loyalty & Referral Agent", "loyalty");
  }

  protected beschreibungText(): string {
    return "AUTONOM: Verwalte Treueprogramme mit Punkten & Stufen, automatische Gutschriften, Geburtstagsboni, Empfehlungsmarketing mit Prämien";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const aktion = String(aufgabe.payload?.["aktion"] ?? "full_check");

    switch (aktion) {
      case "init_program":
        return this.initialisiereProgramm();
      case "check_cards":
        return this.pruefeUndAktualisiereKarten();
      case "process_referrals":
        return this.verarbeiteEmpfehlungen();
      case "birthday_bonus":
        return this.sendeGeburtstagsBoni();
      case "points_expiry":
        return this.verarbeitePunkteverfall();
      case "generate_referral":
        return this.erstelleEmpfehlungsCode();
      case "stats":
        return this.holeStats();
      default:
        return this.fuehreVollCheckAus();
    }
  }

  private async fuehreVollCheckAus(): Promise<AufgabeErgebnis> {
    const initResult = await this.initialisiereProgramm();
    const cardsResult = await this.pruefeUndAktualisiereKarten();
    const referralResult = await this.verarbeiteEmpfehlungen();
    const birthdayResult = await this.sendeGeburtstagsBoni();
    const expiryResult = await this.verarbeitePunkteverfall();

    return {
      success: true,
      message: `Loyalty-Check: ${initResult.metadaten?.program ?? "OK"} | ${cardsResult.metadaten?.aktualisiert ?? 0} Karten | ${referralResult.metadaten?.praemien ?? 0} Prämien`,
      metadaten: { init: initResult.metadaten, cards: cardsResult.metadaten, referrals: referralResult.metadaten },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PROGRAMM INITIALISIEREN
  // ═════════════════════════════════════════════════════════════════════════════
  private async initialisiereProgramm(): Promise<AufgabeErgebnis> {
    const [existing] = await db.select({ id: loyaltyProgramsTable.id }).from(loyaltyProgramsTable).limit(1);
    if (existing) {
      return { success: true, message: "Programm existiert bereits", metadaten: { program: "bereits_init" } };
    }

    await db.insert(loyaltyProgramsTable).values({
      name: "CyberSarah Treueprogramm",
      beschreibung: "Sammle Punkte bei jedem Einkauf, steige in höhere Stufen auf und erhalte exklusive Vorteile!",
      stufen: JSON.stringify(LOYALTY_STUFEN.map(s => ({ name: s.name, minPunkte: s.minPunkte, multiplier: s.multiplier, badge: s.badge }))),
      punkteProEuro: "1",
      willkommensPunkte: 100,
      geburtstagsPunkte: 200,
      aktiv: true,
    });

    logger.info("🎯 Treueprogramm initialisiert: 5 Stufen (Bronze→Diamant), 1 Punkt/€, 100 Willkommens-Punkte");

    return {
      success: true,
      message: "Treueprogramm initialisiert — 5 Stufen, 1 Punkt/€, 100 Willkommens-Punkte",
      metadaten: { program: "erstellt" },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // KARTEN PRÜFEN & AKTUALISIEREN
  // ═════════════════════════════════════════════════════════════════════════════
  private async pruefeUndAktualisiereKarten(): Promise<AufgabeErgebnis> {
    const [program] = await db.select().from(loyaltyProgramsTable).limit(1);
    if (!program) return { success: false, message: "Kein Programm aktiv" };

    const stufen = (program.stufen as any[]) ?? LOYALTY_STUFEN;

    // Neue Kunden aus leads + transactions finden
    const kundenEmails = await db
      .select({ email: transactionsTable.beschreibung })
      .from(transactionsTable)
      .where(sql`${transactionsTable.beschreibung} IS NOT NULL AND ${transactionsTable.beschreibung} != ''`)
      .limit(100);

    // Bestehende Karten mit Umsatz aktualisieren
    const karten = await db.select().from(loyaltyCardsTable).where(eq(loyaltyCardsTable.aktiv, true));

    let aktualisiert = 0;
    let neueKarten = 0;

    for (const karte of karten) {
      // Umsatz aus transactions berechnen
      let bedingung;
      if (karte.kundenEmail) {
        bedingung = eq(transactionsTable.beschreibung, karte.kundenEmail);
      } else continue;

      const umsatzResult = await db
        .select({
          summe: sql<number>`COALESCE(SUM(betrag::numeric), 0)`,
          anzahl: sql<number>`COUNT(*)`,
        })
        .from(transactionsTable)
        .where(bedingung);

      const umsatz = Number(umsatzResult[0]?.summe ?? 0);
      const anzahl = Number(umsatzResult[0]?.anzahl ?? 0);

      // Punkte gutschreiben (1 Punkt pro €)
      const neuePunkte = Math.floor(umsatz * Number(program.punkteProEuro));
      const neueStufe = this.berechneStufe(neuePunkte, stufen);

      if (karte.punkte !== neuePunkte || karte.stufe !== neueStufe || karte.transaktionsAnzahl !== anzahl) {
        await db.update(loyaltyCardsTable)
          .set({
            punkte: neuePunkte,
            umsatzGesamt: String(umsatz),
            transaktionsAnzahl: anzahl,
            stufe: neueStufe,
            letzteTransaktion: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(loyaltyCardsTable.id, karte.id));
        aktualisiert++;

        // Stufen-Aufstieg loggen
        if (karte.stufe !== neueStufe) {
          logger.info({ email: karte.kundenEmail, alt: karte.stufe, neu: neueStufe }, "⭐ Kunden-Stufen-Aufstieg!");
          await db.insert(loyaltyTransactionsTable).values({
            cardId: karte.id,
            typ: "bonus",
            punkte: neuePunkte - karte.punkte,
            grund: `Stufen-Aufstieg: ${karte.stufe} → ${neueStufe}`,
          });
        }
      }
    }

    // Willkommens-Punkte für neue Kunden
    const alleKartenEmails = new Set(karten.map(k => k.kundenEmail).filter(Boolean));

    // Aus Lead-Tabelle neue potenzielle Kunden holen
    const neueLeads = await db
      .select({ email: leadsTable.email, name: leadsTable.name, telefon: leadsTable.telefon })
      .from(leadsTable)
      .limit(50);

    for (const lead of neueLeads) {
      if (lead.email && !alleKartenEmails.has(lead.email)) {
        const [card] = await db.insert(loyaltyCardsTable).values({
          programId: program.id,
          kundenEmail: lead.email,
          kundenTelefon: lead.telefon ?? null,
          punkte: program.willkommensPunkte,
          stufe: "bronze",
        }).returning();

        if (card) {
          neueKarten++;
          await db.insert(loyaltyTransactionsTable).values({
            cardId: card.id,
            typ: "willkommen",
            punkte: program.willkommensPunkte,
            grund: `Willkommens-Bonus: ${program.willkommensPunkte} Punkte`,
          });
        }
      }
    }

    return {
      success: true,
      message: `${karten.length} Karten geprüft, ${aktualisiert} aktualisiert, ${neueKarten} neue Karten`,
      metadaten: { geprueft: karten.length, aktualisiert, neueKarten },
    };
  }

  private berechneStufe(punkte: number, stufen: any[]): string {
    let stufe = "bronze";
    for (const s of [...stufen].sort((a, b) => b.minPunkte - a.minPunkte)) {
      if (punkte >= s.minPunkte) {
        stufe = s.name;
        break;
      }
    }
    return stufe;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // EMPFEHLUNGEN VERARBEITEN
  // ═════════════════════════════════════════════════════════════════════════════
  private async verarbeiteEmpfehlungen(): Promise<AufgabeErgebnis> {
    // Offene Empfehlungen prüfen, wo der Geworbene bereits gekauft hat
    const offene = await db
      .select()
      .from(referralsTable)
      .where(
        and(
          eq(referralsTable.status, "registriert"),
          eq(referralsTable.praemieGewaehrt, false),
        ),
      )
      .limit(30);

    let praemien = 0;

    for (const ref of offene) {
      // Prüfen ob der Geworbene bereits eine Transaktion hat
      const transaktionen = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(transactionsTable)
        .where(
          or(
            ref.geworbenerEmail ? eq(transactionsTable.beschreibung, ref.geworbenerEmail) : sql`1=0`,
          ),
        );

      if (Number(transaktionen[0]?.count ?? 0) > 0) {
        // Prämie gewähren
        const code = `EMPFEHL${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const endDatum = new Date(Date.now() + REFERRAL_BELOHNUNG.couponLaufzeitStunden * 60 * 60 * 1000);

        const [coupon] = await db.insert(couponsTable).values({
          code,
          typ: REFERRAL_BELOHNUNG.geworbenerCouponTyp,
          wert: String(REFERRAL_BELOHNUNG.geworbenerCouponWert),
          maxUses: 1,
          aktiv: true,
          startDatum: new Date(),
          endDatum,
          erstelltVon: "agent",
          kiGeneriert: true,
          kiBegruendung: `Empfehlungs-Prämie für ${ref.geworbenerEmail}`,
        }).returning({ id: couponsTable.id });

        // Punkte für Werber
        if (ref.werberEmail) {
          const [card] = await db
            .select({ id: loyaltyCardsTable.id })
            .from(loyaltyCardsTable)
            .where(eq(loyaltyCardsTable.kundenEmail, ref.werberEmail))
            .limit(1);

          if (card) {
            await db.update(loyaltyCardsTable)
              .set({ punkte: sql`${loyaltyCardsTable.punkte} + ${REFERRAL_BELOHNUNG.werberPunkte}`, updatedAt: new Date() })
              .where(eq(loyaltyCardsTable.id, card.id));

            await db.insert(loyaltyTransactionsTable).values({
              cardId: card.id,
              typ: "bonus",
              punkte: REFERRAL_BELOHNUNG.werberPunkte,
              grund: `Empfehlungs-Prämie: ${ref.geworbenerEmail} hat eingekauft`,
            });
          }
        }

        await db.update(referralsTable)
          .set({
            status: "praemie_gewaehrt",
            belohnungTyp: "coupon",
            belohnungWert: `${REFERRAL_BELOHNUNG.geworbenerCouponWert}%`,
            couponId: coupon?.id ?? null,
            praemieGewaehrt: true,
            updatedAt: new Date(),
          })
          .where(eq(referralsTable.id, ref.id));

        praemien++;
        logger.info({ werber: ref.werberEmail, geworbener: ref.geworbenerEmail }, "🎉 Empfehlungs-Prämie gewährt!");
      }
    }

    return {
      success: true,
      message: `${praemien} neue Empfehlungs-Prämien gewährt`,
      metadaten: { offene: offene.length, praemien },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // GEBURTSTAGS-BONI
  // ═════════════════════════════════════════════════════════════════════════════
  private async sendeGeburtstagsBoni(): Promise<AufgabeErgebnis> {
    const [program] = await db.select({ geburtstagsPunkte: loyaltyProgramsTable.geburtstagsPunkte }).from(loyaltyProgramsTable).limit(1);
    if (!program) return { success: false, message: "Kein Programm" };

    // Kunden mit Geburtstag heute
    const heute = new Date();
    const heuteStr = `${heute.getMonth() + 1}-${heute.getDate()}`;

    const karten = await db
      .select()
      .from(loyaltyCardsTable)
      .where(
        and(
          eq(loyaltyCardsTable.aktiv, true),
          sql`TO_CHAR(${loyaltyCardsTable.geburtsdatum}, 'MM-DD') = ${heuteStr}`,
        ),
      )
      .limit(50);

    let boni = 0;
    for (const karte of karten) {
      // Prüfen ob bereits Geburtstagsbonus in diesem Jahr
      const jahresAnfang = new Date(heute.getFullYear(), 0, 1);
      const [existing] = await db.select({ id: loyaltyTransactionsTable.id })
        .from(loyaltyTransactionsTable)
        .where(
          and(
            eq(loyaltyTransactionsTable.cardId, karte.id),
            eq(loyaltyTransactionsTable.typ, "geburtstag"),
            gte(loyaltyTransactionsTable.createdAt, jahresAnfang),
          ),
        );

      if (existing) continue;

      await db.update(loyaltyCardsTable)
        .set({ punkte: sql`${loyaltyCardsTable.punkte} + ${program.geburtstagsPunkte}`, updatedAt: new Date() })
        .where(eq(loyaltyCardsTable.id, karte.id));

      await db.insert(loyaltyTransactionsTable).values({
        cardId: karte.id,
        typ: "geburtstag",
        punkte: program.geburtstagsPunkte,
        grund: `🎂 Geburtstags-Bonus: ${program.geburtstagsPunkte} Punkte`,
      });
      boni++;
    }

    return {
      success: true,
      message: `${boni} Geburtstags-Boni versendet`,
      metadaten: { heuteKarten: karten.length, boni },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PUNKTEVERFALL (nach 12 Monaten Inaktivität)
  // ═════════════════════════════════════════════════════════════════════════════
  private async verarbeitePunkteverfall(): Promise<AufgabeErgebnis> {
    const vor12Monaten = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const inaktiveKarten = await db
      .select()
      .from(loyaltyCardsTable)
      .where(
        and(
          eq(loyaltyCardsTable.aktiv, true),
          lt(loyaltyCardsTable.letzteTransaktion, vor12Monaten),
        ),
      )
      .limit(50);

    let verfallen = 0;
    for (const karte of inaktiveKarten) {
      if (karte.punkte > 0) {
        await db.insert(loyaltyTransactionsTable).values({
          cardId: karte.id,
          typ: "ablauf",
          punkte: -karte.punkte,
          grund: "Punkteverfall nach 12 Monaten Inaktivität",
        });

        await db.update(loyaltyCardsTable)
          .set({ punkte: 0, updatedAt: new Date() })
          .where(eq(loyaltyCardsTable.id, karte.id));
        verfallen++;
      }
    }

    return {
      success: true,
      message: `${verfallen} Karten mit Punkteverfall`,
      metadaten: { inaktiv: inaktiveKarten.length, verfallen },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // EMPFEHLUNGSCODE ERSTELLEN
  // ═════════════════════════════════════════════════════════════════════════════
  async erstelleEmpfehlungsCode(): Promise<AufgabeErgebnis> {
    const email = this.agentId ? `agent_${this.agentId}` : "system";
    const code = `CYBER${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    await db.insert(referralsTable).values({
      code,
      werberEmail: email,
      status: "offen",
    });

    return {
      success: true,
      message: `Empfehlungs-Code ${code} erstellt`,
      metadaten: { code },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STATISTIK
  // ═════════════════════════════════════════════════════════════════════════════
  async holeStats(): Promise<AufgabeErgebnis> {
    const [program] = await db.select().from(loyaltyProgramsTable).limit(1);
    const karten = await db.select().from(loyaltyCardsTable);

    const stufen: Record<string, number> = {};
    for (const k of karten) {
      stufen[k.stufe] = (stufen[k.stufe] ?? 0) + 1;
    }

    const referralCount = await db.select({ count: sql<number>`COUNT(*)` }).from(referralsTable);
    const praemienCount = await db.select({ count: sql<number>`COUNT(*)` }).from(referralsTable).where(eq(referralsTable.praemieGewaehrt, true));
    const punkteSumme = karten.reduce((s, k) => s + k.punkte, 0);

    return {
      success: true,
      message: `Treueprogramm: ${karten.length} Karten, ${punkteSumme} aktive Punkte`,
      metadaten: {
        programAktiv: !!program,
        punkteSumme,
        kartenAnzahl: karten.length,
        stufenVerteilung: stufen,
        referralsGesamt: Number(referralCount[0]?.count ?? 0),
        praemienGewaehrt: Number(praemienCount[0]?.count ?? 0),
      },
    };
  }
}
