import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  overview: { isLoading: false, isError: false, data: null as any },
  info: { isLoading: false, isError: false, data: { title: "CyberSarah Revenue OS" } as any },
  mutation: { isPending: false, isError: false, mutate: vi.fn() },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ revenue: { overview: { invalidate: vi.fn() } } }),
    app: { info: { useQuery: () => state.info } },
    revenue: {
      overview: { useQuery: () => state.overview },
      initialize: { useMutation: () => state.mutation },
      setAgentEnabled: { useMutation: () => state.mutation },
      createApprovalDraft: { useMutation: () => state.mutation },
    },
  },
}));

import RevenueAgents from "./RevenueAgents";
import RevenueApprovals from "./RevenueApprovals";
import RevenueSystem from "./RevenueSystem";
import RevenueWorkspace from "./RevenueWorkspace";

const workspaceData = {
  workspace: { id: 1, name: "Test Workspace", status: "setup" },
  agents: [],
  pendingApprovals: 0,
  approvalActions: [],
  latestAudit: null,
};

describe("Revenue page error states", () => {
  beforeEach(() => {
    state.overview = { isLoading: false, isError: false, data: workspaceData };
    state.info = { isLoading: false, isError: false, data: { title: "CyberSarah Revenue OS" } };
    state.mutation = { isPending: false, isError: false, mutate: vi.fn() };
  });

  it("zeigt den Query-Fehler auf Workspace, Agenten und Freigaben seitenbezogen", () => {
    state.overview = { isLoading: false, isError: true, data: null };
    expect(renderToStaticMarkup(<RevenueWorkspace />)).toContain("Der Arbeitsbereich konnte nicht geladen werden");
    expect(renderToStaticMarkup(<RevenueAgents />)).toContain("Die Agentenkonfiguration konnte nicht geladen werden");
    expect(renderToStaticMarkup(<RevenueApprovals />)).toContain("Die Freigabequeue konnte nicht geladen werden");
  });

  it("zeigt den Query-Fehler auf der Systemstatusseite", () => {
    state.info = { isLoading: false, isError: true, data: null };
    expect(renderToStaticMarkup(<RevenueSystem />)).toContain("Die Systemkonfiguration konnte nicht geladen werden");
  });

  it("zeigt einen sichtbaren Mutationsfehler beim Speichern eines Freigabeentwurfs", () => {
    state.mutation = { isPending: false, isError: true, mutate: vi.fn() };
    expect(renderToStaticMarkup(<RevenueApprovals />)).toContain("Der Freigabeentwurf konnte nicht gespeichert werden");
  });
});

