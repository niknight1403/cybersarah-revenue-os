import { describe, expect, it } from "vitest";
import { buildNotificationDraft } from "./notificationReadiness";

describe("notification readiness", () => {
  it("erstellt Sale-/Lead-/Video-Hinweise nur als freigabepflichtige Drafts", () => {
    const draft = buildNotificationDraft({ topic: "sale", title: "Neue Zahlung", body: "Eine Zahlung wurde intern erkannt." });
    expect(draft.provider).toBe("web_push_or_firebase");
    expect(draft.status).toBe("draft_only");
    expect(draft.providerConfigured).toBe(false);
    expect(draft.approvalRequired).toBe(true);
    expect(draft.externalExecution).toBe(false);
  });
});
