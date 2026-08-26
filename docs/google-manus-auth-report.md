# Google-/Manus-Authentifizierung – Statusbericht

## Implementierter Umfang

CyberSarah verwendet weiterhin Manus OAuth als bestehende Anmeldung und bietet zusätzlich einen serverseitigen Google-OAuth-Authorization-Code-Flow mit PKCE an. Die Google-Routen sind `/api/oauth/google` für den Start und `/api/oauth/google/callback` für den Callback. Nach erfolgreicher, verifizierter Google-ID-Token-Prüfung wird der Nutzer über `openId`, E-Mail und Namen in der bestehenden User-Tabelle aufgelöst beziehungsweise angelegt und erhält das bestehende Session-Cookie.

Die Login-Oberfläche zeigt „Mit Manus anmelden“ und „Mit Google anmelden“. Google Client ID und Secret werden serverseitig verwaltet; der Client-Secret-Wert wird nicht in den Frontend-Build übernommen. Der OAuth-State wird kurzlebig in einem HttpOnly-SameSite-Cookie geführt und der Callback prüft State, PKCE-Verifier, Issuer, Audience und verifizierte E-Mail.

## Bewusste Grenzen

Microsoft OAuth wurde auf ausdrücklichen Nutzerwunsch aus dem aktiven Flow herausgelassen. Es gibt keine lokale E-Mail-/Passwort-Authentifizierung im aktuellen Projekt; eine solche Funktion wird nicht vorgetäuscht. Weitere Provider können später nach separater App-Registrierung und sicherer Secret-Konfiguration ergänzt werden.

## Qualität

Die Regression umfasst 54 Testdateien und 121 erfolgreiche Tests. TypeScript und Produktionsbuild waren erfolgreich. `healthz`, `readyz` und `livez` antworteten lokal jeweils mit HTTP 200. `/opt/cybersarah`, PM2 und Nginx sind in der Managed-WebDev-Umgebung nicht vorhanden und wurden nicht simuliert.

## Konfiguration

Für Google müssen in der Provider-App die Redirect-URI `${APP_ORIGIN}/api/oauth/google/callback` und die erlaubten Origins passend zur veröffentlichten Domain eingetragen sein. Die Domain darf nicht hartcodiert werden; der Server leitet sie aus der aktuellen Anfrage ab. Für ein erstes Konto sollte der Nutzer den Google-Login selbst durchführen und anschließend den HARA-Onboarding-Flow öffnen.
