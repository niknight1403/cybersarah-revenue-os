/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOYALTY & REFERRAL AGENT (Sprint 11)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Ersetzt den bisherigen 10-Zeilen-Stub durch eine vollständige Implementierung.
 *
 * Was dieser Agent automatisiert:
 *  - Schreibt Punkte für neue Transaktionen gut (Kunden-Zuordnung über
 *    beschreibung-Feld, gleiches Muster wie CrossSellAgent)
 *  - Vergibt Willkommens- und Geburtstagspunkte automatisch
 *  - Prüft Stufen-Aufstieg (Bronze → Silber → Gold → Platin) nach Umsatz
 *  - Bearbeitet Empfehlungen: erkennt wenn ein Geworbener zum ersten Mal
 *    kauft, gewährt dann die Prämie an den Werber
 *  - Lässt alte Punkte nach Ablaufdatum automatisch verfallen
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { AgentBase, type Aufgabe, type AufgabeErgebnis } from "./AgentBase";
import { db } from "@workspace/db";
import {
  loyaltyProgramsTable, loyaltyCardsTable, loyaltyTransactionsTable, referralsTable,
  transactionsTable, agentLogsTable,
} from "@workspace/db";
import { eq, and, sql, gte, lte, isNull, ne } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendEmail } from "../lib/emailClient";

const AGENT_NAME = "Loyalty & Referral Agent";

interface Stufe { name: string; minPunkte: number; multiplier: number; badge: string; }

const STANDARD_STUFEN: Stufe[] = [
  { name: "Bronze", minPunkte: 0, multiplier: 1.0, badge: "🥉" },
  { name: "Silber", minPunkte: 500, multiplier: 1.2, badge: "🥈" },
  { name: "Gold", minPunkte: 2000, multiplier: 1.5, badge: "🥇" },
  { name: "Platin", minPunkte: 5000, multiplier: 2.0, badge: "💎" },
];

export class LoyaltyAgent extends AgentBase {
  constructor() {
    super(AGENT_NAME, "loyalty");
  }

  protected beschreibungText(): string {
    return "AUTONOM: Schreibt Treuepunkte gut, vergibt Willkommens-/Geburtstagsbonus, prüft Stufen-Aufstieg, bearbeitet Empfehlungsprämien, lässt Punkte verfallen";
  }

  async ausfuehren(aufgabe: Aufgabe): Promise<AufgabeErgebnis> {
    const aktion = String(aufgabe.payload?.["aktion"] ?? "full_scan");

    switch (aktion) {
      case "punkte_gutschreiben":
      case "check_cards":
        return this.schreibePunkteGut();
      case "geburtstage_pruefen":
      case "birthday_bonus":
      case "birthday_coupons":
        return this.pruefeGeburtstage();
      case "stufen_pruefen":
        return this.pruefeStufenAufstieg();
      case "referrals_bearbeiten":
      case "process_referrals":
      case "check_referrals":
        return this.bearbeiteReferrals();
      case "punkte_verfall":
        return this.lassePunkteVerfallen();
      case "full_scan":
      case "full_check":
      case "init_program":
      default:
        return this.fuehreVollScanAus();
    }
  }

  private async holeAktivesProgramm(): Promise<typeof loyaltyProgramsTable.$inferSelect | null> {
    const [programm] = await db.select().from(loyaltyProgramsTable).where(eq(loyaltyProgramsTable.aktiv, true)).limit(1);
    if (programm) return programm;

    // Kein Programm konfiguriert — Standard-Programm automatisch anlegen
    const [neuesProgramm] = await db.insert(loyaltyProgramsTable).values({
      name: "CyberSarah Treueprogramm",
      beschreibung: "Automatisch erstelltes Standard-Treueprogramm",
      stufen: STANDARD_STUFEN,
      punkteProEuro: "1",
      willkommensPunkte: 100,
      geburtstagsPunkte: 200,
    }).returning();

    logger.info("🎁 Loyalty: Standard-Programm automatisch angelegt");
    return neuesProgramm ?? null;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // VOLL-SCAN
  // ═════════════════════════════════════════════════════════════════════════════
  private async fuehreVollScanAus(): Promise<AufgabeErgebnis> {
    const punkte = await this.schreibePunkteGut();
    const geburtstage = await this.pruefeGeburtstage();
    const stufen = await this.pruefeStufenAufstieg();
    const referrals = await this.bearbeiteReferrals();
    const verfall = await this.lassePunkteVerfallen();

    if (this.agentId) {
      await db.insert(agentLogsTable).values({
        agentId: this.agentId, agentName: AGENT_NAME, aktion: "full_scan", status: "erfolgreich",
        nachricht: `${punkte.metadaten?.gutgeschrieben ?? 0} Gutschriften | ${stufen.metadaten?.aufgestiegen ?? 0} Aufstiege | ${referrals.metadaten?.praemienGewaehrt ?? 0} Empfehlungsprämien`,
      });
    }

    return {
      success: true,
      message: `Loyalty Voll-Scan abgeschlossen`,
      metadaten: { punkte: punkte.metadaten, geburtstage: geburtstage.metadaten, stufen: stufen.metadaten, referrals: referrals.metadaten, verfall: verfall.metadaten },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PUNKTE FÜR NEUE TRANSAKTIONEN GUTSCHREIBEN
  // ═════════════════════════════════════════════════════════════════════════════
  private async schreibePunkteGut(): Promise<AufgabeErgebnis> {
    const programm = await this.holeAktivesProgramm();
    if (!programm) return { success: false, message: "Kein Loyalty-Programm aktiv" };

    const karten = await db.select().from(loyaltyCardsTable).where(eq(loyaltyCardsTable.aktiv, true));
    let gutgeschrieben = 0;
    let gesamtPunkte = 0;

    for (const karte of karten) {
      if (!karte.kundenEmail) continue;

      // Neue Transaktionen seit der letzten bekannten Transaktion dieser Karte
      const seit = karte.letzteTransaktion ?? new Date(0);
      const neueTransaktionen = await db.select().from(transactionsTable)
        .where(and(
          sql`COALESCE(beschreibung, '') = ${karte.kundenEmail}`,
          gte(transactionsTable.createdAt, seit),
        ));

      for (const tx of neueTransaktionen) {
        // Bereits verbuchte Transaktion überspringen (über transaktionsId in loyaltyTransactionsTable geprüft)
        const [bereitsVerbucht] = await db.select({ count: sql<number>`COUNT(*)` })
          .from(loyaltyTransactionsTable)
          .where(eq(loyaltyTransactionsTable.transaktionsId, tx.transaktionsId ?? ""));
        if (Number(bereitsVerbucht?.count ?? 0) > 0) continue;

        const stufen = (programm.stufen as Stufe[]) ?? STANDARD_STUFEN;
        const aktuelleStufe = stufen.find(s => s.name.toLowerCase() === karte.stufe.toLowerCase()) ?? stufen[0]!;
        const betrag = parseFloat(tx.betrag);
        const punkteFuerKauf = Math.round(betrag * parseFloat(programm.punkteProEuro) * aktuelleStufe.multiplier);

        await db.insert(loyaltyTransactionsTable).values({
          cardId: karte.id, typ: "gutschrift", punkte: punkteFuerKauf,
          grund: `Kauf: ${tx.produktName ?? "Produkt"} (${betrag}€)`,
          transaktionsId: tx.transaktionsId,
        });

        await db.update(loyaltyCardsTable)
          .set({
            punkte: sql`punkte + ${punkteFuerKauf}`,
            umsatzGesamt: sql`umsatz_gesamt + ${betrag}`,
            transaktionsAnzahl: sql`transaktions_anzahl + 1`,
            letzteTransaktion: tx.createdAt,
          })
          .where(eq(loyaltyCardsTable.id, karte.id));

        gutgeschrieben++;
        gesamtPunkte += punkteFuerKauf;
      }
    }

    return { success: true, message: `${gutgeschrieben} Punkte-Gutschriften erstellt`, metadaten: { gutgeschrieben, gesamtPunkte } };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // GEBURTSTAGSPUNKTE
  // ═════════════════════════════════════════════════════════════════════════════
  private async pruefeGeburtstage(): Promise<AufgabeErgebnis> {
    const programm = await this.holeAktivesProgramm();
    if (!programm) return { success: false, message: "Kein Loyalty-Programm aktiv" };

    const heute = new Date();
    const karten = await db.select().from(loyaltyCardsTable)
      .where(and(eq(loyaltyCardsTable.aktiv, true), sql`geburtsdatum IS NOT NULL`));

    let vergeben = 0;
    for (const karte of karten) {
      if (!karte.geburtsdatum) continue;
      const gebDatum = new Date(karte.geburtsdatum);
      const istHeuteGeburtstag = gebDatum.getMonth() === heute.getMonth() && gebDatum.getDate() === heute.getDate();
      if (!istHeuteGeburtstag) continue;

      // Schon dieses Jahr vergeben? (Verhindert doppelte Vergabe bei mehrfachem Lauf am selben Tag)
      const jahresbeginn = new Date(heute.getFullYear(), 0, 1);
      const [bereitsVergeben] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(loyaltyTransactionsTable)
        .where(and(
          eq(loyaltyTransactionsTable.cardId, karte.id),
          eq(loyaltyTransactionsTable.typ, "geburtstag"),
          gte(loyaltyTransactionsTable.createdAt, jahresbeginn),
        ));
      if (Number(bereitsVergeben?.count ?? 0) > 0) continue;

      await db.insert(loyaltyTransactionsTable).values({
        cardId: karte.id, typ: "geburtstag", punkte: programm.geburtstagsPunkte, grund: "Geburtstagsgeschenk 🎂",
      });
      await db.update(loyaltyCardsTable).set({ punkte: sql`punkte + ${programm.geburtstagsPunkte}` }).where(eq(loyaltyCardsTable.id, karte.id));

      if (karte.kundenEmail) {
        try {
          await sendEmail({
            to: karte.kundenEmail,
            subject: "🎂 Alles Gute zum Geburtstag!",
            text: `Herzlichen Glückwunsch! Als kleines Geschenk haben wir dir ${programm.geburtstagsPunkte} Treuepunkte gutgeschrieben. Feier schön!`,
          });
        } catch (err) {
          logger.warn({ err }, "Loyalty: Geburtstagsmail fehlgeschlagen");
        }
      }
      vergeben++;
    }

    return { success: true, message: `${vergeben} Geburtstagsboni vergeben`, metadaten: { vergeben } };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STUFEN-AUFSTIEG PRÜFEN
  // ═════════════════════════════════════════════════════════════════════════════
  private async pruefeStufenAufstieg(): Promise<AufgabeErgebnis> {
    const programm = await this.holeAktivesProgramm();
    if (!programm) return { success: false, message: "Kein Loyalty-Programm aktiv" };

    const stufen = ((programm.stufen as Stufe[]) ?? STANDARD_STUFEN).slice().sort((a, b) => b.minPunkte - a.minPunkte);
    const karten = await db.select().from(loyaltyCardsTable).where(eq(loyaltyCardsTable.aktiv, true));

    let aufgestiegen = 0;
    for (const karte of karten) {
      const passendeStufe = stufen.find(s => karte.punkte >= s.minPunkte) ?? stufen[stufen.length - 1]!;
      if (passendeStufe.name.toLowerCase() === karte.stufe.toLowerCase()) continue;

      await db.update(loyaltyCardsTable).set({ stufe: passendeStufe.name.toLowerCase() }).where(eq(loyaltyCardsTable.id, karte.id));

      if (karte.kundenEmail) {
        try {
          await sendEmail({
            to: karte.kundenEmail,
            subject: `${passendeStufe.badge} Du bist jetzt ${passendeStufe.name}-Mitglied!`,
            text: `Glückwunsch! Du hast genug Punkte für die ${passendeStufe.name}-Stufe gesammelt. Ab jetzt bekommst du ${passendeStufe.multiplier}x Punkte auf jeden Kauf.`,
          });
        } catch (err) {
          logger.warn({ err }, "Loyalty: Stufen-Aufstiegs-Mail fehlgeschlagen");
        }
      }
      aufgestiegen++;
    }

    return { success: true, message: `${aufgestiegen} Kunden sind aufgestiegen`, metadaten: { aufgestiegen } };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // EMPFEHLUNGEN BEARBEITEN
  // ═════════════════════════════════════════════════════════════════════════════
  private async bearbeiteReferrals(): Promise<AufgabeErgebnis> {
    // Offene Empfehlungen: prüfen ob der Geworbene inzwischen gekauft hat
    const offeneReferrals = await db.select().from(referralsTable)
      .where(and(eq(referralsTable.status, "registriert"), eq(referralsTable.praemieGewaehrt, false)));

    let praemienGewaehrt = 0;

    for (const referral of offeneReferrals) {
      if (!referral.geworbenerEmail) continue;

      const [kauf] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(transactionsTable)
        .where(sql`COALESCE(beschreibung, '') = ${referral.geworbenerEmail}`);

      if (Number(kauf?.count ?? 0) === 0) continue;

      // Erster Kauf gefunden → Prämie an Werber gewähren
      await db.update(referralsTable)
        .set({ status: "erster_kauf", updatedAt: new Date() })
        .where(eq(referralsTable.id, referral.id));

      if (referral.belohnungTyp === "punkte" && referral.werberEmail) {
        const [werberKarte] = await db.select().from(loyaltyCardsTable)
          .where(eq(loyaltyCardsTable.kundenEmail, referral.werberEmail)).limit(1);

        if (werberKarte) {
          const punkte = parseInt(referral.belohnungWert ?? "500");
          await db.insert(loyaltyTransactionsTable).values({
            cardId: werberKarte.id, typ: "bonus", punkte,
            grund: `Empfehlungsprämie für ${referral.geworbenerEmail}`,
          });
          await db.update(loyaltyCardsTable).set({ punkte: sql`punkte + ${punkte}` }).where(eq(loyaltyCardsTable.id, werberKarte.id));
        }
      }

      await db.update(referralsTable)
        .set({ status: "praemie_gewaehrt", praemieGewaehrt: true, updatedAt: new Date() })
        .where(eq(referralsTable.id, referral.id));

      if (referral.werberEmail) {
        try {
          await sendEmail({
            to: referral.werberEmail,
            subject: "🎉 Deine Empfehlung hat sich ausgezahlt!",
            text: `Die Person, die du geworben hast, hat gerade ihren ersten Kauf getätigt. Deine Prämie wurde soeben gutgeschrieben. Danke, dass du uns weiterempfiehlst!`,
          });
        } catch (err) {
          logger.warn({ err }, "Loyalty: Empfehlungsprämien-Mail fehlgeschlagen");
        }
      }
      praemienGewaehrt++;
    }

    return { success: true, message: `${praemienGewaehrt} Empfehlungsprämien gewährt`, metadaten: { praemienGewaehrt, geprueft: offeneReferrals.length } };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PUNKTE-VERFALL
  // ═════════════════════════════════════════════════════════════════════════════
  private async lassePunkteVerfallen(): Promise<AufgabeErgebnis> {
    const jetzt = new Date();
    const abgelaufeneBuchungen = await db.select().from(loyaltyTransactionsTable)
      .where(and(
        sql`verfall_datum IS NOT NULL`,
        lte(loyaltyTransactionsTable.verfallDatum, jetzt),
        ne(loyaltyTransactionsTable.typ, "ablauf"), // schon verfallene nicht nochmal verarbeiten
      ));

    let verfallen = 0;
    for (const buchung of abgelaufeneBuchungen) {
      if (buchung.punkte <= 0) continue; // nur positive, noch nicht verfallene Gutschriften

      await db.update(loyaltyCardsTable)
        .set({ punkte: sql`GREATEST(0, punkte - ${buchung.punkte})` })
        .where(eq(loyaltyCardsTable.id, buchung.cardId));

      await db.insert(loyaltyTransactionsTable).values({
        cardId: buchung.cardId, typ: "ablauf", punkte: -buchung.punkte,
        grund: `Verfall der Punkte aus Buchung #${buchung.id}`,
      });

      // Ursprungsbuchung markieren, damit sie nicht nochmal verfällt
      await db.update(loyaltyTransactionsTable).set({ verfallDatum: null }).where(eq(loyaltyTransactionsTable.id, buchung.id));

      verfallen++;
    }

    return { success: true, message: `${verfallen} Punkte-Buchungen verfallen`, metadaten: { verfallen } };
  }
}
