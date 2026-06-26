# Déploiement sur Raspberry Pi

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

## 2. Configuration

```bash
cp .env.example .env
nano .env        # OPENWA_API_KEY, TROT_WEBHOOK_SECRET, ALLOWED_NUMBERS, (OPENWA_LICENSE_KEY)

# Auth Claude (abonnement) — token sk-ant-oat*, pas de facturation API :
zeroclaw auth setup-token --provider anthropic --profile default
```

## 3. Premier lancement (jumelage WhatsApp)

```bash
pm2 start ecosystem.config.js
pm2 logs openwa          # un QR code s'affiche dans les logs
```
Scanne le QR depuis **WhatsApp → Appareils connectés → Connecter un appareil**.
La session est ensuite persistée dans `./data/` (ignorée par git).

## 4. Démarrage automatique au boot

```bash
pm2 save
pm2 startup        # exécute la commande sudo qu'il affiche
```

## Commandes utiles

```bash
pm2 status                 # état des process
pm2 logs                   # logs en direct (les deux)
pm2 logs zeroclaw          # logs du cerveau
pm2 restart openwa         # redémarrer WhatsApp
pm2 restart zeroclaw       # recharger config/skills/SOP
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
| Réponses non désirées | restreins `ALLOWED_NUMBERS` ; passe la SOP en `supervised` |
| Déconnexions WhatsApp | numéro dédié, évite de spammer, garde le Pi en ligne 24/7 |
