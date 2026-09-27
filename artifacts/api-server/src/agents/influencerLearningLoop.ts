import type { WinnerDecision } from "./influencerExperimentWinner";

export interface LearningState {
  preferredHooks: string[];
  preferredPlatforms: string[];
  observations: number;
}

export interface LearningUpdate {
  state: LearningState;
  actions: string[];
}

export function updateLearningState(
  state: LearningState,
  winner: WinnerDecision,
  context: { hook?: string; platform?: string },
): LearningUpdate {
  const actions: string[] = [];
  const next: LearningState = {
    preferredHooks: [...state.preferredHooks],
    preferredPlatforms: [...state.preferredPlatforms],
    observations: state.observations + (winner.winnerId && winner.confidence === "strong" ? 1 : 0),
  };

  if (winner.winnerId && winner.confidence === "strong") {
    if (context.hook && !next.preferredHooks.includes(context.hook)) {
      next.preferredHooks.unshift(context.hook);
      next.preferredHooks = next.preferredHooks.slice(0, 5);
      actions.push("Gewinner-Hook in Lernprofil aufgenommen.");
    }
    if (context.platform && !next.preferredPlatforms.includes(context.platform)) {
      next.preferredPlatforms.unshift(context.platform);
      next.preferredPlatforms = next.preferredPlatforms.slice(0, 3);
      actions.push("Gewinner-Plattform in Lernprofil aufgenommen.");
    }
  }

  return { state: next, actions };
}
