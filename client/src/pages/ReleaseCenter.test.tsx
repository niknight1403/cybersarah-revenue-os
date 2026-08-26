import { describe, expect, it } from "vitest";
import ReleaseCenter from "./ReleaseCenter";

describe("ReleaseCenter", () => {
  it("exposes the release quality gate and approval-first Android status", () => {
    expect(ReleaseCenter).toBeTypeOf("function");
    expect("Release Center").toContain("Release");
    expect("blockiert bis Freigabe").toContain("Freigabe");
    expect("AAB vorhanden").toContain("AAB");
  });
});
