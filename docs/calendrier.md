# Calendrier — ajouts autonomes (Option B, CalDAV)

Deux façons d'ajouter des événements avec TrotAssistant :

| Déclencheur | Approche | Où c'est documenté |
|-------------|----------|--------------------|
| **Toi, via Siri** | L'agent renvoie une action `calendar.add`, le **raccourci** crée l'événement dans l'app Agenda native | [docs/siri-shortcuts.md](siri-shortcuts.md) |
| **Autonome** (message WhatsApp, cron) | **zeroclaw** écrit directement dans le calendrier via **CalDAV** | *ce document* |

Cette page couvre l'**Option B** : zeroclaw appelle [`scripts/calendar-add.sh`](../scripts/calendar-add.sh)
(skill [`calendar`](../zeroclaw/skills/calendar/SKILL.md)) qui fait un `PUT` d'un fichier `.ics`
dans ton calendrier. Ça marche avec tout serveur **CalDAV** : iCloud, Google, Fastmail…

## iCloud

1. **Mot de passe d'application** : [appleid.apple.com](https://appleid.apple.com) → Connexion et
   sécurité → *Mots de passe pour applications* → en générer un (nécessite la double
   authentification). C'est lui qui va dans `CALDAV_PASSWORD` (pas ton mot de passe iCloud).
2. **URL de la collection calendrier** : iCloud génère une URL du type
   `https://pXX-caldav.icloud.com/<id-numérique>/calendars/<nom-ou-uuid>/`.
   Pour la découvrir :
   ```bash
   # liste les calendriers (principal + collections)
   curl -s -u "TON_APPLE_ID:MOT_DE_PASSE_APP" \
     -X PROPFIND "https://caldav.icloud.com/" \
     -H "Depth: 1" -H "Content-Type: application/xml" \
     --data '<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>'
   ```
   Suis le `current-user-principal` puis liste les `calendars/` pour repérer l'URL de la collection
   voulue. (Des clients comme [vdirsyncer](https://vdirsyncer.pimutils.org/) facilitent cette
   découverte si besoin.)
3. Renseigne `.env` :
   ```
   CALDAV_URL=https://pXX-caldav.icloud.com/123456/calendars/home/
   CALDAV_USERNAME=ton-apple-id@icloud.com
   CALDAV_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

## Google Calendar

Google expose aussi du CalDAV :
- `CALDAV_URL` : `https://apidata.googleusercontent.com/caldav/v2/<email>/events/`
- `CALDAV_USERNAME` : ton email Google
- `CALDAV_PASSWORD` : un **mot de passe d'application** Google (compte avec 2FA)

## Tester

```bash
./scripts/calendar-add.sh \
  --title "Test TrotAssistant" \
  --start "2026-07-02T15:00:00" \
  --end   "2026-07-02T15:30:00" \
  --notes "Créé par le script"
# Attendu : "OK: événement ajouté — Test TrotAssistant (2026-07-02T15:00:00)"
```

L'événement doit apparaître dans ton agenda en quelques secondes.

## Notes & limites

- Le script utilise `date` GNU (Linux) → conçu pour le **Raspberry Pi OS** / Linux. Sur macOS la
  syntaxe `date -u -d` diffère (utilise le Pi pour ce script, ou installe `coreutils`).
- Les dates sont converties et stockées en **UTC** dans le `.ics` ; ton agenda les réaffiche dans ta
  zone locale.
- Fuseau : si tu veux figer un fuseau explicite (TZID) plutôt que l'UTC, on pourra enrichir le `.ics`.
- Pour **modifier/supprimer** un événement il faudrait stocker l'UID renvoyé — non géré pour
  l'instant (ajout seulement).
