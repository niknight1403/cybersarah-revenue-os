import { z } from "zod";

const secret = z.string().trim().min(32, "muss mindestens 32 Zeichen lang sein");
const optionalSecret = z.string().trim().min(32).optional();

const runtimeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().trim().url().refine((value) => /^postgres(ql)?:\/\//i.test(value), "muss eine PostgreSQL-URL sein").optional(),
  DEPLOY_TOKEN: optionalSecret,
  JWT_SECRET: optionalSecret,
  SESSION_SECRET: optionalSecret,
  STRIPE_SECRET_KEY: z.string().trim().min(1).optional(),
  OPENAI_API_KEY: z.string().trim().min(1).optional(),
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  GOOGLE_GEMINI_KEY: z.string().trim().min(1).optional(),
  ENABLE_AUTO_PUBLISHING: z.enum(["true", "false"]).default("false"),
  PUBLISHING_PROVIDER_MODE: z.enum(["live", "mock"]).default("live"),
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;

function productionIssues(env: RuntimeEnv): string[] {
  const issues: string[] = [];
  if (!env.DATABASE_URL) issues.push("DATABASE_URL");
  if (!env.DEPLOY_TOKEN) issues.push("DEPLOY_TOKEN");
  if (!env.JWT_SECRET && !env.SESSION_SECRET) issues.push("JWT_SECRET oder SESSION_SECRET");
  if (!env.STRIPE_SECRET_KEY) issues.push("STRIPE_SECRET_KEY");
  if (!env.OPENAI_API_KEY && !env.GEMINI_API_KEY && !env.GOOGLE_GEMINI_KEY) issues.push("OPENAI_API_KEY oder GEMINI_API_KEY");
  if (env.ENABLE_AUTO_PUBLISHING === "true" && env.PUBLISHING_PROVIDER_MODE === "mock") issues.push("ENABLE_AUTO_PUBLISHING darf nicht mit PUBLISHING_PROVIDER_MODE=mock kombiniert werden");
  return issues;
}

export function loadRuntimeEnv(source: NodeJS.ProcessEnv = process.env): RuntimeEnv {
  const parsed = runtimeEnvSchema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).filter(Boolean);
    throw new Error(`Ungültige Runtime-Konfiguration: ${[...new Set(fields)].join(", ")}`);
  }

  const env = parsed.data;
  if (env.NODE_ENV === "production") {
    const issues = productionIssues(env);
    if (issues.length > 0) throw new Error(`Production-Konfiguration unvollständig: ${issues.join(", ")}`);
  }
  return env;
}

export function assertRuntimeEnv(): RuntimeEnv {
  const env = loadRuntimeEnv();
  if (env.NODE_ENV !== "production") {
    const issues = productionIssues(env);
    if (issues.length > 0) console.warn(`Nicht-Production-Konfiguration: ${issues.join(", ")}`);
  }
  return env;
}
