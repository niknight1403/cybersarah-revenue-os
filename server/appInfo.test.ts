import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { headers: {}, protocol: "https" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("app.info", () => {
  it("stellt den konfigurierten CyberSarah-Produkttitel bereit", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.app.info()).resolves.toEqual({
      title: "CyberSarah Revenue OS",
      product: "revenue-os",
    });
  });
});
