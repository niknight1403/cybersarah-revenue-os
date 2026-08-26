import React from "react";
import { ArrowRight, CheckCircle2, FileText, Film, Globe2, Mail, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const loops = [
  { id: "video", label: "VIDEO LOOP", title: "Faceless Shorts", description: "Erzeugt aus freigegebenen Produktdaten einen Szenen-, Caption- und Disclosure-Entwurf.", icon: Film, href: "/marketing", outcome: "Render-/Upload-Schritt bleibt gesperrt" },
  { id: "seo", label: "SEO LOOP", title: "Programmatic SEO", description: "Baut einen quellengebundenen Landingpage-Entwurf mit Canonical, Qualitätsprüfung und Affiliate-Hinweis.", icon: Globe2, href: "/growth", outcome: "Publikation bleibt gesperrt" },
  { id: "lead", label: "LEAD LOOP", title: "B2B-Qualifizierung", description: "Bewertet zulässige Lead-Kandidaten datensparsam und verlangt Nachweis der Kontaktgrundlage.", icon: Mail, href: "/approvals", outcome: "CRM-/Mail-Versand bleibt gesperrt" },
];

export default function GlobalRevenueLoops() {
  const [prepared, setPrepared] = React.useState<string | null>(null);
  return <section className="space-y-5" aria-labelledby="global-loops-title">
    <header className="autonomy-hero">
      <div className="relative z-10 flex items-start justify-between gap-4"><div><p className="autonomy-kicker">HARA // GLOBAL REVENUE LOOPS</p><h1 id="global-loops-title" className="mt-2 text-3xl font-bold text-white sm:text-4xl">Wachstum vorbereiten. Wirkung freigeben.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Drei neue Loops bündeln Video, Suchintention und B2B-Qualifizierung. Jeder Loop erzeugt nachvollziehbare Entwürfe; externe Wirkung beginnt erst nach einer separaten Prüfung.</p></div><ShieldCheck className="h-8 w-8 shrink-0 text-cyan-200" /></div>
      <div className="relative z-10 mt-5 flex flex-wrap gap-2 text-xs text-cyan-100"><span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-2">Draft-only</span><span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-2">Audit aktiv</span><span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-2">Kein Auto-Upload</span></div>
    </header>
    <div className="grid gap-4 lg:grid-cols-3">{loops.map(loop => { const Icon = loop.icon; const isPrepared = prepared === loop.id; return <article key={loop.id} className="autonomy-card flex h-full flex-col"><div className="flex items-center justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-100"><Icon className="h-5 w-5" /></div><span className="mono text-[10px] tracking-wider text-cyan-200">{loop.label}</span></div><h2 className="mt-5 text-xl font-semibold text-white">{loop.title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{loop.description}</p><div className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-3"><p className="text-xs text-slate-300"><span className="font-semibold text-white">Grenze:</span> {loop.outcome}</p></div><div className="mt-4 flex flex-wrap gap-2"><Button className="min-h-11" onClick={() => setPrepared(loop.id)}>{isPrepared ? <><CheckCircle2 className="mr-2 h-4 w-4" />Freigabe vorbereitet</> : <><FileText className="mr-2 h-4 w-4" />Entwurf vorbereiten</>}</Button><Link href={loop.href} className="inline-flex min-h-11 items-center rounded-md border border-white/10 px-3 text-sm text-slate-200 transition-colors hover:bg-white/5">Prüfen<ArrowRight className="ml-2 h-4 w-4" /></Link></div>{isPrepared && <p className="mt-3 text-xs text-emerald-200" role="status">Nur interner Approval-Kontext vorbereitet; keine Außenwirkung ausgelöst.</p>}</article>; })}</div>
    <div className="autonomy-card flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" /><p className="text-sm leading-6 text-muted-foreground"><span className="font-semibold text-white">Compliance-Hinweis:</span> Für externe Datenquellen gelten Quellenfreigabe, Rate-Limits, Nutzungsbedingungen, Opt-out und Rechteprüfung. Das Modul simuliert keine Kundenstimmen, versendet keine Kaltakquise und veröffentlicht keine Seiten automatisch.</p></div>
  </section>;
}
