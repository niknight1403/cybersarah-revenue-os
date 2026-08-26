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
- [x] Persistenten A/B-Pfad von Variantenzuordnung über Ereignisaufnahme bis Ergebnisaggregation implementiert und durch Handler-/Aggregationstests verifiziert; echter Live-Datenbankbeleg bleibt umgebungsabhängig
- [x] Persistenten Telemetriepfad von Ereignisaufnahme über Growth-Analyse bis Tagesmetrik implementiert und durch Revenue-/Metrikverträge verifiziert; echter Live-Datenbankbeleg bleibt umgebungsabhängig
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
- [x] Live-Domain browserseitig geprüft und konkreten unauthentifizierten Workspace-Zustand in `verification-notes.md` dokumentiert; eingeloggter persistierter Diagnosezustand bleibt mangels Workspace offen
- [x] Regressionstests für `growth.autonomyCycleStatus` um explizite Idle- und Failed-Antwortfälle erweitert
- [x] Nachgewiesen, dass die read-only Zyklusdiagnose in allen Statusfällen keine schreibenden Nebenwirkungen auslöst

## Neue Arbeitsvorgabe: Autonomie- und Revenue-Engine
- [x] Promptanforderungen gegen die bestehende CyberSarah-Architektur, den Manus-Hostingvertrag und die Approval-First-Grenzen abgeglichen
- [x] Vorhandenen HARA-Startzyklus zu einer zentralen, auditierbaren Workflow-Orchestrierung erweitert
- [x] Fallback- und Fehlerzustände für vorhandene Provider als sichere Entwürfe beziehungsweise Retry-Hinweise modelliert
- [x] Einen reversiblen Semi-Autopilot-Schalter mit Startknopf bereitgestellt; Full-Auto für externe Wirkungen nicht freigeschaltet
- [x] Feedback- und Attribution-Signale für interne Optimierung nachvollziehbar mit vorhandenen Revenue-Metriken verbunden
- [x] Neue Autonomie-Engine mit 38 Testdateien / 88 Tests, Produktionsbuild und Live-Checkpoint validiert
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
- [x] Stripe-Checkout-, Payment-Link- und Webhook-Fehler als auditierte Retry-Hinweise oder sichere Approval-Drafts modelliert und getestet
- [x] Attribution in Growth-/Revenue-Metrikpfade eingebunden und in Analyse-/Overview-Ausgaben testbar ausgewiesen
- [x] Stripe-Webhook-Fehlerpfad explizit um auditierte Retry-Hinweise oder sichere Approval-Drafts erweitert und mit Tests abgedeckt
- [x] Attribution aus `aggregateGrowthMetrics` in `runGrowthAnalysis` und/oder relevante Overview-Ausgaben durchgereicht und mit Router-/Integrationstests verifiziert
- [x] Attribution aus `aggregateGrowthMetrics` in `runGrowthAnalysis` durchgereicht und im Rückgabeobjekt exponiert
- [x] Attribution in einer relevanten Overview-/Router-Antwort sichtbar gemacht und per Router-/Integrationstest verifiziert

## Neue Arbeitsvorgabe: Connector-Integration und Revenue-Engine
- [x] Connector-Anforderungen gegen den bestehenden Projektpfad statt gegen `/opt/cybersarah` abgeglichen und nicht vorhandene Repositories/Connectoren transparent abgegrenzt
- [x] Verfügbare Payment-, Shopify-, CRM- und MCP-Integrationen inventarisiert; nicht konfigurierte Provider werden nicht als aktiv ausgegeben
- [x] Globalen Semi-Autopilot-/Approval-first-Vertrag auf alle neuen Connector-Drafts und externen Aktionspfade angewendet
- [x] Sichere Provider-Fallbacks für konfigurierbare Integrationen mit Retry-Hinweis, Audit und ohne automatische Außenwirkung ergänzt
- [x] Attribution, Funnel- und Connector-Signale in Revenue-Overview und HARA-Analyse sichtbar gemacht
- [x] Connector-Status-, Approval- und Fehlerzustände im mobilen Dashboard verständlich dargestellt
- [x] Neue Connector-Verträge, Sicherheitsgrenzen, TypeScript und Produktionsbuild vollständig getestet
- [x] Finalen Connector-Stand als Checkpoint zur Veröffentlichung vorbereitet und den Status je Connector dokumentiert

## Neue Arbeitsvorgabe: End-to-End-Integrationen und Deployment
- [x] Bestehenden Projektpfad und verwaltete Hostingumgebung gegen `/opt/cybersarah`, PM2 und Nginx abgeglichen
- [x] Shopify-Katalogstatus als echte Verbindung oder klar gekennzeichneten Sandbox-/Fallback-Modus bereitgestellt
- [x] Authentifizierten HARA-Workspace- und Session-Zustand geprüft, ohne Tokens in Frontend-Builds einzubetten
- [x] CRM- und Messaging-Provider nur als konfigurierte Draft-only-/Fallback-Status modelliert; keine Credentials erfunden
- [x] Ausstehende Schema-/Migrationsstände geprüft; Drizzle meldet keine Schemaänderungen, daher war keine SQL-Migration erforderlich
- [x] Verwaltete Tests, TypeScript, Produktionsbuild und Health-Endpunkte validiert (jeweils HTTP 200)
- [x] Dashboard- und Connector-Status in `docs/connector-deployment-status.md` dokumentiert

## Neue Arbeitsvorgabe: Auto-Claim, Mock-Katalog und HARA-Workspace
- [x] Aktiven Projektpfad gegen `/opt/cybersarah`, `artifacts/*`, PM2, Nginx und `cybersarah-ki.de` geprüft
- [x] Klar gekennzeichneten Shopify-Sandbox-Katalog mit Produkt-, Preis-, Bestands- und Margenfeldern bereitgestellt
- [x] Dashboardstatus für Shopify korrekt als Sandbox/Fallback statt fälschlich live verknüpft ausgewiesen
- [x] HARA-Workspace nur über echten OAuth-/Sessionfluss bereitgestellt; keine Session- oder Admin-Credentials geseedet
- [x] CRM-/Messaging-/Stripe-Draft-only-Connectors ohne Dummy-Credentials und ohne externe Ausführung abgesichert
- [x] Build-, Health- und verwalteten Live-Status validiert und transparent dokumentiert

## Neuer Release-Auftrag
- [x] Offene Aufgaben, Versionsstruktur und verwaltete Deploymentgrenzen geprüft
- [x] Connector-Stubs und fehlende Provider-Fallbacks auf sichere, nicht-live Semantik geprüft
- [x] Release-Version auf 1.0.2 erhöht und `CHANGELOG.md` mit HARA-, Approval-first-, Connector- und Loop-Änderungen angelegt
- [x] Drizzle-Schemazustand und Migrationen geprüft, ohne PostgreSQL als vorhandene DB anzunehmen
- [x] Vollständige Testsuite, TypeScript und Produktionsbuild validiert
- [x] Verwaltete Health-Endpunkte und Hauptdomain geprüft; PM2/Nginx nur bewertet, da lokal nicht vorhanden
- [x] Release-Stand zum Checkpoint vorbereitet und Modulstatus in `docs/loop-engineering-status.md` dokumentiert

## Neue Arbeitsvorgabe: Loop Engineering
- [x] Zentrale interne Resilienz- und Retry-Schleife mit begrenzten Versuchen, Fehlerklassifizierung und sicherem Fallback definiert
- [x] Gemini/OpenAI-Fallback nur als interne Analyseoption modelliert; keine Schlüssel oder externen Aktionen simuliert
- [x] Interne Content-Critic-Schleife mit nachvollziehbarem 1–10-Score, Verbesserungshinweisen und Approval-Gate ergänzt
- [x] Conversion-Attribution mit generierten Drafts, Funnel-Signalen und Revenue-Events verbunden
- [x] Strategie-/Prompt-Tuning als auditierte interne Empfehlung statt automatische Prompt- oder Außenwirkungsänderung implementiert
- [x] Continuous-Planning-Loop auf interne Aufgaben-/Draft-Erzeugung begrenzt und externe Aktionen blockiert
- [x] Loop-Engineering-Tests, TypeScript, Build, Health und Release-Status dokumentiert

## Neue Arbeitsvorgabe: Play-Store-Readiness und Launch
- [x] Mobile-Artefakte, PWA-Manifest, Service-Worker und TWA-Voraussetzungen gegen den bestehenden WebDev-Stand geprüft und sichere Grundlagen ergänzt
- [x] Privacy-Policy-, Account-Löschungs-, AGB- und Abo-Transparenzpfade geprüft und sichere öffentliche Grundlagen ergänzt; produktive Löschverarbeitung bleibt vor Store-Release offen
- [x] RevenueCat-/Google-Play-Billing als konfigurierte, nicht-live Paywall-/Entitlement-Verträge vorbereitet
- [x] 3-Schritt-Onboarding für HARA-Agenten als geschützten, approval-first Flow ergänzt
- [x] Web-Push/Firebase-Hooks als serverseitig konfigurierbare Benachrichtigungsentwürfe modelliert
- [x] Mobile Performance-/Accessibility-Grundlagen sowie Tests, Build und verwaltete Health-Endpunkte validiert
- [x] Play-Store-Readiness-Report und APK/AAB-Bereitstellungsstatus in `docs/play-store-readiness-report.md` dokumentiert
- [x] Play-Store-Readiness-Stand 1.0.3 zum Checkpoint vorbereitet und Marktreifebericht dokumentiert

## Neue Arbeitsvorgabe: Android Scaffold und Play-Compliance
- [x] Android-/TWA-Anforderungen gegen den vorhandenen WebDev-Projektpfad abgeglichen; private Signing Keys nicht im Agentenlauf erzeugt
- [x] Sicheres Android-/Bubblewrap-Scaffold mit Build-Anleitung und neutralem Assetlinks-Vertrag vorbereitet
- [x] RevenueCat-/Google-Play-Webhook- und Produktmapping als nicht-live Backend-/Frontend-Vertrag ergänzt
- [x] Authentifizierte Account-Löschungsanforderungs-API mit Bestätigung entworfen; keine unbestätigte irreversible Löschung ausgeführt
- [x] `PLAY_STORE_DATA_SAFETY.md` mit tatsächlichen Datenkategorien, Zweck, Aufbewahrung und Providerstatus dokumentiert
- [x] Tests, TypeScript, Build, PWA-/Assetlinks-Checks und verwaltete Health-Endpunkte validiert
- [x] Android-/Play-Compliance-Bericht erstellt und Release-Checkpoint vorbereitet

## Neue Arbeitsvorgabe: Global Loop Monetization
- [x] Vier Revenue-Loops gegen vorhandene Funnel-, Attribution-, Approval- und Providerverträge bewertet
- [x] Interne Loop-Engine für Signalbewertung, Priorisierung und auditierbare Draft-Empfehlungen ergänzt
- [x] Payment-Failover als sichere Provider-Readiness-/Fallback-Klassifikation modelliert; kein unfreigegebener Zahlungsversuch
- [x] Loop-Intelligence-Center mit Conversion-/Revenue-Signalen und transparentem Providerstatus ergänzt
- [x] Pro-Loop-Steuerung als Manual-Approval bzw. pausierter interner Modus umgesetzt; Full-Auto-External-Execution wird nicht angeboten
- [x] Tests, TypeScript, Build, mobile UI und verwaltete Health-Endpunkte validiert
- [x] Monetization-Report vorbereitet; Release-Checkpoint als nächster Veröffentlichungsschritt offen
- [x] Monetization-Loop-Release 1.0.5 zum Checkpoint vorbereitet und Report dokumentiert

## Neue Arbeitsvorgabe: Attribution, Kohorten und Approval-Verifizierung
- [x] Attribution-Layer für UTM, Referral, Affiliate und Recovery-Kanäle an bestehende Revenue-Events angebunden
- [x] Persistente Loop-Snapshot-Tabelle und additive Migration im bestehenden Drizzle-Schema ergänzt
- [x] Geschützte Snapshot-/Kohorten-Endpunkte mit echten gespeicherten Signalen bereitgestellt
- [x] Mobile Zeitreihen- und Kohorten-Analytics ohne künstliche Umsatzdaten integriert
- [x] Interne Draft-to-Approval-E2E-Verifizierung mit blockierter Außenwirkung implementiert
- [x] Tests, TypeScript, Build, Health und Managed-Deployment-Grenzen validiert
- [x] Analytics-Report und Release-Checkpoint dokumentiert

## Neue Arbeitsvorgabe: Freqtrade/FreqAI Dry-Run
- [x] Trading-Sicherheitsanforderungen und Managed-Hostinggrenzen geprüft; `/opt/cybersarah`, PM2 und Nginx nicht vorausgesetzt
- [x] Strikten Dry-Run-Tradingvertrag mit sicherer lokaler Konfigurationsvorlage statt echten Exchange-Credentials bereitgestellt
- [x] TypeScript-REST-Readiness-Connector für Status, ROI, Trades und Start/Stop implementiert; externe Calls standardmäßig blockiert
- [x] HARA-Risk-Governance mit Thresholds, Approval-Gate und explizit deaktiviertem Live-Trading ergänzt
- [x] Mobiles Trading-Panel mit Dry-Run-/Live-Readinessstatus und klarer fehlender Live-Konfiguration integriert
- [x] Tests, TypeScript, Build und Health validiert; echte PM2-/Nginx-Aktionen nur bei vorhandener Infrastruktur ausführen
- [x] Trading-Statusbericht und Release-Checkpoint dokumentiert

## Neue Arbeitsvorgabe: Video, Programmatic SEO und B2B-Lead-Loops
- [x] Bestehende Medien-, Marketing-, Affiliate-, Shopify- und CRM-Verträge gegen die neuen Loop-Anforderungen prüfen
- [x] Faceless-Video-Draft-Engine mit Text-/Szenen-/Asset-Plan, Qualitätsprüfung und ohne automatischen Upload ergänzen
- [x] Programmatic-SEO-Draft-Engine mit erlaubter Datenquelle, Canonical-/Disclosure-Regeln und ohne ungeprüfte Massenpublikation ergänzen
- [x] B2B-Lead-Qualifizierungs-Draft mit Datenschutz-, Einwilligungs- und Rate-Limit-Grenzen statt aggressivem Scraping ergänzen
- [x] Globales Revenue-Loop-Steuerungsmodul mit individuellen Freigabe-Buttons und Audit-Status integriert
- [x] Tests, TypeScript, Build, Health und Approval-only-Außenwirkungsgrenzen validiert
- [x] Video-/SEO-/Lead-Loop-Report und Release-Checkpoint dokumentiert

## Abschluss: Video, Programmatic SEO und B2B-Lead-Loops
- [x] Bestehende Medien-, Marketing-, Affiliate-, Shopify- und CRM-Verträge gegen die neuen Loop-Anforderungen geprüft
- [x] Faceless-Video-Draft-Engine mit Szenen-, Caption- und Disclosure-Plan ohne automatischen Upload ergänzt
- [x] Programmatic-SEO-Draft-Engine mit Canonical-, Disclosure- und Qualitäts-Gates ohne automatische Publikation ergänzt
- [x] B2B-Lead-Qualifizierungs-Draft mit Datenschutz-, Einwilligungs- und Rate-Limit-Grenzen ergänzt
- [x] Globales Revenue-Loop-Steuerungsmodul mit drei Approval-first-Karten in Router und Navigation integriert
- [x] 49 Testdateien und 110 Tests, TypeScript und Produktionsbuild erfolgreich validiert
- [x] Desktop- und mobile Darstellung von `/revenue-loops` geprüft
- [x] Separaten FFmpeg-/Crawl4AI-/CRM-Betriebsworker als externe, nicht im Managed-WebDev simulierte Voraussetzung dokumentiert
- [x] Produktions-Upload, SEO-Publikation und B2B-Kontaktaufnahme bleiben bis separater menschlicher Freigabe und Providerkonfiguration deaktiviert

## Neue Arbeitsvorgabe: Produktionstransition und Echtgeld-Readiness
- [x] Produktions-/Sandbox-Kontrakt und vorhandene Provider-Readiness für Stripe, Shopify, RevenueCat, Meta und WhatsApp geprüft
- [x] Sichere Produktionskonfiguration mit serverseitiger Secret-Validierung und ohne automatische Aktivierung implementiert
- [x] Paywall-Readiness für RevenueCat/Google Play mit Trial-, Monats- und Jahresprodukten integriert
- [x] Cart-Recovery-, Auto-DM-, Video-Upload- und Push-Aktionen als auditierte Approval-first-Entwürfe abgebildet
- [x] Account-Deletion-, Privacy-, Terms- und Onboarding-Verträge gegen den neuen Flow validiert
- [x] TypeScript, Tests, Produktionsbuild, Health und Managed-Deployment-Grenzen validiert
- [x] Echtgeld-Readiness-Bericht und Checkpoint dokumentiert

## Neue Arbeitsvorgabe: Staging-Secrets, RevenueCat-Webhooks und E2E-Verifikation
- [x] Staging-/Produktions-Secretvertrag und vorhandene Provider-Readiness geprüft
- [x] Serverseitigen fail-closed Staging-Secret-Resolver ohne Dummy-Produktionswerte ergänzt
- [x] RevenueCat-Webhook-Eventklassifizierung und Verifikationsvertrag für INITIAL_PURCHASE, RENEWAL, CANCELLATION und EXPIRATION getestet
- [x] Account-Deletion- und Draft-to-Approval-E2E-Verifikation ohne irreversible Live-Löschung oder externe Ausführung ergänzt
- [x] TypeScript, vollständige Testsuite, Produktionsbuild und Managed-Healthchecks validiert
- [x] PM2-/Nginx-/`/opt/cybersarah`-Abgrenzung sowie Staging-Verifikationsbericht dokumentiert

## Neue Arbeitsvorgabe: Multi-Provider-Account-Anmeldung
- [x] Bestehenden Manus-OAuth-Flow und unterstützte Providergrenzen geprüft
- [x] Sicheren OAuth-Vertrag für Google und Manus mit serverseitiger Secret-Konfiguration ergänzt; Microsoft auf Nutzerwunsch ausgeschlossen
- [x] Login-/Registrierungsoberfläche und Google-Providerstatus in die bestehende mobile Navigation integriert
- [x] Account-Auflösung, Session-Sicherheit und Provider-Governance getestet
- [x] Auth-Regression, TypeScript, Produktionsbuild und Health validiert
- [x] Provider-Konfigurationshinweise und Release-Checkpoint dokumentiert

## Scope-Änderung: Microsoft-Login entfernt
- [x] Microsoft OAuth aus dem aktiven Login-Flow herauslassen; Manus OAuth und Google OAuth bleiben die vorgesehenen Provider
- [x] Google-/Manus-Login, Onboarding-Einstieg, Tests, Build und verwalteten Release final verifiziert
