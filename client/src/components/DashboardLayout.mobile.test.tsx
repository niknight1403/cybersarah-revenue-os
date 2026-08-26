import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ loading: false, logout: vi.fn(), user: { name: "Mobile User", email: "mobile@example.com" } }) }));
vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => true }));

import DashboardLayout from "./DashboardLayout";

describe("mobile Compliance-Schnellnavigation", () => {
  it("rendert den zugänglichen Compliance-Schnelleinstieg im mobilen Header", () => {
    const markup = renderToStaticMarkup(<Router ssrPath="/hara"><DashboardLayout><main>Geschützter Inhalt</main></DashboardLayout></Router>);
    expect(markup).toContain('aria-label="Compliance öffnen"');
  });
});
