import { Router } from "express";
import {
  fuehreTradingZyklusAus,
  starteTrading,
  stoppeTrading,
  istTradingAktiv,
  ladeHandelsDaten,
  holeMarktdaten,
} from "../agents/microTradingAgent";

const router = Router();

// GET /trading/daten — Portfolio + Trades + Signale + Marktdaten
router.get("/trading/daten", async (req, res) => {
  try {
    const daten = await ladeHandelsDaten();
    res.json(daten);
  } catch (err) {
    req.log.error({ err }, "Fehler beim Laden der Handelsdaten");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

// GET /trading/markt — nur Live-Preise
router.get("/trading/markt", async (req, res) => {
  try {
    const markt = await holeMarktdaten();
    res.json(markt);
  } catch (err) {
    res.status(500).json({ error: "Marktdaten nicht verfügbar" });
  }
});

// POST /trading/starten — Trading starten
router.post("/trading/starten", (req, res) => {
  const { interval } = req.body as { interval?: number };
  starteTrading(interval ?? 5);
  res.json({ success: true, aktiv: true, message: `Trading-Agent gestartet (Intervall: ${interval ?? 5} Min)` });
});

// POST /trading/stoppen — Trading stoppen
router.post("/trading/stoppen", (req, res) => {
  stoppeTrading();
  res.json({ success: true, aktiv: false, message: "Trading-Agent gestoppt" });
});

// POST /trading/zyklus — Manuellen Analysezyklus auslösen
router.post("/trading/zyklus", async (req, res) => {
  try {
    const ergebnis = await fuehreTradingZyklusAus();
    res.json(ergebnis);
  } catch (err) {
    req.log.error({ err }, "Fehler beim Trading-Zyklus");
    res.status(500).json({ error: "Analysezyklus fehlgeschlagen" });
  }
});

// GET /trading/status — Agent-Status
router.get("/trading/status", (req, res) => {
  res.json({ aktiv: istTradingAktiv() });
});

export default router;
