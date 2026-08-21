import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  overview: {
    isError: false,
    data: {
      workspace: { id: 19, name: "Revenue Workspace" },
      approvalActions: [{
        id: 3,
        actionType: "seo_landing_draft",
        target: "SEO-Landingpage-Entwurf",
        payload: {
          externalExecution: false,
          consentRequired: true,
          recommendation: "Checkout-Abbrüche erkannt.",
          content: { title: "Revenue Operations ohne blinde Automatisierung", sections: ["Funnel-Reibung sichtbar machen"] },
        },
      }],
    },
  } as any,
  mutation: { isPending: false, isError: false, mutate: vi.fn() },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ revenue: { overview: { invalidate: vi.fn() } } }),
    revenue: {
      overview: { useQuery: () => state.overview },
      createApprovalDraft: { useMutation: () => state.mutation },
    },
  },
}));

import RevenueApprovals from "./RevenueApprovals";

describe("RevenueApprovals growth draft content", () => {
  it("zeigt konkreten Growth-Inhalt und seine Freigabegrenzen an", () => {
    const markup = renderToStaticMarkup(<RevenueApprovals />);
    expect(markup).toContain("Revenue Operations ohne blinde Automatisierung");
    expect(markup).toContain("Funnel-Reibung sichtbar machen");
    expect(markup).toContain("Einwilligung erforderlich");
    expect(markup).toContain("Externe Ausführung gesperrt");
    expect(markup).toContain("Freigabe ausstehend");
  });
});
