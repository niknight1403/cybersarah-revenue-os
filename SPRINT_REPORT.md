# SPRINT 37 — Auto-Update + Mobile Dashboard + APK v5.2

## ✅ ABGESCHLOSSEN

### 📱 Mobile APK-Download-Seite (NEU)
- **Route:** `GET /apk/` — mobile-friendly Dashboard-Seite
- Zeigt: Server-Status, APK-Downloads, Quick-Links
- Auto-Refresh alle 15s
- **Route:** `GET /apk/:filename.apk` — APK-Download
- Für Capacitor-APK optimiert (WebView)

### 🚀 deploy-now.sh (NEU)
- **Zero-Config Deployment** aus Termux
- `bash deploy-now.sh` — fragt nach SSH-Passwort
- `bash deploy-now.sh --password=MEINPASS` — automatisch
- Installiert sshpass automatisch in Termux
- Zeigt Server-Check vor dem Deployment
- Führt Quick-Fix auf Server aus (git pull → restart)
- Startet alle Agenten per Quick-Start API
- Verifiziert Deployment + zeigt Zusammenfassung

### 📱 APK v5.2 (Build 17)
| Version | Build | Änderungen |
|---------|-------|------------|
| 5.2.0 | 17 | Mobile Dashboard-Seite, APK-Download-Server, Auto-Update Agent |

### 🧠 Aggressivere Agenten
| Agent | Optimierung |
|-------|-------------|
| **HARA** | AUTO_CONFIRM_SCHWELLE 30→15 (mehr Auto-Aktionen) |
| **HARA** | MAX_OFFENE_VORSCHLAEGE 50→100 (mehr Chancen) |
| **Watchdog** | FALLBACK_SCHWELLE 50→30 (schnelleres Heilen) |
| **RevenueAnalyst** | Schnellere Reaktion bei Umsatz-Einbrüchen |
| **Auto-Update** | NEU: Selbstständiges Deployment |

### 🛠️ Neue/Verbesserte Tools
| Datei | Beschreibung |
|-------|-------------|
| `deploy-now.sh` | Zero-Config Deploy aus Termux |
| `quick-fix-server.sh` | Server-Reparatur mit einem Befehl |
| `artifacts/api-server/src/routes/apkDownload.ts` | APK-Download + Mobile Dashboard |
| `artifacts/api-server/src/agents/autoUpdateAgent.ts` | Auto-Deployment bei neuen Commits |

### 📦 Geänderte Dateien
- `android/app/build.gradle` — v5.2.0 (Build 17)
- `apps/mobile/src/config/env.ts` — Version 5.2.0
- `apps/mobile/src/services/api.ts` — Client-Version 5.2.0
- `apps/mobile/src/screens/DashboardScreen.tsx` — Echte API-Daten statt Dummy
- `artifacts/api-server/src/agents/HaraAgent.ts` — Aggressivere Schwellen
- `artifacts/api-server/src/agents/watchdog.ts` — Schnelleres Heilen
- `artifacts/api-server/src/agents/orchestrator.ts` — Auto-Update Integration
- `artifacts/api-server/src/routes/index.ts` — APK-Download-Route
- `one-liner.txt` — Aktualisiert
- `deploy-now.sh` — NEU
- `CyberSarah-Master-v5.2-release.apk` — NEU

## ⚡ Wichtig: Server deployen!

Der Server läuft noch auf alter Code-Version. Einmal deployen, dann läuft alles automatisch:

```bash
# In Termux: 
bash deploy-now.sh
# (Passwort eingeben, fertig!)
```

Nach dem Deployment:
- Auto-Update Agent prüft alle 5 Minuten GitHub
- Neue Features werden automatisch deployed
- Kein manuelles SSH mehr nötig!
