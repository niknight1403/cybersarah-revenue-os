import React, { useState } from "react";
import { Link } from "wouter";

const steps = [
  { label: "Ziel definieren", text: "Wählen Sie ein internes Umsatz- oder Conversion-Ziel für HARA.", action: "Ziel bestätigen" },
  { label: "Agenten vorbereiten", text: "HARA erstellt Analyse- und Marketing-Drafts. Providerkontakte bleiben blockiert.", action: "Agenten vorbereiten" },
  { label: "Freigabegrenze prüfen", text: "Prüfen Sie den Approval-first-Modus, bevor Sie den HARA-Center öffnen.", action: "HARA-Center öffnen" },
] as const;

export default function HaraOnboarding() {
  const [step, setStep] = useState(0);
  const current = steps[step];
  return <main className="cyber-grid min-h-screen px-4 py-8 text-foreground"><section className="cyber-panel mx-auto max-w-xl p-6 sm:p-8"><p className="mono text-[10px] tracking-[0.18em] text-cyan-200">HARA // 3-STEP ONBOARDING</p><h1 className="mt-3 text-3xl font-bold text-white">HARA sicher einrichten</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">In drei kurzen Schritten bereiten Sie interne Agentenarbeit vor. Zahlungen, Nachrichten und Veröffentlichungen bleiben bis zur expliziten Einzel-Freigabe blockiert.</p><div className="mt-8 flex gap-2" aria-label="Onboarding-Fortschritt">{steps.map((item, index) => <div key={item.label} className={`h-2 flex-1 rounded-full ${index <= step ? "bg-cyan-300" : "bg-border"}`} aria-label={`${item.label}: ${index <= step ? "erreicht" : "offen"}`} />)}</div><div className="mt-8 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5"><p className="mono text-[10px] text-cyan-200">SCHRITT {step + 1} / 3</p><h2 className="mt-2 text-xl font-semibold text-white">{current.label}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{current.text}</p>{step < 2 ? <button type="button" className="mt-6 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition-transform active:scale-[0.97]" onClick={() => setStep(value => value + 1)}>{current.action}</button> : <Link href="/hara" className="mt-6 inline-flex rounded-xl bg-violet-300 px-4 py-3 text-sm font-semibold text-slate-950">{current.action}</Link>}</div></section></main>;
}
