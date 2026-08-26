import { and, desc, eq, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  growthAuditEvents,
  growthExperimentEvents,
  growthExperiments,
  growthLoopSettings,
  loopSnapshots,
  retentionCases,
  revenueDailyMetrics,
  revenueAgents,
  revenueEvents,
  revenueExternalActions,
  revenueProviderAudits,
  revenueProviderConfigs,
  revenueSystemAudits,
  revenueWorkspaces,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { DEFAULT_REVENUE_AGENTS } from "./services/revenueCatalog";
import { buildMonetizationLoopSnapshot } from "./services/monetizationLoopEngine";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) {
    try {
      database = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Verbindung konnte nicht initialisiert werden.", error);
      database = null;
    }
  }
  return database;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [user] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return user;
}

export async function getComplianceStatus(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [user, workspace] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    getRevenueWorkspaceByUser(userId),
  ]);
  if (!user[0]) throw new Error("Benutzerprofil wurde nicht gefunden.");
  const actions = workspace ? await db.select().from(revenueExternalActions).where(eq(revenueExternalActions.workspaceId, workspace.id)) : [];
  const latestRequest = actions.filter(action => action.actionType === "age_verification_provider_setup_draft").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
  return {
    is21Verified: user[0].is21Verified,
    verificationMethod: user[0].verificationMethod,
    verificationTimestamp: user[0].verificationTimestamp,
    vaultAccess: user[0].is21Verified,
    providerSetupStatus: latestRequest?.status ?? "not_requested",
    hasProviderSetupRequest: Boolean(latestRequest),
  };
}

export async function saveLoopSnapshots(workspaceId: number, snapshots: Array<{ loopId: string; snapshotDate: string; mode: "manual_approval" | "semi_autopilot_internal"; conversionRate: number | null; revenueCents: number | null; signals: Record<string, number> }>) {
  const db = await getDb();
  if (!db || snapshots.length === 0) return 0;
  await db.insert(loopSnapshots).values(snapshots.map(snapshot => ({ ...snapshot, workspaceId, conversionRate: snapshot.conversionRate === null ? null : snapshot.conversionRate.toFixed(6), approvalRequired: true, externalExecution: false })) as any).onDuplicateKeyUpdate({ set: { signals: snapshots[0].signals } });
  return snapshots.length;
}

export async function getLoopSnapshots(userId: number, limit = 30) {
  const db = await getDb();
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!db || !workspace) return [];
  return db.select().from(loopSnapshots).where(eq(loopSnapshots.workspaceId, workspace.id)).orderBy(desc(loopSnapshots.snapshotDate)).limit(limit);
}

export async function getRevenueWorkspaceByUser(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [workspace] = await db.select().from(revenueWorkspaces).where(eq(revenueWorkspaces.userId, userId)).limit(1);
  return workspace;
}

export async function createRevenueWorkspace(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  await db.insert(revenueWorkspaces).values({ userId, name, status: "setup" });
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) throw new Error("Arbeitsbereich konnte nicht erstellt werden.");
  await db.insert(revenueAgents).values(
    DEFAULT_REVENUE_AGENTS.map(agent => ({
      workspaceId: workspace.id,
      agentKey: agent.agentKey,
      name: agent.name,
      status: "waiting" as const,
      enabled: true,
    }))
  );
  await db.insert(revenueProviderConfigs).values({ workspaceId: workspace.id, provider: "stripe", status: "disabled" });
  return workspace;
}

async function ensureRevenueAgents(workspaceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  for (const agent of DEFAULT_REVENUE_AGENTS) {
    const [existing] = await db.select({ id: revenueAgents.id }).from(revenueAgents).where(and(eq(revenueAgents.workspaceId, workspaceId), eq(revenueAgents.agentKey, agent.agentKey))).limit(1);
    if (!existing) await db.insert(revenueAgents).values({ workspaceId, agentKey: agent.agentKey, name: agent.name, status: "waiting", enabled: true });
  }
}

export async function getRevenueOverview(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) return { workspace: null, agents: [], pendingApprovals: 0, latestAudit: null };
  await ensureRevenueAgents(workspace.id);

  const [agents, actions, audits] = await Promise.all([
    db.select().from(revenueAgents).where(eq(revenueAgents.workspaceId, workspace.id)),
    db.select().from(revenueExternalActions).where(eq(revenueExternalActions.workspaceId, workspace.id)),
    db.select().from(revenueSystemAudits).where(eq(revenueSystemAudits.workspaceId, workspace.id)).orderBy(desc(revenueSystemAudits.createdAt)).limit(1),
  ]);

  return {
    workspace,
    agents,
    pendingApprovals: actions.filter(action => action.status === "needs_approval").length,
    approvalActions: actions.filter(action => action.status === "needs_approval").map(action => ({
      id: action.id,
      actionType: action.actionType,
      target: action.target,
      payload: action.payload,
      status: action.status,
      createdAt: action.createdAt,
    })),
    latestAudit: audits[0] ?? null,
  };
}

export async function getMonetizationOverview(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) return { workspace: null, totalCents: 0, currency: "EUR", metricDate: null, sources: [] as Array<{ source: string; status: string; amountCents: number | null }> };

  const [[metric], [stripe]] = await Promise.all([
    db.select().from(revenueDailyMetrics).where(eq(revenueDailyMetrics.workspaceId, workspace.id)).orderBy(desc(revenueDailyMetrics.metricDate)).limit(1),
    db.select().from(revenueProviderConfigs).where(and(eq(revenueProviderConfigs.workspaceId, workspace.id), eq(revenueProviderConfigs.provider, "stripe"))).limit(1),
  ]);

  return {
    workspace,
    totalCents: metric?.revenueCents ?? 0,
    currency: "EUR",
    metricDate: metric?.metricDate ?? null,
    sources: [
      { source: "Stripe", status: stripe?.status ?? "not_configured", amountCents: metric?.revenueCents ?? 0 },
      { source: "Affiliate", status: "not_connected", amountCents: null },
      { source: "Ads / Sponsoring", status: "not_connected", amountCents: null },
      { source: "Social", status: "not_connected", amountCents: null },
    ],
  };
}

export async function getMcpMonetizationOverview() {
  const workspace = await getMcpOwnerWorkspace();
  return getMonetizationOverview(workspace.userId);
}

export async function setRevenueAgentEnabled(userId: number, agentId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) throw new Error("Arbeitsbereich wurde nicht gefunden.");
  const [agent] = await db
    .select()
    .from(revenueAgents)
    .where(and(eq(revenueAgents.id, agentId), eq(revenueAgents.workspaceId, workspace.id)))
    .limit(1);
  if (!agent) throw new Error("Agent wurde nicht gefunden.");
  await db.update(revenueAgents).set({ enabled, status: enabled ? "waiting" : "paused" }).where(eq(revenueAgents.id, agent.id));
}

export function buildRevenueApprovalDraftRecord(workspaceId: number, input: { actionType: string; target: string; payload: Record<string, unknown> }, actionKey: string) {
  return { workspaceId, actionKey, actionType: input.actionType, target: input.target, payload: input.payload, status: "needs_approval" as const, requiresApproval: true, requestedAt: new Date() };
}

export async function createRevenueApprovalDraft(userId: number, input: { actionType: string; target: string; payload: Record<string, unknown> }, dependencies: { getWorkspace?: typeof getRevenueWorkspaceByUser; persist?: (record: ReturnType<typeof buildRevenueApprovalDraftRecord>) => Promise<void> } = {}) {
  const workspace = await (dependencies.getWorkspace ?? getRevenueWorkspaceByUser)(userId);
  if (!workspace) throw new Error("Arbeitsbereich wurde nicht gefunden.");
  const record = buildRevenueApprovalDraftRecord(workspace.id, input, crypto.randomUUID());
  if (dependencies.persist) await dependencies.persist(record);
  else {
    const db = await getDb();
    if (!db) throw new Error("Datenbank ist nicht verfügbar.");
    await db.insert(revenueExternalActions).values(record);
  }
  return { status: record.status, requiresApproval: record.requiresApproval, externalExecution: false as const };
}

async function getOrCreateStripeProviderConfig(workspaceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [existing] = await db.select().from(revenueProviderConfigs).where(and(eq(revenueProviderConfigs.workspaceId, workspaceId), eq(revenueProviderConfigs.provider, "stripe"))).limit(1);
  if (existing) return existing;
  await db.insert(revenueProviderConfigs).values({ workspaceId, provider: "stripe", status: "disabled" });
  const [created] = await db.select().from(revenueProviderConfigs).where(and(eq(revenueProviderConfigs.workspaceId, workspaceId), eq(revenueProviderConfigs.provider, "stripe"))).limit(1);
  if (!created) throw new Error("Stripe-Providerstatus konnte nicht erstellt werden.");
  return created;
}

export async function getStripeProviderStatus(userId: number) {
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) return { workspace: null, config: null, audits: [] };
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const config = await getOrCreateStripeProviderConfig(workspace.id);
  const audits = await db.select().from(revenueProviderAudits).where(eq(revenueProviderAudits.workspaceId, workspace.id)).orderBy(desc(revenueProviderAudits.createdAt)).limit(8);
  return { workspace, config, audits };
}

export async function requestStripeProviderApproval(userId: number) {
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) throw new Error("Bitte richten Sie zuerst einen Arbeitsbereich ein.");
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const config = await getOrCreateStripeProviderConfig(workspace.id);
  if (config.status === "active") return config;
  const now = new Date();
  await db.update(revenueProviderConfigs).set({ status: "approval_requested", requestedAt: now, requestedByUserId: userId }).where(eq(revenueProviderConfigs.id, config.id));
  await db.insert(revenueProviderAudits).values({ workspaceId: workspace.id, provider: "stripe", eventType: "approval_requested", actorUserId: userId, detail: { previousStatus: config.status } });
  return getOrCreateStripeProviderConfig(workspace.id);
}

export async function setStripeProviderStatus(workspaceId: number, status: "active" | "suspended", actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const config = await getOrCreateStripeProviderConfig(workspaceId);
  const now = new Date();
  await db.update(revenueProviderConfigs).set({
    status,
    ...(status === "active" ? { approvedAt: now, approvedByUserId: actorUserId } : {}),
  }).where(eq(revenueProviderConfigs.id, config.id));
  await db.insert(revenueProviderAudits).values({ workspaceId, provider: "stripe", eventType: status === "active" ? "activated" : "suspended", actorUserId, detail: { previousStatus: config.status } });
  return getOrCreateStripeProviderConfig(workspaceId);
}

export async function hasActiveStripeProvider() {
  const db = await getDb();
  if (!db) return false;
  const active = await db.select({ id: revenueProviderConfigs.id }).from(revenueProviderConfigs).where(eq(revenueProviderConfigs.status, "active")).limit(1);
  return active.length > 0;
}

export async function recordStripeWebhookGateEvent(eventType: string, accepted: boolean) {
  const db = await getDb();
  if (!db) return;
  const [config] = await db.select().from(revenueProviderConfigs).where(eq(revenueProviderConfigs.status, "active")).limit(1);
  if (!config) return;
  const now = new Date();
  await db.update(revenueProviderConfigs).set({ lastWebhookAt: now, lastWebhookEventType: eventType }).where(eq(revenueProviderConfigs.id, config.id));
  await db.insert(revenueProviderAudits).values({ workspaceId: config.workspaceId, provider: "stripe", eventType: accepted ? "webhook_received" : "webhook_ignored", detail: { eventType, accepted } });
}

export async function isStripeProviderActive(workspaceId: number) {
  const db = await getDb();
  if (!db) return false;
  const [config] = await db.select({ id: revenueProviderConfigs.id }).from(revenueProviderConfigs).where(and(eq(revenueProviderConfigs.workspaceId, workspaceId), eq(revenueProviderConfigs.provider, "stripe"), eq(revenueProviderConfigs.status, "active"))).limit(1);
  return Boolean(config);
}

export async function recordStripeWebhookForWorkspace(workspaceId: number, eventType: string, accepted: boolean) {
  const db = await getDb();
  if (!db) return;
  const [config] = await db.select().from(revenueProviderConfigs).where(and(eq(revenueProviderConfigs.workspaceId, workspaceId), eq(revenueProviderConfigs.provider, "stripe"))).limit(1);
  if (!config) return;
  const now = new Date();
  await db.update(revenueProviderConfigs).set({ lastWebhookAt: now, lastWebhookEventType: eventType }).where(eq(revenueProviderConfigs.id, config.id));
  await db.insert(revenueProviderAudits).values({ workspaceId, provider: "stripe", eventType: accepted ? "webhook_received" : "webhook_ignored", detail: { eventType, accepted } });
}

export async function recordRevenueEvent(input: {
  workspaceId: number;
  source: "stripe" | "system";
  externalEventId: string;
  eventType: string;
  subjectRef?: string | null;
  amountCents?: number;
  currency?: string;
  occurredAt: Date;
  metadata: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [existing] = await db.select().from(revenueEvents).where(and(eq(revenueEvents.source, input.source), eq(revenueEvents.externalEventId, input.externalEventId))).limit(1);
  if (existing) return { event: existing, inserted: false };
  await db.insert(revenueEvents).values({
    ...input,
    subjectRef: input.subjectRef ?? null,
    amountCents: input.amountCents ?? 0,
    currency: (input.currency ?? "EUR").toUpperCase(),
  });
  const [event] = await db.select().from(revenueEvents).where(and(eq(revenueEvents.source, input.source), eq(revenueEvents.externalEventId, input.externalEventId))).limit(1);
  if (!event) throw new Error("Revenue-Ereignis konnte nicht gespeichert werden.");
  return { event, inserted: true };
}

export async function recordGrowthAudit(input: {
  workspaceId: number;
  idempotencyKey: string;
  actor: "user" | "system" | "cron" | "webhook";
  eventType: string;
  status: "accepted" | "skipped" | "completed" | "failed";
  detail: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [existing] = await db.select({ id: growthAuditEvents.id }).from(growthAuditEvents).where(eq(growthAuditEvents.idempotencyKey, input.idempotencyKey)).limit(1);
  if (existing) return false;
  await db.insert(growthAuditEvents).values(input);
  return true;
}

export async function updateGrowthAudit(idempotencyKey: string, status: "completed" | "failed", detail: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  await db.update(growthAuditEvents).set({ status, detail }).where(eq(growthAuditEvents.idempotencyKey, idempotencyKey));
}

export async function createRetentionDraftFromRevenueEvent(eventId: number, workspaceId: number, caseType: "dunning" | "retention" | "upsell", subjectRef: string | null, recommendedAction: string) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [existing] = await db.select({ id: retentionCases.id }).from(retentionCases).where(and(eq(retentionCases.revenueEventId, eventId), eq(retentionCases.caseType, caseType))).limit(1);
  if (existing) return { id: existing.id, created: false };
  await db.insert(retentionCases).values({ workspaceId, revenueEventId: eventId, caseType, status: "needs_approval", subjectRef, recommendedAction });
  const [created] = await db.select({ id: retentionCases.id }).from(retentionCases).where(and(eq(retentionCases.revenueEventId, eventId), eq(retentionCases.caseType, caseType))).limit(1);
  return { id: created?.id ?? -1, created: true };
}

async function getOrCreateGrowthLoopSettings(workspaceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [existing] = await db.select().from(growthLoopSettings).where(eq(growthLoopSettings.workspaceId, workspaceId)).limit(1);
  if (existing?.analyticsWriteKey) return existing;
  if (existing) {
    await db.update(growthLoopSettings).set({ analyticsWriteKey: crypto.randomUUID() }).where(eq(growthLoopSettings.id, existing.id));
    const [updated] = await db.select().from(growthLoopSettings).where(eq(growthLoopSettings.id, existing.id)).limit(1);
    if (updated) return updated;
  }
  await db.insert(growthLoopSettings).values({ workspaceId, enabled: false, analyticsWriteKey: crypto.randomUUID() });
  const [created] = await db.select().from(growthLoopSettings).where(eq(growthLoopSettings.workspaceId, workspaceId)).limit(1);
  if (!created) throw new Error("Growth-Loop-Konfiguration konnte nicht erstellt werden.");
  return created;
}

export async function saveAutonomyMode(workspaceId: number, autonomyMode: "semi" | "paused") {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const settings = await getOrCreateGrowthLoopSettings(workspaceId);
  await db.update(growthLoopSettings).set({ autonomyMode }).where(eq(growthLoopSettings.id, settings.id));
  const [updated] = await db.select().from(growthLoopSettings).where(eq(growthLoopSettings.id, settings.id)).limit(1);
  if (!updated) throw new Error("Autonomie-Modus konnte nicht gespeichert werden.");
  return updated;
}

async function createGrowthActionDraft(workspaceId: number, actionKey: string, actionType: string, target: string, payload: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [existing] = await db.select({ id: revenueExternalActions.id }).from(revenueExternalActions).where(eq(revenueExternalActions.actionKey, actionKey)).limit(1);
  if (existing) return false;
  await db.insert(revenueExternalActions).values({ workspaceId, actionKey, actionType, target, payload, status: "needs_approval", requiresApproval: true, requestedAt: new Date() });
  return true;
}

type GrowthRecommendation = { type: "dunning" | "retention" | "experiment" | "upsell"; message: string };

type GrowthActionDraft = { actionKey: string; actionType: string; target: string; payload: Record<string, unknown> };

export function buildGrowthActionDrafts(input: { workspaceId: number; currentDay: string; recommendation: GrowthRecommendation }): GrowthActionDraft[] {
  const { workspaceId, currentDay, recommendation } = input;
  if (recommendation.type === "experiment") {
    return [
      {
        actionKey: `growth-seo-draft:${workspaceId}:${currentDay}`,
        actionType: "seo_landing_draft",
        target: "SEO-Landingpage-Entwurf",
        payload: {
          source: "funnel_analysis",
          recommendation: recommendation.message,
          externalExecution: false,
          content: {
            title: "Revenue Operations ohne blinde Automatisierung",
            metaDescription: "CyberSarah Revenue OS verbindet Revenue Intelligence, nachvollziehbare Freigaben und kontrollierte Growth-Loops.",
            headline: "Wachstum messbar steuern statt blind skalieren.",
            sections: ["Revenue-Signale konsolidieren", "Funnel-Reibung sichtbar machen", "Freigaben und Audit-Trail erhalten"],
          },
        },
      },
      {
        actionKey: `growth-outreach-draft:${workspaceId}:${currentDay}`,
        actionType: "outreach_draft",
        target: "Outreach- und Social-Entwurf",
        payload: {
          source: "funnel_analysis",
          recommendation: recommendation.message,
          externalExecution: false,
          consentRequired: true,
          content: {
            socialCopy: "Revenue-Wachstum braucht Transparenz: Signale verstehen, Experimente begrenzen und Entscheidungen nachvollziehbar machen.",
            outreachAngle: "Relevanz zuerst: Eine kurze, kontextbezogene Kontaktaufnahme erst nach dokumentierter Einwilligung und Freigabe.",
          },
        },
      },
    ];
  }
  if (recommendation.type === "upsell") {
    return [{
      actionKey: `growth-upsell-draft:${workspaceId}:${currentDay}`,
      actionType: "upsell_draft",
      target: "Wertbasierter Upsell-Entwurf",
      payload: {
        source: "revenue_analysis",
        recommendation: recommendation.message,
        externalExecution: false,
        consentRequired: true,
        content: {
          headline: "Mehr Kontrolle für Ihren Revenue-Prozess",
          offer: "Optionales Upgrade mit erweitertem Audit- und Experimentumfang.",
          guardrail: "Nur für berechtigte, einwilligende Empfänger; keine automatische Zustellung.",
        },
      },
    }];
  }
  return [];
}

type GrowthMetricEvent = { eventType: string; amountCents: number; metadata?: unknown };

export function aggregateGrowthMetrics(events: GrowthMetricEvent[], marketingSpendCents: number) {
  const revenueCents = events.filter(event => ["invoice.payment_succeeded", "checkout.session.completed", "payment_intent.succeeded"].includes(event.eventType)).reduce((total, event) => total + event.amountCents, 0);
  const checkoutStarted = events.filter(event => event.eventType === "checkout.session.created").length;
  const checkoutCompleted = events.filter(event => event.eventType === "checkout.session.completed").length;
  const paymentFailures = events.filter(event => event.eventType === "invoice.payment_failed").length;
  const cancellations = events.filter(event => event.eventType === "customer.subscription.deleted").length;
  const activeSubscriptions = Math.max(0, events.filter(event => event.eventType === "customer.subscription.created").length - cancellations);
  const attribution = events.reduce((summary, event) => {
    const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata as { attribution?: { stage?: string; channel?: string; feedbackSignal?: string } } : {};
    const signal = metadata.attribution;
    if (signal?.stage === "acquisition") summary.acquisition += 1;
    if (signal?.stage === "activation") summary.activation += 1;
    if (signal?.stage === "conversion") summary.conversion += 1;
    if (signal?.channel === "owned") summary.owned += 1;
    if (signal?.feedbackSignal === "checkout_intent") summary.checkoutIntent += 1;
    return summary;
  }, { acquisition: 0, activation: 0, conversion: 0, owned: 0, checkoutIntent: 0 });
  return { revenueCents, checkoutStarted, checkoutCompleted, paymentFailures, cancellations, activeSubscriptions, cacCents: checkoutCompleted > 0 ? Math.round(marketingSpendCents / checkoutCompleted) : 0, estimatedLtvCents: activeSubscriptions > 0 ? Math.round(revenueCents / activeSubscriptions) : 0, attribution };
}

export async function getAutonomyCycleStatus(userId: number) {
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) return { status: "idle" as const, startedAt: null, recommendations: 0, externalExecution: false };
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [latest] = await db.select({ status: growthAuditEvents.status, createdAt: growthAuditEvents.createdAt, detail: growthAuditEvents.detail }).from(growthAuditEvents).where(and(eq(growthAuditEvents.workspaceId, workspace.id), eq(growthAuditEvents.eventType, "autonomy.cycle.started"))).orderBy(desc(growthAuditEvents.createdAt)).limit(1);
  if (!latest) return { status: "idle" as const, startedAt: null, recommendations: 0, externalExecution: false };
  const detail = latest.detail && typeof latest.detail === "object" ? latest.detail as Record<string, unknown> : {};
  const status = latest.status === "failed" ? "failed" as const : latest.status === "completed" ? "started" as const : "running" as const;
  return { status, startedAt: latest.createdAt, recommendations: typeof detail.recommendations === "number" ? detail.recommendations : 0, externalExecution: false };
}

export async function getGrowthLoopStatus(userId: number) {
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) return { workspace: null, setting: null, metrics: null, experiments: [], retention: [] };
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const setting = await getOrCreateGrowthLoopSettings(workspace.id);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [metrics, experiments, retention, experimentEvents, revenueSignals] = await Promise.all([
    db.select().from(revenueDailyMetrics).where(eq(revenueDailyMetrics.workspaceId, workspace.id)).orderBy(desc(revenueDailyMetrics.metricDate)).limit(1),
    db.select().from(growthExperiments).where(eq(growthExperiments.workspaceId, workspace.id)).orderBy(desc(growthExperiments.updatedAt)).limit(6),
    db.select().from(retentionCases).where(eq(retentionCases.workspaceId, workspace.id)).orderBy(desc(retentionCases.updatedAt)).limit(6),
    db.select().from(growthExperimentEvents).where(eq(growthExperimentEvents.workspaceId, workspace.id)),
    db.select().from(revenueEvents).where(and(eq(revenueEvents.workspaceId, workspace.id), gte(revenueEvents.occurredAt, since))),
  ]);
  return { workspace, setting, metrics: metrics[0] ?? null, attribution: aggregateGrowthMetrics(revenueSignals, 0).attribution, experiments: experiments.map(experiment => ({ ...experiment, results: summarizeExperimentResults(experiment, experimentEvents) })), retention };
}

type ExperimentWithVariants = { id: number; variants: Array<{ key: string; label: string; value: string }> };
type ExperimentEvent = { experimentId: number; variantKey: string; eventType: "impression" | "cta_click" | "checkout_start" };

export function summarizeExperimentResults(experiment: ExperimentWithVariants, events: ExperimentEvent[]) {
  const experimentEvents = events.filter(event => event.experimentId === experiment.id);
  return experiment.variants.map(variant => {
    const variantEvents = experimentEvents.filter(event => event.variantKey === variant.key);
    const impressions = variantEvents.filter(event => event.eventType === "impression").length;
    const ctaClicks = variantEvents.filter(event => event.eventType === "cta_click").length;
    const checkoutStarts = variantEvents.filter(event => event.eventType === "checkout_start").length;
    return { variantKey: variant.key, impressions, ctaClicks, checkoutStarts, ctaRate: impressions ? ctaClicks / impressions : 0, checkoutRate: impressions ? checkoutStarts / impressions : 0 };
  });
}

function deterministicBucket(subjectKey: string) {
  let hash = 0;
  for (let index = 0; index < subjectKey.length; index += 1) hash = ((hash << 5) - hash + subjectKey.charCodeAt(index)) | 0;
  return Math.abs(hash) % 100;
}

export function selectExperimentVariant(experiment: { id: number; maxTrafficPercent: number; variants: Array<{ key: string; label: string; value: string }> }, subjectKey: string) {
  const control = experiment.variants.find(variant => variant.key === "control") ?? experiment.variants[0];
  const treatment = experiment.variants.find(variant => variant.key !== control?.key) ?? control;
  if (!control || !treatment) return null;
  const bucket = deterministicBucket(`${experiment.id}:${subjectKey}`);
  return bucket < Math.min(experiment.maxTrafficPercent, 25) ? treatment : control;
}

async function getOwnerWorkspaceForPublicExperiment() {
  if (!ENV.ownerOpenId) return undefined;
  const owner = await getUserByOpenId(ENV.ownerOpenId);
  return owner ? getRevenueWorkspaceByUser(owner.id) : undefined;
}

export async function getPublicExperimentVariant(subjectKey: string) {
  const workspace = await getOwnerWorkspaceForPublicExperiment();
  if (!workspace) return null;
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [experiment] = await db.select().from(growthExperiments).where(and(eq(growthExperiments.workspaceId, workspace.id), eq(growthExperiments.status, "active"))).orderBy(desc(growthExperiments.updatedAt)).limit(1);
  if (!experiment || experiment.experimentType === "pricing" || experiment.maxTrafficPercent < 1 || experiment.requiresApproval || experiment.variants.length < 2) return null;
  const variant = selectExperimentVariant(experiment, subjectKey);
  if (!variant) return null;
  await db.insert(growthExperimentEvents).values({ workspaceId: workspace.id, experimentId: experiment.id, subjectKey, variantKey: variant.key, eventType: "impression" }).onDuplicateKeyUpdate({ set: { subjectKey } });
  return { experimentId: experiment.id, experimentType: experiment.experimentType, variant };
}

export async function recordPublicExperimentOutcome(input: { subjectKey: string; experimentId: number; eventType: "cta_click" | "checkout_start" }) {
  const workspace = await getOwnerWorkspaceForPublicExperiment();
  if (!workspace) throw new Error("Kein öffentlicher Revenue-Arbeitsbereich verfügbar.");
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [experiment] = await db.select().from(growthExperiments).where(and(eq(growthExperiments.id, input.experimentId), eq(growthExperiments.workspaceId, workspace.id))).limit(1);
  if (!experiment || experiment.status !== "active" || experiment.experimentType === "pricing" || experiment.requiresApproval) throw new Error("Experiment ist nicht für öffentliche Ergebniserfassung freigegeben.");
  const [assignment] = await db.select().from(growthExperimentEvents).where(and(eq(growthExperimentEvents.experimentId, experiment.id), eq(growthExperimentEvents.subjectKey, input.subjectKey), eq(growthExperimentEvents.eventType, "impression"))).limit(1);
  if (!assignment) throw new Error("Keine Variantenzuordnung für dieses pseudonymisierte Ereignis gefunden.");
  await db.insert(growthExperimentEvents).values({ workspaceId: workspace.id, experimentId: experiment.id, subjectKey: input.subjectKey, variantKey: assignment.variantKey, eventType: input.eventType }).onDuplicateKeyUpdate({ set: { subjectKey: input.subjectKey } });
  return { recorded: true } as const;
}

export async function activateGrowthExperiment(userId: number, input: { experimentId: number; maxTrafficPercent: number }) {
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) throw new Error("Bitte richten Sie zuerst einen Arbeitsbereich ein.");
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [experiment] = await db.select().from(growthExperiments).where(and(eq(growthExperiments.id, input.experimentId), eq(growthExperiments.workspaceId, workspace.id))).limit(1);
  if (!experiment) throw new Error("Experiment im eigenen Arbeitsbereich wurde nicht gefunden.");
  if (experiment.experimentType === "pricing") throw new Error("Pricing-Experimente bleiben als Freigabeentwurf gesperrt und werden nicht öffentlich ausgespielt.");
  if (experiment.status !== "needs_approval") throw new Error("Nur freigabebereite Experimente können aktiviert werden.");
  const maxTrafficPercent = Math.min(Math.max(input.maxTrafficPercent, 1), 25);
  await db.update(growthExperiments).set({ status: "active", maxTrafficPercent, requiresApproval: false, approvedByUserId: userId, approvedAt: new Date() }).where(eq(growthExperiments.id, experiment.id));
  await recordGrowthAudit({ workspaceId: workspace.id, idempotencyKey: `growth-experiment-active:${experiment.id}:${maxTrafficPercent}`, actor: "user", eventType: "growth.experiment.activated", status: "completed", detail: { experimentId: experiment.id, experimentType: experiment.experimentType, maxTrafficPercent } });
  return { experimentId: experiment.id, status: "active" as const, maxTrafficPercent };
}

export async function pauseGrowthExperiment(userId: number, experimentId: number) {
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) throw new Error("Bitte richten Sie zuerst einen Arbeitsbereich ein.");
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [experiment] = await db.select().from(growthExperiments).where(and(eq(growthExperiments.id, experimentId), eq(growthExperiments.workspaceId, workspace.id))).limit(1);
  if (!experiment || experiment.status !== "active") throw new Error("Aktives Experiment im eigenen Arbeitsbereich wurde nicht gefunden.");
  await db.update(growthExperiments).set({ status: "paused" }).where(eq(growthExperiments.id, experiment.id));
  await recordGrowthAudit({ workspaceId: workspace.id, idempotencyKey: `growth-experiment-paused:${experiment.id}`, actor: "user", eventType: "growth.experiment.paused", status: "completed", detail: { experimentId: experiment.id, experimentType: experiment.experimentType } });
  return { experimentId: experiment.id, status: "paused" as const };
}

export async function getOwnerAnalyticsWriteKey() {
  if (!ENV.ownerOpenId) return null;
  const owner = await getUserByOpenId(ENV.ownerOpenId);
  if (!owner) return null;
  const workspace = await getRevenueWorkspaceByUser(owner.id);
  if (!workspace) return null;
  const setting = await getOrCreateGrowthLoopSettings(workspace.id);
  return setting.analyticsWriteKey ?? null;
}

export async function getMcpOwnerWorkspace() {
  if (!ENV.ownerOpenId) throw new Error("MCP-Owner ist nicht konfiguriert.");
  const owner = await getUserByOpenId(ENV.ownerOpenId);
  if (!owner) throw new Error("MCP-Owner wurde nicht gefunden.");
  const workspace = await getRevenueWorkspaceByUser(owner.id);
  if (!workspace) throw new Error("Revenue-Arbeitsbereich des MCP-Owners fehlt.");
  return workspace;
}

export async function getMcpRevenueMetrics() {
  const workspace = await getMcpOwnerWorkspace();
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [metric] = await db.select().from(revenueDailyMetrics).where(eq(revenueDailyMetrics.workspaceId, workspace.id)).orderBy(desc(revenueDailyMetrics.metricDate)).limit(1);
  const mrrCents = metric?.mrrCents ?? 0;
  const cancellations = metric?.cancellations ?? 0;
  const activeSubscriptions = metric?.activeSubscriptions ?? 0;
  return { workspaceId: workspace.id, metricDate: metric?.metricDate ?? null, mrrCents, arrCents: mrrCents * 12, revenueCents: metric?.revenueCents ?? 0, checkoutStarted: metric?.checkoutStarted ?? 0, checkoutCompleted: metric?.checkoutCompleted ?? 0, conversionRate: metric?.checkoutStarted ? metric.checkoutCompleted / metric.checkoutStarted : 0, paymentFailures: metric?.paymentFailures ?? 0, cancellations, activeSubscriptions, churnRate: activeSubscriptions + cancellations > 0 ? cancellations / (activeSubscriptions + cancellations) : 0, cacCents: metric?.cacCents ?? 0, estimatedLtvCents: metric?.estimatedLtvCents ?? 0 };
}

export async function getMcpExperiments() {
  const workspace = await getMcpOwnerWorkspace();
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  return db.select({ id: growthExperiments.id, name: growthExperiments.name, type: growthExperiments.experimentType, status: growthExperiments.status, maxTrafficPercent: growthExperiments.maxTrafficPercent, requiresApproval: growthExperiments.requiresApproval, updatedAt: growthExperiments.updatedAt }).from(growthExperiments).where(eq(growthExperiments.workspaceId, workspace.id)).orderBy(desc(growthExperiments.updatedAt)).limit(50);
}

export async function getMcpAuditTrail(limit: number) {
  const workspace = await getMcpOwnerWorkspace();
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const events = await db.select({ id: growthAuditEvents.id, actor: growthAuditEvents.actor, eventType: growthAuditEvents.eventType, status: growthAuditEvents.status, detail: growthAuditEvents.detail, createdAt: growthAuditEvents.createdAt }).from(growthAuditEvents).where(eq(growthAuditEvents.workspaceId, workspace.id)).orderBy(desc(growthAuditEvents.createdAt)).limit(limit);
  return { workspaceId: workspace.id, events };
}

export async function getMcpSystemLogs(limit: number) {
  const workspace = await getMcpOwnerWorkspace();
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const events = await db.select({ id: revenueSystemAudits.id, source: revenueSystemAudits.source, score: revenueSystemAudits.score, summary: revenueSystemAudits.summary, findings: revenueSystemAudits.findings, createdAt: revenueSystemAudits.createdAt }).from(revenueSystemAudits).where(eq(revenueSystemAudits.workspaceId, workspace.id)).orderBy(desc(revenueSystemAudits.createdAt)).limit(limit);
  return { workspaceId: workspace.id, events };
}

export async function triggerMcpDunningDraft(revenueEventId: number) {
  const workspace = await getMcpOwnerWorkspace();
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [event] = await db.select().from(revenueEvents).where(and(eq(revenueEvents.id, revenueEventId), eq(revenueEvents.workspaceId, workspace.id))).limit(1);
  if (!event || event.eventType !== "invoice.payment_failed") throw new Error("Das Revenue-Ereignis ist kein Zahlungsfehler des eigenen Arbeitsbereichs.");
  return createRetentionDraftFromRevenueEvent(event.id, workspace.id, "dunning", event.subjectRef, "Einwilligungsbasierten Dunning-Entwurf mit sicherem Zahlungsaktualisierungslink vorbereiten.");
}

export async function updateMcpPricingExperiment(experimentId: number, variantKey: string, proposedValue: string, maxTrafficPercent: number) {
  const workspace = await getMcpOwnerWorkspace();
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const [experiment] = await db.select().from(growthExperiments).where(and(eq(growthExperiments.id, experimentId), eq(growthExperiments.workspaceId, workspace.id))).limit(1);
  if (!experiment || experiment.experimentType !== "pricing") throw new Error("Pricing-Experiment im eigenen Arbeitsbereich wurde nicht gefunden.");
  if (experiment.status === "active") throw new Error("Aktive Pricing-Experimente werden über MCP nicht direkt verändert.");
  const variants = experiment.variants.map(variant => variant.key === variantKey ? { ...variant, value: proposedValue } : variant);
  if (!variants.some(variant => variant.key === variantKey)) throw new Error("Pricing-Variante wurde nicht gefunden.");
  await db.update(growthExperiments).set({ variants, maxTrafficPercent: Math.min(maxTrafficPercent, 25), status: "needs_approval", requiresApproval: true, approvedAt: null, approvedByUserId: null }).where(eq(growthExperiments.id, experiment.id));
  return { experimentId: experiment.id, status: "needs_approval" as const, maxTrafficPercent: Math.min(maxTrafficPercent, 25), requiresApproval: true };
}

export async function getGrowthLoopSettingsByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [setting] = await db.select().from(growthLoopSettings).where(eq(growthLoopSettings.scheduleCronTaskUid, taskUid)).limit(1);
  return setting;
}

export async function getGrowthLoopSettingsByAnalyticsKey(analyticsWriteKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [setting] = await db.select().from(growthLoopSettings).where(eq(growthLoopSettings.analyticsWriteKey, analyticsWriteKey)).limit(1);
  return setting;
}

export function deriveFunnelAttribution(eventType: "landing_view" | "cta_click" | "checkout.session.created") {
  return { channel: "owned" as const, stage: eventType === "landing_view" ? "acquisition" as const : eventType === "cta_click" ? "activation" as const : "conversion" as const, feedbackSignal: eventType === "checkout.session.created" ? "checkout_intent" as const : "engagement" as const };
}

export async function recordFunnelEvent(input: { analyticsWriteKey: string; eventId: string; eventType: "landing_view" | "cta_click" | "checkout.session.created"; occurredAt: Date }) {
  const setting = await getGrowthLoopSettingsByAnalyticsKey(input.analyticsWriteKey);
  if (!setting) throw new Error("Unbekannter Funnel-Tracking-Schlüssel.");
  const recorded = await recordRevenueEvent({
    workspaceId: setting.workspaceId,
    source: "system",
    externalEventId: `funnel:${input.eventId}`,
    eventType: input.eventType,
    occurredAt: input.occurredAt,
    metadata: { collector: "funnel", eventType: input.eventType, attribution: deriveFunnelAttribution(input.eventType) },
  });
  if (recorded.inserted) {
    await recordGrowthAudit({ workspaceId: setting.workspaceId, idempotencyKey: `funnel-audit:${input.eventId}`, actor: "system", eventType: "funnel.event_recorded", status: "accepted", detail: { eventType: input.eventType, revenueEventId: recorded.event.id, attribution: deriveFunnelAttribution(input.eventType) } });
  }
  return { workspaceId: setting.workspaceId, inserted: recorded.inserted };
}

export async function saveGrowthLoopSchedule(workspaceId: number, values: { enabled: boolean; cadenceCron: string; scheduleCronTaskUid: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const setting = await getOrCreateGrowthLoopSettings(workspaceId);
  await db.update(growthLoopSettings).set(values).where(eq(growthLoopSettings.id, setting.id));
  return getOrCreateGrowthLoopSettings(workspaceId);
}

export async function setMarketingSpend(userId: number, marketingSpendCents: number) {
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) throw new Error("Bitte richten Sie zuerst einen Arbeitsbereich ein.");
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const metricDate = new Date().toISOString().slice(0, 10);
  await db.insert(revenueDailyMetrics).values({ workspaceId: workspace.id, metricDate, marketingSpendCents }).onDuplicateKeyUpdate({ set: { marketingSpendCents } });
  await recordGrowthAudit({ workspaceId: workspace.id, idempotencyKey: `growth-spend:${workspace.id}:${metricDate}:${marketingSpendCents}`, actor: "user", eventType: "growth.marketing_spend_recorded", status: "accepted", detail: { marketingSpendCents, metricDate } });
}

export async function runGrowthAnalysis(workspaceId: number, actor: "user" | "cron") {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const events = await db.select().from(revenueEvents).where(and(eq(revenueEvents.workspaceId, workspaceId), gte(revenueEvents.occurredAt, since)));
  const currentDay = now.toISOString().slice(0, 10);
  const [previousMetric] = await db.select().from(revenueDailyMetrics).where(and(eq(revenueDailyMetrics.workspaceId, workspaceId), eq(revenueDailyMetrics.metricDate, currentDay))).limit(1);
  const marketingSpendCents = previousMetric?.marketingSpendCents ?? 0;
  const { revenueCents, checkoutStarted, checkoutCompleted, paymentFailures, cancellations, activeSubscriptions, cacCents, estimatedLtvCents, attribution } = aggregateGrowthMetrics(events, marketingSpendCents);
  await db.insert(revenueDailyMetrics).values({ workspaceId, metricDate: currentDay, revenueCents, mrrCents: revenueCents, checkoutStarted, checkoutCompleted, paymentFailures, cancellations, activeSubscriptions, marketingSpendCents, cacCents, estimatedLtvCents }).onDuplicateKeyUpdate({ set: { revenueCents, mrrCents: revenueCents, checkoutStarted, checkoutCompleted, paymentFailures, cancellations, activeSubscriptions, cacCents, estimatedLtvCents, updatedAt: now } });
  const loopSnapshots = buildMonetizationLoopSnapshot({ mrrCents: revenueCents, checkoutStarted, checkoutCompleted, paymentFailures, cancellations });
  await saveLoopSnapshots(workspaceId, loopSnapshots.map(snapshot => ({ loopId: snapshot.id, snapshotDate: currentDay, mode: snapshot.mode, conversionRate: snapshot.conversionRate, revenueCents: snapshot.revenueCents, signals: snapshot.availableSignals })));

  const recommendations: GrowthRecommendation[] = [];
  if (paymentFailures > 0) recommendations.push({ type: "dunning", message: `${paymentFailures} fehlgeschlagene Zahlungsversuche benötigen eine einwilligungsbasierte Dunning-Sequenz als Entwurf.` });
  if (cancellations > 0) recommendations.push({ type: "retention", message: `${cancellations} Kündigungen deuten auf eine Retention-Analyse und ein freiwilliges Rückgewinnungsangebot hin.` });
  if (checkoutStarted > checkoutCompleted) recommendations.push({ type: "experiment", message: "Checkout-Abbrüche erkannt: CTA- und Onboarding-Varianten als begrenztes Experiment vorbereiten." });
  if (revenueCents > 0 && activeSubscriptions > 0) recommendations.push({ type: "upsell", message: "Aktive Kundschaft erkannt: einen wertbasierten, nicht aufdringlichen Upsell-Entwurf vorbereiten." });

  for (let index = 0; index < recommendations.length; index += 1) {
    const recommendation = recommendations[index];
    if (!recommendation) continue;
    const key = `growth-analysis:${workspaceId}:${currentDay}:${recommendation.type}:${index}`;
    const created = await recordGrowthAudit({ workspaceId, idempotencyKey: key, actor, eventType: `growth.${recommendation.type}.recommendation`, status: "completed", detail: { message: recommendation.message } });
    if (!created) continue;
    if (recommendation.type === "experiment") {
      await db.insert(growthExperiments).values({ workspaceId, experimentType: "cta", name: `Checkout-Reibung ${currentDay}`, status: "needs_approval", variants: [{ key: "control", label: "Kontrolle", value: "Mit Manus anmelden" }, { key: "variant", label: "Variante", value: "Revenue-Prozess einrichten" }], maxTrafficPercent: 0, requiresApproval: true });
      await db.insert(growthExperiments).values({ workspaceId, experimentType: "headline", name: `Value-Headline ${currentDay}`, status: "needs_approval", variants: [{ key: "control", label: "Kontrolle", value: "CyberSarah Revenue OS" }, { key: "variant", label: "Variante", value: "Revenue Operations, die nachvollziehbar wachsen" }], maxTrafficPercent: 0, requiresApproval: true });
      await db.insert(growthExperiments).values({ workspaceId, experimentType: "pricing", name: `Pricing-Review ${currentDay}`, status: "needs_approval", variants: [{ key: "control", label: "Kontrolle", value: "Bestehendes Pricing" }, { key: "variant", label: "Variante", value: "Wertbasierte Preispositionierung" }], maxTrafficPercent: 0, requiresApproval: true });
    }
    for (const draft of buildGrowthActionDrafts({ workspaceId, currentDay, recommendation })) {
      await createGrowthActionDraft(workspaceId, draft.actionKey, draft.actionType, draft.target, draft.payload);
    }
  }
  const setting = await getOrCreateGrowthLoopSettings(workspaceId);
  await db.update(growthLoopSettings).set({ lastRunAt: now }).where(eq(growthLoopSettings.id, setting.id));
  return { revenueCents, paymentFailures, cancellations, checkoutStarted, checkoutCompleted, cacCents, estimatedLtvCents, attribution, recommendations };
}

export function buildHaraWorkflowPlan(input: { workspaceId: number; currentDay: string; recommendations: GrowthRecommendation[] }) {
  const drafts = input.recommendations.flatMap(recommendation => buildGrowthActionDrafts({ workspaceId: input.workspaceId, currentDay: input.currentDay, recommendation }));
  return {
    workflow: "hara-revenue-orchestration" as const,
    modules: {
      hara: { status: "completed" as const, recommendationCount: input.recommendations.length },
      influence: { status: "draft_only" as const, draftEligible: drafts.some(draft => draft.actionType === "outreach_draft") },
      marketing: { status: "draft_only" as const, draftEligible: drafts.some(draft => draft.actionType === "seo_landing_draft" || draft.actionType === "upsell_draft") },
    },
    drafts,
    externalExecution: false as const,
    approvalRequired: true as const,
  };
}

export async function runHaraOrchestrator(workspaceId: number, actor: "user" | "cron", dependencies: { analyze?: typeof runGrowthAnalysis; audit?: typeof recordGrowthAudit } = {}) {
  const analysis = await (dependencies.analyze ?? runGrowthAnalysis)(workspaceId, actor);
  const plan = buildHaraWorkflowPlan({ workspaceId, currentDay: new Date().toISOString().slice(0, 10), recommendations: analysis.recommendations });
  await (dependencies.audit ?? recordGrowthAudit)({ workspaceId, idempotencyKey: `hara-orchestration:${workspaceId}:${new Date().toISOString().slice(0, 10)}`, actor, eventType: "hara.orchestration.completed", status: "completed", detail: { workflow: plan.workflow, modules: plan.modules, draftCount: plan.drafts.length, externalExecution: plan.externalExecution, approvalRequired: plan.approvalRequired } });
  return { ...analysis, ...plan };
}
