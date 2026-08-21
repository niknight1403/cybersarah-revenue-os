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
