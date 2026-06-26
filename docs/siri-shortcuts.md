# Piloter TrotAssistant avec Siri (raccourcis iPhone)

Objectif : dire à Siri « **Dis à Paul que j'arrive** » ou « **Les horaires du vétérinaire le plus
proche de Nice** », et que TrotAssistant exécute la commande (envoi WhatsApp, info partenaire…).

## Comment ça marche

```
Siri (dictée)  ──►  Raccourci iPhone  ──►  POST /webhook  ──►  zeroclaw (agent + skill siri-commands)
                                                                     │
                                              envoie un WhatsApp (OpenWA) / renvoie une réponse
                                                                     │
                              ◄──  réponse JSON  ◄──────────────────┘
                     Siri lit la réponse à voix haute
```

Le raccourci envoie la phrase dictée à la gateway zeroclaw (`POST /webhook`, corps
`{"message": "<phrase>"}`). L'agent l'interprète via le skill
[`siri-commands`](../zeroclaw/skills/siri-commands/SKILL.md) et agit. **Aucun code à écrire** :
juste de la config réseau + un raccourci.

---

## Étape 1 — Rendre le Pi joignable depuis l'iPhone (réseau)

La gateway écoute en local. Pour que l'iPhone l'atteigne **où que tu sois**, le plus simple et le
plus sûr est **[Tailscale](https://tailscale.com)** (VPN privé, pas d'ouverture de port) :

1. Installe Tailscale sur le **Pi** et sur l'**iPhone** (même compte).
2. Note le nom/IP Tailscale du Pi (ex. `trot-pi` ou `100.x.y.z`).
3. Fais écouter la gateway sur l'interface (pas seulement `127.0.0.1`) — dans
   `zeroclaw/config.toml` :
   ```toml
   [gateway]
   host = "0.0.0.0"     # joignable via Tailscale ; reste protégé par le VPN + le token
   port = 42617
   ```

> Sans Tailscale : ça marche aussi sur le **même Wi-Fi** (utilise l'IP locale du Pi, ex.
> `192.168.1.50`). N'ouvre **pas** le port 42617 sur Internet en clair.

## Étape 2 — Obtenir un jeton d'authentification (bearer)

Par défaut la gateway exige un **bearer token** (`require_pairing = true`). Récupère-le via le
jumelage :

```bash
# sur le Pi : affiche le code de pairing (ou voir ~/.zeroclaw/config.toml)
zeroclaw status

# échange le code contre un token
curl -X POST http://127.0.0.1:42617/pair -H "X-Pairing-Code: <code>"
# → { "token": "zcl_live_..." }
```

Garde ce token `zcl_live_…` : il ira dans le raccourci (header `Authorization: Bearer`).

> Alternative plus simple pour un usage perso derrière Tailscale : mettre `require_pairing = false`
> et protéger l'endpoint avec un secret partagé (`X-Webhook-Secret`). Moins strict — à toi de voir.

## Étape 3 — Créer le raccourci

Sur l'iPhone, app **Raccourcis** → **+** → ajoute ces actions :

1. **Demander une entrée** *(ou « Dictée »)* → type *Texte* → invite « Quelle commande ? ».
   (Nomme la variable `Commande`.)
2. **Obtenir le contenu de l'URL** :
   - URL : `http://trot-pi:42617/webhook`  *(ton nom/IP Tailscale ou local)*
   - Méthode : **POST**
   - En-têtes :
     - `Authorization` : `Bearer zcl_live_...`
     - `Content-Type` : `application/json`
   - Corps de la requête : **JSON**
     - clé `message` → valeur = variable `Commande`
3. **Obtenir la valeur du dictionnaire** : clé `reply` *(= la réponse de l'agent ; voir note)*.
4. **Énoncer le texte** (ou *Afficher*) → le résultat.

Renomme le raccourci, par ex. « **TrotAssistant** ». Tu pourras dire :
**« Dis Siri, TrotAssistant »** puis dicter, ou tout dire d'un coup si tu mets la phrase en
paramètre.

> 📝 **Champ de réponse** : le corps renvoyé par `/webhook` est du JSON. Le nom exact du champ qui
> contient la réponse de l'agent (`reply`, `response`, `text`…) peut varier selon la version de
> zeroclaw. Lance le raccourci une fois avec une action **« Aperçu rapide »** sur la réponse pour
> voir la structure réelle, puis ajuste la clé du « Obtenir la valeur du dictionnaire ».

---

## Étape 5 (optionnel) — Faire exécuter des actions à l'iPhone (Agenda, Rappels)

Pour « **ajoute un rdv véto jeudi à 15h** », l'iPhone est mieux placé que le Pi pour écrire dans
l'Agenda (permissions natives, rien à stocker côté serveur). Le skill
[`siri-commands`](../zeroclaw/skills/siri-commands/SKILL.md) répond alors par un JSON structuré :

```json
{
  "speak": "C'est noté, jeudi 2 juillet à 15h.",
  "actions": [
    { "type": "calendar.add", "title": "Véto — Rex",
      "start": "2026-07-02T15:00:00", "end": "2026-07-02T15:30:00",
      "notes": "Rappel vaccins", "location": "Clinique des Baous" }
  ]
}
```

Le raccourci doit alors : énoncer `speak`, **puis** parcourir `actions` et exécuter chacune avec
l'action native correspondante. Étapes à ajouter après l'étape 3 :

1. **Obtenir la valeur du dictionnaire** : clé `speak` → **Énoncer le texte**.
2. **Obtenir la valeur du dictionnaire** : clé `actions` (c'est une liste).
3. **Répéter chaque élément** de `actions` :
   - **Obtenir la valeur** `type` de l'élément.
   - **Si** `type` = `calendar.add` :
     - récupère `title`, `start`, `end`, `notes`, `location` (Obtenir la valeur du dictionnaire) ;
     - convertis `start`/`end` en date (action **Obtenir les dates depuis l'entrée**, format ISO) ;
     - action **Ajouter un nouvel événement** (Agenda) avec ces valeurs.
   - **Sinon si** `type` = `reminder.add` :
     - action **Ajouter un nouveau rappel** avec `title` et l'échéance `due`.

> 💡 Le contrat `{ speak, actions[] }` est extensible : on peut ajouter `message.imessage`,
> `maps.directions`, etc., et brancher de nouvelles actions natives dans le `Répéter`.
>
> ⚠️ Pour que le parsing marche, l'agent doit répondre **strictement** en JSON. C'est imposé par le
> skill `siri-commands`. Si la réponse de l'agent est elle-même encapsulée dans un champ par la
> gateway (`reply`), parse d'abord ce champ, puis **« Obtenir le dictionnaire depuis l'entrée »**
> pour relire le JSON `{speak, actions}`.

### Et sans l'iPhone (autonome) ?

Si tu veux qu'un événement se crée **tout seul** (déclenché par un message WhatsApp, par ex.),
l'iPhone n'est pas dans la boucle : c'est zeroclaw qui écrit dans l'agenda via **CalDAV**. Voir
[docs/calendrier.md](calendrier.md).

## Étape 4 — Exemples de commandes

| Tu dis à Siri | Ce que fait TrotAssistant |
|---------------|---------------------------|
| « Envoie un message à Paul : j'arrive dans 10 minutes » | Résout *Paul* (contacts.json) → envoie le WhatsApp |
| « Dis à Marie qu'on décale à 15h » | Idem, reformule naturellement |
| « Les horaires du vétérinaire le plus proche de Nice » | Cherche dans partners.json → Siri lit les horaires |
| « Envoie à Paul l'adresse du toiletteur » | Cherche le partenaire → envoie l'adresse par WhatsApp |

Les données viennent de [`zeroclaw/data/`](../zeroclaw/data/) :
copie `contacts.example.json` → `contacts.json` et `partners.example.json` → `partners.json`,
puis remplis-les (ces fichiers réels sont gitignorés).

## Sécurité

- **Ne jamais** exposer le port 42617 sur Internet sans VPN/token. Tailscale + bearer = bon défaut.
- Le token `zcl_live_…` donne un accès complet à l'agent : traite-le comme un mot de passe.
- Le skill `siri-commands` refuse d'envoyer un WhatsApp si le destinataire n'est pas résolu avec
  certitude (évite les envois à la mauvaise personne).
