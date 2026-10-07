# E-COM STUDIO IA — consignes pour Claude

Studio qui crée la marque, la boutique Shopify (ou le site d'une entreprise de services), les visuels, vidéos,
publications et publicités d'un projet. Next.js 15 (App Router) + worker de tâches de fond + SQLite. Voir `README.md`.

## Avec le propriétaire

- **Répondre en français simple** : il n'est pas développeur. Expliquer ce qui change pour lui, pas le code.
- **Ne jamais demander ni accepter de clé d'API dans la conversation.** Les clés se saisissent dans
  Administration › Fournisseurs IA (chiffrées) ou dans les secrets Codespaces / de l'hébergeur.
- **Honnêteté** : ne rien inventer (avis, chiffres, délais, certifications, résultats). Un manque se signale par
  « [À compléter : …] ». Dire clairement ce qui a été vérifié et ce qui ne l'a pas été.
- **Fusion (PR + merge) uniquement quand il le demande** (« fusionne », « oui » à « Je fusionne ? »).
  Après une modification terminée, demander « Je fusionne ? ».
- Dépôt GitHub : `spacedevelopment01-max/Ecom-studio-ia` (avec cette casse exacte pour les appels d'API GitHub).

## Règles du produit (ne pas casser)

- **Forfait Découverte = 0 € d'IA** : tout passe par le moteur local (`src/lib/engine/local*.ts`), aucun appel payant.
- **Le compte administrateur suit son forfait comme un client** (pas de passe-droit) : le propriétaire teste en
  gratuit puis en payant. Accès à l'IA : `aiActiveFor(userId)` (`src/lib/ai/access.ts`) ; le bouton « Désactiver »
  d'un fournisseur coupe vraiment ses appels.
- **Moteur local d'abord** : une retouche simple et sûre est faite sans IA même quand l'IA est active
  (`src/lib/engine/local-first.ts`) ; l'IA garde les demandes composées, créatives ou ambiguës.
- **Bilingue FR/EN** : interface et contenus. Les textes FR/EN passent par `L("fr", "en")` / `C(...)`
  (`src/lib/i18n-server.ts`) ; dans le thème, tout libellé de schéma a sa traduction dans
  `theme-base/i18n/schema.en.json` et toute clé `| t` existe dans `locales/fr.default.json` **et** `en.default.json`.
- Les coordonnées saisies à la création d'un projet ne doivent jamais être redemandées ni effacées.

## Avant chaque envoi (commit + push)

```bash
npx tsc --noEmit
npx vitest run
```

- Modification du thème (`theme-base/`, `src/lib/theme/`) : utiliser le skill **verifier-theme**
  (`scripts/verify-theme.sh`, `scripts/theme-screens.ts`) — la CI refuse la fusion au moindre échec de Theme Check.
- Ajouter un test dans `tests/` pour tout comportement modifié.
- Messages de commit en français. Ne mettre aucun identifiant de modèle d'IA dans les commits, PR ou fichiers.

## Repères dans le code

- `src/app` — pages, studio (`src/app/studio/[projectId]`), API (`src/app/api`) ; `src/components/studio/tab-*.tsx` — onglets.
- `worker/handlers.ts` — tâches de fond (création, retouches de la boutique `shop.chat`, publications…).
- `src/lib/theme` — moteur de thème : `directions.ts` (11 directions), `compile.ts`, `render.ts` (aperçu Liquid),
  `ops.ts` (opérations de retouche validées), `preview-tools.ts` (sélection d'un élément dans l'aperçu).
- `theme-base/` — sections, snippets, `assets/theme.css`, `assets/theme.js` du thème Shopify.
- `src/lib/engine` — pipeline et moteur local ; `src/lib/ai` — fournisseurs, prompts, tâches IA.
- Tutoriels vidéo : textes dans `src/lib/tutorials/`, vidéos dans `public/tutorials/`, voix off par
  `scripts/narrate-tutorials.ts` (voix Kokoro, voir l'en-tête du script ; le tutoriel « publicites » a pour fichier
  `campagnes`).
