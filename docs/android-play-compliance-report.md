# Android / Play Compliance Report — CyberSarah Revenue OS

## Release status

Der aktuelle Stand ist Release 1.0.4 im Managed-WebDev-Projekt. Tests, TypeScript, Produktionsbuild sowie `/api/healthz`, `/api/readyz` und `/api/livez` waren erfolgreich. Ein signiertes APK/AAB wurde nicht erzeugt, da kein Android-Gradle-/Bubblewrap-Projekt mit kontrolliertem Package-Namen, Signing Key und Play-Console-Projekt vorhanden ist.

## Implemented contracts

| Bereich | Implementiert | Produktionsstatus |
|---|---|---|
| TWA | `mobile-android/README.md`, Manifest, Service-Worker, Assetlinks-Platzhalter | Nicht signiert; echte Paket-ID/Fingerprint-Verknüpfung offen |
| RevenueCat | `POST /api/v1/webhooks/revenuecat`, Eventklassifizierung und Approval-only-Antwort | Provider und Entitlements nicht live aktiviert |
| Account deletion | `POST /api/v1/user/delete-account`, Authentifizierung und exakte Bestätigung erforderlich | Request wird angenommen; irreversible Datenkaskade vor Store-Release noch zu implementieren und zu verifizieren |
| Data Safety | `PLAY_STORE_DATA_SAFETY.md` mit Datenkategorien, Zweck und Retention-Hinweisen | Play-Console-Formular und rechtliche Prüfung offen |
| Paywall | Trial, Monat und Jahr als RevenueCat-/Google-Play-Vertrag | Kauf-, Restore-, Kündigungs- und Erstattungsfluss muss mit echten Produkten getestet werden |

Private Signing Keys, Passwörter und Provider-Tokens werden nicht automatisch erzeugt, nicht in das Repository geschrieben und nicht in den Frontend-Build eingebettet. Die Approval-first-Grenze bleibt für Billing, Push, CRM und Messaging aktiv.

## Required go-live actions

Für einen echten Play-Store-Release müssen ein Android-Projekt und ein kontrollierter Signing-Prozess eingerichtet, `assetlinks.json` mit dem realen SHA-256-Zertifikat befüllt, RevenueCat-Produkte mit Google Play verbunden, Testkäufe und Restore geprüft, die produktive Account-Löschung implementiert und die Data-Safety-Angaben in der Play Console eingereicht werden.
