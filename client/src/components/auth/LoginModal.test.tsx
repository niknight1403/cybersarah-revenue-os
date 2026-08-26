import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: { auth: { providers: { useQuery: () => ({ data: { manus: true, google: true, microsoft: false }, isLoading: false }) } } },
}));

vi.mock("@/const", () => ({ getLoginUrl: () => "/api/oauth/callback" }));

import LoginModal from "./LoginModal";

describe("LoginModal", () => {
  it("zeigt verständliche Providerbuttons und deaktiviert nicht konfigurierte Microsoft-Anmeldung", () => {
    const markup = renderToStaticMarkup(<LoginModal />);
    expect(markup).toContain("Sicher anmelden");
    expect(markup).toContain("Mit Google anmelden");
    expect(markup).toContain("Mit Microsoft anmelden");
    expect(markup).toContain("disabled=\"\"");
    expect(markup).toContain("Passwörter werden von CyberSarah nicht gespeichert");
    expect(markup).toContain("Hilfe &amp; Support bei Login-Problemen");
    expect(markup).toContain("https://help.manus.im");
  });
});
