# Contenus professionnels des sites de services (#239) — Phase 0 : audit et plan technique

**Niveau : `audit`.** Lecture du code de la branche `claude/239-contenus-metier-audit`. Elle part de `8a26e287` (#237, CI verte), qui hérite de #236, #235 et #234 (CI vertes, non fusionnées). Aucun code n'est modifié dans cette phase.

## 1. Constat d'ensemble

| Contenu | Où il vit aujourd'hui | Lié au rendu ? | Éditeur du studio | Hébergement (#234) |
|---|---|---|---|---|
| **Biens immobiliers** (Maison & Horizon) | Table `biens` (`src/lib/db.ts:976`), `src/lib/biens.ts` | **Oui** : `withBiens()` est injecté à chaque rendu (aperçu `preview/.../route.ts:61-75`, export `theme/export/route.ts:32`, publication `sites/publish.ts:211`). Jamais écrit dans le thème (`spec.ts:146-150`) | **Oui** : onglet Biens (`tab-biens.tsx`), visible seulement pour un site immobilier (`shell.tsx:39-41`) | Les fiches `/pages/bien/<handle>` (`render.ts:757-761`) sont trouvées par les liens des listes, qui sont rendues côté serveur (`re-listings.liquid:90,99-113`) |
| **Prestations, horaires, intervenants** (salon ATELIER NUANCE, cabinet PARENTHÈSE) | Blocs de la section de réglages `an-salon` / `pa-cabinet`, dans le groupe d'en-tête du thème (`rendez-vous.ts:30`). Les moteurs les lisent (`salon/booking.ts:123-142`, `cabinet/booking.ts:115-130`) | Oui pour la réservation. **Non** pour le profil d'activité : copie unique à la composition (`directions.ts:1348`, `atelier-nuance.ts:274`, `parenthese.ts:229`) | Pas d'éditeur dédié : l'onglet Rendez-vous ouvre le **panneau générique** de section (`tab-rendez-vous.tsx:163-167`) | Publiées comme le reste du thème |
| **Prestations du profil** (tous les métiers) | `projects.business_json` (`ServiceItem` : nom, description, prix et durée **en texte libre**, `project-types.ts:173-189`) | **Non** : copie à la composition, puis « Mettre à jour le site » recompose une nouvelle version (`tab-activite.tsx:53-68`) | `ServicesEditor` (`services-editor.tsx`) | — |
| **Carte du restaurant** (TABLE SAISON) | Blocs `ts-menu` : catégorie, plat (nom, description, prix **texte**, végétarien), allergènes **globaux** (`ts-menu.liquid` schéma l.53-77). Autre section : `ts-dishes` | Non | **Aucun** (panneau générique seulement) | — |
| **Créneaux et capacité du restaurant** | Réglages `ts-restaurant` (`restaurant/booking.ts:96-108`) | Oui pour la réservation | Panneau générique | — |
| **Réalisations / portfolio** (artisans) | Blocs de section : `portfolio`, `ap-cards` (APLAT), `ph-cards`/`ph-project` (PHASE), `fs-case` (Rive) | Non | **Aucun** | — |
| **Zone d'intervention** | `ServiceProfile.area`, texte libre (`project-types.ts:177`) | Copie à la composition | Profil | — |
| **Avis, références** | Gabarits « [À compléter : avis réel…] », masqués (`services-site.ts:210-214`, `directions.ts:819-824`) | — | Aucun | — |

## 2. Matrice existant → problème → correction prévue → preuve attendue

| # | Existant | Problème constaté (avec preuve) | Correction prévue (phase) | Preuve attendue |
|---|---|---|---|---|
| B1 | Biens : base de données, onglet, injection au rendu | Plus de ~75 biens visibles dépassent la limite de 80 pages par publication (`LIMITS.pages`, `sites/publish.ts:27`) : publication refusée | Compter les fiches de biens à part, avec une limite propre (P1) | Test : 120 biens fictifs publiés ; temps et poids mesurés |
| B2 | Biens « publiés » visibles aussitôt dans l'aperçu **et** à la prochaine publication | Le studio ne dit pas que le site en ligne n'a pas encore ces changements | Indicateur « Modifications non publiées » : empreinte du contenu rendu ≠ `spec_hash` de la publication en ligne (P1, généralisé en P4) | Capture : bien modifié → mention → publication → mention disparue |
| B3 | Parcours biens complet (créer, photo, publier, vendu, loué, archivé) | Jamais recetté avec l'hébergement natif ni le slug stable après publication | Recette de bout en bout P1, sans réécrire le module | Captures V1 → V2 → restauration ; liens de fiches 200 ; slug stable |
| B4 | Export des biens (`biens-export.ts`, `cms-v2/export.ts:78`) | Pour Shopify : métaobjets à importer ; ailleurs : module serveur requis (déjà signalé) | Conserver le signalement ; rien n'est annoncé comme compatible (P4) | Test d'export : avertissement présent |
| R1 | Salon et cabinet : réglages lus par les moteurs | Prix et durées existent en **trois** endroits : profil (texte), réglages (nombre), textes « Prix/Durée affichés » des cartes `an-services`, `an-featured`, `pa-offers`… (sans script). Aucune synchronisation | Une seule source : les réglages lus par le moteur. Les textes affichés sont recalculés **au rendu** à partir du `service_id` quand il correspond ; le profil devient une proposition initiale (P2) | Test : prix modifié une fois → carte, fiche, calendrier et moteur identiques ; démo inchangée au pixel |
| R2 | Onglet Rendez-vous | **Bug** : le prix est affiché ÷ 100 (`tab-rendez-vous.tsx:98`) alors qu'il est saisi en euros (« Prix (€) », `an-salon.liquid:176`) : 45 € s'affiche 0,45 € | Corriger l'affichage (P2) | Test + capture |
| R3 | Composition d'un salon client | Aucun intervenant et aucun horaire créés (`atelier-nuance.ts:107-116,275`) → aucun créneau : réservation impossible avant une édition manuelle des réglages | Éditeur « Prestations et horaires » qui guide la saisie. Le site ne se publie pas sans horaires (déjà bloquant, lot #234) (P2) | Recette : salon fictif → réservation réelle |
| R4 | Restaurant client | Créneaux et capacité **par défaut** (12:00–13:00, 19:00–20:30, 24 couverts, tous les jours), non issus du client (`table-saison.ts:74`) | Les faire confirmer dans l'éditeur ; signaler « valeurs par défaut » tant qu'ils ne sont pas confirmés (P2) | Test + capture |
| R5 | Réservations existantes | Le prix et le nom sont copiés à la réservation (`salon/booking.ts:268-276`) : un changement de prix ne touche pas une réservation confirmée ✅. Un déplacement est validé avec la **nouvelle** durée ; une prestation supprimée rend le déplacement impossible (`salon/booking.ts:349,474`) | Interdire la suppression d'une prestation qui a des réservations à venir (la masquer à la place) ; signaler l'effet d'un changement de durée (P2) | Test : réservation confirmée intacte après modification ; prestation masquée, non supprimée |
| R6 | Cabinet : ateliers | Ajout d'un atelier par téléphone impossible depuis le studio (`rendez-vous.ts:135`) ; changer la date d'un atelier ne déplace pas ses inscrits | Signalé ; refuser le changement de date d'un atelier qui a des inscrits (P2) | Test |
| M1 | Carte du restaurant (`ts-menu`) | Pas de modèle structuré : prix en texte, allergènes globaux, pas de disponibilité, pas de photo par plat, aucun éditeur. Section vide et désactivée chez un client (`table-saison.ts:129-131,170`) | Modèle **carte** en base (catégories, plats, prix, description, mentions et allergènes **déclarés par le restaurateur**, disponible/indisponible, photo du projet, ordre), injecté au rendu dans `ts-menu`/`ts-dishes` comme les biens. Rien n'est injecté s'il n'y a pas de carte (démo inchangée au pixel) (P2) | Recette : carte saisie → aperçu → publication V2 → restauration V1 |
| A1 | Réalisations : blocs `portfolio`, `ap-cards`, `ph-cards`, `fs-case` | Aucun modèle ni éditeur. Pages de détail seulement dans les démos (`tests/*-fixtures.ts`). Chez un client : absentes (APLAT, PHASE) ou textes « [À compléter] » (Rive, `services-site.ts:198-204`) | Modèle **réalisations** en base (titre, description, catégorie, photos du projet, avant/après facultatif, lieu ou zone si communiqué, date, ordre, brouillon/publié/retiré, slug stable), injecté au rendu dans les sections existantes. Fiche de détail **seulement** pour les thèmes qui en ont une (Rive `fs-case`, PHASE `ph-project`) (P3) | Recette : artisan fictif → 3 réalisations → galerie, filtres, fiche, devis (#235) |
| A2 | Zone d'intervention | Texte libre | Conservée en texte (pas de cartographie inventée) ; reprise de la même source partout au rendu (P3) | Test |
| X1 | Profil d'activité ↔ site | Une modification exige « Mettre à jour le site », qui recompose tout le thème (`theme/build`) | Pour les contenus métier, plus de recomposition : injection au rendu. La recomposition reste pour la structure du site (P4) | Test : une modification n'altère aucune autre section |
| X2 | Démos validées | Les démos (`tests/*-fixtures.ts`) écrivent leurs contenus dans le thème | **Règle** : l'injection n'agit que si le projet a des contenus en base. Sinon le rendu reste identique **au pixel** (P1–P4) | Comparaisons pixel avant/après sur les démos de chaque thème concerné |
| X3 | API | `api/projects/[id]/biens` existe ; rien d'autre | Routes homogènes `list/get/create/update/publish/archive/reorder` par type, propriétaire seulement, réutilisables par SYNA plus tard (P4) | Tests de droits (étranger 404, visiteur 401) |

## 3. Noyau commun léger (proposé)

Le modèle est celui des biens, qui fonctionne. **Aucun formulaire universel**, et aucune migration des biens existants :

- **`src/lib/contenus/core.ts`** :
  - statuts `draft → published ↔ withdrawn → archived`, plus les états métier (vendu, loué, indisponible…) ;
  - médias vérifiés : uniquement des images **de ce projet**, non supprimées ;
  - slug fixé à la première publication ;
  - ordre ;
  - journal des changements (qui, quand, quoi) ;
  - droits par projet ;
  - empreinte du contenu.
- **Un module par métier**, chacun avec son schéma `zod`, ses règles de publication et sa fonction d'injection au rendu (`withBiens` existe déjà) :
  - `biens.ts` existe et reste tel quel ;
  - `carte.ts` (restaurant) ;
  - `realisations.ts` (artisans).
- **`withContenus(spec, projectId, opts)`** compose les injections de chaque métier. Elle est appelée aux trois endroits où `withBiens` l'est déjà : aperçu, export, publication.
- **Prestations des salons et cabinets** : pas de nouvelle table. La source reste la section de réglages lue par les moteurs, mais elle est éditée dans un éditeur dédié qui écrit des opérations sur le thème (versionnées, donc restaurables). Les textes « affichés » sont recalculés au rendu.

## 4. Visibilité : aperçu, export, site hébergé

| Étape | Comportement visé |
|---|---|
| Saisie dans le studio | Enregistrée ; visible tout de suite dans l'**aperçu** (comme les biens). Un brouillon n'est visible que dans son propre aperçu (`?es_bien=` existe déjà pour les biens) |
| Site hébergé (#234–#237) | **Inchangé** tant que le client ne republie pas : la publication est figée. Le studio affiche « Modifications non publiées » (comparaison avec l'empreinte de la version en ligne). La publication crée V(n+1). « Remettre en ligne » restaure V(n) avec ses contenus d'alors |
| Export Shopify / WooCommerce / PrestaShop | Contenus inclus dans le thème exporté (sections remplies) ; avertissements conservés pour ce qui demande un module serveur ; aucune compatibilité annoncée sans test |
| Projet sans hébergement | Édition et export habituels, inchangés |

## 5. Dépendances et ordre des PR

- **Base** de chaque phase : la PR de la phase précédente. Chaîne : #234 → #235 → #236 → #237 → P0 → P1 → P2 → P3 → P4.
- **Aucune** dépendance à la branche SYNA. Les API de P4 sont publiées pour que Codex les branche plus tard.
- **Thèmes** : aucune retouche de composition. Les champs ajoutés aux sections (allergènes par plat, disponibilité) sont **facultatifs** et n'affichent rien s'ils sont vides.
- **Données client** : aucune migration automatique. Si un projet réel a déjà une carte ou des réalisations dans ses blocs, la reprise sera proposée et confirmée par le client, jamais forcée.

## 6. Ce qui manque avant de dire « complet »

- Recette réelle des biens avec l'hébergement natif (P1).
- Éditeur des prestations et horaires (P2) ; restaurant (carte) (P2) ; réalisations (P3).
- Indicateur « non publié » et API homogènes (P4).
- Comparaisons pixel des démos sur chaque thème touché (P1–P4).

Hors périmètre : caisse, commande et paiement pour le restaurant, CRM, portails immobiliers externes, nouveau design de thème, assistant IA.
