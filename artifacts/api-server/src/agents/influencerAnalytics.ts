import type { HealthContentPlatform } from "./influencerContentEngine";

export interface VariantMetrics {
  variantId: string;
  platform: HealthContentPlatform;
  impressions: number;
  views: number;
  clicks: number;
  saves: number;
  conversions: number;
}

export interface NormalizedMetrics extends VariantMetrics {
  retentionRate: number;
  ctr: number;
  saveRate: number;
  conversionRate: number;
}

export function validVariantMetrics(metrics: VariantMetrics): boolean {
  const values = [metrics.impressions, metrics.views, metrics.clicks, metrics.saves, metrics.conversions];
  return values.every((value) => Number.isSafeInteger(value) && value >= 0) &&
    metrics.views <= metrics.impressions && metrics.clicks <= metrics.impressions &&
    metrics.saves <= metrics.views && metrics.conversions <= metrics.clicks;
}

function ratio(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 10000) / 100;
}

export function normalizeVariantMetrics(metrics: VariantMetrics): NormalizedMetrics {
  if (!validVariantMetrics(metrics)) throw new Error("Ungültige oder inkonsistente Plattform-Metriken.");
  return {
    ...metrics,
    retentionRate: ratio(metrics.views, metrics.impressions),
    ctr: ratio(metrics.clicks, metrics.impressions),
    saveRate: ratio(metrics.saves, metrics.views),
    conversionRate: ratio(metrics.conversions, metrics.clicks),
  };
}

export function isSufficientSample(metrics: VariantMetrics, minImpressions = 500): boolean {
  return validVariantMetrics(metrics) && metrics.impressions >= minImpressions;
}
