/**
 * Demo-Seite für das Deep-Void-Design-System.
 * Route zum Testen: /design-demo (in App.tsx registrieren)
 * Nicht für Produktion gedacht — nur um das System vor der Integration zu sehen.
 */
import { AgentOrb } from "@/components/ui/agent-orb";
import { GlassBlobCard, GlassBlobCardHeader, GlassBlobStat } from "@/components/ui/glass-card";

export default function DesignDemo() {
  return (
    <div className="void-canvas p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold void-text-stream mb-1">Deep Void</h1>
        <p className="text-sm" style={{ color: "var(--void-text-muted)" }}>
          CyberSarah Design System · Vorschau
        </p>
      </div>

      {/* Agenten-Status-Reihe */}
      <GlassBlobCard variant="active" accent="cyan">
        <GlassBlobCardHeader>
          <span className="text-sm font-semibold">Agenten-Aktivität</span>
        </GlassBlobCardHeader>
        <div className="space-y-3">
          <AgentOrb status="beschaeftigt" label="HARA-Agent — scannt gerade" />
          <AgentOrb status="aktiv" label="Master-Agent — bereit" />
          <AgentOrb status="erfolg" label="Subscription-Agent — Zahlung erfolgreich" />
          <AgentOrb status="idle" label="Content-Engine — inaktiv" />
          <AgentOrb status="fehler" label="Trading-Bot — Verbindungsfehler" />
        </div>
      </GlassBlobCard>

      {/* Umsatz-Karten mit Liquid Gold */}
      <div className="grid grid-cols-2 gap-3">
        <GlassBlobCard accent="gold" blobStyle="b">
          <GlassBlobStat label="Umsatz heute" value="847,00 €" gold />
        </GlassBlobCard>
        <GlassBlobCard accent="cyan">
          <GlassBlobStat label="Aktive Agenten" value="36" />
        </GlassBlobCard>
      </div>

      {/* Datenstrom-Rand-Beispiel */}
      <div className="void-stream void-blob p-4">
        <p className="text-sm">Fließender Datenstrom-Rand — für laufende Pipelines/Transfers</p>
      </div>

      {/* Passiv/historisch gedämpft */}
      <GlassBlobCard variant="passive">
        <p className="text-xs" style={{ color: "var(--void-text-muted)" }}>
          Historische Daten — optisch zurückgenommen, tritt bei Hover leicht hervor
        </p>
      </GlassBlobCard>
    </div>
  );
}
