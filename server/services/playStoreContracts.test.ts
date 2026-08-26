import { describe, expect, it } from "vitest";
import { classifyRevenueCatEvent } from "./playStoreContracts";

describe("Play Store contracts", () => {
  it("klassifiziert RevenueCat-Events ohne externe Entitlement-Wirkung", () => {
    expect(classifyRevenueCatEvent({ event: { type: "RENEWAL" } })).toMatchObject({ type: "RENEWAL", status: "accepted_for_review", approvalRequired: true, externalExecution: false });
  });

  it("ordnet unbekannte RevenueCat-Events sicher ein", () => {
    expect(classifyRevenueCatEvent({ event: { type: "UNKNOWN" } }).type).toBe("UNCATEGORIZED");
  });
});
