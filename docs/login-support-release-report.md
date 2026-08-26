# Login-Support-Release

Das Login-Modal unterstützt nun verständliche Rückmeldungen für `access_denied`, nicht konfigurierte Provider und fehlgeschlagene OAuth-Callbacks. Nach einem Fehler kann der Nutzer den Vorgang über „Erneut versuchen“ zurücksetzen. Der Link „Hilfe & Support bei Login-Problemen“ ist dauerhaft sichtbar und verweist auf `https://help.manus.im`.

Manus, Google und Microsoft bleiben providerabhängig gesteuert. Nicht konfigurierte Provider werden deaktiviert; OAuth-Secrets bleiben serverseitig. Die Qualitätsprüfung bestand mit **60 Testdateien und 129 Tests**, TypeScript, Produktionsbuild und `healthz`, `readyz`, `livez` auf Port 3000 jeweils HTTP 200.
