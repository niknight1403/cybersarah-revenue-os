import { useAuth } from "@/_core/hooks/useAuth";
import { RevenueMutationError, RevenueQueryError } from "@/components/RevenueFeedback";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Activity, BarChart3, CirclePause, CirclePlay, ExternalLink, Link2, ShieldCheck, Sparkles } from "lucide-react";
import React, { useState } from "react";

const euro = (cents: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);

function publicCheckoutUrl(stripeUrl: string) {
  return `/checkout?stripe_url=${encodeURIComponent(stripeUrl)}`;
}

export function recordCheckoutStart(analyticsWriteKey: string | null | undefined, subjectKey?: string, experimentId?: number) {
  if (typeof navigator === "undefined") return;
  if (analyticsWriteKey) {
    const payload = JSON.stringify({ key: analyticsWriteKey, eventId: crypto.randomUUID(), eventType: "checkout.session.created" });
    navigator.sendBeacon("/api/events/funnel", new Blob([payload], { type: "application/json" }));
  }
  if (subjectKey && experimentId) {
    const payload = JSON.stringify({ subjectKey, experimentId, eventType: "checkout_start" });
    navigator.sendBeacon("/api/events/experiment", new Blob([payload], { type: "application/json" }));
  }
}

export default function RevenueGrowth() {
  const { user } = useAuth();
  const growth = trpc.growth.status.useQuery();
  const stripe = trpc.stripe.status.useQuery();
  const utils = trpc.useUtils();
  const [cron, setCron] = useState("0 0 7 * * *");
  const [spendEuros, setSpendEuros] = useState("");
  const [paymentLinkProduct, setPaymentLinkProduct] = useState("CyberSarah Revenue OS");
  const [paymentLinkAmount, setPaymentLinkAmount] = useState("");
  const [paymentLinkRecurring, setPaymentLinkRecurring] = useState(true);
  const [experimentTraffic, setExperimentTraffic] = useState("10");
  const [createdPaymentLink, setCreatedPaymentLink] = useState<{ id: string; url: string; mode: "test" | "live" | "unconfigured" } | null>(null);
  const [createdCheckoutSession, setCreatedCheckoutSession] = useState<{ id: string; url: string; mode: "test" | "live" | "unconfigured" } | null>(null);

  const runAnalysis = trpc.growth.runAnalysis.useMutation({ onSuccess: () => void utils.growth.status.invalidate() });
  const enableSchedule = trpc.growth.enableSchedule.useMutation({ onSuccess: () => void utils.growth.status.invalidate() });
  const pauseSchedule = trpc.growth.pauseSchedule.useMutation({ onSuccess: () => void utils.growth.status.invalidate() });
  const activateExperiment = trpc.growth.activateExperiment.useMutation({ onSuccess: () => void utils.growth.status.invalidate() });
  const pauseExperiment = trpc.growth.pauseExperiment.useMutation({ onSuccess: () => void utils.growth.status.invalidate() });
  const requestStripe = trpc.stripe.requestApproval.useMutation({ onSuccess: () => void utils.stripe.status.invalidate() });
  const approveStripe = trpc.stripe.approve.useMutation({ onSuccess: () => void utils.stripe.status.invalidate() });
  const suspendStripe = trpc.stripe.suspend.useMutation({ onSuccess: () => void utils.stripe.status.invalidate() });
  const setMarketingSpend = trpc.growth.setMarketingSpend.useMutation({ onSuccess: () => void utils.growth.status.invalidate() });
  const createPaymentLink = trpc.stripe.createPaymentLink.useMutation({
    onSuccess: result => {
      setCreatedPaymentLink({ id: result.id, url: result.url, mode: result.mode });
      void utils.stripe.status.invalidate();
      void utils.growth.status.invalidate();
    },
  });
  const createCheckoutSession = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: result => {
      setCreatedCheckoutSession({ id: result.id, url: result.url, mode: result.mode });
      void utils.stripe.status.invalidate();
      void utils.growth.status.invalidate();
    },
  });

  if (growth.isError || stripe.isError) return <RevenueQueryError subject="Growth- und Providerstatus" />;
  if (growth.isLoading || stripe.isLoading) return <section className="cyber-panel p-6 text-sm text-muted-foreground">Growth-System wird geladen …</section>;
  if (!growth.data?.workspace) return <section className="cyber-panel p-6"><h1 className="text-2xl font-bold text-white">Growth Control</h1><p className="mt-3 text-sm text-muted-foreground">Richten Sie zuerst im Workspace einen persönlichen Revenue-Arbeitsbereich ein.</p></section>;

  const metrics = growth.data.metrics;
  const stripeConfig = stripe.data?.config;
  const workspaceId = stripe.data?.workspace?.id;
  const isAdmin = user?.role === "admin";
  const isPaymentLinkReady = isAdmin && stripeConfig?.status === "active" && Boolean(workspaceId) && stripe.data?.readiness.checkoutOriginConfigured;
  const amountCents = Math.round(Number(paymentLinkAmount.replace(",", ".")) * 100);
  const isPaymentLinkInputValid = paymentLinkProduct.trim().length >= 2 && Number.isInteger(amountCents) && amountCents >= 50;
  const anyMutationError = runAnalysis.isError || enableSchedule.isError || pauseSchedule.isError || activateExperiment.isError || pauseExperiment.isError || requestStripe.isError || approveStripe.isError || suspendStripe.isError || createPaymentLink.isError || createCheckoutSession.isError || setMarketingSpend.isError;
  const paymentInput = workspaceId && isPaymentLinkInputValid
    ? { workspaceId, productName: paymentLinkProduct.trim(), unitAmount: amountCents, currency: "EUR", recurring: paymentLinkRecurring, origin: window.location.origin }
    : null;

  return (
    <section className="space-y-5">
      <header className="cyber-panel p-6">
        <p className="mono text-[10px] tracking-[0.18em] text-cyan-200">GROWTH // CONTROL PLANE</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Messbar. Auditierbar. Kontrolliert.</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">Webhook-Signale, Funnelmetriken und Optimierungsvorschläge werden zentral gesammelt. Kommunikation, Pricing und Zahlungen bleiben als überprüfbare Workflows modelliert.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["MRR-Signal", euro(metrics?.mrrCents ?? 0)],
          ["Checkout-Abschluss", `${metrics?.checkoutCompleted ?? 0} / ${metrics?.checkoutStarted ?? 0}`],
          ["Zahlungsfehler", String(metrics?.paymentFailures ?? 0)],
          ["Kündigungen", String(metrics?.cancellations ?? 0)],
        ].map(([label, value]) => <div key={label} className="cyber-panel p-4"><p className="mono text-[10px] text-cyan-200">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></div>)}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="cyber-panel p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="mono text-[10px] tracking-[0.16em] text-cyan-200">STRIPE // PROVIDER GATE</p><h2 className="mt-2 text-xl font-bold text-white">Zahlungsprovider</h2></div><ShieldCheck className="h-6 w-6 text-cyan-200" /></div>
          <p className="mt-4 text-sm text-slate-300">Status: <strong className="text-white">{stripeConfig?.status ?? "nicht initialisiert"}</strong> · Modus: <strong className="text-white">{stripe.data?.readiness.mode ?? "unconfigured"}</strong></p>
          <p className="mt-2 text-xs text-muted-foreground">Schlüssel: {stripe.data?.readiness.secretKeyConfigured ? "konfiguriert" : "ausstehend"} · Webhook-Signatur: {stripe.data?.readiness.webhookSecretConfigured ? "konfiguriert" : "ausstehend"}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(stripeConfig?.status === "disabled" || stripeConfig?.status === "suspended") && <Button onClick={() => requestStripe.mutate()} disabled={requestStripe.isPending}>Freigabe anfordern</Button>}
            {isAdmin && stripeConfig?.status === "approval_requested" && workspaceId && <Button onClick={() => approveStripe.mutate({ workspaceId })} disabled={approveStripe.isPending}>Provider freigeben</Button>}
            {isAdmin && stripeConfig?.status === "active" && workspaceId && <Button variant="outline" onClick={() => suspendStripe.mutate({ workspaceId })} disabled={suspendStripe.isPending}>Provider pausieren</Button>}
          </div>

          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-cyan-200" /><h3 className="font-semibold text-white">Checkout oder Zahlungslink vorbereiten</h3></div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Nur Admins können nach aktiver Providerfreigabe einen Stripe-Zahlungsflow erstellen. Der abschließende Bestätigungsdialog ist eine explizite externe Aktion und wird im Audit-Trail protokolliert.</p>
            {isAdmin ? <AlertDialog>
              <AlertDialogTrigger asChild><Button className="mt-4" size="sm" disabled={!isPaymentLinkReady}>Zahlungsflow konfigurieren</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Stripe-Zahlungsflow erstellen?</AlertDialogTitle><AlertDialogDescription>Es wird ein neues Stripe-Produkt, ein Preis und entweder ein teilbarer Zahlungslink oder eine direkte Checkout-Session erzeugt. Prüfen Sie Produktname, Preis und Abrechnungsart vor der Bestätigung.</AlertDialogDescription></AlertDialogHeader>
                <div className="mt-5 space-y-4">
                  <label className="block text-sm font-medium text-foreground" htmlFor="payment-link-product">Produktname<input id="payment-link-product" value={paymentLinkProduct} onChange={event => setPaymentLinkProduct(event.target.value)} minLength={2} maxLength={180} required className="mt-2 h-10 w-full rounded-md border border-cyan-100/15 bg-slate-950/60 px-3 text-sm text-white" /></label>
                  <label className="block text-sm font-medium text-foreground" htmlFor="payment-link-amount">Preis in EUR<input id="payment-link-amount" value={paymentLinkAmount} onChange={event => setPaymentLinkAmount(event.target.value)} inputMode="decimal" placeholder="z. B. 299,00" required className="mt-2 h-10 w-full rounded-md border border-cyan-100/15 bg-slate-950/60 px-3 text-sm text-white" /></label>
                  <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={paymentLinkRecurring} onChange={event => setPaymentLinkRecurring(event.target.checked)} />Monatliche Abrechnung</label>
                </div>
                <AlertDialogFooter className="mt-6">
                  <AlertDialogCancel type="button">Abbrechen</AlertDialogCancel>
                  <AlertDialogAction type="button" disabled={!paymentInput || createCheckoutSession.isPending} onClick={() => { if (paymentInput) createCheckoutSession.mutate(paymentInput); }}>{createCheckoutSession.isPending ? "Wird erstellt …" : "Direkten Checkout erzeugen"}</AlertDialogAction>
                  <AlertDialogAction type="button" disabled={!paymentInput || createPaymentLink.isPending} onClick={() => { if (paymentInput) createPaymentLink.mutate(paymentInput); }}>{createPaymentLink.isPending ? "Wird erstellt …" : "Zahlungslink erzeugen"}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog> : <p className="mt-3 text-xs text-muted-foreground">Die Konfiguration und Erstellung von Zahlungsflows ist ausschließlich für Admins verfügbar.</p>}
            {isAdmin && !stripe.data?.readiness.checkoutOriginConfigured && <p className="mt-3 text-xs text-amber-200">Für sichere Checkout-Redirects muss zuerst eine öffentliche App-Origin konfiguriert sein.</p>}
            {createdPaymentLink && <div className="mt-4 rounded-md border border-emerald-300/20 bg-emerald-300/[0.05] p-3"><p className="text-xs font-medium text-emerald-100">Zahlungslink erstellt ({createdPaymentLink.mode}).</p><a aria-label="Öffentlichen Zahlungslink öffnen" className="mt-2 inline-flex items-center gap-1 break-all text-xs text-cyan-200 underline underline-offset-4" href={publicCheckoutUrl(createdPaymentLink.url)} target="_blank" rel="noreferrer">Öffentlichen Checkout-Einstieg öffnen<ExternalLink className="h-3 w-3 shrink-0" /></a></div>}
            {createdCheckoutSession && <div className="mt-4 rounded-md border border-violet-300/20 bg-violet-300/[0.05] p-3"><p className="text-xs font-medium text-violet-100">Direkte Checkout-Session erstellt ({createdCheckoutSession.mode}).</p><a aria-label="Öffentlichen Checkout öffnen" className="mt-2 inline-flex items-center gap-1 break-all text-xs text-cyan-200 underline underline-offset-4" href={publicCheckoutUrl(createdCheckoutSession.url)} target="_blank" rel="noreferrer">Öffentlichen Checkout-Einstieg öffnen<ExternalLink className="h-3 w-3 shrink-0" /></a></div>}
          </div>
        </article>

        <article className="cyber-panel p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="mono text-[10px] tracking-[0.16em] text-cyan-200">ANALYSIS // MANAGED</p><h2 className="mt-2 text-xl font-bold text-white">Growth-Loop</h2></div><Activity className="h-6 w-6 text-cyan-200" /></div>
          <p className="mt-4 text-sm text-slate-300">Letzter Lauf: {growth.data.setting?.lastRunAt ? new Date(growth.data.setting.lastRunAt).toLocaleString("de-DE") : "noch nicht ausgeführt"}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={cron} onChange={event => setCron(event.target.value)} aria-label="Growth-Analyse-Zeitplan" className="h-10 flex-1 rounded-md border border-cyan-100/15 bg-slate-950/60 px-3 text-sm text-white" /><Button onClick={() => enableSchedule.mutate({ cron })} disabled={enableSchedule.isPending}><CirclePlay className="mr-2 h-4 w-4" />Automatik aktivieren</Button>{growth.data.setting?.enabled && <Button variant="outline" onClick={() => pauseSchedule.mutate()} disabled={pauseSchedule.isPending}><CirclePause className="mr-2 h-4 w-4" />Pausieren</Button>}</div>
          <Button variant="outline" className="mt-3" onClick={() => runAnalysis.mutate()} disabled={runAnalysis.isPending}>Analyse jetzt ausführen</Button>
          <p className="mt-3 text-xs text-muted-foreground">Aktivierung der periodischen Ausführung ist nach Veröffentlichung der Anwendung möglich. Die sechs Cron-Felder werden in UTC interpretiert.</p>
        </article>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="cyber-panel p-6"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-cyan-200" /><h2 className="font-bold text-white">Experimente</h2></div><div className="mt-4 space-y-3">{growth.data.experiments.length ? growth.data.experiments.map(experiment => <div key={experiment.id} className="rounded-lg border border-white/10 p-3"><p className="font-medium text-white">{experiment.name}</p><p className="mt-1 text-xs text-muted-foreground">{experiment.experimentType} · {experiment.status} · Traffic-Limit: {experiment.maxTrafficPercent}%</p>{experiment.results?.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{experiment.results.map(result => <div key={result.variantKey} className="rounded-md bg-slate-950/50 p-2 text-xs text-slate-200"><p className="font-medium">{result.variantKey}</p><p className="mt-1">{result.impressions} Einblendungen · {result.ctaClicks} CTA · {result.checkoutStarts} Checkout</p><p className="mt-1 text-cyan-100">CTA-Rate: {(result.ctaRate * 100).toFixed(1)}% · Checkout-Rate: {(result.checkoutRate * 100).toFixed(1)}%</p></div>)}</div> : null}{isAdmin && experiment.status === "needs_approval" && experiment.experimentType !== "pricing" ? <div className="mt-3 flex flex-wrap gap-2"><input value={experimentTraffic} onChange={event => setExperimentTraffic(event.target.value)} inputMode="numeric" aria-label="Traffic-Limit für das Experiment" className="h-8 w-24 rounded-md border border-cyan-100/15 bg-slate-950/60 px-2 text-xs text-white" /><Button size="sm" onClick={() => activateExperiment.mutate({ experimentId: experiment.id, maxTrafficPercent: Math.min(25, Math.max(1, Number(experimentTraffic) || 1)) })} disabled={activateExperiment.isPending}>Begrenzt aktivieren</Button></div> : null}{isAdmin && experiment.status === "active" ? <Button className="mt-3" size="sm" variant="outline" onClick={() => pauseExperiment.mutate({ experimentId: experiment.id })} disabled={pauseExperiment.isPending}>Experiment pausieren</Button> : null}{experiment.experimentType === "pricing" ? <p className="mt-3 text-xs text-amber-200">Pricing-Varianten bleiben Entwürfe und werden nicht öffentlich ausgespielt.</p> : null}</div>) : <p className="text-sm text-muted-foreground">Noch keine Experimententwürfe vorhanden.</p>}</div></article>
        <article className="cyber-panel p-6"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-cyan-200" /><h2 className="font-bold text-white">Retention-Entwürfe</h2></div><div className="mt-4 space-y-3">{growth.data.retention.length ? growth.data.retention.map(item => <div key={item.id} className="rounded-lg border border-white/10 p-3"><p className="font-medium text-white">{item.caseType} · {item.status}</p><p className="mt-1 text-xs text-muted-foreground">{item.recommendedAction}</p></div>) : <p className="text-sm text-muted-foreground">Keine offenen Dunning- oder Retention-Entwürfe.</p>}</div></article>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="cyber-panel p-6"><p className="mono text-[10px] text-cyan-200">CAC // INPUT</p><h2 className="mt-2 font-bold text-white">Marketingausgaben erfassen</h2><div className="mt-4 flex gap-2"><input value={spendEuros} onChange={event => setSpendEuros(event.target.value)} inputMode="decimal" placeholder="EUR" aria-label="Marketingausgaben in Euro" className="h-10 flex-1 rounded-md border border-cyan-100/15 bg-slate-950/60 px-3 text-sm text-white" /><Button onClick={() => setMarketingSpend.mutate({ cents: Math.max(0, Math.round(Number(spendEuros.replace(",", ".")) * 100)) })} disabled={!spendEuros || setMarketingSpend.isPending}>Speichern</Button></div><p className="mt-3 text-xs text-muted-foreground">CAC: {euro(metrics?.cacCents ?? 0)} · geschätzter LTV: {euro(metrics?.estimatedLtvCents ?? 0)}</p></article>
        <article className="cyber-panel p-6"><p className="mono text-[10px] text-cyan-200">FUNNEL // INGEST</p><h2 className="mt-2 font-bold text-white">Tracking-Konfiguration</h2><p className="mt-3 break-all rounded-md bg-slate-950/60 p-3 font-mono text-xs text-slate-200">{growth.data.setting?.analyticsWriteKey ?? "wird erstellt …"}</p><p className="mt-3 text-xs text-muted-foreground">Der Schlüssel akzeptiert ausschließlich pseudonymisierte Ereignistypen für Landingpage-Aufruf, CTA-Klick und Checkout-Start. Keine Kontakt- oder Zahlungsdaten im Client senden.</p></article>
      </div>
      {anyMutationError && <RevenueMutationError action="Die Growth- oder Provideränderung" />}
    </section>
  );
}
