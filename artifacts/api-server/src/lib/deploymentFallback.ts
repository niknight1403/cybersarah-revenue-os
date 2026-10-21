export type DeploymentProviderId = "render" | "koyeb" | "vercel" | "hetzner";

export interface DeploymentProvider {
  id: DeploymentProviderId;
  free: boolean;
  supportsNodeExpress: boolean;
  supportsEuRegion: boolean;
  supportsHealthChecks: boolean;
  supportsPersistentProcess: boolean;
  requiresExternalCredentials: boolean;
  notes: string[];
}

export interface DeploymentFailureSignal {
  provider: DeploymentProviderId | string;
  context?: string;
  reason?: string;
  status?: string;
}

export interface DeploymentFallbackDecision {
  currentProvider: string;
  shouldFailover: boolean;
  selectedProvider: DeploymentProviderId | null;
  candidates: DeploymentProvider[];
  reason: string;
  requiresCredentials: boolean;
}

export const DEPLOYMENT_PROVIDERS: DeploymentProvider[] = [
  { id: "render", free: true, supportsNodeExpress: true, supportsEuRegion: true, supportsHealthChecks: true, supportsPersistentProcess: true, requiresExternalCredentials: true, notes: ["Free Web Service verfügbar.", "Express/Node kompatibel.", "Free Services können bei Inaktivität schlafen.", "Keine kostenpflichtige Instanz automatisch auswählen."] },
  { id: "koyeb", free: true, supportsNodeExpress: true, supportsEuRegion: true, supportsHealthChecks: true, supportsPersistentProcess: true, requiresExternalCredentials: true, notes: ["Free Instance verfügbar.", "Frankfurt als Free-Region geeignet.", "Kann bei Inaktivität auf null skalieren.", "Keine kostenpflichtige Instanz automatisch auswählen."] },
  { id: "vercel", free: true, supportsNodeExpress: false, supportsEuRegion: true, supportsHealthChecks: true, supportsPersistentProcess: false, requiresExternalCredentials: true, notes: ["Gut für Frontend/Functions, nicht bevorzugt für dauerhaft laufende Agentenprozesse."] },
  { id: "hetzner", free: false, supportsNodeExpress: true, supportsEuRegion: true, supportsHealthChecks: true, supportsPersistentProcess: true, requiresExternalCredentials: true, notes: ["Technisch geeignet, aber nicht als kostenloser Auto-Fallback auswählbar."] },
];

const PROVIDER_PREFERENCE: Record<DeploymentProviderId, number> = {
  render: 4,
  koyeb: 3,
  vercel: 2,
  hetzner: 1,
};

function scoreProvider(provider: DeploymentProvider): number {
  let score = 0;
  if (provider.free) score += 50;
  if (provider.supportsNodeExpress) score += 20;
  if (provider.supportsEuRegion) score += 10;
  if (provider.supportsHealthChecks) score += 10;
  if (provider.supportsPersistentProcess) score += 10;
  return score;
}

export function selectFreeDeploymentFallback(
  signal: DeploymentFailureSignal,
  providers: DeploymentProvider[] = DEPLOYMENT_PROVIDERS,
): DeploymentFallbackDecision {
  const failureText = `${signal.context ?? ""} ${signal.reason ?? ""} ${signal.status ?? ""}`.toLowerCase();
  const looksLikeFailure =
    /fail|error|limit|quota|rate|resource|suspend|unavailable|exhaust/i.test(failureText) ||
    signal.status?.toLowerCase() === "failure";

  const candidates = providers
    .filter((p) => p.id !== signal.provider)
    .filter((p) => p.free && p.supportsNodeExpress && p.supportsHealthChecks)
    .sort((a, b) =>
      scoreProvider(b) - scoreProvider(a) ||
      PROVIDER_PREFERENCE[b.id] - PROVIDER_PREFERENCE[a.id] ||
      a.id.localeCompare(b.id)
    );

  const selectedProvider = looksLikeFailure ? candidates[0]?.id ?? null : null;

  return {
    currentProvider: signal.provider,
    shouldFailover: looksLikeFailure && selectedProvider !== null,
    selectedProvider,
    candidates,
    reason: selectedProvider
      ? `Deployment-Fehler bei ${signal.provider} erkannt; kostenloser kompatibler Fallback: ${selectedProvider}.`
      : looksLikeFailure
        ? "Deployment-Fehler erkannt, aber kein kostenloser kompatibler Fallback verfügbar."
        : "Kein belastbares Deployment-Fehlersignal erkannt.",
    requiresCredentials: selectedProvider
      ? Boolean(candidates.find((p) => p.id === selectedProvider)?.requiresExternalCredentials)
      : false,
  };
}

export function buildHealthCheckUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/api/healthz`;
}

export function isSafeFreeProvider(providerId: string): boolean {
  const provider = DEPLOYMENT_PROVIDERS.find((p) => p.id === providerId);
  return Boolean(provider?.free && provider.supportsNodeExpress);
}
