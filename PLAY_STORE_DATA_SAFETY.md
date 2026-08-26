# Google Play Data Safety — CyberSarah Revenue OS

> Dieses Dokument ist eine technische Vorbereitung für die Play Console und ersetzt keine rechtliche Prüfung. Die Angaben müssen vor Einreichung mit der tatsächlich ausgelieferten Android-Version, den aktivierten SDKs und den realen Providerverträgen abgeglichen werden.

| Datenkategorie | Verarbeitung | Zweck | Weitergabe / Provider | Aufbewahrung |
|---|---|---|---|---|
| Name und E-Mail | Ja, über Manus OAuth | Account, Session und Workspace-Zuordnung | Manus OAuth; keine automatische Weitergabe an CRM/Messaging | Bis Account-Löschung beziehungsweise gemäß gesetzlicher Nachweispflichten |
| OAuth-/Sessionkennung | Ja, serverseitig | Authentifizierung und Zugriffsschutz | Manus OAuth / CyberSarah-Backend | Während der Session und nach Backend-Richtlinie |
| Workspace-, Agenten- und Draftdaten | Ja | HARA-Planung, Audit und Approval-Queue | Im konfigurierten Backend; externe Provider nur nach Freigabe | Bis Löschung oder gemäß Workspace-Retention |
| Funnel- und Experimentereignisse | Ja, pseudonymisiert bzw. arbeitsbereichsbezogen | Attribution, Conversion-Analyse und interne Optimierung | Analytics-/Backendpfad; keine automatische Veröffentlichung | Nach Analyse-/Retention-Richtlinie |
| Zahlungs- und Subscription-Referenzen | Nur bei aktivierter Providerintegration | Entitlement, Dunning, MRR und Audit | Stripe beziehungsweise später RevenueCat/Google Play; keine vollständigen Zahlungsdaten im App-Backend | Nach Provider- und gesetzlichen Anforderungen |
| Device-/Push-Token | Derzeit nicht produktiv verarbeitet | Web-Push/Firebase nur als Draft-only-Vertrag vorbereitet | Kein Push-Provider aktiviert | Keine produktive Speicherung im aktuellen Stand |
| 21+-Verifikationsstatus | Ja, ohne KYC-Dokumente | Compliance-Gating | Nur Status, Methode und Zeitstempel | Nach Compliance-/Retention-Richtlinie |

## Sicherheits- und Löschstatus

Externe Aktionen bleiben approval-first. Provider-Credentials werden nicht in den Frontend-Build eingebettet. Der Endpunkt `POST /api/v1/user/delete-account` nimmt eine authentifizierte, exakt bestätigte Löschungsanforderung entgegen; die irreversible Datenkaskade muss vor einer Play-Store-Einreichung noch an eine geprüfte produktive Löschroutine gebunden und mit Testdaten verifiziert werden.

Die aktuellen Providerzustände sind: Stripe vorhanden, aber providerfreigabepflichtig; Shopify als Sandbox-/Fallback-Katalog beziehungsweise claim-pflichtig; RevenueCat nicht live aktiviert; HubSpot und Messaging nicht live aktiviert; Web-Push/Firebase nur Draft-only.
