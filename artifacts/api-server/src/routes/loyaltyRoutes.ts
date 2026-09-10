/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOYALTY & REFERRAL API
 * ═══════════════════════════════════════════════════════════════════════════════
 * Alle Routen hier sind authentifiziert (Dashboard-Verwaltung). Falls du später
 * eine öffentliche "Karte anlegen"-Seite für Kunden selbst bauen willst
 * (Self-Service-Anmeldung), braucht POST /loyalty/cards dieselbe Behandlung
 * wie bei den B2B-/Voice-Agent-Formularen (Honeypot + apiAuth-Ausnahme).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { loyaltyProgramsTable, loyaltyCardsTable, loyaltyTransactionsTable, referralsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

const router = Router();

router.get("/loyalty/program", async (_req, res) => {
  const [programm] = await db.select().from(loyaltyProgramsTable).where(eq(loyaltyProgramsTable.aktiv, true)).limit(1);
  res.json({ programm: programm ?? null });
});

router.get("/loyalty/cards", async (_req, res) => {
  const cards = await db.select().from(loyaltyCardsTable).orderBy(desc(loyaltyCardsTable.punkte)).limit(100);
  res.json({ cards, anzahl: cards.length });
});

router.post("/loyalty/cards", async (req, res) => {
  const { kundenEmail, kundenTelefon, geburtsdatum } = req.body as {
    kundenEmail?: string; kundenTelefon?: string; geburtsdatum?: string;
  };

  if (!kundenEmail && !kundenTelefon) {
    res.status(400).json({ error: "kundenEmail oder kundenTelefon erforderlich" });
    return;
  }

  const [programm] = await db.select().from(loyaltyProgramsTable).where(eq(loyaltyProgramsTable.aktiv, true)).limit(1);

  const [card] = await db.insert(loyaltyCardsTable).values({
    programId: programm?.id ?? 1,
    kundenEmail: kundenEmail ?? null,
    kundenTelefon: kundenTelefon ?? null,
    geburtsdatum: geburtsdatum ? new Date(geburtsdatum) : null,
    punkte: programm?.willkommensPunkte ?? 100,
  }).returning();

  if (card && programm) {
    await db.insert(loyaltyTransactionsTable).values({
      cardId: card.id, typ: "willkommen", punkte: programm.willkommensPunkte, grund: "Willkommensbonus",
    });
  }

  res.json({ erfolg: true, card });
});

router.get("/loyalty/cards/:id/transactions", async (req, res) => {
  const cardId = parseInt(req.params.id);
  const transactions = await db.select().from(loyaltyTransactionsTable)
    .where(eq(loyaltyTransactionsTable.cardId, cardId))
    .orderBy(desc(loyaltyTransactionsTable.createdAt))
    .limit(50);
  res.json({ transactions, anzahl: transactions.length });
});

router.get("/loyalty/referrals", async (_req, res) => {
  const referrals = await db.select().from(referralsTable).orderBy(desc(referralsTable.createdAt)).limit(100);
  res.json({ referrals, anzahl: referrals.length });
});

router.post("/loyalty/referrals", async (req, res) => {
  const { werberEmail, belohnungTyp, belohnungWert } = req.body as {
    werberEmail: string; belohnungTyp?: string; belohnungWert?: string;
  };

  if (!werberEmail) {
    res.status(400).json({ error: "werberEmail erforderlich" });
    return;
  }

  const code = randomBytes(4).toString("hex").toUpperCase();

  const [referral] = await db.insert(referralsTable).values({
    code, werberEmail,
    belohnungTyp: belohnungTyp ?? "punkte",
    belohnungWert: belohnungWert ?? "500",
  }).returning();

  res.json({ erfolg: true, referral, empfehlungsLink: `https://cybersarah-ki.de/willkommen?ref=${code}` });
});

router.get("/loyalty/stats", async (_req, res) => {
  const cards = await db.select().from(loyaltyCardsTable);
  const referrals = await db.select().from(referralsTable);

  const stufenVerteilung: Record<string, number> = {};
  for (const c of cards) stufenVerteilung[c.stufe] = (stufenVerteilung[c.stufe] ?? 0) + 1;

  const gesamtPunkteImUmlauf = cards.reduce((s, c) => s + c.punkte, 0);
  const gesamtUmsatz = cards.reduce((s, c) => s + parseFloat(c.umsatzGesamt), 0);
  const praemienGewaehrt = referrals.filter(r => r.praemieGewaehrt).length;

  res.json({
    kartenGesamt: cards.length,
    stufenVerteilung,
    gesamtPunkteImUmlauf,
    gesamtUmsatz: gesamtUmsatz.toFixed(2),
    referralsGesamt: referrals.length,
    praemienGewaehrt,
  });
});

export default router;
