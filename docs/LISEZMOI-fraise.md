# FRAISE GUMMIES — reprise des sept planches corrigées (Produit spécifique / Boutique spécialisée)

Branche `claude/fraise-v2`, construite sur la branche de SILLON V2 (`claude/theme-sillon-v2`, PR #184, pas encore
fusionnée) pour ne pas écraser ce travail récent. Consigne suivie : `docs/theme-briefs/fraise-gummies/CONSIGNE_CLAUDE.md`
et les sept planches de `docs/theme-briefs/fraise-gummies/maquettes/` (01 accueil et fiche ; 02 boutique, recette,
histoire, journal ; 03 panier, commande, FAQ, contact, livraison, suivi ; 04 à 07 : les mêmes pages au téléphone, plus le
panier, les quatre écrans de commande, le menu ouvert, le panier vide et le tiroir). **Rien n'est fusionné ni déployé**,
aucun appel IA payant, aucun paiement, aucun envoi. Les photos restent dans le kit privé (`public/demo/fraise/v2/`, hors
dépôt) : seules les maquettes et la consigne sont publiées.

## Pour Thomas, en bref

- **Ce que vous voyez** : la boutique FRAISE complète, sur ordinateur et téléphone, avec le dessin des planches : en-tête
  au logo centré et bandeau rouge répété, grande ouverture photographique, titres ronds et italique rouge, mots
  manuscrits, bandes roses à vagues, pieds de page propres à chaque planche (accueil, journal, contact, achat).
- **Les offres sont les mêmes partout** (accueil, fiche, boutique, tiroir, panier, commande) et **le prix TOTAL du pack
  passe en premier** : 1 flacon 16,60 € (rien de barré) ; 2 flacons 24,90 € (« −50 % sur le 2ᵉ », « Le 2ᵉ à 8,30 € »,
  économie 8,30 €) ; 3 flacons 33,20 € (« 2 achetés + 1 offert », ≈ 11,07 € / flacon, économie 16,60 €). Le prix par
  flacon reste en petit, en second. Les prix barrés (33,20 € et 49,80 €) sont annoncés « même quantité à l'unité ».
- **Les messages d'offre sont calculés par le thème** à partir des prix des formats : si vous changez un prix dans le
  studio, les économies, pourcentages et « meilleure offre » se recalculent (vérifié : 23,90 € → « −56 % sur le 2ᵉ »,
  « Le 2ᵉ à 7,30 € », « Économisez 9,30 € »).
- **Panier** : chaque ligne compte des packs ET des flacons. 1 pack de 3 flacons = 33,20 € ; 3 packs d'un flacon =
  49,80 € ; 2 packs de 3 = 6 flacons et 66,40 € ; un pack de 2 + un pack de 3 = 5 flacons et 58,10 €. La livraison reste
  « calculée à l'étape suivante » : le panier affiche « Total des produits (hors livraison) », jamais un faux total final.
- **On peut tout essayer** : menu et recherche, galerie et zoom, choix du format, quantité, ajout (tiroir), modification,
  suppression, panier vide, commande en quatre étapes (informations → livraison → paiement → confirmation), FAQ
  (recherche et filtres), contact, suivi, inscription au journal, onglets livraison / suivi / retours, cookies (accepter,
  refuser, personnaliser). **Commande, contact, suivi et inscription sont simulés et le disent à l'écran** : aucun champ
  de carte, bouton de paiement inactif, « Exemple d'écran : aucune commande n'a été enregistrée ».
- **Rien d'inventé** : c'est une confiserie (aucune vitamine, aucune promesse de santé), aucun avis, aucun stock, aucune
  certification ; ingrédients, conservation, transporteurs, délais, frais et politique de retour restent
  « [À compléter : …] ». « 60 douceurs » n'apparaît que sur la photo du flacon (donnée de la maquette).
- **Tout se modifie dans le studio** (Boutique → éditeur) : textes (ordinateur et téléphone séparément), photos et
  cadrages, couleurs, prix et formats, règles d'offre (réglages « Offres par lots »), ordre, copie et déplacement des
  sections ; 30 sections « FRAISE » dans la bibliothèque, en français et en anglais.
- **Chez un autre client**, le thème reprend SON produit, SES photos, SES textes et SES prix : aucun mot FRAISE, fraise,
  flacon, 60 douceurs ni prix de démonstration ne reste, et le bouton du panier mène au paiement Shopify (vérifié par test).
- **Ce n'est pas encore « identique »** : les écarts qui restent sont listés plus bas, sans les cacher. Branche livrée ≠
  fusion ≠ studio : le thème n'apparaîtra dans votre studio qu'après fusion puis déploiement. La validation vous revient.

## Ce qui est livré

| Sujet | Contenu |
|---|---|
| Pages | Accueil, fiche « Gummies goût fraise », boutique (`/collections/all`), La recette, Notre histoire, Journal (filtres) + 6 articles distincts, Panier (plein, vide, tiroir), Commande (4 étapes + écran d'exemple), FAQ, Contact, Livraison et retours (onglets), Suivi de commande, 4 pages légales (mentions, CGV, confidentialité, cookies), page introuvable, recherche. |
| Ordinateur | Pages calées sur chaque panneau des planches 01 à 03 (repère 1440 px), contrôlées à 1440. |
| Téléphone | Pages calées sur les planches 04 à 07 (repère 390 px) avec leurs textes propres (titres, coupes de lignes, questions, libellés), contrôlées à 360, 390 et 430 px : aucun débordement horizontal (`debordements.txt` du rapport). |
| Achat | Un seul produit, trois formats vendables (1660, 2490, 3320 centimes, lus dans `OFFRES_VALIDEES.json`). Cartes d'offre : chacune ajoute SON format ; la fiche ajoute le format choisi (« Ajouter le pack — 33,20 € »), barre d'achat au téléphone. |
| Commande | Simulée et annoncée ; inscription à la newsletter facultative et décochée ; retours en arrière sans perte de saisie ; boutique réelle : paiement Shopify. |
| Studio | 30 sections `fg-*` (FR/EN), plus de 490 libellés d'éditeur traduits en anglais, réglages globaux « Offres par lots » et « Habillage propre au thème ». |

## Calculs des offres (snippet `fg-offer`)

Le nombre en tête du nom du format (« 3 flacons ») donne le nombre d'unités ; le prix d'une unité est celui du format à
une unité. Pour chaque format : prix de référence = unité × nombre ; économie = référence − prix du format ; si l'économie
est un multiple de l'unité → « [payés] achetés + [offerts] offert » ; sinon → « −[pct] % sur le [n]ᵉ » et « Le [n]ᵉ à
[prix] » ; prix par unité (« ≈ » s'il est arrondi) ; « Meilleure offre » = prix par unité le plus bas parmi les formats de
plus d'une unité (un calcul, pas une popularité). Sans formats par lots (autre client), aucune comparaison n'apparaît.

## Polices et export vers d'autres plateformes

Titres : Poppins (graisses 500 à 800) ; italique d'accent : Playfair Display 800 ; capitales à empattements « FRAISE. » :
Playfair Display 700 ; mots manuscrits : Caveat ; tampon arrondi : Fraunces. Toutes sous licence libre (`assets/fonts/`).
Les polices de titres et d'accent se règlent dans Réglages du thème › Typographie ; elles sont chargées par la mise en page
(réglage « Habillage propre au thème » = FRAISE), avec la feuille `fraise.css` et le script `fraise.js`, ce qui les fait
partir avec les exports WordPress / PrestaShop. Limite de ces exports (comme pour le bloc d'achat standard) : les sections
liées au produit (cartes d'offre, carte « goût et produit ») ne sont rendues que par Shopify ; ailleurs, l'achat passe par
la fiche produit de la plateforme.

## MATRICE_FRAISE — planche → panneau → route → sections → médias → offre / action → preuve → statut

Comparaisons (référence | rendu, superposition à 50 %, différences ×3) à l'échelle de chaque panneau de référence, captures
pleine page 1440 / 390 / 360 / 430, états de la planche 07 : dans le rapport visuel livré en ZIP (médias privés, hors
dépôt). « Testé » = vérifié par `tests/fraise-theme.test.ts` et rejoué dans Chromium ; « réalisé » = présent, rendu et
comparé visuellement. Médias : numéros des fichiers de `public/demo/fraise/v2/` (kit privé).

| Planche | Panneau | Route | Sections | Médias | Offre / action | Preuve | Statut |
|---|---|---|---|---|---|---|---|
| 01 / 04 | Accueil | `/` | fg-hero, fg-taste, fg-details, fg-offers, fg-everyday, fg-duo, fg-faqteaser, fg-news, fg-page | 01-08, 10, 12, 17, 18, 22, logo | 3 offres, ajout par format, inscription | `01-accueil-*`, `m01-accueil-*` | testé |
| 01 / 04 | Fiche | `/products/gummies-fraise` | fg-product, fg-tabs, fg-texture, fg-uses, fg-info, fg-faqteaser, fg-cta, fg-page | 01-08, 12-14, 22, 24 | formats, quantité, ajout du pack, galerie et zoom, barre d'achat | `02-fiche-*`, `m02-fiche-*` | testé |
| 02 / 05 | Boutique | `/collections/all` | fg-hero, fg-offers (boutique), fg-strip | 01, 05-08, 10, 15, 16, 24 | 3 offres, ajout | `03-boutique-*`, `m03-boutique-*` | testé |
| 02 / 05 | La recette | `/pages/la-recette` | fg-hero, fg-recipe | 01, 07-10 | informations « à compléter » | `04-recette-*`, `m04-recette-*` | réalisé |
| 02 / 05 | Notre histoire | `/pages/notre-histoire` | fg-hero, fg-story, fg-band | 05, 07, 08, 10, 11, 13 | — | `05-histoire-*`, `m05-histoire-*` | réalisé |
| 02 / 05 | Journal | `/pages/journal` + 6 articles | fg-journal, fg-news ; fg-article | 17-21, 23 | filtres, chaque carte ouvre son article | `06-journal-*`, `m06-journal-*` | testé |
| 03 / 07 | Panier | `/cart` | fg-hero, fg-cart | 05, 24 | quantités de packs, flacons, suppression, sous-total, livraison à calculer | `07-panier-*`, `m11-panier-*`, `m17-panier-vide-*` | testé |
| 03 / 07 | Commande | `/pages/commande` | fg-checkout | 05, 07 | 4 étapes, validation des champs, paiement inactif, écran d'exemple | `08-commande-*`, `m12` à `m15` | testé |
| 03 / 06 | FAQ | `/pages/faq` | fg-hero, fg-faq | 10, 24 | recherche, filtres, questions propres au téléphone | `09-faq-*`, `m07-faq-*` | testé |
| 03 / 06 | Contact | `/pages/contact` | fg-contact | 05 | formulaire simulé annoncé, consentement décoché | `10-contact-*`, `m08-contact-*` | testé |
| 03 / 06 | Livraison et retours | `/pages/livraison-et-retours` | fg-hero, fg-shipping | 07, 24 | onglets, conditions « à compléter » | `11-livraison-*`, `m09-livraison-*` | réalisé |
| 03 / 06 | Suivi | `/pages/suivi-de-commande` | fg-track | 22 | résultat d'exemple annoncé | `12-suivi-*`, `m10-suivi-*` | testé |
| 07 | Menu ouvert | toutes | fg-header (menu plein écran, recherche) | logo | liens, recherche, mentions | `m16-menu-*` | testé |
| 07 | Tiroir du panier | toutes | fg-header (tiroir) | 01-03 | quantités, suppression, sous-total | `m18-tiroir-*` | testé |
| — | Légal, cookies, 404 | `/pages/mentions-legales`… | fg-legal, fg-hero | logo | bandeau cookies, choix mémorisé | captures 1440/390 | réalisé |

Échelles (largeur du panneau ← viewport, facteur) : planche 01 692 px ← 1440 (×2,08) ; planche 02 620 px ← 1440 (×2,32) ;
planche 03 491-494 px ← 1440 (×2,92-2,93) ; planche 04 272-286 px ← 390 (×1,36-1,43) ; planche 05 289-298 px ← 390
(×1,31-1,35) ; planche 06 356-361 px ← 390 (×1,08-1,10) ; planche 07 ≈ 280-300 px ← 390 (×1,3-1,4). Le détail par panneau
est dans `echelles.csv` du rapport.

## Médias (kit privé `public/demo/fraise/v2/`)

- **Utilisés** : les 24 photos complémentaires recréées d'après les planches (01 à 24) et le logo proposé.
- **Non utilisés (en réserve)** : les 9 photos originales du kit (`01-hero`, `02-fond-clair`, `03-vue-plongee`,
  `04-detail-gummies`, `05-detail-packaging`, `06-banniere`, `07-scene-cuisine`, `08-scene-jardin`, `09-scene-fete`) :
  les compléments reprennent plus fidèlement les cadrages des planches ; les maquettes restent la référence.

## Reprise au pixel (retour de Thomas du 25 octobre : « c'est au pixel près »)

Mesures relevées sur chaque planche au repère 1440 (ordinateur) et 390 (téléphone), puis corrigées élément par élément :

- **Unité de mesure** : plusieurs zones avaient une marge intérieure qui réduisait toute leur mise en page (questions de
  la fiche −9 %, panier −10 %, commande −10 %, FAQ −8 %, livraison −7 % ; au téléphone −2 à −17 %). L'unité se mesure
  désormais sur toute la largeur ; les marges sont portées par les colonnes.
- **Découpage des planches 02 et 03** : les références étaient découpées avec 2 à 5 px de bord gris ; découpage refait au
  bord exact du panneau (les comparaisons sont recalculées).
- **Fiche** : formats (cartes de 206 et 219 px), « Tout savoir sur le flacon », questions en deux colonnes, bandeau
  « Votre rituel, côté fraise. » et nouveau pied de page « fiche » qui le prolonge (liens propres, réglables).
- **Planche 02** : en-tête propre (bandeau de 35 px à trois groupes, barre de 91 px), boutique (titre resserré, trois
  cartes de 418 / 439 / 495 px), recette (photo d'ouverture selon le dossier, mots manuscrits), histoire (cartes, bandeau
  incliné fondu dans le pied), journal (carte vedette, cartes, cadrages).
- **Planche 03** : en-tête dessiné plus grand (barre de 122 px, logo de 236 px, sac au trait), panier (récapitulatif sur
  carte rose), commande (colonnes, champs, récapitulatif), FAQ, contact, livraison, suivi.
- **Téléphone** : formats de l'accueil sur cartes blanches avec sac, fond rose de la recette au pied, liens légaux du pied
  affichés une seule fois (ils apparaissaient deux fois), bandeau sous l'en-tête des pages de la planche 05, fondu des
  photos d'ouverture (FAQ, livraison).


- **Photos** : les photos complémentaires ne sont pas les images exactes des planches (cadrages, éclairage, nombre de
  fraises et de gummies, flacon parfois plus grand) ; elles sont recadrées au plus près, mais la superposition montre ces
  différences sur chaque page.
- **Typographie** : polices libres les plus proches (Poppins, Playfair Display, Caveat, Fraunces) ; quelques corps et
  coupes de lignes diffèrent d'un ou deux pixels selon les pages.
- **Hauteurs** : à l'ordinateur, les pages tiennent à ±3 % de la planche sauf la boutique (+5 %) et le panier (−7 %) ;
  au téléphone, les pages de la planche 06 (FAQ, contact, livraison, suivi) restent 8 à 16 % plus hautes (textes de
  démonstration plus longs, encadrés « [À compléter : …] », pied de page plus haut) : à reprendre si Thomas le demande.
- **Mentions « [À compléter : …] »** : gardées (composition, frais de livraison, délai de retour) car l'information
  réelle n'est pas fournie ; elles ajoutent une ou deux lignes que la planche n'a pas.
- **Corrections d'honnêteté voulues** : panier « Total des produits (hors livraison) » au lieu de « Total » ; écran de
  confirmation « Exemple d'écran : aucune commande n'a été enregistrée » ; étape de paiement sans aucun champ ; légende
  « Le goût fraise » au lieu de « De vraies fraises » ; réseaux sociaux en pictogrammes sans lien « compte à compléter » ;
  année du copyright = année en cours ; catégories du journal au téléphone reprises des catégories réelles des articles.
- **Sections de bibliothèque ajoutées à FRAISE** : elles prennent les couleurs et polices du projet, pas le dessin propre
  des sections FRAISE.

## Vérifications

- `npx tsc --noEmit`, `npx vitest run` (toute la suite), `tests/fraise-theme.test.ts` (19 tests : offres, calculs,
  panier, ajouts, honnêteté, commande simulée, journal, téléphone, édition, adaptation à un autre client).
- `scripts/verify-theme.sh` (Theme Check de Shopify, comme la CI).
- Captures Chromium 1440 / 390 / 360 / 430 des 26 pages de l'export : débordement horizontal 0 partout (104 captures).
- Non vérifié : installation dans une vraie boutique Shopify, paiement réel, rendu dans WordPress / PrestaShop installés.
