import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, RefreshCw, Users2, Coins, Share2, Plus } from "lucide-react";

const BASE = "/api";
function authH(): Record<string, string> {
  const token = import.meta.env["VITE_API_AUTH_TOKEN"] as string | undefined;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Card_ {
  id: number; kundenEmail: string | null; punkte: number; umsatzGesamt: string;
  transaktionsAnzahl: number; stufe: string;
}
interface Referral {
  id: number; code: string; werberEmail: string | null; geworbenerEmail: string | null;
  status: string; praemieGewaehrt: boolean;
}
interface Stats {
  kartenGesamt: number; stufenVerteilung: Record<string, number>; gesamtPunkteImUmlauf: number;
  gesamtUmsatz: string; referralsGesamt: number; praemienGewaehrt: number;
}

const STUFEN_BADGE: Record<string, string> = { bronze: "🥉", silber: "🥈", gold: "🥇", platin: "💎" };
const STUFEN_FARBE: Record<string, string> = {
  bronze: "text-amber-600 border-amber-600/30", silber: "text-slate-300 border-slate-300/30",
  gold: "text-yellow-400 border-yellow-400/30", platin: "text-cyan-300 border-cyan-300/30",
};
const REFERRAL_STATUS: Record<string, string> = {
  offen: "text-blue-400 border-blue-500/30", registriert: "text-yellow-400 border-yellow-500/30",
  erster_kauf: "text-purple-400 border-purple-500/30", praemie_gewaehrt: "text-green-400 border-green-500/30",
  abgelaufen: "text-muted-foreground border-border",
};

export function LoyaltyDashboard() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"karten" | "referrals" | "neu">("karten");
  const [neueEmail, setNeueEmail] = useState("");
  const [referralEmail, setReferralEmail] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["loyalty-stats"],
    queryFn: async () => (await fetch(`${BASE}/loyalty/stats`, { headers: authH() })).json(),
    refetchInterval: 60_000,
  });

  const { data: cardsData, isLoading: cardsLoading } = useQuery<{ cards: Card_[] }>({
    queryKey: ["loyalty-cards"],
    queryFn: async () => (await fetch(`${BASE}/loyalty/cards`, { headers: authH() })).json(),
  });

  const { data: referralsData, isLoading: referralsLoading } = useQuery<{ referrals: Referral[] }>({
    queryKey: ["loyalty-referrals"],
    queryFn: async () => (await fetch(`${BASE}/loyalty/referrals`, { headers: authH() })).json(),
  });

  const { mutate: neuLaden, isPending: laedt } = useMutation({
    mutationFn: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["loyalty-stats"] }),
        qc.invalidateQueries({ queryKey: ["loyalty-cards"] }),
        qc.invalidateQueries({ queryKey: ["loyalty-referrals"] }),
      ]);
    },
  });

  const { mutate: karteAnlegen, isPending: anlegenKarte } = useMutation({
    mutationFn: async () => {
      await fetch(`${BASE}/loyalty/cards`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authH() },
        body: JSON.stringify({ kundenEmail: neueEmail }),
      });
    },
    onSuccess: () => { setNeueEmail(""); void qc.invalidateQueries({ queryKey: ["loyalty-cards", "loyalty-stats"] }); },
  });

  const { mutate: referralAnlegen, isPending: anlegenReferral } = useMutation({
    mutationFn: async () => {
      await fetch(`${BASE}/loyalty/referrals`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authH() },
        body: JSON.stringify({ werberEmail: referralEmail }),
      });
    },
    onSuccess: () => { setReferralEmail(""); void qc.invalidateQueries({ queryKey: ["loyalty-referrals", "loyalty-stats"] }); },
  });

  const cards = cardsData?.cards ?? [];
  const referrals = referralsData?.referrals ?? [];
  const isLoading = statsLoading || cardsLoading || referralsLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Treueprogramm
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Punkte · Stufen · Empfehlungsprämien</p>
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
            <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><Users2 className="h-4 w-4 text-blue-400" /><span className="text-xs text-muted-foreground">Karten</span></div><p className="text-xl font-bold">{stats?.kartenGesamt ?? 0}</p></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><Coins className="h-4 w-4 text-yellow-400" /><span className="text-xs text-muted-foreground">Punkte im Umlauf</span></div><p className="text-xl font-bold">{stats?.gesamtPunkteImUmlauf ?? 0}</p></CardContent></Card>
            <Card className="border-green-500/20 bg-green-500/5"><CardContent className="p-3"><p className="text-xs text-muted-foreground mb-1">Umsatz über Programm</p><p className="text-xl font-bold text-green-400">€{stats?.gesamtUmsatz ?? "0"}</p></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><Share2 className="h-4 w-4 text-purple-400" /><span className="text-xs text-muted-foreground">Empfehlungen</span></div><p className="text-xl font-bold">{stats?.praemienGewaehrt ?? 0}/{stats?.referralsGesamt ?? 0}</p></CardContent></Card>
          </div>

          {stats?.stufenVerteilung && (
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(stats.stufenVerteilung).map(([stufe, count]) => (
                <Badge key={stufe} variant="outline" className={`text-[10px] ${STUFEN_FARBE[stufe] ?? ""}`}>{STUFEN_BADGE[stufe] ?? ""} {stufe}: {count}</Badge>
              ))}
            </div>
          )}

          <div className="flex gap-1.5 flex-wrap">
            {([{ key: "karten", label: `💳 Karten (${cards.length})` }, { key: "referrals", label: `🔗 Empfehlungen (${referrals.length})` }, { key: "neu", label: "➕ Neu anlegen" }] as const).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${tab === t.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "karten" ? (
            <div className="space-y-2">
              {cards.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.kundenEmail ?? "Unbekannt"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`text-[9px] ${STUFEN_FARBE[c.stufe] ?? ""}`}>{STUFEN_BADGE[c.stufe] ?? ""} {c.stufe}</Badge>
                          <span className="text-[10px] text-muted-foreground">{c.transaktionsAnzahl} Käufe</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-yellow-400">{c.punkte} P</p>
                        <p className="text-[10px] text-muted-foreground">€{parseFloat(c.umsatzGesamt).toFixed(0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {cards.length === 0 && <p className="text-xs text-muted-foreground">Noch keine Karten — leg die erste unter "Neu anlegen" an.</p>}
            </div>
          ) : tab === "referrals" ? (
            <div className="space-y-2">
              {referrals.map(r => (
                <Card key={r.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{r.werberEmail}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{r.code}</p>
                      </div>
                      <Badge variant="outline" className={`text-[9px] shrink-0 ${REFERRAL_STATUS[r.status] ?? ""}`}>{r.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {referrals.length === 0 && <p className="text-xs text-muted-foreground">Noch keine Empfehlungslinks erstellt.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Neue Treuekarte</CardTitle></CardHeader>
                <CardContent className="pt-0 flex gap-2">
                  <Input placeholder="kunde@email.de" value={neueEmail} onChange={e => setNeueEmail(e.target.value)} className="h-9 text-sm" />
                  <Button size="sm" onClick={() => karteAnlegen()} disabled={!neueEmail || anlegenKarte} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Anlegen
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Neuer Empfehlungslink</CardTitle></CardHeader>
                <CardContent className="pt-0 flex gap-2">
                  <Input placeholder="werber@email.de" value={referralEmail} onChange={e => setReferralEmail(e.target.value)} className="h-9 text-sm" />
                  <Button size="sm" onClick={() => referralAnlegen()} disabled={!referralEmail || anlegenReferral} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Erstellen
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
