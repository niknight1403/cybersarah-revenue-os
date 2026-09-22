/**
 * Autonomous AI Health Influencer Engine
 *
 * Generates production-ready short-video campaign blueprints for EU wellness
 * content. It deliberately avoids medical diagnosis/treatment claims and never
 * invents affiliate URLs. Product links must be configured in
 * systemConfig.health_affiliate_products.
 */
import { db } from "@workspace/db";
import { contentTable, agentLogsTable, agentsTable, systemConfigTable } from "@workspace/db";
import { desc, eq, gte } from "drizzle-orm";
import { openai, openaiVerfuegbar, handleOpenAIFehler } from "../lib/openaiClient";
import { logger } from "../lib/logger";

export interface HealthAffiliateProduct {
  product: string;
  url: string;
  network?: string;
  disclosure?: string;
}

export interface HealthCampaign {
  campaign_id: string;
  target_platform: ["instagram", "tiktok", "facebook"];
  affiliate_product: string;
  affiliate_link: string;
  video_hook: string;
  script: string;
  image_prompt: string;
  animation_instructions: string;
}

const FALLBACK_CAMPAIGNS: Array<Omit<HealthCampaign, "campaign_id" | "affiliate_product" | "affiliate_link">> = [
  {
    target_platform: ["instagram", "tiktok", "facebook"],
    video_hook: "Du brauchst nicht zehn neue Routinen. Starte mit einer, die du wirklich jeden Tag schaffst.",
    script: "[0-3s] VISUELL: Schneller Cut von überfülltem Supplement-Schrank zu einer ruhigen Morgenroutine. VO: „Du brauchst nicht zehn neue Routinen.“\n[3-18s] VO: „Wähle eine kleine Wellness-Gewohnheit, die in deinen Alltag passt: regelmäßig trinken, ausgewogen essen und Bewegung einplanen. Nicht perfekt – konsequent.“\n[18-25s] VO: „Speichere das Video und teste deine neue Routine eine Woche.“\n[25-30s] TEXT: „Werbung/Affiliate-Link möglich – Infos in der Beschreibung.“",
    image_prompt: "Vertical 9:16 editorial wellness scene, same recurring CyberSarah-style avatar, adult woman age 35-60, consistent facial identity, natural skin texture, approachable wellness creator, modern European home, soft daylight, neutral premium wardrobe, realistic hands, subtle motion-ready pose, no doctor coat, no hospital, no medical credentials, clean negative space for captions, photorealistic, continuity reference: AVATAR_REFERENCE_IMAGE",
    animation_instructions: "9:16 short, 30 seconds. Start with a 0.5s visual pattern interrupt, then slow push-in on avatar. Natural blinking and micro head movement, realistic hand gesture toward the routine items, gentle rack focus, clean captions safe-zone. No medical before/after imagery. Add a small affiliate disclosure in the final frame."
  },
  {
    target_platform: ["instagram", "tiktok", "facebook"],
    video_hook: "Wenn du eine Wellness-Routine immer wieder abbrichst, mach sie kleiner – nicht komplizierter.",
    script: "[0-3s] ON-SCREEN: „Routine bricht ständig ab?“ VO: „Dann mach sie kleiner.“\n[3-18s] VO: „Eine Gewohnheit funktioniert nur, wenn sie in dein echtes Leben passt. Setze dir einen Mini-Schritt: fünf Minuten Bewegung, ein Glas Wasser oder eine feste Schlafenszeit.“\n[18-25s] VO: „Wenn der Mini-Schritt sitzt, kannst du ihn später erweitern.“\n[25-30s] CTA: „Speichern und heute mit einem einzigen Schritt starten.“",
    image_prompt: "Vertical 9:16 photorealistic European wellness creator, adult age 35-60, consistent avatar identity from AVATAR_REFERENCE_IMAGE, warm natural daylight, calm home environment, simple healthy routine props, premium but attainable aesthetic, candid expression, realistic anatomy, no lab coat, no clinical setting, no disease imagery, clear upper-body framing and caption space, cinematic depth of field",
    animation_instructions: "9:16, 25-30s. Quick hook cut in first 2s, then medium shot with subtle dolly-in. Avatar uses one natural hand gesture per sentence. Add kinetic captions emphasizing „kleiner“, „konsequent“ and „heute“. Keep pacing 2-4s per visual beat and end on a clean CTA frame with affiliate disclosure if a product is present."
  }
];

function campaignId(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `cs-health-${stamp}-${Math.random().toString(36).slice(2, 7)}`;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

async function readConfigJson<T>(key: string, fallback: T): Promise<T> {
  if (!db) return fallback;
  try {
    const rows = await db.select().from(systemConfigTable)
      .where(eq(systemConfigTable.schluessel, key)).limit(1);
    const raw = rows[0]?.wert;
    return raw ? JSON.parse(raw) as T : fallback;
  } catch (err) {
    logger.warn({ err, key }, "Health Influencer: Config konnte nicht gelesen werden");
    return fallback;
  }
}

async function ladeHealthProducts(): Promise<HealthAffiliateProduct[]> {
  const configured = await readConfigJson<HealthAffiliateProduct[]>("health_affiliate_products", []);
  return configured.filter(p => p && typeof p.product === "string" && isValidHttpUrl(p.url));
}

async function buildResearchSignals(): Promise<string> {
  const recent = new Date();
  recent.setDate(recent.getDate() - 14);

  if (!db) {
    return "Keine DB-Signale verfügbar. Nutze zeitlose, EU-taugliche Wellness-Formate statt behaupteter aktueller Trends.";
  }

  try {
    const rows = await db.select({
      titel: contentTable.titel,
      plattform: contentTable.plattform,
      metadaten: contentTable.metadaten,
    }).from(contentTable)
      .where(gte(contentTable.createdAt, recent))
      .orderBy(desc(contentTable.createdAt))
      .limit(25);

    const topics = rows.map(r => r.titel).filter(Boolean).slice(0, 12);
    return [
      "Interne Content-Signale der letzten 14 Tage:",
      topics.length ? topics.map(t => `- ${t}`).join("\n") : "- Keine verwertbaren Signale.",
      "",
      "Hook-Muster: Problem in 1 Satz, visueller Pattern Interrupt, 1-3 konkrete alltagstaugliche Schritte, klare CTA.",
      "EU-Health-Grenze: keine Heilversprechen, Diagnosen, garantierten Wirkungen oder Angstmarketing.",
    ].join("\n");
  } catch {
    return "DB-Research nicht verfügbar. Nutze sichere, zeitlose Wellness-Hook-Muster.";
  }
}

function validateCampaign(input: Partial<HealthCampaign>, product?: HealthAffiliateProduct): HealthCampaign {
  const fallback = FALLBACK_CAMPAIGNS[Math.floor(Math.random() * FALLBACK_CAMPAIGNS.length)]!;
  const link = product?.url ?? "";
  const productName = product?.product ?? "Kein Affiliate-Produkt konfiguriert";

  return {
    campaign_id: campaignId(),
    target_platform: ["instagram", "tiktok", "facebook"],
    affiliate_product: input.affiliate_product?.trim() || productName,
    affiliate_link: link,
    video_hook: input.video_hook?.trim() || fallback.video_hook,
    script: input.script?.trim() || fallback.script,
    image_prompt: input.image_prompt?.trim() || fallback.image_prompt,
    animation_instructions: input.animation_instructions?.trim() || fallback.animation_instructions,
  };
}

async function persistCampaign(campaign: HealthCampaign): Promise<number | null> {
  if (!db) return null;

  const [agent] = await db.select({ id: agentsTable.id })
    .from(agentsTable)
    .where(eq(agentsTable.typ, "influencer"))
    .limit(1);

  const [row] = await db.insert(contentTable).values({
    campaignId: null,
    marke: "CyberSarah",
    typ: "health_short",
    plattform: "Instagram",
    titel: campaign.video_hook.slice(0, 490),
    inhalt: campaign.script,
    status: "generiert",
    metadaten: JSON.stringify({
      campaign,
      engine: "autonomous-ai-health-influencer-v1",
      affiliateConfigured: Boolean(campaign.affiliate_link),
      generatedAt: new Date().toISOString(),
    }),
  }).returning({ id: contentTable.id });

  if (agent?.id) {
    await db.insert(agentLogsTable).values({
      agentId: agent.id,
      agentName: "Influencer Agent",
      aktion: "Health Influencer Campaign generiert",
      status: "erfolgreich",
      nachricht: `Campaign ${campaign.campaign_id} erstellt`,
      metadaten: JSON.stringify({
        campaignId: campaign.campaign_id,
        contentId: row?.id ?? null,
        affiliateConfigured: Boolean(campaign.affiliate_link),
      }),
    });
    await db.update(agentsTable).set({ letzteAktivitaet: new Date() }).where(eq(agentsTable.id, agent.id));
  }

  return row?.id ?? null;
}

export async function generiereHealthCampaign(): Promise<{
  campaign: HealthCampaign;
  contentId: number | null;
  success: boolean;
  message: string;
}> {
  const products = await ladeHealthProducts();
  const product = products.length ? products[new Date().getDate() % products.length] : undefined;
  const research = await buildResearchSignals();

  if (!openaiVerfuegbar) {
    const fallback = FALLBACK_CAMPAIGNS[new Date().getDate() % FALLBACK_CAMPAIGNS.length]!;
    const campaign = validateCampaign(fallback, product);
    const contentId = await persistCampaign(campaign);
    return {
      campaign,
      contentId,
      success: true,
      message: `Fallback Health Campaign erstellt${contentId ? ` (Content #${contentId})` : ""}. Affiliate-Link nur bei konfiguriertem Produkt gesetzt.`,
    };
  }

  const systemPrompt = [
    "Du bist die Health-Wellness Content Engine von CyberSarah für den EU-Markt.",
    "Erstelle 15-30 Sekunden Short-Video-Kampagnen für Instagram, TikTok und Facebook.",
    "Ziel: hohe Aufmerksamkeit und hilfreicher, glaubwürdiger Wellness-Content ohne medizinische Fehlinformation.",
    "WICHTIG: Keine Diagnose, keine Behandlung, keine Heilung, keine garantierten Wirkungen, keine erfundenen Studien/Zahlen.",
    "Keine Darstellung der Avatar-Person als Arzt/Ärztin oder medizinisch qualifizierte Person, sofern dies nicht ausdrücklich konfiguriert ist.",
    "Bei Nahrungsergänzungsmitteln nur neutrale Produkt-/Wellness-Sprache und keine unzulässigen Health Claims.",
    "Affiliate-Links niemals erfinden. Wenn kein Produkt konfiguriert ist, affiliate_link leer lassen.",
    "Image-Prompt muss eine konsistente erwachsene Avatar-Person (35-60) beschreiben und AVATAR_REFERENCE_IMAGE als Referenz nennen.",
    "Animation soll 9:16, natürliche Bewegung, schnelle Hook und sichere Caption-Zone berücksichtigen.",
    "Antworte ausschließlich mit validem JSON mit exakt diesen Keys: campaign_id,target_platform,affiliate_product,affiliate_link,video_hook,script,image_prompt,animation_instructions.",
  ].join("\n");

  const userPrompt = [
    research,
    "",
    `Konfiguriertes Affiliate-Produkt (optional): ${product ? JSON.stringify(product) : "NONE"}`,
    "",
    "Erstelle jetzt eine neue Kampagne. Verwende keine Markennamen anderer Creator und kopiere keine konkreten Formulierungen.",
  ].join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1800,
      temperature: 0.75,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw.replace(/```json|\`\`\`/g, "").trim()) as Partial<HealthCampaign>;
    const campaign = validateCampaign(parsed, product);
    const contentId = await persistCampaign(campaign);

    return {
      campaign,
      contentId,
      success: true,
      message: `Health Campaign ${campaign.campaign_id} erstellt${contentId ? ` und als Content #${contentId} gespeichert` : ""}.`,
    };
  } catch (err) {
    handleOpenAIFehler(err, "Influencer Agent");
    const fallback = FALLBACK_CAMPAIGNS[new Date().getDate() % FALLBACK_CAMPAIGNS.length]!;
    const campaign = validateCampaign(fallback, product);
    const contentId = await persistCampaign(campaign);
    return {
      campaign,
      contentId,
      success: true,
      message: `LLM-Fallback: Health Campaign erstellt${contentId ? ` (Content #${contentId})` : ""}.`,
    };
  }
}
