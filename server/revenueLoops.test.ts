import { describe, expect, it } from "vitest";
import { buildFacelessVideoDraft } from "./services/facelessVideoEngine";
import { buildProgrammaticSeoDraft } from "./services/programmaticSeoEngine";
import { buildLeadQualificationDraft } from "./services/leadArbitrageEngine";

describe("global revenue loop drafts", () => {
  it("creates a faceless video storyboard without upload execution", () => {
    expect(buildFacelessVideoDraft({ productName: "Revenue OS", benefit: "Auditierbares Wachstum", source: "approved_catalog", destination: "youtube_shorts" })).toMatchObject({ kind: "faceless_short_video_draft", status: "needs_approval", requiresApproval: true, externalExecution: false, uploadReady: false });
  });

  it("creates a source-bound SEO draft with disclosure and quality gates", () => {
    expect(buildProgrammaticSeoDraft({ topic: "Revenue Automation", source: "approved_source", affiliateUrl: "https://example.test/a" })).toMatchObject({ canonical: "/insights/revenue-automation", status: "needs_approval", publishReady: false, qualityGate: { factualReviewRequired: true, thinContentBlocked: true } });
  });

  it("keeps lead outreach blocked without consent evidence", () => {
    expect(buildLeadQualificationDraft({ companyName: "Example GmbH", domain: "example.test", source: "approved_directory", fitScore: 120 })).toMatchObject({ fitScore: 100, contactAllowed: false, crmWriteReady: false, externalExecution: false, consentEvidence: null });
  });
});
