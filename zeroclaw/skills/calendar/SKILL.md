# Skill — Calendrier (ajout autonome via CalDAV)

Permet à l'agent d'**ajouter un événement dans le calendrier côté serveur** (iCloud, Google,
Fastmail… via CalDAV), **sans passer par l'iPhone**. À utiliser pour les ajouts déclenchés
automatiquement — par exemple un message WhatsApp « je prends le créneau de jeudi 15h ».

> Pour les commandes lancées **par toi via Siri**, ne PAS utiliser ce skill : renvoie plutôt une
> action `calendar.add` au raccourci (cf. [`siri-commands`](../siri-commands/SKILL.md)). Ça évite de
> stocker des identifiants et utilise l'agenda natif de l'iPhone.

## Pré-requis

Variables dans `.env` : `CALDAV_URL`, `CALDAV_USERNAME`, `CALDAV_PASSWORD`
(configuration : voir [`docs/calendrier.md`](../../../docs/calendrier.md)).

## Comment l'agent ajoute un événement

Appelle le script (outil shell) :

```
scripts/calendar-add.sh \
  --title "Véto — Rex" \
  --start "2026-07-02T15:00:00" \
  --end   "2026-07-02T15:30:00" \
  --notes "Rappel vaccins" \
  --location "Clinique des Baous"
```

- `--start` / `--end` : date-heure **ISO locale** (`YYYY-MM-DDTHH:MM:SS`).
- Si l'heure de fin n'est pas précisée, mets **+30 min** (ou +1h pour un rdv).
- Le script renvoie `OK: …` en cas de succès, ou `ERREUR CalDAV: HTTP <code>`.

## Garde-fous

- **Confirme la date interprétée** dans ta réponse (« jeudi 2 juillet à 15h »), pour repérer une
  erreur de compréhension.
- Si la date/heure est ambiguë → **demande une précision** plutôt que de créer l'événement.
- En cas d'erreur du script, **dis-le clairement**, ne prétends pas que c'est ajouté.
