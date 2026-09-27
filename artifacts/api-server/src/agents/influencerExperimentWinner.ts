import { isSufficientSample, normalizeVariantMetrics, type VariantMetrics } from "./influencerAnalytics";

export interface WinnerDecision {
  winnerId: string | null;
  confidence: "insufficient" | "directional" | "strong";
  score: number;
  reason: string;
}

export function selectMeasuredWinner(metrics: VariantMetrics[]): WinnerDecision {
  const platforms = new Set(metrics.map((item) => item.platform));
  if (platforms.size > 1) return { winnerId: null, confidence: "insufficient", score: 0, reason: "Plattformübergreifende Metriken dürfen nicht direkt verglichen werden." };
  const eligible = metrics.filter((item) => isSufficientSample(item));
  if (eligible.length < 2) {
    return { winnerId: null, confidence: "insufficient", score: 0, reason: "Mindestens zwei vergleichbare Varianten mit genügend Impressionen erforderlich." };
  }

  const ranked = eligible
    .map((item) => {
      const n = normalizeVariantMetrics(item);
      const score = n.retentionRate * 0.45 + n.ctr * 2 + n.saveRate * 0.8 + n.conversionRate * 1.5;
      return { id: item.variantId, score: Math.round(score * 100) / 100, impressions: item.impressions };
    })
    .sort((a, b) => b.score - a.score || b.impressions - a.impressions);

  const top = ranked[0]!;
  const second = ranked[1];
  const margin = second ? top.score - second.score : top.score;
  return {
    winnerId: top.id,
    confidence: top.impressions >= 2000 && second!.impressions >= 2000 && margin >= 3 ? "strong" : "directional",
    score: top.score,
    reason: second ? `Messdaten-Vorsprung: ${Math.round(margin * 100) / 100} Punkte.` : "Einzige ausreichend gemessene Variante.",
  };
}
