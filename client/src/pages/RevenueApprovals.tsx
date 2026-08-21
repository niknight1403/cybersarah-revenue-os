import { RevenueMutationError, RevenueQueryError } from "@/components/RevenueFeedback";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ShieldCheck } from "lucide-react";
import React, { useState } from "react";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function approvalDetails(payload: unknown) {
  const draft = asRecord(payload);
  if (!draft) return [];
  const content = asRecord(draft.content);
  const details = [draft.recommendation, content?.title, content?.headline, content?.metaDescription, content?.socialCopy, content?.outreachAngle, content?.offer, content?.guardrail]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  const sections = Array.isArray(content?.sections) ? content.sections.filter((value): value is string => typeof value === "string" && value.trim().length > 0) : [];
  return [...details, ...sections];
}

export default function RevenueApprovals() {
  const [actionType, setActionType] = useState("Campaign review");
  const [target, setTarget] = useState("");
  const utils = trpc.useUtils();
  const overview = trpc.revenue.overview.useQuery();
  const createDraft = trpc.revenue.createApprovalDraft.useMutation({
    onSuccess: () => {
      setTarget("");
      void utils.revenue.overview.invalidate();
    },
  });

  if (overview.isError) return <RevenueQueryError subject="Die Freigabequeue" />;
  if (!overview.data?.workspace) return <div className="cyber-panel p-6 text-muted-foreground">Richten Sie zuerst im Workspace einen Revenue-Arbeitsbereich ein.</div>;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="cyber-panel p-6">
        <p className="mono text-[10px] tracking-[0.18em] text-violet-200">GOVERNANCE // APPROVAL QUEUE</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Freigabeentwürfe</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Ein Entwurf löst keine externe Aktion aus. Er bleibt bis zu einem expliziten künftigen Freigabeschritt in der Queue.</p>
        <div className="mt-6 space-y-3">
          {overview.data.approvalActions.length ? overview.data.approvalActions.map(action => {
            const details = approvalDetails(action.payload);
            const payload = asRecord(action.payload);
            const consentRequired = payload?.consentRequired === true;
            const externallyBlocked = payload?.externalExecution === false;
            return <article key={action.id} className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4"><p className="font-medium text-white">{action.actionType}</p><p className="mt-1 text-sm text-muted-foreground">{action.target}</p>{details.length ? <div className="mt-3 space-y-2 border-t border-amber-200/10 pt-3"><p className="mono text-[10px] tracking-[0.12em] text-amber-200">ENTWURFSINHALT</p>{details.map((detail, index) => <p key={`${action.id}-${index}`} className="text-xs leading-5 text-slate-200">{detail}</p>)}</div> : null}<div className="mt-3 flex flex-wrap gap-2 text-[10px]">{consentRequired ? <span className="rounded-full border border-violet-200/20 bg-violet-200/10 px-2 py-1 text-violet-100">Einwilligung erforderlich</span> : null}{externallyBlocked ? <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-2 py-1 text-cyan-100">Externe Ausführung gesperrt</span> : null}<span className="rounded-full border border-amber-200/20 bg-amber-200/10 px-2 py-1 text-amber-100">Freigabe ausstehend</span></div></article>;
          }) : <p className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">Keine ausstehenden Freigabeentwürfe.</p>}
        </div>
      </section>
      <aside className="cyber-panel p-6">
        <ShieldCheck className="h-5 w-5 text-amber-200" />
        <h2 className="mt-3 text-xl font-semibold text-white">Neuen Entwurf anlegen</h2>
        <form className="mt-5 space-y-3" onSubmit={event => { event.preventDefault(); createDraft.mutate({ actionType, target, payload: { source: "manual_workspace_draft" } }); }}>
          <label className="block text-xs text-muted-foreground" htmlFor="approval-type">Entwurfsart</label>
          <input id="approval-type" className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground" value={actionType} onChange={event => setActionType(event.target.value)} minLength={2} maxLength={100} required />
          <label className="block text-xs text-muted-foreground" htmlFor="approval-target">Ziel / Kontext</label>
          <input id="approval-target" className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground" value={target} onChange={event => setTarget(event.target.value)} minLength={2} maxLength={240} required />
          <Button type="submit" className="w-full bg-amber-300 text-slate-950 hover:bg-amber-200" disabled={createDraft.isPending}>Freigabeentwurf speichern</Button>
          {createDraft.isError && <RevenueMutationError action="Der Freigabeentwurf" />}
        </form>
      </aside>
    </div>
  );
}
