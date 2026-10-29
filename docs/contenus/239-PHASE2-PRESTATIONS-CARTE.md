# Contenus métier (#239) — Phase 2 : prestations, horaires, réservations et carte du restaurant

**Base** : phase 1, PR #241 (`ce307605`). **Branche** : `claude/239-p2-prestations-carte`.
Aucun nouveau moteur de réservation, aucune caisse, commande, livraison ni paiement.

## 1. Prestations, horaires, intervenants (salon, cabinet, restaurant)

| Problème (phase 0) | Correction |
|---|---|
| R1 — prix et durées à trois endroits, sans synchronisation | **Source unique** : la section de réglages lue par les moteurs (`an-salon`, `pa-cabinet`, `ts-restaurant`). Nouvel éditeur **dédié** (onglet Rendez-vous, « Prestations, horaires… ») à la place du panneau générique, qui reste accessible en « Réglages avancés ». Chaque enregistrement crée une **version du site**, restaurable. Les textes « prix / durée affichés » des autres sections sont remis d'accord quand ils sont remplis (ceux laissés vides sont remplis par le site) |
| R2 — **bug** : prix affiché ÷ 100 dans l'onglet Rendez-vous | Corrigé (45 € s'affichait 0,45 €) |
| R3 — salon client sans intervenant ni horaire, donc aucun créneau | L'éditeur guide la saisie (intervenants, jours, compétences, horaires par jour) et avertit « Aucun intervenant : aucun créneau » |
| R4 — restaurant : créneaux et capacité par défaut | Signalés comme « valeurs proposées par le studio » jusqu'à ce qu'ils soient modifiés ; formats contrôlés ; minimum ≤ maximum |
| R5 — réservations existantes | Une prestation qui a des **rendez-vous à venir ne peut pas être supprimée** (message clair). Un changement de durée est signalé ; les rendez-vous pris gardent nom, prix et durée enregistrés |
| Constat de recette — salon refusé à la publication, message peu clair (« Page /pages/prendre-rendez-vous : [À renseigner] ») | L'**adresse de l'établissement** est désormais dans l'éditeur. Si elle manque : refus **explicite** qui dit où la saisir. Une fois saisie, elle remplace aussi le texte de secours de la confirmation, que voient les visiteurs sans JavaScript |

Fichiers : `src/lib/contenus/prestations.ts`, `src/app/api/projects/[id]/prestations/route.ts`, `src/components/studio/prestations-editor.tsx`, `tab-rendez-vous.tsx`, `sites/publish.ts` (`bookingBlockers`).

## 2. Carte du restaurant (TABLE SAISON)

| Problème (phase 0) | Correction |
|---|---|
| M1 — carte = blocs de section, prix en texte, allergènes globaux, aucun éditeur, page vide en brouillon chez un client | **Onglet « Carte »**, visible seulement pour un restaurant. Il gère : <ul><li>catégories : ajout, renommage, ordre, suppression si vide ;</li><li>plats : nom, description, prix **ou** mention (« selon arrivage »), végétarien, **allergènes déclarés par le restaurateur**, disponible ou indisponible, « sélection du moment » avec une photo **du projet** ;</li><li>états : brouillon, en ligne, retiré, archivé.</li></ul> |
| Affichage | Injection **au rendu** dans les sections existantes `ts-menu` (catégories et plats) et `ts-dishes` (sélection du moment), comme pour les biens, via `withContenus` (biens et carte) : aperçu, export, publication, vérification. La page « La carte » cesse d'être un brouillon dès qu'un plat est en ligne. **Sans carte publiée : même objet, rendu identique au pixel** (démos intactes, testé) |
| Hébergement | « Modifications non publiées » compte aussi la carte ; V1, puis V2, puis restauration |

Les allergènes sont affichés tels que déclarés. Le studio ne vérifie ni ne certifie rien, et l'onglet le dit.

Fichiers : `src/lib/contenus/carte.ts`, `src/lib/contenus/index.ts`, `src/app/api/projects/[id]/carte/route.ts`, `src/components/studio/tab-carte.tsx`, ainsi que la navigation (`studio-nav.ts`, `shell.tsx`, `tabs.tsx`, page des onglets). `withBiens` est remplacé par `withContenus` dans l'aperçu, l'export et la publication.

## 3. Preuves

### Tests automatiques

- **`tests/prestations-editeur.test.ts` (7/7)** couvre :
  - prix et durée changés une fois : le moteur, les textes affichés et la version du site sont d'accord, et le rendez-vous confirmé reste intact ;
  - suppression refusée si des rendez-vous sont à venir ;
  - nouvelle prestation ;
  - horaires, fermetures, intervenants et adresse validés ;
  - texte de secours de la confirmation ;
  - cabinet et restaurant ;
  - refus d'adresse explicite ;
  - droits.
- **`tests/carte-restaurant.test.ts` (5/5)** couvre :
  - rendu identique sans carte ;
  - carte complète ;
  - brouillon, indisponible et archivé absents ;
  - sélection du moment ;
  - contrôles (prix, photo d'un autre projet, catégorie non vide) ;
  - site hébergé V1, V2 puis restauration ;
  - droits.
- **Non régressés** : réservations salon, cabinet et restaurant, thèmes TABLE SAISON, PARENTHÈSE et ATELIER NUANCE, aperçu, exports, hébergement et biens. 137 tests au total sur ces suites. Types OK.

### Recette sur l'instance isolée

Studio compilé, proxy HTTPS local. Entreprises fictives : « Salon Fil d'Or » (ATELIER NUANCE) et « La Treille Fictive » (TABLE SAISON).

| Étape | Résultat | Preuves |
|---|---|---|
| Salon : éditeur | Avertissement « aucun intervenant ». Intervenante Inès, horaires du mardi au samedi, prix 38 €, 45 min et adresse saisis : version enregistrée | `p2-01`, `p2-02` |
| Salon : publication | 1ʳᵉ passe : refus peu clair (adresse vide, puis texte de secours) → corrigé (`c19c3fc3`, `f37805e9`) → 2ᵉ passe : **publié** | `p2b-salon.json` |
| Salon : vraie réservation depuis le site publié (API publique du site, autre origine) | **201**, rendez-vous AN-2026-…, intervenante Inès, 38 €, 45 min | `p2b-salon.json` |
| Salon : prestation réservée | Badge « 1 RDV à venir ». Suppression **refusée** avec un message clair. Prix et durée changés : avertissement ; **rendez-vous intact (09:00–09:45)** | `p2-03`, `p2-04` |
| Restaurant : onglet Carte | 3 catégories et 4 plats saisis par le formulaire ; photo du projet ; tartare indisponible | `p2-05`, `p2-10` (téléphone) |
| Restaurant : aperçu de « La carte » | Plats, allergènes déclarés, « selon arrivage » ; tartare masqué (ordinateur et téléphone) | `p2-06-*` |
| Restaurant : réservations | « Valeurs proposées par le studio » signalées, puis capacité 32 confirmée | `p2-07` |
| Restaurant : site V1 | « La carte » en ligne, 200, ordinateur et téléphone | `p2-08-*` |
| Restaurant : prix modifié | Site public inchangé (9 €), « 1 élément(s) de la carte modifié(s) » ; V2 → 10,50 € ; **restauration V1 → 9 €** | `p2-09`, `p2-prestations-carte.json` |
| Compte étranger | Carte, prestations et ajout : 404 | `p2-prestations-carte.json` |

L'e-mail de confirmation de la réservation du salon est noté « failed » : le SMTP local n'était pas lancé pendant cette passe. La réservation est bien enregistrée.

## 4. Limites et suites

- L'**adresse** existe encore à deux endroits : le profil d'activité (pied de page, contact) et les réglages de réservation (confirmation). La composition copie la première dans la seconde, mais une modification ultérieure du profil ne suit pas. À rapprocher en phase 4.
- Les notifications des réservations gardent leur propre adresse e-mail. Celles des demandes de devis (#235) sont distinctes.
- Ateliers du cabinet : pas d'édition dédiée dans ce lot (panneau avancé). Le changement de date d'un atelier qui a des inscrits n'est pas encore protégé.
- Carte : pas de menus du jour datés ni de formules. Pas de gestion par service (midi / soir).
- Une **prestation du profil** (texte) et celle des réglages restent distinctes pour les thèmes de réservation. Les réglages font foi ; le profil ne sert qu'à la première composition.
