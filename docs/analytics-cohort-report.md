# Analytics- und Kohorten-Statusbericht

Das CyberSarah Revenue OS verarbeitet Attribution aus UTM-, Referral-, Affiliate- und Recovery-Signalen als Metadaten an Revenue-Events. Die Aggregation unterscheidet Akquisition, Aktivierung, Conversion, Owned-Kanäle und Checkout-Intent. Fehlende Signale werden nicht durch synthetische Umsätze ersetzt.

Die Loop-Snapshot-Tabelle `loop_snapshots` ist additiv im Drizzle-Schema angelegt und wird bei der Growth-Analyse aus den verfügbaren Funnel- und Revenue-Signalen beschrieben. Die geschützten Prozeduren `growth.loopSnapshots` und `growth.loopCohorts` liefern historische Snapshots beziehungsweise nach Datum gruppierte Kohortenansichten. Die Rückgabe bleibt leer, wenn kein authentifizierter Workspace oder keine persistenten Daten vorhanden sind.

Die Draft-to-Approval-Verifizierung prüft, dass Entwürfe den Status `needs_approval` und die Flags `requiresApproval: true` sowie `externalExecution: false` tragen. Diese Tests simulieren keine Veröffentlichung, Zahlung, Nachricht oder Handelsorder.

> **Datenintegrität:** Umsatz- und Conversion-Kennzahlen werden ausschließlich aus gespeicherten Signalen aggregiert. Es werden keine Kundenbewertungen, Testimonials oder Demo-Umsätze erzeugt.
