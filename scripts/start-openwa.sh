#!/usr/bin/env bash
# Lance le pont WhatsApp (open-wa en bibliothèque) -> zeroclaw.
# Au 1er lancement, un QR code s'affiche : scanne-le avec WhatsApp (Appareils connectés).
set -euo pipefail
cd "$(dirname "$0")/.."

# Dépendances installées ?
if [ ! -d node_modules/@open-wa ]; then
  echo "▶ Installation des dépendances Node (npm install)…"
  npm install
fi

echo "▶ Pont WhatsApp -> zeroclaw (openwa/bridge.mjs)"
exec node --env-file=.env openwa/bridge.mjs
