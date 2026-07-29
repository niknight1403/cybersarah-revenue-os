/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AI SALES CHAT API (Sprint 5.2)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Router } from "express";
import { db } from "@workspace/db";
import { salesConversationsTable, salesChatLeadsTable } from "@workspace/db";
import { eq, desc, gte, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// ─── Neue Nachricht senden (Haupt-Endpoint) ─────────────────────────────────
router.post("/chat/message", async (req, res) => {
  const { message, sessionId, email } = req.body as any;
  if (!message) { res.status(400).json({ error: "message erforderlich" }); return; }

  const sid = sessionId ?? `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const agent = new (await import("../agents/SalesChatAgent")).SalesChatAgent();
  const result = await agent.verarbeiteNachricht(sid, message, email);

  if (result.success) {
    res.json({
      nachricht: result.message,
      sessionId: sid,
      checkoutLink: result.metadaten?.checkoutLink ?? null,
      couponCode: result.metadaten?.couponCode ?? null,
      stimmung: result.metadaten?.stimmung ?? null,
    });
  } else {
    res.json({ nachricht: result.message, sessionId: sid });
  }
});

// ─── Konversation abrufen ────────────────────────────────────────────────────
router.get("/chat/conversations", async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "50")), 200);
  const conversations = await db.select().from(salesConversationsTable).orderBy(desc(salesConversationsTable.updatedAt)).limit(limit);
  res.json({ conversations, anzahl: conversations.length });
});

// ─── Einzelne Konversation ───────────────────────────────────────────────────
router.get("/chat/conversations/:sessionId", async (req, res) => {
  const [conv] = await db.select().from(salesConversationsTable).where(eq(salesConversationsTable.sessionId, req.params.sessionId)).limit(1);
  if (!conv) { res.status(404).json({ error: "Nicht gefunden" }); return; }

  let nachrichten: any[] = [];
  try { nachrichten = JSON.parse(typeof conv.nachrichten === "string" ? conv.nachrichten : JSON.stringify(conv.nachrichten)); } catch {}

  res.json({ conversation: conv, nachrichten });
});

// ─── Chat-Leads ──────────────────────────────────────────────────────────────
router.get("/chat/leads", async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "50")), 200);
  const leads = await db.select().from(salesChatLeadsTable).orderBy(desc(salesChatLeadsTable.createdAt)).limit(limit);
  res.json({ leads, anzahl: leads.length });
});

// ─── Chat-Statistiken ────────────────────────────────────────────────────────
router.get("/chat/stats", async (_req, res) => {
  const vor30Tagen = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const conversations = await db
    .select()
    .from(salesConversationsTable)
    .where(gte(salesConversationsTable.createdAt, vor30Tagen));

  const konvertiert = conversations.filter(c => c.konvertiert);
  const gesamtUmsatz = konvertiert.reduce((s, c) => s + parseFloat(c.umsatz ?? "0"), 0);

  const stimmungen: Record<string, number> = {};
  for (const c of conversations) {
    const s = c.stimmung ?? "neutral";
    stimmungen[s] = (stimmungen[s] ?? 0) + 1;
  }

  const leadsCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(salesChatLeadsTable);

  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const heuteCount = conversations.filter(c => new Date(c.createdAt) >= heute).length;

  res.json({
    gespraecheGesamt: conversations.length,
    heute: heuteCount,
    konvertiert: konvertiert.length,
    umsatz: gesamtUmsatz.toFixed(2),
    konversionsRate: conversations.length > 0
      ? `${((konvertiert.length / conversations.length) * 100).toFixed(1)}%` : "0%",
    stimmungen,
    leads: Number(leadsCount[0]?.count ?? 0),
  });
});

// ─── Als konvertiert markieren ──────────────────────────────────────────────
router.post("/chat/conversations/:sessionId/convert", async (req, res) => {
  const { transaktionsId, umsatz } = req.body as any;
  await db.update(salesConversationsTable)
    .set({
      konvertiert: true,
      transaktionsId: transaktionsId ?? null,
      umsatz: umsatz ? String(umsatz) : null,
      updatedAt: new Date(),
    })
    .where(eq(salesConversationsTable.sessionId, req.params.sessionId));
  res.json({ erfolg: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMBEDDABLE CHAT WIDGET
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/chat/widget.js", async (_req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(`
(function() {
  var CYBERSARAH_CHAT_API = window.location.origin + "/api/chat/message";
  var widget = document.createElement("div");
  widget.innerHTML = \`
    <div id="cybersarah-chat" style="position:fixed;bottom:20px;right:20px;z-index:999999;font-family:system-ui,sans-serif;">
      <div id="cs-chat-btn" style="width:60px;height:60px;border-radius:30px;background:#7c3aed;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(124,58,237,0.4);font-size:28px;transition:all 0.3s;">
        💬
      </div>
      <div id="cs-chat-box" style="display:none;position:absolute;bottom:70px;right:0;width:360px;height:520px;background:#1a1a2e;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.5);overflow:hidden;border:1px solid rgba(124,58,237,0.3);flex-direction:column;">
        <div style="background:#7c3aed;padding:14px 18px;color:#fff;font-weight:600;display:flex;justify-content:space-between;align-items:center;">
          <span>🤖 Sarah - KI-Verkauf</span>
          <span id="cs-close" style="cursor:pointer;opacity:0.8;">✕</span>
        </div>
        <div id="cs-msgs" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#0f0d2e;">
          <div style="background:#1e1b4b;padding:10px 14px;border-radius:12px;color:#ddd;font-size:14px;align-self:flex-start;max-width:80%;">
            👋 Hey! Ich bin Sarah, deine KI-Verkaufsassistentin. Wie kann ich dir helfen?
          </div>
        </div>
        <div style="padding:10px 12px;border-top:1px solid #222;display:flex;gap:8px;background:#1a1a2e;">
          <input id="cs-input" type="text" placeholder="Nachricht eingeben..." style="flex:1;padding:10px 14px;border-radius:10px;border:1px solid #333;background:#0f0d2e;color:#fff;font-size:14px;outline:none;" />
          <button id="cs-send" style="width:40px;height:40px;border-radius:10px;border:none;background:#7c3aed;color:#fff;cursor:pointer;font-size:18px;">➤</button>
        </div>
      </div>
    </div>
  \`;
  document.body.appendChild(widget);

  var sessionId = "chat-" + Date.now() + "-" + Math.random().toString(36).substring(2,6);
  var btn = document.getElementById("cs-chat-btn");
  var box = document.getElementById("cs-chat-box");
  var close = document.getElementById("cs-close");
  var msgs = document.getElementById("cs-msgs");
  var input = document.getElementById("cs-input");
  var send = document.getElementById("cs-send");

  btn.onclick = function() { box.style.display = "flex"; btn.style.display = "none"; };
  close.onclick = function() { box.style.display = "none"; btn.style.display = "flex"; };

  function sendMsg() {
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMsg(text, "user");
    addMsg("...", "assistant", true);
    fetch(CYBERSARAH_CHAT_API, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({message:text, sessionId:sessionId})
    }).then(function(r) { return r.json(); }).then(function(data) {
      removeLoading();
      addMsg(data.nachricht || "✓", "assistant");
      if (data.checkoutLink) {
        addMsg('<a href="'+data.checkoutLink+'" target="_blank" style="display:inline-block;padding:10px 20px;background:#22c55e;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;">🛒 Jetzt kaufen</a>', "assistant");
      }
    }).catch(function() {
      removeLoading();
      addMsg("Entschuldigung, ein Fehler ist aufgetreten.", "assistant");
    });
  }

  function addMsg(text, role, loading) {
    var div = document.createElement("div");
    div.style.cssText = "padding:10px 14px;border-radius:12px;color:#ddd;font-size:14px;max-width:80%;" + (role === "user" ? "align-self:flex-end;background:#7c3aed;color:#fff;" : "align-self:flex-start;background:#1e1b4b;");
    if (loading) { div.id = "cs-loading"; div.innerHTML = "💭 Sarah denkt..."; }
    else if (text.startsWith("<a")) { div.innerHTML = text; div.style.background = "transparent"; div.style.padding = "5px 0"; }
    else { div.textContent = text; }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeLoading() {
    var el = document.getElementById("cs-loading");
    if (el) el.remove();
  }

  send.onclick = sendMsg;
  input.onkeypress = function(e) { if (e.key === "Enter") sendMsg(); };
})();
  \`.trim());
});

export default router;
