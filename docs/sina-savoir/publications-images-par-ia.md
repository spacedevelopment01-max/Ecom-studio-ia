# Créer les images d'une publication avec un modèle d'images : cahier de métier

Recherche du 14 novembre 2026. Les chiffres entre crochets renvoient aux sources. « (lu) » : lu sur la page. « (extrait) » : vu seulement dans un extrait de moteur de recherche, la page ayant refusé de s'ouvrir. « (métier) » : savoir du métier, non vérifié sur une page. « (calcul) » : calculé ici d'après des règles lues. Sans mention : lu.

## 1. Les modèles d'OpenAI en novembre 2026

- **Chronologie officielle** [5] : `gpt-image-1` (avril 2025), `gpt-image-1-mini` (octobre 2025), `gpt-image-1.5` (16 décembre 2025) ; GPT Image 2 le 21 avril 2026 (tailles libres, entrées en haute fidélité, prix au jeton) ; GPT-Image-2.5 Sunburst et Flare le 8 septembre 2026 (qualités `xhigh` et `max`) ; GPT-Image-2.6 Sunburst et Flare le 4 novembre 2026 (complexité réglable, SVG, GIF animé, retouche guidée par annotation). `gpt-image-1` est arrêté depuis le 23 octobre 2026 ; `gpt-image-1.5` le sera le 1er décembre 2026 [1][2].
- **Flare ou Sunburst.** Flare est plus rapide et plus petit ; Sunburst, le modèle de base, donne plus de détail et des retouches plus précises [3], et se choisit « là où la précision de la retouche compte le plus » [1]. La fiche de 2.6 Flare le dit fait pour « itérer vite » [7].
- **Limites que reconnaît OpenAI** [1] : placer un texte avec précision et le rendre net ; garder d'une création à l'autre les personnages ou les **éléments de marque récurrents** ; placer des éléments au bon endroit dans une mise en page structurée ; « jusqu'à 2 minutes » pour une consigne complexe. Kittl a mesuré 40 à 90 s par image sur GPT Image 2 (avril et mai 2026, environ 200 consignes) [13].

## 2. Tailles, qualité, transparence, références

- **Tailles** [1] : 1024×1024, 1536×1024 et 1024×1536 conseillées ; sur Sunburst, Flare et `gpt-image-2`, tailles libres si les côtés sont des multiples de 16, la proportion entre 1:3 et 3:1, aucun côté au-delà de 3 840 px et le total entre 655 360 et 8 294 400 pixels ; au-delà de 2560×1440, rendu « expérimental » ; le carré est « d'ordinaire le plus rapide ». Les anciens modèles (1.5, mini) n'ont que trois tailles fixes.
- **Qualité** : `low`, `medium`, `high`, `xhigh`, `max` et `auto` (par défaut) sur Sunburst et Flare ; les anciens modèles s'arrêtent à `high` [1]. Sur 2.6, elle règle le détail visible (textures, petites lettres) ; « un réglage plus haut ne garantit pas un meilleur résultat » ; ne monter que pour corriger un défaut constaté [2][3].
- **Complexité (2.6)** : combien le modèle prévoit avant de dessiner, `low`, `medium` ou `high` (par défaut), sans supplément. Haute pour une mise en page libre ; basse pour une retouche ciblée, car elle « peut introduire des changements non voulus » [1][2].
- **Fichiers** : PNG par défaut, JPEG (plus rapide) et WebP [1].
- **Fond transparent** : `background: "transparent"` en PNG ou WebP, sur 2.5 et 2.6, en préversion sur `gpt-image-2` [1][6] ; en JPEG il retombe en opaque sans prévenir [12] ; « un damier dessiné n'est pas de la transparence » [2].
- **Images de référence** : **de 1 à 16** par retouche [6][12] ; le masque et l'annotation ne s'appliquent qu'à la première, les suivantes servent de références, l'image à modifier reste en tête [1]. Depuis GPT Image 2, toute entrée est traitée en haute fidélité (`input_fidelity` à omettre), ce qui coûte plus de jetons [1][2].
- **Masque et annotation** : le masque est « entièrement guidé par la consigne » et sa forme exacte peut ne pas être suivie (même format que l'image, moins de 50 Mo, canal alpha) ; l'annotation (`markup`) est un PNG transparent aux dimensions de la première image, jamais avec un masque [1][6]. `n` va de 1 à 10 [6].

## 3. Prix officiels (page des prix lue le 14 novembre 2026)

- **Au million de jetons** [4] : même tarif pour 2.6 et 2.5 (Sunburst et Flare) et `gpt-image-2` : texte en entrée 5 $, image en entrée 8 $, **image en sortie 30 $**, moitié prix par lots. `gpt-image-1.5` : 32 $ en sortie ; `gpt-image-1-mini` : 8 $. Aucune date d'effet affichée.
- **Prix par image publiés par OpenAI**, en sortie, qualités basse / moyenne / haute [1] : `gpt-image-2` 0,006 / 0,053 / 0,211 $ en carré et 0,005 / 0,041 / 0,165 $ en 1024×1536 ; `gpt-image-1.5` 0,009 / 0,034 / 0,133 $ en carré et 0,013 / 0,05 / 0,20 $ hors carré ; `gpt-image-1-mini` 0,005 / 0,011 / 0,036 $ en carré.
- **Pour 2.5 et 2.6, aucun tableau par image d'OpenAI** : « des tarifs égaux ne veulent pas dire un coût égal par image » [1]. Pour 2.6, prix par image **non trouvé**.
- **Calculateur d'OpenAI pour 2.5**, relevé par Apidog le 9 septembre 2026 [11], en 1536×1024 : basse 0,0047 $, moyenne 0,0103 $, haute 0,0412 $, `xhigh` 0,0738 $, `max` 0,1646 $ (en carré : haute 0,0527 $, `max` 0,2107 $). Le « haute » de 2.5 équivaut au budget du « moyenne » de GPT Image 2.
- **Ce qui s'ajoute** [1][4] : 100 jetons de sortie par image partielle ; les références, en jetons d'image d'entrée à 8 $ le million (jetons par image d'entrée : non trouvé).
- **Ordre de grandeur** (calcul) : 20 images en « haute » de 2.5, environ 0,82 $ en sortie ; en `max`, environ 3,3 $ ; sans entrées ni reprises.

## 4. Garder un vrai produit fidèle

- **Ce que conseille OpenAI** [2][3] : numéroter chaque image d'entrée et dire son rôle (« le sujet de l'image 1 ») ; dire « ne change que X » et énumérer ce qui reste (identité, géométrie, étiquettes, lumière) ; l'exemple officiel demande de « préserver exactement la géométrie du produit et la lisibilité de l'étiquette » et de ne pas « restyler » le produit ; épeler les noms de marque lettre par lettre.
- **Recoller l'original.** Pour une zone qui doit rester identique au pixel, recoller la retouche approuvée sur l'image d'origine, car « des retouches répétées peuvent changer des détails qu'on voulait garder » [2][3].
- **Ce que le modèle déforme, selon Rewarx** (45 images comparées à des photos de studio ; essai non daté, notation non décrite) [14] : textures lissées (tissage, cuir, bois, métal), reflets et verre déformés ; « inadapté là où une information imprimée doit apparaître exactement » ; couleurs bonnes, fonds et mises en situation réussis.
- **Points faibles relevés par Kittl** (GPT Image 2, mai 2026) [13] : liquides versés et fumée, plus de 12 objets, doigts entrelacés, plus de 4 sources de lumière (ombres impossibles), matières translucides plates, grands angles étirés, motifs parasites sur les surfaces planes. Kittl n'a pas testé la fidélité d'une étiquette à partir d'une référence.
- **Une consigne ne protège pas les pixels** : rééclairer le produit ou changer son angle les modifie ; la méthode sûre garde la photo d'origine détourée sur un calque, le décor dessous, l'ombre à part (extrait) [17]. Photoroom sépare de même le « fond IA », produit inchangé, de la « scène IA », qui le rééclaire (extrait) [16] ; son mode par lots fait « beaucoup moins de changements d'ombres et de lumière » [15].
- **Pratique du luxe** (fin 2025) [25] : « le produit doit rester fidèle à l'original » ; l'IA sert surtout à prolonger une vraie prise de vue ; chez Burberry, l'image principale du produit reste une photo. Mango photographie d'abord chaque vêtement réel avant de le mettre en scène (extrait) [36].
- **Trois méthodes, de la plus rapide à la plus fidèle** (métier, appuyé sur [2][3][17]) :
  1. **Scène autour de la photo donnée en image 1** : rapide, mais étiquette, logo et proportions peuvent dériver ; pour les produits simples sans texte imprimé.
  2. **Retouche d'une zone d'une vraie photo** (masque ou annotation), produit contrôlé au zoom.
  3. **Scène avec une place libre, puis vrai produit détouré recollé** (ombre et lumière accordées) : exact au pixel, obligatoire dès qu'il y a étiquette, texte imprimé, logo, verre, métal poli ou matière fine.

## 5. Même direction artistique sur vingt images

- **Ce que conseille OpenAI** [2][3] : créer une image d'ancrage, puis répéter dans chaque consigne les détails qui la définissent (« mêmes traits, mêmes proportions, même palette ») ; garder la même description de style ; donner un rôle précis à l'image de style (sa palette, sa texture ou sa technique) et décrire à part le nouveau sujet ; répéter les contraintes si la série dérive.
- **Ce que conseille fal** : nommer les traits à garder (palette, traitement des bords, silhouette) plutôt qu'écrire « même style », et ne jamais empiler les étiquettes (« minimaliste brutaliste éditorial luxe ») [12].
- **Essais** : Kittl note 4,5 sur 5 la tenue d'un style sur une série avec référence [13] ; OpenAI reconnaît pourtant une faiblesse de cohérence d'une création à l'autre [1].
- **Méthode d'une série** (métier) : un **bloc de style fixe**, copié mot pour mot dans les vingt consignes (lumière : source, direction, heure ; palette de trois à cinq couleurs nommées ; grain ; focale ; distance ; surface ; hauteur de l'appareil) ; même modèle, même qualité, même taille ; la même image d'ancrage en image 2, rôle « lumière et palette seulement » ; seule la scène varie (moment, objet voisin, cadrage) ; relecture de la série en mosaïque avant de publier ; l'image qui détonne est écartée plutôt que retouchée trois fois.

## 6. Le texte dans l'image

- **Ce que conseille OpenAI** [2][3] : texte entre guillemets, place et typographie décrites, et « dire combien de fois il doit apparaître » ; « aucun autre texte », puis vérifier l'orthographe ; qualité moyenne ou haute pour un petit texte ou plusieurs polices. Les exemples écrivent « Texte (EXACT, mot pour mot, aucun caractère en plus) » ; la publicité d'exemple est en 1024×1536, qualité moyenne, accroche écrite une seule fois.
- **Ce que conseille fal** : ajouter « aucun mot en plus, aucun texte en double », épeler les mots récalcitrants, et traiter le texte comme une mise en page (hiérarchie, alignement, espaces libres) [12].
- **Jusqu'où le modèle écrit juste**, selon Kittl (GPT Image 2, avril et mai 2026) [13] : grandes lettres nettes, petits textes d'étiquette lisibles ; au-delà de 100 mots, des lettres s'inversent dans les dernières lignes ; les écritures à ligatures fusionnent parfois ; les alphabets latin, chinois, japonais, coréen, arabe et cyrillique sont bien rendus. **Les accents français n'ont pas été testés**, et aucun essai publié sur é, è, ç, œ ou « » n'a été trouvé.
- **Pratique des équipes qui produisent beaucoup** (extrait) [30] : tout texte créé par le modèle est tenu pour non vérifié ; pour une typographie qui compte, l'image sert de fond et le texte final se pose ensuite dans un outil de mise en page.
- **La règle qui en découle** (métier) : au plus une accroche courte dans l'image ; prix, dates, pourcentages, mentions légales et coordonnées posés après, en texte vrai ; un mot faux deux fois, on change la phrase.

## 7. Écrire une consigne de niveau professionnel

- **Structure d'OpenAI** [2][3] : définir le résultat (sujet, usage, composition, proportion) ; pour une demande complexe, des parties titrées **scène, sujet, détails, contraintes** ; nommer matières, lumière, couleurs, cadrage, textures ; pour une personne, cadrage du corps, regard, ce qu'elle touche ; écrire « vraie photographie » quand c'est le but ; nommer les exclusions (« aucun texte en plus, aucun filigrane, aucun logo sans rapport »). Pour une retouche : ce qui change, ce qui reste, les contraintes [12].
- **Vocabulaire de photographe.** « Une indication d'appareil est un repère d'apparence, pas une simulation physique exacte » ; pour une scène nocturne, sous la pluie ou au néon, décrire l'échelle, l'atmosphère et la couleur plutôt que des mots d'humeur [2][3]. Formules utiles : « 50 mm, rendu documentaire », « lumière d'une fenêtre au nord », « juste après l'aube », « à hauteur d'yeux », « faible profondeur de champ », « léger grain argentique », « rendu moyen format » [12] ; « 85 mm », « éclairage Rembrandt », « lumière de contour » sont bien exécutés [13].
- **À bannir** : les compliments vagues (« magnifique », « chef-d'œuvre ») et les mots d'ambiance, qui « noient la demande » [12].
- **Parades aux défauts** (défauts : [2][13][14] ; parades : métier) : mains hors champ ou pose décrite en détail ; nombre exact d'objets, chacun nommé, moins de douze ; faux texte et logos exclus par écrit puis vérifiés ; verre, reflets et métal hors du premier plan, ou vrai produit recollé ; une seule source de lumière principale, direction écrite ; hauteur et angle de l'appareil donnés, focale de 35 à 85 mm, jamais de grand angle extrême ; image refaite si une surface plane montre des motifs parasites.
- **Itérer.** Reprendre l'image obtenue et ne demander qu'**un changement par tour**, en répétant les contraintes [2][3]. « De petites retouches successives valent mieux qu'une grande réécriture » [12].
- **Le guide d'images du propriétaire** suit cette structure, et son « la scène contient exactement N objets » pare un défaut mesuré [13] (métier).

## 8. Formats des réseaux : 4:5, 3:4, 9:16

- **Formats d'Instagram selon des guides tiers** (extrait) [34][35] : 4:5 (1080×1350) conseillé pour le fil ; la mosaïque du profil est passée du carré au 3:4 fin 2025 (date incertaine) et un 3:4 (1080×1440) remplit sa case sans recadrage. Aucune page officielle trouvée.
- **Créer directement au bon format** avec 2.5, 2.6 ou GPT Image 2 (calcul, d'après [1]) : 4:5 en 1088×1360 ou 1600×2000 ; 3:4 en 1536×2048 ; 9:16 en 1152×2048, ou 1440×2560 à la limite du rendu expérimental ; puis réduire à 1080 px de large (métier).
- **Avec un modèle à tailles fixes** (calcul) : recadrer le 1024×1536 en 1024×1280 pour le 4:5 (17 % de la hauteur perdus) ou à 864 px de large pour le 9:16 (16 % de la largeur perdus) ; ou agrandir le cadre en posant l'image sur une toile plus grande et en faisant remplir le vide par une retouche à masque, jointure à contrôler puisque le masque est guidé par la consigne [1] (métier).
- **Composer pour le format** (métier) : proportion écrite dans la consigne [2] ; sujet au centre pour survivre au rognage de la mosaïque ; en 9:16, haut et bas laissés libres pour l'interface ; chaque format créé à part plutôt qu'un carré recadré.

## 9. Ratés, réussites et jugement du public

- **Coca-Cola, Noël 2024 et 2025** (extrait) [23] : roues qui scintillent, lumière étrange et humains inquiétants en 2024 ; nombre de roues des camions qui change en 2025 ; au fond, un film « sans âme ».
- **McDonald's Pays-Bas, décembre 2025** [22] : film de 45 s entièrement créé par IA sur les malheurs des fêtes, retiré trois jours après sa mise en ligne, jugé « inquiétant », « mal monté », « pas authentique », « tellement cynique ». Le producteur invoquait « dix personnes, cinq semaines » : l'effort ne sauve pas un ton faux.
- **J.Crew, août 2025** [24] : images rétro pour une collaboration avec Vans publiées sans mention de l'IA ; ombres impossibles et pieds déformés repérés ; crédit d'un « artiste numérique » ajouté trop tard ; reproches de « bouillie IA » et d'une diversité qui n'existait pas. Un mois plus tôt, une publicité Guess dans Vogue montrait des mannequins créés par IA (extrait) [28].
- **Valentino, décembre 2025** [25] : vidéo clairement signalée comme IA, où des corps et des logos se déforment autour du sac ; des centaines de commentaires (« bon marché », « paresseux », « dérangeant »). Pour Getty Images, « même une transparence totale n'a pas suffi ». Skechers dans Vogue : sentiment envers la marque en baisse de 26 % (extrait) [27].
- **Réussites** : **Almond Breeze** se moque de la bouillie IA en montrant ses vrais ingrédients (43 % de réactions positives, 3,5 % de négatives en janvier 2026, selon Meltwater) ; **Dollar Shave Club** pousse l'absurde pour que nul ne croie l'image vraie ; l'IA vaut « quand elle est utilisée avec intention, pas comme un outil d'économie » [26].- **Ce que dit le public** :
  - **IAB** (15 janvier 2026 ; 505 Américains de 16 à 43 ans et 104 dirigeants) [18] : 45 % des consommateurs sont positifs ; le sentiment négatif a pris 12 points depuis 2024 (39 % chez les 16-27 ans, 20 % chez les 28-43 ans), alors que 82 % des dirigeants croient le public positif ; plus de la moitié veut savoir quand une image est créée par IA ; 73 % disent que le savoir augmenterait ou ne changerait pas leur envie d'acheter ; les **visuels de grande qualité** sont le premier moteur d'attention.
  - **École de commerce de Copenhague** (3 août 2026, environ 700 participants) [19] : pour une même publication, l'étiquette « créée par IA » baisse l'engagement émotionnel d'environ 46 points sur un contenu d'émotion et de 27 sur un contenu rationnel ; « améliorée par IA », de 24 et 13 points. Le public accepte l'IA **comme outil plus que comme auteur**.
  - **Harris Poll** : 79 % veulent que l'IA soit toujours signalée, et l'IA est mieux tolérée pour un fond ou un concept (extrait) [20]. **Magic Hour** (juillet 2026, 1 019 adultes) : 1,4 % ont reconnu les quatre images (extrait) [21].
- **Ce qui est pardonné et ce qui ne l'est pas** (synthèse) :
  - **Pas pardonnés** : un défaut visible (doigts, pieds, roues, logo tordu), un usage caché puis découvert, de fausses personnes à la place de vraies, l'IA sur un moment d'émotion où l'on attend du vrai ; le luxe est jugé plus sévèrement [25].
  - **Tolérés** : les décors et les fonds, les concepts, l'humour qui assume l'IA, le vrai produit mis en scène.

## 10. Contrôler avant de publier

- **La liste de Superside** [29], en six titres : qualité et résolution ; anatomie et réalisme ; cohérence avec la marque ; exactitude du texte et du logo ; lumière et composition ; accidents propres à l'IA.
- **Ce que vérifient d'autres équipes** (extrait) [30][31] : visages, mains et texte d'abord ; faux textes, logos accidentels, ombres impossibles, objets fondus, comptes d'objets bizarres ; l'image vue à sa taille de publication ; le produit comparé aux vraies photos (couleurs, proportions, emballage) ; une liste écrite, des validateurs nommés, chaque défaut consigné.
- **OpenAI** demande que forme, étiquettes et détails de la référence soient intacts, et que la retouche n'ait changé que ce qui était demandé [2].
- **Liste du Studio** (métier, d'après [2][13][14][29][30]) : format juste et sujet entier ; produit fidèle à la photo d'origine (forme, couleur, étiquette mot pour mot, logo, nombre de pièces) ; texte juste, accents compris, sans fausses lettres dans le fond ; aucune marque tierce ; nombre d'objets exact ; une seule direction de lumière ; aucune personne non autorisée ; ni motif parasite ni verre déformé ; l'image tient dans la mosaïque ; aucune promesse non confirmée. Une image qui échoue est dite ratée.

## 11. Marques d'origine : C2PA et SynthID

- **Ce qu'OpenAI pose sur ses images.** Celles de ChatGPT, de Codex et de l'API portent des métadonnées C2PA **et** un filigrane invisible SynthID, d'après la documentation rapportée le 20 mai 2026 [10] et le centre d'aide d'OpenAI (extrait) [9].
- **Les deux marques** [8] : le C2PA, des « métadonnées signées » avec l'émetteur et la mention de l'IA (exemple officiel : « OpenAI OpCo, LLC », modèle « gpt-image ») ; SynthID, inscrit dans l'image même, qui « peut survivre à certaines transformations ».
- **Ce qui les efface** [8] : « modifier, convertir ou partager un fichier peut retirer ses métadonnées » ; compression, recadrage, captures et changements de format peuvent effacer ou affaiblir un signal.
- **Vérifier** : point d'accès `/v1/content_provenance_checks` ou page openai.com/verify ; l'absence de signal ne prouve rien [8][10].
- **Ce que font les réseaux** : Meta lit le C2PA et l'IPTC des outils de Google, OpenAI, Microsoft, Adobe, Midjourney et Shutterstock pour étiqueter les images (6 février 2024) [33] ; selon Billo, Meta étiquette aussi les publicités ainsi faites, sous « À propos de cette publicité » depuis juin 2026, TikTok exige la déclaration de toute publicité créée par IA, et LinkedIn affiche un badge « CR » [32]. L'article 50 du règlement européen sur l'IA s'applique depuis le 2 août 2026, avec un délai jusqu'au 2 décembre 2026 pour les systèmes déjà en service [19][32] (texte officiel non lu).
- **Conséquence** (métier) : une image d'OpenAI peut recevoir d'office une étiquette « IA » sur Instagram ; un recadrage par le Studio peut retirer le C2PA mais pas forcément SynthID [8]. Les retirer exprès irait contre la règle d'honnêteté ; une mention dans la légende reste à trancher par le propriétaire.

## 12. Ce que SINA doit en tirer

1. **Créer au format de la place** : fil en 4:5 (1088×1360 ou 1600×2000) ou 3:4 (1536×2048), story et Reel en 9:16 (1152×2048). Écrire la proportion dans la consigne, sujet au centre, haut et bas libres en 9:16.
2. **Le vrai produit en image 1, toujours** : « image 1 : le produit du client, à garder tel quel », puis ce qui ne change pas (forme, proportions, couleurs, étiquette mot pour mot, logo, nombre de pièces), la marque épelée et « ne pas restyler le produit ».
3. **Choisir la méthode selon le produit** : étiquette, logo, verre, métal poli ou matière fine, scène autour d'une place libre puis vrai produit détouré recollé ; produit simple sans texte, mise en scène depuis sa photo. Jamais de publication avec une étiquette réécrite par le modèle.
4. **Un bloc de style fixe par marque**, copié mot pour mot dans chaque consigne (lumière, palette nommée, grain, focale, hauteur de l'appareil, surface), une image d'ancrage en image 2 pour « lumière et palette seulement », et le même modèle, la même qualité, la même taille pour toute la série.
5. **Décrire une photo, pas une ambiance** : type de photo, cadrage, focale, lumière, surface, profondeur de champ, dans l'ordre scène, sujet, détails, contraintes. Ni « magnifique », ni pile d'étiquettes de style.
6. **Compter et fermer la porte aux défauts** : « la scène contient exactement N objets » (cinq de préférence, jamais plus de douze), une seule lumière principale, pas de grand angle, pas de liquide versé ni de fumée au premier plan, puis « aucun texte, aucun logo, aucun filigrane, aucune personne ».
7. **Aucune personne sans photo ou accord écrit du client.** Avec l'accord, éviter les mains en gros plan, et contrôler mains et visage au zoom.
8. **Peu de texte dans l'image** : une accroche courte entre guillemets, « une seule fois, aucun autre texte ». Prix, dates, pourcentages et mentions légales sont posés après par le Studio. Un mot faux deux fois : on change la phrase.
9. **Retoucher une chose à la fois** : « change seulement X », avec la liste de ce qui reste, répétée à chaque tour. Après deux tours ratés, repartir d'une image neuve. Une zone qui doit rester exacte est recollée depuis l'original.
10. **Dépenser avec méthode** : chercher la composition en qualité moyenne, ne monter que pour l'image retenue, annoncer le coût avant et attendre l'accord, ne jamais relancer seule une demande au résultat incertain.
11. **Tout contrôler avant de montrer** (partie 10), à la taille réelle puis dans la mosaïque. Une image ratée est dite ratée.
12. **Jamais une image créée présentée comme une preuve** : ni chantier, ni cliente, ni « avant / après » inventés. L'IA sert aux mises en scène du vrai produit, aux décors et aux concepts. Les moments d'émotion vraie (l'équipe, les coulisses, les fêtes) reposent sur les photos du client.
13. **Viser le niveau qui ne se discute pas** : le public ne pardonne ni le défaut visible ni l'usage caché ; publier moins, au niveau d'une campagne.
14. **Laisser les marques d'origine en place**, respecter les déclarations exigées par les réseaux (TikTok compris), et tenir un registre par image : consigne, modèle, taille, qualité, entrées, résultat du contrôle.

## Sources

1. OpenAI, « Image generation » : https://developers.openai.com/api/docs/guides/image-generation
2. OpenAI, « Image prompting » (2.6 et 2.5) : https://developers.openai.com/api/docs/guides/image-prompting?model=gpt-image-2.6
3. OpenAI Cookbook, « GPT Image Generation Models Prompting Guide » : https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide
4. OpenAI, prix de l'API : https://developers.openai.com/api/docs/pricing
5. OpenAI, journal des modifications : https://developers.openai.com/api/docs/changelog
6. OpenAI, référence, retouche d'image : https://developers.openai.com/api/reference/resources/images/methods/edit
7. OpenAI, fiche gpt-image-2.6-flare : https://developers.openai.com/api/docs/models/gpt-image-2.6-flare
8. OpenAI, « Content provenance » : https://developers.openai.com/api/docs/guides/content-provenance
9. OpenAI, centre d'aide, « C2PA in images » (extrait) : https://help.openai.com/en/articles/8912793-c2pa-in-chatgpt-images
10. TechWyse, SynthID et C2PA chez OpenAI, 20 mai 2026 : https://www.techwyse.com/news/ai-search/openai-synthid-c2pa-ai-image-verification
11. Apidog, Flare, Sunburst et GPT Image 2, 9 septembre 2026 : https://apidog.com/blog/gpt-image-2-5-flare-vs-sunburst-vs-gpt-image-2/
12. fal, « GPT Image 2 Prompting Guide », 21 avril 2026 : https://fal.ai/learn/tools/prompting-gpt-image-2
13. Kittl, essai de GPT Image 2.0, 6 mai 2026 : https://www.kittl.com/blogs/kittl-review-gpt-image-2-0/
14. Rewarx, GPT-Image-2 contre de vraies photos de produits : https://www.rewarx.com/blogs/gpt-image-2-vs-real-product-photos
15. Photoroom, « How to use AI backgrounds » : https://help.photoroom.com/en/articles/6741465-how-to-use-ai-backgrounds
16. Photoroom, nouveautés de juillet 2026 (extrait) : https://www.photoroom.com/inside-photoroom/new-in-product-july-2026
17. Dreamina (CapCut), changer le fond sans redessiner le produit (extrait) : https://dreamina.capcut.com/ai-image/change-product-background-keep-product
18. IAB, « The AI Ad Gap Widens », 15 janvier 2026 : https://www.iab.com/insights/the-ai-ad-gap-widens/
19. Copenhagen Business School, étiquettes IA et engagement, 3 août 2026 : https://www.cbs.dk/en/articles/ai-labels-reduce-social-media-engagement
20. The Harris Poll UK, « The Authenticity Trade-Off » (extrait) : https://www.theharrispoll.co.uk/insights/blog/the-authenticity-trade-off-how-ai-is-reshaping-trust-in-advertisingnbsp
21. Magic Hour, enquête de juillet 2026 (extrait) : https://magichour.ai/blog/ai-generated-ads-survey
22. NBC News, McDonald's retire sa publicité de Noël, 11 décembre 2025 : https://www.nbcnews.com/world/europe/mcdonalds-ai-generated-christmas-advert-social-media-backlash-rcna248590
23. TechRadar, Coca-Cola de nouveau critiqué (extrait) : https://www.techradar.com/ai-platforms-assistants/coca-cola-faces-backlash-again-for-missing-the-spirit-of-the-holidays-with-another-ai-slop-ad
24. Loeb & Loeb, deux controverses, 29 août 2025 : https://www.loeb.com/quicktakes/post/102l2aw/
25. Glossy, le luxe et l'IA, 24 décembre 2025 : https://www.glossy.co/fashion/luxury/luxury-fashions-ai-marketing-experiments-hit-a-turning-point
26. Marketing Brew, 28 janvier 2026 : https://www.marketingbrew.com/stories/2026/01/28/brands-using-generative-ai-almond-breeze-equinox-dollar-shave-club
27. MediaPost, meilleures et pires publicités IA (extrait) : https://www.mediapost.com/publications/article/403413/bestworst-ai-ads-according-to-some-humans.html
28. CO/AI, J.Crew et les mannequins créés par IA (extrait) : https://getcoai.com/news/j-crew-faces-backlash-for-allegedly-using-ai-generated-models-in-ads
29. Superside, « The AI Image QC Checklist » : https://www.superside.com/guides/ai-image-qc-checklist
30. CapCut, liste de relecture humaine (extrait) : https://www.capcut.com/resource/ai-marketing-image-review-checklist
31. TechBullion, liste de gouvernance (extrait) : https://techbullion.com/ai-generated-marketing-visuals-a-governance-checklist-for-teams/
32. Billo, « Platform AI labeling in 2026 » : https://billo.app/blog/ai-labeling/
33. Meta, étiquetage des images IA, 6 février 2024 : https://about.fb.com/news/2024/02/labeling-ai-generated-images-on-facebook-instagram-and-threads/
34. Inro, tailles Instagram 2026 (extrait) : https://www.inro.social/blog/instagram-post-size
35. Linearity, tailles Instagram 2026 (extrait) : https://www.linearity.io/blog/instagram-size-guide/
36. Creatify, exemples de campagnes, dont Mango (extrait) : https://creatify.ai/blog/ai-marketing-campaign-examples
## Limites

- **Non trouvés** : le prix par image de 2.6 (ceux de 2.5 viennent du calculateur relevé par un tiers [11], sans le 1024×1536) ; le coût en jetons d'une image de référence, à lire dans l'usage renvoyé par l'API lors d'un essai ; un essai publié sur les accents français ; un essai indépendant et chiffré de fidélité d'étiquette (Rewarx [14] n'est ni daté ni décrit) ; une page officielle d'Instagram sur les tailles ; une étude française sur le public (les études citées sont américaines).
- **Pages refusées** : centre d'aide d'OpenAI [9], Harris Poll [20], MediaPost [27], eMarketer et PetaPixel. Les pages d'OpenAI, très longues, ont été lues par morceaux et ne portent pas de date de mise à jour. Le texte officiel de l'article 50 n'a pas été lu.
- Plusieurs ratés portent sur des films, pas sur des images fixes. Aucune image n'a été créée pour vérifier ces conseils : rien dépensé.
