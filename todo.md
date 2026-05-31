# Civilization App - Feature TODO

## Datenbankschema & Backend
- [ ] Zivilisationen-Tabelle (name, leader, farbe, ressourcen)
- [ ] Ressourcen-Tracking (Gold, Nahrung, Produktion, Wissenschaft, Kultur pro Zivilisation)
- [ ] Runden-Management (aktuelle Runde, Spielstatus)
- [ ] Einheiten-Tabelle (typ, position, gesundheit, zivilisation)
- [ ] Städte-Tabelle (name, position, bevölkerung, gebäude, produktion)
- [ ] Gebäude-Tabelle (typ, stadt, effekte)
- [ ] Technologien-Tabelle (name, kosten, abhängigkeiten, effekte)
- [ ] Technologie-Fortschritt (zivilisation, technologie, fortschritt)
- [ ] Diplomatie-Tabelle (beziehungen, handelsabkommen, bündnisse)
- [ ] Spielstand-Tabelle (spieler, spielstatus, metadaten)
- [ ] Leaderboard-Daten (punkte, siege, statistiken)

## Backend-API (tRPC)
- [ ] Zivilisations-Verwaltung (erstellen, aktualisieren, abrufen)
- [ ] Ressourcen-API (aktualisieren, berechnen, regenerieren)
- [ ] Runden-System (nächste Runde, Runde abschließen)
- [ ] Einheiten-Verwaltung (erstellen, bewegen, angreifen, löschen)
- [ ] Städte-Verwaltung (erstellen, aktualisieren, bevölkerung)
- [ ] Gebäude-System (bauen, effekte anwenden)
- [ ] Technologie-Forschung (starten, fortschritt, abschließen)
- [ ] Diplomatie-API (beziehungen abrufen, handelsangebote, bündnisse)
- [ ] Spielstand-Persistierung (speichern, laden, löschen)
- [ ] Leaderboard-API (top spieler abrufen, statistiken)

## Frontend - Layout & Design
- [x] Dark Theme mit goldenen Akzenten implementieren (CSS-Variablen)
- [x] Responsive Navigation (Mobile-First)
- [x] Haupt-Dashboard-Layout
- [ ] Sidebar für Schnellzugriff
- [x] Ressourcen-Anzeige (Header/Top-Bar)
- [x] Runden-Anzeige und Fortschrittsbalken

## Frontend - Startbildschirm / Dashboard
- [x] Zivilisationsübersicht mit Namen und Leader
- [x] Ressourcen-Anzeige (Gold, Nahrung, Produktion, Wissenschaft, Kultur)
- [x] Aktuelle Rundenanzeige
- [ ] Fortschrittsbalken für aktuelle Ziele
- [x] Schnellzugriff zu Hauptfunktionen (Karte, Einheiten, Städte, Tech)
- [ ] Benachrichtigungen (neue Technologie, Angriff, etc.)

## Frontend - Einheitenverwaltung
- [x] Einheiten-Liste mit Stats (HP, Angriff, Verteidigung, Bewegung)
- [x] Einheiten-Detailansicht
- [x] Aktionsmöglichkeiten (Bewegen, Angreifen, Warten, Auflösen)
- [x] Zustandsanzeige (verletzt, müde, etc.)
- [ ] Einheiten-Filterung (nach Typ, Status, Position)

## Frontend - Städte- und Gebäudeverwaltung
- [x] Städte-Liste mit Übersicht
- [x] Stadtdetail-Ansicht
- [x] Bevölkerungsanzeige und -verwaltung
- [x] Gebäudeliste mit Effekten
- [x] Produktionswarteschlange (Gebäude, Einheiten)
- [ ] Gebäude-Bauen-Dialog (erweitert)
- [x] Produktions-Fortschrittsbalken

## Frontend - Technologiebaum
- [ ] Interaktiver Technologiebaum (Grafik)
- [ ] Abhängigkeiten zwischen Technologien visualisieren
- [ ] Technologie-Detailansicht (Kosten, Effekte, Abhängigkeiten)
- [ ] Forschungs-Fortschrittsanzeige
- [ ] Forschung starten/pausieren
- [ ] Freischaltbare Technologien hervorheben

## Frontend - Spielfeld / Karte
- [ ] Hexagonales oder kachelbasiertes Spielfeld rendern
- [ ] Verschiedene Terrain-Typen (Gras, Wald, Berg, Wasser, Wüste, etc.)
- [ ] Einheiten auf der Karte anzeigen
- [ ] Städte auf der Karte anzeigen
- [ ] Kamera-Steuerung (Pan, Zoom)
- [ ] Hex/Tile-Auswahl und Markierungen
- [ ] Bewegungs-Vorschau
- [ ] Angriffs-Bereich-Anzeige

## Frontend - Diplomatiesystem
- [ ] Zivilisations-Übersicht (andere Spieler/KI)
- [ ] Beziehungsstatus-Anzeige (Freund, Neutral, Feind)
- [ ] Handelsangebote-Dialog
- [ ] Bündnis-Optionen
- [ ] Diplomatie-Historie
- [ ] Nachrichtenhistorie

## Frontend - Spielstand-System
- [ ] Spielstand speichern (Auto-Save + Manuell)
- [ ] Spielstand laden
- [ ] Spielstand löschen
- [ ] Spielstand-Liste mit Metadaten (Datum, Runde, Fortschritt)

## Frontend - Authentifizierung & Profil
- [ ] Manus OAuth Integration
- [ ] Profil-Seite (Benutzerdaten, Statistiken)
- [ ] Spielhistorie anzeigen
- [ ] Persönliche Statistiken (Siege, Niederlagen, Durchschnittliche Runden)

## Frontend - Leaderboard
- [ ] Globale Bestenliste
- [ ] Sortierung (Punkte, Siege, Runden)
- [ ] Spieler-Details anzeigen
- [ ] Persönliche Platzierung hervorheben
- [ ] Filter (zeitlich, nach Zivilisation)

## Frontend - Responsive Design
- [ ] Mobile-Navigation (Hamburger-Menü)
- [ ] Touch-Steuerung für Karte
- [ ] Responsive Dialoge und Modals
- [ ] Tablet-Optimierung
- [ ] Desktop-Optimierung

## Testing & Optimierung
- [ ] Unit-Tests für Backend-Logik
- [ ] Integration-Tests für API
- [ ] UI-Tests für kritische Flows
- [ ] Performance-Optimierung (Lazy Loading, Caching)
- [ ] Mobile-Performance-Tests
- [ ] Accessibility-Tests

## Deployment & Finalisierung
- [ ] Fehlerbehandlung und Logging
- [ ] Sicherheitsprüfung (Input-Validierung, SQL-Injection)
- [ ] Datenbank-Migrationen
- [ ] Umgebungsvariablen konfigurieren
- [ ] Deployment-Checkliste
- [ ] Dokumentation
