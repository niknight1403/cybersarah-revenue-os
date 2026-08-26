import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

type Provider = "manus" | "google" | "microsoft";

const messages: Record<string, string> = {
  "google-oauth-not-configured": "Google-Anmeldung ist derzeit nicht konfiguriert. Bitte verwenden Sie Manus OAuth.",
  "google-oauth-callback-failed": "Google konnte die Anmeldung nicht abschließen. Prüfen Sie die Redirect-URI und versuchen Sie es erneut.",
  "oauth-callback-failed": "Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
  "access_denied": "Die Anmeldung wurde abgebrochen. Sie können es erneut versuchen.",
};

function providerLabel(provider: Provider) {
  return provider === "manus" ? "Manus" : provider === "google" ? "Google" : "Microsoft";
}

export default function LoginModal() {
  const providers = trpc.auth.providers.useQuery();
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("oauth_error") || params.get("error");
    if (!code) return;
    setError(messages[code] ?? "Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut.");
    params.delete("oauth_error");
    params.delete("error");
    const clean = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", clean);
  }, []);

  const start = (provider: Provider) => {
    setError(null);
    setLoadingProvider(provider);
    const destination = provider === "manus" ? getLoginUrl() : `/api/oauth/${provider}`;
    window.location.assign(destination);
  };

  const isDisabled = providers.isLoading || loadingProvider !== null;
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/30 p-4" aria-labelledby="login-title">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="login-title" className="text-sm font-semibold text-white">Sicher anmelden</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Wählen Sie einen konfigurierten Identitätsanbieter. Passwörter werden von CyberSarah nicht gespeichert.</p>
        </div>
      </div>
      {error && <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-xs leading-5 text-rose-50" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{error}</span></div>}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {(["manus", "google", "microsoft"] as Provider[]).map(provider => {
          const enabled = provider === "manus" || providers.data?.[provider] === true;
          const active = loadingProvider === provider;
          return <Button key={provider} type="button" variant={provider === "manus" ? "default" : "outline"} className="min-h-11" disabled={!enabled || isDisabled} onClick={() => start(provider)} aria-busy={active} title={!enabled ? `${providerLabel(provider)} ist nicht konfiguriert` : undefined}>{active ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}{active ? "Wird verbunden …" : `Mit ${providerLabel(provider)} anmelden`}{!active && provider === "manus" ? <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /> : null}</Button>;
        })}
      </div>
      {!providers.isLoading && !providers.data?.google && !providers.data?.microsoft && <p className="mt-3 text-[11px] text-amber-100/80">Google und Microsoft sind derzeit nicht verfügbar, weil die Provider-Konfiguration fehlt.</p>}
    </section>
  );
}
