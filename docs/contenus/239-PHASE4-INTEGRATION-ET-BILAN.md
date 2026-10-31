# Contenus métier (#239) — Phase 4 : intégration, préparation pour SYNA, bilan de la mission

**Base** : phase 3, PR #244 (`c6084d7b`). **Branche** : `claude/239-p4-integration`.

## 1. Ce que fait la phase 4

| Demande (#239, phase 4) | Fait | Preuve |
|---|---|---|
| Points d'accès cohérents, contrôles non pertinents masqués | **`spaceVisible`** (`src/lib/studio-nav.ts`) décide du menu selon le métier : <ul><li>« Biens » pour l'agence, « Carte » pour le restaurant, « Réalisations » pour les artisans ;</li><li>« Rendez-vous » seulement si le site réserve (salon, cabinet, restaurant, ou mode de contact « réservation ») ;</li><li>« Catalogue » (produits) n'est plus proposé à un site de services.</li></ul> Un espace masqué reste accessible par son adresse ; les raccourcis clavier ne changent pas. | Test `contenus-api` ; captures `p4-01` (agence, restaurant, salon, plâtrier) et `p4-02` (téléphone) |
| API métier native et sécurisée, réutilisable par SYNA | **`/api/projects/[id]/contenus`** donne le manifeste : types affichés par le site, nombre d'éléments, opérations, état du site. <br>**`/contenus/[type]`** : `GET` liste ; `POST` `create` ou `reorder`. <br>**`/contenus/[type]/[itemId]`** : `GET` ; `PATCH` avec `ifVersion` ; `POST` `publish`, `withdraw`, `archive` ou `status`. <br>Types : `biens`, `plats`, `realisations`, `prestations`. Forme commune définie dans `src/lib/contenus/api.ts`. | Tests et recette ci-dessous |
| Versions | Chaque élément porte `version`. `ifVersion` périmé : **409**, rien n'est écrit. Prestations : la version du site qui les contient. | 409 testé et en recette |
| Consentement | Tout changement de visibilité exige `confirm: true`, envoyé seulement après l'accord explicite du professionnel. Sinon : **428**, rien ne change. | 428 testé et en recette |
| Liaison à l'hébergement figé (#234) | L'API **ne publie jamais le site**. Chaque réponse indique si le site en ligne est à jour, avec la consigne « publiez une nouvelle version depuis l'onglet Site ». V(n) et la restauration restent celles des phases 1 à 3. | Recette : réalisation publiée par l'API, absente du site en ligne, bandeau « non publié » |
| Séparation brouillon / public | Inchangée : brouillons visibles seulement dans l'aperçu de l'élément ; création toujours en brouillon. | Tests P1 à P3, création 201 « draft » |
| Adresse unique (limite relevée en phase 2) | L'adresse saisie dans l'éditeur des prestations met à jour le **profil d'activité**. L'adresse modifiée dans le profil est reportée dans la **réservation** du site, par une nouvelle version restaurable. Si l'adresse ne change pas, aucune version n'est créée. | Test ; recette `p4-04` : profil modifié, l'éditeur affiche la nouvelle adresse |
| Export sans compatibilité annoncée | Avertissement `business_content_static` (Shopify, WooCommerce, PrestaShop) : carte et réalisations sont copiées telles quelles dans le thème ; refaire un export après une modification ; **aucune synchronisation automatique**. Il apparaît dans le contrôle de l'export. Les avertissements existants des biens sont conservés. | Test (3 plateformes) ; recette : export Shopify enregistré avec l'avertissement |
| Droits | Toutes les routes : compte étranger **404**, visiteur non connecté **401**. | Test ; recette |

Aucun assistant IA n'est ajouté et aucune branche SYNA ou Codex n'est touchée : l'API est prête à être branchée.

## 2. Bilan de #239, phase par phase

| Phase | PR | Ce qui est livré | Testé localement | CI |
|---|---|---|---|---|
| P0 | #240 | Audit et plan (matrice existant → problème → correction → preuve) | — | verte |
| P1 | #241 | Biens : limite des fiches, blocage DPE/GES, bandeau « non publié », recette d'hébergement | Agence fictive : V1 → V2 → V1, 18 liens, compte étranger | verte |
| P2 | #242 | Prestations, horaires, intervenants, adresse (salon, cabinet, restaurant) ; carte du restaurant | Salon : vraie réservation 201 ; restaurant : V1 → V2 → V1 | verte (après correction du test `plan-studio`) |
| P3 | #244 | Réalisations des artisans (Rive, APLAT, PHASE, anciens thèmes) | 3 artisans fictifs ; devis depuis une fiche avec e-mail sur le SMTP local ; V1 → V2 → V1 | en cours au moment du rapport |
| P4 | cette PR | Menus par métier, API native, adresse unique, export | Voir section 1 | à venir |

Les trois entreprises fictives exigées sont couvertes :
- **agence** (P1) ;
- **restaurant et salon** (P2) ;
- **artisans** (P3).

Pour chacune ont été vérifiés : brouillons non publics, compte étranger, médias du bon projet, aperçu sur ordinateur et téléphone, publication V1 → V2 → restauration V1, liens.

### Démonstrations validées

**Règle** : sans contenu en base, `withContenus` renvoie **le même objet**, donc un rendu strictement identique. C'est testé pour :
- les biens (P1) ;
- la carte (P2) ;
- les réalisations : Rive, APLAT, PHASE et un ancien thème (P3).

Les suites des thèmes concernés passent : APLAT, PHASE, Rive, TABLE SAISON, PARENTHÈSE, ATELIER NUANCE et Maison & Horizon.

Pas de comparaison par captures des démonstrations privées : leurs kits ne sont pas dans le dépôt et ne sont présents que partiellement ici.

## 3. Ce qui n'est pas fait, et les problèmes ouverts

- **Défauts antérieurs de la composition client PHASE** (relevés en P3, thème validé non modifié) :
  - un nom long chevauche le menu et le pied de page ;
  - l'appel final de l'accueil chevauche son bouton ;
  - un espace vide apparaît avant cet appel.

  Le pied de page APLAT client affiche aussi un nom sombre sur fond sombre. Ces corrections touchent des thèmes validés : **à décider par le propriétaire**.
- **Textes de contact composés** (pied de page, infos pratiques) : ils sont écrits dans le site à sa composition. Une nouvelle adresse de profil arrive dans la réservation, mais ces textes demandent « Mettre à jour le site ».
- **Ateliers du cabinet** : pas d'éditeur dédié. Un changement de date avec des inscrits n'est pas protégé (P2).
- **Carte** : pas de menus du jour ni de formules (P2).
- **Réalisations** : pas de témoignage ni de vidéo par projet (P3).
- **API** :
  - la session du studio sert d'authentification ; un jeton dédié pour SYNA reste à définir avec Codex ;
  - les catégories de la carte se gèrent par la route existante `/carte`.
- **Suite complète locale** : 3 échecs, tous dus aux kits de démonstration privés incomplets présents dans `public/demo` (ignoré par git). La CI fait foi.
- **Rien n'est fusionné ni déployé.** Aucun achat, domaine ou service externe ; SMTP local uniquement.

## 4. Tests de cette phase

- **`tests/contenus-api.test.ts` (6/6)** couvre :
  - menus par métier ;
  - API : manifeste, création, 428, 409, publication, 400 et 404 ;
  - droits : 404 pour un compte étranger, 401 pour un visiteur, sur toutes les routes ;
  - plats et prestations par la même API ;
  - adresse unique dans les deux sens, sans version inutile ;
  - avertissement d'export sur 3 plateformes.
- **Recette** : `recette-239-p4/` (script `p4-integration.mjs`, captures `p4-01` à `p4-04`, `p4-integration.json`).
