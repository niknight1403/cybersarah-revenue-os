# OAuth-Provider-Recherche

Google dokumentiert für serverseitige Web-Apps den OAuth-2.0-Authorization-Code-Flow; dafür werden registrierte Credentials, Redirect-URIs und ein serverseitiger Code-zu-Token-Austausch benötigt: https://developers.google.com/identity/protocols/oauth2/web-server

Microsoft dokumentiert den Authorization-Code-Flow für Web-Apps und empfiehlt die Kombination aus OAuth 2.0, OpenID Connect und PKCE sowie eine registrierte Redirect-URI. Client-Secrets dürfen nicht in den Browser gelangen; Provider-Scopes und Consent müssen bewusst konfiguriert werden: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow

Architekturentscheidung: Das bestehende Manus-OAuth bleibt als Provider erhalten. Google und Microsoft werden als serverseitig konfigurierbare OIDC-Provider mit state-/PKCE-Schutz und allowlist-basierten Redirect-URIs vorbereitet. Ohne echte, vom Betreiber bereitgestellte Client-ID/Secrets werden die Provider als nicht konfiguriert angezeigt und nicht aktiviert.
