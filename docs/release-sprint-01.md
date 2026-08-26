# CyberSarah Revenue OS — Release Sprint 01

## Ziel

Sprint 01 ergänzt einen mobilen **Release Center** im geschützten Dashboard. Die Ansicht bündelt Version, Branch, Quality-Gate, Android-Readiness und den Approval-first-Einstieg in die Freigabe-Queue. Sie führt keine externen Aktionen selbstständig aus.

## Implementierung

Die neue Route `/release` ist in `App.tsx` registriert und in der Desktop-Sidebar sowie der mobilen Utility-Navigation erreichbar. Der Release Center zeigt den aktuellen Stand `1.0.6`, Checkpoint `18e95bd2`, den Status der Test-Suite, TypeScript, Health-Endpunkte und Managed-WebDev sowie die weiterhin erforderliche menschliche Freigabe vor externen Aktionen.

## Verifikation

| Prüfschritt | Ergebnis |
|---|---|
| Vitest | 61 Testdateien, 130 Tests bestanden |
| TypeScript | `pnpm check` erfolgreich |
| Produktionsbuild | Vite und esbuild erfolgreich |
| Health | `/api/healthz`, `/api/readyz`, `/api/livez` jeweils HTTP 200 |
| Android | Vorhandenes AAB verfügbar; kein signiertes APK erzeugt |

## Android-Hinweis

Im Projekt liegt ein vorhandenes AAB-Artefakt außerhalb des Quellbaums vor. Ein neues signiertes APK kann in der Managed-WebDev-Umgebung nicht seriös erzeugt werden, weil kein vollständiges Android-/Bubblewrap-Projekt, kein Bundletool und kein außerhalb des Repositorys verwalteter Keystore verfügbar sind. Private Schlüssel und Passwörter werden nicht erzeugt, geraten nicht in Git und werden nicht in Frontend-Builds eingebettet. Für den reproduzierbaren Store-Release sind Package-ID, Keystore, SHA-256-Fingerprint, Asset Links und eine verifizierte Bubblewrap-/Gradle-Toolchain erforderlich.

## Release-Governance

Der GitHub-Push und jede spätere Store-/Provider-Aktion bleiben getrennte, auditierbare Schritte. Der Release Center macht Readiness sichtbar, ersetzt aber keine menschliche Freigabe.
