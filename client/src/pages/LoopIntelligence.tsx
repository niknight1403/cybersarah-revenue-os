import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { Activity, ArrowLeft, ShieldCheck } from "lucide-react";
import { RevenueQueryError } from "@/components/RevenueFeedback";
import { trpc } from "@/lib/trpc";

const loopDefinitions = [
  ["viral_content", "Viral Content & DM-Sales", "Social / DMs"],
  ["retention_upsell", "Predictive Upsell & Retention", "In-App / Abo"],
  ["cart_recovery", "Cart Recovery & Re-Engagement", "E-Mail / WhatsApp / Telegram"],
  ["affiliate_arbitrage", "Affiliate & Product Arbitrage", "Shopify / Affiliate"],
] as const;

export default function LoopIntelligence() {
  const growth = trpc.growth.status.useQuery();
  const [modes, setModes] = useState<Record<string, "manual_approval" | "semi_autopilot_internal">>({});
  const metrics = growth.data?.metrics;
  const checkoutRate = metrics && metrics.checkoutStarted > 0 ? metrics.checkoutCompleted / metrics.checkoutStarted : null;
  const signal = useMemo(() => checkoutRate === null ? "Keine Checkout-Basis" : `${(checkoutRate * 100).toFixed(1)}% Checkout-Rate`, [checkoutRate]);
  if (growth.isLoading) return <section className="cyber-panel p-6 text-sm text-muted-foreground">Loop Intelligence wird geladen …</section>;
  if (growth.isError) return <RevenueQueryError subject="Loop Intelligence" />;
  if (!growth.data?.workspace) return <section className="cyber-panel p-6"><h1 className="text-2xl font-bold text-white">Loop Intelligence</h1><p className="mt-3 text-sm text-muted-foreground">Richten Sie zuerst einen persönlichen Revenue-Arbeitsbereich ein.</p></section>;
  return <main className="space-y-5"><header className="cyber-panel p-5 sm:p-6"><Link href="/growth" className="inline-flex items-center gap-2 text-xs text-cyan-200"><ArrowLeft className="h-4 w-4" /> Zur Growth-Steuerung</Link><div className="mt-5 flex items-start justify-between gap-4"><div><p className="mono text-[10px] tracking-[0.18em] text-cyan-200">LOOP INTELLIGENCE // INTERNAL</p><h1 className="mt-2 text-3xl font-bold text-white">Revenue-Loops kontrollieren</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Die Engine priorisiert interne Entwürfe auf Basis realer Funnel-Signale. Kein Loop darf ohne Einzel-Freigabe zahlen, posten, schreiben oder veröffentlichen.</p></div><Activity className="hidden h-6 w-6 text-cyan-200 sm:block" /></div></header><section className="grid gap-3 sm:grid-cols-3"><div className="cyber-panel p-4"><p className="mono text-[10px] text-cyan-200">MRR-SIGNAL</p><p className="mt-2 text-2xl font-bold text-white">€{((metrics?.mrrCents ?? 0) / 100).toFixed(2)}</p></div><div className="cyber-panel p-4"><p className="mono text-[10px] text-cyan-200">CONVERSION</p><p className="mt-2 text-2xl font-bold text-white">{signal}</p></div><div className="cyber-panel p-4"><p className="mono text-[10px] text-cyan-200">AUSSENWIRKUNG</p><p className="mt-2 text-sm font-semibold text-emerald-200">Blockiert ohne Freigabe</p></div></section><section className="space-y-3">{loopDefinitions.map(([id, label, channel]) => { const mode = modes[id] ?? "manual_approval"; return <article key={id} className="cyber-panel p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-semibold text-white">{label}</h2><p className="mt-1 text-xs text-muted-foreground">{channel} · Signal: {signal}</p></div><span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/[0.05] px-2 py-1 text-[10px] text-emerald-100"><ShieldCheck className="h-3 w-3" /> Approval-first</span></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={`rounded-lg px-3 py-2 text-xs font-semibold ${mode === "manual_approval" ? "bg-cyan-300 text-slate-950" : "border border-border text-muted-foreground"}`} onClick={() => setModes(previous => ({ ...previous, [id]: "manual_approval" }))}>Manuelle Freigabe</button><button type="button" className={`rounded-lg px-3 py-2 text-xs font-semibold ${mode === "semi_autopilot_internal" ? "bg-violet-300 text-slate-950" : "border border-border text-muted-foreground"}`} onClick={() => setModes(previous => ({ ...previous, [id]: "semi_autopilot_internal" }))}>Semi-Autopilot intern</button></div><p className="mt-3 text-xs leading-5 text-amber-100">{mode === "semi_autopilot_internal" ? "Interne Analyse und Draft-Erzeugung erlaubt; externe Ausführung bleibt blockiert." : "Nur freigegebene Drafts dürfen in einen externen Ablauf übergehen."}</p></article>; })}</section></main>;
}
