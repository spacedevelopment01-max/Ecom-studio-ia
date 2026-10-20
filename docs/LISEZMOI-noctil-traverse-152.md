# NOCTIL et TRAVERSE — thèmes « boutique spécialisée » n° 4 et 5 (issue #152)

État de la branche `claude/themes-noctil-traverse-152`. **Testé en copie isolée seulement : rien n'est fusionné, rien
n'est servi dans le Codespace de Thomas.**

## Base de travail et dépendances

- Partie de `f0084332` (tête de la PR spacedevelopment01-max/Ecom-studio-ia#149, SILLON, **non fusionnée**), qui
  contient elle-même la PR spacedevelopment01-max/Ecom-studio-ia#147 (issue #145, **non fusionnée**). Une branche issue
  de `main` aurait perdu les exports WordPress / PrestaShop corrigés, la garde de famille, SILLON et les démos complètes
  avant le choix. Cette PR contient donc aussi les commits de #147 et #149 tant qu'elles ne sont pas fusionnées.
- Médias : commit `d5d27e26` de `assets/noctil-traverse-20261020`, repris par cherry-pick (aucun code applicatif).
  Les 32 fichiers ont été contrôlés contre `docs/theme-assets/noctil-traverse-manifest.json` : octets, dimensions et
  SHA-256 identiques, aucun fichier vide.
- Forfaits (Codex #150) : non touchés. Les deux thèmes passent par les droits existants (`themeAllowed`, inclus dans tout
  forfait payant comme les cinq autres thèmes de référence). La page des tarifs n'est pas modifiée.

## Ce qui change pour le studio

- **Sept thèmes actifs**, dont cinq « boutique spécialisée » : FRAISE, ONDE, SILLON, **NOCTIL** et **TRAVERSE**.
  Galerie « Thèmes », recommandation, contrat amont, IA et commandes, accès par forfait : comme SILLON.
- **Démo complète avant le choix** : « Voir la démo complète » ouvre la boutique de démonstration entière de NOCTIL ou
  de TRAVERSE (toutes les pages, ordinateur / téléphone), avec leurs marques, images et textes ; le projet ne change
  qu'à « Choisir ce thème » (une seule tâche même en double-clic), puis l'éditeur guide sur les informations manquantes.
- **Après le choix**, un projet client garde son nom, ses couleurs, son logo, ses textes et ses images ; il reçoit la
  composition, les polices, les dispositions d'en-tête / pied et le profil graphique du thème. Aucun mot ni visuel des
  démonstrations (vérifié par test et dans le studio réel).

## Directions artistiques

| | NOCTIL — « Nuit immersive, lumière d'espace » | TRAVERSE — « Carnet de voyage, pierre et olive » |
|---|---|---|
| Profil graphique | « astral » : fonds indigo profonds, halos violets en haut des sections sombres, cartes translucides au liseré lumineux, boutons arrondis qui s'éclairent | « itinéraire » : crème, pierre et olive, filets fins, angles droits, colonnes asymétriques, légendes en italique, numéros d'étape |
| Polices | Space Grotesk 500 (titres) / Karla (textes) | Playfair Display 400 (titres) / Chivo (textes) |
| En-tête | « Barre flottante arrondie », fond lavande (le logo indigo reste lisible) | « Deux rangées avec offre » : nom en tête, menu dessous, sous-menu avec deux encarts illustrés |
| Pied de page | « Centré avec lettre d'information » (logo, liens, mentions) | « Carte d'assistance » (texte de marque et aide dans une carte) |
| Rythme | alternance nuit / lavande, sections centrées, produit entier au-dessus du titre | bannière visuel à gauche, titres alignés à gauche, visuels décalés d'une rangée à l'autre |
| Fiche produit | galerie en carrousel, cadre carré | galerie empilée, cadre naturel (rien de coupé) |

Ni l'une ni l'autre ne reprend le logo centré de FRAISE / ONDE ni le bouton d'achat et le grand nom de SILLON.
Les cinq dispositions d'en-tête et de pied de la famille existaient déjà : aucun manque à signaler.

## Compositions (sections réelles de la bibliothèque, aucune nouvelle section)

| Page | NOCTIL : section · disposition → fonction | TRAVERSE : section · disposition → fonction |
|---|---|---|
| Accueil 1 | `cv-hero` · visuel au-dessus, H1 → 1 Présentation | `cv-banner` · bannière visuel à gauche, H1 → 1 Présentation |
| 2 | `features-grid` · grille 4 colonnes, cartes lumineuses → 2 Bénéfices | `features-grid` · liste verticale numérotée → 2 Bénéfices |
| 3 | `cv-gallery` · carrousel des pièces → 7 Situations | `cv-alternating` · alternance quotidien / départ / destination → 7 Situations |
| 4 | `image-with-text` · image et texte superposés → 13 Histoire | `cv-hotspots` · repères interactifs → 3 Détails |
| 5 | `cv-cards` · gros plans en colonnes → 3 Détails | `cv-ingredients` · visuel et liste → 4 Composition (finitions visibles) |
| 6 | `cta-banner` · bandeau d'achat sur une scène → 15 Achat | `image-with-text` · image à gauche → 13 Histoire (ce qu'on emporte) |
| 7 | `faq` · accordéons en cartes → 18 FAQ | `featured-purchase` · produit et offres (encadré) → 15 Achat |
| 8 | `newsletter` · inscription simple → 19 Newsletter | `faq` · titre à côté → 18 FAQ |
| 9 | — | `newsletter-media` · inscription avec visuel → 19 Newsletter |
| Fiche | `main-product` (carrousel) ; `cv-ingredients` · cartes → 4 Composition ; `content-tabs` · onglets en pastilles → 5 Caractéristiques ; `timeline` · frise → 6 Mode d'emploi ; `cv-feature` · autour d'un visuel → 2 Bénéfices ; `fs-commitments` · grille → 17 Garanties (**masquée**, inconnus) ; `faq` · lignes → 18 | `main-product` (empilée) ; `cv-cards` · gros plans en lignes → 3 Détails ; `content-tabs` · onglets soulignés → 5 Caractéristiques ; `cv-steps` · étapes en cartes → 6 Mode d'emploi ; `cv-gallery` · grille → 7 Situations ; `fs-commitments` · liste → 17 Garanties (**masquée**) ; `faq` · lignes → 18 |
| Pages | « Une galaxie par pièce » (`cv-alternating` alternance → 7 ; `cta-banner` → 15) ; « Questions et contact » (`faq` numérotées → 18 ; `contact-form` → 20) | « Carnet de route » (`cv-alternating` images à gauche → 7 ; `cta-banner` → 15) ; « Aide et contact » (`faq` numérotées → 18 ; `contact-form` → 20) |

## Couverture des 20 fonctions sur les cinq thèmes de la famille

| Fonction | FRAISE | ONDE | SILLON | NOCTIL | TRAVERSE |
|---|---|---|---|---|---|
| 1 Présentation | visuel à droite | visuel à gauche | visuel à gauche | **visuel au-dessus** | **bannière visuel à gauche** |
| 2 Bénéfices | bandeau, autour d'un visuel, 2 colonnes | bandeau, autour d'un visuel | visuel à gauche | **grille (cartes lumineuses)**, autour d'un visuel | **liste verticale** |
| 3 Détails | — | gros plans en lignes | repères (côté, dessous) | **gros plans en colonnes** | repères, gros plans en lignes |
| 4 Composition | — | — | — | **cartes** | **visuel et liste** |
| 5 Caractéristiques | onglets | — | titre à côté, empilés | **onglets en pastilles** | onglets |
| 6 Mode d'emploi | frise | — | étapes sur une ligne, cartes | frise | étapes en cartes |
| 7 Situations | — | — | mosaïque, alternance, grille, images à gauche | **carrousel**, alternance | alternance, grille, images à gauche |
| 8 Vidéo | stories | stories | — | — | — |
| 9 Comparatif | tableau | tableau | — | — | — |
| 10 Résultats | chiffres en grille | chiffres en lignes | — | — | — |
| 11 Avis | carrousel | carrousel | — | — | — |
| 12 Presse | — | — | — | — | — |
| 13 Histoire | déclaration, image et texte, récit | idem | déclaration, image et texte | **image et texte superposés** | image et texte |
| 14 Fabrication | — | — | — | — | — |
| 15 Achat | bandeau | bandeau | achat compact, bandeau | bandeau | **produit et offres (encadré)** |
| 16 Complémentaires | recommandations | recommandations | recommandations | recommandations | recommandations |
| 17 Garanties | garantie mise en avant | idem | liste (masquée) | grille (masquée) | liste (masquée) |
| 18 FAQ | cartes | lignes | titre à côté, lignes, numérotées | cartes, lignes, numérotées | titre à côté, lignes, numérotées |
| 19 Newsletter | simple | — | avec visuel | simple | avec visuel |
| 20 Contact | formulaire | formulaire | formulaire | formulaire | formulaire |

En gras : dispositions qu'aucun autre thème de la famille ne montrait. La **composition (4)** apparaît pour la première fois
dans une démonstration. Vidéo, comparatif, résultats, avis, presse et fabrication ne sont pas utilisés : aucun média ni
aucune donnée vérifiable ne les alimenterait sans invention (pas de vidéo dans les kits, aucun avis, aucune mesure).

## Matrice des médias

**NOCTIL** (16 fichiers, tous utilisés) :

| Fichier | Où |
|---|---|
| logo.webp | en-tête (fond lavande), pied centré, icône du site |
| produit-01 | fiche : 1ʳᵉ vue de la galerie et barre d'achat |
| produit-02 | fiche : galerie ; accueil : gros plan « La sphère sur son arceau » |
| produit-03 | fiche : galerie ; onglet « Silhouette » |
| produit-04 | fiche : galerie ; accueil : gros plan « L'objectif » |
| produit-05 | fiche : galerie ; accueil : gros plan « Le socle et son bouton » |
| ambiance-01 | accueil : récit superposé « Quand le jour se retire » |
| ambiance-02 | page « Une galaxie par pièce » : salon cinéma |
| ambiance-03 | fiche : « Une lueur indigo, même posée seule » |
| ambiance-04 | accueil : carrousel « L'alcôve lavande » |
| ambiance-05 | accueil : carrousel « Un ciel violet au plafond » |
| ambiance-06 | page « Une galaxie par pièce » : bureau ; fiche : onglet « Dans la pièce » |
| ambiance-07 | accueil : carrousel « Le coin lecture » ; page des pièces : coin lecture |
| ambiance-08 | accueil : bandeau d'achat « Faites entrer la nuit dans votre salon » |
| ambiance-09 | accueil : carrousel « Au-dessus du lit » |
| ambiance-10 | accueil : ouverture (produit entier sur son halo) |

**TRAVERSE** (15 fichiers utilisés, 1 exclu) :

| Fichier | Où |
|---|---|
| logo.webp | en-tête, icône du site |
| produit-01 | accueil : repères « Chaque poche, à sa place » ; fiche : 1ʳᵉ vue |
| produit-02 | fiche : galerie, gros plan « Le profil » |
| produit-03 | accueil : « Ce qui se voit de près » ; fiche : galerie, gros plan « La poche frontale » |
| produit-04 | fiche : galerie, gros plan « Les boucles » |
| produit-05 | accueil : bannière d'ouverture ; fiche : galerie ; encart du menu « Le sac » |
| ambiance-01 | fiche : onglet « Organisation » ; carnet de route : « La carte sur la pierre » |
| ambiance-02 | accueil : « Le ponton au petit matin » ; fiche : galerie des lieux |
| ambiance-03 | carnet de route : « Le van ouvert sur le lac » ; encart du menu « Carnet de route » |
| **ambiance-04** | **exclu** : variante très proche du même cadre que ambiance-05 (café) ; jamais importé, jamais affiché, absent des exports — vérifié par test |
| ambiance-05 | accueil : « Le café avant le bureau » (seule scène du café) |
| ambiance-06 | carnet de route : salon d'aéroport ; fiche : onglet « En voyage » |
| ambiance-07 | accueil : « Une chemise, un carnet, des lunettes de soleil » |
| ambiance-08 | fiche : galerie des lieux « Au pied du lit, à l'hôtel » |
| ambiance-09 | accueil : inscription « Le carnet de route, par e-mail » |
| ambiance-10 | accueil : « Le hall de la gare » ; fiche : galerie des lieux |

Les fichiers sont servis tels qu'ils sont livrés (WebP déjà optimisés du kit) ; le thème fournit les tailles adaptées
à l'écran (`srcset`), l'image d'ouverture est prioritaire et les autres chargées en différé.

## Textes, honnêteté et SEO

- Textes rédigés pour chaque produit et chaque page à partir du concept et de ce que montrent les visuels.
- **Jamais affirmés** (champs masqués, prêts dans l'éditeur) : NOCTIL — alimentation, autonomie, luminosité, couleurs,
  modes, minuterie, télécommande ou application, dimensions, poids, matériaux, garantie, livraison ; TRAVERSE — volume,
  format cabine, étanchéité, compartiment ordinateur, éléments modulables, matières, dimensions, poids, garantie,
  livraison. Aucun effet sur le sommeil ou la santé, aucun prix, avis, note ni chiffre.
- Un seul bandeau : « Boutique de démonstration : aucune vente réelle. » ; le panier refuse l'ajout (« Prix à définir »).
- Copyright « © année NOCTIL / TRAVERSE », aucune donnée légale inventée.

| Page | Title | H1 |
|---|---|---|
| NOCTIL accueil | NOCTIL \| Projecteur de galaxies pour le salon et la chambre | Projecteur de galaxies NOCTIL : la nuit entre dans la pièce |
| NOCTIL fiche | Projecteur de galaxies NOCTIL : vues, détails, mise en place | Projecteur de galaxies NOCTIL |
| NOCTIL pièces | Une galaxie par pièce : salon, bureau, coin lecture \| NOCTIL | Une galaxie par pièce |
| NOCTIL aide | Questions et contact \| NOCTIL, projecteur de galaxies | Questions et contact |
| TRAVERSE accueil | TRAVERSE \| Sac de voyage modulable, du quotidien au départ | TRAVERSE, du café du matin au quai de départ |
| TRAVERSE fiche | Sac de voyage modulable TRAVERSE : vues, poches et détails | Sac de voyage modulable TRAVERSE |
| TRAVERSE carnet | Carnet de route TRAVERSE : aéroport, hôtel, bivouac | Carnet de route : du quotidien à la destination |
| TRAVERSE aide | Aide et contact \| TRAVERSE, sac de voyage modulable | Aide et contact |

Descriptions uniques (60 à 160 caractères), canonical, fil d'Ariane, `Product` sans offre, aucune note ; aperçus
`noindex` (en-tête et balise). Tous les liens internes mènent à une page existante (vérifié par test).

## Vérifications

VERIFS

## Limites connues

- Codespace de Thomas : non vérifié (hôte refusé par le réseau de cet environnement) ; tout est testé en copie isolée.
- Exports : contenu des ZIP et rendu vérifiés, **pas d'installation chez un vrai fournisseur**.
- Démos complètes en français. La page des tarifs (Codex #150) parle encore de « quatre thèmes » : non modifiée.
- Le logo NOCTIL (indigo sur transparent) n'est pas redessiné : il est posé sur fond lavande (en-tête et pied) pour rester
  lisible ; sur un fond de nuit, un projet client devra fournir une version claire de son logo.
