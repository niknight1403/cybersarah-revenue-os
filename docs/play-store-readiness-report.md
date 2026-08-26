# CyberSarah Revenue OS — Play-Store-Readiness Report

**Release 1.0.3**

## Executive Summary

Der WebDev-Stand ist als mobile Revenue-Operations-PWA technisch validiert und für einen kontrollierten Android-Pilot vorbereitet. Implementiert wurden öffentliche Privacy-, Terms- und Account-Deletion-Informationspfade, PWA-Manifest, Offline-Service-Worker, neutraler TWA-Assetlinks-Platzhalter, ein geschützter 3-Schritt-HARA-Onboarding-Flow, eine nicht-live RevenueCat-/Google-Play-Entitlement-Definition sowie Draft-only-Benachrichtigungsverträge. Die App führt weiterhin keine Zahlungen, Nachrichten, Posts oder CRM-Schreibvorgänge ohne explizite Freigabe aus.

## Implementierter Stand

| Bereich | Status | Nachweis / Einschränkung |
|---|---|---|
| Shopify | Sandbox-/Fallback-Katalog | Echte Store-Verknüpfung und Claim bleiben providerabhängig |
| HARA | Geschützter 3-Schritt-Einstieg und Semi-Autopilot | OAuth-/Sessionfluss bleibt erforderlich; keine Session-Seeds |
| RevenueCat / Google Play | Paywall- und Entitlement-Vertrag vorbereitet | Echter Play-Billing-Client, Produkte, Signaturen und RevenueCat-Keys fehlen noch |
| Privacy / Terms | Öffentliche `/privacy`- und `/terms`-Routen | Betreiberangaben und juristische Prüfung müssen vor Store-Einreichung ergänzt werden |
| Account-Löschung | Öffentliche `/account-deletion`-Information | Produktive Löschverarbeitung und Data-Safety-Angaben müssen vor Veröffentlichung verifiziert werden |
| PWA / TWA | Manifest, Service-Worker und `/.well-known/assetlinks.json` vorhanden | Assetlinks ist absichtlich leer; echte Paket-ID und SHA-256-Signatur fehlen |
| Push | Draft-only-Vertrag für Web Push/Firebase | Keine Push-Credentials, kein Versand und keine Außenwirkung |

## Compliance-Einordnung

Google Play verlangt bei Apps mit Account-Erstellung sowohl einen In-App-Löschpfad als auch eine Webressource, über die die Löschung des Accounts und der zugehörigen Daten angefordert werden kann. Diese Vorgabe ist in der öffentlichen Informationsstruktur berücksichtigt; die tatsächliche Löschtransaktion und die Einträge im Play-Console-Data-Safety-Formular bleiben ein notwendiger Go-live-Schritt [1].

Für digitale Funktionen, Abonnements und Cloud-Software ist Google Play Billing grundsätzlich der relevante Zahlungsweg, sofern keine Ausnahme greift. Deshalb ist der RevenueCat-/Google-Play-Vertrag vorbereitet, aber nicht als live aktiviert ausgewiesen. Vor dem Store-Release müssen echte Produkte, Entitlements, Lizenz-/Purchase-Validierung, Testkäufe, Kündigung, Erstattung und Restore-Flows eingerichtet werden [2].

Eine Trusted Web Activity benötigt verifizierte Digital Asset Links. Die aktuelle leere Datei ist ein sicherer Platzhalter und erzeugt keine falsche App-Bindung. Für eine echte TWA müssen Paketname und Signatur-Fingerprint des signierten Android-Artefakts eingetragen und anschließend verifiziert werden [3].

## Umsatzsichernde Stellschrauben

Die stärksten bereits integrierten Hebel sind die pseudonymisierte Funnel-Attribution, A/B- und Pricing-Experimente, die HARA-Growth-Schleifen, der interne Content-Critic mit Revision unter 8/10, auditierte Retry-/Fallback-Pfade und die zentrale Approval-Queue. Diese Mechanismen verbessern Messbarkeit und Draft-Qualität, ohne unkontrollierte Außenwirkung zu erzeugen. Eine Umsatzgarantie ist daraus nicht ableitbar; echte Optimierung setzt reale Provider- und Zahlungsdaten voraus.

## APK/AAB-Bereitstellungsstatus

Es wurde kein signiertes APK/AAB erzeugt, weil in diesem WebDev-Projekt kein Android-Gradle-/Bubblewrap-Projekt, kein Paketname und kein Signierungsschlüssel vorhanden sind. Die PWA-Basis ist für einen nachgelagerten Bubblewrap-/TWA- oder nativen Android-Build vorbereitet. Für die Downloadbereitstellung fehlen noch Android-Projekt, Package ID, Signing Key, echte Assetlinks, Play-Billing-Konfiguration und ein Play-Console-Testtrack.

## Technische Validierung

Die aktuelle Suite umfasst **43 Testdateien und 98 Tests**. Zusätzlich sind der 3-Schritt-HARA-Onboarding-Flow, der RevenueCat-Entitlement-Vertrag und der Draft-only-Benachrichtigungsvertrag regressionsgetestet. TypeScript-Prüfung, Produktionsbuild und die verwalteten Health-Endpunkte `/api/healthz`, `/api/readyz` und `/api/livez` waren erfolgreich. Der kanonische Deploymentpfad ist Managed WebDev; `/opt/cybersarah`, lokale PM2-/Nginx-Prozesse und die Domain `cybersarah-ki.de` sind in dieser Umgebung nicht verfügbar beziehungsweise nicht auflösbar.

## References

[1]: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en "Google Play Console Help — Understanding Google Play’s app account deletion requirements"

[2]: https://support.google.com/googleplay/android-developer/answer/10281818?hl=en "Google Play Console Help — Understanding Google Play’s Payments policy"

[3]: https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2 "Android Developers — Trusted Web Activities Quick Start Guide"
