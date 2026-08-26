import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  experiment: { data: { experimentId: 7, experimentType: "headline", variant: { key: "variant", value: "Revenue Operations, die nachvollziehbar wachsen" } } } as any,
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: null, loading: false, isAuthenticated: false, logout: vi.fn() }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ revenue: { overview: { invalidate: vi.fn() } } }),
    app: {
      info: { useQuery: () => ({ data: { title: "CyberSarah Revenue OS" } }) },
      tracking: { useQuery: () => ({ data: { key: "f1ce1bc2-bd0b-4ab3-b684-dc8a9a90e856" } }) },
      experimentVariant: { useQuery: () => state.experiment },
    },
    revenue: {
      overview: { useQuery: () => ({ data: null }) },
      initialize: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      setAgentEnabled: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      createApprovalDraft: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
    },
  },
}));

import RevenueHome from "./RevenueHome";

describe("RevenueHome headline experiment", () => {
  it("spielt eine aktive Headline-Variante im öffentlichen Landingpage-Flow aus", () => {
    const markup = renderToStaticMarkup(<RevenueHome />);
    expect(markup).toContain("Revenue Operations, die nachvollziehbar wachsen");
    expect(markup).not.toContain(">CyberSarah Revenue OS</h1>");
    expect(markup).toContain("Verbindungen mit Freigabegrenze");
    expect(markup).toContain("Providerfreigabe erforderlich");
    expect(markup).toContain("Zahlungen, Nachrichten, Posts und Veröffentlichungen bleiben bis zur expliziten Einzel-Freigabe blockiert.");
  });
});
