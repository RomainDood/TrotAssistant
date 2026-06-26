#!/usr/bin/env bash
# Installation des dépendances sur Raspberry Pi (Raspberry Pi OS / Debian arm64).
# Idempotent : relançable sans casse.
set -euo pipefail

echo "=== TrotAssistant — installation Raspberry Pi ==="

# 1. Node.js 20 LTS
if ! command -v node >/dev/null 2>&1; then
  echo "▶ Installation de Node.js 20…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "  node $(node -v)"

# 2. Chromium (requis par OpenWA)
if ! command -v chromium-browser >/dev/null 2>&1 && ! command -v chromium >/dev/null 2>&1; then
  echo "▶ Installation de Chromium…"
  sudo apt-get update
  sudo apt-get install -y chromium-browser || sudo apt-get install -y chromium
fi

# 3. Dépendances système Puppeteer/Chromium
echo "▶ Dépendances graphiques headless…"
sudo apt-get install -y \
  ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 \
  libatk1.0-0 libcups2 libdbus-1-3 libgbm1 libnspr4 libnss3 libxss1 libxtst6 xdg-utils || true

# 4. zeroclaw
if ! command -v zeroclaw >/dev/null 2>&1; then
  echo "▶ Installation de zeroclaw…"
  curl -fsSL https://raw.githubusercontent.com/zeroclaw-labs/zeroclaw/master/install.sh | bash
fi

# 5. pm2 (gestionnaire de process / autostart)
if ! command -v pm2 >/dev/null 2>&1; then
  echo "▶ Installation de pm2…"
  sudo npm install -g pm2
fi

echo
echo "✅ Installation terminée."
echo "Prochaines étapes :"
echo "  1) cp .env.example .env   puis édite-le"
echo "  2) zeroclaw auth setup-token --provider anthropic --profile default"
echo "  3) pm2 start ecosystem.config.js"
echo "  4) pm2 logs openwa   (scanne le QR code au 1er lancement)"
echo "  5) pm2 save && pm2 startup"
