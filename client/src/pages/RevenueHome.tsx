import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowRight, Bot, CircleDollarSign, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

const operatingAreas = [
  {
    title: "Revenue Intelligence",
    description: "Umsatzquellen, Attribution und Entscheidungen werden nachvollziehbar zusammengeführt.",
    icon: CircleDollarSign,
  },
  {
    title: "Governance & Freigabe",
    description: "Externe, finanzielle und veröffentlichende Aktionen bleiben explizit freigabepflichtig.",
    icon: ShieldCheck,
  },
  {
    title: "AI Operations",
    description: "Automatisierung wird als überprüfbarer Entwurf und nicht als unkontrollierte Ausführung geführt.",
    icon: Bot,
  },
];

export default function RevenueHome() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [draftActionType, setDraftActionType] = useState("Campaign review");
  const [draftTarget, setDraftTarget] = useState("");
  const appInfo = trpc.app.info.useQuery();
  const overview = trpc.revenue.overview.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const initializeWorkspace = trpc.revenue.initialize.useMutation({
    onSuccess: () => void utils.revenue.overview.invalidate(),
  });
  const setAgentEnabled = trpc.revenue.setAgentEnabled.useMutation({
    onSuccess: () => void utils.revenue.overview.invalidate(),
  });
  const createApprovalDraft = trpc.revenue.createApprovalDraft.useMutation({
    onSuccess: () => {
      setDraftTarget("");
      void utils.revenue.overview.invalidate();
    },
  });
  const title = appInfo.data?.title ?? "CyberSarah Revenue OS";

  return (
    <main className="cyber-grid min-h-screen pb-14 pt-6 sm:pt-10">
      <div className="container">
        <header className="cyber-panel flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mono text-[10px] font-semibold tracking-[0.22em] text-cyan-200">COMMAND CENTER // REVENUE OPERATIONS</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Der konsolidierte Kontrollraum für nachvollziehbare Umsatzprozesse, verantwortungsvolle Automatisierung und operative Freigaben.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {isAuthenticated ? (
              <>
                <div className="cyber-status-ready flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  Angemeldet als {user?.name ?? "Nutzer"}
                </div>
                <Button variant="outline" onClick={() => void logout()} disabled={loading}>Abmelden</Button>
              </>
            ) : (
              <Button onClick={() => window.location.assign(getLoginUrl())} disabled={loading} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                Mit Manus anmelden <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-3" aria-label="Betriebsbereiche">
          {operatingAreas.map(({ title: areaTitle, description, icon: Icon }) => (
            <article key={areaTitle} className="cyber-panel p-5 sm:p-6">
              <Icon className="h-5 w-5 text-cyan-200" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-white">{areaTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
          <article className="cyber-panel p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-200" />
              <h2 className="text-lg font-semibold text-white">Systemstatus</h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4">
                <p className="mono text-[10px] tracking-[0.14em] text-cyan-200">APPLICATION</p>
                <p className="mt-2 text-sm font-medium text-white">{appInfo.isLoading ? "Prüfung läuft" : appInfo.isError ? "Prüfung fehlgeschlagen" : "Bereit"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Konfiguration wird über den sicheren Anwendungsendpunkt validiert.</p>
              </div>
              <div className="rounded-xl border border-violet-300/15 bg-violet-300/[0.04] p-4">
                <p className="mono text-[10px] tracking-[0.14em] text-violet-200">DATA GOVERNANCE</p>
                <p className="mt-2 text-sm font-medium text-white">{isAuthenticated && overview.data?.workspace ? "Arbeitsbereich bereit" : "Freigabe zuerst"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{isAuthenticated && overview.data?.workspace ? `${overview.data.pendingApprovals} ausstehende Freigaben im persönlichen Arbeitsbereich.` : "Keine Live-Zahlungen, Publikationen oder Kontakte ohne expliziten Freigabefluss."}</p>
              </div>
            </div>
          </article>

          <aside className="cyber-panel p-5 sm:p-6">
            <Sparkles className="h-5 w-5 text-violet-200" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-white">Konsolidierungsstatus</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Die Fullstack-Basis, das sichere Laufzeitmodell und die Qualitätssicherung aus den Revenue-OS-Repositories werden schrittweise zusammengeführt.
            </p>
            <div className="cyber-status-pending mt-5 rounded-xl p-3 text-xs leading-5">
              {isAuthenticated && !overview.isLoading && !overview.data?.workspace ? (
                <Button size="sm" disabled={initializeWorkspace.isPending} onClick={() => initializeWorkspace.mutate()} className="bg-violet-300 text-slate-950 hover:bg-violet-200">
                  Persönlichen Arbeitsbereich einrichten
                </Button>
              ) : "Datenmodelle und externe Provider bleiben bis zur migrationssicheren Übernahme deaktiviert."}
            </div>
          </aside>
        </section>

        {isAuthenticated && overview.data?.workspace && (
          <section className="mt-6 grid gap-4 lg:grid-cols-[1.45fr_1fr]" aria-label="Persönlicher Revenue-Arbeitsbereich">
            <article className="cyber-panel p-5 sm:p-6">
              <p className="mono text-[10px] tracking-[0.16em] text-cyan-200">WORKSPACE // {overview.data.workspace.status.toUpperCase()}</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{overview.data.workspace.name}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3"><p className="text-xs text-muted-foreground">Agenten</p><p className="mt-1 text-2xl font-semibold text-white">{overview.data.agents.length}</p></div>
                <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-3"><p className="text-xs text-muted-foreground">Aktiviert</p><p className="mt-1 text-2xl font-semibold text-white">{overview.data.agents.filter(agent => agent.enabled).length}</p></div>
                <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3"><p className="text-xs text-muted-foreground">Freigaben</p><p className="mt-1 text-2xl font-semibold text-white">{overview.data.pendingApprovals}</p></div>
              </div>
              <div className="mt-5 space-y-2">
                {overview.data.agents.map(agent => (
                  <div key={agent.id} className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/30 p-3">
                    <div><p className="text-sm font-medium text-white">{agent.name}</p><p className="mono mt-1 text-[10px] text-muted-foreground">{agent.status.toUpperCase()}</p></div>
                    <Button size="sm" variant="outline" disabled={setAgentEnabled.isPending} onClick={() => setAgentEnabled.mutate({ agentId: agent.id, enabled: !agent.enabled })}>{agent.enabled ? "Pausieren" : "Aktivieren"}</Button>
                  </div>
                ))}
              </div>
            </article>
            <aside className="cyber-panel p-5 sm:p-6">
              <p className="mono text-[10px] tracking-[0.16em] text-violet-200">GOVERNANCE // QUEUE</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Ausstehende Freigaben</h2>
              {overview.data.approvalActions.length ? <div className="mt-4 space-y-2">{overview.data.approvalActions.map(action => <div key={action.id} className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-3"><p className="text-sm font-medium text-white">{action.actionType}</p><p className="mt-1 truncate text-xs text-muted-foreground">{action.target}</p></div>)}</div> : <p className="mt-4 text-sm leading-6 text-muted-foreground">Keine ausstehenden Anfragen. Neue externe Abläufe werden ausschließlich als freigabepflichtige Entwürfe angelegt.</p>}
              <form className="mt-5 space-y-2 border-t border-border/60 pt-4" onSubmit={event => { event.preventDefault(); if (draftTarget.trim()) createApprovalDraft.mutate({ actionType: draftActionType, target: draftTarget.trim(), payload: { source: "manual_workspace_draft" } }); }}>
                <label className="block text-xs text-muted-foreground" htmlFor="draft-type">Entwurfsart</label>
                <input id="draft-type" className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground" value={draftActionType} onChange={event => setDraftActionType(event.target.value)} maxLength={100} required />
                <label className="block text-xs text-muted-foreground" htmlFor="draft-target">Ziel / Kontext</label>
                <input id="draft-target" className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground" value={draftTarget} onChange={event => setDraftTarget(event.target.value)} minLength={2} maxLength={240} required placeholder="z. B. Kampagne Q4" />
                <Button type="submit" className="w-full bg-amber-300 text-slate-950 hover:bg-amber-200" disabled={createApprovalDraft.isPending}>Als Freigabeentwurf anlegen</Button>
              </form>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
