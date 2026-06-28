#!/usr/bin/env bash
# Lance la gateway zeroclaw (le "cerveau" : webhook entrant → SOP/skill → réponse).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

if ! command -v zeroclaw >/dev/null 2>&1; then
  echo "✗ binaire 'zeroclaw' introuvable."
  echo "  Installe-le : curl -fsSL https://raw.githubusercontent.com/zeroclaw-labs/zeroclaw/master/install.sh | bash"
  exit 1
fi

# En v0.8.x, la config vit dans le dossier de config (~/.zeroclaw par défaut), pas via --config.
# On l'amorce une fois avec `zeroclaw quickstart`, puis on reporte les réglages du
# template zeroclaw/config.toml (via `zeroclaw config set ...` ou en éditant ~/.zeroclaw/config.toml).
echo "▶ zeroclaw gateway start"
exec zeroclaw gateway start
