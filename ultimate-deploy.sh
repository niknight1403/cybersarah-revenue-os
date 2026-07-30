#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# CyberSarah ULTIMATE One-Command Deploy
# Kopiere diesen Befehl in dein SSH-Terminal:
#   curl -sL https://raw.githubusercontent.com/niknight1403/cybersarah-revenue-os/main/ultimate-deploy.sh | bash
# ═══════════════════════════════════════════════════════════════════

set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  🚀 CyberSarah ULTIMATE DEPLOY      ║"
echo "║  Alles auf einmal — kein manuelles  ║"
echo "║  Eingreifen nötig!                  ║"
echo "╚══════════════════════════════════════╝"
echo ""

cd /opt/cybersarah

# 1. Code updaten
echo "📥 1/6 Pull neueste Code-Änderungen..."
git fetch origin
git reset --hard origin/main

# 2. Dependencies
echo "📦 2/6 Installiere Dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# 3. .env kopieren
echo "⚙️  3/6 Kopiere Konfiguration..."
cp .env artifacts/api-server/.env 2>/dev/null || true

# 4. Dashboard bauen
echo "🏗️  4/6 Baue Dashboard..."
cd artifacts/dashboard
pnpm run build 2>&1 | tail -3
cd /opt/cybersarah

# 5. Capacitor sync
echo "🔄 5/6 Synchronisiere Capacitor..."
npx cap sync android 2>&1 | tail -3

# 6. Server neustarten
echo "🚀 6/6 Starte Server neu..."
pm2 delete cybersarah 2>/dev/null || true
cd artifacts/api-server
pm2 start "npx tsx src/index.ts" --name cybersarah --time
pm2 save
sleep 3

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  ✅ DEPLOY ABGESCHLOSSEN!            ║"
echo "╚══════════════════════════════════════╝"
echo ""
pm2 status cybersarah
echo ""
echo "🌐 Wichtige URLs:"
echo "  🏠 Dashboard:     http://167.233.196.20:3000"
echo "  🛍️ Store:         http://167.233.196.20:3000/api/store"
echo "  💰 Revenue:       http://167.233.196.20:3000/api/revenue"
echo "  📊 Monitoring:    http://167.233.196.20:3000/api/system-dashboard"
echo "  🚀 Quick-Start:   curl -X POST http://167.233.196.20:3000/api/quick-start"
echo "  📱 APK:           http://167.233.196.20:3000/apk/"
echo ""
echo "📋 Logs: pm2 logs cybersarah --lines 20"
