import { storagePut } from "../storage";

const POLLINATIONS_BASE = "https://gen.pollinations.ai";
const ALLOWED_MODELS = new Set(["zimage", "flux", "gptimage", "kontext", "seedream5", "klein"]);

export type PollinationsImageOptions = {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  seed?: number;
};

export function pollinationsConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.POLLINATIONS_API_KEY?.trim());
}

export function buildPollinationsImageUrl(options: PollinationsImageOptions) {
  const prompt = options.prompt.trim();
  if (prompt.length < 3 || prompt.length > 32000) throw new Error("pollinations-prompt-invalid");
  const model = options.model ?? "zimage";
  if (!ALLOWED_MODELS.has(model)) throw new Error("pollinations-model-not-allowed");
  const width = Math.min(Math.max(Math.trunc(options.width ?? 1024), 256), 2048);
  const height = Math.min(Math.max(Math.trunc(options.height ?? 1024), 256), 2048);
  const url = new URL(`/image/${encodeURIComponent(prompt)}`, POLLINATIONS_BASE);
  url.search = new URLSearchParams({ model, width: String(width), height: String(height), safe: "true", ...(Number.isInteger(options.seed) ? { seed: String(options.seed) } : {}) }).toString();
  return url;
}

export async function generatePollinationsImage(options: PollinationsImageOptions) {
  const key = process.env.POLLINATIONS_API_KEY?.trim();
  if (!key) throw new Error("pollinations-not-configured");
  const response = await fetch(buildPollinationsImageUrl(options), {
    headers: { accept: "image/png,image/jpeg,image/*", authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`pollinations-image-${response.status}`);
  const contentType = response.headers.get("content-type")?.split(";")[0] || "image/png";
  if (!contentType.startsWith("image/")) throw new Error("pollinations-invalid-content-type");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength < 128) throw new Error("pollinations-empty-image");
  const extension = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
  const stored = await storagePut(`generated/pollinations-${Date.now()}.${extension}`, bytes, contentType);
  return { url: stored.url, model: options.model ?? "zimage", externalExecution: false as const, approvalRequired: true as const };
}
