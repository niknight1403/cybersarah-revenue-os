import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ loading: false, user: null }) }));

import DashboardLayout from "./DashboardLayout";

describe("Autonomie-Routenschutz", () => {
  it("blockiert die gemeinsame Dashboard-Hülle ohne Sitzung vor allen geschützten Autonomie-Routen", () => {
    const markup = renderToStaticMarkup(<DashboardLayout><main>Interner HARA-Inhalt</main></DashboardLayout>);
    expect(markup).toContain("Anmeldung erforderlich");
    expect(markup).toContain("Mit Manus anmelden");
    expect(markup).not.toContain("Interner HARA-Inhalt");
  });
});
