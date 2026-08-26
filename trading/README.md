# Freqtrade/FreqAI Trading-Modul

Dieses Verzeichnis enthält ausschließlich die sichere Dry-Run-Konfigurationsvorlage für eine spätere Freqtrade-Instanz. Der aktuelle WebDev-Server installiert oder startet keinen Python-Prozess und bindet keine echten Exchange-Credentials ein.

Für eine echte, getrennte Sandbox-Instanz müssen Betreiber außerhalb dieses Repositories eine kompatible Freqtrade-Umgebung bereitstellen und anschließend `FREQTRADE_API_URL`, `FREQTRADE_API_TOKEN` sowie optional `FREQTRADE_DRY_RUN=true` als verwaltete Server-Secrets konfigurieren. Die Default-Semantik des TypeScript-Connectors ist `unconfigured`, solange URL und Token fehlen. Wenn die Verbindung vorhanden ist, bleibt der Connector auf Dry-Run und liefert ausschließlich Status-, Profit- und offene-Trade-Daten.

Start-/Stop-Aktionen sind im Revenue OS absichtlich blockiert. Ein Live-Modus darf nicht durch einen UI-Schalter, einen Mock oder einen Environment-Fallback aktiviert werden. Vor jeder späteren Ausführung wären getrennte Risk-Limits, ein Admin-Approval, eine Testumgebung und eine fachliche Prüfung erforderlich.

Die Managed-WebDev-Umgebung ersetzt weder PM2 noch Nginx oder `/opt/cybersarah/trading/venv`. Diese lokalen Betriebsanweisungen werden daher nicht als bereits ausgeführt ausgegeben.
