# Hetzner-Service-Healthcheck

`ops/healthcheck-hetzner.sh` ist ein read-only-Check, der nach einem erfolgreichen SSH-Login auf dem Hetzner-Server ausgeführt werden kann. Das Skript liest keine `.env`-Dateien, Zugangsdaten oder Antwortkörper und gibt nur redigierte Statusinformationen, HTTP-Codes und den abschließenden Gesamtstatus aus.

## Ausführung

```bash
ssh -i ~/.ssh/cybersarah_release_ed25519 root@167.233.196.20
/usr/local/sbin/cybersarah-healthcheck
```

Der Exit-Code ist `0`, wenn alle Prüfungen erfolgreich sind. Ein Wert größer als `0` entspricht der Anzahl fehlgeschlagener Einzelprüfungen. Das macht das Skript für Cron, systemd-Timer und CI-Aufrufe geeignet.

## Standardprüfungen

| Kategorie | Standardwerte |
|---|---|
| systemd | `pm2-cybersarah.service`, `cybersarah-peer.service`, `cybersarah-disk-check-ntfy.timer`, `nginx` |
| TCP-Ports | `80`, `443`, `3000` |
| HTTP | `http://127.0.0.1:3000/api/healthz`, `http://127.0.0.1:3000/healthz`, `https://127.0.0.1/healthz` |
| Public TLS | Domains aus `HEALTHCHECK_PUBLIC_DOMAINS`; standardmäßig keine Domain voreingestellt |

Die Listen können für Test- oder Staging-Systeme überschrieben werden, ohne das Skript zu verändern. Für einen öffentlichen Zertifikatscheck muss mindestens eine tatsächlich auflösbare Domain gesetzt werden; der Standardwert ist absichtlich leer, damit keine falsche Nginx- oder Preview-Domain geprüft wird:

```bash
HEALTHCHECK_SYSTEMD_UNITS="nginx" \\
HEALTHCHECK_PORTS="80 443" \\
HEALTHCHECK_URLS="https://127.0.0.1/healthz" \\
HEALTHCHECK_PUBLIC_DOMAINS="example.org" \\
HEALTHCHECK_TLS_MIN_DAYS="14" \\
/usr/local/sbin/cybersarah-healthcheck
```

## Sicherheitsgrenzen

Das Skript führt keine Neustarts, Deployments, Migrationen oder Änderungen an Firewall, Secrets und Repository-Dateien aus. Für jede gesetzte öffentliche Domain prüft es die TLS-Kette, den Hostnamen und das Ablaufdatum. `HEALTHCHECK_TLS_MIN_DAYS` legt die Mindestrestlaufzeit fest und beträgt standardmäßig 14 Tage. Ist `HEALTHCHECK_PUBLIC_DOMAINS` leer, schlägt der Gesamtcheck bewusst fehl, weil die öffentliche Zertifikatsprüfung nicht konfiguriert ist. TLS-Zertifikatsfehler werden für lokale Loopback-Checks nicht bewertet; die öffentliche Domain muss zusätzlich mit normaler Zertifikatsprüfung getestet werden. Änderungen an den erwarteten Services oder Endpunkten sollten als Review im Repository dokumentiert werden.
