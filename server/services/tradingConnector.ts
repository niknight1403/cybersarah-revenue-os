export type TradingMode = "dry_run" | "live" | "unconfigured";

export type TradingSnapshot = {
  connected: boolean;
  mode: TradingMode;
  roi: number | null;
  openTrades: number | null;
  strategy: string | null;
  liveExecution: false;
  externalExecution: false;
  approvalRequired: true;
  message: string;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function getTradingReadiness(env: NodeJS.ProcessEnv = process.env) {
  const baseUrl = env.FREQTRADE_API_URL?.trim() || "";
  const tokenConfigured = Boolean(env.FREQTRADE_API_TOKEN?.trim());
  const dryRun = env.FREQTRADE_DRY_RUN !== "false";
  return {
    configured: Boolean(baseUrl && tokenConfigured),
    baseUrl,
    tokenConfigured,
    dryRun,
    mode: !baseUrl || !tokenConfigured ? "unconfigured" as const : dryRun ? "dry_run" as const : "live" as const,
    liveExecution: false as const,
    approvalRequired: true as const,
  };
}

export function createTradingConnector(fetcher: FetchLike = fetch) {
  async function request(path: string, env: NodeJS.ProcessEnv = process.env) {
    const readiness = getTradingReadiness(env);
    if (!readiness.configured) throw new Error("Freqtrade ist nicht konfiguriert; kein externer Trading-Aufruf wurde ausgeführt.");
    const response = await fetcher(`${readiness.baseUrl.replace(/\/$/, "")}${path}`, { headers: { Authorization: `Bearer ${env.FREQTRADE_API_TOKEN}` } });
    if (!response.ok) throw new Error(`Freqtrade API antwortete mit HTTP ${response.status}.`);
    return response.json() as Promise<Record<string, unknown>>;
  }

  return {
    readiness: (env?: NodeJS.ProcessEnv) => getTradingReadiness(env),
    async snapshot(env?: NodeJS.ProcessEnv): Promise<TradingSnapshot> {
      const readiness = getTradingReadiness(env);
      if (!readiness.configured) return { connected: false, mode: "unconfigured", roi: null, openTrades: null, strategy: null, liveExecution: false, externalExecution: false, approvalRequired: true, message: "Dry-Run-Connector bereit; Freqtrade-URL und Token fehlen." };
      try {
        const [profit, status] = await Promise.all([request("/api/v1/profit", env), request("/api/v1/status", env)]);
        const trades = Array.isArray(status) ? status : [];
        return { connected: true, mode: readiness.mode, roi: typeof profit.profit_all_pct === "number" ? profit.profit_all_pct : null, openTrades: trades.length, strategy: typeof profit.strategy === "string" ? profit.strategy : null, liveExecution: false, externalExecution: false, approvalRequired: true, message: readiness.dryRun ? "Freqtrade verbunden; Dry-Run aktiv." : "Live-Modus erkannt, aber Ausführung bleibt durch Approval-Gate blockiert." };
      } catch (error) {
        return { connected: false, mode: readiness.mode, roi: null, openTrades: null, strategy: null, liveExecution: false, externalExecution: false, approvalRequired: true, message: error instanceof Error ? error.message : "Freqtrade-Status konnte nicht gelesen werden." };
      }
    },
    async start(env?: NodeJS.ProcessEnv) { throw new Error("Trading-Start ist im Revenue OS approval-first blockiert; zuerst muss ein expliziter Risk-/Admin-Approval-Workflow implementiert werden."); },
    async stop(env?: NodeJS.ProcessEnv) { throw new Error("Trading-Stop wird nicht automatisch ausgelöst; der Freqtrade-Prozess wird außerhalb des Revenue OS verwaltet."); },
  };
}
