/**
 * GlassBlobCard — organischer Glass-Container, Ersatz für die eckige shadcn <Card>.
 *
 * Drop-in-Ersatz: gleiche Grundstruktur (Header/Content), aber mit fließenden
 * Radien und Glasmorphism statt harter Ecken. Bestehende Seiten müssen nicht
 * komplett neu geschrieben werden — einfach <Card> durch <GlassBlobCard>
 * ersetzen, <CardContent> bleibt normales div mit p-4 o.ä.
 *
 * variant="active"  → hervorgehoben (void-layer-active), für laufende Prozesse
 * variant="passive" → gedämpft (void-layer-passive), für historische/inaktive Daten
 * accent="gold"     → Rand-/Glow-Akzent in Gold statt Cyan (Umsatz-Kontext)
 */
import { type ReactNode } from "react";

interface GlassBlobCardProps {
  children: ReactNode;
  variant?: "default" | "active" | "passive";
  accent?: "cyan" | "gold" | "none";
  blobStyle?: "a" | "b"; // zwei leicht unterschiedliche Blob-Formen für Varianz
  className?: string;
}

export function GlassBlobCard({
  children,
  variant = "default",
  accent = "none",
  blobStyle = "a",
  className = "",
}: GlassBlobCardProps) {
  const layerClass =
    variant === "active" ? "void-layer-active" : variant === "passive" ? "void-layer-passive" : "";

  const blobClass = blobStyle === "a" ? "void-blob" : "void-blob-alt";

  const accentStyle =
    accent === "gold"
      ? { boxShadow: "0 0 0 1px rgba(253,160,133,0.15), 0 8px 32px rgba(0,0,0,0.4)" }
      : accent === "cyan"
      ? { boxShadow: "0 0 0 1px rgba(0,242,254,0.15), 0 8px 32px rgba(0,0,0,0.4)" }
      : undefined;

  return (
    <div
      className={`void-glass ${blobClass} ${layerClass} p-4 ${className}`}
      style={accentStyle}
    >
      {children}
    </div>
  );
}

/**
 * GlassBlobCardHeader — leichte Kopfzeile, konsistent mit shadcn CardHeader-Gefühl
 */
export function GlassBlobCardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mb-2 flex items-center justify-between ${className}`}>{children}</div>;
}

/**
 * GlassBlobStat — Kennzahl-Darstellung mit optionalem Gold-Akzent für Umsatzwerte
 */
export function GlassBlobStat({
  label,
  value,
  gold = false,
}: {
  label: string;
  value: string;
  gold?: boolean;
}) {
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: "var(--void-text-muted)" }}>{label}</p>
      <p className={`text-2xl font-bold ${gold ? "void-text-gold" : "void-text-stream"}`}>{value}</p>
    </div>
  );
}
