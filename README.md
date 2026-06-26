# TrotAssistant

Assistant conversationnel WhatsApp **auto-hébergé**, pensé pour tourner sur un Raspberry Pi.
Il automatise les réponses récurrentes : dès qu'un message arrive sur WhatsApp, il déclenche
un *skill* / une SOP dans [zeroclaw](https://github.com/zeroclaw-labs/zeroclaw) qui rédige et
envoie la réponse standard — sans bot évident, sans serveur cloud, sur **ton** matériel et
**ton** abonnement Claude.

> Objectif : faire gagner du temps sur les conversations qui se répètent.

## Architecture (sans bridge custom)

```
WhatsApp ──► OpenWA (Node + Chromium headless)
                │   webhook POST (message entrant)
                ▼
        zeroclaw — gateway :42617
                │   channel webhook  →  SOP "whatsapp-reply"
                │   match + skill  →  session LLM (Claude via abonnement)
                │   tool HTTP
                ▼
        POST  http://OpenWA/sendText   ──►  WhatsApp (réponse)
```

On ne code **aucun pont** : OpenWA poste directement son webhook à zeroclaw, et zeroclaw rappelle
l'API REST d'OpenWA (`/sendText`) pour envoyer la réponse. Tout est en config + skills/SOP.

### Bonus : piloter avec Siri 🗣️

Un **raccourci iPhone** envoie des commandes en langage naturel à la même gateway zeroclaw
(`POST /webhook`) : « *Dis à Paul que j'arrive* », « *les horaires du vétérinaire le plus proche de
Nice* ». L'agent interprète et agit (envoi WhatsApp, info partenaire), puis Siri lit la réponse.

```
Siri (dictée) ──► Raccourci iPhone ──► POST /webhook ──► zeroclaw (skill siri-commands) ──► action
```

Guide complet : [docs/siri-shortcuts.md](docs/siri-shortcuts.md).

| Pièce        | Rôle                                                    | Techno            |
|--------------|---------------------------------------------------------|-------------------|
| **OpenWA**   | Capter / envoyer les messages WhatsApp                  | `@open-wa/wa-automate` (Node) |
| **zeroclaw** | Runtime d'agent : route le message, choisit un skill, génère la réponse | binaire Rust |
| **Claude**   | Le « cerveau » des réponses                             | abonnement (OAuth setup-token) |

## Pourquoi ce choix d'auth (important)

Le provider Claude est branché via un **OAuth setup-token d'abonnement** (`sk-ant-oat*`), pas une
clé API facturée. zeroclaw stocke ce token dans un profil d'auth local ; tu génères le token une
seule fois :

```bash
zeroclaw auth setup-token --provider anthropic --profile default
```

> ⚠️ Depuis 2026, l'usage des crédits d'abonnement par des outils tiers est encadré par Anthropic.
> Les voies « propres » sont : (a) cet OAuth setup-token, ou (b) une clé API Anthropic classique
> (`sk-ant-...`, facturée au token) si tu préfères. Vérifie les CGU au moment du déploiement.

## Limites connues d'OpenWA (à lire avant de te lancer)

- **Non-officiel** : tourne via WhatsApp Web + **Chromium headless** (puppeteer). Lourd → viser un
  **Pi 4 / Pi 5 avec 2 Go+**. Un Pi Zero ne tiendra pas Chromium.
- **Risque de ban** : utilise un **numéro WhatsApp dédié**, throttle les réponses, reste « humain ».
- **Licence** : la messagerie de base est gratuite ; certaines features (médias, etc.) demandent une
  *Insiders license* payante (`OPENWA_LICENSE_KEY`).

## Démarrage rapide

### 1. Prérequis
- Node.js 18+ et un Chromium/Chrome installé
- Le binaire [`zeroclaw`](https://github.com/zeroclaw-labs/zeroclaw) (`curl -fsSL https://raw.githubusercontent.com/zeroclaw-labs/zeroclaw/master/install.sh | bash`)
- Un abonnement Claude (Pro/Max) **ou** une clé API Anthropic

### 2. Config
```bash
cp .env.example .env
# édite .env : OPENWA_API_KEY, TROT_WEBHOOK_SECRET, ALLOWED_NUMBERS, (OPENWA_LICENSE_KEY)

# auth Claude (abonnement) :
zeroclaw auth setup-token --provider anthropic --profile default
```

### 3. Lancer (dev, deux terminaux)
```bash
# terminal 1 — le cerveau
./scripts/start-zeroclaw.sh

# terminal 2 — WhatsApp (scanne le QR au 1er lancement)
./scripts/start-openwa.sh
```

> 🔐 Première connexion WhatsApp (QR code ou link code) : voir
> [docs/openwa-authentification.md](docs/openwa-authentification.md).

### 4. Lancer (Raspberry Pi, en service)
Voir [docs/raspberry-pi.md](docs/raspberry-pi.md) — installation + autostart via **pm2** (ou systemd).

```bash
./scripts/install-pi.sh        # node, chromium, zeroclaw, pm2
pm2 start ecosystem.config.js  # démarre OpenWA + zeroclaw
pm2 save && pm2 startup        # relance au reboot
```

### Raccourcis avec `mise` (optionnel, recommandé)

[mise](https://mise.jdx.dev) (« mise-en-place ») transforme toutes ces commandes en tâches simples.
Binaire ~25 Mo, négligeable sur un Pi ; il charge aussi le `.env` automatiquement.

```bash
curl https://mise.run | sh      # installe mise (une fois)
mise trust                      # autorise le mise.toml du projet
mise tasks                      # liste toutes les commandes dispo

mise run setup                  # = install des dépendances
mise run auth                   # = connecte l'abonnement Claude
mise run data                   # = crée contacts.json / partners.json
mise run start                  # = démarre OpenWA + zeroclaw
mise run qr                     # = affiche le QR WhatsApp
mise run boot                   # = autostart au reboot
mise run health                 # = vérifie gateway + connexion WhatsApp
```

## Skills / réponses standard

Les réponses récurrentes vivent dans [`zeroclaw/skills/`](zeroclaw/skills/) et la logique de
déclenchement dans [`zeroclaw/sops/`](zeroclaw/sops/). Pour en ajouter une, voir
[zeroclaw/skills/README.md](zeroclaw/skills/README.md).

## Structure du repo

```
zeroclaw/
  config.toml              # provider Claude, channel webhook, agent, SOP
  sops/whatsapp-reply/     # SOP déclenchée à chaque message entrant
  skills/                  # réponses standardisées (FAQ, horaires, commandes Siri)
  data/                    # contacts.json + partners.json (gitignorés, voir *.example.json)
openwa/
  cli-config.json          # config OpenWA EASY API
scripts/                   # install + lancement
ecosystem.config.js        # pm2 (OpenWA + zeroclaw)
docs/                      # architecture, identification OpenWA, guide Raspberry Pi
```

## Documentation

- [docs/architecture.md](docs/architecture.md) — flux d'un message, ports, sécurité
- [docs/openwa-authentification.md](docs/openwa-authentification.md) — s'identifier sur WhatsApp (QR / link code)
- [docs/siri-shortcuts.md](docs/siri-shortcuts.md) — piloter l'assistant avec Siri (commandes + actions Agenda/Rappels)
- [docs/calendrier.md](docs/calendrier.md) — ajouts d'événements autonomes via CalDAV (iCloud/Google)
- [docs/gmail.md](docs/gmail.md) — lire / chercher / envoyer des mails (connecteur MCP)
- [docs/raspberry-pi.md](docs/raspberry-pi.md) — déploiement et autostart sur Raspberry Pi

## Avertissement

Projet personnel d'automatisation. OpenWA n'est pas affilié à WhatsApp/Meta ; l'automatisation de
WhatsApp peut violer leurs CGU et exposer à une suspension de compte. Utilise-le en connaissance de
cause, sur un numéro dédié.

## Licence

[MIT](LICENSE)
