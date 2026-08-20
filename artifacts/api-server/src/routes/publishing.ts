import { Router } from "express";
import { enqueuePublishingJob, listPublishingJobs, processPublishingQueue } from "../services/publishingQueueService";
import { publishingLimits, type PublishingProvider } from "../services/socialPublishingService";

const router = Router();
const PROVIDERS = new Set<PublishingProvider>(["tiktok", "instagram"]);

function isProvider(value: unknown): value is PublishingProvider {
  return typeof value === "string" && PROVIDERS.has(value as PublishingProvider);
}

router.get("/publishing/queue", async (req, res) => {
  try {
    const limit = Number(req.query["limit"] ?? 50);
    res.json({ jobs: await listPublishingJobs(Number.isFinite(limit) ? limit : 50), limits: publishingLimits });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Queue nicht verfügbar" });
  }
});

router.post("/publishing/queue", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  if (!isProvider(body.provider) || typeof body.idempotencyKey !== "string" || !body.idempotencyKey.trim()) {
    res.status(400).json({ error: "provider und idempotencyKey sind erforderlich" });
    return;
  }
  if (typeof body.caption !== "string" || !body.caption.trim()) {
    res.status(400).json({ error: "caption ist erforderlich" });
    return;
  }
  try {
    const job = await enqueuePublishingJob({
      idempotencyKey: body.idempotencyKey.trim(),
      provider: body.provider,
      contentId: typeof body.contentId === "number" ? body.contentId : undefined,
      personaId: typeof body.personaId === "string" ? body.personaId : undefined,
      campaignId: typeof body.campaignId === "number" ? body.campaignId : undefined,
      offerId: typeof body.offerId === "string" ? body.offerId : undefined,
      approvalId: typeof body.approvalId === "string" ? body.approvalId : undefined,
      governanceApproved: body.governanceApproved === true,
      caption: body.caption,
      title: typeof body.title === "string" ? body.title : undefined,
      mediaUrl: typeof body.mediaUrl === "string" ? body.mediaUrl : undefined,
      utmSource: typeof body.utmSource === "string" ? body.utmSource : undefined,
      utmMedium: typeof body.utmMedium === "string" ? body.utmMedium : undefined,
      utmCampaign: typeof body.utmCampaign === "string" ? body.utmCampaign : undefined,
      utmContent: typeof body.utmContent === "string" ? body.utmContent : undefined,
    });
    res.status(201).json({ job });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Job konnte nicht angelegt werden" });
  }
});

router.post("/publishing/queue/process", async (req, res) => {
  const limit = Number((req.body as Record<string, unknown> | undefined)?.limit ?? 10);
  try {
    res.json({ result: await processPublishingQueue(Number.isFinite(limit) ? limit : 10) });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Queue konnte nicht verarbeitet werden" });
  }
});

export default router;
