#!/bin/bash
set -eo pipefail
cd "$(dirname "$0")"

echo "🚀 Starte CyberSarah Revenue OS..."

# Prüfen ob .env existiert
if [ -f .env ]; then
  echo "✅ .env-Datei gefunden"
else
  echo "⚠️ Keine .env-Datei gefunden — verwende Standardwerte"
fi

# tsx installieren falls nötig
if ! command -v tsx &> /dev/null; then
    echo "📥 Installiere tsx global..."
    npm install -g tsx 2>&1 | tail -3
fi

echo "✅ tsx: $(tsx --version)"

# Server starten (Node/dotenv lädt die .env automatisch im Hintergrund sicher mit)
echo "📡 Starte Server auf Port ${PORT:-3000}..."
PORT="${PORT:-3000}" tsx artifacts/api-server/src/index.ts
