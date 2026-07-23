import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable, agentLogsTable } from "@workspace/db";
import { eq, sql, gte } from "drizzle-orm";
import { openaiVerfuegbar } from "../lib/openaiClient";
import { stripeTestModus, stripeLiveKey } from "../lib/stripeClient";
import { holeFallbackZaehler, holeSmartPausen } from "../agents/watchdog";
import { holeApiStatus } from "../agents/apiManagerAgent";

const router = Router();

// GET /system/status — Gesamtstatus aller kritischen Subsysteme
router.get("/system/status", async (req, res) => {
  try {
    // DB-less fallback: compute health from live API checks only
    if (!db) {
      const fallbackInfo = holeFallbackZaehler();
      const gesamtFallbacks = Object.values(fallbackInfo).reduce((s, v) => s + v.count, 0);
      const smartPausen = holeSmartPausen();
      const warnungen: string[] = [];
      if (!openaiVerfuegbar) warnungen.push("⚠️ OpenAI API-Key nicht verfügbar");
      if (!stripeLiveKey) warnungen.push("⚠️ Stripe nicht im LIVE-Modus");
      const systemGesundheit = Math.round((openaiVerfuegbar ? 40 : 0) + (stripeLiveKey ? 30 : 10) + 30);
      res.json({
        openaiVerfuegbar,
        openaiModus: openaiVerfuegbar ? "live" : "fallback",
        stripeVerfuegbar: !!process.env.STRIPE_SECRET_KEY,
        stripeTestModus,
        apiKeyStatus: holeApiStatus(),
        geminiAktiv: !!(process.env["GEMINI_API_KEY"] ?? process.env["GOOGLE_GEMINI_KEY"]),
        digistoreAktiv: !!process.env["DIGISTORE24_API_KEY"],
        stripeLiveKey,
        stripeModus: stripeLiveKey ? "live" : stripeTestModus ? "test" : "nicht_konfiguriert",
        agentenGesamt: 16,
        agentenNachStatus: {} as Record<string, number>,
        erfolgsrate24h: 100,
        gesamtLogs24h: 0,
        gesamtFallbacks,
        agentsImFallbackModus: Object.keys(fallbackInfo).length,
        fallbackDetails: fallbackInfo,
        smartPausen,
        systemGesundheit,
        systemGesund: systemGesundheit >= 60,
        warnungen,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const agenten = await db.select().from(agentsTable);

    // Agenten-Statistik
    const agentenNachStatus = agenten.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Erfolgsrate der letzten 24h aus agentLogs
    const seit24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs24h = await db
      .select({ status: agentLogsTable.status })
      .from(agentLogsTable)
      .where(gte(agentLogsTable.createdAt, seit24h));

    const gesamtLogs = logs24h.length;
    const erfolgreichLogs = logs24h.filter(l => l.status === "erfolgreich").length;
    const erfolgsrate24h = gesamtLogs > 0
      ? Math.round((erfolgreichLogs / gesamtLogs) * 100)
      : 100;

    // Fallback-Zähler
    const fallbackInfo = holeFallbackZaehler();
    const gesamtFallbacks = Object.values(fallbackInfo).reduce((s, v) => s + v.count, 0);
    const agentsImFallbackModus = Object.keys(fallbackInfo).length;

    // System-Gesundheits-Score (0-100)
    const systemGesundheit = Math.round(
      (openaiVerfuegbar ? 40 : 0) +
      (stripeLiveKey ? 30 : 10) +
      (erfolgsrate24h * 0.3)
    );

    // Smart-Pausen (30-Min-Pause nach 401)
    const smartPausen = holeSmartPausen();

    // Warnungen sammeln
    const warnungen: string[] = [];
    for (const pause of smartPausen) {
      warnungen.push(
        `🚨 SYSTEM WARNUNG: API-KEY ERNEUERN — ${pause.agentName} pausiert (Template-Rotation aktiv, noch ${pause.restMinuten} Min)`,
      );
    }
    if (!openaiVerfuegbar) {
      warnungen.push("⚠️ OpenAI API-Key fehlt — KI-Agenten im Fallback-Modus (keine echte Intelligenz)");
    }
    if (stripeTestModus && !stripeLiveKey) {
      warnungen.push("🚨 Stripe TEST-Modus — Transaktionen erscheinen NICHT auf dem Bankkonto! Live-Key eintragen!");
    }
    if (gesamtFallbacks >= 10) {
      warnungen.push(`⚠️ ${gesamtFallbacks} Fallback-Ausführungen seit Serverstart — API-Key prüfen`);
    }
    if ((agentenNachStatus["fehler"] ?? 0) > 0) {
      warnungen.push(`⚠️ ${agentenNachStatus["fehler"]} Agent(en) im FEHLER-Status`);
    }

    res.json({
      openaiVerfuegbar,
      openaiModus: openaiVerfuegbar ? "live" : "fallback",
      stripeVerfuegbar: !!process.env.STRIPE_SECRET_KEY,
      stripeTestModus,
      apiKeyStatus: holeApiStatus(),
      geminiAktiv: !!(process.env["GEMINI_API_KEY"] ?? process.env["GOOGLE_GEMINI_KEY"]),
      digistoreAktiv: !!process.env["DIGISTORE24_API_KEY"],
      stripeLiveKey,
      stripeModus: stripeLiveKey ? "live" : stripeTestModus ? "test" : "nicht_konfiguriert",
      agentenGesamt: agenten.length,
      agentenNachStatus,
      erfolgsrate24h,
      gesamtLogs24h: gesamtLogs,
      gesamtFallbacks,
      agentsImFallbackModus,
      fallbackDetails: fallbackInfo,
      smartPausen,
      systemGesundheit,
      systemGesund: systemGesundheit >= 60,
      warnungen,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Fehler beim Laden des System-Status");
    res.status(500).json({ error: "Interner Serverfehler" });
  }
});

// GET /system/status/agents — Erfolgsrate pro Agent
router.get("/system/status/agents", async (req, res) => {
  try {
    if (!db) { res.json([]); return; }
    const agenten = await db.select().from(agentsTable);
    const seit7t = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const ergebnisse = await Promise.all(agenten.map(async (agent) => {
      const logs = await db
        .select({ status: agentLogsTable.status })
        .from(agentLogsTable)
        .where(
          sql`${agentLogsTable.agentId} = ${agent.id} AND ${agentLogsTable.createdAt} >= ${seit7t}`
        );

      const total = logs.length;
      const erfolgreich = logs.filter(l => l.status === "erfolgreich").length;
      const fehler = logs.filter(l => l.status === "fehler").length;
      const fallbackZaehlerData = holeFallbackZaehler();
      const fallbacks = fallbackZaehlerData[agent.id]?.count ?? 0;

      return {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        erfolgsrate: total > 0 ? Math.round((erfolgreich / total) * 100) : null,
        logsGesamt: total,
        erfolgreich,
        fehler,
        fallbacks,
        letzteAktivitaet: agent.letzteAktivitaet?.toISOString() ?? null,
      };
    }));

    res.json(ergebnisse);
  } catch (err) {
    req.log.error({ err }, "Fehler beim Laden der Agent-Erfolgsraten");
    res.status(500).json({ error: "Interner Serverfehler" });
  }
});

export default router;
