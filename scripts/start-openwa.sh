#!/usr/bin/env bash
# Lance OpenWA (EASY API) : reçoit/envoie les messages WhatsApp et poste le webhook à zeroclaw.
set -euo pipefail
cd "$(dirname "$0")/.."

# Charge .env
if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

: "${OPENWA_API_KEY:?Définis OPENWA_API_KEY dans .env}"
: "${ZEROCLAW_WEBHOOK_URL:?Définis ZEROCLAW_WEBHOOK_URL dans .env}"
: "${OPENWA_PORT:=8002}"

echo "▶ OpenWA sur le port ${OPENWA_PORT}, webhook → ${ZEROCLAW_WEBHOOK_URL}"

exec npx --yes @open-wa/wa-automate@latest \
  --config-file ./openwa/cli-config.json \
  --port "${OPENWA_PORT}" \
  --key "${OPENWA_API_KEY}" \
  --webhook "${ZEROCLAW_WEBHOOK_URL}" \
  ${OPENWA_LICENSE_KEY:+--license-key "${OPENWA_LICENSE_KEY}"}
