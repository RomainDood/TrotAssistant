# Skills TrotAssistant

Un *skill* = une réponse standardisée à un type de message récurrent. La SOP
[`whatsapp-reply`](../sops/whatsapp-reply/) choisit le skill le plus pertinent puis envoie la
réponse via OpenWA.

## Anatomie d'un skill

Chaque skill est un dossier avec un `SKILL.md` :

```
skills/
  faq-horaires/
    SKILL.md
```

Le `SKILL.md` décrit **quand** déclencher le skill et **quoi** répondre. Voir
[`faq-horaires/SKILL.md`](faq-horaires/SKILL.md) comme modèle.

## Ajouter un skill

1. Crée `skills/<mon-skill>/SKILL.md`.
2. Renseigne : déclencheurs (mots-clés / intentions), la réponse type, le ton, les éventuelles
   variables à remplir.
3. Redémarre zeroclaw (ou recharge les skills) — `pm2 restart zeroclaw`.

## Bonnes pratiques

- **Réponses courtes et naturelles** — on veut faire gagner du temps, pas faire « robot ».
- **Échouer prudemment** — si le message ne colle à aucun skill, mieux vaut **ne pas répondre**
  et laisser l'humain gérer (configurable dans la SOP).
- **Tester sur un numéro autorisé** avant d'ouvrir à tous (`ALLOWED_NUMBERS`).
