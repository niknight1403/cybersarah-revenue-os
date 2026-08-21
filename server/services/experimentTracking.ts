import type { Request, Response } from "express";
import { z } from "zod";
import { recordPublicExperimentOutcome } from "../db";

const experimentOutcomeSchema = z.object({
  subjectKey: z.string().trim().min(16).max(128),
  experimentId: z.number().int().positive(),
  eventType: z.enum(["cta_click", "checkout_start"]),
});

export function createExperimentOutcomeHandler(dependencies: { recordOutcome: typeof recordPublicExperimentOutcome }) {
  return async (req: Request, res: Response) => {
    const parsed = experimentOutcomeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Ungültiges Experimentereignis." });
    try {
      await dependencies.recordOutcome(parsed.data);
      return res.status(202).json({ accepted: true });
    } catch (error) {
      return res.status(409).json({ error: error instanceof Error ? error.message : "Experimentereignis konnte nicht zugeordnet werden." });
    }
  };
}

export const handleExperimentOutcome = createExperimentOutcomeHandler({ recordOutcome: recordPublicExperimentOutcome });
