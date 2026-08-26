import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("wouter", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import PlayStorePolicy from "./PlayStorePolicy";

describe("Play Store policy pages", () => {
  it("stellt öffentliche Datenschutz-, Bedingungen- und Löschpfade bereit", () => {
    expect(renderToStaticMarkup(<PlayStorePolicy kind="privacy" />)).toContain("Datenschutzerklärung");
    expect(renderToStaticMarkup(<PlayStorePolicy kind="terms" />)).toContain("Nutzungsbedingungen");
    expect(renderToStaticMarkup(<PlayStorePolicy kind="deletion" />)).toContain("Account- und Datenlöschung");
  });
});
