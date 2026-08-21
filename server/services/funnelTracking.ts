import type { Request, Response } from "express";
import { z } from "zod";
import { recordFunnelEvent } from "../db";

const funnelEventSchema = z.object({
  key: z.string().uuid(),
  eventId: z.string().trim().min(12).max(120),
  eventType: z.enum(["landing_view", "cta_click", "checkout.session.created"]),
  occurredAt: z.coerce.date().optional(),
});

export function createFunnelTrackingHandler(dependencies: { recordEvent: typeof recordFunnelEvent }) {
  return async (req: Request, res: Response) => {
    const parsed = funnelEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Ungültiges Funnel-Ereignis." });
    try {
      const result = await dependencies.recordEvent({ analyticsWriteKey: parsed.data.key, eventId: parsed.data.eventId, eventType: parsed.data.eventType, occurredAt: parsed.data.occurredAt ?? new Date() });
      return res.status(202).json({ accepted: result.inserted });
    } catch (error) {
      return res.status(404).json({ error: error instanceof Error ? error.message : "Tracking-Schlüssel nicht gefunden." });
    }
  };
}

export const handleFunnelTracking = createFunnelTrackingHandler({ recordEvent: recordFunnelEvent });
