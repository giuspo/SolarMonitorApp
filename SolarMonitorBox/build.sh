#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.yaml"
YAML_FILE="${SCRIPT_DIR}/solar-monitor-box.yaml"
ESPHOME_BIN="${SCRIPT_DIR}/.venv/bin/esphome"
CMD="${1:-compile}"

if [[ ! -x "${ESPHOME_BIN}" ]]; then
  echo "Errore: ESPHome non trovato in ${ESPHOME_BIN}" >&2
  exit 1
fi

# Legge e incrementa la terza cifra (compile) in firmware_version: "major.minor.compile"
CURRENT_VER="$(grep -E '^[[:space:]]*firmware_version:' "${CONFIG_FILE}" | sed -E 's/.*"([0-9]+\.[0-9]+\.[0-9]+)".*/\1/')"
if [[ -z "${CURRENT_VER}" ]]; then
  echo "Errore: firmware_version non trovata in ${CONFIG_FILE}" >&2
  exit 1
fi

IFS='.' read -r MAJOR MINOR COMPILE <<< "${CURRENT_VER}"
NEW_COMPILE=$((COMPILE + 1))
NEW_VER="${MAJOR}.${MINOR}.${NEW_COMPILE}"

sed -i -E "s/(firmware_version:[[:space:]]*\")[0-9]+\.[0-9]+\.[0-9]+(\")/\1${NEW_VER}\2/" "${CONFIG_FILE}"
echo "Versione firmware incrementata: ${CURRENT_VER} -> ${NEW_VER}"

shift || true
exec "${ESPHOME_BIN}" "${CMD}" "${YAML_FILE}" "$@"
