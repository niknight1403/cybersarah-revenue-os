import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

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
});

export type AppRouter = typeof appRouter;
