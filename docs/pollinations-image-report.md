# Pollinations Image API – Umstellungsbericht

## Umsetzung

Die Asset-Generierung verwendet nun bevorzugt den serverseitigen Pollinations-Adapter unter `server/services/pollinationsImage.ts`. Der Adapter ruft `https://gen.pollinations.ai/image/{prompt}` mit einem serverseitigen Bearer-Key auf, akzeptiert nur eine begrenzte Modell-Allowlist, setzt `safe=true`, begrenzt Prompt- und Bilddimensionen und speichert die zurückgelieferten Bildbytes über den vorhandenen Storage-Helper. Der Schlüssel wird nicht in das Frontend ausgeliefert.

Der bestehende `generateImage`-Helper nutzt Pollinations, wenn `POLLINATIONS_API_KEY` vorhanden ist. Ohne den Schlüssel bleibt der Pollinationspfad fail-closed und der vorhandene interne Forge-Helper kann weiterhin als konfigurierter Fallback arbeiten. Es wurde keine Leonardo-Abhängigkeit aktiviert; der zuvor angeforderte Leonardo-Key ist nicht erforderlich.

## Sicherheits- und Betriebsgrenzen

Bildgenerierung ist ein serverseitiger Providerpfad. Der Adapter validiert Prompts, Modelle, Dimensionen und Content-Type und lehnt leere oder nicht-bildartige Antworten ab. Die bestehende Approval-first-Architektur bleibt unverändert: Die Integration erzeugt Assets, führt aber keine Posts, Uploads zu Social-Plattformen oder sonstige externen Veröffentlichungen automatisch aus.

## Validierung

Der authentifizierte Pollinations-Modellkatalog wurde als leichter Secret-Check erfolgreich erreicht. Zusätzlich bestanden **59 Testdateien und 128 Tests**, TypeScript und Produktionsbuild. Die verwalteten Health-Endpunkte `healthz`, `readyz` und `livez` antworteten jeweils mit HTTP 200. Die Pollinations-Dokumentation wurde gegen den offiziellen Endpoint- und Bearer-Auth-Vertrag geprüft.
