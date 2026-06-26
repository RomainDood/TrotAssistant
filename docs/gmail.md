# Gmail — lire / chercher / envoyer des mails (connecteur MCP)

TrotAssistant branche Gmail via un **connecteur MCP** ([mcp-mail-server](https://github.com/yunfeizhu/mcp-mail-server),
Node, lancé par `npx` — rien à installer puisque Node est déjà là). L'agent récupère alors des
**outils** : envoi, réponse, recherche, pièces jointes. Tu peux ainsi dire « *envoie un mail à Paul* »
ou « *résume mes mails non lus* » depuis Siri / WhatsApp.

> Pourquoi un connecteur MCP plutôt que le channel email natif de zeroclaw ? Le MCP donne des
> **outils à la demande** (piloter ta boîte sur commande). Le channel natif sert plutôt à
> **répondre automatiquement** aux mails entrants. On peut ajouter le channel natif plus tard si tu
> veux aussi l'auto-réponse. Cf. [architecture.md](architecture.md).

## 1. Créer un mot de passe d'application Gmail

OAuth n'est pas nécessaire : un **mot de passe d'application** suffit (et c'est le plus simple).

1. Active la **validation en deux étapes** sur ton compte Google (obligatoire).
2. Va sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Génère un mot de passe (nomme-le « TrotAssistant »). Tu obtiens 16 caractères.

## 2. Configurer `.env`

```
GMAIL_USER=toi@gmail.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
```

Ces valeurs sont injectées dans le connecteur MCP (`[[mcp.servers]]` du `zeroclaw/config.toml`)
comme `EMAIL_USER` / `EMAIL_PASS`. Rien d'autre à toucher.

## 3. Activer

```bash
pm2 restart zeroclaw      # (ou: mise run restart)
```

Au démarrage, zeroclaw lance `npx -y mcp-mail-server` et l'agent découvre les outils `gmail__*`.

## 4. Tester

Depuis une commande Siri/WhatsApp, ou en discutant avec l'agent :
- « résume mes mails non lus »
- « est-ce que Paul m'a écrit cette semaine ? »
- « envoie un mail à Marie : je confirme pour jeudi 15h »

## Résoudre « envoie un mail à <nom> »

Ajoute un champ `email` à tes contacts dans `zeroclaw/data/contacts.json` :

```json
{ "name": "Paul", "whatsapp": "33611111111@c.us", "email": "paul@example.com" }
```

L'agent (skill [`email`](../zeroclaw/skills/email/SKILL.md)) s'en sert pour résoudre le destinataire.

## Notes & sécurité

- Le mot de passe d'application donne accès à ta boîte : traite `.env` comme un secret (déjà
  gitignoré).
- Le profil de risque de l'agent est `supervised` : selon ta config, **l'envoi de mail** peut
  demander une approbation. Pour des envois auto, ajuste le `risk_profile` / `allowed_tools` dans
  `zeroclaw/config.toml` en connaissance de cause.
- Outils disponibles (préfixe `gmail__`) : `send_email`, `reply_to_email`, `get_unseen_messages`,
  `search_by_sender`, `search_since_date`, `get_attachments`… (liste complète :
  [skill email](../zeroclaw/skills/email/SKILL.md)).
- Première exécution : `npx` télécharge le paquet (quelques secondes / un peu de réseau). Ensuite
  c'est en cache.
