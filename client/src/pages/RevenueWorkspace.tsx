import { Button } from "@/components/ui/button";
import { RevenueQueryError } from "@/components/RevenueFeedback";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import React from "react";

export default function RevenueWorkspace() {
  const utils = trpc.useUtils();
  const overview = trpc.revenue.overview.useQuery();
  const initialize = trpc.revenue.initialize.useMutation({ onSuccess: () => void utils.revenue.overview.invalidate() });

  if (overview.isLoading) return <div className="cyber-panel flex items-center gap-3 p-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Arbeitsbereich wird geladen …</div>;
  if (overview.isError) return <RevenueQueryError subject="Der Arbeitsbereich" />;
  if (!overview.data?.workspace) return <section className="cyber-panel max-w-2xl p-6"><Sparkles className="h-6 w-6 text-cyan-200" /><h1 className="mt-4 text-2xl font-semibold text-white">Revenue Workspace einrichten</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Die Einrichtung legt Ihren privaten Revenue-Arbeitsbereich sowie interne, nicht autonom ausführende Agenten an.</p><Button className="mt-5 bg-cyan-300 text-slate-950 hover:bg-cyan-200" disabled={initialize.isPending} onClick={() => initialize.mutate()}>{initialize.isPending ? "Einrichtung läuft …" : "Arbeitsbereich einrichten"}</Button></section>;

  const { workspace, agents, pendingApprovals, latestAudit } = overview.data;
  return <div className="space-y-5"><section className="cyber-panel p-6"><p className="mono text-[10px] tracking-[0.18em] text-cyan-200">WORKSPACE // {workspace.status.toUpperCase()}</p><h1 className="mt-2 text-3xl font-bold text-white">{workspace.name}</h1><p className="mt-2 text-sm text-muted-foreground">Ihr persönlicher Kontrollraum mit verbindlicher Freigabegrenze für externe Aktionen.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Interne Agenten" value={agents.length} /><Metric label="Aktiviert" value={agents.filter(agent => agent.enabled).length} /><Metric label="Freigaben" value={pendingApprovals} /></div></section><section className="cyber-panel p-6"><h2 className="text-lg font-semibold text-white">Letzte Betriebsbewertung</h2>{latestAudit ? <div className="mt-4 rounded-xl border border-border/60 bg-background/30 p-4"><p className="text-sm font-medium text-white">{latestAudit.summary}</p><p className="mt-2 text-xs text-muted-foreground">Bewertung: {latestAudit.score}/100</p></div> : <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Noch keine persistierte Betriebsbewertung vorhanden.</div>}</section></div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-border/60 bg-background/30 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-semibold text-white">{value}</p></div>; }
