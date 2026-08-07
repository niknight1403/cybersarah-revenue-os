import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, RefreshCw, Eye, MousePointerClick, PauseCircle } from "lucide-react";

const BASE = "/api";
function authH(): Record<string, string> {
  const token = import.meta.env["VITE_API_AUTH_TOKEN"] as string | undefined;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Stats {
  leadsAktiv: number; leadsPausiert: number; nachrichtenGesamt: number;
  oeffnungsrate: string; klickrate: string;
}
interface LeadRow {
  leadId: number; email: string; marke: string; quelle: string | null; status: string;
  nachrichtenAnzahl: number | null; geoeffnetAnzahl: number | null; geklicktAnzahl: number | null;
  pausiert: boolean | null; naechsteNachrichtAm: string | null;
}

export function LeadNurtureDashboard() {
  const qc = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["nurture-stats"],
    queryFn: async () => (await fetch(`${BASE}/lead-nurture/stats`, { headers: authH() })).json(),
    refetchInterval: 60_000,
  });

  const { data: leadsData, isLoading: leadsLoading } = useQuery<{ leads: LeadRow[] }>({
    queryKey: ["nurture-leads"],
    queryFn: async () => (await fetch(`${BASE}/lead-nurture/leads`, { headers: authH() })).json(),
  });

  const { mutate: neuLaden, isPending: laedt } = useMutation({
    mutationFn: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["nurture-stats"] }),
        qc.invalidateQueries({ queryKey: ["nurture-leads"] }),
      ]);
    },
  });

  const leads = leadsData?.leads ?? [];
  const isLoading = statsLoading || leadsLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Lead-Nurture
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Konsentbasiertes Follow-up · nie Kaltakquise · passt sich echtem Interesse an</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => neuLaden()} disabled={laedt}>
          <RefreshCw className={`h-3.5 w-3.5 ${laedt ? "animate-spin" : ""}`} />
          Neu laden
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Aktiv im Zyklus</p><p className="text-xl font-bold">{stats?.leadsAktiv ?? 0}</p></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-1 mb-1"><PauseCircle className="h-3.5 w-3.5 text-muted-foreground" /><p className="text-xs text-muted-foreground">Pausiert</p></div><p className="text-xl font-bold">{stats?.leadsPausiert ?? 0}</p></CardContent></Card>
            <Card className="border-blue-500/20 bg-blue-500/5"><CardContent className="p-3"><div className="flex items-center gap-1 mb-1"><Eye className="h-3.5 w-3.5 text-blue-400" /><p className="text-xs text-muted-foreground">Öffnungsrate</p></div><p className="text-xl font-bold text-blue-400">{stats?.oeffnungsrate ?? "0"}%</p></CardContent></Card>
            <Card className="border-purple-500/20 bg-purple-500/5"><CardContent className="p-3"><div className="flex items-center gap-1 mb-1"><MousePointerClick className="h-3.5 w-3.5 text-purple-400" /><p className="text-xs text-muted-foreground">Klickrate</p></div><p className="text-xl font-bold text-purple-400">{stats?.klickrate ?? "0"}%</p></CardContent></Card>
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-2">Leads im Zyklus ({leads.length})</h2>
            <div className="space-y-2">
              {leads.map(l => (
                <Card key={l.leadId} className={l.pausiert ? "opacity-50" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{l.email}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{l.marke} · {l.quelle ?? "unbekannte Quelle"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {l.status === "abgemeldet" && <Badge variant="outline" className="text-[9px] text-muted-foreground">abgemeldet</Badge>}
                        {l.pausiert && l.status === "aktiv" && <Badge variant="outline" className="text-[9px] text-yellow-400 border-yellow-500/30">pausiert</Badge>}
                        <span className="text-[10px] text-muted-foreground">{l.nachrichtenAnzahl ?? 0}✉ {l.geoeffnetAnzahl ?? 0}👁 {l.geklicktAnzahl ?? 0}🖱</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {leads.length === 0 && <p className="text-xs text-muted-foreground">Noch keine Leads im Nurture-Zyklus.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
