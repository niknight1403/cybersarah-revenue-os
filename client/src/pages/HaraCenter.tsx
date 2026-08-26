import { RevenueQueryError } from "@/components/RevenueFeedback";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowRight, BrainCircuit, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import React from "react";
import { useLocation } from "wouter";

export default function HaraCenter() {
  const [, setLocation] = useLocation();
  const overview = trpc.revenue.overview.useQuery();
  const growth = trpc.growth.status.useQuery();
  const setAutonomyMode = trpc.growth.setAutonomyMode.useMutation();
  const autonomyMode = growth.data?.setting?.autonomyMode === "paused" ? "paused" : "semi";
  const isPaused = autonomyMode === "paused";
  if (overview.isError || growth.isError) return <RevenueQueryError subject="Das HARA-System" />;
  if (overview.isLoading || growth.isLoading) return <section className="autonomy-hero text-sm text-muted-foreground">HARA-System synchronisiert …</section>;
  if (!overview.data?.workspace) return <section className="autonomy-hero"><h1 className="text-2xl font-bold text-white">HARA braucht einen Arbeitsbereich</h1><p className="mt-3 text-sm text-muted-foreground">Initialisieren Sie zuerst den Revenue-Workspace. Danach priorisiert HARA Ihre autonomen, aber freigabegesicherten Schritte.</p><Button className="mt-5" onClick={() => setLocation("/app")}>Workspace öffnen</Button></section>;

  const metrics = growth.data?.metrics;
  const activeAgents = overview.data.agents.filter(agent => agent.enabled).length;
  const signals = [
    { label: "Freigaben", value: overview.data.pendingApprovals, tone: overview.data.pendingApprovals ? "text-amber-100" : "text-emerald-100" },
    { label: "Aktive Agenten", value: activeAgents, tone: "text-cyan-100" },
    { label: "Checkout-Starts", value: metrics?.checkoutStarted ?? 0, tone: "text-violet-100" },
  ];
  const score = Math.max(42, Math.min(100, 100 - overview.data.pendingApprovals * 7 - (metrics?.paymentFailures ?? 0) * 9));
  const focus = overview.data.pendingApprovals ? "Freigabe-Queue bereinigen" : activeAgents ? "Wachstumssignale überwachen" : "Agenten sinnvoll aktivieren";
  const audit = overview.data.latestAudit;

  return <section className="space-y-5">
    <header className="autonomy-hero"><div className="relative z-10 flex items-start justify-between gap-4"><div><p className="autonomy-kicker">HARA // HUMAN-AUDITED REVENUE AUTONOMY</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Ihr autonomer Kontrollkern.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">HARA verdichtet Agentenstatus, Growth-Signale und Freigaben zu einer transparenten nächsten Handlung. Entscheidungen bleiben jederzeit überprüfbar.</p></div><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-100"><BrainCircuit className="h-6 w-6" /></div></div><div className="relative z-10 mt-6 grid grid-cols-3 gap-2">{signals.map(signal => <div key={signal.label} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">{signal.label}</p><p className={`mt-1 text-2xl font-semibold ${signal.tone}`}>{signal.value}</p></div>)}</div></header>
    <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]"><article className="autonomy-card"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-cyan-200" /><h2 className="font-semibold text-white">HARA-Fokus jetzt</h2></div><p className="mt-3 text-xl font-semibold text-white">{focus}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Die Empfehlung basiert auf dem aktuellen Agenten-, Freigabe- und Funnelstatus. Sie erzeugt keine Außenwirkung und kann über die passenden Module geprüft werden.</p><div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => setLocation(overview.data.pendingApprovals ? "/tasks" : "/agents")}>{overview.data.pendingApprovals ? "Tasks prüfen" : "Agenten prüfen"}<ArrowRight className="ml-2 h-4 w-4" /></Button><Button variant="outline" onClick={() => setLocation("/growth")}>Growth-Signale</Button></div></article><article className="autonomy-card"><p className="autonomy-kicker">OPERATING SCORE</p><p className="mt-2 text-5xl font-semibold text-white">{score}</p><p className="mt-1 text-sm text-muted-foreground">von 100 · auditierbar</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300" style={{ width: `${score}%` }} /></div></article></div>
    <article className="autonomy-card"><div className="flex items-center justify-between gap-3"><div><p className="autonomy-kicker">AUDIT // VERWEIS</p><h2 className="mt-1 font-semibold text-white">Letzte nachvollziehbare Betriebsbewertung</h2></div><Button size="sm" variant="outline" onClick={() => setLocation("/system")}>Systemaudit</Button></div>{audit ? <div className="mt-4 rounded-xl border border-cyan-200/10 bg-cyan-200/[0.04] p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-white">{audit.summary}</p><span className="mono text-[10px] text-cyan-100">AUDIT #{audit.id}</span></div><p className="mt-2 text-xs text-muted-foreground">Bewertung: {audit.score}/100 · {new Date(audit.createdAt).toLocaleString("de-DE")}</p></div> : <p className="mt-3 text-sm text-muted-foreground">Noch keine persistierte Bewertung. HARA zeigt Empfehlungen erst im Kontext verfügbarer Auditdaten.</p>}</article>
    <article className="autonomy-card"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-violet-200" /><h2 className="font-semibold text-white">Autonomie mit Schutzgrenzen</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><Guard icon={CheckCircle2} title="Analysieren" text="Signale bündeln und Muster priorisieren." /><Guard icon={ShieldCheck} title="Freigabe zuerst" text="Preise, Kommunikation und Zahlungen bleiben Entwürfe." /><Guard icon={BrainCircuit} title="Auditierbar" text="Jede Systementscheidung verweist auf ihren Kontext." /></div></article>
    <article className="autonomy-card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="autonomy-kicker">OPERATING MODE // SAFE BY DEFAULT</p><h2 className="mt-1 font-semibold text-white">{isPaused ? "Autonomie pausiert" : "Semi-Autopilot aktiv"}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Der Startknopf darf Analyse und Entwürfe anstoßen. Full-Auto für Posts, Zahlungen, Nachrichten oder Veröffentlichungen bleibt gesperrt, bis eine einzelne Aktion separat freigegeben wurde.</p></div><div className="flex shrink-0 flex-col gap-2"><Button disabled variant="outline" aria-label="Full-Auto gesperrt">Full-Auto gesperrt</Button><Button variant="outline" disabled={setAutonomyMode.isPending} aria-label={isPaused ? "Semi-Autopilot fortsetzen" : "Semi-Autopilot pausieren"} onClick={() => setAutonomyMode.mutate({ mode: isPaused ? "semi" : "paused" })}>{isPaused ? "Semi-Autopilot fortsetzen" : "Autonomie pausieren"}</Button><Button onClick={() => setLocation("/tasks")} disabled={isPaused}>Zyklus starten</Button></div></article>
  </section>;
}

function Guard({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) { return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><Icon className="h-4 w-4 text-cyan-200" /><p className="mt-3 text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>; }
