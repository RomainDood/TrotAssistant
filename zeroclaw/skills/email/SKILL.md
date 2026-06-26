# Skill — Email (Gmail via connecteur MCP)

Permet à l'agent de **lire, chercher et envoyer des mails** Gmail, via les outils du connecteur MCP
`gmail` (cf. `[[mcp.servers]]` dans `zeroclaw/config.toml`). Utilisable sur commande (Siri /
WhatsApp) ou dans une SOP.

## Pré-requis

`.env` : `GMAIL_USER` + `GMAIL_APP_PASSWORD` (mot de passe d'application). Setup :
[`docs/gmail.md`](../../../docs/gmail.md).

## Outils disponibles (préfixe `gmail__`)

- **Envoi** : `gmail__send_email`, `gmail__reply_to_email`
- **Lecture** : `gmail__get_unseen_messages`, `gmail__get_recent_messages`, `gmail__get_message`
- **Recherche** : `gmail__search_by_sender`, `gmail__search_by_subject`, `gmail__search_since_date`,
  `gmail__search_unread_from_sender`, `gmail__search_all_messages`
- **Pièces jointes** : `gmail__get_attachments`, `gmail__save_attachment`

## Exemples de commandes

| Commande (Siri / WhatsApp) | Ce que fait l'agent |
|-----------------------------|---------------------|
| « envoie un mail à Paul pour confirmer le rdv de jeudi » | résout l'email de *Paul* (voir contacts), rédige, `gmail__send_email` |
| « résume mes mails non lus » | `gmail__get_unseen_messages` → résumé court |
| « est-ce que Marie m'a répondu ? » | `gmail__search_by_sender` (Marie) |
| « les mails reçus depuis hier » | `gmail__search_since_date` |

## Résolution des destinataires

Pour « envoie un mail à <nom> », résous l'adresse via `zeroclaw/data/contacts.json` (ajoute un champ
`email` aux contacts). Si l'email est introuvable → **ne pas envoyer**, demander l'adresse.

## Garde-fous

- **Confirme avant d'envoyer** un mail si l'intention/destinataire est ambigu.
- Pour les résumés, reste **bref** (surtout si la réponse est lue par Siri).
- N'agis pas sur des mails sensibles (suppression, transfert massif) sans confirmation explicite.
