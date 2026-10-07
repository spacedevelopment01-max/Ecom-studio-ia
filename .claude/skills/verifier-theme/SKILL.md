---
name: verifier-theme
description: Vérifie le thème Shopify d'E-COM STUDIO IA avant d'envoyer une modification (theme-base/, src/lib/theme/, sections, snippets, CSS, schémas, traductions du thème) : compilation des directions, Theme Check officiel de Shopify comme la CI, captures ordinateur et téléphone, contrôle des débordements. À utiliser après toute modification du thème, ou quand on demande de « vérifier le thème », « tester le thème », « faire des captures du thème ».
---

# Vérifier le thème

Le studio compile un thème Shopify à partir de `theme-base/` (sections, snippets, `assets/theme.css`, `assets/theme.js`,
`locales/`, `i18n/schema.en.json`) et de `src/lib/theme/` (directions, compilation, rendu de l'aperçu).
La CI GitHub (`.github/workflows/ci.yml`) refuse la fusion au moindre échec : vérifier en local avant d'envoyer.

## 1. Types et tests

```bash
npx tsc --noEmit
npx vitest run                      # tout (≈ 1 min 15)
npx vitest run tests/theme.test.ts  # ou seulement les tests concernés
```

## 2. Theme Check de Shopify (comme la CI)

```bash
scripts/verify-theme.sh --rapide   # ≈ 1 min 30 : 3 directions (FR, EN, multi, niche, services FR/EN) + ZIP client
scripts/verify-theme.sh            # complet, ≈ 6 min : les 11 directions, exactement les cas de la CI
```

- Le mode rapide suffit pendant le travail ; lancer le mode complet avant d'envoyer une modification de `theme-base/`.
- Un cas précis : `[LANG_THEME=en] [BUSINESS=services] npx tsx scripts/theme-check.ts <dossier> <direction> [mono|multi|niche]`.
- Erreurs fréquentes :
  - un snippet qui lit une variable non transmise : passer explicitement les données (ex. `blocks: section.blocks`) ;
  - libellé de schéma ajouté sans traduction : `tests/theme-en.test.ts` échoue. Ajouter la traduction dans
    `theme-base/i18n/schema.en.json`, y compris les textes par défaut (`default`) des réglages ;
  - clé `| t` absente : l'ajouter dans `theme-base/locales/fr.default.json` **et** `en.default.json`.

## 3. Captures et débordements

```bash
npx tsx scripts/theme-screens.ts <dossier> [direction] [mono|multi|niche|services] [fr|en]
# réglages à essayer : HEADER='{"mega_menu":"cards","mobile_menu":"sheet"}' FOOTER='{"style":"split"}'
```

- Produit : accueil, fiche produit, pied de page, menu ouvert au survol (ordinateur) et menu burger (téléphone).
- Échoue (✗) si une page déborde en largeur sur ordinateur (1440 px) ou téléphone (390 px).
- Regarder les images (outil Read) : les photos apparaissent vides, c'est normal (fichiers de test vides).
- Directions : atelier, clinique, brut, terroir, nocturne, pop, galerie, elan, flux, joaillerie, gourmand.

## 4. Avant d'envoyer

- Ajouter ou mettre à jour un test dans `tests/` pour le comportement modifié (rendu via `renderPage`, voir
  `tests/menus-entete.test.ts`).
- Résumer au propriétaire, en français simple, ce qui a été vérifié et ce qui ne l'a pas été.
