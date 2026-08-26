# Connector- und Deployment-Status

Stand: 26. August 2026.

## Projekt und Hosting

Der angeforderte Pfad `/opt/cybersarah` ist in der verwalteten Umgebung nicht vorhanden. Der aktive Projektpfad ist `/home/ubuntu/civilization-app-optimized`. PM2 und Nginx sind in dieser Umgebung nicht installiert; deshalb wurden keine lokalen PM2-/Nginx-Kommandos simuliert oder vorgetäuscht. Der verwaltete WebDev-Dienst ist der tatsächliche Produktionspfad.

## Connectoren

| Connector | Status | Betriebsgrenze |
|---|---|---|
| Stripe | Im Projekt integriert; Provider-Freigabe bleibt erforderlich | Checkout, Payment-Link und Webhooks erzeugen bei Fehlern auditierte Retry-/Approval-only-Hinweise |
| Shopify | Headless-Storefront konfiguriert; Store-Claim erforderlich | Katalogzugriff ist bis zur Claim-/Provider-Verbindung nicht als live bestätigt |
| RevenueCat | Manus-Connector verfügbar, in der App nicht aktiviert | Kein aktiver In-App-Abo-Call ohne explizite Konfiguration |
| HubSpot | Manus-Connector verfügbar, in der App nicht aktiviert | CRM-Synchronisation bleibt Draft-only, solange kein eigener Credential-/OAuth-Pfad eingerichtet ist |
| PayPal, Klarna, CopeCart, Digistore24, Brevo, ActiveCampaign, WhatsApp, Telegram, Meta, TikTok, YouTube, ElevenLabs, Replicate/HeyGen, WooCommerce | Nicht konfiguriert | Keine Aktivierung und keine erfundenen Credentials; sichere Draft-/Fallback-Integration ist der nächste Erweiterungspfad |

## Sicherheit und HARA

HARA arbeitet im Semi-Autopilot. Interne Analyse, Attribution und Draft-Erstellung sind automatisierbar; Zahlungen, Nachrichten, Posts, Uploads, CRM-Schreibvorgänge und Veröffentlichungen bleiben explizit freigabepflichtig. Secrets werden serverseitig verwaltet und nicht in den Frontend-Build eingebettet.

## Validierung

Die vollständige Testsuite umfasst 38 Testdateien und 90 Tests. TypeScript-Prüfung und Produktionsbuild waren erfolgreich. Die lokalen Health-Endpunkte `/api/healthz`, `/api/readyz` und `/api/livez` liefern jeweils HTTP 200. Ein authentifizierter Workspace-Livecheck ist in dieser Session nicht nachweisbar, da die Browser-Vorschau ohne aktiven Workspace geladen wurde.
