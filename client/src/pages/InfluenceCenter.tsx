import { RevenueMutationError, RevenueQueryError } from "@/components/RevenueFeedback";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BadgeCheck, Megaphone, Send, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { useLocation } from "wouter";

export function buildInfluenceDraft(angle: string) {
  return { actionType: "ai_influence_campaign_draft", target: "KI-Influence-Kampagne", payload: { source: "mobile_influence_center", externalExecution: false, consentRequired: true, content: { outreachAngle: angle.trim(), guardrail: "Nur nach Einwilligung und expliziter Freigabe; keine automatische Kontaktaufnahme." } } };
}

function influenceContent(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const record = payload as Record<string, unknown>;
  const content = record.content && typeof record.content === "object" && !Array.isArray(record.content) ? record.content as Record<string, unknown> : {};
  const lines = [record.recommendation, content.title, content.headline, content.metaDescription, content.socialCopy, content.outreachAngle, content.guardrail];
  return lines.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

export default function InfluenceCenter() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const overview = trpc.revenue.overview.useQuery();
  const [angle, setAngle] = useState("");
  const createDraft = trpc.revenue.createApprovalDraft.useMutation({ onSuccess: () => { setAngle(""); void utils.revenue.overview.invalidate(); } });
  if (overview.isError) return <RevenueQueryError subject="KI-Influence" />;
  if (overview.isLoading) return <section className="autonomy-hero text-sm text-muted-foreground">KI-Influence wird geladen …</section>;
  if (!overview.data?.workspace) return <section className="autonomy-hero"><h1 className="text-2xl font-bold text-white">KI-Influence benötigt einen Workspace</h1><Button className="mt-5" onClick={() => setLocation("/app")}>Workspace öffnen</Button></section>;
  const drafts = overview.data.approvalActions.filter(action => /outreach|seo|campaign|social|influence/i.test(action.actionType));
  return <section className="space-y-5"><header className="autonomy-hero"><div className="relative z-10 flex items-start justify-between gap-4"><div><p className="autonomy-kicker">KI INFLUENCE // DRAFT-ONLY</p><h1 className="mt-2 text-3xl font-bold text-white">Relevanz statt Reichweite um jeden Preis.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Die KI bereitet Content-, Outreach- und Kampagnenideen vor. Versand, Veröffentlichung und Kontaktaufnahme bleiben bis zur expliziten Freigabe blockiert.</p></div><Megaphone className="h-8 w-8 text-violet-200" /></div></header><div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]"><article className="autonomy-card"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-cyan-200" /><h2 className="font-semibold text-white">Influence-Entwürfe</h2></div><div className="mt-4 space-y-3">{drafts.length ? drafts.map(draft => { const content = influenceContent(draft.payload); return <div key={draft.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-white">{draft.actionType}</p><p className="mt-1 text-xs text-muted-foreground">{draft.target}</p></div><BadgeCheck className="h-4 w-4 shrink-0 text-amber-200" /></div>{content.length ? <div className="mt-3 space-y-1 border-t border-white/10 pt-3">{content.map((line, index) => <p key={`${draft.id}-${index}`} className="text-xs leading-5 text-slate-200">{line}</p>)}</div> : <p className="mt-3 text-xs text-muted-foreground">Der Entwurf enthält noch keinen ausspielbaren Inhalt.</p>}<p className="mt-3 text-[11px] text-amber-100">Freigabe ausstehend · keine Außenwirkung</p></div>; }) : <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-muted-foreground">Noch keine Influence-Entwürfe. Erstellen Sie einen geprüften Kampagnenimpuls.</p>}</div><Button className="mt-4" variant="outline" onClick={() => setLocation("/approvals")}>Alle Entwürfe prüfen</Button></article><article className="autonomy-card"><p className="autonomy-kicker">NEUER KAMPAGNENIMPULS</p><h2 className="mt-2 text-lg font-semibold text-white">Entwurf an HARA übergeben</h2><label className="mt-4 block text-xs text-muted-foreground" htmlFor="influence-angle">Thema oder Zielgruppe</label><textarea id="influence-angle" value={angle} onChange={event => setAngle(event.target.value)} placeholder="z. B. Gründerinnen mit Bedarf an auditierbarer Revenue-Automation" className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-slate-950/55 p-3 text-sm text-white" maxLength={500} /><Button className="mt-3 w-full" disabled={angle.trim().length < 8 || createDraft.isPending} onClick={() => createDraft.mutate(buildInfluenceDraft(angle))}>{createDraft.isPending ? "Wird vorbereitet …" : "Als Freigabeentwurf speichern"}<Send className="ml-2 h-4 w-4" /></Button>{createDraft.isError && <RevenueMutationError action="Der Influence-Entwurf" />}</article></div></section>;
}
