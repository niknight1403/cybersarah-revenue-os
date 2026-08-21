# Stripe-Webhook-Anforderungen für CyberSarah Revenue OS

Stripe unterstützt ereignisgesteuerte HTTPS-Webhooks für Zahlungs-, Rechnungs- und Aboereignisse. Der Handler muss POST-Payloads akzeptieren, die Signatur anhand des Rohbodys und des Endpoint-Signaturgeheimnisses prüfen sowie schnell mit einem 2xx-Status antworten, bevor komplexe Folgearbeit erfolgt.[1]

Für den Revenue-OS-Funnel sind insbesondere `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated` und `customer.subscription.deleted` relevante Ereignistypen. Stripe führt diese Typen in seiner aktuellen Ereignisreferenz.[2]

Die bestehende Implementierung behält deshalb Rohbody-Verarbeitung, Signaturprüfung, idempotente Ereignisverarbeitung und Freigabegates bei. Ein deaktivierter Provider darf keine Zahlungen, Kommunikation oder Preisänderungen auslösen; verifizierte Webhooks werden bis zur expliziten Providerfreigabe nur als kontrollierte Signale behandelt.

## Referenzen

[1]: https://docs.stripe.com/webhooks "Stripe: Receive Stripe events in your webhook endpoint"
[2]: https://docs.stripe.com/api/events/types "Stripe: Types of events"
