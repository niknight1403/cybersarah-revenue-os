import React from "react";
import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function Paywall() {
  const readiness = trpc.subscriptions.readiness.useQuery();
  if (readiness.isLoading) return <section className="cyber-panel p-5 text-sm text-muted-foreground">Paywall-Readiness wird geprüft …</section>;
  const subscription = readiness.data?.subscription;
  const production = readiness.data?.production;
  if (!subscription || !production) return <section className="cyber-panel p-5 text-sm text-muted-foreground">Paywall-Status ist derzeit nicht verfügbar.</section>;
  return <section className="space-y-4" aria-labelledby="paywall-title">
    <header className="cyber-panel p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="autonomy-kicker">HARA // PAYWALL READINESS</p><h1 id="paywall-title" className="mt-2 text-3xl font-bold text-white">HARA-Zugriff transparent freischalten.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Die Produkte und Entitlements sind vorbereitet. Ein Kauf wird erst nach konfiguriertem Provider, gültigem Store-Setup und separater Freigabe ausgeführt.</p></div><LockKeyhole className="h-7 w-7 shrink-0 text-cyan-200" /></div><div className="mt-5 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-amber-100">Provider: {subscription.status}</span><span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-cyan-100">Kauf: blockiert</span><span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-cyan-100">Modus: {production.mode}</span></div></header>
    <div className="grid gap-3 md:grid-cols-3">{subscription.products.map(product => <article key={product.id} className="cyber-panel p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-white">{product.label}</h2><span className="mono text-[10px] text-cyan-200">{product.billingPeriod}</span></div><p className="mt-2 text-sm text-muted-foreground">Entitlement: {product.entitlement}</p><div className="mt-4 flex items-center gap-2 text-xs text-slate-300"><Check className="h-4 w-4 text-emerald-200" />Katalog vorbereitet</div><Button className="mt-5 min-h-11 w-full" disabled aria-label={`${product.label}: Kauf nicht konfiguriert`}>Kauf vorbereiten</Button></article>)}</div>
    <article className="cyber-panel border-amber-300/20 p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" /><div><h2 className="font-semibold text-white">Provider- und Rechtsprüfung</h2><p className="mt-2 text-sm leading-6 text-slate-300">Vor einem Echtgeld-Launch müssen RevenueCat/Google Play, Preise, Testphase, Datenschutz und AGB im jeweiligen Store geprüft werden. <Link href="/privacy" className="text-cyan-200 underline">Datenschutz</Link> und <Link href="/terms" className="text-cyan-200 underline">AGB</Link> bleiben im Flow sichtbar.</p><p className="mt-3 text-xs text-amber-100">Externe Ausführung: nein · Approval erforderlich: ja · Provider-Setup erforderlich: {subscription.requiresProviderSetup ? "ja" : "nein"}</p></div></div></article>
  </section>;
}
