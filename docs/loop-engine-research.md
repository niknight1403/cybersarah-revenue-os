# Research-Notizen: Medien-, SEO- und Lead-Loops

## Geprüfte Quellen

| Quelle | Relevante Feststellung | Architekturfolge |
|---|---|---|
| [FFmpeg Filters Documentation](https://ffmpeg.org/ffmpeg-filters.html) | FFmpeg bietet Filtergraphen zur Verarbeitung und Kombination von Audio-/Videoströmen. | Das Revenue OS kann einen Renderplan und später einen isolierten Render-Worker vorsehen; im Managed-WebDev darf keine lokale FFmpeg-Installation als bereits verfügbar behauptet werden. |
| [Crawl4AI Documentation](https://docs.crawl4ai.com/) | Crawl4AI dokumentiert Simple, Deep und Adaptive Crawling sowie Content-Auswahl, Cache, Proxy/Security und Anti-Bot/Fallback-Funktionen. | Ein SEO-Loop braucht erlaubte Quellen, robots-/Nutzungsbedingungen, Rate-Limits, Cache und einen Review-Gate; kein ungeprüfter Massencrawl. |
| [HubSpot Communication Preferences API](https://developers.hubspot.com/docs/api-reference/legacy/communication-preferences/guide) | Die Subscription-Preferences-API unterstützt Subscribe/Unsubscribe für E-Mail-Abonnementtypen. | Lead-Outreach bleibt bis dokumentierter Einwilligung/Rechtsgrundlage und manueller Freigabe ein Entwurf; CRM-/Messaging-Schreibzugriffe werden nicht automatisch ausgelöst. |

## Ableitung

Die drei neuen Mechanismen werden im bestehenden Projekt als **interne, auditierbare Draft-Engines** umgesetzt. Sie erzeugen keine MP4-Dateien, keine veröffentlichten Landingpages und keine versendeten Nachrichten, solange keine getrennte menschliche Freigabe vorliegt. Für einen späteren echten Video-Render sind ein separat betriebener Worker und verwaltete Storage-/Connector-Secrets erforderlich. Für externe Crawls sind nur zugelassene Quellen mit dokumentierten Grenzen zulässig.
