# CyberSarah Revenue OS – Projekt-Checkliste

> **Scope-Entscheidung:** Mit der Festlegung von CyberSarah Revenue OS als Hauptprojekt wurden alle Civilization-Aufgaben bewusst abgelöst. Die bestehenden Tabellen bleiben migrationssicher erhalten, werden jedoch nicht mehr über die aktive Produktschnittstelle exponiert.

## Archivierter Civilization-Umfang
- [x] Abgelöst: Zivilisationen-, Ressourcen-, Runden-, Einheiten-, Städte-, Gebäude- und Technologieverwaltung
- [x] Abgelöst: Diplomatie, Spielstände und Civilization-Leaderboard
- [x] Abgelöst: Civilization-spezifische tRPC-APIs und Dashboard-Flows
- [x] Abgelöst: Hex-Karte, Einheitenansichten, Technologiebaum und Städteansichten
- [x] Abgelöst: Civilization-spezifische Responsive- und Performance-Aufgaben
- [x] Abgelöst: Civilization-spezifische Authentifizierungs-, Profil- und Spielhistorienansichten

## Repository-Konsolidierung
- [x] Strukturellen und funktionalen Vergleich von `cybersarah-revenue-os`, `cybersarah-revenue-os-app` und dem Ausgangsprojekt dokumentiert
- [x] Wiederverwendbare Produkt-, Datenmodell-, Sicherheits- und Betriebsbausteine aus beiden Repositories identifiziert
- [x] Zielarchitektur mit der Fullstack-App als Basis und selektiven Betriebsbausteinen aus dem Monorepo festgelegt
- [x] Fehlerhafte CSS-Syntax behoben und den Produktionsbuild wiederhergestellt
- [x] CyberSarah Revenue OS als Produkt-, Navigations- und visuellen Hauptkontext eingerichtet

## Stabiler Revenue-OS-Kern
- [x] Manus OAuth als einziges Anmeldesystem beibehalten und sicheren Anwendungs-Info-Endpunkt ergänzt
- [x] Additives, benutzergebundenes Datenmodell für Revenue-Arbeitsbereiche, Agenten, Freigabeentwürfe und Audits migriert
- [x] Persönlichen Revenue-Arbeitsbereich mit persistenter Initialisierung umgesetzt
- [x] Interne Revenue-Agenten mit sicherer Aktivieren-/Pausieren-Steuerung umgesetzt
- [x] Freigabepflichtige Entwürfe als persistente Queue umgesetzt, ohne externe Ausführung zu aktivieren
- [x] Nicht mehr relevante Civilization-Endpunkte aus dem aktiven API-Hauptpfad entfernt

## Laufzeit, Sicherheit und Qualität
- [x] Readiness-, Liveness- und öffentliche Health-Endpunkte ergänzt
- [x] Kontrollierten Shutdown mit Draining-Status implementiert
- [x] HTTP-Sicherheitsheader, CSP in Produktion und begrenztes API-Rate-Limiting integriert
- [x] Zentralen JSON-Fehlerpfad und begrenzte Request-Payloads konfiguriert
- [x] Regressionstests für Produkttitel, Auth-Logout, geschützte Revenue-Prozeduren, HTTP-Konfiguration, Laufzeitstatus und Agentenkatalog ergänzt
- [x] Datenbankmigration geprüft und erfolgreich angewendet
- [x] Vollständige Test-Suite, TypeScript-Prüfung, Produktionsbuild und Health-Endpunkte erfolgreich validiert

## Dokumentation
- [x] Architekturvergleich und Konsolidierungsentscheidung unter `docs/repository-comparison.md` dokumentiert

## Nachschärfung aus der Qualitätsprüfung
- [x] Revenue-OS-Dashboard- und Navigationskontext mit mehreren Kernrouten und gemeinsamer App-Shell ergänzt
- [x] Integrationstests für Arbeitsbereichsinitialisierung, Agentensteuerung und Freigabeentwürfe ergänzt
- [x] Health-Endpunkte vollständig validiert
- [x] Wiederverwendbare Fehlerzustands-Komponenten für Revenue-Abfragen und -Mutationen getestet
- [x] Seitenbezogene tRPC-Fehlerzustände für Workspace, Agenten, Freigaben und Systemstatus getestet
- [x] Seitenbezogenen Mutationsfehler für das Speichern eines Freigabeentwurfs getestet

## Direkte Stripe-Integration im Hauptprojekt
- [x] Bestehende Stripe-Backend-Routen, Webhook-Handling und Umgebungsvariablen im Hauptrepository verifiziert
- [x] Bestehende Stripe-Integration ohne Projektkopie in den aktiven Revenue-OS-Stand überführt
- [x] Provider-Freigabegate vor allen Stripe-seitigen Zahlungs- oder Auszahlungsaktionen ergänzt
- [x] Stripe-Gates, Webhook-Verhalten und sicherheitsrelevante Tests validiert

## Kontrollierter Growth-OS-Ausbau
- [x] Stripe-Zahlungs- und Webhook-Flows für Einnahme-, Abo- und Kündigungsereignisse abgesichert
- [x] Funnel-, Conversion-, CAC-, LTV-, MRR- und Churn-Telemetrie mit nachvollziehbaren Datenquellen modelliert
- [x] Entwurfsbasierte SEO-, Landingpage-, Outreach- und Social-Growth-Workflows mit Freigabegate ergänzt
- [x] A/B-Test- und Pricing-Experimentmodell mit Guardrails gegen unfreigegebene Live-Preisänderungen implementiert
- [x] Dunning-, Retention- und Upsell-Entwürfe als freigabepflichtige Kundenkommunikation modelliert
- [x] Kontrollierten Analyse-Loop für Empfehlungen und pausierbare Optimierungsvorschläge implementiert
- [x] Payment-, Provider-, Telemetrie- und Freigabeflows mit Tests und Produktionschecks validiert

## Ereignisse und periodische Growth-Analyse
- [x] Stripe-Webhook-Ereignisse idempotent als Revenue- und Lifecycle-Signale erfassen
- [x] Systemereignisse zentral protokollieren und für Growth-Analysen aggregieren
- [x] Verwalteten periodischen Analysejob ohne In-Prozess-Timer implementiert
- [x] Automatische Dunning-, A/B-Test- und Outreach-Entwürfe mit Audit-Trail generieren

## Vollständigkeitsprüfung des Growth-Systems
- [ ] Stripe-Checkout- und Payment-Link-Erstellung aus der Referenzintegration übernehmen und durch das Provider-Gate absichern
- [ ] Client-Instrumentierung für Landing-View-, CTA- und Checkout-Start-Ereignisse an den Funnel-Endpoint anbinden
- [ ] SEO-, Landingpage-, Outreach- und Social-Entwürfe mit konkretem Inhalt sowie Freigabefluss statt generischer Datensätze erzeugen
- [ ] A/B-Framework um Variantenausspielung, Ergebnisaggregation und Guardrails für Preisänderungen ergänzen
- [ ] Upsell-Entwurfspfad mit Audit-Log und Freigabeprozess ergänzen
- [ ] Revenue-Success-Webhooks, Kündigungsfolgen, Schedule-Aktivierung/-Pause und Telemetrie-End-to-End abdecken

## MCP-Server für autonome Revenue-OS-Agenten
- [x] Offizielles MCP-SDK und sichere Modulstruktur im bestehenden Express-Backend eingerichtet
- [x] MCP-Authentifizierung, Mandantenzuordnung und Tool-Berechtigungsgrenzen festgelegt
- [x] Ressourcen für Revenue-Metriken, redigierte Systemlogs und A/B-Experimente implementiert
- [x] Tools für Finanzzusammenfassung, Dunning-Entwürfe, Pricing-Experimente und Audit-Abfragen implementiert
- [x] Jede MCP-Operation idempotent und nachvollziehbar im zentralen Audit-Trail protokolliert
- [x] MCP-Transport in Express eingehängt und gegen unberechtigten Zugriff abgesichert
- [x] Ressourcen, Tools, Auditierung und Geheimnisredaktion automatisiert getestet
- [x] Verfügbare MCP-Schnittstellen und Betriebsgrenzen dokumentiert

## MCP-Vollständigkeitsprüfung
- [x] Stabile requestbezogene MCP-Idempotenzschlüssel und Duplicate-Handling im Audit-Trail implementiert
- [x] Alle drei MCP-Ressourcen mit echten `readResource`-Tests abgedeckt
- [x] Dunning- und Audit-Trail-Tools inklusive Audit-Assertions automatisiert abgedeckt
- [x] Spezifische Audit-Assertions für Dunning- und Audit-Trail-Toolaufrufe ergänzt
