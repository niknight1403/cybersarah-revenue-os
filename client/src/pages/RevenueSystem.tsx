import { trpc } from "@/lib/trpc";
import { RevenueQueryError } from "@/components/RevenueFeedback";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import React from "react";

export default function RevenueSystem() {
  const info = trpc.app.info.useQuery();
  const title = info.data?.title ?? "CyberSarah Revenue OS";
  if (info.isError) return <RevenueQueryError subject="Die Systemkonfiguration" />;
  return <section className="cyber-panel p-6"><p className="mono text-[10px] tracking-[0.18em] text-cyan-200">RUNTIME // STATUS</p><h1 className="mt-2 text-3xl font-bold text-white">Systemstatus</h1>{info.isLoading ? <p className="mt-5 text-sm text-muted-foreground">Konfiguration wird geprüft …</p> : <div className="mt-5 rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-4"><CheckCircle2 className="mr-2 inline h-5 w-5 text-emerald-200" /><span className="font-medium text-emerald-100">{title} ist bereit.</span><p className="mt-2 text-xs text-emerald-100/80"><Activity className="mr-1 inline h-3.5 w-3.5" /> Liveness- und Readiness-Prüfungen stehen über die öffentlichen Health-Endpunkte bereit.</p></div>}</section>;
}
