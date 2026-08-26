# Google redirect_uri_mismatch – Nachweis

Der reproduzierte Google-Login-Start sendete laut Google-Fehlerdetails:

`redirect_uri=https://3000-i6ahtplo0u9262wiod75x-63579648.us3.manus.computer/api/oauth/google/callback`

Google akzeptiert diese URI nur, wenn sie exakt in der verwendeten OAuth-Webanwendung als autorisierte Weiterleitungs-URI registriert ist. Für den veröffentlichten Produktionshost ist analog die URI `https://civappopt-itwkmp92.manus.space/api/oauth/google/callback` erforderlich. Für Account-Linking gilt jeweils zusätzlich der Pfad `/api/oauth/google/link/callback`.

Die Ursache liegt damit primär in der Google-Cloud-OAuth-Konfiguration beziehungsweise darin, dass ein Preview-Host statt des Produktionshosts verwendet wurde. Der Code muss die Origin-Ermittlung konsistent machen und darf keine Client-Secrets in den Browser geben.
