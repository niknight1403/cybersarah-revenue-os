# CyberSarah Revenue OS – Architekturvergleich und Konsolidierungsentscheidung

## Ausgangslage

Die beiden ausgewählten Revenue-OS-Repositories verfolgen dieselbe Produktlinie, unterscheiden sich jedoch deutlich in der technischen Reife. Das Projekt **`cybersarah-revenue-os-app`** ist eine integrierte Fullstack-Anwendung mit React, tRPC, Drizzle und einem auf geprüfte Betriebsabläufe ausgerichteten Server. Das Monorepo **`cybersarah-revenue-os`** enthält zusätzlich wertvolle Betriebs-, Agenten- und Deployment-Strukturen, ist jedoch größer und heterogener. Die bisherige Civilization-App wird nicht als Produktbasis fortgeführt.

| Bereich | `cybersarah-revenue-os` | `cybersarah-revenue-os-app` | Konsolidierungsentscheidung |
|---|---|---|---|
| Architektur | Mehrteiliges Monorepo mit API, Dashboard, Mobil-App und Operations-Skripten | Zusammenhängende React-/tRPC-/Drizzle-Anwendung | **Fullstack-App als direkte technische Basis** |
| Betrieb | Umfangreiche Agenten-, Watchdog- und Deployment-Ansätze | Kontrolliertes Herunterfahren, Readiness-Endpunkte, zentrale Fehlerbehandlung | **Betriebsmuster selektiv übernehmen** |
| Sicherheit | API-Authentifizierung, Logging und Rate-Limiter vorhanden | HTTP-Schutz, Request-Limits und CSP-Struktur vorhanden | **Sicherheitskern aus der Fullstack-App übernehmen** |
| Qualität | Wenige sichtbar gebündelte Tests im Monorepo-Hauptpfad | Breite Service-, Router- und Sicherheits-Testabdeckung | **Teststrategie der Fullstack-App übernehmen** |
| Produktoberfläche | Mehrere getrennte Oberflächen | Kohärentes Revenue-OS-Dashboard mit mobilen Routen | **CyberSarah-Dashboard als Hauptoberfläche** |

> **Entscheidung:** Das Zielsystem bleibt ein schlanker, vollständig verwaltbarer Fullstack-Kern. Übernommen werden keine unkontrollierten Hintergrundprozesse oder produktiven Fremdaktionen. Externe, finanzielle und veröffentlichende Aktionen bleiben explizit freigabepflichtig.

## Stabilitätsmaßnahmen im Hauptprojekt

Der sofortige Schwerpunkt liegt auf einem erfolgreichen Produktionsbuild, einer nachvollziehbaren Laufzeitdiagnostik, abgesicherten API-Einstiegspunkten und einer klaren Produktoberfläche. Danach werden Revenue-Datenmodelle und tRPC-Prozeduren aus der Fullstack-Referenz schrittweise und migrationssicher übertragen. Bestehende Civilization-Tabellen werden dabei nicht destruktiv gelöscht; sie bleiben außerhalb des Revenue-OS-Kerns erhalten, bis eine explizite Datenbereinigung beauftragt wird.

## Übernahmegrenzen

Die Automation aus den Referenzprojekten wird nicht ungeprüft aktiviert. Insbesondere Zahlungsauslösungen, externe Veröffentlichungen, E-Mail-Versand und Provider-Webhooks werden zunächst als Entwürfe, Prüfzustände oder ausdrücklich freizugebende Aktionen geführt. Das reduziert Fehlerrisiken und verhindert unbeabsichtigte externe Auswirkungen.

## Laufzeitprüfung der Oberfläche

Die öffentliche Einstiegsseite wurde als **CyberSarah Revenue OS** gerendert und der sichere Anwendungsendpunkt meldete einen bereiten Zustand. Die geschützte Route `/app` leitete einen nicht angemeldeten Browser nicht in einen Arbeitsbereich weiter, sondern zeigte den vorgesehenen Manus-OAuth-Einstieg. Damit sind Produktkontext, Dokumenttitel und Zugriffsgrenze im aktuellen Laufzeitstand überprüft.

## Referenzen

[1]: https://github.com/niknight1403/cybersarah-revenue-os "cybersarah-revenue-os"
[2]: https://github.com/niknight1403/cybersarah-revenue-os-app "cybersarah-revenue-os-app"
