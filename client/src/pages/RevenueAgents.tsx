import { Button } from "@/components/ui/button";
import { RevenueQueryError } from "@/components/RevenueFeedback";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Bot, Loader2 } from "lucide-react";
import React from "react";

export default function RevenueAgents() {
  const utils = trpc.useUtils();
  const overview = trpc.revenue.overview.useQuery();
  const setEnabled = trpc.revenue.setAgentEnabled.useMutation({ onSuccess: () => void utils.revenue.overview.invalidate() });
  if (overview.isLoading) return <div className="cyber-panel flex items-center gap-3 p-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Agentenkonfiguration wird geladen …</div>;
  if (overview.isError) return <RevenueQueryError subject="Die Agentenkonfiguration" />;
  if (!overview.data?.workspace) return <div className="cyber-panel p-6 text-muted-foreground">Richten Sie zuerst im Workspace einen Revenue-Arbeitsbereich ein.</div>;
  return <section className="cyber-panel p-6"><p className="mono text-[10px] tracking-[0.18em] text-cyan-200">AGENT OPS // INTERNAL ONLY</p><h1 className="mt-2 text-3xl font-bold text-white">Revenue-Agenten</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Agenten bereiten interne Analysen vor. Sie lösen keine externen, finanziellen oder veröffentlichenden Aktionen aus.</p><div className="mt-6 space-y-3">{overview.data.agents.map(agent => <div key={agent.id} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/30 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Bot className="h-5 w-5 text-cyan-200" /><div><p className="font-medium text-white">{agent.name}</p><p className="mono mt-1 text-[10px] text-muted-foreground">{agent.status.toUpperCase()}</p></div></div><Button variant="outline" disabled={setEnabled.isPending} onClick={() => setEnabled.mutate({ agentId: agent.id, enabled: !agent.enabled })}>{agent.enabled ? "Pausieren" : "Aktivieren"}</Button></div>)}</div></section>;
}
