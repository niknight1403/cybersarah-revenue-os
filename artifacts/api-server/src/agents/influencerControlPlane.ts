export type AutopilotState = "ready" | "degraded" | "blocked";

export interface ControlPlaneInput {
  trendScore: number;
  evidencePublishable: boolean;
  qualityScore: number;
  scheduleCount: number;
  measuredWinner: boolean;
  revenueAllowed: boolean;
}

export interface ControlPlaneSnapshot extends ControlPlaneInput {
  state: AutopilotState;
  blockers: string[];
  nextActions: string[];
}

export function buildControlPlaneSnapshot(input: ControlPlaneInput): ControlPlaneSnapshot {
  const blockers: string[] = [];
  const nextActions: string[] = [];

  if (input.trendScore < 50) blockers.push("Trendchance zu schwach.");
  if (!input.evidencePublishable) blockers.push("Evidenz-/Health-Gate blockiert.");
  if (input.qualityScore < 70) blockers.push("Qualitäts-Gate nicht bestanden.");
  if (!input.revenueAllowed) blockers.push("Revenue-Guard blockiert bezahlte Skalierung.");
  if (input.scheduleCount === 0) nextActions.push("Posting-Slots erzeugen.");
  if (!input.measuredWinner) nextActions.push("Varianten erst messen, dann skalieren.");

  const state: AutopilotState =
    blockers.length > 0
      ? "blocked"
      : blockers.length > 0 || nextActions.length > 0
        ? "degraded"
        : "ready";

  return { ...input, state, blockers, nextActions };
}
