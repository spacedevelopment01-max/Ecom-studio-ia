# HEUREN et ALCÔVE — deux thèmes mono-produit de la famille E-commerce (issue #155)

État de la branche `claude/themes-heuren-alcove-155`. **Testé en copie isolée seulement : rien n'est fusionné, rien
n'est servi dans le Codespace de Thomas. Les compositions restent à valider par Thomas.**

## Classement : E-commerce, mono-produit

Consigne expresse de Thomas : **HEUREN et ALCÔVE sont des thèmes mono-produit de la famille E-commerce** (celle
d'ORBE), jamais « Produit spécifique » / « Boutique spécialisée ». Ce classement est appliqué partout :

| Endroit | Valeur |
|---|---|
| Catalogue des thèmes (`kinds`, `REFERENCE_FIT`) | `catalog` (E-commerce) |
| Famille de sections (`THEME_FAMILY`) | `catalog` : seules les 20 fonctions E-commerce sont proposées |
| Recommandation (`project-handoff/categories.ts`) | `ecommerce` |
| Démonstrations | projet `storeKind: catalog`, `store_type: mono`, **un seul produit**, plusieurs vues du même produit |
| Exports | profil éditorial (`es-editorial-cadran`, `es-editorial-arrondi`) comme ORBE |

Conséquence voulue : un projet E-commerce se voit désormais proposer **trois** thèmes (ORBE, HEUREN, ALCÔVE) au lieu
d'ORBE imposé ; comme pour les boutiques spécialisées, aucun n'est choisi à sa place.

## Base de travail et dépendances

- Branche partie de `5eb672f9` (tête de la PR #153, NOCTIL et TRAVERSE, **non fusionnée**), qui contient #149 (SILLON)
  et #147 (bibliothèques et exports), **non fusionnées** non plus. Ordre de fusion conseillé : #147 → #149 → #153 → cette PR.
- Médias : commit `370c28f6` de `assets/heuren-alcove-20261021`, repris par cherry-pick (`2d3f0611`), sans code
  applicatif. 32 fichiers contrôlés contre `docs/theme-assets/heuren-alcove-manifest.json` : octets, dimensions et
  SHA-256 identiques, aucun fichier vide. Chaque image vérifiée à l'œil (produit entier, nom HEUREN lisible sur le
  cadran, fauteuil fidèle, aucune personne ni marque externe).
- **Correction HEUREN** : la scène sur pierre noire au coucher du soleil est `heuren/ambiance-07.webp`, version corrigée
  au bracelet fermé en boucle continue. L'ancienne version (« Montre HEUREN en clair-obscur élégant », morceau beige qui
  dépasse) n'est pas dans le lot (`excluded` du manifeste) : elle ne peut apparaître ni en démo, ni en galerie, ni en export.
- Logo HEUREN : livré **sur fond blanc chaud** (non transparent) ; il est donc posé sur un en-tête blanc. Logo ALCÔVE :
  fond transparent.
- Forfaits (Codex #151 / #154) : **non touchés**. Les deux thèmes passent par les droits existants (`themeAllowed`).
  Quand #151 sera réuni, il faudra inscrire `heuren` et `alcove` dans les places libres de `PLAN_THEME_ORDER.catalog`
  (aujourd'hui `['orbe', null, null, null, null]`) : c'est au chantier Codex de le faire.
- Barre d'achat mobile (signalée à la réception NOCTIL / TRAVERSE) : corrigée sur cette branche, commit `1028302f` (voir
  plus bas).

## Directions artistiques

| | HEUREN — « Bleu nuit et précision » | ALCÔVE — « Courbes et terre cuite » |
|---|---|---|
| Profil graphique | « cadran » : ivoire et bleu nuit, filets argentés, angles droits, cadres doublés d'un fin liseré comme une lunette, sur-titres très espacés | « arrondi » : sable et terre cuite, arches et coins arrondis, boutons en pastille, sur-titres en italique |
| Polices | Instrument Serif (titres) / Inter (textes) | Lora (titres) / Work Sans (textes) |
| En-tête | « Logo centré, menu à gauche », fond blanc (celui du logo), menu plein écran au téléphone | « Boutique éditoriale » : le fauteuil mis en avant dans le sous-menu, tiroir à droite au téléphone |
| Pied de page | « Encadré » | « Empilé » |
| Fiche produit | galerie en grille, cadre carré (montre entière, bracelet compris), zoom, barre d'achat | galerie en carrousel, cadre carré (fauteuil entier, pieds compris), zoom, barre d'achat |

ORBE garde son en-tête « Logo à gauche » et son pied « Sobre » : les trois thèmes E-commerce ont des dispositions
différentes.

## Compositions (sections réelles de la bibliothèque E-commerce)

Une seule disposition a été ajoutée à la bibliothèque : **« Arche et promesse »** pour la présentation principale
(`ed-opening`, réglage `layout: arch`), afin qu'ALCÔVE ait sa propre ouverture (ORBE ouvre « dans la scène », HEUREN
« titre puis paysage »). Aucune nouvelle section, aucun doublon.

| Page | HEUREN | ALCÔVE |
|---|---|---|
| Accueil 1 | Présentation · titre puis paysage (H1) — la montre au crépuscule | Présentation · **arche et promesse** (H1) — le fauteuil dans une niche en arche |
| 2 | Histoire de la maison · déclaration en bleu nuit + gros plan du cadran | Ambiance et lookbook · scène et liste de repères (4 repères sur le fauteuil) |
| 3 | Ambiance et lookbook · repères sur la montre (4 repères) | Histoire de la maison · déclaration centrée |
| 4 | Campagne · visuel en fond (« Bleu sur bleu ») | Usages et installation · deux pièces côte à côte, cadres en arche |
| 5 | Ambiance et lookbook · scène à côté du texte (« Avec un veston ») | Campagne · carte (« Sous une lumière ambrée ») |
| 6 | Produit à la une · achat compact | Produit à la une · achat encadré |
| 7 | FAQ · centrée | FAQ · cartes |
| 8 | Newsletter · avec visuel (l'écrin) | Newsletter · simple |
| Fiche | galerie en grille ; Usages · deux scènes côte à côte (ardoise, lin) ; FAQ · titre à côté | galerie en carrousel ; Histoire · image à gauche (vu d'en haut) ; Usages · côte à côte (rétro, loft) ; FAQ · lignes |
| Pages | « Au fil du jour » (Usages · index : bureau, voyage, soir ; scène finale sur le travertin) ; « Questions et contact » (FAQ numérotée + formulaire) | « Pièce par pièce » (scène panoramique : jardin d'hiver ; scène finale : fenêtre cintrée) ; « Questions et contact » (FAQ + formulaire) |

## Couverture des 20 fonctions E-commerce sur les trois thèmes

| Fonction | ORBE | HEUREN | ALCÔVE |
|---|---|---|---|
| Présentation principale | promesse dans la scène | **titre puis paysage** | **arche et promesse** (nouvelle) |
| Collections, Sélection de produits | — | — (mono-produit) | — (mono-produit) |
| Produit à la une | — | **achat compact** | **achat encadré** |
| Ambiance et lookbook | scène à côté du texte | **repères sur la photo**, scène à côté du texte, scène finale | **scène et liste de repères**, panorama, scène finale |
| Matières et finitions | bande des finitions | — (une seule finition) | — (une seule finition) |
| Dimensions, Entretien, Comparatif | — | — (aucune donnée vérifiable) | — (aucune donnée vérifiable) |
| Usages et installation | côte à côte | **index**, deux scènes | **en paire**, côte à côte |
| Campagne commerciale | — | **visuel en fond** | **carte** |
| Histoire de la maison | déclaration | déclaration | **texte**, **image à gauche** |
| Fabrication, Engagements, Avis, Presse, Journal | — | — | — (rien de vérifiable à montrer, aucun avis inventé) |
| FAQ | titre à côté, lignes | **centrée**, titre à côté, numérotée | **cartes**, lignes |
| Newsletter | — | **avec visuel** | **simple** |
| Contact | — | formulaire | formulaire |

En gras : dispositions qu'aucun autre thème E-commerce ne montrait.

## Matrice des médias (15 images + logo par thème)

**HEUREN** (16 fichiers, tous utilisés ; ancienne ambiance rejetée absente du lot) :

| Fichier | Scène (manifeste) | Où |
|---|---|---|
| logo.webp | logo sur fond blanc chaud | en-tête (fond blanc), icône du site |
| produit-01 | montre bleu nuit, trois quarts | fiche : 1ʳᵉ vue et barre d'achat ; accueil : achat compact |
| produit-02 | cadran bleu marine, face | accueil : repères « La montre, point par point » ; fiche : galerie |
| produit-03 | profil latéral | fiche : galerie |
| produit-04 | cadran bleu soleillé, gros plan | accueil : « Un bleu qui change avec la lumière » ; fiche : galerie |
| produit-05 | macro du bracelet | fiche : galerie |
| ambiance-01 | cadran bleu sur ardoise | fiche : « Sur l'ardoise » |
| ambiance-02 | bureau en noyer | page « Au fil du jour » : « Le matin, au bureau » |
| ambiance-03 | socle en travertin | page « Au fil du jour » : « Une montre à regarder, aussi » |
| ambiance-04 | carte et étui de voyage | page « Au fil du jour » : « En voyage » |
| ambiance-05 | veston plié | accueil : « Avec un veston, une chemise blanche » |
| ambiance-06 | lin ivoire | fiche : « Sur le lin » |
| **ambiance-07** | pierre noire au coucher du soleil, **version corrigée, bracelet fermé** | accueil : ouverture « L'heure bleue, au poignet » |
| ambiance-08 | support argenté | page « Au fil du jour » : « Le soir, sur son support » |
| ambiance-09 | béton bleu, ombres géométriques | accueil : campagne « Bleu sur bleu » |
| ambiance-10 | écrin bleu nuit | accueil : inscription « Être prévenu de l'ouverture » |

**ALCÔVE** (16 fichiers, tous utilisés) :

| Fichier | Scène (manifeste) | Où |
|---|---|---|
| logo.webp | arche terracotta | en-tête, icône du site |
| produit-01 | fauteuil lounge, trois quarts | fiche : 1ʳᵉ vue et barre d'achat ; encart du sous-menu ; accueil : achat encadré |
| produit-02 | face, en studio | fiche : galerie |
| produit-03 | profil latéral | fiche : galerie |
| produit-04 | vue arrière trois quarts | fiche : galerie |
| produit-05 | détail du tissu | fiche : galerie |
| ambiance-01 | salon lumineux | accueil : repères « Un fauteuil, quatre repères » |
| ambiance-02 | coin lecture | accueil : « Le coin lecture » |
| ambiance-03 | fenêtre cintrée | page « Pièce par pièce » : « Une arche, un rideau, un fauteuil » |
| ambiance-04 | intérieur rétro | fiche : « Intérieur rétro » |
| ambiance-05 | chambre lumineuse | accueil : « La chambre » |
| ambiance-06 | lumière ambrée | accueil : campagne « Sous une lumière ambrée » |
| ambiance-07 | écrin méditerranéen (niche en arche) | accueil : ouverture en arche « Une alcôve à soi » |
| ambiance-08 | loft industriel | fiche : « Loft » |
| ambiance-09 | vu du dessus | fiche : « Une assise profonde, un dossier qui l'entoure » |
| ambiance-10 | jardin d'hiver | page « Pièce par pièce » : « Entre les plantes, en pleine lumière » |

Aucune image ne revient dans deux sections qui se suivent (vérifié par test sur toutes les pages). Les fichiers sont
servis tels que livrés (WebP) ; l'ouverture est chargée en priorité, les autres images en différé.

## Textes, honnêteté et SEO

- Textes écrits à partir de ce que montrent les visuels et des caractéristiques données dans l'issue (cadran bleu nuit
  soleillé, index et aiguilles argentés, boîtier argenté, bracelet cuir bleu nuit cousu bleu, doublure beige ; fauteuil
  enveloppant terracotta, dossier et accoudoirs arrondis, coussin d'assise épais, quatre pieds courts en bois brun).
- **Jamais affirmés** (champs masqués, prêts dans l'éditeur) : HEUREN — mouvement, réserve de marche, étanchéité,
  dimensions du boîtier, matières du boîtier et du verre, attache du bracelet, garantie, livraison ; ALCÔVE — dimensions,
  composition du tissu et du rembourrage, entretien, livraison et montage, garantie. Aucun prix, avis, note ni chiffre.
- Un seul bandeau : « Boutique de démonstration : aucune vente réelle. » ; le panier refuse l'ajout (« Prix à définir »).
- Copyright « © année HEUREN / ALCÔVE », aucune donnée légale inventée.

| Page | Title | H1 |
|---|---|---|
| HEUREN accueil | HEUREN \| Montre au cadran bleu nuit soleillé | L'heure bleue, au poignet. |
| HEUREN fiche | Montre HEUREN bleu nuit : cadran, boîtier et bracelet en détail | Montre HEUREN bleu nuit |
| HEUREN usages | Au fil du jour : la montre HEUREN du bureau au soir \| HEUREN | Au fil du jour |
| HEUREN aide | Questions et contact \| HEUREN, montre bleu nuit | Questions et contact |
| ALCÔVE accueil | ALCÔVE \| Fauteuil enveloppant terracotta aux lignes arrondies | Une alcôve à soi. |
| ALCÔVE fiche | Fauteuil ALCÔVE terracotta : vues, courbes et tissu en détail | Fauteuil ALCÔVE terracotta |
| ALCÔVE pièces | Pièce par pièce : le fauteuil ALCÔVE chez vous \| ALCÔVE | Pièce par pièce |
| ALCÔVE aide | Questions et contact \| ALCÔVE, fauteuil terracotta | Questions et contact |

Descriptions uniques (60 à 160 caractères), canonical, fil d'Ariane, `Product` sans offre, aucune note ; aperçus
`noindex`. Tous les liens internes mènent à une page existante (vérifié par test).

## Barre d'achat mobile (corrigée, tous thèmes)

- Avant : 134 px de haut au téléphone (un cinquième d'un écran 360 × 640) ; boutons flottants remontés de 92 px même
  quand la barre était cachée, au point de couvrir des boutons du contenu (ex. le « + » de la FAQ ONDE) ; zone du geste
  d'accueil des iPhone ignorée.
- Après : barre sur une ligne (nom et prix à gauche, bouton à droite), environ 63 px ; zone du geste d'accueil respectée ;
  boutons flottants et avis « ajouté » placés au-dessus de la barre **seulement quand elle est affichée**, à sa hauteur
  mesurée. Vérifié à 360, 390 et 430 px sur ONDE, SILLON, NOCTIL, TRAVERSE, puis HEUREN et ALCÔVE.

## Vérifications

VERIFS

## Limites connues

- Codespace de Thomas : non vérifié (hôte inaccessible depuis cet environnement) ; tout est testé en copie isolée.
- Exports : contenu des ZIP et rendu vérifiés, **pas d'installation chez un vrai fournisseur**.
- Démos en français. La page des tarifs (Codex) n'est pas modifiée.
- Grille des forfaits de Codex (#151) : HEUREN et ALCÔVE restent à y inscrire au moment de la réunion des branches.
- **Les compositions ne sont pas déclarées validées** : elles attendent l'avis de Thomas.
