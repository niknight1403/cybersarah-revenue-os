import { postToSocialMedia, type SocialPlatform } from "../lib/socialMediaClient";

export type PublishingProvider = "tiktok" | "instagram";
export type PublishingStatus = "queued" | "processing" | "published" | "retrying" | "failed" | "blocked";

export type PublishingJob = {
  id: number;
  idempotencyKey: string;
  provider: PublishingProvider;
  caption: string;
  title?: string | null;
  mediaUrl?: string | null;
  approvalId?: string | null;
  governanceApproved: boolean;
  attemptCount: number;
};

export type ProviderResult = {
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
  mock: boolean;
};

export type PreflightResult = { allowed: true } | { allowed: false; reason: string };

const MAX_ATTEMPTS = 3;
const MOCK_MODE = process.env["PUBLISHING_PROVIDER_MODE"] === "mock" || process.env["NODE_ENV"] === "test";

function autoPublishingEnabled(): boolean {
  return process.env["ENABLE_AUTO_PUBLISHING"] === "true";
}

export function preflightPublishing(job: Pick<PublishingJob, "provider" | "caption" | "mediaUrl" | "approvalId" | "governanceApproved">): PreflightResult {
  if (!job.governanceApproved || !job.approvalId) return { allowed: false, reason: "Governance-Freigabe fehlt" };
  if (!job.caption.trim()) return { allowed: false, reason: "Caption fehlt" };
  if (job.caption.length > 2200) return { allowed: false, reason: "Caption überschreitet das sichere Limit" };
  if (!MOCK_MODE && !autoPublishingEnabled()) return { allowed: false, reason: "ENABLE_AUTO_PUBLISHING ist nicht aktiviert" };
  if (job.provider === "tiktok" && !job.mediaUrl) return { allowed: false, reason: "TikTok Direct Post benötigt eine Video-URL" };
  if (job.provider === "instagram" && !job.mediaUrl) return { allowed: false, reason: "Instagram Publishing benötigt eine Medien-URL" };
  return { allowed: true };
}

export function retryDelayMs(attemptCount: number): number {
  return Math.min(60_000, 2 ** Math.max(0, attemptCount - 1) * 5_000);
}

export function maxAttemptsReached(attemptCount: number): boolean {
  return attemptCount >= MAX_ATTEMPTS;
}

export async function publishWithProvider(job: PublishingJob): Promise<ProviderResult> {
  const preflight = preflightPublishing(job);
  if (!preflight.allowed) return { success: false, error: preflight.reason, mock: MOCK_MODE };

  if (MOCK_MODE) {
    return { success: true, postId: `mock_${job.provider}_${job.idempotencyKey}`, url: `https://mock.invalid/${job.provider}/${job.idempotencyKey}`, mock: true };
  }

  const result = await postToSocialMedia({
    platform: job.provider as SocialPlatform,
    caption: job.caption,
    title: job.title ?? undefined,
    videoUrl: job.provider === "tiktok" ? job.mediaUrl ?? undefined : undefined,
    imageUrl: job.provider === "instagram" ? job.mediaUrl ?? undefined : undefined,
  });
  return { success: result.success, postId: result.postId, url: result.url, error: result.error, mock: false };
}

export const publishingLimits = { maxAttempts: MAX_ATTEMPTS, mockMode: MOCK_MODE } as const;
