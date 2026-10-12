#!/usr/bin/env bash
# ==============================================================================
# Deploy Backend (Cloudflare Worker & D1 Database)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"

echo "=========================================="
echo "🚀 Avvio Deploy Backend (Cloudflare Worker)"
echo "=========================================="

cd "$BACKEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "📦 Installazione dipendenze backend..."
    npm install
fi

echo "🔄 Esecuzione deploy..."
npm run deploy

echo ""
echo "✅ Backend deployato con successo su Cloudflare Worker!"

