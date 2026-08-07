/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LEAD-NURTURE API
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ WICHTIGER INTEGRATIONSSCHRITT (manuell, einmalig) — wie bei den letzten
 * Sprints: DREI Routen werden direkt aus einer E-Mail heraus aufgerufen (Bild
 * lädt, Link wird geklickt, Abmeldung), nie mit Auth-Token. In `apiAuth.ts`
 * ergänzen:
 *
 *   || req.path.startsWith("/lead-nurture/pixel/")
 *   || req.path.startsWith("/lead-nurture/klick/")
 *   || req.path.startsWith("/lead-nurture/abmelden/")
 *
 * Alle anderen Routen (Stats) bleiben authentifiziert.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable, leadEngagementTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { globalQueue } from "../agents/JobQueue";

const router = Router();

// 1x1 transparentes PNG, fest einkodiert — kein Dateisystemzugriff nötig
const TRANSPARENT_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

// ═══════════════════════════════════════════════════════════════════════════════
// ÖFFENTLICH: Tracking-Pixel — wird geladen, sobald die E-Mail geöffnet wird
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/lead-nurture/pixel/:leadId.png", async (req, res) => {
  const leadId = parseInt(req.params.leadId);
  res.set("Content-Type", "image/png");
  res.set("Cache-Control", "no-store");
  res.send(TRANSPARENT_PIXEL);

  // Antwort geht sofort raus, Tracking läuft asynchron danach
  if (!Number.isNaN(leadId)) {
    globalQueue.fuegeHinzu("lead_nurture_oeffnung", { aktion: "tracke_oeffnung", leadId }, { prioritaet: 3 });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ÖFFENTLICH: Klick-Weiterleitung — trackt den Klick, leitet dann zur echten Seite
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/lead-nurture/klick/:leadId", async (req, res) => {
  const leadId = parseInt(req.params.leadId);
  const ziel = (req.query.ziel as string) || process.env["PUBLIC_APP_URL"] || "https://cybersarah-ki.de";

  if (!Number.isNaN(leadId)) {
    globalQueue.fuegeHinzu("lead_nurture_klick", { aktion: "tracke_klick", leadId }, { prioritaet: 2 });
  }

  res.redirect(302, ziel);
});

// ═══════════════════════════════════════════════════════════════════════════════
// ÖFFENTLICH: Abmeldung — sofort wirksam, keine Bestätigung nötig (guter Standard)
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/lead-nurture/abmelden/:leadId", async (req, res) => {
  const leadId = parseInt(req.params.leadId);
  if (Number.isNaN(leadId)) {
    res.status(400).send("Ungültige Anfrage.");
    return;
  }

  await db.update(leadsTable).set({ status: "abgemeldet" }).where(eq(leadsTable.id, leadId));
  await db.update(leadEngagementTable).set({ pausiert: true }).where(eq(leadEngagementTable.leadId, leadId));

  logger.info({ leadId }, "📭 Lead hat sich abgemeldet");

  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`
    <html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">
      <h2>Du wurdest abgemeldet.</h2>
      <p>Du bekommst keine weiteren Nachrichten von uns.</p>
    </body></html>
  `);
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTIFIZIERT: Statistik fürs Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/lead-nurture/stats", async (_req, res) => {
  const alle = await db.select().from(leadEngagementTable);
  const aktiv = alle.filter(e => !e.pausiert);
  const pausiert = alle.filter(e => e.pausiert);
  const geoeffnetGesamt = alle.reduce((s, e) => s + e.geoeffnetAnzahl, 0);
  const geklicktGesamt = alle.reduce((s, e) => s + e.geklicktAnzahl, 0);
  const nachrichtenGesamt = alle.reduce((s, e) => s + e.nachrichtenAnzahl, 0);

  res.json({
    leadsAktiv: aktiv.length,
    leadsPausiert: pausiert.length,
    nachrichtenGesamt,
    oeffnungsrate: nachrichtenGesamt > 0 ? ((geoeffnetGesamt / nachrichtenGesamt) * 100).toFixed(1) : "0",
    klickrate: nachrichtenGesamt > 0 ? ((geklicktGesamt / nachrichtenGesamt) * 100).toFixed(1) : "0",
  });
});

router.get("/lead-nurture/leads", async (_req, res) => {
  const rows = await db
    .select({
      leadId: leadsTable.id, email: leadsTable.email, marke: leadsTable.marke,
      quelle: leadsTable.quelle, status: leadsTable.status,
      nachrichtenAnzahl: leadEngagementTable.nachrichtenAnzahl,
      geoeffnetAnzahl: leadEngagementTable.geoeffnetAnzahl,
      geklicktAnzahl: leadEngagementTable.geklicktAnzahl,
      pausiert: leadEngagementTable.pausiert,
      naechsteNachrichtAm: leadEngagementTable.naechsteNachrichtAm,
    })
    .from(leadsTable)
    .leftJoin(leadEngagementTable, eq(leadsTable.id, leadEngagementTable.leadId))
    .limit(100);

  res.json({ leads: rows, anzahl: rows.length });
});

export default router;
