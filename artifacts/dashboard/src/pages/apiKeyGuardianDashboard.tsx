import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KeyRound, RefreshCw, CheckCircle2, XCircle, HelpCircle, Clock } from "lucide-react";

const BASE = "/api";
function authH(): Record<string, string> {
  const token = import.meta.env["VITE_API_AUTH_TOKEN"] as string | undefined;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface KeyEntry {
  id: number; service: string; anzeigename: string; pruefTyp: string;
  status: string; letzterFehler: string | null; letzterCheckAm: string | null;
  ersteErkennungAm: string; zuletztRotiertAm: string | null;
}

const STATUS_ICON: Record<string, JSX.Element> = {
  ok: <CheckCircle2 className="h-4 w-4 text-green-400" />,
  fehler: <XCircle className="h-4 w-4 text-red-400" />,
  unbekannt: <HelpCircle className="h-4 w-4 text-muted-foreground" />,
};

function tageSeit(datum: string | null): number | null {
  if (!datum) return null;
  return Math.floor((Date.now() - new Date(datum).getTime()) / (1000 * 60 * 60 * 24));
}

export function ApiKeyGuardianDashboard() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ keys: KeyEntry[] }>({
    queryKey: ["apikey-status"],
    queryFn: async () => (await fetch(`${BASE}/api-keys/status`, { headers: authH() })).json(),
    refetchInterval: 60_000,
  });

  const { mutate: neuLaden, isPending: laedt } = useMutation({
    mutationFn: async () => { await qc.invalidateQueries({ queryKey: ["apikey-status"] }); },
  });

  const { mutate: markiereRotiert } = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${BASE}/api-keys/${id}/rotiert`, { method: "POST", headers: authH() });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["apikey-status"] }),
  });

  const keys = data?.keys ?? [];
  const fehlerhaft = keys.filter(k => k.status === "fehler").length;
  const alte = keys.filter(k => (tageSeit(k.zuletztRotiertAm ?? k.ersteErkennungAm) ?? 0) > 90).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            API-Key-Guardian
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Unabhängige Live-Prüfung · Alterungs-Erinnerung · Sofort-Warnung bei Totalausfall</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => neuLaden()} disabled={laedt}>
          <RefreshCw className={`h-3.5 w-3.5 ${laedt ? "animate-spin" : ""}`} />
          Neu laden
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card className={fehlerhaft > 0 ? "border-red-500/30 bg-red-500/5" : ""}>
              <CardContent className="p-3"><p className="text-xs text-muted-foreground mb-1">Fehlerhaft</p><p className="text-xl font-bold">{fehlerhaft}</p></CardContent>
            </Card>
            <Card className={alte > 0 ? "border-yellow-500/30 bg-yellow-500/5" : ""}>
              <CardContent className="p-3"><p className="text-xs text-muted-foreground mb-1">Rotation überfällig</p><p className="text-xl font-bold">{alte}</p></CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            {keys.map(k => {
              const tage = tageSeit(k.zuletztRotiertAm ?? k.ersteErkennungAm);
              const ueberfaellig = (tage ?? 0) > 90;
              return (
                <Card key={k.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex items-start gap-2">
                        {k.pruefTyp === "live_check" ? STATUS_ICON[k.status] : <Clock className="h-4 w-4 text-muted-foreground" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{k.anzeigename}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {k.pruefTyp === "live_check" ? (k.status === "ok" ? "Live geprüft — funktioniert" : k.letzterFehler ?? "Status unbekannt") : "Nur Alterungs-Überwachung"}
                            {" · "}
                            <span className={ueberfaellig ? "text-yellow-400" : ""}>{tage ?? "?"} Tage seit letzter Rotation</span>
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 shrink-0" onClick={() => markiereRotiert(k.id)}>
                        Als rotiert markieren
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {keys.length === 0 && <p className="text-xs text-muted-foreground">Noch keine Keys erkannt — läuft beim nächsten Agenten-Durchlauf automatisch.</p>}
          </div>
        </>
      )}
    </div>
  );
}
