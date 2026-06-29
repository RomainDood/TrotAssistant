#!/usr/bin/env bash
# Lance le pont WhatsApp (Baileys, sans navigateur) -> zeroclaw.
# Au 1er lancement, un QR code s'affiche dans le terminal : scanne-le avec WhatsApp
# (Réglages → Appareils connectés → Connecter un appareil).
set -euo pipefail
cd "$(dirname "$0")/.."

# Dépendances installées ?
if [ ! -d node_modules/@whiskeysockets ]; then
  echo "▶ Installation des dépendances Node (npm install)…"
  npm install
fi

echo "▶ Pont WhatsApp (Baileys) -> zeroclaw"
exec node --env-file=.env openwa/bridge.mjs
