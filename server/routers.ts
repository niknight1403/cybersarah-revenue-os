import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { classifyStripeFailure, createStripeCheckoutSession, createStripePaymentLink, getStripeProviderReadiness } from "./services/stripeProvider";
import { createHeartbeatJob, updateHeartbeatJob } from "./_core/heartbeat";
import { buildMonetizationApprovalDraft } from "./services/marketingCompliance";
import { getShopifySandboxCatalog } from "./services/shopifySandbox";
import { createTradingConnector } from "./services/tradingConnector";
import { getSubscriptionReadiness } from "./services/subscriptionReadiness";
import { getProductionReadiness } from "./services/productionReadiness";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  app: router({
    info: publicProcedure.query(() => ({
      title: process.env.VITE_APP_TITLE ?? "CyberSarah Revenue OS",
      product: "revenue-os" as const,
    })),
    tracking: publicProcedure.query(async () => ({ key: await db.getOwnerAnalyticsWriteKey() })),
    experimentVariant: publicProcedure
      .input(z.object({ subjectKey: z.string().trim().min(16).max(128) }))
      .query(({ input }) => db.getPublicExperimentVariant(input.subjectKey)),
  }),
  revenue: router({
    overview: protectedProcedure.query(({ ctx }) => db.getRevenueOverview(ctx.user.id)),
    initialize: protectedProcedure
      .input(z.object({ name: z.string().trim().min(2).max(160) }).optional())
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getRevenueWorkspaceByUser(ctx.user.id);
        if (existing) return existing;
        return db.createRevenueWorkspace(ctx.user.id, input?.name ?? "Mein Revenue Workspace");
      }),
    setAgentEnabled: protectedProcedure
      .input(z.object({ agentId: z.number().int().positive(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.setRevenueAgentEnabled(ctx.user.id, input.agentId, input.enabled);
        return { success: true } as const;
      }),
    createApprovalDraft: protectedProcedure
      .input(z.object({
        actionType: z.string().trim().min(2).max(100),
        target: z.string().trim().min(2).max(240),
        payload: z.record(z.string(), z.unknown()),
      }))
      .mutation(async ({ ctx, input }) => {
        const workspace = await db.getRevenueWorkspaceByUser(ctx.user.id);
        if (!workspace) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Bitte richten Sie zuerst einen Arbeitsbereich ein." });
        }
        const draft = await db.createRevenueApprovalDraft(ctx.user.id, input);
        return { success: true, status: draft.status, requiresApproval: draft.requiresApproval, externalExecution: draft.externalExecution } as const;
      }),
    shopifySandboxCatalog: protectedProcedure.query(() => getShopifySandboxCatalog()),
  }),
  trading: router({
    status: protectedProcedure.query(() => createTradingConnector().snapshot()),
  }),
  subscriptions: router({
    readiness: protectedProcedure.query(() => ({ subscription: getSubscriptionReadiness(), production: getProductionReadiness() })),
  }),
  monetization: router({
    overview: protectedProcedure.query(({ ctx }) => db.getMonetizationOverview(ctx.user.id)),
    createDraft: protectedProcedure
      .input(z.object({
        channel: z.enum(["affiliate", "social", "ads"]),
        target: z.string().trim().min(2).max(240),
        title: z.string().trim().min(2).max(180),
        content: z.string().trim().min(8).max(4_000),
        affiliate: z.boolean().default(false),
        sponsored: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const workspace = await db.getRevenueWorkspaceByUser(ctx.user.id);
        if (!workspace) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Bitte richten Sie zuerst einen Arbeitsbereich ein." });
        const draft = buildMonetizationApprovalDraft(input);
        await db.createRevenueApprovalDraft(ctx.user.id, draft);
        await db.recordGrowthAudit({
          workspaceId: workspace.id,
          idempotencyKey: `monetization-draft:${workspace.id}:${input.channel}:${input.target.trim().toLowerCase()}`,
          actor: "user",
          eventType: "monetization.draft.created",
          status: "accepted",
          detail: { channel: input.channel, actionType: draft.actionType, externalExecution: false, disclosure: draft.payload.compliance.aiDisclosure },
        });
        return { success: true as const, actionType: draft.actionType, disclosure: draft.payload.compliance.aiDisclosure };
      }),
  }),
  compliance: router({
    status: protectedProcedure.query(({ ctx }) => db.getComplianceStatus(ctx.user.id)),
    requestVerificationProviderSetup: protectedProcedure
      .input(z.object({ method: z.enum(["id_check", "credit_card", "third_party_kyc"]) }))
      .mutation(async ({ ctx, input }) => {
        const workspace = await db.getRevenueWorkspaceByUser(ctx.user.id);
        if (!workspace) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Bitte richten Sie zuerst einen Arbeitsbereich ein." });
        await db.createRevenueApprovalDraft(ctx.user.id, {
          actionType: "age_verification_provider_setup_draft",
          target: "21+ Verifikationsprovider",
          payload: {
            source: "compliance_center",
            externalExecution: false,
            consentRequired: true,
            verificationMethod: input.method,
            storesKycDocuments: false,
            vaultAccess: false,
            guardrail: "Nur Provider-Setup als Entwurf. Keine Altersfreischaltung, KYC-Prüfung oder Speicherung von Ausweisdokumenten ohne explizite Freigabe und konfigurierte Anbieterintegration.",
          },
        });
        await db.recordGrowthAudit({
          workspaceId: workspace.id,
          idempotencyKey: `compliance-provider-setup:${workspace.id}:${input.method}`,
          actor: "user",
          eventType: "compliance.verification_provider_setup_draft",
          status: "accepted",
          detail: { method: input.method, externalExecution: false, storesKycDocuments: false },
        });
        return { success: true as const, verified: false as const };
      }),
  }),
  stripe: router({
    status: protectedProcedure.query(async ({ ctx }) => ({
      ...(await db.getStripeProviderStatus(ctx.user.id)),
      readiness: getStripeProviderReadiness(),
    })),
    requestApproval: protectedProcedure.mutation(async ({ ctx }) => {
      const config = await db.requestStripeProviderApproval(ctx.user.id);
      return { config };
    }),
    approve: adminProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => ({ config: await db.setStripeProviderStatus(input.workspaceId, "active", ctx.user.id) })),
    suspend: adminProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => ({ config: await db.setStripeProviderStatus(input.workspaceId, "suspended", ctx.user.id) })),
    createPaymentLink: adminProcedure
      .input(z.object({ workspaceId: z.number().int().positive(), productName: z.string().trim().min(2).max(180), unitAmount: z.number().int().min(50).max(10_000_000), currency: z.string().trim().length(3), recurring: z.boolean(), origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        if (!await db.isStripeProviderActive(input.workspaceId)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe ist für diesen Arbeitsbereich nicht freigegeben." });
        try {
          const paymentLink = await createStripePaymentLink({ ...input, createdBy: ctx.user.id, idempotencyKey: `stripe-link:${input.workspaceId}:${input.productName}:${input.unitAmount}:${input.recurring}` });
          await db.recordGrowthAudit({ workspaceId: input.workspaceId, idempotencyKey: `stripe-link-audit:${paymentLink.id}`, actor: "user", eventType: "stripe.payment_link_created", status: "completed", detail: { paymentLinkId: paymentLink.id, productId: paymentLink.productId, priceId: paymentLink.priceId, mode: paymentLink.mode } });
          return paymentLink;
        } catch (error) {
          await db.recordGrowthAudit({ workspaceId: input.workspaceId, idempotencyKey: `stripe-link-failed:${input.workspaceId}:${new Date().toISOString()}`, actor: "user", eventType: "stripe.payment_link_retry_hint", status: "failed", detail: classifyStripeFailure(error, "payment_link") });
          throw error;
        }
      }),
    createCheckoutSession: adminProcedure
      .input(z.object({ workspaceId: z.number().int().positive(), productName: z.string().trim().min(2).max(180), unitAmount: z.number().int().min(50).max(10_000_000), currency: z.string().trim().length(3), recurring: z.boolean(), origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        if (!await db.isStripeProviderActive(input.workspaceId)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe ist für diesen Arbeitsbereich nicht freigegeben." });
        try {
          const checkout = await createStripeCheckoutSession({ ...input, createdBy: ctx.user.id, idempotencyKey: `stripe-checkout:${input.workspaceId}:${input.productName}:${input.unitAmount}:${input.recurring}` });
          await db.recordGrowthAudit({ workspaceId: input.workspaceId, idempotencyKey: `stripe-checkout-audit:${checkout.id}`, actor: "user", eventType: "stripe.checkout_session_created", status: "completed", detail: { checkoutSessionId: checkout.id, productId: checkout.productId, priceId: checkout.priceId, mode: checkout.mode } });
          return checkout;
        } catch (error) {
          await db.recordGrowthAudit({ workspaceId: input.workspaceId, idempotencyKey: `stripe-checkout-failed:${input.workspaceId}:${new Date().toISOString()}`, actor: "user", eventType: "stripe.checkout_retry_hint", status: "failed", detail: classifyStripeFailure(error, "checkout") });
          throw error;
        }
      }),
  }),
  growth: router({
    status: protectedProcedure.query(({ ctx }) => db.getGrowthLoopStatus(ctx.user.id)),
    loopSnapshots: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(180).default(30) }).optional()).query(({ ctx, input }) => db.getLoopSnapshots(ctx.user.id, input?.limit ?? 30)),
    loopCohorts: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(180).default(90) }).optional()).query(async ({ ctx, input }) => {
      const snapshots = await db.getLoopSnapshots(ctx.user.id, input?.limit ?? 90);
      return Object.values(snapshots.reduce<Record<string, { snapshotDate: string; loops: Record<string, { conversionRate: number | null; revenueCents: number | null }> }>>((groups, snapshot) => {
        const group = groups[snapshot.snapshotDate] ?? { snapshotDate: snapshot.snapshotDate, loops: {} };
        group.loops[snapshot.loopId] = { conversionRate: snapshot.conversionRate === null ? null : Number(snapshot.conversionRate), revenueCents: snapshot.revenueCents };
        groups[snapshot.snapshotDate] = group;
        return groups;
      }, {})).sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    }),
    autonomyCycleStatus: protectedProcedure.query(({ ctx }) => db.getAutonomyCycleStatus(ctx.user.id)),
    setAutonomyMode: protectedProcedure.input(z.object({ mode: z.enum(["semi", "paused"]) })).mutation(async ({ ctx, input }) => {
      const workspace = await db.getRevenueWorkspaceByUser(ctx.user.id);
      if (!workspace) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Bitte richten Sie zuerst einen Arbeitsbereich ein." });
      const setting = await db.saveAutonomyMode(workspace.id, input.mode);
      await db.recordGrowthAudit({ workspaceId: workspace.id, idempotencyKey: `autonomy-mode:${workspace.id}:${input.mode}:${new Date().toISOString()}`, actor: "user", eventType: "autonomy.mode.changed", status: "completed", detail: { mode: input.mode, externalExecution: false, approvalRequired: true } });
      return { mode: setting.autonomyMode, externalExecution: false, approvalRequired: true };
    }),
    runAnalysis: protectedProcedure.mutation(async ({ ctx }) => {
      const workspace = await db.getRevenueWorkspaceByUser(ctx.user.id);
      if (!workspace) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Bitte richten Sie zuerst einen Arbeitsbereich ein." });
      const result = await db.runGrowthAnalysis(workspace.id, "user");
      await db.recordGrowthAudit({ workspaceId: workspace.id, idempotencyKey: `growth-manual:${workspace.id}:${new Date().toISOString().slice(0, 10)}`, actor: "user", eventType: "growth.analysis.manual", status: "completed", detail: result });
      return result;
    }),
    startAutonomyCycle: protectedProcedure.mutation(async ({ ctx }) => {
      const workspace = await db.getRevenueWorkspaceByUser(ctx.user.id);
      if (!workspace) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Bitte richten Sie zuerst einen Arbeitsbereich ein." });
       const state = await db.getGrowthLoopStatus(ctx.user.id);
       if (state.setting?.autonomyMode === "paused") return { started: false as const, duplicate: false as const, paused: true as const, message: "Der Semi-Autopilot ist pausiert." };
       const cycleKey = `autonomy-cycle-start:${workspace.id}:${new Date().toISOString().slice(0, 10)}`;
      const claimed = await db.recordGrowthAudit({ workspaceId: workspace.id, idempotencyKey: cycleKey, actor: "user", eventType: "autonomy.cycle.started", status: "accepted", detail: { externalExecution: false, approvalRequired: true } });
      if (!claimed) return { started: false as const, duplicate: true as const, message: "Der Autonomie-Zyklus wurde heute bereits gestartet." };
      try {
        const result = await db.runHaraOrchestrator(workspace.id, "user");
        await db.updateGrowthAudit(cycleKey, "completed", { externalExecution: false, approvalRequired: true, recommendations: result.recommendations.length, workflow: result.workflow, modules: result.modules });
        return { started: true as const, duplicate: false as const, recommendations: result.recommendations.length, workflow: result.workflow, modules: result.modules };
      } catch (error) {
        await db.updateGrowthAudit(cycleKey, "failed", { error: error instanceof Error ? error.message : "Unbekannter Fehler" });
        throw error;
      }
    }),
    setMarketingSpend: protectedProcedure
      .input(z.object({ cents: z.number().int().min(0).max(100_000_000) }))
      .mutation(async ({ ctx, input }) => {
        await db.setMarketingSpend(ctx.user.id, input.cents);
        return { success: true } as const;
      }),
    activateExperiment: adminProcedure
      .input(z.object({ experimentId: z.number().int().positive(), maxTrafficPercent: z.number().int().min(1).max(25) }))
      .mutation(({ ctx, input }) => db.activateGrowthExperiment(ctx.user.id, input)),
    pauseExperiment: adminProcedure
      .input(z.object({ experimentId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.pauseGrowthExperiment(ctx.user.id, input.experimentId)),
    enableSchedule: protectedProcedure
      .input(z.object({ cron: z.string().trim().regex(/^(\S+\s+){5}\S+$/, "Cron benötigt sechs UTC-Felder.") }))
      .mutation(async ({ ctx, input }) => {
        if (process.env.NODE_ENV !== "production") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Der Growth-Loop kann erst nach der Veröffentlichung der Anwendung aktiviert werden." });
        }
        const state = await db.getGrowthLoopStatus(ctx.user.id);
        if (!state.workspace || !state.setting) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Bitte richten Sie zuerst einen Arbeitsbereich ein." });
        const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        let taskUid = state.setting.scheduleCronTaskUid;
        if (taskUid) {
          await updateHeartbeatJob(taskUid, { cron: input.cron, enable: true, description: "Tägliche CyberSarah Revenue OS Growth-Analyse" }, sessionToken);
        } else {
          const job = await createHeartbeatJob({ name: `cybersarah-growth-${state.workspace.id}`, cron: input.cron, path: "/api/scheduled/growth-analysis", payload: {}, description: "Tägliche CyberSarah Revenue OS Growth-Analyse" }, sessionToken);
          taskUid = job.taskUid;
        }
        const setting = await db.saveGrowthLoopSchedule(state.workspace.id, { enabled: true, cadenceCron: input.cron, scheduleCronTaskUid: taskUid });
        await db.recordGrowthAudit({ workspaceId: state.workspace.id, idempotencyKey: `growth-schedule-enabled:${taskUid}`, actor: "user", eventType: "growth.schedule.enabled", status: "completed", detail: { cron: input.cron, taskUid } });
        return setting;
      }),
    pauseSchedule: protectedProcedure.mutation(async ({ ctx }) => {
      const state = await db.getGrowthLoopStatus(ctx.user.id);
      if (!state.workspace || !state.setting?.scheduleCronTaskUid) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Kein aktiver Growth-Loop vorhanden." });
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      await updateHeartbeatJob(state.setting.scheduleCronTaskUid, { enable: false }, sessionToken);
      const setting = await db.saveGrowthLoopSchedule(state.workspace.id, { enabled: false, cadenceCron: state.setting.cadenceCron, scheduleCronTaskUid: state.setting.scheduleCronTaskUid });
      await db.recordGrowthAudit({ workspaceId: state.workspace.id, idempotencyKey: `growth-schedule-paused:${state.setting.scheduleCronTaskUid}`, actor: "user", eventType: "growth.schedule.paused", status: "completed", detail: { taskUid: state.setting.scheduleCronTaskUid } });
      return setting;
    }),
  }),
});

export type AppRouter = typeof appRouter;
