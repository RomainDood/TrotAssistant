# Déploiement sur Raspberry Pi — guide complet

Guide « de zéro à tout fonctionnel ». Les étapes **1 à 4 sont obligatoires** (assistant WhatsApp).
Les étapes **5 et 6 sont optionnelles** (commandes Siri, agenda autonome).

## Checklist rapide

- [ ] **1.** Matériel + OS prêts
- [ ] **2.** Installation (`install-pi.sh`)
- [ ] **3.** Configuration (`.env`, auth Claude, données)
- [ ] **4.** Lancement + jumelage WhatsApp (QR) + autostart
- [ ] **5.** *(option)* Accès distant pour Siri (Tailscale + jeton)
- [ ] **6.** *(option)* Agenda autonome (CalDAV)
- [ ] **7.** Vérifier la chaîne complète

---

## Matériel recommandé

- **Raspberry Pi 4 (4 Go) ou Pi 5** — Chromium headless est gourmand.
  Un Pi 4 2 Go fonctionne mais reste juste ; un Pi Zero / Pi 3 n'est **pas** conseillé.
- Carte microSD rapide (A2) ou SSD USB, + alimentation officielle.
- Raspberry Pi OS 64-bit (Bookworm).

## 1. Installation

```bash
git clone https://github.com/RomainDood/TrotAssistant.git
cd TrotAssistant
./scripts/install-pi.sh        # node 20, chromium, deps, zeroclaw, pm2
```

> 💡 **Raccourcis `mise` (optionnel)** : installe `mise` (`curl https://mise.run | sh`, ~25 Mo) puis
> `mise trust`. Chaque étape de ce guide a alors un équivalent court : `mise run setup`, `auth`,
> `data`, `start`, `qr`, `boot`, `health`, `pair`… (`mise tasks` pour la liste). Le `.env` est chargé
> automatiquement. Place négligeable sur le Pi (le gros poste reste Chromium).

## 2. Configuration

```bash
cp .env.example .env
nano .env        # OPENWA_API_KEY, TROT_WEBHOOK_SECRET, ALLOWED_NUMBERS, (OPENWA_LICENSE_KEY)

# Auth Claude (abonnement) — token sk-ant-oat*, pas de facturation API :
zeroclaw auth setup-token --provider anthropic --profile default
```

### Données de l'assistant (contacts + partenaires)

Copie les fichiers d'exemple et remplis-les (les fichiers réels sont gitignorés) :

```bash
cp zeroclaw/data/contacts.example.json  zeroclaw/data/contacts.json
cp zeroclaw/data/partners.example.json  zeroclaw/data/partners.json
nano zeroclaw/data/contacts.json        # noms -> numéros WhatsApp
nano zeroclaw/data/partners.json        # partenaires (véto, etc.)
```

> Ces données servent aux skills (envoyer un message « à Paul », donner les horaires d'un partenaire).
> Optionnel si tu n'utilises pas ces commandes.

## 3. Premier lancement (jumelage WhatsApp)

```bash
pm2 start ecosystem.config.js
pm2 logs openwa          # un QR code s'affiche dans les logs
```
Scanne le QR depuis **WhatsApp → Réglages → Appareils connectés → Connecter un appareil**.
La session est ensuite persistée dans `./data/` (ignorée par git).
Détails et méthode « link code » : [openwa-authentification.md](openwa-authentification.md).

## 4. Démarrage automatique au boot

```bash
pm2 save
pm2 startup        # exécute la commande sudo qu'il affiche
```

---

## 5. (Option) Piloter avec Siri — accès distant

Pour envoyer des commandes depuis l'iPhone, la gateway zeroclaw doit être **joignable** par le
téléphone, et **protégée**.

1. **Tailscale** (VPN privé, recommandé) — installe-le sur le Pi et l'iPhone (même compte) :
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   tailscale ip -4          # note l'IP (ou le nom de machine)
   ```
2. **Faire écouter la gateway sur l'interface** — dans `zeroclaw/config.toml` :
   ```toml
   [gateway]
   host = "0.0.0.0"
   port = 42617
   require_pairing = true   # garde l'auth par jeton
   ```
   puis `pm2 restart zeroclaw`.
3. **Obtenir le jeton bearer** (à coller dans le raccourci) :
   ```bash
   zeroclaw status                                   # affiche le code de pairing
   curl -X POST http://127.0.0.1:42617/pair -H "X-Pairing-Code: <code>"
   # -> { "token": "zcl_live_..." }
   ```
4. **Construire le raccourci iPhone** : [siri-shortcuts.md](siri-shortcuts.md).

## 5bis. (Option) Gmail — lire / envoyer des mails

Connecteur MCP (Node via `npx`, rien à installer). Renseigne `GMAIL_USER` / `GMAIL_APP_PASSWORD`
dans `.env` (mot de passe d'application), puis `pm2 restart zeroclaw`. Procédure :
[gmail.md](gmail.md).

## 6. (Option) Agenda autonome (CalDAV)

Seulement si tu veux que zeroclaw ajoute des événements **sans l'iPhone** (ex. déclenché par un
WhatsApp). Renseigne `CALDAV_URL` / `CALDAV_USERNAME` / `CALDAV_PASSWORD` dans `.env`, puis
`pm2 restart zeroclaw`. Procédure (iCloud / Google) : [calendrier.md](calendrier.md).

> Pour l'agenda déclenché **par Siri**, rien à faire ici : c'est le raccourci qui crée l'événement
> dans l'app Agenda native (étape 5).

---

## 7. Vérifier que tout marche

```bash
pm2 status                                   # zeroclaw + openwa = "online"

# zeroclaw répond ?
curl -s http://127.0.0.1:42617/ -o /dev/null -w "gateway HTTP %{http_code}\n"

# OpenWA connecté à WhatsApp ?
curl -s -X POST http://127.0.0.1:8002/getConnectionState \
  -H "api_key: $OPENWA_API_KEY" | cat        # attendu : "CONNECTED"
```

**Test de bout en bout** : depuis un **numéro autorisé** (`ALLOWED_NUMBERS`), envoie un WhatsApp qui
correspond à un skill (ex. « vous êtes ouverts demain ? »). Surveille `pm2 logs zeroclaw` : tu dois
voir la SOP se déclencher, puis recevoir la réponse sur WhatsApp.

## Commandes utiles

```bash
pm2 status                 # état des process
pm2 logs                   # logs en direct (les deux)
pm2 logs zeroclaw          # logs du cerveau
pm2 restart openwa         # redémarrer WhatsApp
pm2 restart zeroclaw       # recharger config/skills/SOP/données
pm2 stop all               # tout arrêter
```

## Alternative : systemd (sans pm2)

Si tu préfères systemd, crée deux units `trot-openwa.service` et `trot-zeroclaw.service` pointant
sur les scripts `scripts/start-*.sh` (`Restart=always`, `WorkingDirectory=` = la racine du repo).
zeroclaw sait aussi s'auto-enregistrer en service : `zeroclaw service install`.

## Dépannage

| Symptôme | Piste |
|----------|-------|
| QR ne s'affiche pas | `pm2 logs openwa` ; vérifie que Chromium est installé (`chromium --version`) |
| Chromium plante / OOM | Pi trop juste en RAM ; ajoute du swap ou passe sur un Pi 5 |
| zeroclaw ne reçoit rien | vérifie `ZEROCLAW_WEBHOOK_URL`, le secret, et que la gateway écoute sur `:42617` |
| Pas de réponse envoyée | vérifie `OPENWA_API_URL` + `OPENWA_API_KEY` ; teste `curl` manuel sur `/sendText` |
| Siri : erreur réseau | Pi joignable ? (Tailscale up, `host = "0.0.0.0"`, jeton bearer valide) |
| Siri lit du JSON brut | mauvaise clé dans « Obtenir la valeur du dictionnaire » (cf. siri-shortcuts.md) |
| Agenda CalDAV en erreur | `CALDAV_URL` (collection, finit par `/`) + mot de passe d'app ; cf. calendrier.md |
| Réponses non désirées | restreins `ALLOWED_NUMBERS` ; passe la SOP en `supervised` |
| Déconnexions WhatsApp | numéro dédié, évite de spammer, garde le Pi en ligne 24/7 |
