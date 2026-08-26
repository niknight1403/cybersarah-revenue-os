# CyberSarah Revenue OS – Global-Revenue-Loops-Report

## Zusammenfassung

Die neue Revenue-Loop-Schicht ist im bestehenden CyberSarah-Projekt integriert. Sie umfasst eine **Faceless-Video-Draft-Engine**, eine **Programmatic-SEO-Draft-Engine**, eine **B2B-Lead-Qualifizierungs-Engine** und den zentralen mobilen Bereich `/revenue-loops`. Die Anwendung erzeugt strukturierte, auditierbare Arbeitsentwürfe; sie veröffentlicht keine Videos oder Landingpages und versendet keine CRM-/E-Mail-Nachrichten automatisch.

> **Approval-first:** Jeder externe Effekt bleibt bis zu einer separaten menschlichen Freigabe deaktiviert. Die UI zeigt diese Grenze ausdrücklich an; die Engine-Ergebnisse tragen `status: needs_approval`, `requiresApproval: true` und `externalExecution: false`.

## Implementierungsstatus

| Bereich | Geliefert | Sicherheitsgrenze |
|---|---|---|
| Faceless Video | Szenenplan, Caption, Disclosure, Zielkanal und Asset-Hinweis | Kein MP4-Render und kein Meta-/TikTok-/YouTube-Upload im Managed-WebDev |
| Programmatic SEO | Slug, Titel, Canonical, redaktionelle Abschnitte, Affiliate-Disclosure und Quality-Gates | Keine automatische Publikation, kein ungeprüfter Massencrawl |
| B2B Leads | Fit-Score, Einwilligungsnachweis, Rechts-/Rate-Limit-Hinweise und nächster manueller Schritt | Keine privaten Kontaktdaten, kein CRM-Schreiben, kein Kaltversand |
| Dashboard | Mobile- und Desktop-Karten, Status-Chips, Approval-Vorbereitung und Prüfpfade | Die Schaltfläche bereitet nur den internen Approval-Kontext vor |

## Technische Einordnung

Die Engine ist absichtlich als serverseitige Draft-Logik ohne externe Seiteneffekte implementiert. Für spätere Video-Renderings kann ein isolierter Worker FFmpeg-Filtergraphen und Medienverkettung nutzen; die offizielle FFmpeg-Dokumentation beschreibt hierfür Filtergraphen und die Verarbeitung von Audio-/Videoströmen [1]. Diese Umgebung installiert oder startet jedoch keinen solchen Worker.

Für SEO-Datenquellen ist eine erlaubte, rate-limitierte und gecachte Quellenaufnahme erforderlich. Crawl4AI dokumentiert Simple, Deep und Adaptive Crawling sowie Content-Auswahl, Cache, Proxy/Security und Fallback-Funktionen [2]. Die Anwendung setzt deshalb vor einer späteren Quellenaufnahme eine Quellenfreigabe, Nutzungsbedingungen-, robots- und Qualitätsprüfung voraus.

Für B2B-Kommunikation ist ein dokumentierter Einwilligungs- oder sonstiger zulässiger Kontaktgrund erforderlich. HubSpot dokumentiert Subscription-Preference-APIs für Subscribe-/Unsubscribe-Vorgänge [3]. Der aktuelle Lead-Loop speichert keine Kontaktfreigabe als automatisch wirksame Versandberechtigung und führt keinen externen CRM- oder Messaging-Schreibzugriff aus.

## Validierung

Die Regression umfasst **49 Testdateien mit 110 erfolgreichen Tests**. TypeScript (`pnpm run check`) und der Produktionsbuild (`pnpm run build`) waren erfolgreich. Die Desktop- und mobile Vorschau des Bereichs `/revenue-loops` wurde geprüft. Die Managed-WebDev-Health-Endpunkte waren im Projektstatus zuvor erfolgreich validiert; PM2, Nginx, `/opt/cybersarah` und ein separater Python-/FFmpeg-/Crawl4AI-Betriebsworker gehören nicht zum verwalteten Projektpfad und wurden nicht simuliert.

## Offene Betriebsentscheidungen

Ein produktiver Medien-Worker, zugelassene Crawl-Quellen, echte Affiliate-/CRM-Connectoren und externe Uploads benötigen eine separate Infrastruktur- und Credential-Konfiguration. Vor Aktivierung müssen außerdem Rechte, Kennzeichnung, Datenschutz, Opt-out, Rate-Limits und ein einzelner nachvollziehbarer Approval-Datensatz geprüft werden.

## References

[1]: https://ffmpeg.org/ffmpeg-filters.html "FFmpeg Filters Documentation"

[2]: https://docs.crawl4ai.com/ "Crawl4AI Documentation"

[3]: https://developers.hubspot.com/docs/api-reference/legacy/communication-preferences/guide "HubSpot Communication Preferences API Guide"
