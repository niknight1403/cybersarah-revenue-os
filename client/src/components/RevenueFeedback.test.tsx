import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { RevenueMutationError, RevenueQueryError } from "./RevenueFeedback";

describe("RevenueFeedback", () => {
  it("rendert eine zugängliche Query-Fehlermeldung für Revenue-Ansichten", () => {
    const markup = renderToStaticMarkup(<RevenueQueryError subject="Agentenkonfiguration" />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Agentenkonfiguration konnte nicht geladen werden");
  });

  it("rendert eine zugängliche Mutations-Fehlermeldung für Freigabeentwürfe", () => {
    const markup = renderToStaticMarkup(<RevenueMutationError action="Der Freigabeentwurf" />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Der Freigabeentwurf konnte nicht gespeichert werden");
  });
});
