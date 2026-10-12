#!/usr/bin/env bash
# ==============================================================================
# Deploy Frontend (React PWA su Cloudflare Pages)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"

echo "=========================================="
echo "🚀 Avvio Build & Deploy Frontend"
echo "=========================================="

cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "📦 Installazione dipendenze frontend..."
    npm install
fi

echo "🏗️ Compilazione frontend (npm run build)..."
npm run build

echo "☁️ Deploy su Cloudflare Pages (progetto: spog-solar-monitor-box)..."
npx -y wrangler pages deploy dist --project-name=spog-solar-monitor-box --branch=main

echo ""
echo "✅ Frontend deployato con successo su Cloudflare Pages!"

