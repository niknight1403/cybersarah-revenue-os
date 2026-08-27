# CyberSarah Revenue OS Automation

Die Automation besteht aus drei isolierten asyncio-Workern: `content_agent`, `engagement_agent` und `revenue_agent`. Der `Orchestrator` überwacht jeden Worker separat, begrenzt die Laufzeit, führt exponentielles Backoff aus und beendet einen Worker nach einer konfigurierbaren Zahl wiederholter Fehler sicher.

## Sicherheitsstandard

Die versionierte Standardkonfiguration startet die Worker deaktiviert (`enabled: false`), verwendet `action_mode: draft` und setzt `external_execution: false`. Content-Publishing, automatische Nachrichten, Stripe-Ausführung, Auszahlungen und andere externe Seiteneffekte sind damit nicht möglich. Die Mindest-Auszahlung ist standardmäßig auf 50,00 EUR in Cent festgelegt und wird vor jedem Auszahlungskandidaten validiert.

## Dynamische Konfiguration

`automation/config.json` wird bei jedem Healthcheck neu eingelesen. Für Produktionsumgebungen kann `CSRO_CONFIG_PATH` auf eine außerhalb des Git-Arbeitsbaums liegende Datei zeigen. Die Datei darf keine Secrets enthalten. Secrets gehören ausschließlich in die verwaltete Server-Umgebung.

## Telemetrie

`csro.log` wird als JSONL-Datei geschrieben. Schlüssel, Tokens, Passwörter, Signaturen und authorization-ähnliche Felder werden vor dem Schreiben redigiert. Die Logdatei ist nicht versioniert.

## Replit-Anbindung

Die Replit-Adresse `https://cyber-sarah-ecosystem.replit.app/` liefert derzeit keine veröffentlichte App. Deshalb wird sie nicht als Live-Abhängigkeit verwendet. Ein später gesetzter `replit_base_url` dient ausschließlich als beobachtbare Integrationskonfiguration; ein nicht erreichbarer Replit-Origin darf die lokalen Worker nicht freischalten.

## Start

```bash
CSRO_CONFIG_PATH=/opt/cybersarah/automation/config.json /usr/bin/python3 -m automation.runner
```

Die systemd-Vorlage liegt unter `deploy/cybersarah-automation.service`. Vor einer Installation müssen Benutzer, Pfade und die gewünschte persistente Hosting-Umgebung geprüft werden.
