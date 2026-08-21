import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { createStripePaymentLink, getStripeProviderReadiness } from "./services/stripeProvider";
import { createHeartbeatJob, updateHeartbeatJob } from "./_core/heartbeat";

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
        await db.createRevenueApprovalDraft(ctx.user.id, input);
        return { success: true } as const;
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
        const paymentLink = await createStripePaymentLink({ ...input, createdBy: ctx.user.id, idempotencyKey: `stripe-link:${input.workspaceId}:${input.productName}:${input.unitAmount}:${input.recurring}` });
        await db.recordGrowthAudit({ workspaceId: input.workspaceId, idempotencyKey: `stripe-link-audit:${paymentLink.id}`, actor: "user", eventType: "stripe.payment_link_created", status: "completed", detail: { paymentLinkId: paymentLink.id, productId: paymentLink.productId, priceId: paymentLink.priceId, mode: paymentLink.mode } });
        return paymentLink;
      }),
  }),
  growth: router({
    status: protectedProcedure.query(({ ctx }) => db.getGrowthLoopStatus(ctx.user.id)),
    runAnalysis: protectedProcedure.mutation(async ({ ctx }) => {
      const workspace = await db.getRevenueWorkspaceByUser(ctx.user.id);
      if (!workspace) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Bitte richten Sie zuerst einen Arbeitsbereich ein." });
      const result = await db.runGrowthAnalysis(workspace.id, "user");
      await db.recordGrowthAudit({ workspaceId: workspace.id, idempotencyKey: `growth-manual:${workspace.id}:${new Date().toISOString().slice(0, 10)}`, actor: "user", eventType: "growth.analysis.manual", status: "completed", detail: result });
      return result;
    }),
    setMarketingSpend: protectedProcedure
      .input(z.object({ cents: z.number().int().min(0).max(100_000_000) }))
      .mutation(async ({ ctx, input }) => {
        await db.setMarketingSpend(ctx.user.id, input.cents);
        return { success: true } as const;
      }),
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
