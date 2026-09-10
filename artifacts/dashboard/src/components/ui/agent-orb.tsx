/**
 * AgentOrb — atmender Status-Indikator für einzelne Agenten.
 *
 * State-Driven: Die Atemgeschwindigkeit hängt vom tatsächlichen Zustand ab,
 * nicht von einer festen CSS-Animation — genau wie im Briefing gefordert
 * ("schnellere Wellenbewegung bei hoher Agenten-Aktivität, ruhiger Stillstand
 * im Standby").
 *
 * Verwendung:
 *   <AgentOrb status="aktiv" />                    → normales Atmen (Cyan)
 *   <AgentOrb status="beschaeftigt" />              → schnelles Atmen (Cyan, aktiv)
 *   <AgentOrb status="erfolg" />                    → Gold-Puls (z.B. nach Umsatz-Ereignis)
 *   <AgentOrb status="idle" />                      → sehr langsames, blasses Atmen
 *   <AgentOrb status="aktiv" label="HARA-Agent" />  → mit Beschriftung daneben
 */
import { type CSSProperties } from "react";

export type AgentOrbStatus = "idle" | "aktiv" | "beschaeftigt" | "erfolg" | "fehler";

const SPEED_MAP: Record<AgentOrbStatus, string> = {
  idle: "5s",
  aktiv: "3.2s",
  beschaeftigt: "1.1s",
  erfolg: "1.6s",
  fehler: "0.8s",
};

interface AgentOrbProps {
  status: AgentOrbStatus;
  label?: string;
  size?: number;
  className?: string;
}

export function AgentOrb({ status, label, size = 14, className = "" }: AgentOrbProps) {
  const isGold = status === "erfolg";
  const isIdle = status === "idle";
  const isError = status === "fehler";

  const style: CSSProperties = {
    "--breathe-speed": SPEED_MAP[status],
    width: size,
    height: size,
  } as CSSProperties;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={[
          "void-agent-orb",
          isGold ? "void-agent-gold" : "",
          isIdle ? "void-agent-idle" : "",
          isError ? "void-agent-idle" : "", // nutzt dieselbe blasse Basis, Farbe unten override
        ].join(" ")}
        style={{
          ...style,
          ...(isError ? { background: "#F87171", boxShadow: "0 0 16px 2px rgba(248,113,113,0.35)" } : {}),
        }}
        aria-hidden="true"
      />
      {label && (
        <span className="text-xs" style={{ color: "var(--void-text-muted)" }}>
          {label}
        </span>
      )}
    </div>
  );
}
