# MUSEAU CLUB — thème de la famille E-commerce, quatre produits (issue #158)

État de la branche `claude/themes-museau-souple-158`. **Testé en copie isolée seulement : rien n'est fusionné, rien
n'est servi dans le Codespace de Thomas. La composition reste à valider par Thomas.** Consigne du 21 octobre : un thème
après l'autre ; MUSEAU CLUB d'abord, SOUPLE ensuite.

## Classement : famille E-commerce, quatre produits

MUSEAU CLUB appartient à la **famille E-commerce** (celle d'ORBE, HEUREN et ALCÔVE). La niche (accessoires pour chiens)
ne le classe pas en « Produit spécifique » ni en « Boutique spécialisée » :

| Endroit | Valeur |
|---|---|
| Catalogue des thèmes (`kinds`, `REFERENCE_FIT`) | `catalog` (E-commerce) |
| Famille de sections (`THEME_FAMILY`) | `catalog` : seules les 20 fonctions E-commerce sont proposées |
| Recommandation (`project-handoff/categories.ts`) | `ecommerce` |
| Démonstration | projet `storeKind: catalog`, `store_type: multi`, **exactement quatre produits** |
| Exports | profil éditorial `es-editorial-club` |

Identifiant : **`museau-club`**. Il suit la convention des dossiers de médias (`public/theme-assets/museau-club/`) ; le
trait d'union est accepté partout (classe `dir-museau-club`, routes des démos, réglage `style_preset`).

Conséquence : un projet E-commerce se voit désormais proposer **quatre** thèmes (ORBE, HEUREN, ALCÔVE, MUSEAU CLUB), aucun
n'étant choisi à sa place. Les quatre produits sont ceux de la démonstration : une boutique cliente garde ses propres
produits, en nombre libre.

## Base de travail et dépendances

- Branche partie de `b73995aa`, tête de la PR #157 (HEUREN, ALCÔVE et les finitions #157), elle-même posée sur #153 →
  #149 → #147, **aucune n'étant fusionnée**. Ordre de fusion conseillé : #147 → #149 → #153 → #157 → cette PR.
- Médias : commit `8260bafd` de `assets/museau-club-souple-complet-20261021`, repris par cherry-pick (`53448b1b`), sans
  code applicatif. SOUPLE (`9cc0b97e`) n'est pas encore repris : il le sera pour la seconde étape.
- Forfaits (Codex #151 / #154) : **non touchés**. Identifiant à transmettre à Codex : `museau-club`, famille `catalog`
  (catégorie `ecommerce`), à inscrire dans une place libre de `PLAN_THEME_ORDER.catalog` au moment de réunir les branches.

## Médias : 31 sur 31 conformes

Les 31 fichiers `theme: museau-club` du manifeste `docs/theme-assets/museau-club-souple-manifest.json` sont présents, non
vides, avec octets, dimensions et SHA-256 identiques. Chaque image a été regardée : harnais, laisse, collier et pochette
bleu cobalt, cinq vues chacun ; dix ambiances (chiens présents, aucune personne, aucune main, aucune marque externe). Le
logo est transparent (80 % des pixels). `ambiance-03` est bien la scène corrigée de la console.

## Direction artistique

- Profil éditorial **« club »** : crème et bleu cobalt, titres épais et serrés (Archivo 800), texte Karla, sur-titres en
  pastille, photos et cartes aux coins arrondis, boutons en pastille ; jaune du socle de l'ambiance 06 en accent.
- En-tête **« Collections en cartes »** (logo centré sur deux rangées, les quatre produits en cartes dans le menu) et pied
  **« Plan du catalogue en colonnes »** : deux dispositions de la famille E-commerce qu'ORBE, HEUREN et ALCÔVE n'utilisent
  pas.
- Fiche : galerie empilée en cadre carré (chaque vue montre le produit entier), zoom, barre d'achat, rangée « La
  collection assortie » qui relie les quatre fiches.

## Composition (sections réelles de la bibliothèque E-commerce)

| Page | Sections, dans l'ordre |
|---|---|
| Accueil | lookbook « scène et liste » en ouverture (titre H1, quatre repères, un par produit) · grille des quatre produits · panorama de balade · image et texte · produit à la une (pochette) · bandeau d'appel · questions en lignes · inscription illustrée |
| Fiche (×4, chacune son modèle) | fiche produit (titre, prix, bouton, texte, points, rangée « La collection assortie ») · scène propre au produit · questions en cartes · les trois autres pièces (recommandations) |
| La balade | intro · lookbook « repères » (harnais et pochette) · index de trois moments · image et texte (pochette) · scène de fermeture (la collection) |
| Questions et contact | questions numérotées · formulaire de contact |
| Boutique, recherche, panier | modèles du thème : la collection « all » contient les quatre produits, sans filtre ni catégorie artificielle |

L'ouverture n'utilise ni l'arche d'ALCÔVE ni les ouvertures d'ORBE et HEUREN. Pour cela, le lookbook a reçu un réglage
« Niveau du titre » (titre de page / de section, h2 par défaut : aucun autre thème ne change).

## Matrice des médias

| Fichier | Produit | Page · section |
|---|---|---|
| logo | — | en-tête, favicon |
| harnais-01 à 05 | harnais | fiche harnais (01 trois quarts, 02 profil, 05 à plat, 03 maille, 04 boucle) ; 01 aussi en carte (grille, menu, recommandations) |
| laisse-01 à 05 | laisse | fiche laisse (01 dépliée, 02 enroulée, 05 à plat, 04 poignée, 03 mousqueton) |
| collier-01 à 05 | collier | fiche collier (01 fermé, 02 ouvert, 05 à plat, 03 anneau et étiquette, 04 intérieur) |
| pochette-01 à 05 | pochette | fiche pochette (01 fermée, 02 fond poudré, 03 ouverte, 05 sac sorti, 04 mousqueton) ; produit à la une de l'accueil |
| ambiance-01 | les quatre | accueil · ouverture (repères vers les quatre fiches) ; La balade · fermeture |
| ambiance-02 | harnais | accueil · panorama « dans l'herbe au soleil » |
| ambiance-03 | laisse, pochette | accueil · bandeau d'appel « Prêts avant même de sortir » |
| ambiance-04 | collier | accueil · « Le collier, porté » |
| ambiance-05 | harnais, laisse | fiche harnais · scène ; La balade · « Au soleil » |
| ambiance-06 | pochette | La balade · « Toujours à portée de main » |
| ambiance-07 | collier, laisse | fiche laisse · scène ; La balade · « Au parc » |
| ambiance-08 | harnais, pochette | fiche pochette · scène ; La balade · repères |
| ambiance-09 | harnais | accueil · inscription ; La balade · « Avant de sortir » |
| ambiance-10 | les quatre | fiche collier · « Avec les trois autres pièces » (le coffret n'est ni un produit ni une offre) |

Aucune image n'apparaît dans deux sections qui se suivent (vérifié par test). Les liens des scènes mènent à la vraie
fiche du produit montré, ou à la collection quand plusieurs pièces sont visibles.

## Textes, honnêteté et SEO

Les textes décrivent ce que montrent les photos : sangles bleu cobalt, maille crème, boucles noires, anneaux et
mousquetons argentés, étiquette MUSEAU CLUB, zip bordé de crème, ouverture ronde de la pochette, rouleau de sacs rangé à
l'intérieur. **Jamais affirmés** : prix, tailles, matières, résistance, sécurité, entretien, sacs fournis, livraison,
garantie. Leurs blocs (« Tailles et mesures », « Matières et entretien », « Livraison, retours et garantie ») et les
questions correspondantes restent dans l'éditeur, masqués, prêts à compléter.

Chaque page a un H1, un titre et une description uniques (la page boutique prend maintenant la description de sa
collection au lieu de celle du produit principal), un lien canonique, un texte alternatif sur chaque image, et l'aperçu
n'est pas indexable.

## Achat

- Sans prix (la démonstration) : sur les quatre fiches et dans le produit à la une, le bouton affiche « Achat
  indisponible », désactivé, avec la note « Prix à définir » ; la barre mobile fait de même.
- Avec des prix de test, dans une copie isolée et jamais publiés : quatre identifiants distincts (1000, 2000, 3000, 4000),
  bon article sur chaque ligne, quantités respectées, total exact (179,00 €), suppression d'une ligne (164,00 €) et
  changement de quantité (125,00 €) vérifiés par test.

## Vérifications

Commit testé : **`df194281`** (le commit suivant ne touche que ce rapport). Tout est exécuté en copie isolée.

| Contrôle | Résultat |
|---|---|
| Compilation TypeScript (`tsc --noEmit`) | sans erreur |
| Tests (`vitest run`, suite complète) | **325 fichiers, 2536 tests réussis**, 2 ignorés (déjà ignorés avant), 0 échec |
| Tests dédiés (`tests/museau-club.test.ts`) | 18 réussis : famille E-commerce partout, quatre produits distincts, une fiche par produit (vues, texte, points propres), repères vers le bon produit, en-tête et pied reconnus, 31 médias utilisés sans répétition successive, SEO, rien d'inventé, achat sans prix et avec prix de test, liens internes, autre projet sans trace de la démo, exports |
| Theme Check officiel Shopify | **7 contrôles sur 7 sans erreur** (MUSEAU CLUB en français, en anglais et en prestations ; HEUREN et ORBE en français et en anglais) ; seuls les 4 avertissements `UnusedAssign` déjà présents sur tous les thèmes |
| Captures pleine page | 11 pages (accueil, boutique, 4 fiches, La balade, aide, panier, recherche, 404) à 1440, 430, 390 et 360 px : **aucun débordement horizontal**, images chargées |
| Contrôle statique de l'aperçu livré | 11 pages × 4 largeurs réussies |
| Premiers écrans | 390 × 844 : accueil (marque, titre, bouton, scène) et fiches (produit entier, titre, bouton) visibles ; 360 × 640 : produit entier et titre visibles, bouton d'achat 36 px sous le pli (la barre d'achat prend le relais au défilement) |
| Interactions (aperçu livré) | menu téléphone ; menu en cartes avec photos ; 4 repères → 4 bonnes fiches ; galerie et zoom ; rangée « La collection assortie » (pièce affichée encadrée, lien vers une autre fiche) ; recommandations = les 3 autres pièces ; recherche ; boutique : 4 cartes, aucun filtre ; FAQ ; formulaire de contact en mode démonstration ; barre d'achat 63 px « Achat indisponible » désactivée ; **0 erreur JavaScript** |
| Choix depuis le studio réel (`theme-demo-choice-check`) | démo complète consultée avant le choix (ordinateur et téléphone, menu, fiche, page « La balade »), projet inchangé pendant la visite, « Choisir ce thème » = une seule tâche, adaptation sans contenu de démo, guide des informations à compléter |
| Studio réel (`family-studio-check`) | 13 étapes réussies : galerie limitée aux 20 fonctions E-commerce, fonction d'une autre famille introuvable, ajout, disposition, texte, effets, mouvement réduit, déplacement, en-tête et pied de page, **sauvegarde puis rechargement conservés** |
| Exports WordPress et PrestaShop (`family-export-check`) | profil `club` présent, repères actifs, 0 débordement, 0 erreur de script (et les autres thèmes inchangés) |
| Export de démonstration final | 12 pages, aucune image manquante (`resume.json` : commit `df194281`) |

Ce qui n'est **pas** vérifié : l'installation réelle des exports chez un hébergeur WordPress ou une boutique PrestaShop
(seuls le contenu des fichiers et leur rendu dans un navigateur le sont) ; le Codespace de Thomas.

## Limites connues

- Codespace de Thomas : non vérifié (hôte inaccessible depuis cet environnement) ; tout est testé en copie isolée.
- Exports : contenu des ZIP et rendu vérifiés, **pas d'installation chez un vrai fournisseur**.
- La page « boutique » du thème n'a pas de fil d'Ariane structuré (vrai pour tous les thèmes).
- Sur un très petit écran (360 × 640), le bouton d'achat d'une fiche est juste sous le pli ; il apparaît au premier défilement.
- Grille des forfaits de Codex (#151) : MUSEAU CLUB reste à y inscrire au moment de la réunion des branches.
- SOUPLE : seconde étape, pas encore commencée.
- **La composition n'est pas déclarée validée** : elle attend l'avis de Thomas.
