# Autonomie-Engine: sichere Übernahme der neuen Arbeitsvorgabe

## Zielbild

Die neue Arbeitsvorgabe wird in CyberSarah Revenue OS als **Startknopf-gesteuerter Semi-Autopilot** umgesetzt. Ein Start stößt interne Analyse, Priorisierung, Attribution und die Erstellung konkreter Entwürfe an. Externe Wirkungen wie Zahlungen, Posts, SEO-Publishing, E-Mails, Outreach oder Anzeigenbuchungen bleiben in der Approval-Queue und werden nicht stillschweigend durch einen Full-Auto-Schalter freigeschaltet.

## Abgleich mit der bestehenden Architektur

| Prompt-Anforderung | Übernahme im bestehenden System | Schutzgrenze |
| --- | --- | --- |
| HARA verbindet Content, Influencer, Faceless-Video, Social und SEO | HARA bündelt vorhandene Agenten, Growth-Analyse, Influence- und Product-Marketing-Entwürfe | Ein Start erzeugt Pläne/Entwürfe, keine Veröffentlichung oder Kontaktaufnahme |
| „1-Click Approval / Launch“ | Autonomie-Startknopf startet den internen Zyklus; einzelne externe Entwürfe behalten ihre Freigabe | Kein globales Bypass der bestehenden Admin-/Approval-Gates |
| Full-Auto-Schalter | Nicht als uneingeschränkter Modus aktiviert; die sichere Betriebsform ist Semi-Autopilot | Full-Auto wäre mit der festgelegten Approval-First-Anforderung unvereinbar |
| Cart-Recovery und Dunning | Stripe-Webhooks erzeugen idempotente Dunning-/Retention-Entwürfe | Keine automatische Kundenkommunikation ohne Freigabe und Einwilligung |
| Self-improving Feedback Loop | Revenue- und Experiment-Events werden pseudonymisiert aggregiert und als Empfehlungen genutzt | Keine Manipulation, kein autonomer Preiswechsel und keine personenbezogene Profilbildung |
| OpenAI, Telegram, HubSpot, GCP und weitere APIs | Provider bleiben konfigurationssichere Integrationsoptionen; Fehler werden als Status/Audit sichtbar | Keine Validierung, Aktivierung oder Speicherung von Secrets über Client oder MCP |
| PM2-Neustart | Der verwaltete WebDev-Betrieb übernimmt Prozessstart, Health und Deployment | Kein PM2-Befehl innerhalb der verwalteten Laufzeit nötig oder zulässig |

## Fallback-Verhalten

Fehler bei einem konfigurierten Provider dürfen den gesamten Analysezyklus nicht als externe Aktion fortsetzen. Der Zyklus protokolliert den Fehler redigiert, markiert den betroffenen Entwurf als nicht ausführbar und lässt die übrigen internen Empfehlungen weiterlaufen. Wiederholungen werden über idempotente Audit-Schlüssel begrenzt; Secrets und Rohantworten werden nicht in der MCP-Schnittstelle ausgegeben.

## Ergebnis

Die passende Integration ist kein unbegrenzter Autopilot, sondern ein **auditierbarer Semi-Autopilot**: Der Startknopf gibt den internen Arbeitslauf frei, während jeder externe Effekt weiterhin separat und nachvollziehbar bestätigt werden muss. Das erhält die vom Projekt vorgegebene Governance und verhindert, dass eine vermeintliche Automatisierung unbeabsichtigte Zahlungen, Veröffentlichungen oder Kundenkontakte auslöst.
