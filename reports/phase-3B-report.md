# PHASE 3B — FINAL ORCHESTRATOR REPORT

Date : 2026-10-07 · Branche : `claude/ecom-studio-ia-platform-8cwl79`. Aucun appel payant : tous les tests et
benchmarks de la 3B sont simulés (IA, images et vidéos simulées, base temporaire).

## GIT STATE

- Base : `main` = `ce2bc98` (fusion de la PR #54, phase 3A).
- Branche de travail avancée sur `main` (fast-forward, aucune réécriture d'historique), puis 3B en un commit (ce
  rapport en fait partie). Arbre propre après le commit. Aucun push forcé.
- Phase 3B : **pas de PR, pas de fusion** (en attente de validation).

## 3A MERGE

- PR #54 « Phase 3A — Intent Engine, Task Planner et Router V2 ».
- Première exécution de « Typecheck, tests, Theme Check, build » **annulée** à la limite de 20 minutes : la machine
  de CI a mis ~18 minutes avant les tests (installation, typecheck) ; les 720 tests étaient tous passés. Cause :
  lenteur de la machine, pas le code. **Une seule** relance du même commit, sans modification : verte en 5 minutes.
- CI sur la tête `29e4674` : **2/2 vertes** (« Typecheck, tests, Theme Check, build » ✅, « Image Docker » ✅) ;
  fusion après CI entièrement verte (merge commit `ce2bc98`). Branche synchronisée avec `main` (commit local de la
  3B, jamais envoyé avant la fusion, replacé sur `main`).

## REAL PIPELINE INTEGRATION

INTENTION → PLAN → ROUTEUR → MOTEUR EXISTANT → BARRIÈRE DE QUALITÉ → DÉCISION → ÉTAPE SUIVANTE, sur les vrais
parcours (`src/lib/orchestrator/execute.ts`) :

| Parcours | Entrée | Plan | Exécuteur (inchangé) |
|---|---|---|---|
| Création complète | tâche `pipeline.run` | 8 étapes d'après l'état réel du projet | le pipeline lui-même (ses étapes, ses points de reprise) |
| Marque | `brand.build` | marque → logo → maquettes | `buildBrand` (fait aussi pistes de logo et charte) |
| Logo | `brand.logo`, `brand.fulllogo` | logo | `runLogoJob`, `generateFullLogos` |
| Photos libres | `stock.search` (nouvelle tâche) | recherche | `stockFill` (service) / `universePhotos` (produit) |
| Images | `images.generate`, `image.single` | génération | `generateImageSet`, `generateSingleImage` |
| Textes boutique | `copy.build` | textes | `aiShopCopyChecked` / textes locaux |
| Thème | `shop.build`, `shop.direction`, `theme.custom`, `shop.chat` | thème / retouche | moteurs du thème |
| Social | `calendar.plan`, `post.regenerate` | social | calendrier |
| Publicité | route `campaigns/draft` | publicité | `draftAds` |
| Vidéo | `video.render`, `video.ugc`, `ugc.script` | vidéo | `produceVideo`, `produceUgc`, script UGC |
| Blog | `blog.write` | blog | `writeBlogArticle` |
| Demande libre | tâche `plan.run` (nouvelle) | plan complet de la demande | exécuteurs ci-dessus |

- Chaque tâche de fond de ces actions est enveloppée (`orchestrated`) : petit plan de ses seules étapes, routé,
  tracé, enregistré ; le moteur existant est appelé **une seule fois** et son résultat est rendu tel quel.
- Aucun moteur créatif réécrit ; aucune logique dupliquée (le lancement du calendrier de 7 jours a été extrait du
  pipeline en `startWeekCalendar`, réutilisé par le plan).
- Demande libre sur un projet pas encore analysé : confiée à la création complète (`pipeline.run`), jamais deux
  moteurs en parallèle.

## EXECUTORS

- Résultat d'une étape = verdicts que la **barrière de qualité du moteur** a enregistrés pendant l'étape
  (`quality_checks` de la tâche) : un candidat FINAL suffit, sinon le meilleur ; rien n'est re-noté.
- Un moteur qui produit plusieurs livrables remonte tout : la création de marque reporte le verdict des pistes de
  logo et la charte sur les étapes « logo » et « maquettes » (pas de second moteur lancé).
- Les moteurs gardent leurs propres reprises ciblées : le plan ne relance **jamais** tout le moteur par-dessus
  (« targeted correction done inside the engine; best kept ») → aucune dépense en double.
- Aucun fournisseur capable : l'étape d'un moteur qui a son propre repli local (visuels composés sans IA d'images)
  s'exécute quand même, la raison reste tracée.

## QUALITY HISTORY

Transmis réellement au Router V2, sans changer la signature des moteurs :
- reprise d'un **candidat** par un moteur (pistes de logo, logo complet : `withCandidate(id, tentative)`) → note,
  verdict et tentative précédents lus dans `quality_checks`, fournisseur / modèle précédents de la même tâche dans
  `ai_calls` ;
- reprise d'une **étape** du plan → historique de l'étape porté par la trace.
- Les tâches de contrôle (relecture, détourage, classement) ne sont jamais escaladées parce que le livrable relu
  était faible (testé).
- Effets : RETRY corrigeable → « previous attempt 7.4, targeted correction » (même modèle fort pour le logo) ;
  textes → escalade standard → fort ; REJECTED faible → abandon ; FINAL → aucune reprise.

## MEDIA ROUTING

- `imageProviderAvailable()` et `videoProviderAvailable()` passent par le Router V2 (`routeMedia`) : route de
  l'administration si sa clé est active, sinon fournisseur par défaut, sinon repli **capable** (image : OpenAI →
  Gemini ; vidéo : Veo → fal). Comportement par défaut identique à avant (testé).
- Retouche **par masque** autour du produit réel : seul un fournisseur d'édition convient ; sans OpenAI → aucun
  repli dégradé (`null`).
- Chaque génération (réussie ou échouée) est tracée avec la raison, le repli et l'escalade du routeur
  (« fallback: openai unavailable → google:gemini-2.5-flash-image (same quality gate) »).
- Qualité non dégradée : même moteur, même barrière ; le repli ne change ni l'objectif ni le contrôle.

## IDEMPOTENCE

- Plan d'une tâche = clé `job:<id>` : la reprise d'une tâche relit **le même plan** ; chaque exécution d'étape est un
  point de reprise de la tâche (Phase 1 : `ctx.step`) ; une étape terminée n'est ni relancée ni repayée (testé :
  relance de la tâche → moteur non rappelé, même résultat rendu).
- Création complète : le plan du pipeline et ses `__steps` restent alignés (même tâche, même clé) ; horodatage de
  départ de chaque étape conservé dans le point de reprise.

## PIPELINE.RUN FIX

- Le plan de la création complète lit **l'état réel du projet** : une marque déjà construite (marque + stratégie)
  n'est plus refaite ; l'étape est marquée « Marque existante conservée (nom) : pas refaite. « Refaire la marque »
  pour la régénérer. » (FR/EN).
- Relance expresse depuis l'étape « marque » (`from: "brand"`) → marque refaite, et textes refaits aussi.
- Textes déjà FINAL (contrôle qualité) → non réécrits quand la marque est gardée.
- L'analyse reste toujours refaite (relire les sources est le rôle de la création ; les faits du client restent
  protégés par le Project Brain). Mode guidé : la pause « marque à valider » n'a lieu que si la marque a été faite.

## STOCK BEFORE AI

- Plan d'images : recherche de photos libres (0 €) → si une photo est FINALE, **aucune image IA** ; sinon
  génération (testé, scénarios A, B, D).
- Demande qui exige expressément une image générée (« Génère… », bouton « Créer les images ») → génération directe,
  sans recherche imposée (testé, scénario E).
- La création complète garde son fonctionnement : jeu d'un service = photos libres d'abord (déjà dans le moteur) ;
  jeu d'un produit = scènes autour du produit réel (une photo libre ne montre pas le produit).

## DETERMINISTIC BENCHMARKS

Vraies intentions, vrais plans (état réel des fixtures), vrai routeur ; exécutions des moteurs simulées
(`npx tsx scripts/orchestrator-bench.ts`).

| | Demande | Intent | Plan | Exécutées | Sautées | Qualité | Repli | Coût |
|---|---|---|---|---|---|---|---|---|
| A | Sébastien Blanc — « Crée ma marque et ma boutique » | CREATE_BRAND + CREATE_SHOP | understand → brand_strategy → logo → mockups → stock_search → image_generate → copy → theme → quality_review | brand_strategy, stock_search, copy, theme, quality_review | understand (déjà analysé), image_generate (photo libre FINALE) | logo 8,4 FINAL (reporté), stock 8 FINAL, textes 8,3 FINAL, thème 6,5 PROVISOIRE | non | stratégie high, stock free, textes medium, thème high, relecture low |
| B | Sérum Éclat — « Crée ma boutique et une publicité » | CREATE_SHOP + CREATE_AD | understand → stock_search → image_generate → copy → theme → ad → quality_review | stock_search, image_generate, copy ×2, theme, ad, quality_review | understand | stock 4 REJECTED → image IA 7,6 FINAL ; textes 7,4 RETRY → escalade → 8,2 FINAL | non | image high, textes medium, pub medium |
| C | « Améliore uniquement mon logo » | IMPROVE_LOGO | logo | logo ×2 | — | 7,8 RETRY → correction ciblée (Opus) → 8,5 FINAL | non | high |
| D | « Trouve-moi une photo libre de droits » | FIND_STOCK_IMAGE | stock_search | stock_search | — | 8 FINAL | non | free |
| E | OpenAI indisponible — « Génère une image de bannière » | GENERATE_IMAGE | image_generate | image_generate ×2 | — | 6,2 RETRY → 4,5 REJECTED (refusé, pas accepté) | **OUI** → Gemini, même barrière | high |
| F | Interruption à l'étape textes puis reprise | CREATE_BRAND + CREATE_SHOP | comme A | chaque étape **une seule fois** | understand, image_generate | tout terminé après reprise | non | comme A |

Routage observé : stratégie, logo, thème, publicité → `claude-opus-5-5` (« complex creative direction », « complex
layout direction », « full test campaign ») ; textes → `claude-sonnet-5-5` (« sales copy, high effort »), escaladé
en Opus après un RETRY ; relecture → `claude-sonnet-5-5` (« fixed grid review ») ; photos libres → recherche
(« free stock search before any paid image ») ; images → `gpt-image-1`, repli `gemini-2.5-flash-image`.

## SEBASTIEN BLANC

- Création complète sur le projet existant : marque gardée (pas de stratégie repayée), analyse refaite, textes
  FINAL non réécrits.
- « Crée ma marque et ma boutique » (demande expresse) : marque refaite ; photos libres du métier d'abord ; image IA
  évitée quand une photo libre est FINALE ; contexte de chaque étape = scope du Project Brain.

## PRODUCT PROJECT

- Sérum Éclat : recherche de l'univers d'abord ; photo libre insuffisante → image IA ; textes escaladés après une
  reprise ; publicité au niveau fort.
- **Limitation toujours présente : catégorie produit → repli générique du registre des métiers** ; l'avertissement
  est affiché dans chaque plan de visuels (« GENERIC trade fallback (Phase 2 limitation) »). Non traité en 3B
  (prévu dans Image/Search Engine V2 ou le moteur produit).

## SIMPLE ACTIONS

- Une action simple reste un petit plan : « Refais ce logo » → `logo` ; « Améliore uniquement mon logo » → `logo` ;
  « Écris un article de blog pour mon site » → `blog` ; bouton « Créer les images » → `image_generate`.
- Défaut trouvé et corrigé : « Génère une image de bannière pour ma boutique » lançait aussi une boutique entière.
  « marque » et « boutique » ne déclenchent plus une création sans verbe de création (créer, faire, lancer,
  vouloir, build, create…).

## PROVIDER FALLBACK

- Image : OpenAI indisponible → Gemini (capable), même objectif et même barrière ; résultat faible → rejeté.
- Masque : pas de fournisseur capable → rien (aucun rendu dégradé).
- Vidéo : Google indisponible → fal (Kling) ; aucun des deux → pas de plan IA (le montage existant prend le relais,
  comme avant).
- Texte : un seul fournisseur (Anthropic) ; le repli serveur d'Anthropic reste actif sur chaque appel.

## TESTS

**732 / 732** (89 fichiers, 0 ignoré). Nouveau `tests/orchestrateur-3b.test.ts` (12 tests) + scénarios partagés
`tests/orchestrator-scenarios.ts` :

| Exigence | Résultat |
|---|---|
| parcours réel passe par le planner | 17 actions de tâches de fond enveloppées (+ brouillons de publicités) ; plan enregistré par tâche ; résultat du moteur inchangé |
| aucun double moteur parallèle | moteur appelé une fois ; marque → logo et charte reportés |
| action simple → petit plan | logo, blog, images : une étape |
| projet existant → étapes inutiles sautées | marque gardée, textes FINAL non réécrits |
| régénération expresse → exécutée | `from: "brand"`, bouton « Rédiger les textes » |
| FINAL → arrêt / RETRY → correction / REJECTED faible → abandon | logo 8,6 ; logo 7,4 → correction ciblée tracée ; pistes 3 → abandon, maquettes non lancées |
| photo libre FINALE → pas d'image IA ; image demandée → génération | ✅ |
| fournisseur indisponible → repli capable, même barrière | Gemini, résultat faible rejeté ; masque → aucun repli |
| reprise → aucune étape terminée repayée | relance de tâche ; scénario F |
| routage média réellement utilisé | fournisseurs, route admin, repli, trace en base |
| Brain scope | scopes des étapes (3A) inchangés |
| trace complète | intention, plan, étape, raison, modèle sur l'appel du moteur |
| tests existants | tous verts |

## TYPESCRIPT

`npx tsc --noEmit` : **OK**.

## BUILD

`npm run build` : **OK**. Thème non modifié (Theme Check non concerné).

## BEHAVIOR CHANGES

- **Relance de la création sur un projet qui a déjà sa marque : la marque n'est plus refaite** (ni repayée), les
  textes FINAL non plus ; « Refaire la marque » (relance depuis l'étape marque) les refait.
- Chaque tâche de fond du studio crée un petit plan enregistré (`task_plans`) et ses appels portent intention,
  plan, étape et raison du routage. Rien d'autre ne change pour le client.
- Choix des fournisseurs d'images et de vidéos par le Router V2 (résultat par défaut identique) ; repli et raison
  tracés.
- Nouvelles tâches de fond `plan.run` (demande libre) et `stock.search` (photos libres) ; aucune interface ajoutée
  pour les lancer.
- Brouillons de publicités : passent par le planner (rien n'est enregistré de plus).

## KNOWN LIMITATIONS

1. **Catégories produit : repli générique toujours présent** (avertissement visible dans les plans).
2. Pas encore de bouton ni de champ dans le studio pour une demande libre (`plan.run`) ou une recherche de photos
   libres seule (`stock.search`) : tâches prêtes et testées, interface à faire.
3. Les reprises restent faites **dans** les moteurs (le plan ne relance pas un moteur entier) ; l'escalade de
   modèle s'applique aux reprises d'étape du plan et aux reprises de candidats ; les boucles internes qui ne marquent
   pas leur candidat (textes de la boutique) ne transmettent pas encore leur note au routeur.
4. Les images d'un produit ne passent pas par la recherche de photos libres (elles montrent le produit réel) ; les
   ambiances d'univers, si.
5. Benchmarks déterministes : exécutions simulées ; aucun coût ni qualité réels mesurés (prévu plus tard, sans
   benchmark payant ici).
6. La relance d'une création refait encore images et vidéos (pas de verdict « jeu complet FINAL » pour les sauter).

## PHASE 3 FINAL STATUS

- 3A : fusionnée (PR #54, CI verte). 3B : terminée, **non fusionnée** (en attente de validation).
- Après validation et fusion de 3B : **PHASE 3 = TERMINÉE**. Aucune Phase 3C.

## READY FOR PHASE 4

Oui : le Brand & Logo Engine V2 pourra s'appuyer sur l'intention (CREATE_LOGO / IMPROVE_LOGO / CREATE_BRAND), le
plan (marque → logo → maquettes, abandon d'une direction faible), le routeur (modèle fort, correction ciblée avec
historique), le scope `logo` du Brain et la trace complète — et produire le premier benchmark visuel avant / après.
Phase 4 : **non commencée**.
