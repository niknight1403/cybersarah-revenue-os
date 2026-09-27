export type HealthContentPlatform = "TikTok" | "Instagram" | "YouTube";
export type HealthContentAngle = "problem_loesung" | "mythos_fakt" | "routine" | "checkliste";

export interface InfluencerContentBrief {
  thema: string;
  zielgruppe?: string;
  plattform: HealthContentPlatform;
  angle?: HealthContentAngle;
  affiliateProdukt?: string;
}

export interface AvatarProfile {
  id: string;
  alter: string;
  rolle: string;
  look: string;
  ton: string;
}

export interface PlatformPlaybook {
  platform: HealthContentPlatform;
  targetSeconds: number;
  hookWindowSeconds: number;
  cadence: string;
  ctaStyle: string;
}

export interface ProductionPlan {
  hook: string;
  structure: string[];
  onScreenText: string[];
  bRoll: string[];
  avatar: AvatarProfile;
  playbook: PlatformPlaybook;
}

export interface ContentEnginePackage {
  scriptBrief: string;
  imagePrompt: string;
  affiliateStrategy: string;
  complianceNotes: string[];
  hashtags: string[];
  productionPlan: ProductionPlan;
}

const RISKY_CLAIMS = [
  /heilt?/i, /garantiert/i, /medizinisch bewiesen/i, /arzt.*nicht/i,
  /ersetzt.*medikament/i, /100\s*%/i, /sofortige heilung/i,
];

const AVATAR: AvatarProfile = {
  id: "cybersarah-health-eu-v1",
  alter: "45-55",
  rolle: "vertrauenswürdige Health- und Wellness-Erklärerin",
  look: "natürlich, modern, europäisch, warme Ausstrahlung, realistische Haut und Hände",
  ton: "sachlich, warm, klar, neugierig machend, nie medizinisch autoritär",
};

const PLATFORM_PLAYBOOKS: Record<HealthContentPlatform, PlatformPlaybook> = {
  TikTok: {
    platform: "TikTok",
    targetSeconds: 22,
    hookWindowSeconds: 2,
    cadence: "schnelle Pattern-Interrupts, kurze Sätze, visuelle Wechsel alle 2-4 Sekunden",
    ctaStyle: "eine einfache nächste Aktion, kein harter Verkauf",
  },
  Instagram: {
    platform: "Instagram",
    targetSeconds: 27,
    hookWindowSeconds: 3,
    cadence: "ästhetischer Einstieg, klare Untertitel, 3 kompakte Value-Beats",
    ctaStyle: "Save/Share-orientierter CTA plus transparenter Link-Hinweis",
  },
  YouTube: {
    platform: "YouTube",
    targetSeconds: 30,
    hookWindowSeconds: 3,
    cadence: "problemorientierter Einstieg, schneller Beweiswert, klare Zusammenfassung",
    ctaStyle: "Weiterführende Ressource oder nächstes Video nennen",
  },
};

const HOOKS: Record<HealthContentAngle, (topic: string) => string[]> = {
  problem_loesung: (topic) => [
    `Wenn ${topic} bei dir kompliziert wirkt, starte mit diesem einfachen Schritt.`,
    `Der häufigste Fehler bei ${topic}: zu viel auf einmal ändern.`,
  ],
  mythos_fakt: (topic) => [
    `Mythos oder sinnvoll? Das solltest du über ${topic} wissen.`,
    `Bei ${topic} klingt vieles überzeugend – aber dieser Punkt ist entscheidend.`,
  ],
  routine: (topic) => [
    `Diese Mini-Routine macht ${topic} im Alltag leichter.`,
    `30 Sekunden Vorbereitung für eine realistische ${topic}-Routine.`,
  ],
  checkliste: (topic) => [
    `3 Dinge, die ich bei ${topic} zuerst prüfen würde.`,
    `Speichere diese kurze ${topic}-Checkliste für später.`,
  ],
};

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

export function getPlatformPlaybook(plattform: HealthContentPlatform): PlatformPlaybook {
  return PLATFORM_PLAYBOOKS[plattform];
}

export function buildHook(brief: InfluencerContentBrief): string {
  const angle = brief.angle ?? "problem_loesung";
  const candidates = HOOKS[angle](brief.thema.trim());
  const seed = [...brief.thema].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return candidates[seed % candidates.length]!;
}

export function buildProductionPlan(brief: InfluencerContentBrief): ProductionPlan {
  const playbook = getPlatformPlaybook(brief.plattform);
  const hook = buildHook(brief);
  return {
    hook,
    structure: [
      `0-${playbook.hookWindowSeconds}s: visueller Hook + Kernversprechen ohne Health-Claim`,
      `${playbook.hookWindowSeconds}-18s: 2-3 konkrete, sichere und alltagstaugliche Punkte`,
      `18-${playbook.targetSeconds}s: kurze Zusammenfassung + ${playbook.ctaStyle}`,
    ],
    onScreenText: [
      hook,
      "1. Einfach starten",
      "2. Alltagstauglich bleiben",
      "3. Wirkung realistisch einordnen",
    ],
    bRoll: [
      "Avatar spricht direkt in die Kamera",
      "Detailaufnahme einer neutralen Wellness-Routine",
      "Checklisten- oder Routine-Visual ohne medizinische Symbolik",
    ],
    avatar: AVATAR,
    playbook,
  };
}

export function buildScriptBrief(brief: InfluencerContentBrief): string {
  const angle = brief.angle ?? "problem_loesung";
  const zielgruppe = brief.zielgruppe ?? "Erwachsene 35-60 in der EU mit Interesse an Wellness und natürlichen Routinen";
  const plan = buildProductionPlan(brief);
  return [
    `Erstelle ein deutschsprachiges Short-Video-Skript mit ca. ${plan.playbook.targetSeconds} Sekunden Laufzeit.`,
    `Avatar-ID: ${plan.avatar.id}. Rolle: ${plan.avatar.rolle}. Ton: ${plan.avatar.ton}.`,
    `Thema: ${brief.thema}`,
    `Zielgruppe: ${zielgruppe}`,
    `Plattform: ${brief.plattform}`,
    `Erzählwinkel: ${angle}`,
    `Hook: ${plan.hook}`,
    `Cadence: ${plan.playbook.cadence}.`,
    `Struktur: ${plan.structure.join(" | ")}.`,
    "Nutze einfache EU-taugliche Sprache. Keine Heilversprechen, keine Diagnose, keine erfundenen Statistiken.",
    "Wenn ein Produkt erwähnt wird: Nutzen vorsichtig formulieren und Affiliate-Hinweis in den CTA integrieren.",
    "Liefere zusätzlich: On-Screen-Text, B-Roll-Hinweise und 5 passende Hashtags.",
  ].join("\n");
}

export function buildImagePrompt(brief: InfluencerContentBrief): string {
  return [
    "Photorealistic vertical 9:16 social media frame, premium European wellness aesthetic.",
    `Consistent avatar ID ${AVATAR.id}: ${AVATAR.rolle}, age ${AVATAR.alter}, ${AVATAR.look}.`,
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
    productionPlan: buildProductionPlan(brief),
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
