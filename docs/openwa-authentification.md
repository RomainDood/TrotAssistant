# S'identifier avec OpenWA

OpenWA ne se connecte **pas** via une API officielle : il pilote **WhatsApp Web** dans un Chromium
headless. S'identifier revient donc à **lier un appareil compagnon**, exactement comme quand tu
ouvres WhatsApp Web sur un ordinateur.

> ⚠️ Utilise un **numéro WhatsApp dédié**. L'automatisation peut entraîner une suspension du compte.

## Ce dont tu as besoin

- Le téléphone avec WhatsApp **installé et connecté à Internet** (il reste le « maître »).
- TrotAssistant lancé (`./scripts/start-openwa.sh` ou `pm2 start ecosystem.config.js`).

## Méthode 1 — QR code (par défaut)

1. Lance OpenWA et regarde les logs :
   ```bash
   ./scripts/start-openwa.sh          # ou : pm2 logs openwa
   ```
2. Un **QR code** s'affiche dans le terminal (en ASCII).
3. Sur le téléphone : **WhatsApp → Réglages → Appareils connectés → Connecter un appareil**.
4. Scanne le QR. ✅ La session est créée et **sauvegardée sur disque** (dossier `./data/`).

Aux lancements suivants, **plus de QR** : OpenWA recharge la session sauvegardée.

## Méthode 2 — Link code (sans scanner d'image)

Pratique sur un serveur/Raspberry sans écran, ou quand le QR ASCII passe mal dans les logs.
OpenWA affiche un **code à 8 caractères** à saisir sur le téléphone.

1. Active le link code dans `openwa/cli-config.json` :
   ```json
   { "linkCode": "33612345678" }
   ```
   (mets **ton numéro** au format international, sans `+`).
2. Relance OpenWA. Un code type `ABCD-1234` apparaît dans les logs.
3. Sur le téléphone : **Appareils connectés → Connecter un appareil → Lier avec un numéro de téléphone**, puis saisis le code.

## Où est stockée la session (et pourquoi c'est sensible)

- La session est persistée dans **`./data/`** (paramètre `sessionDataPath` de `openwa/cli-config.json`).
- Ce dossier **= ton accès WhatsApp**. Il est volontairement dans `.gitignore` :
  **ne le committe jamais, ne le partage jamais.**
- Pour repartir de zéro (re-scanner un QR), il suffit de supprimer le contenu de `./data/` puis de
  relancer :
  ```bash
  rm -rf ./data/*        # déconnecte la session locale
  ./scripts/start-openwa.sh
  ```

## Rester connecté dans la durée

- Le **téléphone doit se reconnecter à Internet de temps en temps** (comme WhatsApp Web classique),
  sinon WhatsApp finit par déconnecter l'appareil lié.
- Garde le Raspberry **allumé 24/7** ; `pm2` relance OpenWA automatiquement en cas de crash, et au
  reboot si tu as fait `pm2 save && pm2 startup`.
- Si tu vois revenir un QR alors que tu étais connecté → la session a expiré (téléphone hors ligne
  trop longtemps, ou appareil déconnecté côté téléphone) : il suffit de re-scanner.

## Vérifier que c'est bien connecté

Une fois identifié, l'API REST locale répond. Test rapide (remplace la clé) :

```bash
curl -s -X POST http://127.0.0.1:8002/getConnectionState \
  -H "api_key: $OPENWA_API_KEY" | cat
# Attendu : un état type "CONNECTED"
```

La documentation interactive de l'API est aussi dispo sur `http://127.0.0.1:8002/api-docs/`.

## Dépannage identification

| Symptôme | Piste |
|----------|-------|
| Aucun QR dans les logs | Chromium absent/cassé : `chromium --version` ; relance `./scripts/install-pi.sh` |
| QR illisible dans le terminal | utilise le **link code** (méthode 2) |
| « Déconnecté » en boucle | téléphone hors ligne trop souvent ; numéro peut-être limité par WhatsApp |
| Re-demande un QR à chaque lancement | `./data/` non persistant (droits/volume) ou supprimé |
| Session volée / doute | supprime `./data/*`, change d'appareil lié, re-scanne |
