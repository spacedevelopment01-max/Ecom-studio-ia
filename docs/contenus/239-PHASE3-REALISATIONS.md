# Contenus métier (#239) — Phase 3 : réalisations des artisans

**Base** : phase 2, PR #242 (`4c0fd03b`). **Branche** : `claude/239-p3-realisations`.

Aucun nouveau design ni thème modifié : les réalisations remplissent les sections que les thèmes prévoient déjà, avec les réglages de leurs pages de démonstration.

## 1. Constat (phase 0, A1)

- Réalisations des démonstrations : des blocs de section écrits à la main.
- Sites des clients :
  - APLAT et PHASE : aucune section de réalisations ;
  - Atelier Rive et anciens thèmes de services : des cartes « [À compléter : nom du projet] » ;
  - aucune page « Réalisations », aucune fiche.

## 2. Correction

| Élément | Ce qui est fait |
|---|---|
| **Modèle** | Table `realisations` (`src/lib/contenus/realisations.ts`) : <ul><li>titre, résumé (vignettes), demande du client, travail réalisé ;</li><li>catégorie (filtre), lieu ou zone et date, **affichés seulement s'ils sont saisis** ;</li><li>1 à 12 photos **du projet**, photo « avant » facultative ;</li><li>ordre ;</li><li>états : brouillon, en ligne, retirée, archivée (jamais effacée).</li></ul> Adresse de fiche `/pages/realisation-…` **fixée à la création** : renommer ne casse aucun lien. |
| **Contrôles** | <ul><li>Publier exige une photo et un résumé (ou la description du travail).</li><li>Une réalisation en ligne ne peut pas perdre sa dernière photo.</li><li>Photo d'un autre projet : refusée.</li><li>Photo supprimée de la médiathèque : la réalisation n'est plus montrée, sans fichier manquant.</li><li>Aucun balisage saisi n'est repris (testé).</li></ul> |
| **Onglet « Réalisations »** | <ul><li>Liste ordonnable, badges d'état, avant/après, aperçu de chaque réalisation (un brouillon s'ouvre seul dans l'aperçu).</li><li>Formulaire avec photos choisies dans la médiathèque et description de chaque photo.</li><li>Visible pour Atelier Rive, APLAT et PHASE ; l'adresse de l'onglet reste accessible ailleurs.</li><li>API : `GET` et `POST /api/projects/[id]/realisations` (create, update, status, order), propriétaire seulement.</li></ul> |
| **Injection au rendu** (`withContenus`) | Utilisée par l'aperçu, l'export, la publication et la vérification. <ul><li>**Accueil** : la section du thème (`portfolio`, `ap-cards projects`, `ph-cards projects`) est remplie ; un site client qui n'en avait pas reçoit celle du thème, à l'emplacement de la démonstration.</li><li>**Page « Réalisations »** filtrable par catégorie, avec le mécanisme de filtre de chaque thème.</li><li>**Fiche** pour Rive, APLAT et PHASE : sections de la fiche de démonstration (Rive : `ed-scene` + `fs-case` ; APLAT : en-tête, demande/travail, photos, `ap-compare` ; PHASE : `ph-project` + `ph-columns` + `ph-gallery` + autres réalisations).</li><li>**Appel au devis** : vers la page de devis du site.</li><li>**Menus** : lien après « Prestations ».</li><li>**Anciens thèmes** : galerie seulement, aucune fiche inventée.</li></ul> **Sans réalisation publiée : même objet, rendu identique au pixel** (testé sur les quatre familles). |
| **Hébergement** | <ul><li>Les fiches comptent avec les fiches de biens (`DETAIL_LIMIT`), pas dans la limite des 80 pages.</li><li>« Modifications non publiées » compte les réalisations modifiées.</li></ul> |

## 3. Preuves

### Tests automatiques

- **`tests/realisations-artisans.test.ts` (12/12)** couvre :
  - rendu identique sans réalisation (Rive, APLAT, PHASE, ancien thème) ;
  - accueil, galerie, filtres, fiche, brouillon absent (404) et aperçu d'un brouillon, pour chaque thème ;
  - ancien thème ;
  - contrôles ;
  - balisage refusé ;
  - site hébergé V1 → V2 → restauration V1 ;
  - compte étranger.
- `plan-studio` : passe à 19 espaces.
- **Non régressés** : APLAT, PHASE, Rive, carte, biens et hébergement (62/62 sur ces suites).
- **Suite complète locale** : 3 543 tests réussis, 3 échecs. Les trois viennent des kits de démonstration **privés et incomplets** présents localement dans `public/demo` (ignoré par git) : vignettes anglaises, démo FRAISE. Aucun ne touche au code de cette phase. La CI, sans ces kits, fait foi.
- **Correction de CI de la phase 2** : `plan-studio` attendait 17 espaces alors que la phase 2 en avait ajouté un. Le test a été mis à jour (`4c0fd03b`, PR #242) ; aucun contrôle n'a été retiré.

### Recette sur l'instance isolée

Entreprises fictives : Plâtrerie Fictive Durand (APLAT), Volt Fictif Électricité (PHASE) et Atelier Fictif Lune (Rive). Photos générées, SMTP local.

| Étape | Résultat | Preuves |
|---|---|---|
| APLAT : saisie par le formulaire | 3 réalisations : 2 en ligne, dont une avec avant/après, et 1 brouillon | `p3-01` à `p3-03` |
| Aperçu | <ul><li>Galerie : 2 cartes, filtres « Tout / Peinture / Plâtrerie ».</li><li>Filtre Plâtrerie : la cloison seule.</li><li>Fiche : demande, travail, lieu, date, avant/après.</li><li>Brouillon visible en aperçu seulement.</li></ul> | `p3-04` à `p3-08` |
| Onglet sur téléphone | Lisible | `p3-09` |
| Site V1 (visiteur anonyme, ordinateur et téléphone) | <ul><li>Accueil, galerie, fiche : 200.</li><li>Lien dans le menu.</li><li>Brouillon : 404.</li><li>12 liens internes vérifiés, aucun cassé.</li></ul> | `p3-10` à `p3-12` |
| Devis depuis la fiche | <ul><li>Bouton vers `/pages/devis`.</li><li>Formulaire envoyé (303).</li><li>E-mail « Nouvelle demande de devis de Camille Fictive » reçu par le SMTP local.</li></ul> | `p3-13`, `p3-14` |
| Modification | <ul><li>Site inchangé.</li><li>Bandeau « 1 réalisation(s) modifiée(s) ».</li><li>V2 en ligne, puis **restauration de V1**.</li></ul> | `p3-15`, JSON |
| PHASE et Rive | 2 et 3 réalisations ; sites publiés ; accueil, galerie et fiche à 200 sur ordinateur et téléphone | `p3-22` à `p3-34` |
| Compte étranger | Lecture et ajout : 404 | JSON |

**Corrections faites pendant la recette :**
- PHASE :
  - titre de l'appel final qui chevauchait le bouton ;
  - grand vide sous l'en-tête de la fiche ;
  - étiquette de catégorie mal placée sur les cartes.

  Ces trois points passent par les réglages de la démonstration (taille du titre, hauteur, étiquette).
- Rive : l'appel de la fiche suit le lien « devis » du menu.

## 4. Limites et suites

- **Défauts antérieurs de la composition client PHASE**, que cette phase n'a pas causés et qu'elle ne corrige pas (le thème validé n'est pas modifié) :
  - un nom d'entreprise long chevauche le menu de l'en-tête et le pied de page (`p3-30`, sans réalisation) ; le lien « Réalisations » ajouté au menu rend le chevauchement un peu plus visible (`p3-31`) ;
  - le titre de l'appel final de l'accueil chevauche son bouton ;
  - un espace vide apparaît avant cet appel.

  Les corriger demande une retouche du thème, à valider.
- Pied de page APLAT client : nom en texte sombre sur fond sombre (antérieur).
- Zone d'intervention (A2) : texte libre du profil, déjà repris par les sections d'infos pratiques. Pas de carte inventée.
- Pas de témoignage client attaché à une réalisation, ni de vidéo.
- Fiche d'APLAT avec une seule photo supplémentaire : la mosaïque affiche une demi-largeur.
- Anciens thèmes de services : galerie seulement, sans fiche (leur dessin n'en prévoit pas).
