#!/usr/bin/env bash
# Ajoute un événement dans un calendrier CalDAV (iCloud, Google, Fastmail…) via PUT d'un .ics.
# Utilisé par l'agent zeroclaw (skill "calendar") pour les ajouts AUTONOMES — ex. déclenchés par un
# message WhatsApp ou un cron. Pour les commandes Siri, on préfère renvoyer une action au raccourci
# (cf. skill siri-commands). Pensé pour Linux / Raspberry Pi OS (utilise GNU `date`).
set -euo pipefail

usage() {
  echo "Usage: $0 --title T --start ISO --end ISO [--notes N] [--location L]" >&2
  echo "  ISO ex: 2026-07-02T15:00:00" >&2
  exit 1
}

TITLE=""; START=""; END=""; NOTES=""; LOCATION=""
while [ $# -gt 0 ]; do
  case "$1" in
    --title)    TITLE="$2";    shift 2;;
    --start)    START="$2";    shift 2;;
    --end)      END="$2";      shift 2;;
    --notes)    NOTES="$2";    shift 2;;
    --location) LOCATION="$2"; shift 2;;
    *) usage;;
  esac
done
[ -n "$TITLE" ] && [ -n "$START" ] && [ -n "$END" ] || usage

# Charge .env (CALDAV_*)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$ROOT/.env" ] && { set -a; . "$ROOT/.env"; set +a; }

: "${CALDAV_URL:?Définis CALDAV_URL (URL de la collection calendrier, finit par /). Cf. docs/calendrier.md}"
: "${CALDAV_USERNAME:?Définis CALDAV_USERNAME}"
: "${CALDAV_PASSWORD:?Définis CALDAV_PASSWORD (mot de passe d'application)}"

# ISO local -> format ICS UTC (GNU date, OK sur Raspberry Pi OS)
to_ics() { date -u -d "$1" +%Y%m%dT%H%M%SZ; }
DTSTART="$(to_ics "$START")"
DTEND="$(to_ics "$END")"
DTSTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
UID="$(cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "$(date +%s)-$RANDOM")@trotassistant"

ICS="BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//TrotAssistant//FR\r
BEGIN:VEVENT\r
UID:${UID}\r
DTSTAMP:${DTSTAMP}\r
DTSTART:${DTSTART}\r
DTEND:${DTEND}\r
SUMMARY:${TITLE}\r
DESCRIPTION:${NOTES}\r
LOCATION:${LOCATION}\r
END:VEVENT\r
END:VCALENDAR\r
"

HTTP=$(printf '%b' "$ICS" | curl -sS -o /dev/null -w "%{http_code}" -X PUT \
  "${CALDAV_URL%/}/${UID}.ics" \
  -u "${CALDAV_USERNAME}:${CALDAV_PASSWORD}" \
  -H "Content-Type: text/calendar; charset=utf-8" \
  --data-binary @-)

if [ "$HTTP" = "201" ] || [ "$HTTP" = "204" ]; then
  echo "OK: événement ajouté — ${TITLE} (${START})"
else
  echo "ERREUR CalDAV: HTTP ${HTTP}" >&2
  exit 1
fi
