# CyberSarah Revenue OS MCP Server

Der MCP-Server stellt einen **stateless Streamable-HTTP-Endpunkt** unter `POST /api/mcp` bereit. Der verwendete SDK-Transport ist für Remote-Server vorgesehen und unterstützt sowohl direkte HTTP-Antworten als auch Streaming, während der stateless Modus keine serverseitige MCP-Sitzung vorhält.[1]

## Zugriff und Sicherheitsmodell

Jeder Aufruf benötigt den Header `Authorization: Bearer $MCP_SERVER_TOKEN`. Der Token wird ausschließlich serverseitig verwaltet. Fehlende oder ungültige Tokens liefern `401`; der Probe-Endpunkt `GET /api/mcp/health` erlaubt eine leichte, ebenfalls tokenpflichtige Verfügbarkeitsprüfung. Ressourcen und Tools werden an den Arbeitsbereich des konfigurierten Revenue-OS-Owners gebunden.

> **Sicherheitsgrenze:** Das MCP-Protokoll gibt keine API-Keys, Tokens, Webhook-Secrets, Cookies, Passwörter oder als sensibel erkannte Stringwerte aus. Jede Tool- und Ressourcenoperation wird im zentralen Growth-Audit-Trail protokolliert.

## Ressourcen

| URI | Inhalt | Schutzmechanismen |
|---|---|---|
| `metrics://revenue` | MRR, ARR, Umsatz, Conversion, Churn, CAC und LTV-Schätzung | Aggregiert, mandantengebunden, redigiert |
| `logs://system` | Runtime- und Systemaudit-Einträge | Redigierte Felder und Begrenzung auf 50 Einträge |
| `experiments://ab-testing` | CRO-, Landingpage- und Pricing-Experimente | Freigabestatus und Traffic-Limit, keine Live-Preiswerte |

## Tools

| Tool | Eingabe | Wirkung |
|---|---|---|
| `get_financial_summary` | Keine | Liefert die aggregierte Finanz- und Funnelzusammenfassung. |
| `trigger_dunning_sequence` | `revenueEventId` | Erstellt einen auditierten **Dunning-Entwurf** für einen registrierten Zahlungsfehler. Es wird keine Nachricht versendet. |
| `update_pricing_experiment` | `experimentId`, `variantKey`, `proposedValue`, `maxTrafficPercent` | Aktualisiert ausschließlich nicht aktive Pricing-Varianten, begrenzt Traffic auf 25 % und setzt zwingend `needs_approval`. |
| `query_audit_trail` | Optionales `limit` (1–100) | Liefert redigierte historische MCP-, Growth- und Agentenaktionen. |

## Verbindungsbeispiel

```bash
curl -X POST "https://<domain>/api/mcp" \
  -H "Authorization: Bearer $MCP_SERVER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  --data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-11-25",
      "capabilities": {},
      "clientInfo": {"name": "revenue-agent", "version": "1.0.0"}
    }
  }'
```

## Validierung

Die Implementierung deckt tokenpflichtigen Endpoint-Zugriff, Tool- und Ressourcendiscovery, Finanzzusammenfassung, Pricing-Guardrails sowie Geheimnisredaktion mit automatisierten Tests ab. Zusätzlich wurden der laufende MCP-Health-Endpunkt und die JSON-RPC-Initialisierung mit dem konfigurierten Bearer-Token geprüft.

## Referenzen

[1]: https://ts.sdk.modelcontextprotocol.io/ "MCP TypeScript SDK v1: Streamable HTTP und Serverkonzepte"
