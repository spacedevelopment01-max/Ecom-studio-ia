# SOUPLE — thème E-commerce de collection, quatre produits (issue #158)

État de la branche `claude/themes-museau-souple-158`. **Testé en copie isolée seulement : rien n'est fusionné, rien
n'est servi dans le Codespace de Thomas. Le thème attend l'avis de Thomas sur les rendus ordinateur et téléphone avant
toute validation.**

Consigne du 21 octobre (16 h 02) : SOUPLE appartient à la **famille E-commerce**, et cela doit se voir dans sa
composition (pas seulement dans une étiquette) ; ne pas reprendre la composition Produit spécifique de MUSEAU CLUB.

## Médias

Lot `assets/museau-club-souple-complet-20261021`, commit `9cc0b97e`, repris tel quel (commit `4ac8c02c`) dans
`public/theme-assets/souple/` : **31 fichiers vérifiés contre le manifeste** `docs/theme-assets/museau-club-souple-manifest.json`
(empreinte SHA-256, taille, dimensions : 31/31). Objets seuls, aucune personne ni autre marque. Le dépôt étant public,
seuls ces médias SOUPLE (et les captures SOUPLE) y sont publiés.

## Classement

| Endroit | Valeur |
|---|---|
| Catalogue des thèmes (`kinds`, `REFERENCE_FIT`) | `catalog` |
| Famille de sections (`THEME_FAMILY`) | `catalog` : les 20 fonctions E-commerce |
| Recommandation (`project-handoff/categories.ts`) | `ecommerce` |
| Profil graphique | `editorial_profile: poudre` (nouveau) |
| Manifeste des démos | `category: catalog`, `storeType: multi`, 4 produits |
| Exports | `es-editorial-poudre` |

Un projet E-commerce se voit désormais proposer cinq thèmes (ONDE, ORBE, HEUREN, ALCÔVE, SOUPLE) ; aucun n'est choisi à
sa place. Forfaits (Codex #151 / #154) : `souple` est à ajouter à `PLAN_THEME_ORDER.catalog` au moment de réunir les
branches ; leur grille n'est pas modifiée ici.

## Direction visuelle

Profil **« poudre »** : fond ivoire rosé, rose poudré, prune profond, un quatrième fond couleur liège ; titres
**Playfair Display** fins (italique prune en accent), texte **Jost** ; sur-titres espacés précédés d'un point ; cadres
doux à 18 px, boutons à 10 px, boutons secondaires en contour prune. Couple de polices propre au catalogue.

En-tête **« Collections en cartes »** de la famille E-commerce (logo en tête, menu dessous ; « La collection » ouvre les
quatre pièces en cartes illustrées et l'encart de la collection ; tuiles sur téléphone) et pied **« Boutique
éditoriale »** (grande signature SOUPLE, liens de la collection et de l'aide) : les deux dispositions de la famille
qu'ORBE, ONDE, HEUREN et ALCÔVE n'utilisaient pas.

## Composition (sections de la bibliothèque E-commerce)

| Page | Sections, dans l'ordre |
|---|---|
| Accueil | **mosaïque de la collection** en ouverture (titre de page « Quatre pièces assorties, rose poudré, prune et liège », la collection en grand, chaque pièce dans son cadre et reliée à sa fiche) · **phrase qui s'allume au défilement** · **les quatre pièces en liste** (vignette, nom, état du prix, une ligne d'usage) · **panorama** du tapis au soleil · **l'anneau et son texte** en chevauchement · **achat de la sangle** (galerie, « Achat indisponible ») · **questions en lignes** · **inscription sur photo** |
| Catalogue | les quatre produits sur une rangée (deux par deux sur téléphone) |
| Fiche (×4) | fiche produit (galerie en carrousel, cadre carré, zoom, barre d'achat ; « Dans la collection » : les quatre pièces) · **la scène du produit** en fermeture · **le reste de la collection** · questions en lignes |
| Les usages | introduction · **scène et liste des produits** (studio, un repère sur chaque pièce, lien vers sa fiche) · **diptyque** (niche, banc) · **scène et texte** (la collection vue du dessus) |
| Questions et contact | questions numérotées · formulaire de contact (mode démonstration) |

Aucune section de la famille Produit spécifique (`cv-*`) n'est utilisée : un test le vérifie. Animations : montée
échelonnée de la mosaïque, phrase mot à mot, fondu de la liste, dérive du panorama, apparition de l'achat ; toutes
désactivées avec « mouvement réduit ».

Sur un projet client : avec au moins deux produits photographiés, l'ouverture est la mosaïque des produits **du
client** (sa première photo de chaque produit, le lien vers chaque fiche) ; avec un seul produit, l'ouverture devient un
panorama avec le titre de la page. Jamais d'accueil sans ouverture ni H1. Les quatre produits de la démonstration ne
limitent pas le nombre de produits d'un client.

## Matrice des médias

| Fichier | Page · section |
|---|---|
| logo | en-tête, favicon |
| tapis-01…05, brique-01…05, sangle-01…05, anneau-01…05 | galerie de **sa** fiche (cinq vues chacun) |
| tapis-05, brique-01, sangle-05, anneau-02 | accueil · mosaïque (une tuile par pièce, vers sa fiche) |
| tapis-01, brique-01, sangle-01, anneau-01 | menu « La collection » (cartes) |
| ambiance-05 (collection à plat) | accueil · mosaïque (vue d'ensemble) ; Les usages · la collection vue du dessus |
| ambiance-07 (tapis et brique au soleil) | accueil · panorama → tapis |
| ambiance-04 (anneau sur socle) | accueil · l'anneau → anneau |
| ambiance-10 (collection au studio) | accueil · inscription ; encart du menu |
| ambiance-02 (tapis dans la lumière) | fiche du tapis |
| ambiance-03 (brique et sangle sur un banc) | fiche de la brique ; Les usages · diptyque |
| ambiance-06 (tapis roulé et sangle) | fiche de la sangle |
| ambiance-09 (anneau contre la brique) | fiche de l'anneau |
| ambiance-01 (studio de Pilates, quatre pièces) | Les usages · scène et liste des produits |
| ambiance-08 (niche en arche) | Les usages · diptyque |

Jamais la même image dans deux sections qui se suivent (test).

## Textes : rien d'inventé

Les textes décrivent ce que montrent les visuels et les usages : tapis rose poudré au dessous prune, logo imprimé, coins
arrondis, se roule ; brique couleur liège (teinte et grain, jamais « en liège »), arêtes arrondies, posée à plat, sur la
tranche ou debout ; sangle tissée prune à deux anneaux argentés, étiquette cousue ; anneau prune strié à deux poignées
rose mauve. **Jamais affirmés** : prix, matières, dimensions, épaisseur, adhérence, poids, certifications, bienfaits
pour la santé, entretien, garantie, livraison, avis, stock. Leurs blocs (« Dimensions », « Matières et entretien »,
« Livraison, retours et garantie ») et les questions correspondantes (dont « Le tapis est-il antidérapant ? ») restent
dans l'éditeur, masqués, prêts à compléter. Sans prix : « Prix à définir » et « Achat indisponible » (bouton et barre
mobile), jamais achetable.

## Vérifications (copie isolée)

| Contrôle | Résultat |
|---|---|
| Médias | 31/31 conformes au manifeste (SHA-256, taille, dimensions) ; 31/31 utilisés par la démonstration (test) |
| `tsc --noEmit` | sans erreur |
| `vitest run` complet | 327 fichiers, 2568 tests réussis, 2 ignorés, 0 échec |
| `tests/souple.test.ts` (17 tests) | famille E-commerce partout, profil « poudre », composition figée sans section `cv-*`, exactement quatre produits (chacun ses cinq vues, son texte, ses points, sa scène, « Dans la collection »), chaque tuile et chaque lien vers la bonne fiche, jamais la même image dans deux sections qui se suivent, SEO (un H1, titres et descriptions uniques, fil d'Ariane, alt), rien d'inventé, liens internes, exports ; projet d'un produit (ouverture de repli, aucune trace de la démo) et projet de plusieurs produits (mosaïque des produits du projet) |
| Achats de test (copie isolée, prix de test 59 / 24 / 15 / 32 €) | sans prix : « Achat indisponible » (bouton et barre mobile) sur les quatre fiches ; avec prix : ajout des quatre produits, quantités, suppression d'une ligne et totaux exacts (219 €, 187 €, 128 €) |
| Distinction (`themes-catalogue`) | ouverture propre (`fs-collections:asym`, repli `ed-scene:panorama`), moins de 50 % de sections communes avec tout autre thème, couple de polices unique, signature graphique différente |
| Theme Check Shopify | SOUPLE en français, en anglais, mono-produit et prestations : 0 erreur (4 avertissements `UnusedAssign` déjà présents partout) |
| Aperçu statique | 11 pages × 4 largeurs (360, 390, 430, 1440) : 0 débordement horizontal ; menus, recherche, panier, 404 |
| Premiers écrans | 360 × 640 : accueil titre 163–312 px, bouton 492–544 ; fiches : produit entier, nom, prix, bouton d'achat terminé entre 602 et 627 px (les quatre). 390 × 844 et 430 × 932 : idem, plus haut (`premier-ecran/mesures.json`) |
| Studio réel (`family-studio-check souple`) | 13/13 : galerie limitée aux 20 fonctions E-commerce (fonction d'une autre famille introuvable), ajout, mouvement réduit, changement de disposition (titre conservé), titre, effets, déplacement, en-tête et pied (dispositions et textes), rechargement : tout conservé |
| Choix depuis le studio (`START_DEMO=heuren theme-demo-choice-check … souple`) | démo complète SOUPLE consultée (ordinateur, téléphone, fiche, page « Les usages ») sans aucune écriture dans le projet ; projet HEUREN complet adapté : 0 emplacement vide, 0 image non chargée, 0 visuel ou texte de SOUPLE, rechargement identique ; « Choisir ce thème » en double-clic : une seule tâche, une seule version |
| Exports WooCommerce / PrestaShop (`family-export-check`) | profil « poudre » actif (`es-editorial-poudre`), 0 débordement, 0 erreur de script ; Shopify : les 31 médias, les quatre produits, le profil (test) |

**Exports** : ce sont des fichiers (thème Shopify, paquets WooCommerce et PrestaShop) dont le contenu et le rendu sont
vérifiés ; **aucune installation réelle dans un CMS** n'a été faite.

**Adaptation à un client** : vérifiée sur un projet existant et complet (HEUREN) ; ce n'est pas la génération IA d'un
nouveau client (Codex #154), qui n'est pas vérifiée ici.

Preuves dans `docs/preuves/souple-158/` : `pages/` (accueil, catalogue, quatre fiches à 360, 390, 430 et 1440 px ; « Les
usages », « Questions et contact », panier à 390 et 1440 px), `premier-ecran/` (360 × 640, 390 × 844, 430 × 932 et
mesures) et `adaptation-client/` (projet HEUREN dans SOUPLE). Seuls des visuels SOUPLE et HEUREN (déjà publics dans le
dépôt) y figurent : aucune capture d'un kit privé (FRAISE, ONDE, ORBE, Rive) ni de la galerie des thèmes.

## Limites connues

- Rendus à valider par Thomas avant toute validation du thème.
- Sur un projet client, la section « image et texte » peut reprendre l'accroche de la marque déjà utilisée en ouverture
  (rédaction automatique de la bibliothèque, commune à tous les thèmes) ; à retoucher dans le studio.
- Codespace de Thomas : non vérifié. Exports : contenu et rendu vérifiés, pas d'installation réelle dans un CMS.
- Génération IA complète d'un nouveau client : non vérifiée (Codex #154) ; seule l'adaptation d'un projet existant l'est.
- Forfaits (Codex #151 / #154) : ajout de `souple` à leur grille au moment de réunir les branches.
