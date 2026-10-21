# MUSEAU CLUB — thème « Produit spécifique / Boutique spécialisée », quatre produits (issue #158)

État de la branche `claude/themes-museau-souple-158`. **Testé en copie isolée seulement : rien n'est fusionné, rien
n'est servi dans le Codespace de Thomas. La composition reste à valider par Thomas.**

Décision de Thomas du 21 octobre (12 h 58, issue #158), qui **remplace** le premier classement E-commerce : MUSEAU CLUB
passe dans la famille **Produit spécifique / Boutique spécialisée** ; ONDE sera repris en E-commerce, SOUPLE reste
E-commerce. Ordre : MUSEAU CLUB (reclassement et finitions de la revue PR #159), puis ONDE, puis SOUPLE.

## Classement : famille « Boutique spécialisée », quatre produits

| Endroit | Avant (E-commerce) | Maintenant |
|---|---|---|
| Catalogue des thèmes (`kinds`, `REFERENCE_FIT`) | `catalog` | `specialty` |
| Famille de sections (`THEME_FAMILY`) | `catalog` | `specialty` : seules les 20 fonctions de la boutique spécialisée sont proposées |
| Recommandation (`project-handoff/categories.ts`) | `ecommerce` | `specialized` |
| Profil graphique | `editorial_profile: club` | `conversion_profile: club` (profil de la famille, comme FRAISE, SILLON, NOCTIL, TRAVERSE) |
| Compatibilité des sections (`section-fit.ts`) | thèmes « éditoriaux » | thèmes « conversion » (les sections `cv-*` lui sont proposées) |
| Démonstration | `storeKind: catalog` | `storeKind: specialty`, `store_type: multi`, **toujours quatre produits** |
| Manifeste des démos | `category: catalog` | `category: specialty` |
| Exports | `es-editorial-club` | `es-conversion-club` |

Identifiant inchangé : **`museau-club`**. Conséquence pour la recommandation : un projet « boutique spécialisée » se voit
proposer six thèmes (FRAISE, ONDE, SILLON, NOCTIL, TRAVERSE, MUSEAU CLUB), un projet E-commerce trois (ORBE, HEUREN,
ALCÔVE) ; aucun n'est choisi à la place du client. ONDE est encore compté en boutique spécialisée : il changera avec sa
refonte.

**Aucune migration destructive.** Le profil éditorial « club » n'a jamais été publié (branche non fusionnée) : il est
remplacé par le profil « club » de la famille. Aucun projet enregistré n'est réécrit ; aucune section du thème n'est
supprimée (`fs-lookbook`, `ed-scene`, `ed-diptych` restent rendues pour tout projet qui les utilise).

## Ce qui a changé dans la composition (même base, sections de la famille)

Les quatre produits, les 31 médias, le logo, l'ordre des pages et les rôles de chaque section sont conservés. Seules les
sections propres à l'E-commerce sont remplacées par leur équivalent de la bibliothèque « Boutique spécialisée » :

| Où | Avant (E-commerce) | Maintenant (fonction de la famille) |
|---|---|---|
| Accueil · ouverture | lookbook « scène et liste », 4 repères | **Points interactifs** (« Détails du produit », disposition côte à côte) : titre de page, bouton, 4 repères, chacun relié à SA fiche, liste des pièces |
| Accueil · balade | scène en panorama | **Bannière** sur photo (« Présentation principale », disposition « Fond ») |
| Fiches · scène | scène côte à côte | **Situations d'utilisation** (alternance, visuel à gauche) |
| Fiches · recommandations | produits similaires | « Produits complémentaires » (les trois autres pièces) |
| La balade · repères | lookbook « repères » | **Points interactifs** (liste dessous), 2 repères reliés aux fiches |
| La balade · trois moments | index du diptyque | **Situations d'utilisation** en alternance (3 moments) |
| La balade · fermeture | scène de fermeture | **Bannière** sur photo |
| Inchangé | grille des produits, image et texte, produit à la une, bandeau d'appel, questions, inscription illustrée, formulaire de contact | — |

Pour garder les repères reliés aux fiches et le titre de page en ouverture, la section « Points interactifs » a reçu
quatre **réglages facultatifs** : niveau du titre (h2 par défaut), bouton (vide par défaut), lien de chaque point (vide
par défaut) et libellé de ce lien. Les thèmes qui l'utilisaient déjà (SILLON, TRAVERSE) ne changent pas.

En-tête « **Deux rangées avec offre** » (disposition de la famille ; c'était déjà l'allure d'origine de MUSEAU CLUB : logo
centré en tête, menu dessous) : le sous-menu « La collection » montre les quatre pièces et l'encart « Les quatre pièces
assorties » (ambiance 10), repris en tête du menu du téléphone. Pied « **Colonnes d'aide et d'informations** » (la
collection, l'aide). TRAVERSE utilise aussi les deux rangées, mais avec un pied en carte : le couple en-tête / pied reste
propre à chaque thème (vérifié par test).

## Finitions de la revue PR #159

### Premier écran du téléphone

| Écran | Avant | Après |
|---|---|---|
| Accueil 360 × 640 | titre y = 168–288, bouton 441–492, **scène 520–700 (coupée)** | titre 165–266, **scène entière 280–462**, bouton 476–532 ; texte d'introduction et liste des pièces juste après |
| Fiches 360 × 640 (harnais, laisse, collier) | titre 546–613, **bouton 676–742** | titre 449–501, **bouton 554–637** |
| Fiche pochette 360 × 640 | titre 546–647 (3 lignes), **bouton 709–776** | titre 449–501 (2 lignes), **bouton 554–637** |
| 390 × 844 / 430 × 932 | — | bouton des fiches à 579–637 / 612–670 ; accueil complet (titre, scène, bouton) ; aucun débordement |

Sur téléphone seulement : vues de la galerie en 5:4 (le produit reste entier, sans recadrage), vignettes de 48 px,
espacements et titre resserrés ; sur l'accueil, l'ordre devient titre → scène → bouton → texte → liste. L'ordinateur
garde sa disposition.

### Textes

Les titres qui décrivaient la photo sont remplacés par des usages et la collection coordonnée, sans rien inventer
(aucune performance, matière, sécurité, garantie ni bénéfice) : « Le harnais, pour chaque promenade » (au lieu de « Le
harnais, dans l'herbe au soleil »), « Le collier, pour tous les jours » (au lieu de « Le collier, porté »), titre
d'ouverture « Tout pour la balade, assorti en bleu cobalt », textes courts des fiches (« il s'enfile avant de sortir et
reçoit sur son anneau la laisse du même bleu »…), scènes des fiches « L'ensemble ».

### Captures avant / après

Commit distinct : `docs/preuves/museau-club-159/` (accueil et quatre fiches à 360 × 640, 390 × 844 et 430 × 932, avant et
après ; accueil et fiche sur ordinateur ; menu).

## Adaptation à un projet client : périmètre

- **Démonstration** : le projet MUSEAU CLUB est rédigé à la main (`tests/museau-souple-fixtures.ts`) à partir des visuels
  fournis par Thomas. Il ne passe pas par la génération du studio.
- **Projet d'un client** : « Choisir ce thème » lance la tâche `shop.direction` du worker, qui recompose la boutique
  avec le **moteur local, sans IA**, à partir de ce que le projet possède déjà (marque, produit, textes, visuels). Les
  sections sans contenu restent masquées, aucun contenu ni visuel de MUSEAU CLUB n'est repris.
- **Preuve sur un projet complet** : `START_DEMO=traverse` dans `scripts/theme-demo-choice-check.ts` part d'un projet
  rempli et cohérent (marque, produit, textes et visuels propres) au lieu d'« Atelier Verre » (presque vide, d'où les
  emplacements d'image vides de la capture précédente). Résultats dans la section « Vérifications ».
- **Non validé ici** : la création des textes et des visuels d'un nouveau client par l'IA (parcours amont, génération
  d'images). Ce chemin dépend du travail de Codex (#154) ; la sélection d'un thème ne le prouve pas.
- **À transmettre à Codex (#151 / #154)** : `museau-club` est maintenant de la famille `specialty` (catégorie
  `specialized`), à placer dans `PLAN_THEME_ORDER.specialty` au moment de réunir les branches (et non plus dans
  `catalog`). Rien n'est modifié dans leur grille des forfaits.

## Médias : 31 sur 31 conformes

Inchangé : les 31 fichiers du manifeste `docs/theme-assets/museau-club-souple-manifest.json` sont présents, avec octets,
dimensions et SHA-256 identiques (commit `8260bafd`, repris par cherry-pick). Chiens présents, aucune personne, aucune
marque externe.

## Achat

Sans prix (la démonstration) : « Achat indisponible », désactivé, avec « Prix à définir », sur les quatre fiches, le
produit à la une et la barre mobile. Avec des prix de test, dans une copie isolée jamais publiée : quatre articles,
quantités, suppression et total exact vérifiés par test (179 €, 164 €, 125 €).

## Vérifications

Voir le commentaire de la PR #159 pour le commit testé et les résultats de chaque contrôle.

## Limites connues

- Codespace de Thomas : non vérifié (hôte inaccessible depuis cet environnement).
- Exports : contenu des ZIP et rendu vérifiés, pas d'installation chez un vrai hébergeur.
- La page « boutique » du thème n'a pas de fil d'Ariane structuré (vrai pour tous les thèmes).
- Génération IA d'un projet client : non vérifiée (dépendance Codex #154).
- **La composition n'est pas déclarée validée** : elle attend l'avis de Thomas.
