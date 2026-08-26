export type NotificationTopic = "sale" | "lead" | "ai_video_ready";

export function buildNotificationDraft(input: { topic: NotificationTopic; title: string; body: string }) {
  return {
    topic: input.topic,
    title: input.title.trim(),
    body: input.body.trim(),
    provider: "web_push_or_firebase" as const,
    status: "draft_only" as const,
    providerConfigured: false,
    approvalRequired: true,
    externalExecution: false,
    guardrail: "Keine Push-Zustellung ohne echte Providerkonfiguration und explizite Freigabe.",
  };
}
