import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Civilization queries
  civilization: router({
    // Get user's civilizations
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getCivilizationsByUser(ctx.user.id);
    }),

    // Get specific civilization
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCivilizationById(input.id);
      }),

    // Create new civilization
    create: protectedProcedure
      .input(
        z.object({
          gameId: z.number(),
          name: z.string().min(1).max(128),
          leader: z.string().min(1).max(128),
          color: z.string().regex(/^#[0-9A-F]{6}$/i),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createCivilization({
          userId: ctx.user.id,
          gameId: input.gameId,
          name: input.name,
          leader: input.leader,
          color: input.color,
        });
      }),

    // Update resources
    updateResources: protectedProcedure
      .input(
        z.object({
          civId: z.number(),
          resources: z.object({
            gold: z.number().optional(),
            food: z.number().optional(),
            production: z.number().optional(),
            science: z.number().optional(),
            culture: z.number().optional(),
            happiness: z.number().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        return await db.updateCivilizationResources(input.civId, input.resources);
      }),
  }),

  // Game queries
  game: router({
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          maxRounds: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createGame(input);
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getGameById(input.id);
      }),
  }),

  // Unit queries
  unit: router({
    list: protectedProcedure
      .input(z.object({ civId: z.number() }))
      .query(async ({ input }) => {
        return await db.getUnitsByCivilization(input.civId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          civId: z.number(),
          gameId: z.number(),
          type: z.string(),
          x: z.number(),
          y: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createUnit({
          civilizationId: input.civId,
          gameId: input.gameId,
          type: input.type,
          x: input.x,
          y: input.y,
        });
      }),

    updateHealth: protectedProcedure
      .input(z.object({ unitId: z.number(), health: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateUnitHealth(input.unitId, input.health);
      }),
  }),

  // City queries
  city: router({
    list: protectedProcedure
      .input(z.object({ civId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCitiesByCivilization(input.civId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          civId: z.number(),
          gameId: z.number(),
          name: z.string().min(1).max(128),
          x: z.number(),
          y: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createCity({
          civilizationId: input.civId,
          gameId: input.gameId,
          name: input.name,
          x: input.x,
          y: input.y,
        });
      }),

    updatePopulation: protectedProcedure
      .input(z.object({ cityId: z.number(), population: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateCityPopulation(input.cityId, input.population);
      }),
  }),

  // Building queries
  building: router({
    list: protectedProcedure
      .input(z.object({ cityId: z.number() }))
      .query(async ({ input }) => {
        return await db.getBuildingsByCity(input.cityId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          cityId: z.number(),
          type: z.string(),
          goldPerTurn: z.number().optional(),
          foodPerTurn: z.number().optional(),
          productionPerTurn: z.number().optional(),
          sciencePerTurn: z.number().optional(),
          culturePerTurn: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createBuilding(input);
      }),
  }),

  // Technology queries
  technology: router({
    list: publicProcedure.query(async () => {
      return await db.getAllTechnologies();
    }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTechnologyById(input.id);
      }),

    progress: protectedProcedure
      .input(z.object({ civId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTechnologyProgress(input.civId);
      }),

    updateProgress: protectedProcedure
      .input(
        z.object({
          civId: z.number(),
          techId: z.number(),
          progress: z.number().min(0).max(100),
        })
      )
      .mutation(async ({ input }) => {
        return await db.updateTechnologyProgress(input.civId, input.techId, input.progress);
      }),
  }),

  // Diplomacy queries
  diplomacy: router({
    list: protectedProcedure
      .input(z.object({ civId: z.number(), gameId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDiplomacyRelations(input.civId, input.gameId);
      }),
  }),

  // Leaderboard queries
  leaderboard: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getLeaderboard(input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
