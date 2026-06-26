# Skill — Commandes Siri (langage naturel)

Ce skill traite les commandes envoyées depuis un **raccourci iPhone / Siri** vers la gateway
zeroclaw (`POST /webhook`, corps `{"message": "<la commande dictée>"}`). L'agent interprète la
phrase, agit, puis renvoie une réponse courte que Siri lit à voix haute.

## Format de réponse OBLIGATOIRE (pour les commandes Siri)

Pour ce skill, réponds **toujours et uniquement** par un objet JSON de cette forme — rien d'autre,
pas de texte autour :

```json
{
  "speak": "Phrase courte que Siri lit à voix haute.",
  "actions": [ /* 0..n actions que le RACCOURCI exécutera sur l'iPhone */ ]
}
```

Types d'`actions` que le raccourci sait exécuter (apps natives iOS) :

```json
{ "type": "calendar.add",  "title": "Véto — Rex", "start": "2026-07-02T15:00:00",
  "end": "2026-07-02T15:30:00", "notes": "Rappel vaccins", "location": "Clinique des Baous" }

{ "type": "reminder.add",  "title": "Rappeler le véto", "due": "2026-07-01T18:00:00" }
```

- Dates au format **ISO local** `YYYY-MM-DDTHH:MM:SS`.
- Les envois WhatsApp et les infos partenaires sont faits **côté serveur** par l'agent (voir plus
  bas) : ils ne sont **pas** dans `actions`, juste confirmés dans `speak`.
- Si aucune action iPhone n'est nécessaire : `"actions": []`.

## Données de référence

- **Contacts** : `zeroclaw/data/contacts.json` (nom → numéro WhatsApp). Voir
  `contacts.example.json`. Sert à résoudre « envoie un message à Paul ».
- **Partenaires** : `zeroclaw/data/partners.json` (nom, type, ville, adresse, horaires, téléphone).
  Voir `partners.example.json`. Sert aux demandes type « horaires du vétérinaire le plus proche ».

> Les fichiers réels (`contacts.json`, `partners.json`) sont **gitignorés** : ils contiennent des
> données perso. Copie les `.example.json` et remplis-les.

## Types de commandes gérées

### 1. Envoyer un message WhatsApp
Exemples : « envoie un message à Paul pour dire que j'arrive dans 10 minutes »,
« dis à Marie qu'on décale le rdv à 15h ».

Étapes :
1. Résous le **destinataire** via `contacts.json` (nom → numéro `…@c.us`).
   - Si le nom est ambigu ou introuvable → **ne pas envoyer**, répondre « Contact introuvable : <nom> ».
2. Rédige le message (court, naturel, en français).
3. Envoie via l'API OpenWA :
   - `POST {OPENWA_API_URL}/sendText`
   - header `api_key: {OPENWA_API_KEY}`
   - body `{ "args": { "to": "<numéro@c.us>", "content": "<message>" } }`
   - tools: http
4. Réponds à Siri : « C'est envoyé à <nom>. » (confirme, ne récite pas tout le message).

### 2. Donner / envoyer une info partenaire
Exemples : « les horaires d'ouverture de notre partenaire vétérinaire le plus proche de Nice »,
« envoie à Paul l'adresse du toiletteur ».

Étapes :
1. Cherche dans `partners.json` le partenaire correspondant (type + proximité de la ville demandée).
   - « le plus proche de Nice » → choisis le partenaire du bon type dont la ville/adresse est la plus
     proche de Nice (utilise la ville ; pas besoin de géoloc précise).
2. Si la commande dit **« envoie à <contact> »** → envoie l'info par WhatsApp (cf. type 1).
   Sinon → renvoie simplement l'info à Siri pour qu'elle la lise.

### 3. Agenda / rappels (exécutés sur l'iPhone)
Exemples : « ajoute un rdv véto pour Rex jeudi à 15h », « rappelle-moi d'appeler le toiletteur
demain à 18h ».

- Interprète la date/heure relative (« jeudi », « demain à 18h ») en **ISO local**.
- Renvoie l'action correspondante (`calendar.add` ou `reminder.add`) dans `actions` — c'est le
  **raccourci** qui crée l'événement dans l'app native (rien à stocker côté serveur).
- Confirme dans `speak` la date interprétée (« C'est noté, jeudi 2 juillet à 15h »).

### 4. Question / info générale
Réponds dans `speak`, en une ou deux phrases, `actions` vide. Si une réponse standard existe déjà
dans un autre skill (ex. `faq-horaires`), réutilise-la.

## Garde-fous

- **N'envoie jamais** un message WhatsApp sans destinataire résolu avec certitude.
- En cas de doute sur l'intention, **demande une clarification** dans la réponse à Siri plutôt que
  d'agir.
- Réponses **brèves** : Siri les lit à voix haute.
