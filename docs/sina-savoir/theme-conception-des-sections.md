# La conception des sections d'un thème : cahier de métier

Recherche du 13 novembre 2026. Les lettres entre crochets renvoient aux sources. « (métier) » : savoir du métier, non vérifié sur une page. « (vu) » : constaté sur les boutiques de démonstration de seize thèmes populaires, ouvertes sur téléphone le 13 novembre 2026. Les valeurs chiffrées viennent du code de Dawn et d'Horizon, les deux thèmes de Shopify lui-même : ce sont des repères, pas des lois.

## 1. Comment un thème Shopify est bâti

- **Les pièces.** Une page est un gabarit qui empile des sections ; une section contient des blocs ; chaque section et chaque bloc a ses réglages, que le marchand change dans l'éditeur sans toucher au code [A1][A3][A4].
- **Les limites en vigueur :** 25 sections par page, 50 blocs par section, 20 groupes de sections par thème, 25 caractères pour le nom d'une section [A2].
- **Un préréglage par section.** Sans lui, la section ne peut pas être ajoutée dans l'éditeur. Une section peut être limitée à un ou deux exemplaires, ou réservée à certaines pages [A3].
- **L'en-tête et le pied** sont des groupes de sections : ils valent pour toutes les pages [A5].
- **Horizon,** le thème actuel de Shopify, repose sur des blocs qui s'emboîtent (texte, bouton, logo, groupe) : sa section d'ouverture accepte n'importe quel bloc [G1][T1].
- **À savoir en 2026 :** Shopify essaie une nouvelle façon de composer les pages, encore en préversion pour les développeurs. Les sections et les gabarits actuels restent pris en charge : on ne bâtit pas une boutique en production sur une préversion [A12] (métier).

## 2. Ce que Shopify exige d'un thème vendu sur sa boutique

C'est le niveau demandé aux professionnels [A6].

- **Notes minimales :** en moyenne au moins 60 en vitesse et 90 en accessibilité, sur l'accueil, la collection et la fiche produit, ordinateur et téléphone, avec de vraies images.
- **Un thème vraiment original :** changer les couleurs, les espacements, les polices ou les animations d'un thème existant ne suffit pas.
- **Fonctions obligatoires :** des sections sur toutes les pages, remises au panier, paiement rapide, filtres, carte cadeau, point focal des images, choix du pays et de la langue, menus à plusieurs niveaux, lettre d'information, retrait en magasin, produits liés et complémentaires, vidéo et 3D, recherche qui propose pendant la frappe, abonnements, prix à l'unité, image par variante, compte client.
- **Structure :** chaque élément de la fiche produit (prix, marque, description) est un bloc que le marchand déplace ; les applications s'insèrent par des blocs dans la fiche et dans le « produit vedette ».
- **Interdits :** faux comptes à rebours, faux stocks, faux compteurs de visiteurs, dépendance à une application.
- **Réglages :** un libellé clair par réglage, aucun faux texte de remplissage, au moins 4 couleurs, chaque fond avec sa couleur de texte.
- **Pages obligatoires** [P1] : accueil, produit, collection, liste des collections, panier, page, contact, blog, article, recherche, page introuvable, mot de passe, carte cadeau.

## 3. Une section qui reste belle avec n'importe quel contenu

- **Le principe.** Une section ne doit pas exiger des images parfaites ni des textes de la bonne longueur. La mise en page tient même si du contenu manque [A9].
- **L'exigence.** Ni trou ni casse quand la longueur du texte ou le nombre d'images change ; le titre d'un produit n'est jamais tronqué ; la grille reste intacte avec des images de proportions mêlées [A6].
- **Le jeu d'essai officiel, à rejouer sur chaque section** [A7] :
  - un nom de boutique de 30 à 40 caractères sans espace ; des entrées de menu de 30 à 60 caractères ; un menu de 10 entrées et plus ;
  - un produit sans image, une collection sans image ;
  - des images en 16:9, 4:3, 3:2, 2:1 et 1:1, en hauteur et en largeur ;
  - le nombre maximal de vues ; un accueil de 25 sections ; un produit à 100 variantes ; une recherche sans résultat.
- **Les garde-fous lus dans le code des thèmes de Shopify :**
  - tout élément vide est masqué (bloc, titre, paragraphe, lien) [G2] ;
  - une illustration de remplacement quand l'ouverture n'a pas d'image, des cartes de remplacement quand la collection est vide [G1] ;
  - les mots trop longs sont coupés, les images bornées à la largeur de leur cadre [G1].
- **Les blocs :** empilés à la verticale ; à l'horizontale, ils passent à la ligne ou défilent, on ne les écrase jamais. La mise en page ne dépend jamais d'un ordre de blocs [A9].
- **Une autre langue :** un texte court peut doubler ou tripler de longueur une fois traduit. Pas de cadre à largeur fixe [W2] ; un bouton à largeur libre, deux lignes tolérées (métier).
- **Les images :** dimensions déclarées, plusieurs tailles servies [A10], point focal respecté [A6], cadre à proportion fixe (métier).

## 4. Le système de design d'un thème

Un thème est un système : quelques valeurs, toujours les mêmes, d'une page à l'autre.

- **Tailles de texte (Horizon) :** texte courant 14 px par défaut (de 10 à 18) ; titres 72, 48, 32, 24, 18 et 16 px ; à partir de 48 px, la taille suit la largeur de l'écran [G1].
- **Interlignes (Horizon) :** texte de 1,2 à 1,6 ; titres de 1,15 à 1,35 ; très grands titres de 1 à 1,2 [G1].
- **Largeur de lecture :** 45 à 75 caractères par ligne, 66 l'idéal [V1].
- **Espacements :** une échelle courte et nommée, de 2 à 64 px dans Horizon [G1] ; des pas de 4 px dans Dawn [G2]. Une seule échelle, aucune valeur libre (métier).
- **Grille :** 12 colonnes à partir de 750 px ; chaque section a une marge, une colonne centrale, une marge ; la pleine largeur se demande exprès [G1].
- **Couleurs :** des jeux de couleurs par rôle (fond, texte, bouton, texte du bouton, bordure, ombre) [G2]. Les couleurs se nomment par usage (« principale », « accent »), jamais par teinte [A9].
- **Arrondis et boutons (Horizon, par défaut) :** boutons en pilule, champs et fenêtres à 8 px, pastilles de couleur de 30 px, bouton secondaire à bordure fine [G1].
- **Ombres :** une seule, légère [G1].
- **Animations :** très courtes, de 0,06 à 0,2 seconde [G1]. Trop d'animation peut empêcher les clients de continuer à défiler [C1].
- **La largeur contenue plutôt que tout en pleine largeur :** elle donne de l'air sur grand écran [C1].

## 5. L'accessibilité

- **Contraste :** 4,5 pour 1 pour le texte ; 3 pour 1 pour le grand texte, les bordures de champs, les icônes et le cadre de sélection [W1].
- **Zone tactile :** viser 44 px, ne jamais descendre sous 24 (métier). Les sources donnent 24 px au minimum [W1][A6], 44 px conseillés par Shopify pour les commandes principales [A10][G1], 48 px avec 8 px d'écart ailleurs [V1].
- **Clavier :** tout s'utilise sans souris ; la sélection est toujours visible ; rien n'est accessible au seul survol [A10].
- **Tiroirs et fenêtres :** la sélection y entre à l'ouverture, y reste, et la touche d'échappement ferme [A10].
- **Mouvement :** tout ce qui bouge seul plus de cinq secondes peut être mis en pause [W1]. Les animations décoratives sont retirées pour qui a demandé moins de mouvement [V1][G2].
- **Titres :** un seul titre principal, des niveaux dans l'ordre, jamais un titre « pour le style » [A10].

## 6. Le téléphone d'abord

- **Points de bascule :** 750 px et 990 px dans les deux thèmes de Shopify [G1][G2].
- **Largeur minimale :** tout tient dans 320 px sans défilement dans deux sens [W1].
- **Champs de saisie :** texte de 16 px au moins, sinon l'iPhone zoome tout seul [G1].
- **Défilement horizontal :** le doigt et des boutons, jamais l'un sans l'autre ; la position est indiquée [V1][A11]. Dans un carrousel, la carte suivante dépasse toujours un peu : Horizon règle la carte à 60 % ou 44 % de la largeur [G1].
- **Le pouce :** les actions fréquentes dans la zone facile à atteindre, en bas de l'écran [S1].
- **Filtres :** dans un tiroir sur téléphone [A11]. **Recherche :** le champ est actif dès qu'on touche l'icône [A11].
- **Ouverture :** une image faite pour le téléphone, et l'empilement image puis texte possible [G1].
- **Bouton d'achat collant :** fonction reconnue par Shopify [A7]. Aucune étude indépendante fiable sur son effet n'a été trouvée.
- **Rien de flottant** (discussion, cookies) ne masque une action importante [A9].
- **(vu)** Sur les fiches relevées, le bouton d'achat n'est jamais dans le premier écran du téléphone. Un tiers à la moitié des thèmes le compensent : un premier bouton juste sous le titre, ou une petite barre d'achat qui reste à l'écran.

## 7. Ce qui distingue un thème haut de gamme

- **Des variantes, pas des doublons.** Une même section en plusieurs formes, plutôt que deux sections pour le même rôle [A9]. Horizon livre trois formes de son ouverture et trois de sa liste de produits [G1].
- **La sobriété par défaut.** Chez Shopify, toute fonction part de « non » et doit se justifier [G1][G2].
- **Le goût avant la liste de fonctions :** la typographie, la discipline des espacements, la place laissée à l'image. « On peut ajouter des fonctions, pas du goût » [C5] (parole d'agence, partie intéressée).
- **Les sections de récit :** un thème payant propose 30 à 50 sections ; celles qui racontent (étapes, ingrédients, carnet d'images) comptent plus que leur nombre [C4] (texte commercial).
- **La cohérence d'abord :** même échelle, mêmes espacements, même poids des composants d'une page à l'autre [A9] ; des fonctions natives plutôt que des scripts venus d'ailleurs [C3].
- **Un studio réputé** n'utilise aucun cadre tout fait, mesure chaque composant à part et conseille environ 15 sections par accueil pour la vitesse [M1].
- **(vu)** Ce qui fait reconnaître un grand thème au premier coup d'œil, c'est un petit nombre de gestes répétés partout :
  - thème de boisson joyeux : des cadres en escalier avec une ombre décalée, des bords de section penchés ou en vague, des fruits détourés à cheval sur deux sections, des autocollants, des titres en capitales très grasses, trois couleurs franches ;
  - thème de luxe : des capitales fines très espacées, beaucoup de blanc, des images pleines, des points cliquables sur les photos ;
  - thème de café : deux couleurs chaudes, des jauges de goût, les adresses des boutiques.
- **(vu)** Les meilleurs dessinent des sections propres au produit, pas des sections passe-partout : « Que contient la canette ? », des jauges (sucré, acide, amer), un tableau « nous et les autres », la table des ingrédients, le niveau de torréfaction. C'est là que le thème cesse d'être un gabarit.

## 8. Le catalogue type d'un thème

- **Dawn** (thème gratuit de Shopify) [G2] : barre d'annonce, bannière image, diaporama, image avec texte, texte, colonnes, rangées, collage, vidéo, collection vedette, liste de collections, produit vedette, articles, contenu repliable, formulaire de contact, lettre d'information, produits liés, tiroir du panier, recherche.
- **Horizon** [G1] : ouverture, diaporama, texte défilant, média avec contenu, carrousel, liste de produits, liste et liens de collections, produit vedette, points cliquables sur image, articles, recommandations, commande rapide, séparateur, logo.
- **Un thème payant très vendu** annonce en plus [T1] : achat rapide, aperçu rapide, panier collant, grand menu, compte à rebours, guide des tailles, onglets, avant / après, pastilles de couleur, produits vus récemment.
- **Réglages offerts sur toute section** [G1] : largeur (page ou pleine), hauteur (auto, petite, moyenne, grande, plein écran), alignements, écarts et marges de 0 à 100 px, fond, voile uni ou dégradé.
- **Liste de produits** [G1] : grille, carrousel ou mise en page éditoriale ; 1 ou 2 colonnes sur téléphone ; 1 à 16 produits.

## 9. Les fonctions attendues d'une boutique soignée

- **Panier :** en tiroir ou en page [G1][G2].
- **Recherche qui propose pendant la frappe :** dix résultats au plus ; fermer n'efface pas la saisie ; un lien « voir tous les résultats » [A11].
- **Filtres :** le nombre de résultats par valeur, les valeurs sans résultat grisées, retrait un à un et « tout effacer » [A11].
- **Variantes :** pastille de couleur ou d'image ; la première variante disponible affichée ; bouton désactivé si épuisé ; prix mis à jour sans recharger [A6].
- **Paiement rapide :** à côté du bouton d'ajout au panier [A11].
- **Recommandations :** les « liés » sont calculés, les « complémentaires » choisis à la main [A11].
- **Médias :** vidéo à l'arrêt au chargement ; une marque « vidéo » sur sa vignette [A11].
- **Avis :** par le bloc d'une application (métier).

## 10. Les erreurs classiques

1. Une section qui ne tient qu'avec la photo et le texte de la démonstration [A6][A9].
2. Des blocs trop fins et trop nombreux, ou une mise en page liée à l'ordre des blocs [A9].
3. Deux sections pour le même rôle au lieu d'une variante [A9].
4. Du texte incrusté dans l'image [V1].
5. L'image principale chargée en différé, ou une image sans dimensions [A10].
6. Le diaporama automatique : c'est rarement un bon choix [V1].
7. Une information accessible au seul survol [A10].
8. Un titre tronqué ; une grille cassée par des proportions mêlées [A6].
9. La fausse urgence [A6].

## Ce que SINA doit en tirer

1. **Fixer le système avant la première section :** une échelle de tailles de texte, une échelle d'espacements, deux ou trois proportions d'image, un jeu de couleurs par rôle, une forme de bouton. Tout le thème s'y tient.
2. **Tirer de la planche de marque deux ou trois gestes** (objet penché, mot écrit à la main, autocollant, bord de section en vague) et les répéter sur toutes les pages : c'est la signature du thème.
3. **Dessiner au moins une section propre au produit** (ce qu'il contient, comment on s'en sert, ses jauges, « nous et les autres »), avec les seules données vraies du client.
4. **Deux sortes de pièces.** Ce qui doit marcher sans faute (bloc d'achat, panier, menu, recherche, filtres) : des pièces éprouvées, habillées à la marque. Ce qui raconte la marque : dessiné pour elle.
5. **Éprouver chaque section avec du contenu difficile** avant de la montrer : titre long, pas d'image, un seul élément, douze éléments, image très haute.
6. **Le téléphone d'abord :** tout tient dans 320 px, les zones tactiles font 44 px, le texte des champs 16 px, le bouton d'achat reste à portée du pouce.
7. **Viser les notes de Shopify :** 60 en vitesse, 90 en accessibilité, contraste de 4,5 pour 1.
8. **Jamais de faux compte à rebours, de faux stock ni de faux compteur.**
9. **Une variante plutôt qu'un doublon ;** environ 15 sections au plus sur un accueil.

## Sources

Adresse de base de la documentation des thèmes : https://shopify.dev/docs/storefronts/themes

- A1. Architecture d'un thème : /architecture
- A2. Limites : /architecture/limits
- A3. Sections et leur schéma : /architecture/sections
- A4. Blocs et blocs de thème : /architecture/blocks
- A5. Groupes de sections : /architecture/section-groups
- A6. Exigences de la boutique de thèmes : /store/requirements
- A7. Soumettre et tester un thème : /store/review-process/submit-theme ; /store/test-theme/checklist
- A8. Theme Check : /tools/theme-check
- A9. Concevoir un thème, bonnes pratiques des sections et des couleurs : /best-practices/design ; /best-practices/templates-sections-blocks
- A10. Bonnes pratiques de vitesse et d'accessibilité : /best-practices/performance ; /best-practices/accessibility
- A11. Recherche, filtres, médias, paiement rapide, recommandations : /navigation-search ; /product-merchandising
- A12. Préversion du 21 juillet 2026 : https://shopify.dev/changelog/posts/developer-preview-liquid-block-and-partial-tags
- P1. Pages obligatoires (même page que A6)
- G1. Code du thème Horizon : https://github.com/Shopify/horizon
- G2. Code du thème Dawn : https://github.com/Shopify/dawn
- G3. Code du thème Skeleton : https://github.com/Shopify/skeleton-theme
- W1. W3C, comprendre WCAG 2.2 : https://www.w3.org/WAI/WCAG22/Understanding/
- W2. W3C, longueur des textes traduits : https://www.w3.org/International/articles/article-text-size
- V1. web.dev, typographie, zones tactiles, carrousels, réduction du mouvement : https://web.dev/learn/design/typography ; https://web.dev/articles/accessible-tap-targets ; https://web.dev/articles/carousel-best-practices ; https://web.dev/articles/prefers-reduced-motion
- T1. Fiches de la boutique de thèmes (Horizon, Prestige, Impact, Local) : https://themes.shopify.com/themes
- M1. Maestrooo, architecture et bonnes pratiques : https://support.maestrooo.com/article/762-theme-architecture
- C1. Out of the Sandbox, conseils de designers (2020) : https://outofthesandbox.com/blogs/shopify-theme-blog/designer-tips-2020
- C3. Clean Canvas (2025) : https://www.cleancanvas.co.uk/blog/design-freedom-without-losing-store-conversions
- C4. Fuel Themes, guide d'achat (2026) : https://fuelthemes.net/premium-shopify-themes-guide/
- C5. Exhibea (2026) : https://exhibea.com/blogs/shopify-plus-blog/best-shopify-themes
- S1. Smashing Magazine, la zone du pouce (2016) : https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/

**Limites.** Pages restées fermées : les centres d'aide d'Archetype, de Clean Canvas et de Pixel Union. Aucun entretien ni article de fond des grands studios sur leur méthode n'a été trouvé : les sources C3, C4 et C5 écrivent pour vendre. Les listes de sections des thèmes payants sont publiées en images : seules leurs fonctions annoncées ont été lues. Aucune étude fiable sur l'effet du bouton d'achat collant. Le chiffre sur la tenue du téléphone date de 2016. Une contradiction n'est pas levée dans la documentation de Shopify entre les exigences de sa boutique de thèmes et son nouveau thème de départ. Les pages ont été lues avec un outil qui les résume : un chiffre critique se relit à la source avant d'être gravé dans le code.
