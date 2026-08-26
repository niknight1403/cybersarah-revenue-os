import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ compliance: { status: { invalidate: vi.fn() } }, revenue: { overview: { invalidate: vi.fn() } } }),
    revenue: { overview: { useQuery: () => ({ isLoading: false, isError: false, data: { workspace: { id: 5 }, approvalActions: [] } }) } },
    compliance: { status: { useQuery: () => ({ isLoading: false, isError: false, data: { is21Verified: false, vaultAccess: false, verificationMethod: null, hasProviderSetupRequest: false } }) }, requestVerificationProviderSetup: { useMutation: () => ({ isPending: false, isError: false, mutate: vi.fn() }) } },
  },
}));

import ComplianceCenter from "./ComplianceCenter";

describe("ComplianceCenter", () => {
  it("zeigt einen gesperrten Status und ausschließlich eine providerneutrale Entwurfsvorbereitung", () => {
    const markup = renderToStaticMarkup(<Router ssrPath="/compliance"><ComplianceCenter /></Router>);
    expect(markup).toContain("21+ Status nicht bestätigt");
    expect(markup).toContain("Provider-Setup als Entwurf");
    expect(markup).toContain("speichert keine Ausweiskopien");
  });
});
