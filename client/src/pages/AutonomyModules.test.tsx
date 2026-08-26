import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  overview: {
    isLoading: false,
    isError: false,
    data: {
      workspace: { id: 19, name: "Autonomy Workspace", status: "active" },
      agents: [{ id: 1, name: "SEO & Landing Architect", enabled: true, status: "active" }, { id: 2, name: "Outreach Drafting Agent", enabled: false, status: "paused" }],
      pendingApprovals: 1,
      approvalActions: [{ id: 4, actionType: "outreach_draft", target: "Founder campaign", payload: { externalExecution: false, content: { socialCopy: "Auditierbare Revenue-Automation für Gründerinnen" } }, status: "needs_approval", createdAt: new Date() }],
      latestAudit: { id: 12, summary: "Freigabe-Queue geprüft", score: 84, createdAt: new Date("2026-08-21T07:00:00.000Z") },
    },
  } as any,
  growth: {
    isLoading: false,
    isError: false,
    data: { metrics: { checkoutStarted: 4, paymentFailures: 0 }, experiments: [{ id: 7, name: "CTA-Test", experimentType: "cta", status: "needs_approval" }], retention: [] },
  } as any,
  mutation: { isPending: false, isError: false, mutate: vi.fn() },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ revenue: { overview: { invalidate: vi.fn() } }, monetization: { overview: { invalidate: vi.fn() } } }),
    revenue: { overview: { useQuery: () => state.overview }, createApprovalDraft: { useMutation: () => state.mutation } },
    growth: { status: { useQuery: () => state.growth } },
    monetization: { overview: { useQuery: () => ({ isLoading: false, isError: false, data: { currency: "EUR", totalCents: 0, sources: [{ source: "Stripe", status: "disabled", amountCents: 0 }, { source: "Affiliate", status: "not_connected", amountCents: null }] } }) }, createDraft: { useMutation: () => state.mutation } },
  },
}));

import HaraCenter from "./HaraCenter";
import InfluenceCenter, { buildInfluenceDraft } from "./InfluenceCenter";
import AutonomyTasks from "./AutonomyTasks";
import ProductMarketing, { buildProductMarketingDraft } from "./ProductMarketing";
import { MOBILE_AUTONOMY_NAV, MOBILE_UTILITY_NAV } from "@/components/DashboardLayout";

const render = (node: React.ReactElement) => renderToStaticMarkup(<Router ssrPath="/hara">{node}</Router>);

describe("mobile Autonomie-Module", () => {
  it("zeigt HARA als auditierten autonomen Kontrollkern", () => {
    const markup = render(<HaraCenter />);
    expect(markup).toContain("HARA // HUMAN-AUDITED REVENUE AUTONOMY");
    expect(markup).toContain("Freigabe-Queue bereinigen");
    expect(markup).toContain("AUDIT #12");
  });

  it("stellt KI-Influence und Produktvermarktung als Entwurfs-Workflows bereit", () => {
    const influence = render(<InfluenceCenter />);
    expect(influence).toContain("KI INFLUENCE // DRAFT-ONLY");
    expect(influence).toContain("Auditierbare Revenue-Automation für Gründerinnen");
    expect(render(<ProductMarketing />)).toContain("PRODUCT MARKETING // APPROVAL FIRST");
    expect(render(<ProductMarketing />)).toContain("EARNINGS // READ ONLY");
  });

  it("priorisiert echte Freigaben, pausierte Agenten und Experimententwürfe als Tasks", () => {
    const markup = render(<AutonomyTasks />);
    expect(markup).toContain("Freigabe prüfen: outreach_draft");
    expect(markup).toContain("Agent bewerten: Outreach Drafting Agent");
    expect(markup).toContain("Experiment prüfen: CTA-Test");
  });

  it("enthält alle fünf fingerfreundlichen Kernmodule in der mobilen Navigation", () => {
    expect(MOBILE_AUTONOMY_NAV.map(item => item.label)).toEqual(["HARA", "KI Influence", "Tasks", "Vermarktung", "Growth"]);
    expect(MOBILE_UTILITY_NAV).toEqual(expect.arrayContaining([expect.objectContaining({ label: "Compliance", path: "/compliance" })]));
  });

  it("erzeugt Influence- und Produktmarketing-Inputs ausschließlich als gesperrte Freigabeentwürfe", () => {
    expect(buildInfluenceDraft("Gründerinnen mit Bedarf an nachvollziehbarer Revenue-Automation")).toMatchObject({ payload: { externalExecution: false, consentRequired: true } });
    expect(buildProductMarketingDraft("Revenue OS Pro", "Mehr Kontrolle für auditierbares Wachstum")).toMatchObject({ payload: { externalExecution: false, content: { guardrail: expect.stringContaining("keine automatische") } } });
  });
});
