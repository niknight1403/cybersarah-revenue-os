import { RevenueMutationError, RevenueQueryError } from "@/components/RevenueFeedback";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BadgeCheck, Clapperboard, Send, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { useLocation } from "wouter";

export function buildTikTokContentDraft(persona: string, thema: string) {
  const safePersona = persona.trim().slice(0, 80);
  const safeThema = thema.trim().slice(0, 200);
  return {
    actionType: "tiktok_content_draft",
    target: "TikTok-Video-Entwurf",
    payload: {
      source: "tiktok_studio",
      externalExecution: false,
      consentRequired: true,
      uploadReady: false,
      content: {
        persona: safePersona,
        hook: `Wusstest du, dass ${safeThema}?`,
        scenes: [
          { seconds: 0, text: `Hook: ${safeThema}`, visual: "neutrale Textanimation, kein Personen-Imitat" },
          { seconds: 5, text: "Kernaussage in einem Satz", visual: "ruhige Grafik-Slide" },
          { seconds: 12, text: "Handlungsaufforderung", visual: "klarer CTA-Platzhalter; kein automatischer Link" },
        ],
        voiceoverSkript: `${safeThema} — und so kannst du das für dich nutzen.`,
        caption: `${safeThema} #cybersarah #ki #automatisierung`,
        guardrail: "Nur nach Freigabe rendern und posten; keine automatische Veroeffentlichung, kein synthetisches Gesicht.",
      },
    },
  };
}

function tiktokContent(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const record = payload as Record<string, unknown>;
  const content = record.content && typeof record.content === "object" && !Array.isArray(record.content) ? record.content as Record<string, unknown> : {};
  const lines = [content.persona, content.hook, content.voiceoverSkript, content.caption, content.guardrail];
  return lines.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

export default function TikTokStudio() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const overview = trpc.revenue.overview.useQuery();
  const [persona, setPersona] = useState("");
  const [thema, setThema] = useState("");
  const createDraft = trpc.revenue.createApprovalDraft.useMutation({
    onSuccess: () => { setThema(""); void utils.revenue.overview.invalidate(); },
  });

  if (overview.isError) return <RevenueQueryError subject="TikTok-Studio" />;
  if (overview.isLoading) return <section className="autonomy-hero text-sm text-muted-foreground">TikTok-Studio wird geladen ...</section>;
  if (!overview.data?.workspace) return <section className="autonomy-hero"><h1 className="text-2xl font-bold text-white">TikTok-Studio benoetigt einen Workspace</h1><Button className="mt-5" onClick={() => setLocation("/app")}>Workspace oeffnen</Button></section>;

  const drafts = overview.data.approvalActions.filter(action => /tiktok/i.test(action.actionType));

  return (
    <section className="space-y-5">
      <header className="autonomy-hero">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="autonomy-kicker">TIKTOK-STUDIO // DRAFT-ONLY</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Taeglicher Content-Vorschlag, ein Klick zur Freigabe.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Der Agent bereitet taeglich ein Video-Konzept vor (Hook, Szenen, Voiceover-Skript, Caption). Rendering und Veroeffentlichung bleiben bis zur expliziten Freigabe blockiert.
            </p>
          </div>
          <Clapperboard className="h-8 w-8 text-violet-200" />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <article className="autonomy-card">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-200" />
            <h2 className="font-semibold text-white">Video-Entwuerfe</h2>
          </div>
          <div className="mt-4 space-y-3">
            {drafts.length ? drafts.map(draft => {
              const content = tiktokContent(draft.payload);
              return (
                <div key={draft.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{draft.actionType}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{draft.target}</p>
                    </div>
                    <BadgeCheck className="h-4 w-4 shrink-0 text-amber-200" />
                  </div>
                  {content.length ? (
                    <div className="mt-3 space-y-1 border-t border-white/10 pt-3">
                      {content.map((line, index) => <p key={index} className="text-xs leading-5 text-slate-200">{line}</p>)}
                    </div>
                  ) : <p className="mt-3 text-xs text-muted-foreground">Der Entwurf enthaelt noch keinen ausspielbaren Inhalt.</p>}
                  <p className="mt-3 text-[11px] text-amber-100">Freigabe ausstehend - keine Aussenwirkung</p>
                </div>
              );
            }) : <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-muted-foreground">Noch keine TikTok-Entwuerfe. Erstellen Sie einen ersten Video-Impuls.</p>}
          </div>
          <Button className="mt-4" variant="outline" onClick={() => setLocation("/approvals")}>Alle Entwuerfe pruefen</Button>
        </article>

        <article className="autonomy-card">
          <p className="autonomy-kicker">NEUER VIDEO-IMPULS</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Entwurf an HARA uebergeben</h2>
          <label className="mt-4 block text-xs text-muted-foreground" htmlFor="tiktok-persona">Persona-Name</label>
          <input
            id="tiktok-persona"
            value={persona}
            onChange={event => setPersona(event.target.value)}
            placeholder="z. B. CyberSarah"
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/55 p-3 text-sm text-white"
            maxLength={80}
          />
          <label className="mt-4 block text-xs text-muted-foreground" htmlFor="tiktok-thema">Thema des Videos</label>
          <textarea
            id="tiktok-thema"
            value={thema}
            onChange={event => setThema(event.target.value)}
            placeholder="z. B. Wie KI-Agenten Kundennachfragen automatisch qualifizieren"
            className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-slate-950/55 p-3 text-sm text-white"
            maxLength={500}
          />
          <Button
            className="mt-3 w-full"
            disabled={thema.trim().length < 8 || persona.trim().length < 2 || createDraft.isPending}
            onClick={() => createDraft.mutate(buildTikTokContentDraft(persona, thema))}
          >
            {createDraft.isPending ? "Wird vorbereitet ..." : "Als Freigabeentwurf speichern"}
            <Send className="ml-2 h-4 w-4" />
          </Button>
          {createDraft.isError && <RevenueMutationError action="Der TikTok-Entwurf" />}
        </article>
      </div>
    </section>
  );
}
