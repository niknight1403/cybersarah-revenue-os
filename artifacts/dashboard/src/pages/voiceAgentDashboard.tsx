import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, RefreshCw, TrendingUp, Users, PhoneCall, AlertCircle, Plus } from "lucide-react";

const BASE = "/api";
function authH(): Record<string, string> {
  const token = import.meta.env["VITE_API_AUTH_TOKEN"] as string | undefined;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Client {
  id: number; firma: string; ansprechpartner: string; email: string;
  paket: string; monatlicherPreis: string; inkludierteMinuten: number;
  verbrauchteMinutenDiesenMonat: string; status: string; telefonnummer: string | null;
}
interface Call {
  id: number; clientId: number; anruferNummer: string | null; dauerSekunden: number;
  ergebnis: string | null; zusammenfassung: string | null; hoheDringlichkeit: boolean; createdAt: string;
}
interface Stats {
  kundenGesamt: number; kundenAktiv: number; mrr: string; anrufeGesamt: number; dringendeAnrufe: number;
}

const STATUS_STYLE: Record<string, string> = {
  onboarding: "text-blue-400 border-blue-500/30", aktiv: "text-green-400 border-green-500/30",
  pausiert: "text-yellow-400 border-yellow-500/30", gekuendigt: "text-muted-foreground border-border",
};
const PAKET_LABEL: Record<string, string> = { starter: "Starter (85€)", business: "Business (149€)", scale: "Scale (299€)" };
const ERGEBNIS_LABEL: Record<string, string> = {
  termin_gebucht: "📅 Termin gebucht", info_gegeben: "ℹ️ Info gegeben", weitergeleitet: "↪️ Weitergeleitet",
  lead_qualifiziert: "🎯 Lead qualifiziert", sonstiges: "💬 Sonstiges",
};

export function VoiceAgentDashboard() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"kunden" | "anrufe" | "neu">("kunden");
  const [form, setForm] = useState({ firma: "", ansprechpartner: "", email: "", telefon: "", branche: "", paket: "starter" });

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["voice-stats"],
    queryFn: async () => (await fetch(`${BASE}/voice-agent/stats`, { headers: authH() })).json(),
    refetchInterval: 60_000,
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery<{ clients: Client[] }>({
    queryKey: ["voice-clients"],
    queryFn: async () => (await fetch(`${BASE}/voice-agent/clients`, { headers: authH() })).json(),
  });

  const { data: callsData, isLoading: callsLoading } = useQuery<{ calls: Call[] }>({
    queryKey: ["voice-calls"],
    queryFn: async () => (await fetch(`${BASE}/voice-agent/calls?limit=30`, { headers: authH() })).json(),
  });

  const { mutate: neuLaden, isPending: laedt } = useMutation({
    mutationFn: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["voice-stats"] }),
        qc.invalidateQueries({ queryKey: ["voice-clients"] }),
        qc.invalidateQueries({ queryKey: ["voice-calls"] }),
      ]);
    },
  });

  const { mutate: kundeAnlegen, isPending: anlegen } = useMutation({
    mutationFn: async () => {
      await fetch(`${BASE}/voice-agent/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH() },
        body: JSON.stringify(form),
      });
    },
    onSuccess: () => {
      setForm({ firma: "", ansprechpartner: "", email: "", telefon: "", branche: "", paket: "starter" });
      setTab("kunden");
      void qc.invalidateQueries({ queryKey: ["voice-clients", "voice-stats"] });
    },
  });

  const clients = clientsData?.clients ?? [];
  const calls = callsData?.calls ?? [];
  const isLoading = statsLoading || clientsLoading || callsLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            KI-Telefonassistent
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Voice-Agent-Service · 85–299€/Monat pro Kunde</p>
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
            <Card className="border-green-500/20 bg-green-500/5"><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-green-400" /><span className="text-xs text-muted-foreground">MRR</span></div><p className="text-xl font-bold text-green-400">€{stats?.mrr ?? "0"}</p></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-blue-400" /><span className="text-xs text-muted-foreground">Aktive Kunden</span></div><p className="text-xl font-bold">{stats?.kundenAktiv ?? 0}</p></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><PhoneCall className="h-4 w-4 text-purple-400" /><span className="text-xs text-muted-foreground">Anrufe gesamt</span></div><p className="text-xl font-bold">{stats?.anrufeGesamt ?? 0}</p></CardContent></Card>
            <Card className={stats && stats.dringendeAnrufe > 0 ? "border-red-500/30 bg-red-500/5" : ""}><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><AlertCircle className="h-4 w-4 text-red-400" /><span className="text-xs text-muted-foreground">Dringend</span></div><p className="text-xl font-bold">{stats?.dringendeAnrufe ?? 0}</p></CardContent></Card>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {([{ key: "kunden", label: `👥 Kunden (${clients.length})` }, { key: "anrufe", label: `📞 Anrufe (${calls.length})` }, { key: "neu", label: "➕ Neuer Kunde" }] as const).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                  tab === t.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "kunden" ? (
            <div className="space-y-2">
              {clients.map(c => {
                const verbrauch = parseFloat(c.verbrauchteMinutenDiesenMonat);
                const ueber = verbrauch > c.inkludierteMinuten;
                return (
                  <Card key={c.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-sm truncate">{c.firma}</strong>
                            <Badge variant="outline" className={`text-[9px] ${STATUS_STYLE[c.status] ?? ""}`}>{c.status}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {PAKET_LABEL[c.paket] ?? c.paket} · {c.ansprechpartner}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-semibold ${ueber ? "text-red-400" : ""}`}>
                            {verbrauch.toFixed(0)}/{c.inkludierteMinuten} Min
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {clients.length === 0 && <p className="text-xs text-muted-foreground">Noch keine Kunden — leg den ersten unter "Neuer Kunde" an.</p>}
            </div>
          ) : tab === "anrufe" ? (
            <div className="space-y-2">
              {calls.map(c => (
                <Card key={c.id} className={c.hoheDringlichkeit ? "border-red-500/30" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{c.anruferNummer ?? "Unbekannt"}</span>
                          {c.hoheDringlichkeit && <Badge variant="outline" className="text-[9px] text-red-400 border-red-500/30">🔥 Dringend</Badge>}
                          {c.ergebnis && <Badge variant="outline" className="text-[9px]">{ERGEBNIS_LABEL[c.ergebnis] ?? c.ergebnis}</Badge>}
                        </div>
                        {c.zusammenfassung && <p className="text-[11px] text-muted-foreground mt-1">{c.zusammenfassung}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{Math.round(c.dauerSekunden / 60)} Min</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {calls.length === 0 && <p className="text-xs text-muted-foreground">Noch keine Anrufe eingegangen.</p>}
            </div>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Input placeholder="Firma" value={form.firma} onChange={e => setForm({ ...form, firma: e.target.value })} className="h-9 text-sm" />
                <Input placeholder="Ansprechpartner" value={form.ansprechpartner} onChange={e => setForm({ ...form, ansprechpartner: e.target.value })} className="h-9 text-sm" />
                <Input placeholder="E-Mail" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-9 text-sm" />
                <Input placeholder="Telefon (optional)" value={form.telefon} onChange={e => setForm({ ...form, telefon: e.target.value })} className="h-9 text-sm" />
                <Input placeholder="Branche" value={form.branche} onChange={e => setForm({ ...form, branche: e.target.value })} className="h-9 text-sm" />
                <div className="flex gap-1.5">
                  {(["starter", "business", "scale"] as const).map(p => (
                    <button key={p} onClick={() => setForm({ ...form, paket: p })}
                      className={`text-[11px] px-3 py-1.5 rounded-full border flex-1 ${form.paket === p ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                    >
                      {PAKET_LABEL[p]}
                    </button>
                  ))}
                </div>
                <Button className="w-full gap-2" onClick={() => kundeAnlegen()} disabled={!form.firma || !form.ansprechpartner || !form.email || anlegen}>
                  <Plus className="h-4 w-4" /> Kunde anlegen
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
