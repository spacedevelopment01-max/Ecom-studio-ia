# ONDE — refonte en thème E-commerce mono-produit (issue #158)

État de la branche `claude/themes-museau-souple-158`. **Testé en copie isolée seulement : rien n'est fusionné, rien
n'est servi dans le Codespace de Thomas. La refonte attend l'avis de Thomas sur les rendus ordinateur et téléphone
avant toute validation.**

Décision de Thomas du 21 octobre (12 h 58) : ONDE passe dans la famille **E-commerce**, avec une vraie refonte (pas
seulement une étiquette ou une couleur), en réutilisant ses visuels, son logo et son produit existant, sans inventer
d'autres produits ONDE.

## Classement

| Endroit | Avant (référence Pawish) | Maintenant |
|---|---|---|
| Catalogue des thèmes (`kinds`, `REFERENCE_FIT`) | `specialty` | `catalog` |
| Famille de sections (`THEME_FAMILY`) | `specialty` | `catalog` : les 20 fonctions E-commerce |
| Recommandation (`project-handoff/categories.ts`) | `specialized` | `ecommerce` |
| Profil graphique | `conversion_profile: contrast` | `editorial_profile: studio` (nouveau) |
| Manifeste des démos | `category: specialty` | `category: catalog` |
| Exports | `es-conversion-contrast` | `es-editorial-studio` |

Conséquence pour la recommandation : un projet E-commerce se voit proposer quatre thèmes (ONDE, ORBE, HEUREN, ALCÔVE),
une boutique spécialisée cinq (FRAISE, SILLON, NOCTIL, TRAVERSE, MUSEAU CLUB). Aucun n'est choisi à la place du client.

**Aucune migration destructive** : le profil « contrast » et toutes les sections de l'ancienne composition restent dans
le thème ; un projet enregistré qui les utilise les garde. L'ancienne démonstration Pawish reste constructible
(`conversionProject(…, "onde")`) pour les anciens contrôles du lot 2C ; elle n'est plus la démonstration du thème.

## Nouvelle direction visuelle

Profil **« studio »** : graphite profond (fond principal sombre), vert signal en accent, titres **Chivo** serrés (au lieu
d'Inter), texte Inter, sur-titres en vert précédés d'un filet, boutons nets à petits rayons (6 px, au lieu des pastilles
dégradées), cadres à 14 px. Le logo proposé (texte graphite et onde verte) est vectorisé ; sa version claire sert sur le
fond graphite.

En-tête **« Méga menu en colonnes »** (logo à gauche, menu « Le casque » avec ses vues, ses usages et l'aide en colonnes,
encart du casque) et pied **« Plan du catalogue en colonnes »** : deux dispositions de la famille qu'ORBE, HEUREN et
ALCÔVE n'utilisent pas.

## Composition (sections de la bibliothèque E-commerce)

| Page | Sections, dans l'ordre |
|---|---|
| Accueil | **campagne** sur la bannière sombre (titre de page « Écoutez. Posez. Repartez. », deux boutons) · **achat du produit** tout de suite après (vues, « Achat indisponible ») · **un détail** en gros plan (coussinet) · **trois usages** en index (salon, train, studio) · **bandeau d'appel** « Graphite et vert, rien d'autre » · **questions en cartes** · **inscription** |
| Fiche | fiche produit (galerie en carrousel, cadre carré, zoom, barre d'achat) · **les commandes** en gros plan (arceau) · **au studio** (scène à côté de son texte) · questions en cartes |
| Les usages | introduction · salon et train côte à côte · le studio en scène de fermeture |
| Questions et contact | questions numérotées · formulaire de contact |

Aucune section de l'ancienne composition (ouverture produit, bandeaux défilants, cartes, avis fictifs, chiffres,
comparatif d'exemple, garantie d'exemple, stories) n'est reprise : un test le vérifie.

Sur un projet client sans campagne datée, l'ouverture devient une scène avec le titre de la page (la campagne attend une
campagne réelle du client) ; jamais d'accueil sans ouverture ni H1.

## Matrice des médias (kit privé, jamais copié dans le dépôt)

| Fichier | Page · section |
|---|---|
| logo-proposition.png | en-tête et pied (version claire vectorisée), favicon |
| 06-banniere | accueil · campagne d'ouverture |
| 02-fond-clair, 03-autre-angle, 01-hero, 04, 05 | galerie de la fiche ; 02 dans l'achat de l'accueil ; 03 dans l'encart du menu |
| 04-detail-coussinet | accueil · le détail |
| 07-scene-salon, 08-scene-train, 09-scene-studio | accueil · trois usages ; page « Les usages » |
| 01-hero | accueil · bandeau d'appel |
| 05-detail-arceau | fiche · les commandes |
| 09-scene-studio | fiche · au studio |

Le dépôt est **public** : les visuels ONDE viennent du kit privé de Thomas (`public/demo/onde/`, ignoré par git). Ils
sont lus sur place par la démonstration et **aucune capture d'ONDE n'est mise dans le dépôt** ; les rendus sont remis à
Thomas à part.

## Textes : rien d'inventé

Les textes décrivent ce que montrent les visuels : arceau graphite réglable, coussinets noirs en tissu, liserés et
touches verts, un seul coloris ; et les usages photographiés (salon, train, studio). **Jamais affirmés** : prix,
autonomie, temps de charge, connexion, réduction de bruit, poids, contenu de la boîte, garantie, livraison. Leurs blocs
(« Caractéristiques techniques », « Dans la boîte », « Livraison, retours et garantie ») et les questions correspondantes
restent dans l'éditeur, masqués, prêts à compléter. L'ancien prix fictif (149 €) n'est plus affiché : la démonstration
montre « Prix à définir » et « Achat indisponible ».

## Vérifications (copie isolée, kit privé présent)

| Contrôle | Résultat |
|---|---|
| `tsc --noEmit` | sans erreur |
| `vitest run` complet | 326 fichiers, 2550 tests réussis, 2 ignorés, 0 échec |
| Tests dédiés (`tests/onde.test.ts`, `tests/demos-fraise-onde-composition.test.ts`) | famille E-commerce partout, profil « studio », composition figée et sans aucune section de l'ancienne composition, un seul produit sans prix, titre de page, en-tête et pied reconnus, 10 médias, SEO, rien d'inventé, liens, exports ; autre projet : aucune trace de la démo, une ouverture et un seul H1 |
| Theme Check Shopify | ONDE en français, en anglais et en prestations, HEUREN et ALCÔVE : sans erreur (4 avertissements `UnusedAssign` déjà présents partout) |
| Aperçu statique (`reference-static-check`) | 8 pages × 4 largeurs (360, 390, 430, ordinateur) |
| Premiers écrans | à 360 × 640 : accueil (titre, casque entier, deux boutons) et fiche (casque entier, nom, prix, bouton d'achat sous 640 px) |
| Studio réel (`family-studio-check onde`) | galerie limitée aux 20 fonctions E-commerce, ajout, disposition, texte, effets, déplacement, en-tête et pied, sauvegarde et rechargement conservés |
| Choix depuis le studio (`START_DEMO=heuren theme-demo-choice-check … onde`) | démo complète consultée sans modifier le projet, une seule tâche, projet HEUREN complet adapté : 0 emplacement vide, 0 image non chargée, 0 visuel ou texte d'ONDE, rechargement identique |
| Exports WordPress / PrestaShop (`family-export-check`) | profil « studio » actif (`es-editorial-studio`), 0 débordement, 0 erreur de script |

Les tests de la démonstration ONDE ont besoin du kit privé : ils sont ignorés là où il est absent (CI) et ont été exécutés
ici, où il est présent. Rendus ordinateur et téléphone : remis à Thomas à part (kit privé, dépôt public).

## Limites connues

- Rendus à valider par Thomas avant toute validation de la refonte.
- Codespace de Thomas : non vérifié. Exports : contenu et rendu vérifiés, pas d'installation réelle.
- Génération IA d'un nouveau client : non vérifiée (Codex #154).
- Forfaits (Codex #151 / #154) : `onde` passe de `PLAN_THEME_ORDER.specialty` à `PLAN_THEME_ORDER.catalog` au moment de
  réunir les branches ; leur grille n'est pas modifiée ici.
