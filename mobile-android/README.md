# CyberSarah Android/TWA Scaffold

Dieses Verzeichnis enthält die nicht-signierte TWA-Vorbereitung für CyberSarah. Der produktive Web-Startpunkt ist die verwaltete Domain `https://civappopt-itwkmp92.manus.space`; `cybersarah-ki.de` ist in der aktuellen Umgebung nicht auflösbar.

## Voraussetzungen für einen echten APK/AAB-Build

Vor dem Signieren müssen ein Android- oder Bubblewrap-Projekt, eine dauerhaft kontrollierte Package ID (`de.cybersarah.app`), ein außerhalb des Repositorys verwalteter Keystore, dessen Passwortverwaltung, ein SHA-256-Zertifikat und eine passende `/.well-known/assetlinks.json` bereitgestellt werden. Private Schlüssel und Passwörter gehören weder in Git noch in WebDev-Secrets, die in den Frontend-Build gelangen.

Beispielhafte lokale Schritte nach Installation von Bubblewrap und nach eigener Schlüsselverwaltung:

```bash
npx @bubblewrap/cli init --manifest https://civappopt-itwkmp92.manus.space/manifest.webmanifest
npx @bubblewrap/cli build
```

Die Datei `client/public/.well-known/assetlinks.json` bleibt bis zur echten Signatur absichtlich neutral. Erst nach dem Signieren darf der reale Package Name und der SHA-256-Fingerprint ergänzt werden. Dieser Scaffold erzeugt selbst keinen Schlüssel und keinen APK/AAB-Download.
