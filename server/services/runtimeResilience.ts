export type RuntimeHealthStatus = {
  ok: boolean;
  status: "ready" | "draining";
  startedAt: string;
  timestamp: string;
};

export function createRuntimeHealthState(now: () => Date = () => new Date()) {
  const startedAt = now().toISOString();
  let draining = false;

  return {
    markDraining() {
      draining = true;
    },
    snapshot(): RuntimeHealthStatus {
      return {
        ok: !draining,
        status: draining ? "draining" : "ready",
        startedAt,
        timestamp: now().toISOString(),
      };
    },
  };
}

export const runtimeHealth = createRuntimeHealthState();
