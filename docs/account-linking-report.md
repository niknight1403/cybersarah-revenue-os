# Sichere Google-Account-Verknüpfung

## Implementierung

Bestehende Nutzer können im geschützten Dashboard unter `/account` nachträglich ein Google-Konto mit ihrem Profil verbinden. Der Start erfolgt ausschließlich über die Schaltfläche „Google-Konto verknüpfen“ und führt zu `/api/oauth/google/link`. Der Callback `/api/oauth/google/link/callback` behält die bestehende Manus-Sitzung bei und erstellt keine neue, getrennte Nutzeridentität.

Der Flow verwendet den vorhandenen Google-OAuth-Authorization-Code-Mechanismus mit PKCE. State, PKCE-Verifier und die aktuelle Sitzungsidentität werden kurzlebig in einem HttpOnly-SameSite-Cookie geführt. Der Callback prüft die bestehende Sitzung, State-Übereinstimmung, Google-ID-Token, Issuer, Audience und verifizierte E-Mail.

## Datenmodell und Konfliktschutz

Die additive Tabelle `accountIdentityLinks` speichert Provider, Provider-Subject und optional die Provider-E-Mail. Eindeutige Indizes verhindern, dass dieselbe Google-Identität mehreren Profilen oder ein Profil mehrfach demselben Provider zugeordnet wird. E-Mail-Gleichheit allein wird ausdrücklich nicht als Verknüpfungsnachweis akzeptiert. Identitätskonflikte werden mit HTTP 409 abgewiesen und als Audit-Ereignis erfasst.

## Validierung

Die Regression umfasst **55 Testdateien und 122 erfolgreiche Tests**. TypeScript, Produktionsbuild und die verwalteten Health-Endpunkte `healthz`, `readyz` und `livez` waren erfolgreich. Die SQL-Migration `0010_brown_mole_man.sql` wurde geprüft und additiv angewendet.

## Nutzung

Nach der Anmeldung die Navigation „Konto verknüpfen“ öffnen und den Google-Linking-Flow starten. Für Google müssen die Redirect-URI und erlaubten Origins in der Google-Cloud-Anwendung auf die veröffentlichte Projekt-Domain abgestimmt sein. Microsoft bleibt gemäß vorheriger Nutzerentscheidung deaktiviert.
