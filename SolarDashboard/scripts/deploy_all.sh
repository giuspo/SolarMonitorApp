#!/usr/bin/env bash
# ==============================================================================
# Deploy Completo: Backend + Frontend
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "⚡ DEPLOY COMPLETO SOLAR DASHBOARD"
echo "=========================================="

# 1. Deploy Backend
bash "$SCRIPT_DIR/deploy_backend.sh"

echo ""

# 2. Deploy Frontend
bash "$SCRIPT_DIR/deploy_frontend.sh"

echo ""
echo "=========================================="
echo "🎉 TUTTO DEPLOYATO CON SUCCESSO!"
echo "=========================================="

