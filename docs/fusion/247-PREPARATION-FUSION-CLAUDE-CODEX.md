# Préparation de la fusion Claude + Codex (#247), sans fusion

Document de préparation seulement. **Aucune fusion, aucun rebase ni cherry-pick, aucune branche modifiée, aucun déploiement.** Seule la branche documentaire `claude/247-preparation-fusion` (issue de `main`) a été créée.

## Actualisation du 31 octobre 2026 : nouveau sommet Codex #275

Revue incrémentale (section 5), en lecture seule, signalée par Codex dans #248.

| Élément | Résultat |
|---|---|
| Sommet Codex provisoire | **#275 `codex/211-d19-recu-vocal-exact`, `8eb15a6a`** (CI en cours au moment de la revue). Il contient l'ancien sommet #246 `a9fbc211` (163 commits depuis `main`). `main` est toujours `70204a7f`. |
| Fichiers communs avec Claude `a69fcf7e` | **Les 5 mêmes**, aucun nouveau |
| Conflits textuels (`merge-tree`) | **0** |
| Nouvelles tables, middleware, `package.json` | Aucun changement depuis #246 |
| Nouvelles routes | Uniquement sous `/api/studio-agent/conversations/[cid]/…` (brand, brand-review, campaign-visuals, content, logo-selection, social-drafts, social-production, video-clips, video-voices) : aucune collision |
| Arbre fusionné simulé `5d09b687` (local, jamais poussé) | Typage OK ; mêmes 47 fichiers de tests : **549 réussis / 15 ignorés / 0 échec** |
| **C1** | **Toujours présent** : `export-tool-execution.ts:30` utilise `withBiens`. Correction inchangée. |
| P1 à P5 | Inchangés. Le nouvel outil de contenu SYNA (blog et textes) ne modifie pas le thème : P1 ne s'étend pas. |

**Nouvelles PR Codex #249 → #275** : elles sont contenues dans le sommet, sauf les commits suivants.

| PR | Commit absent | Nature |
|---|---|---|
| #250 | `8117a3f8` | Code vidéo, **repris par contenu** : lignes caractéristiques retrouvées dans `8eb15a6a` |
| #250 | `f3026999` | Documentation |
| #252 | `0b23a265` | Test identique dans X |
| #253 | `603c3204`, `ee4d3740` | Documentation ; tests identiques dans X |
| #254 | `d62aa36c` | Étape CI **reprise par contenu** (vérifiée) |
| #255 | `9e5e171c` | Déjà présent (son diff inversé s'applique) |
| #265 | `a5db29cb`, `accda0ed` | Documentation ; test identique dans X |

**À ne pas rejouer.** Les têtes rouges #263, #266, #267 et #269 sont dépassées par des descendants verts contenus dans X.

**Verdict inchangé** : préparé, **dépend de Codex** (CI #275 en cours ; #211 partielle selon Codex). C1 reste à corriger à l'intégration. **Pas prêt à fusionner.**

## 0. État et sources analysées (30 octobre 2026)

| Élément | SHA | État |
|---|---|---|
| `main` | `70204a7f` | Inchangée |
| Sommet Claude : #245 `claude/239-p4-integration` | `a69fcf7e` | **préparé**. CI verte. Contient toute la chaîne #234 → #245 (vérifié par ascendance). |
| Sommet Codex provisoire : #246 `codex/211-lot-d10b2-clips-bornes` | `a9fbc211` | **dépend de Codex**. CI en cours sur ce commit ; D10c, D11, D12, E et F manquent. Contient `c180c150`. |
| Ancêtre commun des deux sommets | `70204a7f` (= `main`) | Les deux chaînes partent du même `main`. |
| Simulation locale de fusion (commit sans branche, jamais poussé, supprimé ensuite) | `54f6ea9f` | Arbre `git merge-tree a69fcf7e a9fbc211` : **0 conflit textuel**, typage OK, 47 fichiers de tests concernés **546 réussis / 15 ignorés / 0 échec** |

**Verdict** : la fusion technique est **préparée** pour le sommet Codex actuel. Il y a **1 conflit sémantique certain** (à corriger au moment de l'intégration) et **5 points probables**. **Ce n'est pas « prêt à fusionner »** : Codex n'a pas terminé #211, et il manque les validations croisées et l'accord du propriétaire.

## 1. Matrice des PR

Légende :
- ⊂ C ou ⊂ X : contenu dans le sommet Claude (C) ou Codex (X) par ascendance Git ;
- CI : état de la dernière exécution sur la tête de la PR ;
- recetté : vérifié dans le Studio compilé sur une instance isolée.

### Chaîne Claude (linéaire, base `main` 70204a7f)

| PR | Lot | Parent | SHA | État | CI | Validation | ⊂ C |
|---|---|---|---|---|---|---|---|
| #234 | Hébergement des sites de services | main | `72c572af` | brouillon | verte | recetté | oui |
| #235 | Notifications e-mail | #234 | `a954efab` | brouillon | verte | recetté (SMTP local) | oui |
| #236 | Fiabilité de l'hébergement | #235 | `2705edb1` | brouillon | verte | recetté | oui |
| #237 | Domaine existant | #236 | `8a26e287` | brouillon | verte | recetté (DNS local) | oui |
| #240 | Contenus P0 (audit) | #237 | `469ef056` | brouillon | verte | doc | oui |
| #241 | P1 biens | #240 | `ce307605` | brouillon | verte | recetté | oui |
| #242 | P2 prestations et carte | #241 | `4c0fd03b` | brouillon | verte | recetté | oui |
| #244 | P3 réalisations | #242 | `c6084d7b` | brouillon | verte | recetté | oui |
| #245 | P4 intégration et API | #244 | `a69fcf7e` | brouillon | verte | recetté | **sommet** |

### Chaîne Codex (#211, base `main` 70204a7f)

| PR | Lot | Parent (branche) | SHA | CI | ⊂ X | Remarque |
|---|---|---|---|---|---|---|
| #208 | #204 réanalyse | main | `a0246c77` | verte | oui | Intégrée via `codex/211-integration-dependances` (`c964455b`, branche sans PR) |
| #210 | Fondations (lot A) | main | `2a5e9671` | verte | oui | idem |
| #212 | B dialogue | integration-dependances | `d5012ed6` | verte | oui | |
| #213 | C rôles | #212 | `f8b1405f` | verte | oui | |
| #214 | F1 interface | #213 | `6c98263d` | verte | **non** | Dernier commit hors sommet. Son correctif de script est **repris autrement** dans X (vérifié) ; manquent seulement les preuves `docs/coordination/…F` |
| #215 → #221 | D1, D2, E1, E2/F2, D3, E3, D4 | linéaire | … `f04982b0` | vertes | oui | |
| #222 | E4 textes intégraux (annexe) | #220 | `13aa53a6` | verte | **non** | Code présent dans X à l'identique (4/4 fichiers) ; seul le commit de documentation manque |
| #223 → #225 | D5, D6, D7 | linéaire | `dc23f69d`, `ef67bebe`, `cc2c3144` | **rouge** sur leur tête | oui | Repris et dépassés par #228 (vert) |
| #226 | F2 en-tête Images (annexe) | #224 | `06dcaa22` | **rouge** | **non** | Code présent dans X (identique ou modifié ensuite) ; preuves documentaires absentes |
| #227 | F2 aperçu mobile (annexe) | #223 | `f3b442df` | verte | **non** | Code identique dans X ; preuves absentes |
| #228 | Intégration D7, E4, F2 | #225 | `03692928` | verte | oui | Rassemble les annexes |
| #229 → #231 | D8, D9a, D9b | linéaire | … `6e686dcc` | vertes | oui | |
| #233 | D9c logos | #231 | `f8248425` | verte | **non** | Code identique dans X ; commit de contre-recette documentaire absent |
| #238 | D10a vidéo | D9c (`a74b9375`) | `ab32ffce` | verte | oui | |
| #243 | D10b1 scénarios | #238 | `8d175998` | verte | **non** | Commit documentaire (191 fichiers) absent de X |
| #246 | D10b2 clips et voix | #243 | `a9fbc211` | en cours | **sommet provisoire** | |

**Ne pas appliquer deux fois** : on intègre seulement le **sommet Codex final**.
- Les PR #208, #210, #212–#213, #215–#221, #223–#225, #228–#231, #238 y sont déjà contenues.
- Les PR #214, #222, #226, #227, #233 et #243 n'apportent plus que de la **documentation ou des preuves**. Leur code est déjà dans X. Les intégrer serait facultatif et documentaire ; à décider avec Codex.

### Hors périmètre (ne pas inclure)

| PR | Objet | État |
|---|---|---|
| #127 | Publications | Retard de 504 commits sur `main` |
| #165 | Lot 5 diagnostic d'accès | Retard de 220 commits ; CI rouge |
| #167 | NOCTIL | Conflits (`dirty`) |
| #179–#189 | Consignes et maquettes de thèmes (`brief/*`) | Documentation ; CI rouge pour #187–#189 |
| #191 | Coven (client) | Conflits |

À clore ou réévaluer **séparément** par le propriétaire.

## 2. Carte des conflits et des risques

**Recouvrement réel** : 373 fichiers modifiés côté Claude, 1 716 côté Codex, **5 fichiers communs** :
- `src/app/api/projects/[id]/route.ts`
- `src/app/preview/[id]/v/[vid]/[[...path]]/route.ts`
- `src/components/studio/shell.tsx`
- `src/components/studio/tab-boutique.tsx`
- `worker/index.ts`

Git les fusionne automatiquement.

### Certain (sémantique, invisible pour Git)

| # | Constat | Effet après fusion | Correction | Équipe |
|---|---|---|---|---|
| **C1** | `src/lib/orchestrator/conversation/export-tool-execution.ts:30` : `currentSiteSource()` utilise `withBiens(cur.spec,pid)` ; c'est la source de l'export SYNA **et** des captures SYNA (`render-tool-execution.ts`) | Depuis SYNA, l'export et les captures montrent les biens mais **pas la carte ni les réalisations**, alors que l'aperçu, l'export Studio et le site hébergé les montrent | Remplacer par `withContenus(cur.spec,pid)` (import `@/lib/contenus`). Une ligne, même signature ; l'empreinte `sourceDigest` suivra alors les contenus (comportement voulu) | Intégration (commit dédié) ; Codex valide |

### Probable

| # | Constat | Correction proposée | Équipe |
|---|---|---|---|
| P1 | Les retouches de thème SYNA (D2) modifient les blocs **enregistrés**. Or les sections `portfolio`, `ap-cards`/`ph-cards` « projects »/« gallery », `ts-menu` et `ts-dishes` sont **remplacées au rendu** quand des contenus existent. Les pages `page.es-realisations` et `page.es-real-*` n'existent qu'au rendu. Une retouche SYNA y serait sans effet visible. | SYNA refuse avec un message clair (« ce contenu se gère dans l'onglet Réalisations/Carte ») ; plus tard, un outil SYNA branché sur l'API `/api/projects/[id]/contenus` (#245 : versions, `confirm` obligatoire, 428/409) | Codex (Claude fournit la liste des sections injectées) |
| P2 | L'observation et le contexte SYNA (`studio-observation`, `intelligence-context`) ignorent les contenus métier et l'état du site hébergé (« non publié ») | Lire `contentManifest()` et `siteFreshness()` (exportés par #245) | Codex |
| P3 | L'aperçu de catalogue SYNA (`vid` `catalogue-*`) contourne `withContenus` | Faible impact (boutiques produits seulement) ; aligner lors de C1 | Codex |
| P4 | `tab-boutique.tsx` : Codex ouvre l'aperçu par défaut quand SYNA est actif ; Claude ajoute « Publier votre site » (bouton dans l'onglet Aperçu sur téléphone) | Contrôle visuel ordinateur et téléphone après fusion, SYNA ouvert et fermé | Les deux |
| P5 | Une recomposition par SYNA (E1/E2) pourrait retirer la section de réservation (prestations, horaires et adresse y sont stockés, #242) ou les sections de réalisations. Ce risque existait déjà avec « Mettre à jour le site ». | Test : recomposer un salon et vérifier que `readPrestations` est inchangé | Codex (test), Claude (assertions) |

### À revérifier après la dernière livraison Codex

| # | Point |
|---|---|
| R1 | #246 `a9fbc211` (CI en cours), puis les lots D10c, D11, D12, E et F : nouveaux fichiers communs, tables, drapeaux et routes |
| R2 | Durée totale de la CI : les recettes Codex sur build compilé et les suites Claude s'additionnent ; vérifier le délai du job sans relever les limites |
| R3 | Si Codex ajoute un espace du Studio, mettre à jour `tests/plan-studio.test.ts` (19 espaces côté Claude) et la règle `spaceVisible` |
| R4 | Vie privée (Claude, indépendant de la fusion) : l'effacement d'un compte supprime les lignes `site_*`, mais **pas les fichiers publiés** dans `DATA_DIR/sites/…`. À corriger avant activation de l'hébergement. |

### Sans problème observé

- **Tables** : aucune collision.
  - Claude : `site_*` (8 tables), `carte_*`, `realisations`, toutes avec `project_id`, donc couvertes automatiquement par l'inventaire RGPD.
  - Codex : `agent_*` (5 tables), dont l'export et l'effacement sont traités par #211.
- **Migrations** : toutes additives (`CREATE TABLE IF NOT EXISTS`) ; aucune colonne renommée ni supprimée.
- **Routes** : aucune collision. Côté Codex : `/api/studio-agent/*` et `/api/projects/[id]/conversation`. Côté Claude : `/api/projects/[id]/{site-publication,carte,prestations,realisations,contenus}`, `/api/site-host`, `/api/site-domains`, `/api/site-notify`.
- **Middleware** : modifié par Claude seulement. Tout nom d'hôte de site est réécrit vers `/api/site-host`, donc **aucune route SYNA ni aucun aperçu n'est joignable depuis un site publié**.
- **Dépendances** : `package.json` inchangé des deux côtés. La CI n'est modifiée que par Codex (recettes build avec réseau bloqué).
- **IA et coûts** : Claude n'ajoute aucun appel payant (SMTP seulement). Les coûts SYNA restent sous devis et budget (#211).
- **Catalogue** : l'outil SYNA refuse les sites de services (`productsOnly`) ; c'est cohérent avec Claude, qui masque Catalogue pour les services.
- **Publication** : SYNA n'a aucun outil de publication du site hébergé ; l'API Claude ne publie jamais. Le site public ne change que par une publication choisie par le professionnel.

## 3. Stratégie de fusion (planifiée, non exécutée)

**Ordre proposé**, chaque étape sur une branche future `integration/claude-codex-AAAAMMJJ` issue de `main` :

1. **Gel et sauvegardes**, avant toute action :
   - tag `pre-integration-AAAAMMJJ` sur `main` ;
   - sauvegarde de `studio.db` (avec WAL) et des dossiers `storage/` et `sites/` ;
   - restauration testée sur une copie.
2. **Sommet Claude** `a69fcf7e`, par commit de fusion (pas de rebase).
   - Point A : CI complète verte, hébergement non activé (`SITES_DOMAIN` absent).
3. **Sommet Codex final** (pas le sommet provisoire), par commit de fusion.
   - Point B : 0 conflit attendu (sinon : refaire la section 2) ; CI complète verte.
4. **Commit d'intégration** : C1, test P5, ajustement R3 si besoin.
   - Point C : CI verte et matrice de la section 4 (tests prioritaires).
5. **Validation croisée** Claude et Codex, puis **accord explicite du propriétaire**.
   - Seulement ensuite : PR `integration → main` par commit de fusion.
6. **Déploiement avec activation séparée.** Tout reste désactivé au départ (SYNA `STUDIO_CONVERSATION_*` et outils, hébergement `SITES_DOMAIN`). On active ensuite une fonction à la fois, avec un contrôle après chaque activation.

**Pourquoi Claude d'abord** : chaîne plus courte, déjà linéaire sur `main`, sans conflit. Les ajustements d'intégration (C1, P1) portent sur du code Codex ; ils se font donc après l'arrivée de Codex, en un seul commit visible.

**Retour arrière** :
- Code : annuler le commit de fusion sur `main`, ou repartir du tag.
- Base : les tables ajoutées sont additives et sans effet pour l'ancien code ; on ne restaure la sauvegarde **qu'en cas de données altérées**.
- Sites publiés : les fichiers de `sites/` sont figés et versionnés ; on remet une publication précédente sans rien supprimer.

## 4. Matrice de tests d'intégration (à exécuter plus tard)

Chaque test est classé ainsi :
- **S** : simulé, sans réseau ;
- **L** : local réel (build compilé, SMTP et DNS locaux) ;
- **P** : production, après activation.

| Parcours | Type | Critère de réussite |
|---|---|---|
| VANS étape 1 sur une copie de projet | L | Fiche inchangée, aucune donnée client modifiée |
| Boutique mono-produit et multi-produit : thème inchangé, ordinateur et téléphone | S + L | Rendu identique avant/après fusion (même objet sans contenus) |
| Services : biens, prestations, carte, réalisations (création, modification, retrait) | S + L | Aperçu à jour ; site en ligne inchangé avant republication |
| Hébergement : V1 → V2 → restauration V1 | L | Contenus de V1 restitués |
| Devis : formulaire → e-mail | L (SMTP local) | Demande enregistrée avant l'e-mail ; reprise si panne |
| Réservation native (salon) | L | 201 ; prestation réservée non supprimable |
| Domaine client | L (DNS local) | TXT, puis CNAME, puis routage ; désactivation |
| Export ZIP Shopify, WooCommerce, PrestaShop | S | Avertissements présents ; aucune compatibilité annoncée |
| **SYNA** : conversation → devis → consentement → budget → outil natif → rendu → annulation | S (fournisseur simulé) | Reçus, versions, annulation ; **export et captures avec carte et réalisations** (C1) |
| SYNA retouche une section remplie au rendu | S | Refus clair (P1) |
| SYNA recompose un salon | S | Prestations conservées (P5) |

**Scénarios d'échec**, tous en S ou L :
- compte étranger : 404 ; visiteur : 401 ;
- effacement et export RGPD : tables `site_*` et `agent_*` ;
- budget dépassé : refus avant tout appel ;
- tâches en double : idempotence des jobs ;
- changement de projet en cours de conversation ;
- publication de contenu sans `confirm` : 428 ;
- panne d'API simulée : erreur lisible, aucun débit ;
- isolation des hôtes : aucune route du Studio servie sur un nom de site ;
- migrations sur une copie de base de production anonymisée.

**Arrêt ou poursuite (stop/go)** :

| Décision | Conditions |
|---|---|
| **GO** | CI complète verte ; 0 échec sur les 10 parcours prioritaires ; C1 corrigé ; P1 et P5 testés ; sauvegarde et restauration vérifiées |
| **STOP** | Toute régression d'un thème validé ; donnée client modifiée ; appel payant non devisé ; route du Studio accessible par un hôte de site |

**10 essais de bout en bout prioritaires** :
1. VANS ;
2. boutique mono-produit ;
3. agence (biens) ;
4. salon (réservation) ;
5. restaurant (carte) ;
6. artisan (devis par e-mail) ;
7. hébergement V1 → V2 → V1 ;
8. SYNA export avec contenus ;
9. SYNA retouche refusée ;
10. compte étranger et isolation des hôtes.

## 5. Mise à jour quand Codex livre de nouveaux commits

**Ce qui reste valable** : section 1 côté Claude, tables et routes Claude, middleware, et les conclusions sur #208 à #246 tant que leurs SHA ne bougent pas.

**À refaire** (environ 15 minutes, en lecture seule) avec le nouveau sommet `X` :

```sh
git fetch origin && X=<nouveau SHA Codex>; C=a69fcf7e
git merge-base --is-ancestor a9fbc211 $X && echo "X contient l'ancien sommet"
comm -12 <(git diff --name-only 70204a7f $C | sort) <(git diff --name-only 70204a7f $X | sort)   # fichiers communs
git merge-tree --write-tree --name-only --messages $C $X | grep -i conflict                       # conflits textuels
git grep -n "withBiens" $X -- src                                                                 # C1 toujours présent ?
git diff 70204a7f $X -- src/lib/db.ts src/middleware.ts | grep -E "^\+.*(CREATE TABLE|site)"      # nouvelles tables, middleware
```

Ensuite, sur un arbre simulé (commit local sans branche) : typage, puis les tests listés en annexe. Ne relancer la suite complète qu'au point C.

## 6. Risques bloquants, dans l'ordre

1. **Codex non terminé** (#246 CI en cours ; D10c, D11, D12, E, F) : bloque toute fusion réelle.
2. **C1** : export et captures SYNA sans carte ni réalisations, à corriger au point C.
3. **R4** : fichiers des sites publiés non effacés avec le compte. À corriger par Claude avant d'activer l'hébergement (sans effet tant que l'hébergement reste désactivé).
4. **P1 et P5** : retouches et recompositions SYNA face aux contenus métier.
5. **Validation propriétaire** des défauts antérieurs des thèmes PHASE et APLAT (#245), sans retouche silencieuse.

## Annexe : tests ciblés exécutés sur l'arbre simulé `54f6ea9f`

47 fichiers (546 tests réussis, 15 ignorés), choisis parce qu'ils importent les fichiers communs, le Studio, l'aperçu, la publication ou l'export SYNA :

`abonnement-projet`, `ai-lang`, `aplat`, `atelier-nuance-theme`, `audit-contenus`, `audit-onglet-boutique`, `biens-hebergement`, `budget-ia-visuels`, `carte-restaurant`, `composition211-plan`, `contenus-api`, `conversation211-exports`, `conversation211-intelligence`, `domaines-existants`, `fenetres-studio`, `forfaits-interface`, `fraise-theme`, `hebergement-fiabilite`, `hebergement-sites`, `i18n-content`, `identite-validation-parcours`, `integration194-exports-scripts`, `lot2a-purchase`, `lot2b-editorial`, `mission160-strategy`, `mission171-routes-lifecycle`, `mission171-scope-inputs`, `parenthese-theme`, `phase-theme`, `plan-studio`, `plateformes-honnetes`, `preparation-nouvelle-mission`, `prestations-editeur`, `project-handoff`, `publications-organisation`, `realisations-artisans`, `recette-vans-comprehension`, `regle-presence-humaine`, `section-masquee-menu`, `seo-v2-engine`, `sillon-theme`, `site-notifications`, `studio-incitations`, `table-saison-theme`, `theme-en`, `video-creative-guide`, `visuel-cree`.

Ni build ni suite complète : ils sont réservés au point C. Ces tests ne montrent pas C1, car aucun test Codex ne vérifie les contenus métier dans l'export SYNA. Il faudra en ajouter un.
