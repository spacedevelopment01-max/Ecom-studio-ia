# Recherche approfondie du 22 novembre 2026 : ce qui fait un thème de très haut niveau, qui vend et ne ressemble à aucun autre

Ce rapport va plus loin que `docs/studio/recherches-2026-11-22/01-themes-sur-mesure.md` et que le rapport 5 de
`.lecture/recherches-21-novembre.md`. Il ne répète pas ce qu'ils disent (Design2Code, DCGen, ScreenCoder, la boucle de
relecture sur captures, Baymard fiche produit et navigation 2026, WebAIM, les seuils Lighthouse de Shopify, Design
Creativity Bench, Design Theater). Il ne répète pas non plus ce qui est déjà écrit dans les cahiers de SINA
(`docs/sina-savoir/theme-typographie-et-couleur.md`, `theme-mise-en-page-et-mouvement.md`, `theme-textes.md`), qui
contiennent déjà les tailles de texte, les longueurs de ligne, les durées d'animation, les rôles de couleur et le
registre des signatures.

Aucun fichier du dépôt n'a été modifié en dehors de celui-ci. Aucun appel payant à une IA ni à un fournisseur.

**Niveaux de preuve**
- **officiel** : texte de loi, document d'une administration, documentation de l'éditeur sur ce qu'il fait ou exige ;
- **étude publiée** : recherche relue ou à grande échelle et à méthode publiée (Baymard, Nielsen Norman Group, CXL) ;
- **article de recherche** : déposé en ligne, pas encore relu par des pairs ;
- **test indépendant** : quelqu'un a essayé l'outil lui-même ;
- **article d'éditeur / avocat** : un vendeur ou un cabinet qui explique ;
- **avis** : blog, comparatif, note d'utilisateurs.

**Ce que j'ai lu, et ce que je n'ai pas pu lire** (dit franchement)
- Lu en entier ou en grande partie : EUR-Lex (directive 2023/2673 sur la fonction de rétractation ; lignes directrices de
  la Commission sur l'article 6 bis des annonces de réduction), la fiche de la DGCCRF sur l'accessibilité (document PDF
  publié sur handicap.gouv.fr), la page des exigences de la boutique de thèmes Shopify (relue ce soir pour la règle
  d'originalité mot pour mot), Baymard (bonnes pratiques mobiles 2026, recherche), Nielsen Norman Group (défilement et
  attention, menus cachés, prix montrés), l'article « Mine, Sample, Render » en entier cette fois (le rapport de ce
  matin n'avait que le résumé), Evil Martians sur les couleurs OKLCH, les pages officielles de Readdy, Durable, 10Web,
  Hostinger, Uizard et l'article de Squarespace sur sa « Design Intelligence ».
- Légifrance et les pages de la DGCCRF sur economie.gouv.fr m'ont encore refusé l'accès (erreur 403). J'ai contourné par
  EUR-Lex, par la CCI Paris Île-de-France et par des cabinets d'avocats. Deux pages EUR-Lex (texte consolidé de la
  directive sur les pratiques déloyales, directive Omnibus) se sont affichées vides : je n'ai pas pu en citer les points
  de la liste noire mot pour mot.
- Pages lues dont la source est faible et que je signale : l'article du cabinet Kohen Avocats annonce lui-même être écrit
  par une IA ; ses chiffres de sanctions sont repris ici seulement comme pistes à vérifier.

---

## 1. Le savoir-faire des meilleurs créateurs de thèmes, en règles vérifiables par le code

Les cahiers de SINA ont déjà les règles générales (tailles de texte, longueurs de ligne, couples de polices, durées
d'animation, rôles de couleur). Ce qui suit est ce que la recherche de ce soir ajoute, et surtout ce que la lecture du
code du thème unique a montré : plusieurs règles des meilleurs ne sont pas encore tenues par les feuilles de style de
SINA (`public/sections/tenue*.css`) ni par l'export vers Shopify (`to-shopify.ts`).

### 1.1 Les photos : une vraie balise d'image, jamais une image de fond, pour tout ce qui compte
- **Le fait.** Shopify, page officielle des bonnes pratiques de vitesse des thèmes :
  - « pour le contenu d'ouverture ou le plus grand élément du premier écran, utilisez une balise `<img>` plutôt qu'une
    image de fond (`background-image`), afin que le navigateur la découvre plus tôt » ;
  - charger tout de suite les images du premier écran (« Always eagerly load images visible in the initial viewport »),
    jamais en différé, et donner `fetchpriority="high"` à l'image principale ;
  - différer toutes les autres ; donner plusieurs largeurs d'image (`srcset`) avec `sizes` pour servir « la plus petite
    image qui reste belle » à chaque écran ;
  - une photo différente pour téléphone et ordinateur passe par `<picture>`, jamais par deux images dont l'une est
    cachée ;
  - retirer les transitions appliquées à l'image principale : elles retardent la mesure du premier affichage.
  Google (web.dev) : le plus grand élément doit s'afficher en 2,5 secondes au plus pour au moins 75 % des visites ; une
  image de fond non préchargée est « un cas à problème ». Sur de vrais sites, les pages qui différaient leur image
  principale avaient un affichage plus lent (médiane 3 546 ms contre 2 922 ms ; corrélation, pas preuve) ; en test,
  ne pas différer le premier écran a gagné jusqu'à 18 % sur téléphone. L'enjeu en ventes : étude Deloitte pour Google
  (37 marques, plus de 30 millions de visites, fin 2019) : 0,1 seconde gagnée sur téléphone, **+8,4 % de conversions**
  et **+9,2 % de dépenses** dans le commerce de détail ; **+21,6 %** de formulaires envoyés jusqu'au bout pour les sites
  qui récoltent des demandes (comme les devis). Étude commandée par Google, qui a intérêt à la vitesse.
- **Liens.** https://shopify.dev/docs/storefronts/themes/best-practices/performance.md ;
  https://web.dev/articles/optimize-lcp ; https://web.dev/articles/lcp-lazy-loading ;
  https://web.dev/case-studies/milliseconds-make-millions
- **Preuve.** Officiel (Shopify, Google) ; étude publiée mais commandée (Deloitte).
- **Dans le code du Studio (vérifié, c'est le point le plus important de ce rapport).** Dans le thème unique, **toutes
  les photos sont des images de fond** : `<div class="tn-ph" style="background-image:url(...)">`. J'ai compté 141
  emplacements de photo dans les modules `tenue*.ts` et l'export `to-shopify.ts` (cartes, galerie produit, panier,
  articles), **aucune balise `<img>`**, et seulement 9 emplacements avec `role="img"` et un `aria-label`. Donc :
  pas de largeurs multiples (une seule largeur fixe, 800 ou 1 400 pixels, envoyée aussi au téléphone), pas de chargement
  différé, pas de priorité pour l'ouverture, et presque aucune photo avec un texte de remplacement (les
  cartes produit n'en ont pas). Shopify exige pourtant un texte de remplacement sur chaque image et
  une stratégie d'images adaptées à l'écran pour sa boutique de thèmes. Les anciennes sections de `theme-base/` (par
  exemple `fg-product.liquid`) font déjà bien : première image `loading: 'eager', fetchpriority: 'high'`, les suivantes
  en différé, largeurs 600, 1 000 et 1 600.
- **Ce que le Studio pourrait en faire.** Une seule règle, posée une fois dans le moteur : toute photo du thème est une
  vraie balise `<img>` (ou `<picture>`) avec `object-fit: cover` pour garder les cadres actuels, plusieurs largeurs,
  `sizes`, largeur et hauteur écrites (pas de saut de page), texte de remplacement tiré du produit ou de la scène ;
  l'image d'ouverture et la première photo produit en priorité haute, tout le reste en différé. Le client ne voit pas le
  changement à l'œil ; il voit un site qui s'ouvre plus vite sur son téléphone. Un contrôle par le code refuse ensuite
  toute `background-image` sur une photo de contenu.

### 1.2 Une échelle de tailles de texte, pas 59 tailles
- **Le fait.** Les méthodes publiées des concepteurs de systèmes (Utopia, James Gilyead et Trys Mudford, 2020) fixent une
  échelle pour le petit écran (exemple de l'article : rapport de 1,2 à 320 pixels de large) et une pour le grand (1,333 à
  1 500 pixels), puis laissent le navigateur calculer les tailles entre les deux. Le cahier de SINA le dit aussi (un corps
  de base et un rapport, `theme-typographie-et-couleur.md`). Shopify demande des titres de niveaux « visuellement
  distincts ».
- **Lien.** https://utopia.fyi/blog/designing-with-fluid-type-scales/
- **Preuve.** Article de praticiens reconnus (méthode, pas étude chiffrée).
- **Dans le code du Studio (vérifié).** Les feuilles `tenue*.css` écrivent **59 tailles de texte différentes en
  pixels**, de 9 à 200 pixels (dont 9 ; 10 ; 10,5 ; 11 ; 11,5 ; 12,5 ; 13,5 ; 14,5 ; 15,5 ; 16,5 ; 17,5 ; 18,5…), et
  seulement une cinquantaine de `clamp()` en tout ; 24 règles posent du texte à 11,5 pixels ou moins (étiquettes de packs,
  macarons, mentions sous les cartes). Les grands titres suivent déjà un coefficient commun (`calc(58px*var(--tn-k))`).
- **Ce que le Studio pourrait en faire.** Remplacer les tailles écrites en dur par 8 à 10 pas nommés (petit, texte,
  intertitre, titre de section, grand titre, titre d'ouverture…), chacun fluide entre le téléphone et l'ordinateur, avec un
  rapport propre à la famille (petit pour « Confiance et savoir-faire », grand pour « Spectaculaire »). Contrôle par le
  code : aucune taille hors de l'échelle, aucun texte lisible sous 12 pixels (proposition de métier ; je n'ai pas trouvé de
  seuil officiel lisible ce soir). Bénéfice pour le client : un site plus tenu, et des titres qui ne débordent plus sur
  petit écran.

### 1.3 Les couleurs dérivées se calculent dans un espace qui suit l'œil
- **Le fait.** Evil Martians (studio qui a fait adopter OKLCH) : dans `oklch()`, la clarté est « perçue » de la même
  façon quelle que soit la teinte, contrairement au HSL ; on peut garder la même clarté et la même saturation et ne changer
  que la teinte, ou éclaircir au survol avec `oklch(from var(--accent) calc(l + 0.1) c h)`. Tous les navigateurs actuels
  le lisent ; certaines couleurs n'existent pas sur tous les écrans (baisser la saturation plutôt que couper). Mises en
  garde : une différence de clarté de 20 % ne suffit pas à rendre un texte lisible, et OKLCH « ne suffit pas » à
  garantir le contraste : il faut le mesurer.
- **Lien.** https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl
- **Preuve.** Article de praticiens (article d'éditeur au sens large).
- **Dans le code du Studio (vérifié).** Les nuances de la marque sont mélangées en valeurs rouge-vert-bleu brutes
  (`melange` dans `tenue.ts`) et les feuilles utilisent 359 fois `color-mix(in srgb, …)` contre 5 fois `in oklab`. Ce
  mélange donne des teintes ternes au milieu (le cahier le note pour les dégradés). Le contraste est calculé sur les
  variables principales (4,5, 3 et 7 selon les cas), mais pas sur les couleurs mélangées directement dans les feuilles.
- **Ce que le Studio pourrait en faire.** Faire les mélanges en `oklab` (une ligne à changer par règle, ou une variable
  commune) et mesurer le contraste réel sur la page affichée, élément par élément (axe le fait sur le navigateur déjà
  utilisé pour les captures), pas seulement sur les variables. C'est le défaut commun des six créateurs de sites testés en
  partie 5 : boutons sous le seuil de contraste.

### 1.4 Ce qui rend les photos regardées
- **Le fait.** Nielsen Norman Group (oculométrie) : les photos qui informent (vrais produits en détail, vraies personnes)
  sont regardées, les photos décoratives sont ignorées comme du « remplissage » ; sur une page d'équipe, les portraits ont
  reçu 10 % de temps en plus que les biographies qui prenaient trois fois plus de place ; un agrandissement doit faire au
  moins **deux fois** la taille de la photo de départ.
- **Lien.** https://www.nngroup.com/articles/photos-as-web-content/
- **Preuve.** Étude publiée (ancienne, 2010, mise à jour en 2026, effectif non donné).
- **Ce que SINA pourrait en faire.** Confirme deux règles du propriétaire (vrai produit, jamais d'équipe inventée).
  Ajouter un contrôle : toute photo produit qui s'agrandit (galerie de la fiche) est servie au moins au double de sa taille
  affichée ; aucune photo sans rôle (le juge des images le note déjà pour les objets vierges).

### 1.5 Les polices les plus vues du web donnent l'air « déjà vu »
- **Le fait.** Web Almanac 2025 (HTTP Archive, publié le 15 janvier 2026) : polices déclarées sur le plus de pages :
  Roboto (environ 10 %), Poppins (environ 6 %), Open Sans (environ 5 %), Montserrat (3 à 4 %), Inter (1,5 %). 88 % des
  pages ont une police web ; 39 à 41 % des sites utilisent une police variable ; 72 % hébergent au moins une police
  eux-mêmes. Le guide d'Anthropic sur l'esthétique des interfaces (rapport du 21 novembre) cite déjà Inter et Roboto parmi
  les choix qui rendent un site générique.
- **Lien.** https://almanac.httparchive.org/en/2025/fonts
- **Preuve.** Étude publiée (mesure de millions de pages).
- **Dans le code du Studio (vérifié).** Le choix des polices de marque (`variete-marques.ts`, `identities.ts`) permet
  Poppins, Montserrat, Inter, Open Sans et Roboto Mono.
- **Ce que SINA pourrait en faire.** Ne pas les interdire (une marque peut en avoir besoin), mais les faire passer en
  dernier choix pour les titres : la police des titres est ce que l'œil reconnaît d'un site à l'autre.

### 1.6 La note du jury des sites primés, pour régler le juge
- **Le fait.** Awwwards fait noter chaque site par au moins 18 jurés, retire les 3 notes les plus éloignées de la
  moyenne, et pondère : dessin 40 %, facilité d'usage 30 %, créativité 20 %, contenu 10 % ; mention à partir de 6,5 sur 10.
- **Lien.** https://www.awwwards.com/about-evaluation/
- **Preuve.** Officiel (règlement du prix).
- **Ce que SINA pourrait en faire.** Reprendre deux idées, pas les poids : plusieurs avis et l'écart des avis extrêmes
  (le juge de SINA peut noter deux fois, ordre inversé, et écarter l'avis qui s'éloigne) ; une note par critère avec un
  seuil. **Contradiction à signaler** : Awwwards met le dessin avant l'usage, la règle du propriétaire est « clair
  d'abord, beau ensuite ». Si le juge reprend une pondération, la clarté doit peser au moins autant que le dessin. Je ne
  recommande pas les poids d'Awwwards.

### 1.7 Ce que je n'ai pas pu lire ce soir sur le métier des créateurs de thèmes
La réserve de recherches sur Internet a été épuisée au milieu de cette partie. Je n'ai donc pas pu lire : les principes
de conception publiés par Shopify pour Horizon, les sites primés d'artisanat sur Awwwards, CSS Design Awards et
Siteinspire (rien de chiffré n'y est publié de toute façon), ni les créateurs de thèmes Archetype, Maestrooo et Out of the
Sandbox (le rapport de ce matin n'avait rien trouvé de publié par eux).

---

## 2. Ce qui fait vendre : chiffres nouveaux par rapport à ce matin

### 2.1 Le téléphone : l'état des lieux de Baymard en 2026
- **Le fait.** Sur plus de 150 grands sites testés sur téléphone en 2026, 75 % sont « médiocres », un seul est « bon »,
  aucun « parfait » (mise à jour du 14 juillet 2026). Les dix manques les plus utiles pour le Studio, avec la part des sites
  qui échouent :
  - la rubrique où l'on se trouve n'est pas marquée dans le menu : **94 %** ;
  - messages d'erreur de formulaire génériques au lieu de messages qui disent quoi corriger : **93 %** (Baymard conseille
    4 à 7 messages différents pour un champ téléphone, e-mail ou carte) ;
  - toutes les pastilles de couleur ne sont pas montrées sur les cartes produit (« +7 » caché) : **73 %** ;
  - filtres choisis non rappelés au-dessus de la liste : **66 %** ;
  - photos des avis clients qu'on ne peut pas faire défiler d'un avis à l'autre : **57 %** ;
  - pas d'aide à la saisie de l'adresse : **54 %** ;
  - versions d'un produit (couleurs) montrées comme des produits séparés : **42 %** ;
  - pas de « Tout voir » à chaque niveau du catalogue : **42 %** ;
  - pas de bouton pour lancer la recherche à côté du champ : **27 %** ;
  - pas de suggestion quand le mot est mal écrit : **28 %**.
- **Lien.** https://baymard.com/blog/mobile-ux-ecommerce
- **Preuve.** Étude publiée (Baymard ; la page signale elle-même des chiffres un peu différents dans ses articles liés).
- **Dans le code du Studio (vérifié).** Les filtres de la page boutique se rappellent déjà en étiquettes au-dessus de la
  liste (`public/sections/tenue.js`) ; les pastilles de couleur existent sous le bloc d'achat (`tenue-achat.ts`). Je n'ai
  pas trouvé de marque de la rubrique en cours dans l'en-tête (`tenue-coque.css` souligne au survol seulement).
- **Ce que le Studio pourrait en faire.** Trois contrôles par le code, sur la capture téléphone : la rubrique en cours est
  marquée dans le menu (attribut `aria-current` plus un signe visible) ; une carte produit montre toutes ses pastilles ou
  les fait défiler avec une flèche visible ; chaque champ de formulaire a au moins deux messages d'erreur précis (vide,
  mal écrit), en français et en anglais.

### 2.2 Le menu caché coûte cher, sauf s'il ne cache presque rien
- **Le fait.** Nielsen Norman Group (179 participants, 6 sites, 2016) : sur ordinateur, le menu caché derrière l'icône à
  trois traits n'est utilisé que dans 27 % des cas, contre 48 % pour un menu visible ; les tâches prennent au moins 39 %
  plus de temps. Sur téléphone, menu caché 57 % contre 86 % pour un menu « combiné » (quelques liens visibles plus le
  reste caché) ; trouver le contenu baisse de plus de 20 %. Conseil : sur téléphone, avec 4 liens principaux ou moins, les
  montrer tous ; au-delà, montrer les plus importants.
- **Lien.** https://www.nngroup.com/articles/hamburger-menus/
- **Preuve.** Étude publiée (ancienne, mais aucune plus récente trouvée qui la contredise).
- **Dans le code du Studio (vérifié).** L'en-tête a une icône à trois traits sur téléphone (`tenue-coque.css`) ; je n'ai
  pas vérifié si un en-tête montre aussi des liens visibles sur téléphone.
- **Ce que le Studio pourrait en faire.** Sur téléphone, tout site qui a 4 rubriques ou moins les montre en clair sous le
  logo ou en bas d'écran ; au-delà, l'action principale du métier (« Réserver », « Devis », « Boutique ») reste visible
  hors du menu. C'est vérifiable sur la capture à 390 pixels de large.

### 2.3 Le premier écran : la part exacte du regard
- **Le fait.** Nielsen Norman Group, 2018, 120 participants, plus de 130 000 points de regard : **57 %** du temps de
  regard sur le premier écran, **74 %** sur les deux premiers, **81 %** sur les trois premiers (contre 80 % pour le seul
  premier écran en 2010). Les « faux fonds » (une page qui semble finie) arrêtent le défilement : un indice doit montrer
  qu'il y a une suite.
- **Lien.** https://www.nngroup.com/articles/scrolling-and-attention/
- **Preuve.** Étude publiée.
- **Ce que le Studio pourrait en faire.** La règle d'or « l'offre et la question qui bloque au plus tard en 3e position »
  est juste : les trois premiers écrans reçoivent les quatre cinquièmes du regard. Ajouter une vérification sur la capture :
  le bas du premier écran téléphone laisse voir le début de la section suivante (texte ou photo coupé par le bord), pour
  qu'on sache qu'il y a une suite. Attention : jamais un bouton coupé (règle du propriétaire) ; c'est le haut de la section
  suivante qui dépasse, pas un bouton.

### 2.4 Les services : montrer des prix d'exemple, raccourcir le formulaire de devis
- **Le fait.**
  - Nielsen Norman Group : quand le prix exact est impossible, montrer « des cas représentatifs et leurs prix » ; un
    tableau de prix pour les demandes courantes a été jugé plus utile qu'un calculateur (article de 2006, exemple d'un
    jardinier). Dans ses tests internationaux, les participants étaient agacés quand un site ne montrait aucun exemple de
    prix et exigeait une demande de devis ; ceux qui cachent les prix passent pour « évasifs ».
  - Baymard, formulaires (juin 2024) : 11,3 champs en moyenne au paiement, 8 suffisent sur la plupart des sites ; un seul
    champ « nom complet » (42 % des participants ont tapé leur nom entier dans « prénom ») ; cacher les champs facultatifs
    derrière un lien ; les formulaires de 10 à 15 champs intimident ; une seule colonne fait moins d'erreurs.
- **Liens.** https://www.nngroup.com/articles/show-prices-for-common-scenarios/ ;
  https://www.nngroup.com/articles/show-price/ (vu en résultat de recherche seulement) ;
  https://baymard.com/research-articles/checkout-flow-average-form-fields
- **Preuve.** Études publiées (Nielsen Norman Group, qualitative et ancienne ; Baymard).
- **Dans le code du Studio (vérifié).** Le Studio est déjà en avance : la section « exemples de prix » (`tn-exemples-prix`,
  « trois chantiers, trois prix », prix réels seulement, sinon « [À compléter] ») et un formulaire de devis de quatre
  champs par défaut, un seul champ nom, le détail facultatif (`tn-devis`, `tenue-services.ts`). Les formulaires sont écrits
  `onsubmit="return false"` dans les pièces ; je n'ai pas vérifié comment la demande part réellement sur le site en ligne.
- **Ce que le Studio pourrait en faire.** Faire de la section « exemples de prix » un passage obligé de la partition
  « devis d'artisan » dès que le client a donné au moins deux vrais prix ; garder le formulaire à 4 champs, plafond de 8 ;
  vérifier par un essai réel que chaque formulaire de devis et de rendez-vous arrive bien chez le client avant la mise en
  ligne (aucune demande perdue).

### 2.5 La première impression se calcule : la complexité visuelle
- **Le fait.** Reinecke et ses collègues (Harvard, conférence CHI 2013) : 548 volontaires ont noté 450 sites vus pendant
  une demi-seconde. Deux mesures calculées sur la seule capture (la **complexité visuelle**, par un découpage en
  quart d'image successifs, le nombre de zones de texte et d'images ; et la **quantité de couleur**) expliquent, avec
  l'âge et le niveau d'études, environ la moitié des notes d'attrait. La complexité pèse bien plus que la couleur. Une
  forte complexité fait chuter l'attrait ; un site simple est aussi aimé qu'un site moyen. Les plus de 45 ans préfèrent
  nettement les pages peu complexes. Même les sites primés aux Webby ont des notes très dispersées : le goût varie, la
  complexité excessive est rejetée par tous. Une première impression négative fait aussi juger le site moins fiable.
- **Lien.** https://kgajos.seas.harvard.edu/papers/reinecke13aesthetics.pdf (lu en entier)
- **Preuve.** Étude publiée (conférence relue).
- **Dans le code du Studio (vérifié).** `ressemblance.ts` découpe déjà chaque capture en cases et mesure leur « grain » :
  la moitié du calcul existe.
- **Ce que le Studio pourrait en faire.** Ajouter une note de complexité du premier écran (téléphone et ordinateur),
  calculée sans IA sur la capture, avec un plafond : un premier écran trop chargé est corrigé avant d'être montré,
  plus strictement pour une clientèle âgée (la planche de marque connaît le public visé).

### 2.6 Les liens et images depuis les réseaux sociaux
- **Le fait.** Shopify exige qu'un thème fonctionne dans les navigateurs intégrés d'Instagram, de Facebook et de
  Pinterest, en plus de Safari, Chrome, Firefox et Edge.
- **Lien.** https://shopify.dev/docs/storefronts/themes/store/requirements.md
- **Preuve.** Officiel.
- **Ce que le Studio pourrait en faire.** Les clients de SINA vivront des publications : leurs visiteurs arrivent par ces
  navigateurs intégrés (écran plus court à cause de la barre de l'application). Faire une capture du premier écran à
  390 × 664 pixels environ (hauteur réduite, valeur à mesurer sur un vrai téléphone : non vérifiée) et y vérifier le
  bouton principal entier.

---

## 3. La variété sans perte de qualité

### 3.1 « Mine, Sample, Render », lu en entier : comment le tirage se fait vraiment
- **Le fait.** Le rapport de ce matin n'avait que le résumé. La méthode, en trois temps :
  - **extraire** : un modèle compare de petits groupes de vrais exemples (pour les pages web : le code et la capture) et
    propose les caractéristiques qui reviennent ou qui changent ; les propositions sont fusionnées (synonymes), puis
    chaque exemple du corpus est marqué « a » ou « n'a pas » chaque caractéristique ;
  - **tirer** : une combinaison est tirée selon la fréquence réelle dans le corpus. Deux façons : tirer les
    caractéristiques une à une, chacune selon celles déjà tirées, en retirant les moins liées tant qu'il ne reste pas
    assez de vrais exemples qui les réunissent (ainsi on ne tire jamais une combinaison qu'aucun vrai site n'a) ; ou tirer
    d'abord un « thème » (un groupe de caractéristiques qui vont ensemble), puis ses caractéristiques. Les exigences du
    client (par exemple un menu à gauche) sont fixées avant le tirage ;
  - **dessiner** : le modèle ne reçoit que la demande et la combinaison tirée.
  Résultats sur les pages web (50 demandes, notes de variété « Vendi », plus haut = plus varié) : avec GPT-5.5, la variété
  du texte passe de 2,16 à 3,96 et celle de l'image de 2,45 à 4,12. Sur les images, la variété triple presque (2,37 à
  6,68). Réécrire la demande de façon coordonnée ne donne que 3,86. Limites dites par les auteurs : petits échantillons,
  variété jugée en partie par des modèles, gain plus faible avec d'autres modèles, qualité de l'extraction dépendante du
  modèle qui extrait.
- **Lien.** https://arxiv.org/html/2610.21185
- **Preuve.** Article de recherche.
- **Dans le code du Studio (vérifié).** Les six familles (`familles.ts`) donnent des choix permis ; la règle de variété
  (`variete-sites.ts`) et le contrôle par l'image (`ressemblance.ts`, seuil 48 sur 100) refusent après coup ; rien ne
  tire la combinaison **avant** le dessin.
- **Ce que le Studio pourrait en faire.** Le corpus existe : les références réelles des six familles et les sites déjà
  montés. Le Studio marquerait chaque référence (en-tête, ouverture, traitement des photos, forme des boutons, rythme des
  fonds, densité, couleur dominante) une fois pour toutes, puis tirerait pour chaque client une combinaison **qui existe
  chez de vrais bons sites** (c'est la garantie de qualité de la méthode) et **qui n'est pas prise** par les sites
  récents (c'est la variété). Le dessinateur de l'accueil reçoit cette combinaison. Coût : un seul passage d'extraction,
  puis un tirage gratuit à chaque client.

### 3.2 Mesurer la variété de tout le Studio, pas seulement deux sites
- **Le fait.** La note « Vendi » (Friedman et Dieng, revue TMLR 2023, utilisée par l'article ci-dessus) donne le « nombre
  effectif » de sites vraiment différents dans un ensemble, à partir d'une mesure de ressemblance entre chaque paire.
  Pour la ressemblance de deux images, DreamSim (conférence NeurIPS 2023, outil libre) s'accorde à 96 % avec les jugements
  humains sur son jeu d'essai ; il est entraîné à voir la disposition, la pose, le nombre d'objets et la couleur, pas
  seulement la texture.
- **Liens.** https://arxiv.org/html/2306.09344v3 (résumé et chiffres repris de la recherche, page non lue en entier) ;
  https://github.com/ssnl/dreamsim (vu en résultat de recherche seulement).
- **Preuve.** Études publiées (pour DreamSim) ; la note Vendi n'a été vue qu'à travers l'article 3.1.
- **Ce que le Studio pourrait en faire.** Calculer chaque mois, sans IA payante, le « nombre effectif de sites
  différents » parmi les 30 derniers sites, avec la matrice de ressemblance que `ressemblance.ts` calcule déjà : si ce
  nombre baisse, la variété s'effondre avant que le propriétaire le voie. DreamSim serait une seconde mesure, libre, à
  faire tourner sur le serveur du Studio : à essayer seulement si la mesure actuelle laisse passer des accueils que le
  propriétaire juge trop proches.

### 3.3 La règle d'originalité de Shopify, mot pour mot, et le test qu'elle contient
- **Le fait.** « Your theme must be fundamentally different from other themes on the Shopify Theme Store (including your
  own). » « Cosmetic or additive alterations are insufficient » : espacements, couleurs, polices, dégradés, séparateurs de
  formes, effets de fond ou flous, quelques réglages ou sections en plus, animations. Il faut des systèmes clairs pour
  l'en-tête et la navigation, les cartes produit, le traitement des photos et la structure des pages, un type de marchand
  visé, et ce test : « Reproducing your overall experience should require substantial structural changes to the theme. »
  Seul le thème de départ « Skeleton » est accepté (date du changement non vérifiée) : les thèmes tirés de Dawn ou d'Horizon sont exclus de la
  boutique de thèmes.
- **Lien.** https://shopify.dev/docs/storefronts/themes/store/requirements.md
- **Preuve.** Officiel. Cette règle vaut pour la boutique de thèmes, pas pour les sites des clients du Studio : c'est un
  modèle de jugement, pas une obligation.
- **Ce que le Studio pourrait en faire.** Le test de Shopify se traduit en question pour le juge de variété : « pour
  refaire ce site à partir du précédent, faudrait-il changer la structure (en-tête, cartes, photos, ordre des pages), ou
  seulement les couleurs et les polices ? » Si la seconde réponse suffit, le site est refusé. `variete-sites.ts` compte
  les pièces ; il ne compte pas encore séparément les quatre systèmes de Shopify (l'en-tête, le pied de page et l'ouverture
  tournent à part, ce qui est déjà une partie de la réponse) : ajouter les cartes produit et le traitement des photos à ce
  qui doit changer d'un site à l'autre.

### 3.4 Ce que font les créateurs de sites par IA contre l'uniformité
- **Le fait.** Squarespace dit filtrer l'IA « à travers la main de designers experts » : thèmes de site choisis par des
  designers avec des variations de palettes, de paquets de polices et de styles de boutons ; un « sélecteur de
  disposition » qui propose, pour un même contenu, des dispositions « dessinées et choisies à la main ». Il n'explique ni
  ses règles d'accord ni ses garde-fous. Hostinger dit que dans son mode « agent », « chaque dessin est généré de façon
  unique » à partir de la demande, mais n'en donne aucune preuve.
- **Liens.** https://www.squarespace.com/blog/squarespace-design-intelligence-ai ; https://www.hostinger.com/ai-website-builder
- **Preuve.** Articles d'éditeur.
- **Ce que le Studio pourrait en faire.** Rien de neuf à prendre : le Studio va déjà plus loin (contrôle de la variété
  mesuré et bloquant). C'est un argument de vente à dire au client, avec preuve : son site comparé aux sites récents.

---

## 4. Les règles françaises et européennes qui touchent le thème

### 4.1 Le bouton de rétractation est obligatoire depuis le 19 juin 2026
- **Le fait.** La directive (UE) 2023/2673 ajoute un article 11 bis à la directive 2011/83 : pour tout contrat conclu à
  distance par une interface en ligne, le professionnel offre une « fonction de rétractation » :
  - libellé « renoncer au contrat ici » ou une formule aussi claire, facilement lisible ;
  - « disponible en permanence pendant toute la durée du délai de rétractation », bien visible et facilement accessible ;
  - elle ouvre une déclaration en ligne où le client donne ou confirme son nom, ce qui identifie le contrat (la commande)
    et l'adresse électronique où recevoir la confirmation ;
  - puis un second bouton « confirmer la rétractation » ou une formule aussi claire ;
  - puis un accusé de réception « sans retard excessif », sur un support durable, avec le contenu de la déclaration, la
    date et l'heure de l'envoi.
  Transposition au plus tard le 19 décembre 2025, application le 19 juin 2026. En France : ordonnance n° 2026-2 et
  décret n° 2026-3 du 5 janvier 2026, articles L. 221-21 et D. 221-5 du code de la consommation (selon la CCI Paris
  Île-de-France ; Légifrance non lu). Les contrats en cours au 19 juin 2026 restent sous l'ancienne règle. Le délai reste
  de 14 jours. Amende administrative citée par un avocat : jusqu'à 75 000 € pour une société (article L. 242-13, non relu).
- **Liens.** https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32023L2673 ;
  https://www.entreprises.cci-paris-idf.fr/actualites/e-commerce-et-droit-de-retractation-une-nouvelle-obligation-pour-les-professionnels ;
  https://www.village-justice.com/articles/bouton-retractation-article-221-obligation-affichage-charge-preuve,58436.html
- **Preuve.** Officiel (texte européen lu sur EUR-Lex) ; chambre de commerce et avocat pour la transposition française.
- **Dans le code du Studio (vérifié).** Aucune mention de cette fonction dans `src/lib/syna-agent` ni `src/lib/theme` ;
  seules les conditions générales types de `src/lib/theme/section-copy-story.ts` parlent des 14 jours.
- **Ce que le Studio pourrait en faire.** Le thème porte, dans le pied de page de toute boutique et dans le compte client,
  un lien toujours visible « Renoncer à un achat » (en anglais « Withdraw from a purchase ») qui mène à la page en deux
  temps ; pour Shopify, WooCommerce et PrestaShop, le Studio vérifie avant la mise en ligne que la plateforme ou une
  extension fournit bien la déclaration et l'accusé de réception (le thème seul ne peut pas envoyer l'accusé). Pour les
  sites de services hébergés par le Studio, la même fonction est due quand la prestation vendue en ligne ouvre un droit
  de rétractation : c'est au Studio de la fournir.

### 4.2 Le prix barré : la règle des 30 jours, précisée par la Commission
- **Le fait.** Toute annonce de réduction indique le prix antérieur : « le prix le plus bas appliqué par ce professionnel
  au cours d'une période au moins égale aux 30 jours précédant » la réduction. Les lignes directrices officielles de la
  Commission (journal officiel C 526 du 29 décembre 2021) précisent :
  - **est une annonce de réduction** : « 20 % de réduction », « 10 € de réduction », « maintenant 50 €, avant 100 € », et
    aussi « soldé », « offre spéciale », « offre Black Friday » quand ils donnent l'impression d'une baisse ; un prix
    présenté comme « de lancement » avec un prix plus haut annoncé pour plus tard ;
  - **n'en est pas** (mais reste soumis à l'interdiction des pratiques trompeuses) : « le deuxième offert », les offres
    groupées ou conditionnelles, « meilleurs prix », les programmes de fidélité ; un code accessible à la plupart des
    clients, lui, en est une ;
  - le pourcentage se calcule **sur le prix antérieur**, pas sur le dernier prix : exemple officiel, prix le plus bas des
    30 jours 100 €, dernier prix 160 €, « −50 % » veut dire 50 € ;
  - en ligne, le prix antérieur s'affiche **à côté du prix**, dans l'interface ; une bannière générale peut ne pas le
    porter si chaque fiche le porte ;
  - des campagnes qui se suivent dans les 30 jours (Black Friday puis Cyber Monday) : le prix antérieur inclut les prix
    réduits de la première ; seule une baisse progressive, sans interruption, dans une même campagne, garde le prix
    d'avant la première baisse (en France, c'est écrit dans l'article L. 112-1-1 selon les avocats lus) ;
  - un produit en vente depuis moins de 30 jours : un pays peut prévoir une période plus courte, jamais aucune ;
  - **un prix conseillé** ou « prix de référence » du fabricant n'est pas l'objet de cette règle, mais devient une
    infraction s'il est perçu comme une réduction ;
  - la règle de l'article 6 bis ne vise que **les biens** ; pour les services, c'est l'interdiction générale des
    pratiques trompeuses qui s'applique.
  Sanctions françaises citées par des avocats (non relues sur Légifrance) : amende administrative jusqu'à 15 000 € pour
  une société (L. 131-5) pour l'affichage ; pratique commerciale trompeuse jusqu'à 300 000 € et deux ans, 750 000 € et
  cinq ans quand elle passe par un support numérique (L. 132-2). Affaire citée : la cour d'appel de Paris (2 avril 2025)
  a retenu contre un vendeur de matelas des « promotions commerciales quasi-permanentes » et un « sentiment d'urgence »
  (comptes à rebours qui repartent, fausses ruptures de stock) ; dommages-intérêts de 2 millions d'euros selon la page,
  qui est écrite par une IA et doit être vérifiée.
- **Liens.** https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:52021XC1229(06) ;
  https://kohenavocats.fr/2026/10/10/prix-barres-black-friday-2026-vendeur-prix-reference-dgccrf-sanction-contester/
- **Preuve.** Officiel (lignes directrices de la Commission) ; article d'avocat écrit par une IA pour les sanctions.
- **Dans le code du Studio (vérifié).** Le thème n'invente jamais de prix barré : il ne l'affiche que s'il vient du
  « prix de comparaison » du catalogue (`buy-block.ts`, `tenue-vente.ts`, `tenue-achat.ts`), et les sections à faux
  compte à rebours sont interdites (`FAKE_OFFER_SECTIONS` dans `library.ts`). **Mais** le prix de comparaison d'un
  catalogue Shopify, WooCommerce ou PrestaShop est un champ libre que le client remplit comme il veut : rien ne vérifie
  qu'il est le plus bas des 30 derniers jours. Le cahier `theme-textes.md` (ligne 80) et les cahiers des publications
  connaissent la règle ; le code du thème ne la contrôle pas.
- **Ce que le Studio pourrait en faire.** Ne jamais afficher un prix barré sans une confirmation écrite du client, enregistrée
  avec la date (« ce prix est le plus bas que tu as pratiqué ces 30 derniers jours »), ou sans l'historique des prix
  quand la plateforme le donne ; calculer le pourcentage sur ce prix ; écrire le prix antérieur à côté du prix sur la
  fiche et la carte ; refuser « prix conseillé » barré ; pour un service, ne jamais barrer un prix sans la même preuve.

### 4.3 Fausses urgences et pièges de conception : ce qui est déjà interdit, ce qui arrive
- **Le fait.** La liste noire de la directive sur les pratiques déloyales interdit en toutes circonstances de dire
  faussement qu'un produit ne sera disponible que très peu de temps pour pousser à décider tout de suite (je n'ai pas pu
  afficher le texte consolidé sur EUR-Lex ce soir : reprise des lectures précédentes, non relue mot pour mot). La
  Commission a publié le **11 novembre 2026** sa proposition de « Digital Fairness Act », qui remplacerait cette
  directive : elle interdit expressément les fausses raretés (« Plus qu'un en stock » faux), la culpabilisation (« Nous
  sommes tristes de te voir partir »), les cases cochées d'avance et les articles ajoutés d'office au panier ; elle
  impose le prix complet dès le début, frais et taxes compris (fin des frais révélés au dernier moment), une résiliation
  simple pour les contrats en ligne et une confirmation active avant qu'un essai gratuit devienne payant. Ce n'est qu'une
  proposition : le Parlement et le Conseil peuvent la changer, aucune date d'application.
- **Liens.** https://www.lewissilkin.com/insights/2026/11/11/european-commission-publishes-long-awaited-digital-fairness-act-102o9b5 ;
  https://www.europarl.europa.eu/legislative-train/theme-protecting-our-democracy-upholding-our-values/file-digital-fairness-act
  (page parlementaire vue en résultat de recherche seulement).
- **Preuve.** Article d'avocat (cabinet Lewis Silkin) sur un texte officiel que je n'ai pas lu.
- **Dans le code du Studio (vérifié).** Faux comptes à rebours interdits ; « stock restant » seulement avec le vrai stock
  (référence, partie 15) ; la fenêtre d'offre avec l'e-mail existe dans le style « vente directe ».
- **Ce que le Studio pourrait en faire.** Prendre d'avance les règles de la proposition, puisqu'elles ne coûtent rien et
  qu'elles rejoignent les règles du propriétaire : aucune case cochée d'avance, aucun article ajouté seul au panier
  (même un cadeau doit se voir et pouvoir se retirer), aucune phrase qui culpabilise dans la fenêtre d'offre ou au
  départ, frais de livraison dits sur la fiche avant le panier (ce que Baymard demande déjà, rapport de ce matin).

### 4.4 L'accessibilité : ce que dit la fiche de la DGCCRF elle-même
- **Le fait.** La fiche de la DGCCRF (juillet 2025) confirme que le commerce électronique fait partie des services
  contrôlés, en coordination avec l'Arcom. Un site doit être perceptible (texte de remplacement des images, contenu qui
  se réorganise sans perte), utilisable (tout au clavier, repères pour naviguer, temps suffisant, rien qui puisse
  provoquer une crise d'épilepsie), compréhensible (pages au fonctionnement prévisible, aide à corriger les erreurs de
  saisie) et robuste (compatible avec les aides techniques). Les exigences complètes sont dans l'arrêté du 9 octobre 2023.
  **Exemption** : « les entreprises employant moins de 10 salariés avec un chiffre d'affaires annuel ou total de bilan
  inférieur à 2 millions d'euros » : « aucune obligation en matière d'accessibilité ne s'impose aux prestataires de
  services ». Autres exemptions : changement fondamental de la nature du service, charge disproportionnée. Une démarche en
  ligne existe pour déclarer une exemption ou une non-conformité (vue en résultat de recherche seulement). Un site vitrine
  sans achat n'est pas du commerce électronique (selon un guide privé, non vérifié).
- **Liens.** https://handicap.gouv.fr/sites/handicap/files/2025-07/Fiche-conso-DGCCRF.pdf ;
  https://www.economie.gouv.fr/dgccrf/actualites-dgccrf/professionnels-comment-declarer-en-ligne-une-exemption-ou-une-non-conformite-aux-exigences-daccessibilite
  (non lue, erreur 403 attendue).
- **Preuve.** Officiel.
- **Ce que le Studio pourrait en faire.** La plupart des clients du Studio sont exemptés ; mais le Studio, lui, vend le
  site, et un client qui grandit perd l'exemption. Garder le niveau WCAG 2.2 AA comme barrière pour tous, et ajouter les
  deux points de la fiche que les contrôles actuels ne couvrent pas : la navigation complète au clavier (menus, tiroir du
  panier, fenêtres) et des messages d'erreur de formulaire qui disent comment corriger (Baymard : 93 % des sites mobiles
  ne le font pas, partie 2.2).

### 4.5 Les avis clients : ce qui reste à relire
- **Le fait.** L'article L. 111-7-2 oblige qui publie des avis à dire clairement comment ils sont collectés, contrôlés et
  publiés. Le texte d'application que je connaissais (D. 111-17 : à proximité des avis, dire s'ils sont contrôlés, la
  date de chaque avis et de l'expérience, les critères de classement ; dans une rubrique à part, s'il y a une
  contrepartie et la durée de conservation) est donné **abrogé le 9 juillet 2024** par un site qui reproduit le code ; je
  n'ai pas trouvé ce qui le remplace (piste : décret n° 2024-753 du 7 juillet 2024). La norme NF ISO 20488 (avis en
  ligne) n'a été trouvée par aucune recherche ce soir.
- **Lien.** https://french-business-law.com/french-legislation-art/article-d111-17-of-the-french-consumer-code
- **Preuve.** Reproduction privée du code ; à vérifier sur Légifrance.
- **Ce que le Studio pourrait en faire.** Garder la règle actuelle (seuls de vrais avis importés, avec leur date et la
  mention de leur contrôle) et la faire relire par un juriste avant le lot des publicités : c'est le seul point de cette
  partie qui reste incertain.

---

## 5. Les créateurs de sites par IA, lus à la source cette fois

| Outil | Ce que la page officielle dit (lue ce soir) | Test ou avis indépendant | Leçon pour SINA |
|---|---|---|---|
| **Readdy** | Part d'une description, d'une capture, d'un fichier Figma ou d'une adresse de site « pour apprendre sa structure » ; plus de 500 modèles ; mode « sélection » : on clique sur un élément pour le changer ; historique des versions ; code exportable ; formulaires stockés dans Supabase ; vente par Stripe ou Shopify ; aucune langue annoncée. | Notes Trustpilot partagées : plusieurs avis de février 2026 disent qu'il « ne suit souvent pas les consignes » et n'est « pas assez stable » pour un vrai commerce. Aucun test détaillé de la qualité trouvé. | Le clic sur l'aperçu est désormais la norme : le Studio l'a. Ce qui manque à Readdy (tenir les consignes, stabilité) est ce que les contrôles du Studio garantissent. |
| **Uizard** (Autodesigner) | Des écrans de **maquette** à partir d'une phrase ; un « thème » regénéré change l'allure ; aucune mise en ligne, aucun export de code annoncé. | Aucun lu. | Ce n'est pas un créateur de sites : rien à reprendre pour la mise en ligne. |
| **Durable** | Trois questions (métier, nom, objectifs), un site complet avec textes, images et dispositions du métier ; éditeur à glisser-déposer ; gestion des clients et des rendez-vous ; offre « Launch » à 22 $ par mois payé à l'année ou 25 $ au mois ; aucun export. | Test sur une même demande (cabinet de kinésithérapie inventé, FirmCritics, mis à jour le 22 août 2026) : le plus rapide à mettre en ligne « de loin », dessin « plus simple », bien rangé ; aucune vraie personnalisation, pas d'export. | Trois questions suffisent pour aller vite, pas pour un site juste : c'est l'écart que SINA comble en posant toutes les questions utiles. |
| **10Web** | Part d'une phrase, d'une adresse de site, d'un profil Google Business ou des réseaux ; produit un site WordPress avec l'administration complète ; boutique avec paiement, livraison et stock ; retouche par conversation ou éditeur visuel ; aucune note de vitesse promise sur la page. | Seulement des comparatifs. | Partir de la fiche Google Business ou des réseaux du client pour préremplir : une idée à proposer au propriétaire (SINA « trouve seule ce qu'elle peut trouver », partie 5 de la référence). |
| **Hostinger** | Plus de 900 modèles ; mode « agent » où « chaque dessin est généré de façon unique » ; mode manuel à glisser-déposer ; reprise d'un site existant depuis son adresse ; boutique sur les offres supérieures ; prix d'appel de 1,99 $ par mois sur 48 mois, renouvelé à 10,99 $ ; plusieurs affirmations sans preuve sur la page (« 5 000 $ économisés »). | Un test chronométré de quatre outils (Techfinitive) le donne meilleur des quatre (4,5 sur 5) ; je n'ai lu que le résumé du moteur, la page m'a refusé l'accès. | Le prix bas tire le marché vers « vite et passable » ; le Studio ne gagne que par la justesse et la beauté, pas par le prix. |
| **Squarespace Blueprint** | Catégorie, objectifs, nom et personnalité de marque ; thèmes choisis par des designers ; dispositions « dessinées à la main » proposées pour un même contenu ; seulement sur ordinateur. | Test de ce matin (un testeur) : propre mais générique. | Voir 3.4. |
| **Wix Harmony** | Lu ce matin (page d'aide) : l'assistante génère tout le site, puis on retouche ; Wix prévient elle-même que le résultat peut être « inattendu ou inexact » ; seulement en anglais. | Test FirmCritics (Wix, sans préciser Harmony) : « compétent et générique » ; paiement et rendez-vous seulement à partir de l'offre à 29 $ par mois ; pas d'export. | Le français est un avantage réel du Studio face à Wix Harmony. |

**Défauts communs aux six outils du test FirmCritics** (Framer, Wix, Webflow, Durable, Lovable, Replit) : des textes
« corrects, plausibles, totalement oubliables » ; des boutons dont le contraste passe souvent sous les seuils
d'accessibilité ; des textes de remplacement d'images absents ou qui décrivent la photo d'illustration ; **aucun outil
n'a demandé à quoi servait le site**, si bien que la prise de rendez-vous n'a pas été mise en avant. Seul Framer a donné
un premier jet que l'auteur aurait « montré à un client sans s'excuser ».
- **Liens.** https://readdy.ai/ ; https://www.trustpilot.com/review/readdy.ai?page=2 (vu en résultat de recherche) ;
  https://uizard.io/autodesigner/ ; https://durable.com/ai-website-builder ; https://10web.io/ai-website-builder/ ;
  https://www.hostinger.com/ai-website-builder ; https://www.squarespace.com/blog/squarespace-design-intelligence-ai ;
  https://www.firmcritics.com/blog/best-ai-website-builders-tested-on-the-same-build/ ;
  https://www.techfinitive.com/features/we-timed-four-ai-website-builders-from-prompt-to-finished-site-which-is-quickest-for-a-small-business/
  (refusée, résumé seulement)
- **Preuve.** Officiel pour ce que chaque outil dit de lui-même ; un seul test indépendant lu en entier (FirmCritics, un
  testeur, une seule demande, aucun lien commercial affiché sur la page lue).
- **Ce que le Studio pourrait en faire.** Les trois défauts communs sont exactement ce que les règles du propriétaire
  interdisent : textes qui ne font rien ressentir, boutons illisibles, site qui ignore son but. Les mettre en tête de la
  grille du juge, et les mesurer par le code quand c'est possible (contraste de chaque bouton, texte de remplacement
  présent et propre au produit, action principale du métier dans le premier écran).

---

## 6. Le reste, qui ferait monter les sites de SINA au niveau des meilleurs

### 6.1 Les mots écrits en dur dans la boutique exportée
- **Le fait (code du Studio, vérifié).** L'export du thème unique vers Shopify (`to-shopify.ts`) écrit en français, sans
  passer par les fichiers de traduction du thème : « Épuisé » (6 fois), « dès », « Retirer », « Tout voir », « Voir la
  boutique », « Offert », « Le plus populaire », « Les premiers articles arrivent bientôt ». Shopify demande, pour un thème
  en plusieurs langues, que tout le contenu soit traduit et que la langue de la page soit écrite (`<html lang="…">`).
- **Lien.** https://shopify.dev/docs/storefronts/themes/store/requirements.md
- **Preuve.** Officiel (pour l'exigence) ; lecture du code (pour le constat). Je n'ai pas vérifié l'export vers
  WooCommerce et PrestaShop, ni ce que voit un acheteur anglophone sur une vraie boutique.
- **Ce que le Studio pourrait en faire.** Faire passer chaque libellé de l'export par la traduction du thème (règle du
  propriétaire : « dans le thème, chaque libellé a sa traduction »), et un contrôle par le code qui refuse un mot français
  écrit en dur dans un fichier exporté.

### 6.2 Un contrôle unique « qualité du thème » avant que le client voie quoi que ce soit
Ce rapport ajoute des contrôles faisables sans IA, sur les captures et la page affichée, qui manquent aujourd'hui :
1. aucune photo de contenu en image de fond ; ouverture en priorité haute, le reste différé ; largeurs multiples ;
2. contraste mesuré sur chaque élément affiché (pas seulement les variables), boutons compris ;
3. aucune taille de texte hors de l'échelle, rien sous 12 pixels ;
4. rubrique en cours marquée dans le menu ; sur téléphone, 4 rubriques ou moins montrées en clair ;
5. tout le site au clavier (menus, tiroir du panier, fenêtre d'offre, formulaires), focus visible ;
6. messages d'erreur précis sur chaque champ ;
7. note de complexité du premier écran sous un plafond ;
8. lien « Renoncer à un achat » présent dans le pied de page de toute boutique ;
9. prix barré seulement avec la preuve des 30 jours ;
10. premier écran vérifié aussi en hauteur réduite (navigateur d'Instagram ou de Facebook) ;
11. aucun mot écrit en dur dans une seule langue.
Les contrôles déjà en place (débordements, boutons entiers, photos en double, variété, ressemblance) restent.

---

## Pas vérifié

- Le texte français exact des articles L. 221-21, D. 221-5, L. 112-1-1, L. 121-4, L. 131-5, L. 132-2 et L. 242-13 du code
  de la consommation : Légifrance a refusé l'accès ; les montants des sanctions viennent d'avocats, dont un article écrit
  par une IA.
- Le texte de la liste noire de la directive sur les pratiques déloyales (fausse disponibilité limitée, faux avis) : les
  pages consolidées d'EUR-Lex se sont affichées vides ce soir.
- Le texte qui remplace l'article D. 111-17 sur l'affichage des avis (abrogé le 9 juillet 2024 selon une reproduction
  privée du code) ; la norme NF ISO 20488.
- Le texte même de la proposition de « Digital Fairness Act » du 11 novembre 2026 (lu à travers un cabinet d'avocats).
- La démarche en ligne de la DGCCRF pour déclarer une exemption d'accessibilité (vue en résultat de recherche).
- Les résultats du test chronométré de Techfinitive (page refusée) et le détail des tests vidéo de Readdy.
- La hauteur exacte de l'écran utile dans les navigateurs intégrés d'Instagram et de Facebook.
- Un seuil officiel de taille minimale de texte (les pages d'Apple et de Material n'ont rien affiché de lisible).
- Les chiffres des études CXL sur la taille des photos produit et la forme des descriptions (vus en résumé de recherche
  seulement, études de 2014-2015 sur de petits échantillons) : je n'en tire aucune règle.
- Comment les formulaires de devis et de rendez-vous du thème envoient réellement la demande au client sur le site en
  ligne (`onsubmit="return false"` dans les pièces) : non suivi dans le code.
- La réserve de recherches sur Internet a été épuisée avant la fin : principes publiés d'Horizon, sites primés
  d'artisanat, études de Baymard sur la recherche pour les petits catalogues, études sur les sites de rendez-vous.

---

## Ce qu'il faut construire dans SINA, dans l'ordre

1. **Les photos du thème en vraies images** (partie 1.1) : balise d'image avec plusieurs largeurs, ouverture chargée en
   premier, le reste différé, texte de remplacement propre au produit, contrôle qui refuse les images de fond. *Le client
   voit* : le même site, qui s'ouvre nettement plus vite sur téléphone, avec des photos nettes ; une note de vitesse dans
   le compte rendu de SINA.
2. **Le prix barré avec sa preuve** (partie 4.2) : aucune réduction affichée sans la confirmation datée du prix le plus
   bas des 30 jours ; pourcentage calculé sur ce prix ; prix antérieur écrit à côté du prix. *Le client voit* : SINA lui
   pose la question une fois par promotion (« Quel est le prix le plus bas pratiqué ces 30 derniers jours ? ») et lui
   explique pourquoi ; ses acheteurs voient une réduction honnête.
3. **Le bouton de rétractation** (partie 4.1) : lien « Renoncer à un achat » toujours visible dans le pied de page et le
   compte client, parcours en deux temps, vérification que la plateforme envoie l'accusé de réception. *Le client voit* :
   une ligne dans la liste de mise en ligne, « Rétractation en ligne : en place », ou ce qu'il doit activer sur sa
   plateforme.
4. **Le tirage de la combinaison avant le dessin** (partie 3.1) : le Studio marque une fois les références réelles des
   six familles, puis tire pour chaque client une combinaison qui existe chez de bons sites et qui n'est prise par aucun
   site récent ; le dessinateur de l'accueil la reçoit. *Le client voit* : un accueil qui ne ressemble à aucun autre, du
   premier coup, sans tour de reprise pour cause de ressemblance.
5. **Le contraste mesuré sur la page affichée et les couleurs mélangées dans un espace qui suit l'œil** (partie 1.3).
   *Le client voit* : des boutons et des textes toujours lisibles, des nuances de sa couleur plus vives, jamais ternes.
6. **Une échelle de tailles de texte par famille** (partie 1.2) : 8 à 10 pas fluides au lieu de 59 tailles, rien sous
   12 pixels. *Le client voit* : des titres et des textes plus tenus, aucun mot minuscule illisible sur son téléphone.
7. **Le menu qui dit où l'on est et qui ne cache pas l'essentiel** (parties 2.1 et 2.2). *Le client voit* : sur
   téléphone, ses rubriques en clair quand il en a quatre ou moins, l'action de son métier toujours visible, la rubrique
   en cours marquée.
8. **Des formulaires qui ne perdent aucune demande** (parties 2.1, 2.4 et 4.4) : messages d'erreur précis, tout au
   clavier, et un essai réel d'envoi de chaque formulaire avant la mise en ligne. *Le client voit* : « Formulaire de devis
   essayé : la demande est bien arrivée dans ta boîte » dans le compte rendu.
9. **La note de complexité du premier écran** (partie 2.5), calculée sur la capture, avec un plafond plus strict quand la
   clientèle visée est âgée. *Le client voit* : un premier écran clair au premier coup d'œil.
10. **Les exemples de prix obligatoires pour les artisans** qui ont donné au moins deux vrais prix (partie 2.4).
    *Le client voit* : SINA lui demande trois chantiers récents et leur prix, et son site montre « Trois chantiers, trois
    prix » avant le formulaire de devis.
11. **Tous les mots de la boutique exportée traduits** (partie 6.1). *Le client voit* : sa boutique entièrement en
    anglais pour ses acheteurs anglophones, sans mot français oublié.
12. **La variété mesurée sur tout le Studio** (parties 3.2 et 3.3) : chaque mois, le nombre de sites vraiment différents
    parmi les 30 derniers, et la question de Shopify posée au juge (« faudrait-il changer la structure, ou seulement les
    couleurs ? »). *Le client voit* : rien directement ; le propriétaire voit chaque mois si la variété tient, avant qu'un
    client ne le remarque.

Aucun de ces points ne demande un nouveau fournisseur payant ; tous se font par le code du Studio, sans appel à l'IA,
sauf le point 4 (un seul passage d'extraction sur les références, dont le prix se donne au propriétaire avant).
