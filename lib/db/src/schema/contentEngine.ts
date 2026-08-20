import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const contentCharacterArchetypeEnum = pgEnum("content_character_archetype", [
  "expert_mentor",      // Erfahrener Mentor, lehrreich, autoritär aber warm
  "curious_explorer",   // Neugieriger Entdecker, experimentell, "Ich teste das für dich"
  "pragmatic_builder",  // Praktischer Umsetzer, no-BS, step-by-step
  "inspiring_visionary", // Visionär, motivierend, Big Picture
  "analytical_critic",  // Kritischer Analytiker, datengetrieben, "Was wirklich funktioniert"
  "friendly_peer",      // Freundlicher Kollege, auf Augenhöhe, Community-Focus
]);

export const contentPlatformEnum = pgEnum("content_platform", [
  "blog",
  "tiktok",
  "instagram_reel",
  "instagram_story",
  "youtube_shorts",
  "youtube_long",
  "linkedin",
  "twitter_thread",
  "newsletter",
  "podcast_intro",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "ideation",       // Idee gesammelt
  "drafting",       // KI generiert Entwurf
  "review",         // Menschliche Prüfung
  "approved",       // Freigegeben
  "scheduled",      // Zeitlich geplant
  "published",      // Veröffentlicht
  "archived",       // Verworfen/alt
]);

export const contentCharactersTable = pgTable("content_characters", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  archetype: contentCharacterArchetypeEnum("archetype").notNull(),
  
  // Persönlichkeit
  personalityDescription: text("personality_description").notNull(), // z.B. "Erfahrener Mentor, der komplexe Themen einfach erklärt"
  writingStyle: text("writing_style").notNull(), // z.B. "Klar, strukturiert, mit Metaphern, direkt an 'Du'"
  toneOfVoice: text("tone_of_voice").notNull(), // z.B. "Ermutigend, autoritär aber zugänglich, kein Marketing-Sprech"
  vocabularyLevel: varchar("vocabulary_level", { length: 20 }).default("accessible"), // simple, accessible, expert
  
  // Wissensbasis & Themen
  expertiseAreas: jsonb("expertise_areas").$type<string[]>().default([]).notNull(), // ["KI-Tools", "Automatisierung", "Online-Business"]
  forbiddenTopics: jsonb("forbidden_topics").$type<string[]>().default([]).notNull(),
  preferredFormats: contentPlatformEnum("preferred_formats").array().default([]).notNull(),
  
  // Markenbindung
  brandAffinity: jsonb("brand_affinity").$type<Record<string, number>>().default({}).notNull(), // {"CyberSarah": 0.8, "GeldPilot AI": 0.6}
  
  // Veröffentlichungsplan
  publishingSchedule: jsonb("publishing_schedule").$type<Record<string, string[]>>().default({}).notNull(), // {"monday": ["09:00", "18:00"], "friday": ["12:00"]}
  maxPostsPerDay: integer("max_posts_per_day").default(3).notNull(),
  
  // Qualität & Compliance
  qualityThresholds: jsonb("quality_thresholds").$type<Record<string, number | boolean>>().default({
    minReadabilityScore: 60,
    maxMarketingSpeak: 0.3,
    minPersonalVoice: 0.7,
    requireTransparencyLabel: true,
  }).notNull(),
  
  // KI-Konfiguration
  systemPrompt: text("system_prompt").notNull(), // Vollständiger System-Prompt für die KI
  modelPreference: varchar("model_preference", { length: 50 }).default("gpt-4o-mini"),
  temperature: integer("temperature").default(70).notNull(), // 0-100
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: uniqueIndex("content_characters_name_idx").on(table.name),
  activeIdx: uniqueIndex("content_characters_active_idx").on(table.isActive),
}));

export const contentItemsTable = pgTable("content_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: uuid("character_id").references(() => contentCharactersTable.id).notNull(),
  
  // Inhalt
  title: varchar("title", { length: 200 }).notNull(),
  hook: text("hook"), // Erster Satz/Thumbnail-Text
  body: text("body").notNull(), // Hauptinhalt
  cta: text("cta"), // Call-to-Action
  hashtags: jsonb("hashtags").$type<string[]>().default([]).notNull(),
  
  // Metadaten
  platform: contentPlatformEnum("platform").notNull(),
  format: varchar("format", { length: 50 }).notNull(), // "article", "thread", "script", "caption", "newsletter"
  topic: varchar("topic", { length: 200 }).notNull(),
  keywords: jsonb("keywords").$type<string[]>().default([]).notNull(),
  
  // Status-Pipeline
  status: contentStatusEnum("status").default("ideation").notNull(),
  currentVersion: integer("current_version").default(1).notNull(),
  
  // Qualitätsscores (0-100)
  readabilityScore: integer("readability_score"),
  brandVoiceScore: integer("brand_voice_score"),
  personalVoiceScore: integer("personal_voice_score"),
  marketingSpeakScore: integer("marketing_speak_score"),
  transparencyScore: integer("transparency_score"),
  overallQualityScore: integer("overall_quality_score"),
  
  // Review
  reviewedBy: varchar("reviewed_by", { length: 100 }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  rejectionReason: text("rejection_reason"),
  
  // Scheduling & Publishing
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  publishedUrl: varchar("published_url", { length: 500 }),
  platformPostId: varchar("platform_post_id", { length: 200 }),
  
  // Performance (nach Veröffentlichung)
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  
  // KI-Metadaten
  generatedByModel: varchar("generated_by_model", { length: 50 }),
  generationPrompt: text("generation_prompt"),
  generationTokens: integer("generation_tokens"),
  generationCost: integer("generation_cost"), // in cents
  
  // Transparenz
  aiTransparencyLabel: varchar("ai_transparency_label", { length: 100 }).default("🤖 KI-generiert & menschlich geprüft").notNull(),
  showTransparencyLabel: boolean("show_transparency_label").default(true).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  characterStatusIdx: uniqueIndex("content_items_character_status_idx").on(table.characterId, table.status),
  scheduledIdx: uniqueIndex("content_items_scheduled_idx").on(table.scheduledAt),
  platformIdx: uniqueIndex("content_items_platform_idx").on(table.platform),
  statusIdx: uniqueIndex("content_items_status_idx").on(table.status),
}));

export const contentTemplatesTable = pgTable("content_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  platform: contentPlatformEnum("platform").notNull(),
  format: varchar("format", { length: 50 }).notNull(),
  
  // Template-Struktur mit Platzhaltern
  structure: jsonb("structure").$type<{
    hook?: string;
    sections: Array<{ name: string; prompt: string; required: boolean }>;
    cta?: string;
    hashtagStrategy?: string;
  }>().notNull(),
  
  // Für welche Charakter-Archetypen geeignet
  suitableArchetypes: contentCharacterArchetypeEnum("suitable_archetypes").array().default([]).notNull(),
  
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contentIdeasTable = pgTable("content_ideas", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: uuid("character_id").references(() => contentCharactersTable.id).notNull(),
  
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  platform: contentPlatformEnum("platform").notNull(),
  topic: varchar("topic", { length: 200 }).notNull(),
  keywords: jsonb("keywords").$type<string[]>().default([]).notNull(),
  source: varchar("source", { length: 100 }).default("ai_generated"), // ai_generated, trend_scraped, user_submitted, competitor_analysis
  priority: integer("priority").default(2).notNull(), // 1=high, 2=medium, 3=low
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, used, discarded
  
  estimatedReach: integer("estimated_reach"),
  estimatedEngagement: integer("estimated_engagement"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  usedAt: timestamp("used_at"),
}, (table) => ({
  characterIdx: uniqueIndex("content_ideas_character_idx").on(table.characterId),
  statusIdx: uniqueIndex("content_ideas_status_idx").on(table.status),
}));

export type ContentCharacter = typeof contentCharactersTable.$inferSelect;
export type NewContentCharacter = typeof contentCharactersTable.$inferInsert;
export type ContentItem = typeof contentItemsTable.$inferSelect;
export type NewContentItem = typeof contentItemsTable.$inferInsert;
export type ContentTemplate = typeof contentTemplatesTable.$inferSelect;
export type NewContentTemplate = typeof contentTemplatesTable.$inferInsert;
export type ContentIdea = typeof contentIdeasTable.$inferSelect;
export type NewContentIdea = typeof contentIdeasTable.$inferInsert;
