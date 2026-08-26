# Login-Modal UX – Releasebericht

Das öffentliche Login nutzt nun eine wiederverwendbare `LoginModal`-Komponente. Manus, Google und Microsoft werden über den nicht-sensitiven Providerstatus gesteuert; ein Provider ohne vollständige serverseitige Konfiguration bleibt deaktiviert und wird verständlich beschriftet.

Beim Start einer Anmeldung zeigt der jeweilige Button einen Spinner, `Wird verbunden …`, `aria-busy` und einen deaktivierten Zustand. OAuth-Fehler aus Query-Parametern werden in klare deutsche Hinweise übersetzt, als `role=alert` dargestellt und anschließend aus der URL entfernt. Der Flow speichert keine Passwörter und führt keine Authentifizierung im Browsercode selbst durch.

Die vollständige Regression bestand mit **60 Testdateien und 129 Tests**. TypeScript, Produktionsbuild und die Health-Endpunkte `healthz`, `readyz` und `livez` auf Port 3000 waren erfolgreich. Microsoft bleibt bei fehlenden Credentials deaktiviert; Manus und Google bleiben unabhängig voneinander nutzbar.
