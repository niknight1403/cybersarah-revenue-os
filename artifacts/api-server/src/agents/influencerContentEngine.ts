export type HealthContentPlatform = "TikTok" | "Instagram" | "YouTube";
export type HealthContentAngle = "problem_loesung" | "mythos_fakt" | "routine" | "checkliste";

export interface InfluencerContentBrief {
  thema: string;
  zielgruppe?: string;
  plattform: HealthContentPlatform;
  angle?: HealthContentAngle;
  affiliateProdukt?: string;
}

export interface ContentEnginePackage {
  scriptBrief: string;
  imagePrompt: string;
  affiliateStrategy: string;
  complianceNotes: string[];
  hashtags: string[];
}

const RISKY_CLAIMS = [
  /heilt?/i, /garantiert/i, /medizinisch bewiesen/i, /arzt.*nicht/i,
  /ersetzt.*medikament/i, /100\s*%/i, /sofortige heilung/i,
];

export function containsRiskyHealthClaim(text: string): boolean {
  return RISKY_CLAIMS.some((pattern) => pattern.test(text));
}

export function buildComplianceNotes(thema: string): string[] {
  const notes = [
    "Keine Diagnose, Heilungs- oder Garantieversprechen.",
    "Keine Aufforderung, verschriebene Medikamente oder ärztliche Behandlung abzusetzen.",
    "Gesundheitsinformationen als allgemeine Information kennzeichnen; bei Beschwerden ärztlichen Rat empfehlen.",
    "Affiliate-Beziehung klar und sichtbar kennzeichnen.",
    "Nur belegbare Produkteigenschaften nennen; keine erfundenen Studien oder Behördenfreigaben.",
  ];
  if (containsRiskyHealthClaim(thema)) {
    notes.unshift("Das Thema enthält potenziell riskante Health-Claims: Formulierung neutralisieren und als allgemeine Information darstellen.");
  }
  return notes;
}

export function buildScriptBrief(brief: InfluencerContentBrief): string {
  const angle = brief.angle ?? "problem_loesung";
  const zielgruppe = brief.zielgruppe ?? "Erwachsene 35-60 in der EU mit Interesse an Wellness und natürlichen Routinen";
  return [
    "Erstelle ein deutschsprachiges Short-Video-Skript mit 15-30 Sekunden Laufzeit.",
    "Rolle: vertrauenswürdige/r Health- und Wellness-Experte/Expertin, sachlich, warm, nicht medizinisch auftretend.",
    `Thema: ${brief.thema}`,
    `Zielgruppe: ${zielgruppe}`,
    `Plattform: ${brief.plattform}`,
    `Erzählwinkel: ${angle}`,
    "Struktur: 0-3s visueller Hook; 3-20s 2-3 konkrete, sichere Punkte; 20-30s CTA.",
    "Nutze einfache EU-taugliche Sprache. Keine Heilversprechen, keine Diagnose, keine erfundenen Statistiken.",
    "Wenn ein Produkt erwähnt wird: Nutzen vorsichtig formulieren und Affiliate-Hinweis in den CTA integrieren.",
    "Liefere zusätzlich: On-Screen-Text, B-Roll-Hinweise und 5 passende Hashtags.",
  ].join("\n");
}

export function buildImagePrompt(brief: InfluencerContentBrief): string {
  return [
    "Photorealistic vertical 9:16 social media frame, premium European wellness aesthetic.",
    "Consistent avatar: trusted health/wellness expert, age 35-60, approachable, confident, natural skin texture, realistic hands.",
    "Setting: bright modern European kitchen or wellness studio, clean neutral background, natural daylight.",
    `Visual topic: ${brief.thema}.`,
    "Composition: strong visual hook in foreground, avatar mid-shot, room for subtitles in lower third, no embedded text, no logos.",
    "Avoid medical uniforms, hospital imagery, pills as hero objects, exaggerated before/after claims, or miracle-cure symbolism.",
    "High detail, authentic smartphone creator look, cinematic but believable, no uncanny features.",
  ].join(" ");
}

export function buildAffiliateStrategy(brief: InfluencerContentBrief): string {
  const produkt = brief.affiliateProdukt?.trim();
  if (!produkt) {
    return "Soft-CTA ohne konkretes Produkt: zuerst Mehrwert liefern; optional auf eine transparent gekennzeichnete Ressourcen-/Empfehlungsseite verweisen. Keine künstliche Verknappung.";
  }
  return [
    `Affiliate-Produkt: ${produkt}.`,
    "Positionierung: Produkt als optionale Ergänzung einer Routine, nicht als Behandlung oder Heilmittel darstellen.",
    "CTA: transparent mit 'Werbung/Affiliate-Link' kennzeichnen; keine garantierten Ergebnisse.",
    "A/B-Test: Variante A = edukativer CTA, Variante B = Checklisten-CTA; CTR und Conversion getrennt messen.",
  ].join(" ");
}

export function buildHashtags(thema: string): string[] {
  const normalized = thema
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .split(/\s+/)
    .filter((x) => x.length > 3)
    .slice(0, 2)
    .map((x) => "#" + x.replace(/-/g, ""));
  return [...new Set(["#Wellness", "#Gesundheit", "#Alltagstipps", ...normalized])].slice(0, 5);
}

export function buildContentEnginePackage(brief: InfluencerContentBrief): ContentEnginePackage {
  return {
    scriptBrief: buildScriptBrief(brief),
    imagePrompt: buildImagePrompt(brief),
    affiliateStrategy: buildAffiliateStrategy(brief),
    complianceNotes: buildComplianceNotes(brief.thema),
    hashtags: buildHashtags(brief.thema),
  };
}

export function scoreEngagementDistribution(counts: Record<string, number>): {
  topPlatform: string;
  total: number;
  concentration: number;
} {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  return {
    topPlatform: entries[0]?.[0] ?? "TikTok",
    total,
    concentration: total > 0 ? Number(((entries[0]?.[1] ?? 0) / total).toFixed(3)) : 0,
  };
}
