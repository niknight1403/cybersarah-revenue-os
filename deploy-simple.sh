#!/bin/bash
# CyberSarah — Ein-Klick Deploy Script
# Einfach auf dem Hetzner Server ausführen: bash deploy-simple.sh
set -e

echo "╔════════════════════════════════════════╗"
echo "║  🚀 CyberSarah Deploy & Restart       ║"
echo "╚════════════════════════════════════════╝"

cd /opt/cybersarah

echo "📥 Pull neueste Code-Änderungen..."
git fetch origin
git reset --hard origin/main

echo "📦 Installiere Dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "⚙️  Kopiere .env..."
cp .env artifacts/api-server/.env 2>/dev/null || true

echo "🚀 Restarte Server..."
pm2 delete cybersarah 2>/dev/null || true
cd artifacts/api-server
pm2 start "npx tsx src/index.ts" --name cybersarah --time
pm2 save
sleep 3

echo ""
echo "✅ Server Status:"
pm2 status cybersarah

echo ""
echo "📋 Logs anzeigen mit: pm2 logs cybersarah --lines 20"
echo "🌐 Dashboard: http://167.233.196.20:3000"
