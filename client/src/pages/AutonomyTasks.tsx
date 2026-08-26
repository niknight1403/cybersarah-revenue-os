import { RevenueQueryError } from "@/components/RevenueFeedback";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckSquare, CircleAlert, ShieldCheck } from "lucide-react";
import React from "react";
import { useLocation } from "wouter";

type Task = { id: string; title: string; detail: string; priority: "hoch" | "mittel"; destination: string; state: string };
export type AutonomyCycleStatus = "idle" | "running" | "started" | "duplicate" | "failed";

export function autonomyCycleStatusCopy(status: AutonomyCycleStatus) {
  return { idle: "Bereit für den nächsten Start", running: "Autonomie-Zyklus läuft …", started: "Zyklus gestartet · Entwürfe werden geprüft", duplicate: "Heute bereits gestartet · kein zweiter Lauf ausgeführt", failed: "Start fehlgeschlagen · bitte erneut versuchen" }[status];
}

export function AutonomyCycleStatus({ status }: { status: AutonomyCycleStatus }) {
  const tone = status === "failed" ? "border-rose-200/20 bg-rose-300/10 text-rose-100" : status === "duplicate" ? "border-amber-200/20 bg-amber-300/10 text-amber-100" : status === "idle" ? "border-white/10 bg-white/[0.04] text-slate-300" : "border-cyan-200/20 bg-cyan-300/10 text-cyan-100";
  return <div role="status" aria-live="polite" className={`mt-4 rounded-xl border px-3 py-2 text-xs ${tone}`}>{autonomyCycleStatusCopy(status)}</div>;
}

export default function AutonomyTasks() {
  const [, setLocation] = useLocation();
  const [cycleStatus, setCycleStatus] = React.useState<AutonomyCycleStatus>("idle");
  const overview = trpc.revenue.overview.useQuery();
  const growth = trpc.growth.status.useQuery();
  const cycle = trpc.growth.autonomyCycleStatus.useQuery();
  const utils = trpc.useUtils();
  const mode = growth.data?.setting?.autonomyMode ?? "semi";
  const setMode = trpc.growth.setAutonomyMode.useMutation({ onSuccess: () => { void utils.growth.status.invalidate(); } });
  const startCycle = trpc.growth.startAutonomyCycle.useMutation({ onMutate: () => setCycleStatus("running"), onSuccess: result => { setCycleStatus(result.paused ? "idle" : result.duplicate ? "duplicate" : "started"); void utils.revenue.overview.invalidate(); void utils.growth.status.invalidate(); void utils.growth.autonomyCycleStatus.invalidate(); }, onError: () => setCycleStatus("failed") });
  const displayedCycleStatus = cycleStatus === "idle" && cycle.data?.status === "started" ? "started" : cycleStatus;

  if (overview.isError || growth.isError || cycle.isError) return <RevenueQueryError subject="Die autonomen Tasks" />;
  if (overview.isLoading || growth.isLoading) return <section className="autonomy-hero text-sm text-muted-foreground">Autonome Tasks werden priorisiert …</section>;
  if (!overview.data?.workspace) return <section className="autonomy-hero"><h1 className="text-2xl font-bold text-white">Tasks benötigen einen Workspace</h1><Button className="mt-5" onClick={() => setLocation("/app")}>Workspace öffnen</Button></section>;
  const tasks: Task[] = [
    ...overview.data.approvalActions.map(action => ({ id: `approval-${action.id}`, title: `Freigabe prüfen: ${action.actionType}`, detail: action.target, priority: "hoch" as const, destination: "/approvals", state: "Freigabe ausstehend" })),
    ...overview.data.agents.filter(agent => !agent.enabled).map(agent => ({ id: `agent-${agent.id}`, title: `Agent bewerten: ${agent.name}`, detail: "Der Agent ist pausiert und führt keine interne Analyse aus.", priority: "mittel" as const, destination: "/agents", state: "Pausiert" })),
    ...(growth.data?.experiments.filter(experiment => experiment.status === "needs_approval").map(experiment => ({ id: `experiment-${experiment.id}`, title: `Experiment prüfen: ${experiment.name}`, detail: `${experiment.experimentType} · Traffic-Limit vor Aktivierung festlegen.`, priority: "mittel" as const, destination: "/growth", state: "Entwurf" })) ?? []),
  ];
  return <section className="space-y-5"><header className="autonomy-hero"><div className="relative z-10 flex items-start justify-between gap-4"><div><p className="autonomy-kicker">TASKS // HARA PRIORITY QUEUE</p><h1 className="mt-2 text-3xl font-bold text-white">Die nächste beste Handlung.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Tasks entstehen aus echten Freigaben, pausierten Agenten und Growth-Entwürfen. Sie helfen beim Umsetzen, ohne Entscheidungen zu automatisieren.</p></div><div className="flex flex-col items-end gap-3"><CheckSquare className="h-8 w-8 text-cyan-200" /><Button className="min-h-11 whitespace-nowrap" disabled={startCycle.isPending || mode === "paused"} onClick={() => startCycle.mutate()}>{startCycle.isPending ? "Zyklus läuft …" : mode === "paused" ? "Autonomie pausiert" : "Autonomie starten"}</Button><Button size="sm" variant="outline" aria-pressed={mode === "semi"} disabled={setMode.isPending} onClick={() => setMode.mutate({ mode: mode === "paused" ? "semi" : "paused" })}>{mode === "paused" ? "Autonomie fortsetzen" : "Autonomie pausieren"}</Button></div></div><p className="relative z-10 mt-4 text-xs text-cyan-100/80">Startet Analyse und Entwürfe. Keine Zahlung, kein Posting, keine Nachricht ohne Freigabe.</p><AutonomyCycleStatus status={displayedCycleStatus} /></header><div className="space-y-3">{tasks.length ? tasks.map((task, index) => <article key={task.id} className="autonomy-card flex gap-3"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${task.priority === "hoch" ? "bg-amber-300/15 text-amber-100" : "bg-cyan-300/15 text-cyan-100"}`}>{task.priority === "hoch" ? <CircleAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-white">{task.title}</p><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-300">{task.state}</span></div><p className="mt-1 text-sm leading-5 text-muted-foreground">{task.detail}</p><Button size="sm" variant="outline" className="mt-3" onClick={() => setLocation(task.destination)}>Öffnen<ArrowRight className="ml-2 h-3.5 w-3.5" /></Button></div></article>) : <article className="autonomy-card text-center"><CheckSquare className="mx-auto h-7 w-7 text-emerald-200" /><p className="mt-3 font-medium text-white">Keine offenen HARA-Tasks</p><p className="mt-1 text-sm text-muted-foreground">Freigabe-Queue, Agenten und aktuelle Experimente sind aufgeräumt.</p></article>}</div></section>;
}
