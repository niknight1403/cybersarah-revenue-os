import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/trpc", () => ({ trpc: { growth: { status: { useQuery: () => ({ isLoading: false, isError: false, data: { workspace: { id: 1 }, metrics: { mrrCents: 10000, checkoutStarted: 4, checkoutCompleted: 1, paymentFailures: 0, cancellations: 0 } } }) } } } }));

import LoopIntelligence from "./LoopIntelligence";

describe("loop intelligence", () => {
  it("zeigt alle vier Loops mit Approval-first statt Full-Auto-External-Execution", () => {
    const html = renderToStaticMarkup(<LoopIntelligence />);
    expect(html).toContain("Viral Content &amp; DM-Sales");
    expect(html).toContain("Manuelle Freigabe");
    expect(html).toContain("Semi-Autopilot intern");
    expect(html).toContain("Blockiert ohne Freigabe");
    expect(html).not.toContain("Full-Auto Execution");
  });
});
