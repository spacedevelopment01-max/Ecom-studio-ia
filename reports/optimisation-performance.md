# Optimisation des performances — mesures avant / après

Mesures faites dans ce conteneur (16 Go, processeurs partagés), en **production** (`next build` puis `next start`),
sur deux constructions comparables :

- **avant** : commit `105377c` (corrections de stabilité et de sécurité, sans les optimisations) ;
- **après** : commit `9b4cf8e` (optimisations + règle de présence humaine).

Même machine, même méthode, scripts conservés (`scripts/perf/bundle-size.mjs`, `scripts/perf/boot-rss.sh`). Les chiffres d'un
Codespace de 8 Go seront différents en valeur absolue ; l'écart, lui, est comparable.

## Résultats

| Mesure | Avant | Après | Écart |
|---|---|---|---|
| JS chargé à l'ouverture d'un onglet du studio (`/studio/[projet]/[onglet]`) | 568 Ko / **173 Ko compressés** | 486 Ko / **149 Ko compressés** | **−14 %** |
| JS chargé sur la liste des projets (`/studio`) | 569 Ko / 174 Ko gz | 487 Ko / 150 Ko gz | −14 % |
| JS chargé dans l'administration (`/admin`) | 528 Ko / 154 Ko gz | 449 Ko / 134 Ko gz | −13 % |
| JS de la page d'accueil (`/`) | 486 Ko / 143 Ko gz | 486 Ko / 143 Ko gz | inchangé (page d'accueil conservée telle quelle) |
| Total du JS du client (tous morceaux, chargés à la demande compris) | 2 437 Ko / 778 Ko gz | 2 363 Ko / 765 Ko gz | −2 % (rien n'est retiré : les éditeurs sont seulement chargés plus tard) |
| **Mémoire du site au démarrage** (1 page servie) | **363 Mo** (mesuré 2 fois : 360 et 363) | **195 Mo** | **−46 %** |
| Mémoire du site après 55 requêtes variées | 393 Mo | 284 Mo | −28 % |
| Page d'accueil (20 requêtes successives) | 86–88 ms | 85 ms | inchangé |
| Requêtes de rafraîchissement, studio au repos (onglet Pilote) | ~40 / min (projet 3,5 s + parcours 3 s + cloche + budget) | ~11 / min (projet 15 s + parcours 20 s + cloche + budget) | **−70 % environ** (calcul à partir des intervalles du code) |
| Requêtes de rafraîchissement, onglet Marque au repos | ~44 / min | ~5 / min (logos : seulement pendant une tâche) | −88 % environ |
| Lectures du budget à l'ouverture de l'onglet Images | 5 requêtes identiques | 1 (lecture partagée 1,5 s) | −4 requêtes |
| Rafraîchissement du Pilote : lectures du projet par tour | 1 + 1 par parcours (jusqu'à 6) | 1 | jusqu'à −5 |

Pendant une tâche, les rythmes rapides sont conservés (3,5 s pour le projet, 3 s pour le Pilote, 5 s pour les
logos) : l'avancement s'affiche aussi vite qu'avant.

## Ce qui a été changé (aucune fonctionnalité retirée)

1. **Mémoire au démarrage** : `experimental.preloadEntriesOnStart: false` (`next.config.ts`). Avant, Next chargeait au
   démarrage TOUTES les routes, donc sharp, canvas, Playwright et le contrôle des thèmes, avant la moindre requête.
   Contrepartie mesurable : la première visite de chaque route charge son code (quelques dizaines de ms sur ce
   serveur ; la page d'accueil reste à 85 ms en moyenne).
2. **Rafraîchissements adaptés** (`project-context.tsx`, `workflow-panel.tsx`, `logo-v2-panel.tsx`,
   `full-logo-panel.tsx`, `tab-calendrier.tsx`, `tab-publications.tsx`) et **rafraîchissement immédiat au retour sur
   l'onglet** (`src/lib/poll.ts`).
3. **Lectures identiques partagées** (`useApi`, `src/components/ui.tsx`) ; un rechargement demandé après une action lit
   toujours une donnée fraîche.
4. **Chargement à la demande** (`next/dynamic`) : éditeur publicitaire à calques, import de thème, bibliothèque de
   sections, galerie des directions, onglets Comptabilité / Images & Vidéos de l'administration.
5. **zod retiré du code du navigateur** : schémas des faits et questions déplacés dans `src/lib/project-schemas.ts`
   (serveur) ; `project-types.ts` ne contient plus que des types.
6. **Index SQLite** (`src/lib/db.ts`, sans modification de données) : `notifications(user_id, created_at)`,
   `assets(project_id, role, created_at)`, `assets(source_asset_id)`, `ai_reservations(job_id, status)`.
7. **Pilote** : `workflowView(wid, projet)` réutilise le projet déjà chargé.
8. **Choix d'un logo** : tâche courte servie avant les longues tâches en file (`QUICK_JOBS`, `src/lib/jobs.ts`),
   tracés vectoriels faits APRÈS la mise à jour de la marque et de la boutique.

## Non fait (gain faible ou risque supérieur au gain)

- **Page d'accueil `force-dynamic`** (saturation vers 16 requêtes/s sur ce serveur) : non touchée, conformément à la
  consigne de conserver l'accueil tel quel.
- **sanitize-html dans l'onglet Blog** (≈ 69 Ko compressés, chargé seulement dans cet onglet) : le déplacer côté
  serveur demande une modification de l'éditeur ; à faire dans une passe dédiée avec un test de nettoyage.
- **Calculs lourds du worker sur le fil principal** (tracé vectoriel ≈ 0,6 s, charte PDF ≈ 0,7 s) : ils ne bloquent
  jamais le bail des tâches (renouvelé toutes les 30 s) ; un « worker thread » ajouterait une complexité non justifiée
  aujourd'hui.
- **Route `/api/projects/[id]`** (248 modules importés) : le coût d'import n'est payé qu'une fois par processus ; avec
  le point 1, il n'est plus payé au démarrage. Pas de refonte.

## Mode développement / production

Le mode développement (`npm run dev`) compile les routes à la volée : 2,5 Go de mémoire après 5 onglets (mesure de
la phase précédente) et des recompilations. Ces lenteurs ne concernent pas la production. Le Codespace lance
désormais `npm run studio` (production) à chaque connexion.

## Reproduire les mesures

```bash
npx next build
node scripts/perf/bundle-size.mjs .        # JS par route (union des morceaux de la page et de ses mises en page)
scripts/perf/boot-rss.sh . 3022            # mémoire au démarrage puis après 55 requêtes, temps de la page d'accueil
```
