import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import HaraOnboarding from "./HaraOnboarding";

describe("HARA onboarding", () => {
  it("zeigt den ersten von drei approval-first Schritten", () => {
    const html = renderToStaticMarkup(<HaraOnboarding />);
    expect(html).toContain("SCHRITT 1 / 3");
    expect(html).toContain("HARA sicher einrichten");
    expect(html).toContain("bis zur expliziten Einzel-Freigabe blockiert");
  });
});
