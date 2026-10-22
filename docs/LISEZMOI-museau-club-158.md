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
  emplacements d'image vides de la capture précédente). Captures : `docs/preuves/museau-club-159/adaptation-client/`.
- **Correction trouvée par cette preuve** : sur un projet qui n'a pas situé ses produits sur une scène, les points
  interactifs restaient masqués et l'accueil n'avait plus d'ouverture ni de H1. L'ouverture devient alors une bannière
  avec le titre de la page (et la bannière de balade n'est pas répétée).
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

Commit testé : **`9f1360b5`** (le commit suivant n'ajoute que ce rapport et les captures). Tout est exécuté en copie
isolée.

| Contrôle | Résultat |
|---|---|
| Compilation TypeScript (`tsc --noEmit`) | sans erreur |
| Tests (`vitest run`, suite complète) | **325 fichiers, 2536 tests réussis**, 2 ignorés (déjà ignorés avant), 0 échec |
| Tests dédiés (`tests/museau-club.test.ts`) | 18 réussis : famille spécialisée partout, profil « club » de la famille, réglages facultatifs des points interactifs, composition distincte des autres thèmes de la famille, quatre produits et leurs fiches, repères reliés à la bonne fiche, en-tête et pied reconnus, 31 médias, SEO, rien d'inventé, achat sans prix et avec prix de test, liens internes, autre projet (ouverture visible, un seul H1, aucune trace de la démo), exports |
| Theme Check officiel Shopify | **7 contrôles sur 7 sans erreur** (MUSEAU CLUB : français et anglais en quatre produits, français en un produit, prestations ; TRAVERSE, FRAISE et SILLON, qui partagent la section « Points interactifs » ou le profil de la famille) ; seuls les 4 avertissements `UnusedAssign` déjà présents sur tous les thèmes |
| Contrôle statique de l'aperçu (`reference-static-check`) | 11 pages × 4 largeurs (360, 390, 430, ordinateur) réussies |
| Premiers écrans (mesures dans `docs/preuves/museau-club-159/mesures-premier-ecran.json`) | voir le tableau « Premier écran du téléphone » : à 360 × 640, accueil complet et bouton d'achat des quatre fiches sous 640 px ; aucun débordement à 360, 390 et 430 |
| Studio réel (`family-studio-check museau-club`) | galerie limitée aux 20 fonctions de la boutique spécialisée, fonction d'une autre famille introuvable, ajout, disposition, texte, effets, déplacement, en-tête « floating » puis pied « centered » appliqués et modifiés, **sauvegarde puis rechargement conservés** |
| Choix depuis le studio réel, projet complet (`START_DEMO=traverse theme-demo-choice-check … museau-club`) | démo complète consultée sans modifier le projet, « Choisir ce thème » = une seule tâche et une seule version ; projet TRAVERSE adapté : accueil, fiche et deux pages en pleine page, ordinateur et téléphone, **0 emplacement d'image vide, 0 image non chargée, 0 visuel ni texte de MUSEAU CLUB, 0 débordement**, version identique après rechargement |
| Exports WordPress et PrestaShop (`family-export-check`) | profil `club` actif (`es-conversion-club`), repères interactifs fonctionnels, 0 débordement, 0 erreur de script ; autres thèmes inchangés |

Ce qui n'est **pas** vérifié : la génération IA des textes et des visuels d'un nouveau client (Codex #154) ;
l'installation réelle des exports chez un hébergeur ; le Codespace de Thomas.

Ce que montre la preuve d'adaptation, honnêtement : sur le projet TRAVERSE, la section « Questions » reste masquée
(aucune question enregistrée dans ce projet) et la grille des produits garde son sur-titre générique « À associer » ;
le pied de page conserve le grand nom de marque choisi auparavant par le projet (réglage du client conservé).

## Capture FRAISE publiée par erreur

- Fichier : `docs/preuves/museau-club-159/adaptation-client/choix-museau-club-09-demo-fraise-ordinateur.jpg` (capture du
  parcours de choix montrant la démonstration FRAISE, dont les visuels viennent du kit privé de Thomas).
- Publié dans le commit `98ede49a` ; retiré de la branche par le commit `4bf4827f` (le contrôle n'est pas changé).
- Il reste lisible dans l'historique de la branche et sur GitHub par ce commit. Aucune réécriture d'historique n'est faite
  (consigne du 21 octobre) ; une éventuelle purge est une décision séparée, et même une réécriture ne garantirait pas
  la disparition de toutes les copies déjà faites.
- Depuis : seules les captures MUSEAU CLUB et SOUPLE (médias publiables) vont dans le dépôt ; celles d'ONDE et de FRAISE
  sont remises à Thomas à part.

## Limites connues

- Codespace de Thomas : non vérifié (hôte inaccessible depuis cet environnement).
- Exports : contenu des ZIP et rendu vérifiés, pas d'installation chez un vrai hébergeur.
- La page « boutique » du thème n'a pas de fil d'Ariane structuré (vrai pour tous les thèmes).
- Génération IA d'un projet client : non vérifiée (dépendance Codex #154).
- **La composition n'est pas déclarée validée** : elle attend l'avis de Thomas.
