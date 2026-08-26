import { describe, expect, it } from "vitest";
import { appendMarketingDisclosure, buildMarketingDisclosure, buildMonetizationApprovalDraft } from "./marketingCompliance";

describe("Marketing-Compliance", () => {
  it("kombiniert KI-, Affiliate- und Sponsoring-Kennzeichnungen eindeutig", () => {
    expect(buildMarketingDisclosure({ affiliate: true, sponsored: true })).toBe("🤖 Posted by AI Agent | Affiliate Link | Sponsored Link");
  });

  it("ergänzt eine Kennzeichnung genau einmal", () => {
    const disclosure = buildMarketingDisclosure({ affiliate: true, sponsored: false });
    const once = appendMarketingDisclosure("Ein transparenter Entwurf", disclosure);
    expect(appendMarketingDisclosure(once, disclosure)).toBe(once);
  });

  it("erzeugt Affiliate-, Social- und Anzeigenaktionen ausschließlich als gesperrte Freigabeentwürfe", () => {
    const draft = buildMonetizationApprovalDraft({ channel: "affiliate", target: "Partnerseite", title: "Empfehlung", content: "Ein hilfreicher Entwurf", affiliate: true, sponsored: false });
    expect(draft).toMatchObject({ actionType: "affiliate_link_draft", payload: { externalExecution: false, consentRequired: true, providerConfigured: false, compliance: { affiliate: true, requiresHumanApproval: true } } });
    expect(draft.payload.content.body).toContain("🤖 Posted by AI Agent | Affiliate Link");
  });
});
