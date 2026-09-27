import type { HealthContentPlatform } from "./influencerContentEngine";

export interface TrendSignal {
  topic: string;
  platform: HealthContentPlatform;
  velocity: number;
  engagement: number;
  saturation: number;
  euRelevance: number;
}

export interface RankedTrend extends TrendSignal {
  opportunityScore: number;
}

export function rankTrendSignals(signals: TrendSignal[]): RankedTrend[] {
  return signals
    .filter((signal) => Boolean(signal.topic.trim()) &&
      [signal.velocity, signal.engagement, signal.saturation, signal.euRelevance].every((value) => Number.isFinite(value) && value >= 0 && value <= 100))
    .map((signal) => ({
      ...signal,
      opportunityScore: Math.max(0, Math.min(100, Math.round(
        signal.velocity * 0.35 +
        signal.engagement * 0.3 +
        signal.euRelevance * 0.25 +
        (100 - signal.saturation) * 0.1,
      ))),
    }))
    .sort((a, b) => b.opportunityScore - a.opportunityScore || a.topic.localeCompare(b.topic));
}

export function pickTrendCandidate(signals: TrendSignal[], minScore = 60): RankedTrend | null {
  return rankTrendSignals(signals).find((signal) => signal.opportunityScore >= minScore) ?? null;
}
