# Architecture

## Flux d'un message

```
1. Un contact écrit sur WhatsApp.
2. OpenWA (WhatsApp Web headless) capte le message et POST un webhook :
       POST http://127.0.0.1:42617/webhook/whatsapp
       { "event": "onMessage", "data": { "from": "...@c.us", "body": "..." } }
3. zeroclaw reçoit le webhook (channel "whatsapp"), vérifie le secret,
   et la SOP "whatsapp-reply" se déclenche (trigger type=webhook).
4. La SOP :
     a. filtre l'expéditeur (ALLOWED_NUMBERS, ignore les groupes) ;
     b. choisit le skill le plus pertinent (zeroclaw/skills/*) ;
     c. ouvre une session LLM (Claude via abonnement) pour rédiger la réponse ;
     d. appelle l'outil HTTP pour envoyer la réponse.
5. zeroclaw POST vers l'API REST d'OpenWA :
       POST http://127.0.0.1:8002/sendText
       header api_key: <OPENWA_API_KEY>
       { "args": { "to": "...@c.us", "content": "<réponse>" } }
6. OpenWA envoie la réponse sur WhatsApp.
```

## Pourquoi « sans bridge »

OpenWA sait **à la fois** poster un webhook entrant ET exposer une API REST pour envoyer. zeroclaw
sait **à la fois** recevoir un webhook ET appeler une API HTTP sortante. On branche donc les deux
bout à bout, sans aucun service intermédiaire à coder ni maintenir. Tout est déclaratif (config +
SOP + skills).

## Composants & ports

| Composant | Port | Rôle |
|-----------|------|------|
| OpenWA EASY API | `8002` | API REST WhatsApp (send) + émetteur de webhook |
| zeroclaw gateway | `42617` | Webhook entrant + moteur SOP/agent |

Tout est en `127.0.0.1` : rien n'est exposé sur le réseau. Si tu veux piloter à distance, mets un
tunnel (Tailscale, WireGuard) plutôt que d'ouvrir les ports.

## Sécurité

- **Secret webhook** (`TROT_WEBHOOK_SECRET`) vérifié par zeroclaw → seul OpenWA peut déclencher.
- **Clé API OpenWA** (`OPENWA_API_KEY`) → seul zeroclaw peut faire envoyer des messages.
- **Allowlist** (`ALLOWED_NUMBERS`) → limite qui peut déclencher une réponse auto.
- **risk_profile = supervised** côté agent → les actions à haut risque sont bloquées.

## Points à valider au déploiement

Le schéma de config zeroclaw (`config.toml`, format SOP) évolue selon la version du binaire.
Génère une base avec `zeroclaw quickstart`, compare avec `zeroclaw/config.toml`, et ajuste les
noms de clés si besoin. Les fichiers de ce repo sont commentés en ce sens.
