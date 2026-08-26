import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/trpc", () => ({ trpc: { account: { identityLinks: { useQuery: () => ({ isLoading: false, data: [] }) } } } }));

import AccountSettings from "./AccountSettings";

describe("account identity linking", () => {
  it("zeigt den sicheren Google-Linking-Start und keine Passwortfelder", () => {
    const html = renderToStaticMarkup(<AccountSettings />);
    expect(html).toContain("Google-Konto verknüpfen");
    expect(html).toContain("sicheren Navigationsschritt");
    expect(html).toContain("E-Mail-Übereinstimmung allein verknüpft kein Konto");
    expect(html).not.toContain("Passwort");
  });
});
