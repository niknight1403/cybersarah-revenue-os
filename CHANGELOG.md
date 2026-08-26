# Changelog

## [1.0.3] — 2026-08-26

### Added

- Öffentliche `/privacy`, `/terms` und `/account-deletion`-Pfade als Play-Store-Readiness-Grundlage.
- Mobile PWA-Basis mit Manifest, optionalem Offline-Service-Worker und neutralem `/.well-known/assetlinks.json`-Platzhalter.
- Geschützter 3-Schritt-HARA-Onboarding-Flow mit Approval-first-Hinweisen.
- RevenueCat-/Google-Play-Entitlement-Vertrag für Trial, Monats- und Jahresabo ohne Kauf-Ausführung.
- Web-Push-/Firebase-Benachrichtigungsvertrag für Sale-, Lead- und Video-Ready-Drafts.

### Safety

- Kein Account-, Billing- oder Provider-Token wird automatisch geseedet oder in den Frontend-Build eingebettet.
- TWA-Assetlinks bleiben bis zur echten Paket-ID und Signatur absichtlich neutral.
- Produktive Account-Löschung, Google-Play-Billing, Push-Zustellung und externe Connector-Schreibvorgänge bleiben vor echter Providerkonfiguration deaktiviert beziehungsweise freigabepflichtig.

## [1.0.2] — 2026-08-26

### Added

- Begrenzte interne Resilienzschleife mit Fehlerklassifizierung für Rate Limits, ungültige Credentials, Schemafehler und transiente Laufzeitfehler.
- Auditierbare Retry-Versuche im periodischen HARA-Growth-Lauf mit maximal drei Versuchen und `externalExecution: false`.
- Interne Content-Critic-Bewertung mit 1–10-Score, Revisionsempfehlungen unter 8/10 und unverändertem Approval-Gate.
- Interner Continuous-Planning-Vertrag, der MRR-Abweichungen ausschließlich in Draft-Aufgaben und Empfehlungen übersetzt.

### Safety

- Keine automatische Prompt-Änderung, Veröffentlichung, Zahlung, Nachricht oder CRM-Außenwirkung durch die neuen Loops.
- Provider-Fallbacks bleiben reine interne Daten-/Analysepfade; fehlende Schlüssel werden nicht simuliert.

## [1.0.1] — 2026-08-26

### Added

- Klar gekennzeichneter Shopify-Sandbox-Katalog für HARA-Entwürfe mit Produktname, Preis, Währung, Bestand und Margeninformation.
- Read-only Connector Hub für Stripe, Shopify, RevenueCat und HubSpot mit transparenten Zuständen für Providerfreigabe, Claim und nicht aktivierte Connectoren.
- Zentrale HARA-Orchestrierung für Growth-Analyse, Attribution, interne Draft-Erzeugung und Abschluss-Audit.
- Approval-first-Verträge für externe Aktionen; externe Ausführung bleibt im Sandbox- und Draft-Modus deaktiviert.

### Improved

- Stripe-Checkout-, Payment-Link- und Webhook-Fehler werden als redigierte Retry-Hinweise oder sichere Approval-only-Fallbacks auditierbar klassifiziert.
- Funnel- und Attribution-Signale werden bis in Growth-Analyse und geschützte Overview-Antworten durchgereicht.
- Semi-Autopilot-Pause/Fortsetzen und Workspace-Zustände bleiben über den echten Manus-OAuth-/Sessionfluss geschützt.

### Validation

- 38 Testdateien und 90 Tests erfolgreich.
- TypeScript-Prüfung und Produktionsbuild erfolgreich.
- Verwaltete Health-Endpunkte `/api/healthz`, `/api/readyz` und `/api/livez` liefern HTTP 200.
- Keine lokalen PM2-/Nginx-Aktionen behauptet: Diese Komponenten sowie `/opt/cybersarah` und `artifacts/*` sind in der Managed-Umgebung nicht vorhanden.
