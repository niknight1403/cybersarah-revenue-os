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
- [x] Stripe-Checkout- und Payment-Link-Erstellung aus der Referenzintegration übernommen und durch das Provider-Gate abgesichert
- [x] Adminbeschränkte Stripe-Checkout-Session-Erstellung mit Provider-Gate ergänzt
- [x] Checkout-Erstellung einschließlich Rollen- und Provider-Gates automatisiert getestet
- [x] Client-Instrumentierung für Landing-View-, CTA- und Checkout-Start-Ereignisse an den Funnel-Endpoint angebunden
- [x] SEO-, Landingpage-, Outreach- und Social-Entwürfe mit konkretem Inhalt sowie Freigabefluss statt generischer Datensätze erzeugt
- [x] A/B-Framework um Variantenausspielung, Ergebnisaggregation und Guardrails für Preisänderungen ergänzt
- [x] Headline-Variantenausspielung im öffentlichen Landingpage-Flow ergänzt
- [x] Experimentbezogenes Checkout-Start-Ereignis im öffentlichen Nutzerfluss erfasst
- [x] Zuweisung, CTA-Klick, Checkout-Start und Ergebnisaggregation als integrierten A/B-Flow getestet
- [x] Öffentlichen Checkout-Einstieg mit experimentbezogener Checkout-Start-Erfassung ergänzt
- [x] Öffentlichen A/B-Flow über Variantenzuweisung, Handler und Ergebnisaggregation integriert getestet
- [ ] Persistenten A/B-Produktionspfad von Variantenzuordnung über Ereignisaufnahme bis Ergebnisaggregation nachweisen
- [ ] Persistenten Telemetriepfad von Ereignisaufnahme über Growth-Analyse bis Tagesmetrik nachweisen
- [x] Upsell-Entwurfspfad mit Audit-Log und Freigabeprozess ergänzt
- [x] Revenue-Success-Webhooks, Kündigungsfolgen, Schedule-Aktivierung/-Pause und Telemetrie-End-to-End abgedeckt

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

## Bewertung neuer Echtgeld-Revenue-Modelle
- [x] Fünf vorgeschlagene Revenue-Modelle gegen den bestehenden Stripe-, Freigabe-, Audit- und Datenschutzrahmen bewertet
- [x] Einen priorisierten, freigabegesicherten Integrationspfad für Outcome- und Usage-Billing festgelegt

## Mobile-first Autonomie- und Vermarktungszentrale
- [x] Vorhandene Agenten, Freigabeentwürfe und Growth-Abläufe in HARA-, KI-Influence-, Aufgaben- und Produktmarketing-Module überführt
- [x] Mobile-first Navigation und moderne, fingerfreundliche Bedienung mit klarer Aufgabenpriorisierung gestaltet
- [x] HARA-System mit nachvollziehbaren autonomen Handlungsempfehlungen, Zuständen und Audit-Verweisen bereitgestellt
- [x] KI-Influence-Tab mit freigabepflichtigen Kampagnen-, Content- und Outreach-Entwürfen bereitgestellt
- [x] Aufgaben-Tab mit priorisierten, umsetzbaren autonomen Arbeitsaufträgen und Freigabestatus bereitgestellt
- [x] Autonome Produktvermarktung als freigabegesicherte Kampagnen- und Produktintegrationsansicht bereitgestellt
- [x] Mobile Benutzerführung, Rollen- und Freigabebegrenzungen automatisiert geprüft
- [x] HARA-Modul um echte Audit-Verweise und nachvollziehbare Bewertungskontexte ergänzt
- [x] KI-Influence-Tab um konkrete Kampagnen-, Content- und Outreach-Inhalte erweitert
- [x] Rollen- und Außenwirkungsgrenzen der neuen Autonomie-Module automatisiert geprüft
- [x] Routenschutz der HARA-, KI-Influence-, Tasks- und Produktmarketing-Module ohne Sitzung automatisiert nachgewiesen
- [x] Für neue Autonomie-Aktionen den Entwurfsstatus ohne direkte Außenwirkung im Router und UI regressiv nachgewiesen
- [x] KI-Influence- und Produktmarketing-Aktionen über den produktiven Router als reine Freigabeentwürfe nachgewiesen

## Nutzerauftrag: Prompt-Übernahme und Repository-Übertragung
- [x] Beigefügte Arbeitsvorgabe ausgewertet und gegen den aktuellen CyberSarah-Stand abgeglichen
- [x] Geprüften Hauptbranch-Stand in das konfigurierte Zielrepository übertragen

## Freigabegesicherte Monetarisierung und Compliance
- [x] Bestehende Stripe-Only-, Freigabe- und Audit-Grenzen gegen Multi-Gateway-, Affiliate- und Social-Promptanforderungen dokumentiert abgeglichen
- [x] Transparenzkennzeichnung für KI-, Affiliate- und Sponsoring-Entwürfe zentral und testbar ergänzt
- [x] Affiliate-, Social- und Anzeigen-Aktionen ausschließlich als auditierbare Freigabeentwürfe modelliert
- [x] Aggregierte Einnahmenübersicht über verbundene Quellen als konfigurationssicheren Lesestatus ergänzt
- [x] Compliance-Status für altersbeschränkte Inhalte als nicht speichernde, providerneutrale Verifikationsvorbereitung ergänzt
- [x] Additiven 21+-Verifikationsstatus mit Methode und Zeitstempel ohne KYC-Rohdaten modelliert und migriert
- [x] Geschützten Compliance-Status und freigabepflichtige Verifikationsanforderung im mobilen Dashboard bereitgestellt
- [x] Redigierten, auditierbaren MCP-Lesezugriff für konsolidierte Einnahmen ergänzt
- [x] Compliance-Modul über einen gleichwertig fingerfreundlichen mobilen Einstieg erreichbar gemacht und regressiv getestet
- [x] Gerenderten mobilen Compliance-Schnelleinstieg mit zugänglichem Label regressiv nachgewiesen

## Startknopf für autonome Zyklen
- [x] Gebündelten Autonomie-Startzyklus auf bestehende Growth-Analyse und echte Workspace-Daten aufgesetzt
- [x] Startknopf im Tasks-Modul mit Zyklusstatus, Fehlerzustand und Wiederholungsschutz bereitgestellt
- [x] Externe Wirkungen weiterhin zwingend als Freigabeentwürfe behandelt und den Startzyklus auditiert
- [x] Startzyklus, Fehlerzustände und mobile Bedienung automatisiert getestet
- [x] Startknopf-Änderung validiert, gesichert und live bereitgestellt
- [x] Sichtbare Startzyklus-Statusanzeige für läuft, erfolgreich, Duplicate und fehlgeschlagen ergänzt
- [x] UI-Regressionstests für Duplicate-, Fehler- und mobile Statuszustände ergänzt
- [x] Startknopf-Stand nach den neuesten UI- und Router-Anpassungen mit Produktionsbuild validiert
- [x] Neuen Checkpoint für den Startknopf-Stand gespeichert
- [x] Aktualisierte Startknopf-Version live bereitgestellt und nachgewiesen
- [x] Startknopf-Änderungen nach dem Checkpoint auf der Live-Domain aktualisiert
- [x] Veröffentlichte Live-App browserseitig auf Startknopf und Statuszustände geprüft und dokumentiert
- [x] Read-only Statusdiagnose für den Autonomie-Startzyklus ohne Ausführung externer Aktionen ergänzt
- [x] Sichtbare Live-Statusdiagnose und ihren Schutz regressiv getestet und dokumentiert
- [x] Regressionstest für `growth.autonomyCycleStatus` mit geschütztem Zugriff, Idle/Started/Failed-Rückgaben und ohne Außenwirkung ergänzt
- [x] UI-Test für einen vom Server gelieferten persistierten Zyklusstatus in `AutonomyTasks` ergänzt
- [ ] Live-Domain nach Anmeldung mit sichtbarer read-only Statusdiagnose prüfen und den konkreten Statuszustand dokumentieren
- [x] Regressionstests für `growth.autonomyCycleStatus` um explizite Idle- und Failed-Antwortfälle erweitert
- [x] Nachgewiesen, dass die read-only Zyklusdiagnose in allen Statusfällen keine schreibenden Nebenwirkungen auslöst

## Neue Arbeitsvorgabe: Autonomie- und Revenue-Engine
- [x] Promptanforderungen gegen die bestehende CyberSarah-Architektur, den Manus-Hostingvertrag und die Approval-First-Grenzen abgeglichen
- [x] Vorhandenen HARA-Startzyklus zu einer zentralen, auditierbaren Workflow-Orchestrierung erweitert
- [ ] Fallback- und Fehlerzustände für vorhandene Provider als sichere Entwürfe beziehungsweise Retry-Hinweise modellieren
- [x] Einen reversiblen Semi-Autopilot-Schalter mit Startknopf bereitgestellt; Full-Auto für externe Wirkungen nicht freigeschaltet
- [ ] Feedback- und Attribution-Signale für interne Optimierung nachvollziehbar mit vorhandenen Revenue-Metriken verbinden
- [ ] Neue Autonomie-Engine mit Tests, Produktionsbuild und Live-Checkpoint validieren
- [x] Zentralen HARA-Orchestrator für Growth-Analyse, interne Entwurfsbausteine und Audit-Ausgaben explizit verdrahtet
- [x] Orchestrator-Regressionstests über mehrere interne Module und Audit-Ergebnisse ergänzt
- [x] Reversiblen Semi-Autopilot-Schalter mit Zustandswechsel, Persistenz, geschütztem Routervertrag und UI-Tests implementiert
- [x] Nachgewiesen, dass auch im Semi-Autopilot-Modus keine externe Wirkung ohne Einzel-Freigabe möglich ist
- [x] Expliziten HARA-Orchestrator für Growth-Analyse, interne Draft-Module und Audit-Ausgaben implementiert
- [x] Modulübergreifenden Orchestrator-Test mit Audit-Ergebnissen und internen Draft-Pfaden ergänzt
- [x] UI-Regressionstest für sichtbares Pause/Fortsetzen und persistierten Semi-Autopilot-Zustand ergänzt
- [x] Nach Moduswechsel per Router-/Integrationstest die Approval-only-Grenze externer Wirkungen nachgewiesen
- [x] Echten Orchestrator-Integrationstest ohne Mocking der Orchestrator-Ausgabe von Analyse über Draft-Erzeugung bis Audit-Nachweis ergänzt
- [x] Router-/Integrationstest nach Moduswechsel mit `needs_approval`-Drafts und ohne externe Ausführung ergänzt
- [x] Echten `runHaraOrchestrator`-Integrationstest mit Analyseergebnis, Draft-Erzeugung und Abschluss-Audit nachgewiesen
- [x] Persistierten Approval-Draft nach `growth.setAutonomyMode` mit `status: needs_approval` und `requiresApproval: true` verifiziert
- [x] Nach Moduswechsel explizit getestet, dass kein direkter externer Ausführungspfad aufgerufen wird
- [x] Approval-Draft-Adapter-/Routervertrag nach `growth.setAutonomyMode` mit `status: needs_approval` und `requiresApproval: true` verifiziert
- [x] Negativvertrag für externe Ausführung nach Moduswechsel über `externalExecution: false` und Approval-Draft-Persistenzadapter verifiziert
