import { Button } from "@/components/ui/button";
import { BadgeCheck, GitBranch, PackageCheck, ShieldCheck, Smartphone } from "lucide-react";
import { useLocation } from "wouter";

const checks = [
  { label: "Test-Suite", value: "129 Tests grün", tone: "text-emerald-200" },
  { label: "TypeScript", value: "Keine Fehler", tone: "text-emerald-200" },
  { label: "Health-Endpunkte", value: "healthz · readyz · livez 200", tone: "text-emerald-200" },
  { label: "Deployment", value: "Managed WebDev · Autoscale", tone: "text-cyan-200" },
];

export default function ReleaseCenter() {
  const [, setLocation] = useLocation();

  return (
    <section className="space-y-5" data-testid="release-center">
      <header className="autonomy-hero">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="autonomy-kicker">RELEASE CONTROL // SPRINT 01</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Release Center</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Ein zentraler, mobiler Checkpoint für Qualität, GitHub-Synchronisation und Android-Readiness. Jede Veröffentlichung bleibt nachvollziehbar und benötigt eine explizite menschliche Entscheidung.
            </p>
          </div>
          <PackageCheck className="h-8 w-8 shrink-0 text-cyan-200" />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="autonomy-card">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-100">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-white">Version 1.0.6</p>
              <p className="mt-1 text-xs text-muted-foreground">Branch main · Approval-first Release</p>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-t border-white/10 pt-3"><dt className="text-muted-foreground">Letzter Checkpoint</dt><dd className="text-right text-white">18e95bd2</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">GitHub-Ziel</dt><dd className="text-right text-white">cybersarah-revenue-os</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Externe Aktionen</dt><dd className="text-right text-amber-100">blockiert bis Freigabe</dd></div>
          </dl>
          <Button className="mt-5 w-full" onClick={() => setLocation("/approvals")}><ShieldCheck className="mr-2 h-4 w-4" />Freigabe-Queue öffnen</Button>
        </article>

        <article className="autonomy-card">
          <div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-cyan-200" /><h2 className="font-semibold text-white">Android-Artefakt</h2></div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Das vorhandene AAB ist als Build-Artefakt verfügbar. Ein signiertes Produktions-APK erfordert weiterhin einen extern verwalteten Keystore und verifizierte Asset Links.</p>
          <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3"><p className="text-sm font-medium text-emerald-100">AAB vorhanden</p><p className="mt-1 text-xs text-emerald-100/70">Signatur und Store-Einreichung separat prüfen</p></div>
          <Button variant="outline" className="mt-4 w-full" onClick={() => setLocation("/compliance")}><BadgeCheck className="mr-2 h-4 w-4" />Play-Store-Readiness prüfen</Button>
        </article>
      </div>

      <article className="autonomy-card">
        <div className="flex items-center justify-between gap-4"><div><p className="autonomy-kicker">QUALITY GATE</p><h2 className="mt-1 text-xl font-semibold text-white">Sprint-Verifikation</h2></div><BadgeCheck className="h-6 w-6 text-emerald-200" /></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{checks.map(check => <div key={check.label} className="rounded-xl border border-white/10 bg-slate-950/40 p-3"><p className="text-xs text-muted-foreground">{check.label}</p><p className={`mt-1 text-sm font-medium ${check.tone}`}>{check.value}</p></div>)}</div>
        <p className="mt-5 text-sm leading-6 text-slate-300"><strong className="text-white">Governance:</strong> Dieser Bereich dokumentiert Readiness, löst aber weder GitHub-Pushes noch Provider-Aktionen automatisch aus. Der Push bleibt ein separater, auditierbarer Release-Schritt.</p>
      </article>
    </section>
  );
}
