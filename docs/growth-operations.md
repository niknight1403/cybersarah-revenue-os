# Growth-Operations für CyberSarah Revenue OS

## Implementierte Architektur

Das System kombiniert Stripe-Webhooks mit einem verwalteten, täglichen Analysejob. Webhook-Ereignisse werden vor jeder Verarbeitung über die Stripe-Signatur validiert, einem Revenue-Arbeitsbereich mittels `workspace_id` in der Stripe-Metadaten zugeordnet und idempotent anhand der Stripe-Event-ID gespeichert. Ohne aktiven Stripe-Provider nimmt der Endpoint nur die Signaturprüfung vor und protokolliert die Entscheidung als übersprungenen Audit-Eintrag.

| Signal | Wirkung im Revenue OS | Externe Ausführung |
|---|---|---|
| `invoice.payment_succeeded`, `checkout.session.completed`, `payment_intent.succeeded` | Umsatztimeline und Tagesmetriken | Keine |
| `invoice.payment_failed` | Dunning-Entwurf mit Audit-Trail | Keine automatische Nachricht |
| `customer.subscription.deleted` | Retention-Entwurf mit Audit-Trail | Keine automatische Nachricht |
| Funnel-Ereignisse | Conversion-, CAC- und LTV-Auswertung | Keine |
| Periodischer Analysejob | CRO-, Pricing-, SEO- und Outreach-Entwürfe | Keine unfreigegebene Veröffentlichung |

## Aktivierung nach Veröffentlichung

Die Anwendung muss zunächst veröffentlicht sein, damit der verwaltete Hintergrunddienst die produktive HTTPS-Adresse erreichen kann. Danach kann der Arbeitsbereichsinhaber die Growth-Control-Seite öffnen und den Tageslauf aktivieren. Der Standardzeitplan `0 0 7 * * *` ist ein sechsfeldiger UTC-Ausdruck und führt die Analyse täglich um 07:00 UTC aus.

Der Prozess ist pausierbar. Jeder Lauf ist an eine verwaltete Aufgabenkennung gebunden, wertet ausschließlich die eigene Arbeitsbereichskonfiguration aus und erzeugt bei Wiederholung keine doppelten Entwürfe. Die Schlüssel zum Funnel-Tracking akzeptieren nur pseudonymisierte Ereignistypen; Kontakt-, Zahlungs- und Kartendaten gehören nicht in Client-Ereignisse.

## Grenzen der Automation

SEO-, Landingpage-, Outreach-, Social-, Dunning- und Pricing-Muster werden automatisiert als Vorschläge beziehungsweise Entwürfe erzeugt. Sie bleiben mit Audit-Trail und Freigabestatus versehen. Die Ausführung von Zahlungen, Preisänderungen, Kundennachrichten oder Veröffentlichungen ist absichtlich nicht Bestandteil des automatischen Analysejobs.
