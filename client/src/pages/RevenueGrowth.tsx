import { RevenueMutationError, RevenueQueryError } from "@/components/RevenueFeedback";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Activity, BarChart3, CirclePause, CirclePlay, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

const euro = (cents: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);

export default function RevenueGrowth() {
  const { user } = useAuth();
  const growth = trpc.growth.status.useQuery();
  const stripe = trpc.stripe.status.useQuery();
  const utils = trpc.useUtils();
  const [cron, setCron] = useState("0 0 7 * * *");
  const [spendEuros, setSpendEuros] = useState("");
  const runAnalysis = trpc.growth.runAnalysis.useMutation({ onSuccess: () => utils.growth.status.invalidate() });
  const enableSchedule = trpc.growth.enableSchedule.useMutation({ onSuccess: () => utils.growth.status.invalidate() });
  const pauseSchedule = trpc.growth.pauseSchedule.useMutation({ onSuccess: () => utils.growth.status.invalidate() });
  const requestStripe = trpc.stripe.requestApproval.useMutation({ onSuccess: () => utils.stripe.status.invalidate() });
  const approveStripe = trpc.stripe.approve.useMutation({ onSuccess: () => utils.stripe.status.invalidate() });
  const suspendStripe = trpc.stripe.suspend.useMutation({ onSuccess: () => utils.stripe.status.invalidate() });
  const setMarketingSpend = trpc.growth.setMarketingSpend.useMutation({ onSuccess: () => utils.growth.status.invalidate() });

  if (growth.isError || stripe.isError) return <RevenueQueryError subject="Growth- und Providerstatus" />;
  if (growth.isLoading || stripe.isLoading) return <section className="cyber-panel p-6 text-sm text-muted-foreground">Growth-System wird geladen …</section>;
  if (!growth.data?.workspace) return <section className="cyber-panel p-6"><h1 className="text-2xl font-bold text-white">Growth Control</h1><p className="mt-3 text-sm text-muted-foreground">Richten Sie zuerst im Workspace einen persönlichen Revenue-Arbeitsbereich ein.</p></section>;

  const metrics = growth.data.metrics;
  const stripeConfig = stripe.data?.config;
  const workspaceId = stripe.data?.workspace?.id;
  const isAdmin = user?.role === "admin";
  const anyMutationError = runAnalysis.isError || enableSchedule.isError || pauseSchedule.isError || requestStripe.isError || approveStripe.isError || suspendStripe.isError || setMarketingSpend.isError;

  return <section className="space-y-5">
    <header className="cyber-panel p-6"><p className="mono text-[10px] tracking-[0.18em] text-cyan-200">GROWTH // CONTROL PLANE</p><h1 className="mt-2 text-3xl font-bold text-white">Messbar. Auditierbar. Kontrolliert.</h1><p className="mt-3 max-w-3xl text-sm text-slate-300">Webhook-Signale, Funnelmetriken und Optimierungsvorschläge werden zentral gesammelt. Kommunikation, Pricing und Zahlungen bleiben als überprüfbare Workflows modelliert.</p></header>

    <div className="grid gap-4 md:grid-cols-4">
      {[
        ["MRR-Signal", euro(metrics?.mrrCents ?? 0)],
        ["Checkout-Abschluss", `${metrics?.checkoutCompleted ?? 0} / ${metrics?.checkoutStarted ?? 0}`],
        ["Zahlungsfehler", String(metrics?.paymentFailures ?? 0)],
        ["Kündigungen", String(metrics?.cancellations ?? 0)],
      ].map(([label, value]) => <div key={label} className="cyber-panel p-4"><p className="mono text-[10px] text-cyan-200">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></div>)}
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <article className="cyber-panel p-6"><div className="flex items-start justify-between gap-4"><div><p className="mono text-[10px] tracking-[0.16em] text-cyan-200">STRIPE // PROVIDER GATE</p><h2 className="mt-2 text-xl font-bold text-white">Zahlungsprovider</h2></div><ShieldCheck className="h-6 w-6 text-cyan-200" /></div><p className="mt-4 text-sm text-slate-300">Status: <strong className="text-white">{stripeConfig?.status ?? "nicht initialisiert"}</strong> · Modus: <strong className="text-white">{stripe.data?.readiness.mode ?? "unconfigured"}</strong></p><p className="mt-2 text-xs text-muted-foreground">Schlüssel: {stripe.data?.readiness.secretKeyConfigured ? "konfiguriert" : "ausstehend"} · Webhook-Signatur: {stripe.data?.readiness.webhookSecretConfigured ? "konfiguriert" : "ausstehend"}</p><div className="mt-5 flex flex-wrap gap-2">
        {stripeConfig?.status === "disabled" || stripeConfig?.status === "suspended" ? <Button onClick={() => requestStripe.mutate()} disabled={requestStripe.isPending}>Freigabe anfordern</Button> : null}
        {isAdmin && stripeConfig?.status === "approval_requested" && workspaceId ? <Button onClick={() => approveStripe.mutate({ workspaceId })} disabled={approveStripe.isPending}>Provider freigeben</Button> : null}
        {isAdmin && stripeConfig?.status === "active" && workspaceId ? <Button variant="outline" onClick={() => suspendStripe.mutate({ workspaceId })} disabled={suspendStripe.isPending}>Provider pausieren</Button> : null}
      </div></article>

      <article className="cyber-panel p-6"><div className="flex items-start justify-between gap-4"><div><p className="mono text-[10px] tracking-[0.16em] text-cyan-200">ANALYSIS // MANAGED</p><h2 className="mt-2 text-xl font-bold text-white">Growth-Loop</h2></div><Activity className="h-6 w-6 text-cyan-200" /></div><p className="mt-4 text-sm text-slate-300">Letzter Lauf: {growth.data.setting?.lastRunAt ? new Date(growth.data.setting.lastRunAt).toLocaleString("de-DE") : "noch nicht ausgeführt"}</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={cron} onChange={event => setCron(event.target.value)} aria-label="Growth-Analyse-Zeitplan" className="h-10 flex-1 rounded-md border border-cyan-100/15 bg-slate-950/60 px-3 text-sm text-white" /><Button onClick={() => enableSchedule.mutate({ cron })} disabled={enableSchedule.isPending}><CirclePlay className="mr-2 h-4 w-4" />Automatik aktivieren</Button>{growth.data.setting?.enabled ? <Button variant="outline" onClick={() => pauseSchedule.mutate()} disabled={pauseSchedule.isPending}><CirclePause className="mr-2 h-4 w-4" />Pausieren</Button> : null}</div><Button variant="outline" className="mt-3" onClick={() => runAnalysis.mutate()} disabled={runAnalysis.isPending}>Analyse jetzt ausführen</Button><p className="mt-3 text-xs text-muted-foreground">Aktivierung der periodischen Ausführung ist nach Veröffentlichung der Anwendung möglich. Die sechs Cron-Felder werden in UTC interpretiert.</p></article>
    </div>

    <div className="grid gap-5 lg:grid-cols-2"><article className="cyber-panel p-6"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-cyan-200" /><h2 className="font-bold text-white">Experimente</h2></div><div className="mt-4 space-y-3">{growth.data.experiments.length ? growth.data.experiments.map(experiment => <div key={experiment.id} className="rounded-lg border border-white/10 p-3"><p className="font-medium text-white">{experiment.name}</p><p className="mt-1 text-xs text-muted-foreground">{experiment.experimentType} · {experiment.status} · Traffic-Limit: {experiment.maxTrafficPercent}%</p></div>) : <p className="text-sm text-muted-foreground">Noch keine Experimententwürfe vorhanden.</p>}</div></article><article className="cyber-panel p-6"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-cyan-200" /><h2 className="font-bold text-white">Retention-Entwürfe</h2></div><div className="mt-4 space-y-3">{growth.data.retention.length ? growth.data.retention.map(item => <div key={item.id} className="rounded-lg border border-white/10 p-3"><p className="font-medium text-white">{item.caseType} · {item.status}</p><p className="mt-1 text-xs text-muted-foreground">{item.recommendedAction}</p></div>) : <p className="text-sm text-muted-foreground">Keine offenen Dunning- oder Retention-Entwürfe.</p>}</div></article></div>
    <div className="grid gap-5 lg:grid-cols-2"><article className="cyber-panel p-6"><p className="mono text-[10px] text-cyan-200">CAC // INPUT</p><h2 className="mt-2 font-bold text-white">Marketingausgaben erfassen</h2><div className="mt-4 flex gap-2"><input value={spendEuros} onChange={event => setSpendEuros(event.target.value)} inputMode="decimal" placeholder="EUR" aria-label="Marketingausgaben in Euro" className="h-10 flex-1 rounded-md border border-cyan-100/15 bg-slate-950/60 px-3 text-sm text-white" /><Button onClick={() => setMarketingSpend.mutate({ cents: Math.max(0, Math.round(Number(spendEuros.replace(",", ".")) * 100)) })} disabled={!spendEuros || setMarketingSpend.isPending}>Speichern</Button></div><p className="mt-3 text-xs text-muted-foreground">CAC: {euro(metrics?.cacCents ?? 0)} · geschätzter LTV: {euro(metrics?.estimatedLtvCents ?? 0)}</p></article><article className="cyber-panel p-6"><p className="mono text-[10px] text-cyan-200">FUNNEL // INGEST</p><h2 className="mt-2 font-bold text-white">Tracking-Konfiguration</h2><p className="mt-3 break-all rounded-md bg-slate-950/60 p-3 font-mono text-xs text-slate-200">{growth.data.setting?.analyticsWriteKey ?? "wird erstellt …"}</p><p className="mt-3 text-xs text-muted-foreground">Der Schlüssel akzeptiert ausschließlich pseudonymisierte Ereignistypen für Landingpage-Aufruf, CTA-Klick und Checkout-Start. Keine Kontakt- oder Zahlungsdaten im Client senden.</p></article></div>
    {anyMutationError ? <RevenueMutationError action="Die Growth- oder Provideränderung" /> : null}
  </section>;
}
