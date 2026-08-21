import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: { headers: {}, protocol: "https" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("revenue router", () => {
  it("schützt Übersicht und Initialisierung vor anonymem Zugriff", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());

    await expect(caller.revenue.overview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.revenue.initialize()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
