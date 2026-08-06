import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, RefreshCw, TrendingUp, Percent, Mail } from "lucide-react";

const BASE = "/api";
function authH(): Record<string, string> {
  const token = import.meta.env["VITE_API_AUTH_TOKEN"] as string | undefined;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Rule {
  id: number; quellProdukt: string; zielProdukt: string; kategorie: string | null;
  wahrscheinlichkeit: string; konversionsRate: string; anzahlEmpfohlen: number;
  anzahlKonvertiert: number; rabattProzent: number | null; aktiv: boolean;
}
interface Recommendation {
  id: number; kundenEmail: string; quellProdukt: string; zielProdukt: string;
  status: string; kanal: string | null; gesendetAm: string | null;
}
interface Stats {
  regelnAktiv: number; empfehlungenGesendet: number; konvertiert: number;
  konversionsRate: string; umsatzDurchCrossSell?: string;
}

const STATUS_STYLE: Record<string, string> = {
  ausstehend: "text-blue-400 border-blue-500/30", gesendet: "text-yellow-400 border-yellow-500/30",
  geklickt: "text-purple-400 border-purple-500/30", konvertiert: "text-green-400 border-green-500/30",
  abgelaufen: "text-muted-foreground border-border",
};
const KATEGORIE_LABEL: Record<string, string> = {
  cross_sell: "🎯 Cross-Sell", upsell: "⬆️ Upsell", bundle: "📦 Bundle", addon: "➕ Add-on",
};

export function CrossSellDashboard() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"regeln" | "empfehlungen">("regeln");

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["crosssell-stats"],
    queryFn: async () => (await fetch(`${BASE}/cross-sell/stats`, { headers: authH() })).json(),
    refetchInterval: 60_000,
  });

  const { data: rulesData, isLoading: rulesLoading } = useQuery<{ rules: Rule[] }>({
    queryKey: ["crosssell-rules"],
    queryFn: async () => (await fetch(`${BASE}/cross-sell/rules`, { headers: authH() })).json(),
  });

  const { data: recsData, isLoading: recsLoading } = useQuery<{ recommendations: Recommendation[] }>({
    queryKey: ["crosssell-recs"],
    queryFn: async () => (await fetch(`${BASE}/cross-sell/recommendations`, { headers: authH() })).json(),
  });

  const { mutate: neuLaden, isPending: laedt } = useMutation({
    mutationFn: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["crosssell-stats"] }),
        qc.invalidateQueries({ queryKey: ["crosssell-rules"] }),
        qc.invalidateQueries({ queryKey: ["crosssell-recs"] }),
      ]);
    },
  });

  const rules = rulesData?.rules ?? [];
  const recs = recsData?.recommendations ?? [];
  const isLoading = statsLoading || rulesLoading || recsLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Cross-Sell Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-1">KI-Produktempfehlungen · Multi-Channel-Kampagnen · Auto-Rabatt-Optimierung</p>
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
            <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-blue-400" /><span className="text-xs text-muted-foreground">Aktive Regeln</span></div><p className="text-xl font-bold">{stats?.regelnAktiv ?? rules.length}</p></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><Mail className="h-4 w-4 text-yellow-400" /><span className="text-xs text-muted-foreground">Gesendet</span></div><p className="text-xl font-bold">{stats?.empfehlungenGesendet ?? recs.length}</p></CardContent></Card>
            <Card className="border-green-500/20 bg-green-500/5"><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-green-400" /><span className="text-xs text-muted-foreground">Konvertiert</span></div><p className="text-xl font-bold text-green-400">{stats?.konvertiert ?? 0}</p></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><Percent className="h-4 w-4 text-purple-400" /><span className="text-xs text-muted-foreground">Conversion-Rate</span></div><p className="text-xl font-bold">{stats?.konversionsRate ?? "0%"}</p></CardContent></Card>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {([{ key: "regeln", label: `📋 Regeln (${rules.length})` }, { key: "empfehlungen", label: `📧 Empfehlungen (${recs.length})` }] as const).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                  tab === t.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "regeln" ? (
            <div className="space-y-2">
              {rules.map(r => (
                <Card key={r.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.quellProdukt} → {r.zielProdukt}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[9px]">{KATEGORIE_LABEL[r.kategorie ?? ""] ?? r.kategorie}</Badge>
                          <span className="text-[10px] text-muted-foreground">{r.anzahlKonvertiert}/{r.anzahlEmpfohlen} konvertiert</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{(parseFloat(r.wahrscheinlichkeit) * 100).toFixed(0)}%</p>
                        {!!r.rabattProzent && <p className="text-[10px] text-yellow-400">-{r.rabattProzent}%</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {rules.length === 0 && <p className="text-xs text-muted-foreground">Noch keine Regeln — der Agent erstellt sie automatisch beim nächsten Lauf.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {recs.map(r => (
                <Card key={r.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.kundenEmail}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{r.quellProdukt} → {r.zielProdukt}</p>
                      </div>
                      <Badge variant="outline" className={`text-[9px] shrink-0 ${STATUS_STYLE[r.status] ?? ""}`}>{r.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {recs.length === 0 && <p className="text-xs text-muted-foreground">Noch keine Empfehlungen gesendet.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
