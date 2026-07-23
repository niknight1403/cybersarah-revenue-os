/**
 * Master-Agent-Tab (mobil-optimiert, dunkles CyberSarah-Design).
 * Einbindung: Route/Tab "Master" auf diese Komponente zeigen lassen.
 * Erwartet die API-Endpunkte aus masterAgent.ts (siehe Kommentar dort).
 */
import { useEffect, useState, useCallback } from "react";

type KeyStatus = "live" | "test" | "missing" | "invalid";
interface KeyReport { service: string; status: KeyStatus; detail: string }
interface LogEntry { at: string; agent: string; level: "info" | "warn" | "error"; msg: string }
interface Revenue { mode: "live" | "test"; last24hCents: number; last7dCents: number; currency: string; chargeCount7d: number; failed7d: number; note: string }
interface SocialPost { platform: string; caption: string; status: string; detail: string }
interface State { running: boolean; keys: KeyReport[]; revenue: Revenue | null; socialQueue: SocialPost[]; paymentLink: string | null; log: LogEntry[] }

const C = {
  bg: "#0d0b14", card: "#161225", border: "#2a2440", text: "#e8e4f5", dim: "#9a92b8",
  purple: "#a855f7", green: "#34d399", amber: "#fbbf24", red: "#f87171",
};

const statusColor: Record<KeyStatus, string> = { live: C.green, test: C.amber, missing: C.amber, invalid: C.red };
const statusLabel: Record<KeyStatus, string> = { live: "LIVE", test: "TEST", missing: "Fehlt", invalid: "Ungültig" };

export default function MasterAgentTab() {
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/master-agent");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setS(await r.json()); setErr(null);
    } catch (e) { setErr((e as Error).message); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 20_000); return () => clearInterval(t); }, [load]);

  const runNow = async (agent: string) => {
    setBusy(agent);
    try {
      const r = await fetch(`/api/master-agent/run/${agent}`, { method: "POST" });
      if (r.ok) setS(await r.json());
    } finally { setBusy(null); }
  };

  const euro = (cents: number, cur: string) =>
    (cents / 100).toLocaleString("de-DE", { style: "currency", currency: cur.toUpperCase() });

  const card: React.CSSProperties = {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 12,
  };
  const btn: React.CSSProperties = {
    background: "transparent", border: `1px solid ${C.purple}`, color: C.purple,
    borderRadius: 10, padding: "8px 12px", fontSize: 13, minHeight: 40,
  };

  if (err) return <div style={{ color: C.red, padding: 16 }}>Master-Agent nicht erreichbar: {err}. Läuft der api-server und ist die Route /api/master-agent eingebunden?</div>;
  if (!s) return <div style={{ color: C.dim, padding: 16 }}>Lade Agenten-Status…</div>;

  const liveReady = s.keys.some(k => k.service === "Stripe" && k.status === "live");

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", padding: 12, fontSize: 15 }}>
      <h1 style={{ fontSize: 20, margin: "4px 0 12px" }}>🧠 Master-Agent</h1>

      {/* Ehrlichkeits-Banner: Live vs. Test */}
      <div style={{ ...card, borderColor: liveReady ? C.green : C.amber }}>
        <strong style={{ color: liveReady ? C.green : C.amber }}>
          {liveReady ? "LIVE-Modus: echte Zahlungen aktiv" : "Noch kein echter Umsatz möglich"}
        </strong>
        <div style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>
          {liveReady
            ? "Stripe ist live geschaltet. Alle Umsatzzahlen unten sind real verbucht."
            : "Es fehlen Live-Zugänge (siehe Zugänge unten). Die Agenten arbeiten vor und schalten automatisch auf echt um, sobald die Keys eingetragen sind – ohne Simulation dazwischen."}
        </div>
      </div>

      {/* Umsatz – nur echte Stripe-Daten */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>💰 Finanz-Agent</strong>
          <button style={btn} disabled={busy === "finance"} onClick={() => runNow("finance")}>
            {busy === "finance" ? "Läuft…" : "Jetzt prüfen"}
          </button>
        </div>
        {s.revenue ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.dim, fontSize: 12 }}>Letzte 24h</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{euro(s.revenue.last24hCents, s.revenue.currency)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.dim, fontSize: 12 }}>7 Tage ({s.revenue.chargeCount7d} Zahlungen)</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{euro(s.revenue.last7dCents, s.revenue.currency)}</div>
              </div>
            </div>
            <div style={{ color: s.revenue.mode === "live" ? C.green : C.amber, fontSize: 12, marginTop: 6 }}>
              {s.revenue.note}
            </div>
          </div>
        ) : (
          <div style={{ color: C.dim, marginTop: 8 }}>Wartet auf Stripe-Key.</div>
        )}
        {s.paymentLink && (
          <a href={s.paymentLink} style={{ color: C.purple, fontSize: 13, display: "block", marginTop: 8, wordBreak: "break-all" }}>
            Verkaufslink: {s.paymentLink}
          </a>
        )}
      </div>

      {/* Zugänge */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>🔑 Key-Agent</strong>
          <button style={btn} disabled={busy === "keys"} onClick={() => runNow("keys")}>
            {busy === "keys" ? "Läuft…" : "Jetzt prüfen"}
          </button>
        </div>
        {s.keys.map(k => (
          <div key={k.service} style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{k.service}</span>
              <span style={{ color: statusColor[k.status], fontWeight: 600, fontSize: 13 }}>{statusLabel[k.status]}</span>
            </div>
            <div style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>{k.detail}</div>
          </div>
        ))}
      </div>

      {/* Social */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>📣 Social-Agent</strong>
          <button style={btn} disabled={busy === "social"} onClick={() => runNow("social")}>
            {busy === "social" ? "Läuft…" : "Content erzeugen"}
          </button>
        </div>
        {s.socialQueue.length === 0 && <div style={{ color: C.dim, marginTop: 8 }}>Noch keine Posts erzeugt.</div>}
        {s.socialQueue.slice(0, 5).map((p, i) => (
          <div key={i} style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, color: C.dim }}>{p.platform} · {p.status === "posted" ? "✅ veröffentlicht" : p.status === "failed" ? "❌ Fehler" : "⏳ Warteschlange"}</div>
            <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{p.caption || p.detail}</div>
            {p.caption && <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>{p.detail}</div>}
          </div>
        ))}
      </div>

      {/* Log */}
      <div style={card}>
        <strong>📋 Protokoll</strong>
        {s.log.slice(0, 12).map((l, i) => (
          <div key={i} style={{ fontSize: 12, marginTop: 8, color: l.level === "error" ? C.red : l.level === "warn" ? C.amber : C.dim }}>
            {new Date(l.at).toLocaleTimeString("de-DE")} · {l.agent}: {l.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
