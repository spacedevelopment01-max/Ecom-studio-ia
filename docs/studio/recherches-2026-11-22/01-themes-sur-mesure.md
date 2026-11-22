# Recherche du 22 novembre 2026 : comment SINA peut mieux concevoir les sites sur mesure

Ce document complète le rapport 5 du 21 novembre (« La création de sites par IA », dans `.deja-lu-21-novembre.md`).
Je ne répète pas ce qui y est déjà : la méthode de Relume (le plan d'abord), Design2Code (49 %), la boucle de
relecture sur captures (environ 11 % de mieux), la liste de contrôle propre à chaque tâche, les préjugés du juge, le
seuil de 24 points, le premier écran, les faux avis interdits, le clic sur l'aperçu de Lovable. Je cherche ce qui est
nouveau ou plus précis.

Aucun fichier du dépôt n'a été modifié en dehors de celui-ci. Aucun appel payant à une IA.

**Niveaux de preuve utilisés**
- **officiel** : document de l'éditeur ou texte de loi, sur ce que l'éditeur fait ou exige lui-même ;
- **étude publiée** : article de recherche relu par des pairs ou recherche à grande échelle (Baymard, WebAIM) ;
- **article de recherche** : déposé en ligne, pas encore relu par des pairs ;
- **test indépendant** : un testeur a essayé l'outil lui-même ;
- **avis** : blog, comparatif, parfois payé par un concurrent.

**Ce que je n'ai pas pu faire ou vérifier** (dit franchement)
- La limite de recherches sur Internet a été atteinte en fin de travail : je n'ai pas pu vérifier la liste des dix
  thèmes de la famille Horizon de Shopify, ni chercher davantage sur Readdy, Uizard, Durable, 10Web et Hostinger.
- Je n'ai trouvé **aucun test indépendant qui donne la même demande à plusieurs créateurs de sites** et compare les
  résultats. Les comparatifs lus sont des avis (souvent avec liens commerciaux). Un comparatif qui prétendait le faire
  (aumiqx.com) dit lui-même avoir retiré ses notes faute d'essai récent.
- Rien trouvé de publié par Out of the Sandbox, Maestrooo ou Envato sur leur façon de travailler ; seulement un
  résumé d'entretien avec Archetype.
- Les pages de Légifrance et de la DGCCRF m'ont refusé l'accès (erreur 403) : les règles sur les fausses réductions
  et les fausses urgences ne sont donc pas relues aujourd'hui (voir partie 6).
- L'article « Mine, Sample, Render » (variété) est trop lourd pour être lu en entier : je n'en ai que le résumé.
- Pages lues en entier ou en grande partie : Shopify (exigences, conseils de conception, blocs, annonce Horizon),
  Baymard (fiche produit, navigation, liste des études), WebAIM, Playwright, web.dev, Figma, Wix, DCGen, ScreenCoder,
  la revue de 2026, Design Theater, Design Creativity Bench, VisRefiner, UICrit (suite), ArtifactsBench (résumé),
  le test de Squarespace, l'avis sur Stitch, l'entretien Archetype. Connues seulement par le résumé du moteur de
  recherche : TechRadar (Wix), l'école Framer et l'avis dev.to (Framer), DesignRevision (Durable, 10Web, Hostinger),
  DreamHost, Mon parcours handicap, la page WebVR, Product Hunt (Webflow), la norme W3C, Deque, UIClip.

---

## 1. Comment les meilleurs transforment une marque en site (2025-2026)

### 1.1 Shopify : un seul système, dix thèmes, et des pièces créées par l'IA
- **Ce qui a été trouvé.** Horizon, sorti en mai 2025, est présenté par Shopify comme « One system. 10 new themes » :
  une seule base de code, dix allures différentes. Le Studio fait exactement la même chose avec son thème unique et
  ses six familles. Le créateur de boutique de Shopify part d'une phrase qui décrit la marque et propose plusieurs
  boutiques différentes (l'image d'exemple en montre cinq). Depuis le 10 décembre 2025, la création de « blocs » par
  l'IA (on décrit une pièce, l'IA l'écrit) marche sur tous les thèmes de la boutique de thèmes. Ces blocs générés ne
  sont pas des sections : Shopify les range dans une enveloppe à part, et un thème ne peut pas dépasser 300 blocs.
- **Sources.** https://www.shopify.com/editions/summer2025 ;
  https://changelog.shopify.com/posts/ai-block-generation-for-all-theme-store-themes ;
  https://shopify.dev/docs/storefronts/themes/architecture/blocks/ai-generated-theme-blocks.md ;
  https://techcrunch.com/2025/05/21/shopify-launches-an-ai-powered-store-builder-as-part-of-its-latest-update
- **Preuve.** Officiel (pour ce que Shopify annonce) ; aucun test indépendant de la qualité lu.
- **Ce que SINA pourrait en faire.** Garder le thème unique, et quand une pièce manque vraiment, la faire créer
  comme pièce du thème (relue, testée, réutilisable) plutôt qu'en code libre propre à un seul client.

### 1.2 Wix Harmony : l'assistante génère, puis on retouche dans l'éditeur
- **Ce qui a été trouvé.** Lancé en janvier 2026. L'assistante Aria « génère un site complet avec pages, sections et
  contenu de départ », puis on retouche section par section, sur téléphone à part. Wix prévient lui-même qu'Aria « peut
  produire des résultats inattendus ou inexacts » et qu'il faut tout relire. Harmony et Aria ne marchent qu'en anglais.
  Dans un test, un site d'école de danse inventée a été fait en huit minutes, « un départ utilisable ».
- **Sources.** https://support.wix.com/en/article/about-the-new-wix-harmony-editor ;
  https://www.techradar.com/pro/website-building/wix-launches-harmony-a-hybrid-approach-to-vibe-coding-and-visual-design
- **Preuve.** Officiel (fonctionnement, mise en garde) ; test indépendant léger (le temps).
- **Ce que SINA pourrait en faire.** Ne rien montrer au client tant que la relecture n'est pas passée : même Wix admet
  que la première version de son assistante n'est qu'un départ.

### 1.3 Squarespace Blueprint : des choix fermés, un résultat propre mais générique
- **Ce qui a été trouvé.** Le testeur suit six étapes : nom et personnalité de marque (une sur sept), sections de
  l'accueil (neuf proposées, avec plusieurs dispositions chacune), pages (six types), palette (quatre par
  personnalité), paire de polices (deux par personnalité, 14 polices en tout), puis génération. Moins de dix minutes.
  Reproches : pages « basiques », la page contact n'est qu'un formulaire ; le site peut ressembler aux autres si on ne
  change rien ; images et textes à remplacer.
- **Sources.** https://www.websitebuilderexpert.com/website-builders/squarespace-blueprint-ai/
- **Preuve.** Test indépendant (un seul testeur).
- **Ce que SINA pourrait en faire.** Ne jamais livrer de page « minimum » : la page contact d'un artisan doit porter
  zone, délais, étapes et vraies réalisations, pas seulement un formulaire.

### 1.4 Webflow : le site et le système de style naissent ensemble
- **Ce qui a été trouvé.** Depuis le 12 novembre 2025, le créateur de Webflow produit un site de plusieurs pages **et**
  un système de style de base, bâti sur Flowkit. Webflow précise que les nouvelles sections créées par l'IA utilisent
  les réglages communs existants, « pas des classes faites pour une seule fois ».
- **Source.** https://www.producthunt.com/posts/webflow-ai-site-builder (réponses de l'équipe Webflow).
- **Preuve.** Article d'éditeur. La page officielle n'a pas pu être lue (erreur technique).
- **Ce que SINA pourrait en faire.** Interdire toute couleur, taille ou espacement écrits en dur dans une section :
  tout passe par les réglages de la marque, pour qu'une retouche s'applique partout.

### 1.5 Framer Wireframer : la structure d'abord, le style ensuite
- **Ce qui a été trouvé.** L'école de Framer dit que Wireframer produit des mises en page « neutres » qu'on habille
  ensuite ; sa page actuelle dit que l'agent génère aussi le style. Les avis reprochent un manque de finesse visuelle :
  l'IA ne fait que le premier jet.
- **Sources.** https://www.framer.com/academy/lessons/generating-layouts-with-ai-using-wireframer ;
  https://dev.to/jangwook_kim_e31e7291ad98/framer-review-2026-the-ai-website-builder-designers-actually-want-complete-guide-33gn
- **Preuve.** Officiel (fonctionnement) ; avis (reproches).
- **Ce que SINA pourrait en faire.** Séparer clairement deux temps : la structure (pièces, ordre, dispositions), puis
  l'habillage (marque, images). C'est déjà l'esprit du thème unique.

### 1.6 Google Stitch : de beaux écrans, une marque mal tenue
- **Ce qui a été trouvé.** Un designer : « bien pour un prototype », mais « je ne le montrerais pas à un client » ;
  rapide à créer, pénible à retoucher. L'auteur juge l'accessibilité « aléatoire » et note que le modèle « revient à la
  moyenne », ce qui nuit à la fidélité à la marque. Pas de gestion d'un système de style.
- **Source.** https://redwerk.com/blog/google-stitch-ai-vibe-design-tool/
- **Preuve.** Avis.
- **Ce que SINA pourrait en faire.** Confirme le choix du propriétaire : l'image dessinée donne la direction, le thème
  donne la tenue.

### 1.7 Figma Make : ce qui rend l'IA fidèle, ce sont les consignes d'usage
- **Ce qui a été trouvé.** Figma dit que les « consignes » jointes au système de style sont « essentielles » pour un
  résultat fidèle à la marque. Ses conseils : ranger les réglages **par décision à prendre** (choisir un fond, régler un
  espacement) et non par fichier ; un tableau des styles de texte avec « quand l'utiliser » ; les couleurs de rôle
  d'abord, les couleurs brutes en dernier recours ; **dire ce qu'il faut éviter** ; donner un exemple complet pour les
  réglages composés (ombres).
- **Source.** https://help.figma.com/hc/articles/39241689698839
- **Preuve.** Officiel.
- **Ce que SINA pourrait en faire.** Réécrire le catalogue des pièces du thème dans ce format : pour chaque pièce, à
  quoi elle sert, quand la choisir, quand ne pas la choisir, quelles dispositions, quelles erreurs fréquentes.

### 1.8 Durable, 10Web, Hostinger
- **Ce qui a été trouvé.** Seulement des comparatifs : Durable, rapide pour les artisans (trois questions), mais peu
  modifiable et sans export ; 10Web, de vrais sites WordPress ; Hostinger, le moins cher, « générique ».
- **Source.** https://designrevision.com/blog/best-ai-website-builders (et les autres comparatifs de même nature).
- **Preuve.** Avis seulement. Je n'en tire aucune règle.

---

## 2. Dessiner l'accueil en image, puis le coder fidèlement

La méthode du propriétaire reste. Voici ce que la recherche apporte pour que le site codé ressemble vraiment à l'image.

### 2.1 L'erreur la plus fréquente est l'oubli, pas la mauvaise couleur
- **Ce qui a été trouvé.** Dans l'étude DCGen (conférence FSE 2025), sur 1 699 éléments d'écran recopiés par un grand
  modèle : **85 % des erreurs sont des oublis** d'éléments, 13 % des éléments mal placés, 3 % des formes ou couleurs
  fausses. Seuls 2,35 % des éléments étaient parfaits. Découper l'image en morceaux et traiter chaque morceau à part
  améliore la ressemblance (jusqu'à 15 % selon le résumé ; l'article se contredit entre 8 et 15 %).
- **Source.** https://arxiv.org/html/2406.16386v3
- **Preuve.** Étude publiée.
- **Ce que SINA pourrait en faire.** Faire dresser, à partir de l'image dessinée, la **liste de tout ce qu'elle
  contient** (titres, boutons, photos, détails) section par section, puis vérifier par le code que chaque élément
  existe dans le site monté.

### 2.2 Découper l'image en zones, puis traiter chaque zone avec la bonne pièce
- **Ce qui a été trouvé.** ScreenCoder fait travailler trois agents : un qui repère les zones de l'image (en-tête,
  menu, contenu), un qui en fait un plan en arbre, un qui code chaque zone avec une consigne adaptée à son rôle. Les
  photos de l'image d'origine sont ensuite remises à leur place par correspondance des positions. Il obtient les
  meilleures notes sur les cinq mesures de Design2Code (repérage des blocs 0,755 contre 0,730 pour GPT-4o), mais l'écart
  avec les grands modèles est petit (souvent moins de 0,02).
- **Source.** https://arxiv.org/html/2507.22827v1
- **Preuve.** Article de recherche.
- **Ce que SINA pourrait en faire.** Chez SINA, « coder une zone » devient « choisir la pièce du thème et sa
  disposition » : découper l'image en bandes (une par section), puis apparier chaque bande à une pièce du catalogue.

### 2.3 La structure explicite bat la traduction directe des pixels
- **Ce qui a été trouvé.** Une revue de 150 systèmes (novembre 2026) retient comme régularité : « une structure
  explicite vaut mieux que passer directement des pixels au code ». Elle décrit trois familles qui marchent : découper,
  aller chercher des pièces dans une bibliothèque, et rendre-comparer-corriger. Mise en garde : **le modèle le plus
  fidèle à l'image produit le code le moins facile à entretenir** ; et la plupart des chiffres publiés sont mesurés par
  les auteurs sur leurs propres bancs d'essai, donc pas comparables entre eux.
- **Source.** https://arxiv.org/html/2611.18575
- **Preuve.** Article de recherche (revue).
- **Ce que SINA pourrait en faire.** Ne jamais chercher la ressemblance au pixel près en code libre : la fidélité se
  mesure sur l'ordre, les éléments présents, les couleurs et l'ambiance, avec les pièces du thème.

### 2.4 Rendre, comparer, corriger : la boucle qui apprend des différences
- **Ce qui a été trouvé.** VisRefiner (février 2026) part de l'idée que le développeur humain affiche son travail, le
  compare au dessin et corrige ; il entraîne le modèle à relier une différence visible à la correction précise.
  WebRenderBench (octobre 2025, 45 100 pages réelles) propose une note de cohérence de disposition et de style calculée
  sur les pages affichées, moins chère qu'un juge IA.
- **Sources.** https://arxiv.org/abs/2602.05998v1 ; https://arxiv.org/abs/2510.04097
- **Preuve.** Articles de recherche (méthodes d'entraînement : SINA ne peut pas les reprendre telles quelles).
- **Ce que SINA pourrait en faire.** Après montage, mettre côte à côte l'image dessinée et la capture du site, et
  demander au juge une liste de différences **localisées** (« section 3 : la photo est à gauche sur le dessin, à droite
  sur le site »), chacune traduite en un changement de réglage.

### 2.5 Mesurer la fidélité sans IA
- **Ce qui a été trouvé.** Les mesures courantes : repérage des blocs, texte, position, couleur et ressemblance
  générale (Design2Code) ; ressemblance par empreintes d'image (DINOv2) et écart moyen des pixels (Figma2Code).
- **Sources.** https://arxiv.org/html/2507.22827v1 ; https://arxiv.org/pdf/2604.13648 (résumé de recherche seulement,
  pas lu en entier).
- **Preuve.** Articles de recherche.
- **Ce que SINA pourrait en faire.** Garder une note de ressemblance chiffrée entre l'image dessinée et la capture,
  section par section, en simple alerte (pas en barrière, puisque le thème ne recopie pas au pixel près).

---

## 3. Ce que font les créateurs de thèmes qui vendent, et ce qui fait acheter

### 3.1 Les exigences de la boutique de thèmes Shopify (confirmées sur la page actuelle)
- **Ce qui a été trouvé.**
  - Lighthouse, moyenne sur accueil, fiche produit et collection, **sur téléphone et ordinateur** : au moins **60** en
    vitesse et au moins **90** en accessibilité (confirmé cette fois sur la page des exigences, ce que le rapport du
    21 novembre n'avait pas pu faire). Les sections doivent contenir de vraies images et de vrais textes pendant la
    mesure.
  - Contraste : **4,5 pour 1** pour le texte courant ; **3 pour 1** pour le grand texte, les bords et les pictogrammes.
  - Zones à toucher d'au moins 24 × 24 ; état visible quand on navigue au clavier ; titres de niveaux visuellement
    différents ; texte de remplacement sur chaque image.
  - Couleurs : au moins 4 ; **chaque couleur de fond a sa couleur de texte attitrée**.
  - Polices : peu nombreuses, une paire cohérente ; gras, italique et gras italique chargés.
  - Originalité : un thème doit être « fondamentalement différent » ; changer l'espacement, les couleurs, les polices,
    les dégradés ou les animations **ne compte pas**. Il faut des systèmes propres pour l'en-tête et le menu, les
    cartes produit, le traitement des photos et la structure des pages, et viser un type de commerçant précis.
  - Fiche produit : titre entier, prix, prix barré, prix à l'unité, toutes les photos sans casser la mise en page quels
    que soient leurs formats, bouton d'ajout désactivé si indisponible.
- **Source.** https://shopify.dev/docs/storefronts/themes/store/requirements.md
- **Preuve.** Officiel.
- **Ce que SINA pourrait en faire.** Reprendre ces seuils comme barrières du Studio, et reprendre surtout la règle
  d'originalité : deux sites ne sont « différents » que si l'en-tête, les cartes produit, le traitement des photos et
  la structure diffèrent, pas seulement les couleurs.

### 3.2 Les conseils de conception de Shopify
- **Ce qui a été trouvé.** Une direction artistique « affirmée », équilibrée avec les bonnes pratiques de vente ;
  plusieurs variantes d'une même pièce plutôt que deux pièces pour le même usage ; les cartes produit doivent rester
  propres **même avec des photos de produit hétérogènes** ; une mise en page solide « même si du contenu manque » ;
  aucun élément flottant (fenêtre de discussion, bandeau des témoins de connexion) ne doit cacher une action
  importante ; peu de réglages.
- **Source.** https://shopify.dev/docs/storefronts/themes/best-practices/design.md
- **Preuve.** Officiel.
- **Ce que SINA pourrait en faire.** Ajouter deux contrôles : cartes produit testées avec des photos de formats
  mélangés, et capture du premier écran téléphone avec le bandeau des témoins ouvert (le bouton principal doit rester
  visible en entier).

### 3.3 Archetype : décider ce qu'on n'autorise pas
- **Ce qui a été trouvé.** « Une bonne architecture, c'est moins ajouter des options que décider ce qu'on n'autorise
  pas. » Réglages « voulus, pas sans fin » ; sections « réutilisables mais prévisibles », modifiables « sans casser la
  mise en page ».
- **Source.** https://codingwithjan.com/blog/shopify-tutorials/public-shopify-themes-archetype-interview/
- **Preuve.** Avis (résumé d'un entretien vidéo, pas l'entretien lui-même).
- **Ce que SINA pourrait en faire.** Les règles du propriétaire (pas d'arche, pas de bouton coupé, pas deux
  dispositions pareilles à la suite) doivent être des impossibilités du thème, pas des consignes à SINA.

### 3.4 Baymard, fiche produit 2026 (mise à jour du 18 mars 2026)
- **Ce qui a été trouvé.** Seuls 48 % des grands sites sur ordinateur et 38 % sur téléphone ont une fiche produit
  « correcte » ou « bonne ». Les dix écueils, avec la part des sites qui échouent :
  1. tailles en menu déroulant au lieu de boutons (57 %) ;
  2. pas de photo qui montre la taille réelle (37 %) ; 42 % des acheteurs jugent la taille sur les photos ;
  3. pas de photo portée pour ce qui se porte (23 %) ;
  4. pas de « mettre de côté » facile (89 %) ;
  5. pas de prix à l'unité pour les formats multiples (81 %) ;
  6. **pas d'estimation du coût total (livraison comprise) près du bouton d'achat (67 %)** ;
  7. **politique de retour absente de la fiche (44 %)** ; 60 % des acheteurs la cherchent sur la fiche ;
  8. pas d'option cadeau (78 %) ;
  9. pas de réponse aux avis négatifs (89 %) ;
  10. pas de défilement des photos des clients (63 %).
  Autres chiffres Baymard : description en « points forts » plutôt qu'en bloc (78 % ne le font pas) ; onglets
  horizontaux pour les parties de la fiche à éviter (29 % les utilisent) ; livraison offerte affichée seulement dans
  un bandeau (32 %) ; frais de livraison estimés absents (43 %).
- **Sources.** https://baymard.com/research-articles/current-state-ecommerce-product-page-ux ;
  https://baymard.com/blog/collections/product-page
- **Preuve.** Étude publiée (Baymard, plus de 30 000 notes manuelles sur plus de 155 sites).
- **Ce que SINA pourrait en faire.** Rendre obligatoires sur toute fiche produit : coût de livraison et délai près du
  bouton, résumé des retours avec lien, description en points forts, photo d'échelle quand le produit s'y prête ;
  pas d'onglets horizontaux.

### 3.5 Baymard, accueil et navigation 2026 (mise à jour du 13 octobre 2026)
- **Ce qui a été trouvé.** Écueils et part des sites qui échouent : sur téléphone, les catégories ne sont pas au
  premier niveau du menu (22 %) ; la rubrique où l'on se trouve n'est pas signalée dans le menu (96 %) ; menus
  déroulants sans délai au survol, qui s'ouvrent par accident (62 %) ; diaporamas mal faits, trop rapides, sans pause
  (31 %) ; sous-catégories sans vignette (39 %) ; **produits des photos d'ambiance inaccessibles depuis la photo
  (64 %)** : « je veux ça, je fais comment ? ».
- **Source.** https://baymard.com/research-articles/ecommerce-navigation-best-practice
- **Preuve.** Étude publiée.
- **Ce que SINA pourrait en faire.** Toute photo d'ambiance qui montre un produit du client devient cliquable vers ce
  produit ; le menu marque la rubrique en cours ; les méga menus du thème ont un délai d'ouverture.

### 3.6 Sites de services et d'artisans
- **Ce qui a été trouvé.** Je n'ai trouvé aucune étude Nielsen ou Baymard récente dédiée aux sites d'artisans. Une
  enquête d'un hébergeur (DreamHost, 1 200 consommateurs américains, novembre 2025) classe les avis en ligne premier
  critère de confiance (74 %).
- **Source.** https://www.dreamhost.com/blog/?p=78494
- **Preuve.** Avis (enquête d'un vendeur, non relue).
- **Ce que SINA pourrait en faire.** Rien de neuf de prouvé ; garder les règles actuelles (coordonnées visibles,
  vraies réalisations, vrais avis importés seulement).

---

## 4. La variété sans perte de qualité

### 4.1 Les modèles font des sites justes, mais répétitifs
- **Ce qui a été trouvé.** Design Creativity Bench (octobre 2026) : les sites des modèles remplissent plus de 90 % des
  critères demandés (le meilleur 99,2 %, les humains 98 %), mais **quand on change le métier et le contenu, le modèle
  change à peine son dessin** : variation de 0,58 contre 0,90 pour des designers humains. Deux modèles différents se
  ressemblent davantage entre eux (0,59) qu'avec un humain (0,76). Les auteurs rappellent que les remèdes simples
  (reformuler la demande, demander d'être créatif, monter la « température ») ont des effets limités.
  Point utile : pour comparer deux pages, **comparer section par section** marche mieux que comparer la page entière ;
  et un juge IA qui compare deux pages est celui qui s'accorde le mieux avec les humains.
- **Source.** https://arxiv.org/abs/2610.11539 (texte complet lu)
- **Preuve.** Article de recherche (écrit par Kombai, une entreprise du secteur).
- **Ce que SINA pourrait en faire.** Ajouter à `variete-sites.ts` une comparaison des captures section par section
  avec les sites récents, en plus de la liste des pièces communes.

### 4.2 Les outils convergent entre eux
- **Ce qui a été trouvé.** Design Theater (juillet 2026) a fait faire 24 interfaces à cinq outils (ChatGPT, Claude,
  Firebase Studio, v0, Bolt). Il mesure la ressemblance par l'image, par les couleurs et par la disposition. Les
  couleurs varient le plus d'un outil à l'autre ; l'image et la disposition convergent. Autre constat : en moyenne
  **un quart de ce que l'outil dit avoir fait n'est pas vraiment dans l'interface**.
- **Source.** https://arxiv.org/html/2607.22928v1
- **Preuve.** Article de recherche.
- **Ce que SINA pourrait en faire.** Ne jamais croire SINA sur parole quand elle décrit ce qu'elle a fait :
  vérifier sur la page montée (par le code) chaque promesse de son récit.

### 4.3 La variété doit venir d'un tirage organisé, pas du modèle
- **Ce qui a été trouvé.** « Mine, Sample, Render » (octobre 2026) : on tire d'abord une combinaison de
  caractéristiques à partir d'un vrai corpus (de vrais sites), puis le modèle n'est que le « dessinateur » de cette
  combinaison. Les auteurs notent que les pages faites par IA « s'effondrent » vers une allure très précise.
  « Verbalized Sampling » (ICML 2026) : demander au modèle plusieurs propositions avec leur probabilité augmente la
  variété de 1,6 à 2,1 fois en écriture, sans perte de qualité selon les auteurs.
- **Sources.** https://arxiv.org/abs/2610.21185 (résumé seulement) ; https://arxiv.org/html/2510.01171v2
- **Preuve.** Articles de recherche (le second accepté à ICML 2026).
- **Ce que SINA pourrait en faire.** Avant le dessin, le Studio tire au sort, parmi les choix permis par la famille
  et pas encore pris récemment, la combinaison (en-tête, traitement des photos, rythme, forme des boutons, disposition
  de l'ouverture) ; SINA dessine et monte ensuite **dans** cette combinaison.

### 4.4 Des écrans de référence variés guident mieux qu'une consigne
- **Ce qui a été trouvé.** UIDEC (CHI 2025) donne des écrans de référence comme guide de structure pour obtenir des
  exemples variés, et les designers l'ont trouvé utile en début de projet.
- **Source.** https://arxiv.org/abs/2501.18748
- **Preuve.** Étude publiée (résultats qualitatifs, pas de chiffre).
- **Ce que SINA pourrait en faire.** Donner au dessinateur de l'accueil des références réelles différentes pour chaque
  client (les références des six familles), jamais les mêmes deux fois de suite.

---

## 5. Les contrôles automatiques de qualité

### 5.1 Ce que les outils gratuits trouvent, chiffres à l'appui
- **Ce qui a été trouvé.**
  - WebAIM, février 2026, un million de pages d'accueil : **95,9 %** ont des erreurs détectables, 56,1 erreurs par page
    en moyenne. Les plus fréquentes : texte peu contrasté (83,9 %), image sans texte de remplacement (53,1 %), champ
    sans étiquette (51 %), lien vide (46,3 %), bouton vide (30,6 %), langue de la page absente (13,5 %).
  - Deque (éditeur de l'outil axe) : ses contrôles automatiques trouvent 57 % des problèmes réels (2 000 audits,
    13 000 pages). Chiffre d'éditeur, non vérifié par d'autres.
  - Lighthouse : un même essai varie de 5 à 10 points d'une fois à l'autre ; Shopify conseille plusieurs passages.
    Shopify fournit un outil gratuit qui lance Lighthouse à chaque changement, et Theme Check pour les erreurs du thème.
  - Seuils de vitesse de Google, au 75e centile des visites : affichage du plus grand élément en 2,5 secondes au plus,
    réponse à un geste en 200 millisecondes au plus, décalage de mise en page de 0,1 au plus.
  - Playwright compare des captures avec la bibliothèque pixelmatch, avec une tolérance réglable.
- **Sources.** https://webaim.org/projects/million/ ;
  https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues ;
  https://shopify.dev/docs/storefronts/themes/best-practices/performance/testing-for-performance ;
  https://shopify.dev/docs/storefronts/themes/tools/lighthouse-ci ; https://web.dev/articles/vitals ;
  https://playwright.dev/docs/test-snapshots
- **Preuve.** Étude publiée (WebAIM) ; officiel (Google, Shopify, Playwright) ; article d'éditeur (Deque).
- **Ce que SINA pourrait en faire.** Les six erreurs de WebAIM se contrôlent par le code en quelques secondes :
  en faire une barrière avant tout affichage ; Lighthouse se lance trois fois et on garde la médiane.

### 5.2 Le juge visuel : ce qui le rend fiable
- **Ce qui a été trouvé.**
  - ArtifactsBench : un juge qui regarde des captures prises dans le temps, avec le code et une liste de contrôle
    propre à chaque tâche, atteint **94,4 %** de cohérence avec le classement du public de WebDev Arena et plus de
    90 % d'accord avec des experts.
  - WebVR (mars 2026) : avec une grille visuelle détaillée (disposition, couleur et typographie, éléments complets,
    animation, interactions), le juge s'accorde à 96 % avec des experts ; sans la grille, beaucoup moins. L'essai ne
    porte que sur 50 cas.
  - UICrit (UIST 2024) : donner au juge des exemples de critiques d'écrans **ressemblants** et des repères de position
    sur la capture améliore ses critiques de 55 % selon des experts. Un travail suivant fait vérifier chaque critique
    par un autre modèle (« pour éviter qu'il se juge lui-même ») et réduit d'environ 22 % l'écart avec les humains.
  - UIClip (UIST 2024) : un petit modèle gratuit qui note la qualité d'un écran à partir de sa capture et de sa
    description ; il s'accorde mieux avec 12 designers que des modèles bien plus gros.
- **Sources.** https://arxiv.org/abs/2507.04952 ; https://webvr-benchmark.github.io ;
  https://arxiv.org/html/2407.08850v3 ; https://arxiv.org/html/2412.16829v2 ; https://arxiv.org/abs/2404.12500
- **Preuve.** Articles de recherche ; UICrit et UIClip publiés à une conférence relue (UIST).
- **Ce que SINA pourrait en faire.** Donner au juge une grille fixe par critère, plus des exemples de critiques déjà
  validées par le propriétaire sur des sites ressemblants (ses refus passés), et faire vérifier chaque critique par un
  second modèle avant de corriger.

---

## 6. Autres choses utiles

### 6.1 La loi européenne sur l'accessibilité s'applique au commerce en ligne depuis le 28 juin 2025
- **Ce qui a été trouvé.** Le commerce en ligne fait partie des services couverts. Une entreprise de **moins de 10
  salariés avec moins de 2 millions d'euros** de chiffre d'affaires ou de bilan peut invoquer une exemption. Le contrôle
  relève de la DGCCRF selon une source juridique. Les experts recommandent de viser WCAG 2.2 niveau AA.
- **Sources.** https://entreprendre.service-public.gouv.fr/actualites/A18669?lang=en ;
  https://www.monparcourshandicap.gouv.fr/actualite/accessibilite-numerique-et-handicap-entree-en-vigueur-de-leaa
- **Preuve.** Officiel. Je n'ai pas relu les sanctions ni l'obligation exacte de déclaration.
- **Ce que SINA pourrait en faire.** Beaucoup de clients du Studio seront exemptés, mais pas tous : viser le niveau AA
  pour tous les sites coûte peu et évite au Studio de vendre un site hors la loi à un client qui grandit.

### 6.2 Une norme publique pour les réglages de style
- **Ce qui a été trouvé.** Le groupe de travail du W3C sur les « jetons de style » (réglages nommés : couleurs,
  tailles, espacements) a publié sa première version stable le 28 octobre 2025. Ce n'est pas une norme officielle du
  W3C, mais beaucoup d'outils l'adoptent.
- **Source.** https://w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- **Preuve.** Officiel (groupe du W3C).
- **Ce que SINA pourrait en faire.** Ranger les réglages de chaque marque dans ce format : ils passeraient tels quels
  vers Shopify, WooCommerce, PrestaShop ou le site hébergé, et vers Figma si un jour c'est utile.

### 6.3 Fausses réductions et fausses urgences
- **Ce qui a été trouvé.** La DGCCRF a infligé 1,3 million d'euros à PrettyLittleThing pour des réductions de prix
  trompeuses (repris d'un résumé de recherche ; la page de la DGCCRF m'a refusé l'accès).
- **Source.** https://www.economie.gouv.fr/dgccrf/des-regles-plus-claires-contre-les-faux-rabais (non lue).
- **Preuve.** Non vérifiée aujourd'hui.
- **Ce que SINA pourrait en faire.** [À compléter : relire sur Légifrance la règle du prix de référence et l'article
  sur la fausse disponibilité limitée avant d'écrire les règles des sections « promotion » et « compte à rebours ».]

---

## Les 10 changements qui auraient le plus d'effet pour SINA

1. **L'inventaire de l'image dessinée.** Avant de monter le site, un spécialiste dresse la liste de tout ce que
   l'image contient, bande par bande. Après montage, le code vérifie que chaque élément existe. La cause n° 1 des
   ratés est l'oubli (85 % des erreurs dans DCGen).
2. **Une bande de l'image = une pièce du thème.** Découper l'accueil dessiné en bandes et apparier chacune à une pièce
   et une disposition du catalogue (ScreenCoder, revue de 2026), jamais en code libre.
3. **La comparaison dessin contre site, localisée.** Image dessinée et capture du site côte à côte ; le juge liste
   les différences section par section ; chaque différence devient un changement de réglage. Deux tours au plus.
4. **Un catalogue des pièces écrit pour l'IA**, au format conseillé par Figma : rôle, quand la choisir, quand ne pas
   la choisir, dispositions, erreurs à éviter, une image de chaque disposition.
5. **Le tirage de la combinaison avant le dessin.** Le Studio tire, dans la famille et hors des choix récents,
   l'en-tête, le traitement des photos, le rythme, les boutons et la disposition de l'ouverture ; SINA dessine dans ce
   cadre (« Mine, Sample, Render »). Car demander « sois original » ne suffit pas.
6. **La variété jugée comme Shopify la juge.** Deux sites ne sont différents que si l'en-tête, les cartes produit, le
   traitement des photos et la structure diffèrent ; couleurs et polices ne comptent pas. Ajouter une comparaison des
   captures section par section avec les sites récents.
7. **Les barrières mesurées par le code, avec les seuils officiels** : Lighthouse au moins 60 et 90 (trois passages,
   médiane, téléphone et ordinateur), contraste 4,5 et 3, les six erreurs de WebAIM, zones à toucher, bandeau des
   témoins ouvert sans cacher le bouton, cartes produit testées avec des photos de formats mélangés.
8. **La fiche produit selon Baymard 2026** : coût de livraison et délai près du bouton, retours résumés sur la fiche,
   description en points forts, pas d'onglets horizontaux, photo d'échelle si utile, prix à l'unité pour les formats
   multiples.
9. **Un juge mieux armé** : grille fixe par critère, exemples de critiques déjà validées par le propriétaire sur des
   sites ressemblants, vérification de chaque critique par un second modèle, et contrôle par le code de tout ce que
   SINA dit avoir fait (un quart des promesses ne sont pas tenues dans Design Theater).
10. **Les photos d'ambiance mènent au produit** (64 % des sites échouent selon Baymard) et le menu montre où l'on est
    (96 % échouent) : deux réglages du thème, valables pour tous les clients.
