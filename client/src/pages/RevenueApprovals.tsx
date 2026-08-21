import { RevenueMutationError, RevenueQueryError } from "@/components/RevenueFeedback";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ShieldCheck } from "lucide-react";
import React, { useState } from "react";

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
          {overview.data.approvalActions.length ? overview.data.approvalActions.map(action => <article key={action.id} className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4"><p className="font-medium text-white">{action.actionType}</p><p className="mt-1 text-sm text-muted-foreground">{action.target}</p></article>) : <p className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">Keine ausstehenden Freigabeentwürfe.</p>}
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
