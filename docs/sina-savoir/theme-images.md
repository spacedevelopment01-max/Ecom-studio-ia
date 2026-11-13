# Les images d'un thème : cahier de métier

Recherche du 13 novembre 2026. Les chiffres entre crochets renvoient aux sources. « (métier) » : savoir du métier, non vérifié sur une page. « (extrait) » : valeur vue seulement dans un extrait de moteur de recherche, la page ayant refusé de s'ouvrir. « (vu) » : constaté sur les boutiques de démonstration de seize thèmes populaires, ouvertes sur téléphone le 13 novembre 2026 (voir `theme-construction-des-pages.md`).

## 1. L'ouverture de l'accueil

- **Par défaut, une image fixe.** Une image fixe vaut mieux qu'un diaporama, et un contenu important n'est jamais confié au seul diaporama [32]. La plupart des visiteurs ne voient pas toutes les vues : la première reçoit presque toute l'attention [18].
- **Jamais de défilement automatique sur téléphone.** Il n'y a pas de survol pour mettre en pause, et les testeurs étaient gênés quand la vue changeait avant la fin de leur lecture [18][32].
- **Un diaporama sur ordinateur, seulement s'il sert :** 5 à 7 secondes par vue simple, jusqu'à 10 si elle porte beaucoup de texte ; pause au survol ; arrêt définitif dès que le visiteur a touché aux flèches [18]. Cinq vues au plus [32] ; un studio de thèmes en conseille deux ou trois [41]. Ce qui bouge tout seul est pris pour une publicité [31].
- **Accessibilité :** tout mouvement automatique de plus de cinq secondes doit pouvoir être mis en pause, arrêté ou masqué [16].
- **Vidéo d'ouverture :** la vidéo qui démarre seule sur l'accueil est déconseillée [38]. Si on la garde : muette [8], courte, avec une image d'attente (c'est elle qui compte pour la vitesse de la page [10][14]) et un bouton de pause [16].
- **L'image ne doit pas avaler la page.** Une image géante qui repousse l'action principale sous l'écran la fait manquer [36].
- **Une vraie image de la marque.** Les visuels décoratifs ou de banque d'images sont ignorés du regard [37][38].
- **Montrer l'étendue de l'offre dès l'accueil :** au moins 40 % des types de produits, en image ; sinon le visiteur croit que le reste n'existe pas [29].
- **Quelle forme choisir (métier) :**
  - image pleine avec le texte dessus, si la photo a une vraie zone calme et que le titre est court ;
  - image en haut et texte en dessous (ou moitié image, moitié texte sur ordinateur), si la photo est chargée, le titre long, ou si le produit doit rester entier ;
  - vidéo, seulement si le mouvement montre ce qu'une photo ne peut pas montrer ;
  - diaporama, seulement pour plusieurs messages de même importance.
- **(vu)** Les deux formes existent chez les meilleurs. Thème de luxe : image pleine, titre de deux ou trois mots centré dessus, deux boutons. Thème de boisson joyeux : le nom géant, la photo des produits, puis le titre, une ligne de texte et un bouton SOUS l'image. Dans les deux cas, le titre et le premier bouton tiennent dans le premier écran du téléphone.

## 2. Le texte posé sur une image

- **Jamais de texte dans le fichier de l'image.** Le thème recadre : un texte incrusté est déplacé ou coupé, et illisible sur téléphone [1][18][20]. Le texte est posé par le thème, par-dessus ou à côté.
- **Contraste exigé :** 4,5 pour 1 pour le texte courant, 3 pour 1 pour le grand texte (environ 24 px, ou 18,5 px en gras), mesuré sur le fond réellement derrière les lettres [15]. Bordures et icônes : 3 pour 1 [4].
- **Comment l'obtenir :** une image simple derrière le texte [1], un voile sombre, un dégradé en bas d'image, un flou local ou un bloc à demi opaque. Exemple lu : un bloc sombre à 30 % ne suffisait pas sur des nuages clairs, il fallait 50 % [33].
- **Tester sur la pire image.** Si une section reçoit des photos claires et sombres, la méthode doit tenir pour la plus claire, à l'endroit exact du texte [33].
- **Où le placer :** près d'un bord, de préférence en bas, pour ne traiter qu'une petite surface de la photo [33]. Sur la partie calme, le sujet de l'autre côté, jamais sur un visage ni sur le produit (métier).
- **Sur téléphone :** le recadrage amène le texte sur une zone chargée ou cache le sujet. Passer le texte sous l'image et le raccourcir [34], ou fournir une image faite pour le téléphone [46].

## 3. Point focal et recadrage

- **La mécanique :** la section recadre l'image à la forme de sa zone. Une image large sur un écran haut est coupée à gauche et à droite ; une image haute sur un écran large, en haut et en bas [1].
- **Un point focal sur chaque image recadrée.** Shopify garde ce point dans le cadre ; un seul par image, valable partout où elle sert [1]. Le thème doit le prendre en charge : c'est une exigence de la boutique de thèmes [4].
- **Trois moyens de réduire le recadrage :** une hauteur de section adaptée à l'image, le point focal, ou une image déjà coupée à la forme de la section [1]. Dans un diaporama, toutes les vues ont la même proportion [1].
- **Une image à part pour le téléphone quand le texte est posé dessus :** en hauteur (800 × 1200 px) [46] ou carrée [45]. En code, un seul élément qui choisit la bonne image, jamais deux images dont une cachée [5].
- **Composer une photo pour les deux cadrages :** l'essentiel vers le milieu [42]. Le sujet tient dans le carré central de l'image large, du décor tout autour, rien de vital près des bords, la zone calme du côté prévu pour le texte ; simuler les deux recadrages avant de payer la photo (métier).

## 4. Proportions et tailles

Shopify ne donne aucune taille par emplacement : il renvoie à la documentation de chaque thème [1]. Ses limites : 20 mégapixels et 20 Mo par image de thème [1] ; photos de produit jusqu'à 5000 × 5000 px, le carré de 2048 × 2048 px « s'affiche généralement le mieux », et la même proportion pour toutes les photos principales [2]. Shopify sert l'image jusqu'à 5760 px de large et n'agrandit jamais l'original [7].

| Emplacement | Valeurs lues dans les documentations de thèmes |
|---|---|
| Ouverture, bannière | 16:9, 2880 × 1620 px, au moins 1600 × 900 [46] ; 1920 × 800, ou 1920 × 1080 en plein écran [43] ; paysage, 2500 px de large au moins [44] |
| Ouverture sur téléphone | en hauteur, 800 × 1200 px [46] |
| Photo de produit (carte et fiche) | 2400 × 2400 (carré) ou 1800 × 2400 (en hauteur) [40] ; 3:4, 1500 × 2000 [46] ; 2000 × 2000 au moins [43] |
| Carte de collection | 1200 × 1200 px [43] ; carré ou paysage, une seule forme pour toutes [44] |
| Bannière de collection | 2400 × 900 px [40][42] |
| Image avec texte | 1200 × 900 px (4:3) [43] ; 1250 px de large au moins, carré ou en hauteur [44] |
| Blog | 2400 × 1200 [40] ; 1200 × 630 [43] ; 1600 × 1200 [46] |
| Logo | 400 × 160 px au plus [43] ; envoyé au double de la largeur affichée [46] |

- **Une seule proportion pour toutes les photos de produit :** en hauteur pour les produits allongés, carré sinon [40]. La grille ne doit jamais casser [4].
- **Viser grand.** Shopify réduit une image, il n'invente aucun détail [43].
- **(vu)** Sur les fiches produit relevées, la première image est le plus souvent carrée et occupe toute la largeur du téléphone.

## 5. La galerie de la fiche produit

- **Combien :** jamais moins de 3 à 5 images par produit, de types variés [26]. Plus de la moitié des testeurs commencent par les images [19].
- **Les types utiles :**
  - le produit seul sur fond neutre, le plus lisible [27] ;
  - **à l'échelle**, au moins une : main, personne, objet de taille connue ou lieu d'usage. Beaucoup de visiteurs jugent la taille sur les images, et plus d'un tiers des sites n'en donnent pas [19][30] ;
  - en situation (ce peut être la même image) [19] ;
  - le détail de matière en très gros plan [27] ;
  - porté par une personne, pour les vêtements, accessoires et cosmétiques [30] ;
  - l'image annotée (dimensions, contenu du lot, une propriété) : texte gros, pensé pour le téléphone, ou légende sous l'image [20] ;
  - la compatibilité et les idées d'usage [27] ; les photos de clients, jugées plus fiables que celles du site [30].
- **Étiquette, composition, ingrédients :** les visiteurs zooment pour les lire [23]. Il faut donc une image où ils sont lisibles.
- **Images créées par ordinateur :** acceptées en complément de vraies photos, pas à leur place [19].
- **Ordre conseillé (métier, aucune étude ne le fixe) :** 1) le produit seul, entier ; 2) en situation et à l'échelle ; 3) le détail de matière ; 4) l'image annotée ; 5) l'emballage ou le contenu ; puis la vidéo.
- **Vignettes :** sur ordinateur, de vraies vignettes et non des points ; si la liste est coupée, le montrer (flèches, « +5 », vignette à demi visible) [21][22]. Sur téléphone : glissement au doigt obligatoire [22].
- **Zoom :** une image granuleuse agrandie déçoit plus que pas d'image ; charger une version plus fine au zoom [23]. Sur téléphone, pincer et double toucher doivent marcher [24].
- **Vidéo :** dans la galerie, avec une icône de lecture, jamais dans un onglet à part. Plus de la moitié des testeurs ne la regardent pas : elle ne remplace aucune photo [25].
- **Cartes produit dans les listes :** plusieurs images par carte, avec un indicateur visible [28].

## 6. Le rythme d'une page

- **Chaque image apporte une information.** Les images décoratives sont évitées du regard [35][37].
- **L'alternance image à gauche, image à droite** gêne la lecture quand les images sont décoratives, reste acceptable sur deux ou trois rangées, et ne pose pas de problème si les images informent [35]. Donc pas plus de deux ou trois sections alternées de suite ; ensuite, changer de forme.
- **Sur téléphone,** les images empilées allongent le défilement : retirer celles qui n'apportent rien [34].
- **Une série cohérente :** même angle, mêmes fonds d'une image à l'autre, cela aide à comparer [39] ; la boutique de thèmes exige des images nettes, bien dimensionnées et cohérentes [4].
- **(métier)** Alterner pleine largeur et largeur contenue ; une section sans image après deux sections chargées ; deux ou trois proportions au plus dans un thème ; une série partage sa lumière, sa palette, son grain et sa distance au sujet.
- **(vu)** Les thèmes relevés alternent une section en image pleine et une section claire et contenue. Entre deux blocs d'images, ils placent une phrase seule, en très grand, de 15 à 35 mots : c'est la respiration de la page. Les thèmes qui ont du caractère font déborder un objet détouré (un fruit, un sachet) à cheval sur deux sections : ce geste relie les sections entre elles.

## 7. Photos de produit et photos d'ambiance

- **Les rôles :** le détouré montre l'aspect, l'image à l'échelle la taille, l'image annotée les fonctions, l'ambiance le style et l'envie [27][28].
- **La photo de produit là où l'on compare :** cartes, collections, galerie, panier, recherche. Les vignettes qui distinguent vraiment les produits sont scrutées ; celles qui montrent une scène sans rapport sont ignorées [37].
- **L'ambiance là où l'on raconte :** ouverture, image avec texte, bannières, histoire de la marque. Elle montre l'univers réel de la marque, jamais un décor générique [38].

## 8. La vitesse

- **Seuils :** la plus grande image visible affichée en 2,5 secondes ou moins, et presque aucun saut de mise en page, pour trois visites sur quatre [9][11]. Boutique de thèmes de Shopify : note moyenne d'au moins 60 en vitesse et 90 en accessibilité, sur l'accueil, la collection et la fiche produit, mesurée avec de vraies images [4].
- **L'image principale de la page :** jamais de chargement différé ; elle seule en priorité haute ; une vraie balise d'image, pas un fond en CSS ; aucune animation d'apparition [5][9].
- **Toutes les autres :** chargement différé [12].
- **Des tailles adaptées à chaque écran** (`srcset` et `sizes`) : exigence de la boutique de thèmes [4][5][6].
- **Formats :** Shopify sert de lui-même le format le plus léger que le navigateur accepte [7]. On envoie un bon JPG, un PNG seulement pour la transparence [1][40].
- **Place réservée :** largeur et hauteur déclarées sur toutes les images, pour que rien ne saute pendant le chargement [11][12].

## 9. Le texte alternatif

- Obligatoire sur toutes les images [4]. Shopify : 512 caractères au plus, 125 ou moins conseillés [3].
- Image décorative, ou qui répète le texte voisin : texte vide. Image dans un lien ou un bouton : dire la destination. Image qui porte un sens : le dire en peu de mots. Texte présent seulement dans l'image : le reprendre [17].
- Décrire ce qu'on voit (produit, matière, couleur, situation), sans liste de mots-clés (métier).

## 10. Les erreurs classiques

- Sujet coupé sur téléphone : pas de point focal, pas d'image faite pour lui [1].
- Texte incrusté dans l'image [1][20] ; texte sur une zone chargée, contraste non vérifié sur la photo la plus claire [15][33] ; texte sur un visage ou sur le produit (métier).
- Proportions mélangées dans une grille ou un diaporama [1][2][40].
- Défilement automatique sur téléphone [18].
- Image principale en chargement différé ou en fond CSS [5][9].
- Image floue, étirée ou trop petite pour le zoom [4][23].
- Aucune image à l'échelle [19] ; vidéo cachée dans un onglet [25].
- Image décorative posée pour remplir une case [35][38].
- Fenêtre d'inscription qui s'ouvre sur l'ouverture et la cache (vu sur une démonstration).

## Ce que SINA doit en tirer

1. **Décider la forme de l'ouverture avant de décrire la photo** : texte sur l'image (photo à zone calme, titre court) ou texte sous l'image. Sur téléphone, le titre et le bouton tiennent dans le premier écran.
2. **Décrire chaque photo pour sa place** : sa proportion, où est le sujet, où est la zone calme, ce qui peut être coupé. Une photo d'ouverture se compose pour deux cadrages, large et haut.
3. **Aucun texte dans les photos du thème.** Le texte est posé par le thème, avec un contraste vérifié à l'endroit exact des lettres.
4. **Une seule proportion pour toutes les photos de produit**, et deux ou trois proportions au plus dans tout le thème.
5. **Pour chaque produit, viser les types d'images qui manquent** : à l'échelle, en situation, détail, étiquette lisible. Dire au client celles que seule une vraie photo peut donner.
6. **Chaque image doit dire quelque chose.** Une image qui ne fait que remplir une case est retirée.
7. **Rythme :** pas plus de deux ou trois sections « image d'un côté, texte de l'autre » à la suite ; une phrase seule en grand entre deux blocs d'images ; un geste qui relie les sections (objet détouré à cheval), repris de la planche de marque.
8. **Vitesse :** l'image d'ouverture est chargée en premier, toutes les autres en différé, toutes avec leurs dimensions.

## Sources

**Shopify**
1. Images du thème : https://help.shopify.com/en/manual/online-store/images/theme-images
2. Types de médias produit : https://help.shopify.com/en/manual/products/product-media/product-media-types
3. Texte alternatif des médias produit : https://help.shopify.com/en/manual/products/product-media/add-alt-text
4. Exigences de la boutique de thèmes : https://shopify.dev/docs/storefronts/themes/store/requirements
5. Bonnes pratiques de vitesse pour les thèmes : https://shopify.dev/docs/storefronts/themes/best-practices/performance
6. Filtre image_tag : https://shopify.dev/docs/api/liquid/filters/image_tag
7. Filtre image_url : https://shopify.dev/docs/api/liquid/filters/image_url
8. Médias produit, conseils d'ergonomie : https://shopify.dev/docs/storefronts/themes/product-merchandising/media/media-ux

**web.dev**
9. Optimize Largest Contentful Paint : https://web.dev/articles/optimize-lcp
10. Largest Contentful Paint : https://web.dev/articles/lcp
11. Optimize Cumulative Layout Shift : https://web.dev/articles/optimize-cls
12. Browser-level image lazy loading : https://web.dev/articles/browser-level-image-lazy-loading
13. Fetch Priority : https://web.dev/articles/fetch-priority
14. Video performance : https://web.dev/learn/performance/video-performance

**W3C**
15. Understanding Contrast (Minimum) : https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
16. Understanding Pause, Stop, Hide : https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
17. An alt Decision Tree : https://www.w3.org/WAI/tutorials/images/decision-tree/

**Baymard Institute**
18. 10 UX Requirements for Homepage Carousels : https://baymard.com/blog/homepage-carousel
19. Provide at Least One "In Scale" Image : https://baymard.com/blog/in-scale-product-images
20. Include Descriptive Text or Graphics for Some Product Images : https://baymard.com/blog/product-images-descriptive-text
21. Always Signpost Hidden Thumbnails : https://baymard.com/blog/truncating-product-gallery-thumbnails
22. Always Use Thumbnails to Represent Additional Product Images : https://baymard.com/blog/always-use-thumbnails-additional-images
23. Ensure Sufficient Image Resolution and Zoom : https://baymard.com/blog/ensure-sufficient-image-resolution-and-zoom
24. Mobile Gestures: Pinch or Tap for Product Images : https://baymard.com/blog/mobile-image-gestures
25. Product Page Videos: Where and How to Embed Them : https://baymard.com/blog/embedding-product-page-videos
26. 35 Data-Driven Ecommerce Best Practices : https://baymard.com/blog/ecommerce-ux-best-practices
27. UX: 7 Types of Product Images : https://baymard.com/blog/ux-product-image-categories
28. Product Lists & Search Results Thumbnail Best Practices : https://baymard.com/blog/secondary-hover-information
29. Can Users Infer the Breadth of Your Product Catalog? : https://baymard.com/blog/inferring-product-catalog-from-homepage
30. Product Page UX 2026 : https://baymard.com/blog/current-state-ecommerce-product-page-ux

**Nielsen Norman Group**
31. Auto-Forwarding Carousels, Accordions Annoy Users : https://www.nngroup.com/articles/auto-forwarding/
32. Carousel Usability : https://www.nngroup.com/articles/designing-effective-carousels/
33. Ensure High Contrast for Text Over Images : https://www.nngroup.com/articles/text-over-images/
34. Big Pictures on Small Screens : https://www.nngroup.com/articles/big-pictures-small-screens/
35. Zigzag Image–Text Layouts : https://www.nngroup.com/articles/zigzag-page-layout/
36. Image-Focused Design: Is Bigger Better? : https://www.nngroup.com/articles/image-focused-design/
37. Photos as Web Content : https://www.nngroup.com/articles/photos-as-web-content/
38. Homepage Design: 5 Fundamental Principles : https://www.nngroup.com/articles/homepage-design-principles/
39. How to Film and Photograph for Usability : https://www.nngroup.com/articles/video-image-details/

**Studios de thèmes**
40. Maestrooo, tailles d'images : https://support.maestrooo.com/article/757-image-size-recommendations
41. Maestrooo, diaporama : https://support.maestrooo.com/article/811-slideshow
42. Maestrooo, image de collection : https://support.maestrooo.com/article/732-collection-image
43. Fuel Themes, tailles d'images : https://documentation.fuelthemes.net/?p=1326
44. Fluorescent, tailles d'images : https://help.fluorescent.co/ira/general/image-guide/image-sizes
45. Fluorescent, réglages d'images : https://help.fluorescent.co/ira/general/image-guide/theme-image-settings
46. We Are Underground, tailles et proportions : https://www.weareunderground.com/blogs/theme-support/image-sizes-and-ratios

**Limites.** Pages restées fermées : Archetype Themes, Out of the Sandbox, Pixel Union, Clean Canvas. Les fiches complètes du Baymard Institute sont payantes : seuls ses articles publics ont été lus, et ses chiffres varient d'une année à l'autre. L'article de 2013 sur le défilement automatique repose sur l'observation d'un seul utilisateur. Sans source trouvée : le choix entre texte sur l'image et texte à côté, le nombre d'images par page, l'ordre de la galerie, la règle « le texte à l'opposé du sujet ». L'outil de lecture résume les pages : les chiffres de la boutique de thèmes ont été relus deux fois, les autres une seule.
