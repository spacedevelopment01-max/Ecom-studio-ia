# PHASE 3A — INTENT / PLANNER / ROUTER V2 REPORT

Date : 2026-10-07 · Branche : `claude/ecom-studio-ia-platform-8cwl79` · Base : `main` = `72a18a3` (fusion de la
PR #53, phase 2C, CI 2/2 verte → **PHASE 2 TERMINÉE**). Aucun appel payant : tous les tests de la 3A sont simulés.

## ARCHITECTURE

```
DEMANDE (bouton / tâche de fond / texte libre)
  ↓ intent.ts        understand() : action connue → sans IA ; texte → règles ; ambigu → IA (si active) ou question
INTENTIONS (combinables)
  ↓ planner.ts       buildPlan() : étapes, dépendances dures / d'ordre, scope du Brain, objectif, coût, statut
PLAN (task_plans, enregistré à chaque étape)
  ↓ readySteps()     étapes prêtes
ÉTAPE
  ↓ router.ts        route() : local / recherche / IA texte / image / vidéo · fournisseur · modèle · raison
EXÉCUTION            exécuteur injecté (branché sur les moteurs en 3B) ; appels tracés intention / plan / étape
  ↓
RÉSULTAT CONTRÔLÉ    verdict de la barrière de qualité existante (FINAL / RETRY / PROVISIONAL / REJECTED)
  ↓ nextAction() + applyResult()
CONTINUER / CORRIGER / ABANDONNER / SAUTER / ARRÊTER / REPLAN
```

Nouveau dossier `src/lib/orchestrator/` : `intent.ts`, `planner.ts`, `router.ts`, `policy.ts`, `capabilities.ts`,
`index.ts` (`projectState`, `stepContext`, `planRequest`). Aucun moteur créatif n'a été modifié (logo, image,
publicité, vidéo, thème : inchangés).

Branché dès la 3A (sans changer le comportement par défaut) :
- **tous les appels d'IA texte** passent par le Router V2 (`routeLlm` dans `llm.ts`, à la place de `routeFor`) ;
- **chaque tâche de fond** porte son intention, déduite sans IA de son type (`worker/index.ts`) ;
- `DEFAULT_ROUTES` (config) est désormais **dérivé de la politique centrale** : un seul endroit.

## INTENT ENGINE

- 17 intentions : ANALYZE_PRODUCT, CREATE_BRAND, CREATE_LOGO, IMPROVE_LOGO, FIND_STOCK_IMAGE, GENERATE_IMAGE,
  WRITE_PRODUCT_COPY, SEO, BLOG, SOCIAL, CREATE_AD, CREATE_VIDEO, CREATE_SHOP, CREATE_THEME, EDIT_THEME,
  ORGANIZE_FILES, PUBLISH. Combinables et remises dans l'ordre de travail (marque avant boutique…).
- **Déterministe d'abord** :
  1. action connue (31 actions : tâches de fond, boutons, routes : `brand.fulllogo` → CREATE_LOGO,
     `blog.generate` → BLOG, `pipeline.run` → ANALYZE_PRODUCT + CREATE_BRAND + CREATE_SHOP…) → **aucun appel à
     l'IA** ;
  2. texte libre → règles FR/EN sans accents (« Crée ma marque et ma boutique » → CREATE_BRAND + CREATE_SHOP ;
     « Améliore mon logo » → IMPROVE_LOGO ; « photo libre de droits » → FIND_STOCK_IMAGE, pas de génération) ;
  3. demande ambiguë → classement par l'IA (niveau léger, sortie validée par schéma, intention inconnue refusée),
     **seulement si l'IA est active pour le compte** ; sinon (forfait Découverte) une question de clarification,
     jamais d'appel.
- Une sortie d'IA non conforme ne fait rien deviner : question posée.

## TASK PLANNER

- Étape : `id`, `kind`, `task`, `dependencies` (dures), `after` (ordre seulement), `input`, `requiredContext`
  (scope du Brain), `deliverable`, `qualityTarget` (seuil FINAL de la politique de qualité), `costClass`
  (free / low / medium / high), `status` (pending / done / skipped / rejected / failed), `explicit`, `attempts`,
  `providerFailures`, `reason`, `route`, `result`.
- Exemple « Crée ma marque et ma boutique » : understand → brand_strategy → logo → mockups → stock_search →
  image_generate → copy → theme → quality_review. Les visuels passent **toujours** d'abord par la recherche de
  photos libres (0 €).
- Dépendances : **dures** (maquettes ← logo, SEO ← textes, thème ← textes) — leur rejet arrête l'étape ; **d'ordre**
  (image IA après photos libres, thème après logo et visuels) — l'étape attend puis continue quel que soit le
  résultat (le thème peut utiliser un logo provisoire).
- Pas d'exécution coûteuse inutile : déjà analysé, marque existante, logo verrouillé, textes déjà FINAL → étapes
  **sautées** avec la raison (sauf si le client les demande explicitement) ; relecture finale seulement quand
  plusieurs contenus sont produits.
- Plan déterministe : même projet + même clé de demande → même identifiant.

## ROUTER V2

Entrées : tâche, étape, difficulté (simple / standard / complexe), type d'entrée (texte, image, mixte, masque,
vidéo), livrable et objectif de qualité, historique (tentative, note, verdict, fournisseur et modèle précédents,
cause d'échec), IA active ou non, fournisseurs disponibles, routes de l'administration.

Sorties : mode (local, search, llm, image, video, none), fournisseur, modèle, effort, niveau, **raison
synthétique**, repli, escalade, objectif de qualité.

`nextAction()` décide de la suite d'un résultat contrôlé (voir QUALITY AWARE ROUTING).

## PROVIDER CAPABILITIES

`capabilities.ts` : capacités `text`, `vision`, `structured_output`, `long_context`, `image_generation`,
`image_edit` (masque autour du produit réel), `video_generation`, `stock_search`, `deterministic` ; niveaux
`local`, `light`, `standard`, `strong`. Registre des modèles : moteur local, Claude Haiku 4.5 (light), Sonnet 5.5
(standard), Opus 5.5 (strong), gpt-image-1 (image + édition), Gemini image, Veo 3 / Veo 3 fast, Kling (fal),
Pexels / Pixabay. La logique métier demande une capacité et un niveau, jamais un nom de modèle.

## ROUTING POLICIES

`policy.ts` : une politique par tâche (capacités, niveau de départ, effort, escalade permise, local si simple,
raison). **Seul endroit** qui fixe le modèle d'une tâche ; `DEFAULT_ROUTES` en est dérivé ; réglable sans toucher
aux moteurs par le réglage d'administration `ai.policy` (fusionné par tâche) ; la route fixée par
l'administration (`ai.routes`) reste prioritaire. Valeurs par défaut **identiques au routage d'avant** (testé
tâche par tâche).

| Tâche | Niveau | Escalade | Local si simple |
|---|---|---|---|
| strategy, logo_symbol, theme_design/edit/custom, vision_analysis, social_planning, video_direction, art_direction, ad_creative | fort | — | theme_edit |
| copywriting, blog_writing, blog_topics, social_copy, quality_control | standard | → fort | — |
| cutout_check | standard | — | — |
| photo_triage, classification | léger | → standard | classification |
| image_generation, video_generation | fort (média) | repli capable | — |

## QUALITY AWARE ROUTING

S'appuie sur la barrière de qualité existante (`quality/policies.ts`, aucun seuil dupliqué) :
- FINAL → arrêt, **aucune reprise** ;
- PROVISIONAL → arrêt (utilisable comme remplaçant, aucune reprise payante) ;
- REJECTED (note sous le plancher) ou défaut fatal → **abandon de la direction**, arrêt de ce qui en dépend
  (« score 3 below floor 6.5: abandon direction ») ;
- RETRY avec reprises restantes → **correction ciblée** (« previous attempt 7.8, targeted correction ») ;
- reprises épuisées → meilleure version gardée, signalée.
- Une étape qui a échoué en qualité ne redescend jamais à un niveau plus faible à la reprise (défaut trouvé par les
  tests et corrigé).

## COST AWARE ROUTING

- Le niveau vient de la qualité attendue, **jamais du prix**. Le coût observé (`ai_calls`, 90 jours, coût moyen
  par modèle et par tâche : `observedCost`) ne sert qu'à départager des modèles de même niveau lors d'un repli.
  Testé : un historique où le léger paraît bien moins cher ne fait pas descendre la création de logo.
- Préparé pour plus tard : `ai_calls` porte maintenant intention, plan, étape, raison, repli, escalade, et
  `quality_checks.previous_check_id` donne le gain de qualité d'une reprise → base pour mesurer « gain de qualité
  par euro ». Aucun apprentissage automatique construit.

## FALLBACKS

- Fournisseur indisponible ou en panne → un autre fournisseur **capable**, même niveau ou plus fort d'abord ;
  **l'objectif de qualité ne change pas** et le résultat repasse la barrière normale (testé : le repli Gemini rendu
  REJECTED est refusé, pas accepté).
- Aucun fournisseur capable (ex. retouche par masque sans OpenAI) → mode `none` : l'étape n'est pas faite, jamais
  remplacée par un rendu dégradé.
- Panne : rien n'est accepté ; nouvelle tentative par le repli ; deux pannes → étape en échec, dépendances arrêtées.
- Le repli serveur d'Anthropic (déjà en place) reste actif sur chaque appel.

## ESCALATION

- Échec de **qualité** (RETRY) ou de **format** au niveau précédent → un cran au-dessus, jusqu'au maximum permis
  par la politique (« previous attempt 7.2 below target 8 at standard tier, escalate to strong »).
- **Pas d'essai faible inutile** : une demande `complexe` d'une tâche escaladable part directement au niveau fort ;
  les tâches créatives et stratégiques partent déjà au niveau fort.
- Les tâches sans escalade (logo, stratégie…) font une correction ciblée au même niveau.
- Dans `llm.ts`, l'escalade s'active seulement quand l'appel fournit son historique (`routing`) ; les moteurs ne le
  font pas encore (3B).

## PROJECT BRAIN INTEGRATION

- Chaque étape porte le scope du Brain de son moteur (logo → `logo`, photos libres → `stock`, image → `image`,
  textes → `shop_copy`, SEO → `seo`, thème → `theme`, blog, social, publicité → `advertising`, vidéo, relecture →
  `qc`, stratégie → `brand`) : testé contre la table `ENGINE_SCOPES` de la 2C.
- `stepContext()` renvoie `brainContext(p, scope)` : le planner et le routeur ne construisent aucun contexte.
- `projectState()` lit le projet, le Brain (métier générique), les verrous de marque et le dernier verdict des
  textes, sans aucun appel.

## OBSERVABILITY

- `ai_calls` : nouvelles colonnes `intent`, `plan_id`, `step_id`, `routing_reason`, `routing_fallback`,
  `routing_escalation` (fournisseur et modèle : colonnes `provider` / `requested_model` déjà présentes).
- Raisons **synthétiques uniquement** (« complex creative direction », « deterministic local task », « previous
  attempt 7.6, targeted correction », « fallback: openai unavailable → google:… (same quality gate) »), jamais de
  raisonnement détaillé ; aucun prompt, contenu ni secret dans `ai_calls` ou `task_plans`.
- Nouvelle table `task_plans` : intentions, étapes, statuts, routage, raisons, avertissements.
- Diagnostic IA : tableaux « Par intention » et « Routage : défaut, repli, escalade ».

## TESTS

**720 / 720** (88 fichiers, 0 ignoré). Nouveau : `tests/orchestrateur-3a.test.ts` (17 tests, IA simulée) :

| Exigence | Test |
|---|---|
| action déterministe → aucun appel IA | 9 actions, classeur jamais appelé, aucune requête |
| demande libre claire → règles, intentions combinées | marque + boutique, logo, photo libre, blog + Instagram |
| demande ambiguë → classement structuré | classeur simulé + classeur réel (fournisseur simulé, schéma, sortie non conforme refusée) ; Découverte → question |
| plan avec dépendances | marque + boutique : 9 étapes, dépendances dures / d'ordre, champs obligatoires |
| étape inutile → skipped | analysé, logo verrouillé, textes FINAL ; demande explicite jamais sautée |
| photo libre FINAL → pas d'image IA | et photo libre rejetée → génération |
| FINAL → pas de reprise | logo 8,6 : une seule exécution |
| REJECTED faible → abandon | logo 3 : abandon, maquettes sautées, thème continue ; défaut fatal |
| RETRY corrigeable → correction | logo 7,8 → correction ciblée (même modèle fort) ; textes → escalade standard → fort ; reprises épuisées |
| fournisseur indisponible → repli, même barrière | repli Gemini, objectif inchangé, résultat REJECTED refusé ; masque sans OpenAI → none ; deux pannes → échec |
| tâche simple → modèle approprié | classement → léger ou local ; contrôle → standard |
| tâche créative complexe → modèle fort | logo, stratégie → fort ; textes complexes → fort d'emblée |
| aucun cheap-first aveugle | 20 tâches = routage d'avant ; coût observé plus bas ignoré |
| Brain scope correct | étapes = ENGINE_SCOPES ; contexte = vue du Brain |
| trace intent / plan / routing | ligne `ai_calls` complète ; escalade tracée ; plan sans contenu |
| reprise idempotente | interruption puis reprise : aucune étape refaite |
| politique réglable / route admin | `ai.policy`, `ai.routes` |
| limitation produit visible | avertissement « GENERIC trade fallback » sur le plan des visuels |

## TYPESCRIPT

`npx tsc --noEmit` : **OK**.

## BUILD

`npm run build` : **OK**. Thème non modifié (Theme Check non concerné).

## BEHAVIOR CHANGES

- Pour le client : **aucun changement visible** ; mêmes modèles, mêmes efforts qu'avant pour chaque tâche (testé).
- Chaque appel d'IA texte est choisi par le Router V2 et tracé avec sa raison ; chaque tâche de fond porte son
  intention.
- `DEFAULT_ROUTES` vient de la politique centrale ; nouveau réglage d'administration `ai.policy` (aucune interface
  ajoutée : réglage JSON).
- Nouvelle table `task_plans` et 6 colonnes `ai_calls` (ajout seulement, migration automatique).

## KNOWN LIMITATIONS

1. **Non branché sur les moteurs** (prévu en 3B) : aucun parcours du studio ne s'exécute encore par un plan ; les
   moteurs ne transmettent pas encore leur historique au routeur (pas d'escalade en production) ; les tâches de
   fond ne fournissent que leur intention.
2. Les générations d'images et de vidéos choisissent encore leur fournisseur dans `media-providers.ts` : le routage
   média et son repli sont prêts et testés dans le routeur, pas encore branchés.
3. Règles d'intention FR/EN volontairement courtes : une formulation inhabituelle passe par le classement IA (si
   active) ou une question.
4. Coût : départage seulement ; aucune mesure « gain de qualité par euro » calculée automatiquement.
5. **Catégories produit : repli générique du registre des métiers toujours présent.** Il pèse sur la recherche de
   photos libres et les scènes des images d'un produit ; le plan l'affiche en avertissement, il n'est pas résolu.
6. `pipeline.run` donne CREATE_BRAND (explicite) : sur un projet qui a déjà une marque, le plan referait la
   stratégie ; à arbitrer au branchement (3B).

## READY FOR 3B

Oui : intention, plan dynamique, routeur, politique, capacités, repli, escalade et trace sont en place et testés.
3B : brancher les exécuteurs réels (parcours création, logo, visuels, textes, thème…), transmettre l'historique de
qualité au routeur, router les médias, puis benchmarks déterministes et validation finale. Phase 3B : **non
commencée**.
