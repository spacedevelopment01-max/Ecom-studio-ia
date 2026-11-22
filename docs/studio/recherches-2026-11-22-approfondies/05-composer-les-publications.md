# Composer les publications « comme sur Canva, en ultra pro » : le comment, en détail (22 novembre 2026, recherche approfondie)

Mission : documenter COMMENT faire des publications « comme si les plus gros community managers utilisaient Canva avec un
rendu ultra pro » (ses mots du 14 novembre 2026), pour que le propriétaire puisse juger. Il n'a pas encore décidé entre
« tout dans l'image par OpenAI » (la règle actuelle) et « la photo par OpenAI, les mots posés par le Studio ».

Ce rapport va plus loin que celui de ce matin (`docs/studio/recherches-2026-11-22/03-publications.md`) et que le
« Rapport 6 » du 21 novembre. Je ne répète pas leurs points ; je les cite quand j'en ai besoin.

Trous laissés par ces deux rapports, d'où je pars :
- PosterVerse, DesignAsCode, PlayGround : lus en résumé seulement, sans chiffres ;
- Polotno, Bannerbear, Placid, Templated : prix tirés d'un comparatif écrit par un concurrent ;
- Canva : « compte payant par client » affirmé, pas vérifié en détail ;
- zones libres des stories et des Reels : guides tiers qui se contredisent, page de Meta non lue ;
- tailles Pinterest et fiche Google : non lues à la source ;
- aucune règle de composition précise (tailles de lettres, nombre de mots, place du logo) ;
- aucune méthode écrite pour faire varier la mise en page d'un jour à l'autre ;
- **le code du Studio n'a pas été regardé de près** : or il contient déjà presque tout le moteur (partie 0).

Niveaux de preuve : **officiel** (documentation, page de prix, page d'aide), **étude publiée** (article de recherche),
**test indépendant**, **article d'éditeur**, **avis**. « Résumé seul » veut dire que je n'ai pas lu la page entière.

Aucun appel payant n'a été fait. Aucun autre fichier du dépôt n'a été modifié.

---

## 0. Ce que le Studio a déjà (vérifié dans le code le 22 novembre 2026)

C'est le point le plus important de ce rapport : **le Studio n'a presque rien à acheter ni à inventer.** Il possède déjà
un moteur de composition en calques, des dizaines de gabarits et des contrôles calculés. Ils ont été débranchés des
publications par la règle « images 100 % IA ».

| Ce qui existe | Où | Ce que ça fait | État |
|---|---|---|---|
| Document en calques (fond, photo, produit détouré, titre, sous-titre, texte, bouton, logo, formes, voile) | `src/lib/ad-doc/types.ts` | Une création est un fichier JSON : chaque calque a sa place, son ancrage pour changer de format, ses polices, son ombre, son dégradé ; « modifié à la main par le client : jamais écrasé » | Vivant pour les publicités et le rendu des vidéos |
| Rendu identique à l'écran et à l'export | `src/lib/ad-doc/render.ts`, `server.ts` (`@napi-rs/canvas`) | « Ce qui est vu dans l'éditeur est ce qui est exporté » ; texte qui se réduit pour tenir dans sa case (`autoFit`), lignes équilibrées (`balance`), ponctuation française insécable | Vivant |
| Contrôles calculés, gratuits | `docMetrics` dans `src/lib/ad-doc/server.ts` | Contraste réel du texte sur ce qui est dessiné dessous (4,5 pour 1 au moins), lettres de 22 pixels au moins, texte dans les zones libres de la plateforme, texte qui recouvre le produit, texte qui chevauche le bouton | Vivant pour les publicités |
| Bibliothèque de gabarits | `src/lib/ads-v2/library/` (13 fichiers, environ 128 gabarits) | 7 familles : photo pleine page, partage, cadre, collage, typographique, promotion, épuré ; chaque gabarit est refait pour chaque format (paysage, carré, portrait, story), en plusieurs schémas de couleurs de la marque et traitements de photo ; « choix automatique sans répétition » | Branché aux publicités, pas aux publications |
| Repérage du sujet et des zones chargées d'une photo | `interestPoints` et `subjectBox` dans `src/lib/ads-v2/library/kit.ts` | Calcul simple sur une grille (contours et écart de couleur) : où est le produit, où sont les zones chargées | Vivant, simple (pas de vraie carte de saillance) |
| Éditeur à calques pour le client | `src/components/studio/ad-editor/` | Déplacer, masquer, modifier un calque | Vivant pour les publicités |
| Polices embarquées, libres (OFL) | `assets/fonts/` (202 fichiers), `src/lib/media/fonts.ts` | 21 familles déclarées pour la composition ; une police absente arrête le rendu au lieu de tomber en silence sur une autre graisse | Voir le défaut ci-dessous |
| Navigateur sans écran | `playwright` (dépendance), utilisé par `syna-agent/mockup-code/` et `custom-theme/shots.ts` | Rend une vraie page HTML en image | Vivant pour le site |
| Publication 100 % IA | `src/lib/social-v2/ai-post.ts`, `visual-mode.ts` | OpenAI dessine tout, texte compris ; un relecteur recopie les mots lus et le Studio les compare lettre pour lettre ; 3 essais au plus | Seule voie active |
| Seconde étape « texte et logo » par une IA d'images | `aiTextLayout` dans `src/lib/ai/media-providers.ts`, mode `two-step` | La photo est faite sans texte, puis une IA d'images y peint les mots | Éteinte (usage `text_layout` non réglé) |
| Plan des trois publications | `src/lib/syna-agent/posts-plan.ts` | La stratège écrit titre « Sujet : promesse », 3 points au plus, appel, légende, mots-dièse, la photo à créer « sans texte dedans », et `look` (ce qui la rend différente) ; un juge séparé dit « garde » ou « reprendre » | Vivant |
| Formats connus | `src/lib/social-v2/post-aspect.ts`, `platforms.ts` | Le schéma n'accepte que 1:1, 4:5, 9:16, 16:9 ; `platforms.ts` connaît pourtant 2:3 pour Pinterest | Incohérence à corriger |

Trois défauts relevés en lisant :
1. **Les polices de la marque ne sont pas toutes là.** `font()` prend Inter quand la famille demandée n'est pas parmi
   les 21 déclarées (`CANVAS_FONTS[family] ?? CANVAS_FONTS.Inter`), alors que 202 fichiers de polices sont présents.
   Une marque en « Fraunces » ou « Syne » sortirait en Inter sans avertissement. À vérifier avant tout essai.
2. **Le plan prévoit déjà une photo « sans texte dedans »** (`posts-plan.ts`, champ `visual`), puis `ai-post.ts`
   redemande à OpenAI d'écrire le titre dans l'image. Les deux moitiés du Studio ne disent pas la même chose.
3. **La mise en page à calques n'a jamais été jugée sur une publication** : elle sert aux publicités et aux vidéos.

---


Deux autres pièces trouvées :
- `src/lib/ads-v2/poster.ts` (« Affiche de publication […] au niveau d'une agence », texte posé « sur la zone calme de la
  photo, lisibilité mesurée », « aucun appel à l'IA ») : c'est exactement la voie B ci-dessous, déjà écrite, mais sans
  importeur hors des tests (inventaire du 15 novembre). Ses zones libres du format vertical gardent 20 % en bas, moins
  que les 35 % conseillés par les guides (partie 4.6).
- Un gabarit (`templates/m.ts`) dessine des pictogrammes au trait en code (`kit.icon`). La règle du propriétaire
  « aucun pictogramme dessiné en code » vise le logo ; je signale le point sans trancher : je propose de ne pas s'en
  servir dans les publications.

---

## 1. Les deux façons de faire, côte à côte

| | **A. Tout dans l'image (règle actuelle)** | **B. La photo par OpenAI, les mots posés par le Studio** |
|---|---|---|
| Qui fait quoi | OpenAI dessine la scène, le produit, le titre, le bouton et le logo en une image | OpenAI dessine la scène avec le vrai produit et une zone calme, sans aucun mot ; le Studio pose titre, phrase, bouton, formes et le vrai fichier du logo, dans les polices de la marque |
| Orthographe et accents | Vérifiés après coup (relecture qui recopie les mots, comparaison lettre pour lettre) ; une faute = un nouvel essai payant (3 au plus) | Justes par construction : ce sont des lettres de police, pas des pixels dessinés |
| Logo | Redessiné par le modèle d'après la référence : peut dériver (Google le dit de Pomelli : « l'IA peut parfois modifier de fins détails […] comme les couleurs, les logos ») | Le vrai fichier, posé tel quel, clair sur fond sombre |
| Retouche d'un mot par le client | Nouvelle image payante | Gratuite, immédiate, dans l'éditeur à calques |
| Autres formats (story, Pinterest, fiche Google) | Une image payante par format, ou un recadrage | Recomposés gratuitement à partir de la même photo (ancrages des calques) |
| Beauté de l'ensemble | Peut être plus « organique » : le modèle intègre le texte à la lumière de la scène | Dépend de la qualité des gabarits ; risque d'un rendu « qui sent la formule » (reproche fait à Canva) |
| Ce qui existe dans le code | Actif (`ai-post.ts`) | Écrit et testé pour les publicités (`ad-doc/`, `ads-v2/library/`, `poster.ts`), à rebrancher |

### 1.1 Ce qui plaide pour B

- **DesignAsCode (février 2026), lu en entier cette fois.** Une création = une page HTML et CSS : un petit modèle fait
  le plan, GPT-5 écrit la page, les images sont des fichiers à part (créés par GPT-image-1), le texte reste du texte. Puis
  la page est **rendue avec Playwright**, GPT-image-1 en dessine une « version améliorée », et GPT-5 corrige le code en
  comparant les deux. Chiffres : remplacer le HTML par un simple fichier de données fait tomber la note du texte de
  74,06 à 55,35 ; retirer la relecture du rendu fait tomber la mise en page de 63,67 à 58,97. Étude d'utilisateurs
  petite (20 personnes, 10 demandes). Preuve : **étude publiée**. https://arxiv.org/html/2602.17690
  *Ce que SINA pourrait en faire* : se servir d'OpenAI comme **cible visuelle** (« dessine-moi ce que serait la
  meilleure version de cette publication »), puis corriger les calques pour s'en rapprocher, sans jamais garder les
  lettres dessinées.
- **PlayGround (octobre 2026), lu en entier.** Les éléments sont posés **par groupes** (titre et sous-titre ensemble,
  logo, bouton), en regardant le rendu à chaque tour ; à chaque tour, plusieurs propositions sont rendues et un
  vérificateur visuel choisit. Sans vérificateur, la note moyenne tombe de 3,958 à 3,698 (la plus grosse perte) ; un
  seul candidat au lieu de plusieurs : 3,891 ; poser élément par élément : 3,464, tout d'un coup : 3,351, par groupes :
  3,578. Des exemples de référence **mal assortis font pire que pas d'exemple**. Le juge est un modèle de la même
  famille, ce qui peut flatter les résultats. Preuve : **étude publiée**. https://arxiv.org/html/2610.18865
- **CreatiPoster (2025).** Un modèle écrit une fiche par calque (texte ou image : place, ordre, contenu, style) et un
  court texte pour le fond ; **le fond est ensuite créé en tenant compte des calques déjà posés**. Les auteurs disent
  dépasser des outils commerciaux, et notent que « Canva Magic Design s'appuie sur de vastes bibliothèques de
  gabarits ». Ils publient 100 000 créations en calques libres de droits. Preuve : étude publiée (résumé seul, aucun
  chiffre lu). https://arxiv.org/abs/2506.10890
  *Ce que SINA pourrait en faire* : d'abord choisir le gabarit et la place du titre, **puis** demander à OpenAI une scène
  qui laisse libre précisément cette place (c'est l'inverse de ce que fait le Studio aujourd'hui).
- **Desigen (CVPR 2024).** Pendant la création du fond, le modèle est contraint de garder certaines zones peu
  chargées, pour y poser ensuite le texte ; résultats « comparables à des graphistes humains » selon les auteurs, sur
  40 000 bannières. Preuve : étude publiée (résumé seul). https://arxiv.org/abs/2403.09093
- **Les produits du métier font tous B.** Canva Magic Design « met en place ta mise en page à l'aide de gabarits prêts
  à l'emploi qui s'adaptent à ton contenu » (aide officielle, lue en extrait) https://www.canva.com/help/use-magic-design/ ;
  Adobe GenStudio écrit ses gabarits pour Meta **en HTML** (« un seul champ image obligatoire », « utiliser un masque pour
  améliorer la lisibilité du texte sur les images ») https://experienceleague.adobe.com/en/docs/genstudio-for-performance-marketing/user-guide/templates/channel-best-practice/meta-template
  (officiel) ; Pomelli garde un « calque de modification » où l'on change police, couleur et taille, et la police de la
  marque « se propage dans toutes les créations » (article d'éditeur) https://www.mindstudio.ai/blog/google-pomelli-review-features-limitations

### 1.2 Ce qui plaide pour A (pour être honnête)

- **Test indépendant d'Everypixel (34 demandes, 4 relecteurs : directeur de création, directeur artistique, graphiste,
  photographe, 816 notes).** Sur GPT Image 2.0, les 10 demandes « marketing et réseaux » sont toutes acceptées (8 à
  l'unanimité, moyenne 9,72 sur 10) : « titres, prix et appels à l'action rendus dans l'image sont passés sans étape
  Canva ou Figma ». Mais : une seule image par demande, et « la mise en page demande encore une personne ». Les
  proportions écrites dans la demande ont été ignorées (tout est sorti en 16:9). Preuve : **test indépendant** (petit
  panel, un seul tirage). https://research.everypixel.com/gpt-image-2-0/
- **Kittl** (éditeur, donc intéressé) : texte juste « même en petite taille », mais des lettres inversées dans les
  dernières lignes au-delà de 100 mots, et des écritures décoratives qui se mélangent. Preuve : article d'éditeur.
  https://www.kittl.com/blogs/kittl-review-gpt-image-2-0/ (lu en résumé du moteur)
- **Le guide d'OpenAI pour les modèles 2.6** ne conseille nulle part de poser le texte après coup ; il dit au contraire
  pour une publicité : « rendre l'accroche exactement une fois, clairement et lisiblement, intégrée à la mise en page ».
  Preuve : **officiel**. https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide

**Mon avis (Claude tranche, le propriétaire décide)** : B, avec une étape « cible visuelle » d'OpenAI. Raisons : le
texte et le logo sont justes à coup sûr, la retouche d'un mot est gratuite, un seul achat d'image sert quatre formats,
et le Studio possède déjà le moteur. A reste bon pour une image d'ambiance pure ou un logo intégré à la scène ; mais
pour « chaque publication porte le logo » et « la première dit l'offre en clair », B est plus sûr. Ce choix revient sur
la règle « images 100 % IA » : il faut son oui.

---

## 2. Les moteurs de mise en page : prix, licences, polices, export

| Moteur | Comment il marche | Prix et licence (lus le 22 novembre 2026) | Polices et rendu | Preuve |
|---|---|---|---|---|
| **Moteur à calques du Studio** (`ad-doc` + `@napi-rs/canvas`) | Fichier de calques rendu par Skia, même rendu à l'écran et à l'export | Gratuit, déjà là | Police par fichier TTF ; coupure des lignes par mot, sans césure ; lignes équilibrées écrites à la main ; 21 familles déclarées | Code lu |
| **Page HTML rendue par Playwright** (déjà là) | Vrai navigateur : tout le CSS | Gratuit | Césure, `text-wrap: balance` (« six lignes ou moins pour Chromium ») et `pretty` (moins de mots seuls en fin de paragraphe), réglages des polices | officiel (MDN) https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap |
| **Satori** (Vercel) | HTML et CSS → image vectorielle, sans navigateur ; puis conversion en PNG par `sharp` | Gratuit (licence non relue) | TTF, OTF, WOFF, WOFF2 ; espacement, ombre du texte, ligatures et jeux de variantes par HarfBuzz ; `balance` seulement sans élément en ligne ; **polices variables rendues à leur seule graisse par défaut** ; dégradés, fondus, masques, détourages pris en charge | officiel (dépôt) https://github.com/vercel/satori |
| **Konva** | Scène de calques ; côté serveur depuis la version 10, il faut lui donner soi-même un moteur (`canvas` ou `skia-canvas`) | MIT (vu sur une fiche de la version 9) | Celui du moteur choisi | officiel en résumé https://konvajs.org/docs/nodejs/nodejs-setup |
| **Polotno** | Éditeur façon Canva à intégrer, rendu serveur d'un fichier JSON | Sur devis : « de quelques centaines à 20-30 000 et plus » ; édition et rendu chez soi « illimités, usage raisonnable » ; marque blanche complète ; code source en option | — | officiel https://polotno.com/pricing |
| **IMG.LY CE.SDK** | Éditeur et moteur de rendu (aussi pour Node) | Sur devis, « selon les plateformes, composants et fonctions d'IA », pas par poste ; sans licence : exports filigranés | — | officiel https://img.ly/pricing.md |
| **Bannerbear** | Gabarits en ligne remplis par l'API | 49 $/mois pour 1 000 crédits, 149 $ et 299 $ pour plus ; requêtes refusées quand les crédits sont épuisés ; repérage du visage ou du sujet : 1 crédit d'IA par calque | — | officiel https://www.bannerbear.com/pricing/ |
| **Templated** | Idem | 39 $/mois pour 1 000 rendus (29 $ à l'année) ; 99 $ pour 5 000 avec éditeur intégrable en marque blanche ; 229 $ pour 25 000 ; « polices personnelles + Google Fonts » | — | officiel https://templated.io/pricing/ |
| **Placid** | Idem | 500, 2 500, 25 000 ou 100 000 crédits par mois, « 1 image = 1 crédit » ; prix non lisibles sur la page | — | officiel (incomplet) https://placid.app/pricing |
| **Creatomate** | Idem, surtout la vidéo | 45 $/mois pour 2 000 crédits, 108 $, 274 $ ; « une image = un crédit » quelle que soit la taille | — | officiel https://creatomate.com/pricing |
| **Canva, remplissage automatique** | Un « modèle de marque » à champs ; l'API envoie textes et images | Guide : Canva Pro au moins, double authentification ; « des limites d'usage seront introduites plus tard » ; images à téléverser d'abord. **Nouveau (billet du 6 novembre 2026)** : les « comptes de service » permettent d'appeler Canva **sans que le client ait un compte**, pour une équipe Business, Teams ou Nonprofit, un seul par équipe, avec un stock de crédits acheté d'avance ; le remplissage coûte « 10 crédits par page », le redimensionnement 1 ; **le prix d'un crédit n'est pas publié**. Deux messages du forum de Canva du 23 septembre 2026 se contredisent (réservé aux entreprises, ou ouvert dès Pro) | Les polices et gabarits Canva | officiel https://www.canva.dev/docs/connect/autofill-guide/ ; https://www.canva.dev/blog/developers/canva-service-accounts/ ; https://www.canva.dev/docs/apps/rest-apis/credit-rates/ |

**Ce que j'en tire** :
- Aucun moteur extérieur n'apporte ce que le Studio n'a pas déjà. Les services en ligne coûtent 0,01 à 0,05 $ l'image
  et ajouteraient un fournisseur payant ; Polotno et IMG.LY sont sur devis.
- **Canva n'exige plus un compte Pro par client** depuis les comptes de service, mais il reste un fournisseur payant
  nouveau (accord du propriétaire obligatoire), au prix inconnu, avec un accès aux gabarits encore flou. Ce n'est pas
  un « branchement » qui fait attendre une validation : je n'ai lu aucune étape d'examen pour les comptes de service.
  Je ne le recommande pas : le Studio perdrait la main sur la variété et sur ses contrôles.
- **Le meilleur rendu des polices est celui du navigateur** (césure française, lignes équilibrées, mots seuls évités).
  Proposition : garder le fichier de calques comme vérité (il sert l'éditeur, les contrôles et les vidéos), et rendre le
  titre et les paragraphes par Playwright quand une règle de typographie fine est en jeu ; ou ajouter au moteur Skia la
  césure et le traitement des mots seuls. À mesurer sur dix publications avant de choisir (essai gratuit).

### 2.1 Les bibliothèques de gabarits libres de droits

- **Le Studio a déjà environ 128 gabarits en 7 familles** (`ads-v2/library/`). C'est sa propre bibliothèque, sans
  question de droits.
- **Crello** (CyberAgent) : 23 300 créations décrites calque par calque (place, taille, police, couleur), en
  1080 × 1080, 1920 × 1080, 1008 × 1296… ; licence « CDLA-Permissive-2.0 ». Preuve : officiel (fiche du jeu de données).
  https://huggingface.co/datasets/cyberagent/crello
  *Ce que SINA pourrait en faire* : y puiser des **structures** de grille (où sont les blocs), jamais les images ni les
  textes, dont les droits d'origine ne sont pas dits sur la fiche.
- **CreatiPoster** annonce 100 000 créations en calques « libres de droits » (non vérifié : licence non lue).
- **Les gabarits Canva** ne s'utilisent qu'à l'intérieur de Canva (conditions non lues : bloquées au robot).

---

## 3. Les règles de composition, mises en chiffres

### 3.1 La hiérarchie

- **Trois niveaux de texte au plus, plus le logo** : le titre (l'offre ou la promesse), une phrase qui le complète, un
  appel. C'est déjà le plan de SINA (`posts-plan.ts` : titre, trois points au plus, appel).
- **Pinterest (officiel)** : « empiler le texte, le message clé en haut et les détails en bas » ; le logo « bien
  visible sur chaque création » mais qu'il « ne prenne pas le dessus » ; un format vertical 2:3.
  https://business.pinterest.com/creative-best-practices/
- **Peu de texte dans l'image** : Meta disait que les images avec moins de 20 % de texte « marchent mieux » ; la règle
  n'est plus appliquée, et je n'ai lu que des reprises de sa page. Preuve : article d'éditeur.
  https://www.searchenginejournal.com/facebook-removes-the-20-text-limit-on-ad-images/ (résumé du moteur)
  Le Studio mesure déjà cette part (`textShare` dans `docMetrics`).
- **Nombre de mots** : je n'ai trouvé aucune étude sérieuse. Les agences disent 6 à 8 mots pour le titre (avis).
  Proposition : titre de 7 mots au plus, phrase de 12 au plus, 25 mots au plus sur l'image en tout ; le reste va dans
  la légende.

### 3.2 Les tailles minimales lisibles sur téléphone (mon calcul, à partir d'une règle officielle)

- Apple : texte courant à 17 points par défaut, **11 points au minimum** sur iPhone. Preuve : officiel (lu dans un
  extrait du guide). https://developer.apple.com/design/human-interface-guidelines/typography
- Une publication de 1080 pixels de large s'affiche sur environ 390 points de large : 1 pixel ≈ 0,36 point. Donc :
  - 11 points (le minimum) = **31 pixels** ; 17 points (texte courant) = **47 pixels** ;
  - le contrôle actuel du Studio (`docMetrics` : 22 pixels au moins) laisse passer du texte de 8 points, **trop petit**.
- Dans la grille du profil, une vignette fait environ 130 points de large (un tiers d'écran) : 1 pixel ≈ 0,12 point.
  Pour qu'un titre se lise dans la grille, il lui faut **au moins 92 pixels**.
- Proposition : titre de 90 pixels au moins (en 1080 de large), phrase de 48 au moins, petite mention et bouton de 34
  au moins ; rien sous 32. Le contrôle « lisible à 360 pixels » de `formatPlan` devient un calcul, pas une consigne.

### 3.3 La zone calme : où poser le texte

- **Il n'y a pas une seule bonne zone** (Salesforce, rapport de ce matin). Donc on ne cherche pas « la » zone, on
  vérifie que la zone prévue par le gabarit est calme.
- **Trois mesures gratuites, sur la machine du Studio** :
  1. ce qui existe : `subjectBox` (où est le produit) et `interestPoints` (zones chargées) dans `kit.ts` ;
  2. la variance des couleurs et la densité de contours **sous chaque case** de la grille du gabarit (calcul `sharp`) ;
  3. une **carte de profondeur** : Transformers.js sait faire « depth-estimation » avec Depth Anything, dans le
     navigateur ou sur le serveur (officiel : https://huggingface.co/docs/transformers.js/index) ; **seule la petite
     version de Depth Anything V2 est sous licence Apache-2.0**, les versions Base, Large et Giant sont interdites à
     l'usage commercial (CC-BY-NC-4.0) (dépôt officiel, lu en résumé :
     https://github.com/DepthAnything/Depth-Anything-V2). Le fond lointain et flou est le meilleur endroit pour écrire.
- **Le plus efficace reste de la prévoir** : choisir le gabarit d'abord, puis dire à OpenAI où laisser le calme
  (« le tiers haut est un mur clair uni, sans objet ») ; c'est l'idée de CreatiPoster et de Desigen. La consigne
  actuelle (`media-providers.ts` : « garder un espace dégagé et calme […] d'un côté ») est trop vague.

### 3.4 Le contraste sur une photo

- **Règle chiffrée** : 4,5 pour 1 pour un texte courant, 3 pour 1 pour un grand titre (règles d'accessibilité du web) ;
  le Studio l'applique déjà, en mesurant **ce qui est vraiment dessiné sous le texte** (`docMetrics`).
- **NN/g** : la plupart des textes posés sur photo de leurs exemples ne respectent pas le contraste ; une solution
  qui marche sur une image peut échouer sur une autre, il faut tester sur chaque image. Preuve : étude du métier (lue en
  résumé). https://www.nngroup.com/articles/text-over-images/
- **Étude publiée (Ergonomics, 2020)** : parmi les couches posées entre le fond et le texte, **le flou et le voile
  semi-transparent** donnent la meilleure lisibilité, et une combinaison des deux est la meilleure. Contexte : lecture
  d'un coup d'œil, réalité mixte. Preuve : étude publiée (résumé seul).
  https://pubmed.ncbi.nlm.nih.gov/32425139/
- **L'ordre que je propose**, du plus discret au plus visible :
  1. le texte sur la zone calme, sans rien ;
  2. un dégradé qui part du bord où est le texte (attention : un dégradé échoue quand le texte traverse toute la largeur) ;
  3. un léger flou de la photo sous le texte ;
  4. un encart plein aux couleurs de la marque (une carte, un bandeau) ;
  5. sinon, changer de gabarit. Jamais de contour ni d'ombre lourde autour des lettres.

### 3.5 Le logo et les couleurs

- **Le vrai fichier du logo, toujours** : version claire sur fond sombre (règle du propriétaire), dans un coin ou centré
  en bas, dans la marge de sécurité, jamais sur le produit. Taille proposée : 10 à 14 % de la largeur. Pinterest :
  visible, sans prendre le dessus (officiel, ci-dessus).
- **Les couleurs** : les rôles de la planche (sombre, principale, secondaire, accent, clair) existent déjà dans le
  Studio (`schemeColors` dans `kit.ts`). Proposition : une couleur domine, l'accent ne sert qu'au bouton ou à un mot ;
  l'accent jamais sur plus d'un élément par image. C'est une règle de métier courante, que je n'ai pas sourcée ici.

### 3.6 Les zones libres du format vertical

- Les guides concordent sur **14 % en haut, 35 % en bas, 6 % sur les côtés** pour les stories et les Reels ; d'autres
  disent 20 % en bas pour les stories. **La page officielle de Meta n'a pas pu être lue** (titre seul : « À propos du
  texte posé et de la zone de sécurité des publicités dans les stories et les Reels »).
  https://www.facebook.com/business/help/980593475366490 ; guide tiers : https://adkit.so/tools/safe-zones/meta
- Le Studio garde 20 % en bas (`formatPlan`, `poster.ts`). Proposition : 35 % partout, la règle la plus prudente.

---

## 4. Faire varier la mise en page d'un jour à l'autre sans perdre l'identité

### 4.1 Ce que disent les études et les plateformes

- **Ne pas laisser le modèle donner des pixels** : il choisit une structure, le code calcule (PosterAgent, rapport de
  ce matin). **Choisir des exemples assortis à la situation** et **classer plusieurs propositions** : LayoutPrompter
  (NeurIPS 2023) fait mieux que des méthodes entraînées, sans entraînement, avec ces deux seuls ingrédients (choix
  dynamique des exemples, classement des sorties). Preuve : étude publiée (résumé). https://arxiv.org/abs/2311.06495
  PlayGround confirme : un exemple mal assorti fait pire que rien (partie 1.1).
- **La constance visuelle d'un profil** : la seule étude trouvée qui la teste trouve un effet positif **mais non
  significatif** ; la variété des sujets aiderait (rapport de l'ARF) ; une image de complexité moyenne obtient le plus de
  « j'aime » (147 963 images). Preuve : faible (lu en résumé du moteur, sans les articles).
- **Instagram récompense l'originalité** et ne recommande plus les comptes qui republient (rapport de ce matin).

### 4.2 La méthode proposée : « ce qui ne bouge jamais » et « ce qui tourne »

**Ce qui ne bouge jamais (l'identité)** : les deux polices de la marque, sa palette et ses rôles, le vrai logo et sa
règle de place, le « signe » de la marque (un trait, une forme, une matière prise sur le produit ou le métier, comme pour
le site), le ton des textes.

**Ce qui tourne (cinq réglages, tirés sous contraintes)** :

| Réglage | Valeurs | Contrainte |
|---|---|---|
| Famille de gabarit | photo pleine page, partage, cadre, collage, typographique, offre, épuré (les 7 familles existantes) | Jamais deux fois de suite la même ; au plus 3 fois dans les 9 dernières (la grille du profil) |
| Place du texte | haut, bas, côté, centre, encart | Jamais deux fois de suite la même |
| Schéma de couleurs | fond sombre, fond clair, couleur principale, photo seule | Les trois publications d'une série : trois schémas différents |
| Traitement de la photo | naturel, chaud, bichromie de la marque, noir et blanc | Le produit reste fidèle : jamais de bichromie sur le produit |
| Cadrage de la scène | produit en grand, produit dans son lieu, matière en gros plan, geste (sans personne) | Décidé dans le plan, avant l'achat de l'image |

**Le tirage contrôlé** : comme pour les sites (`variete-sites.ts`), le Studio tire parmi les combinaisons permises, en
écartant celles des 9 dernières publications du client ; SINA choisit ensuite, parmi 3 combinaisons proposées, celle qui
sert le mieux le message. La recette est enregistrée (`doc.meta.recipe` existe déjà), ce qui permet de vérifier la règle
et de ne jamais la redemander. **Aucune porte de sortie** : une combinaison qui ne passe pas les contrôles est
remplacée par le Studio lui-même, jamais enregistrée.

**Un exemple de recette** (ce que SINA décide, le Studio calcule le reste) :

```
famille : partage | texte : côté gauche | schéma : fond clair | photo : naturel | cadrage : produit dans son lieu
titre : « Le pain du dimanche, prêt dès 7 h » | phrase : « Levain, farine du moulin de… » | appel : « Réserver le mien »
```

(Les mots de l'exemple sont inventés pour montrer la forme ; ils ne sont pas tirés d'un projet d'essai.)

---

## 5. Les carrousels

### 5.1 Les chiffres récents

| Source | Échantillon | Ce qui est mesuré | Résultat | Preuve |
|---|---|---|---|---|
| Buffer, « État de l'interaction 2026 » | plus de 52 millions de publications, 10 réseaux | interaction médiane rapportée aux personnes touchées | Instagram : carrousel **6,90 %**, image seule 4,44 %, Reel 3,31 % ; LinkedIn : carrousel 21,77 % ; Facebook : image 5,20 % ; TikTok : vidéo 3,39 %, images 1,92 % | article d'éditeur sur ses données https://buffer.com/resources/state-of-social-media-engagement-2026/ |
| Metricool, étude Instagram 2026 (16 juin 2026) | 24 364 803 publications, 375 000 comptes | enregistrements, publications | Le carrousel est enregistré **9 fois plus** que l'image seule ; les marques publient 24 % de carrousels en plus qu'en 2025 ; le nombre d'images par carrousel n'est pas sur la page | article d'éditeur https://metricool.com/instagram-research-study/ |
| Metricool (communiqué) | idem | portée | Les Reels touchent 29 % de monde en plus que les carrousels (lu en résumé du moteur) | https://metricool.com/press-release-instagram-study-2026/ |
| Socialinsider | 67,5 millions | interaction | carrousel 0,50 % au 2e trimestre 2026 (déjà dans le rapport de ce matin) | — |

Les chiffres ne se comparent pas entre eux (pas la même façon de compter). Ce qui revient partout : **le carrousel est
le format qui fait le plus réagir et enregistrer sur Instagram ; le Reel est celui qui touche le plus de monde.**

### 5.2 Ce qui a changé en 2026

- **Une légende par image** du carrousel (option, en cours de déploiement le 24 juin 2026, annoncée par le compte
  Instagram des créateurs). Preuve : article d'éditeur citant Instagram. https://metricool.com/instagram-carousel-multiple-captions/
  *Ce que SINA pourrait en faire* : une phrase courte par image, qui la rend compréhensible seule.
- **Un carrousel non regardé peut revenir, ouvert sur la 2e image** : attribué à Adam Mosseri, mais seulement par des
  reprises. Preuve : faible. https://uppbeat.io/blog/creator-news/whats-working-on-instagram-right-now-carousels-and-sends-says-adam-mosseri
- **L'interface officielle de Meta pour publier** accepte des carrousels de 20 éléments, des images de 4:5 à 1,91:1,
  en JPEG, 8 Mo au plus. Le 3:4 n'y est pas accepté (il l'est dans l'application, selon des guides tiers). Preuve :
  **officiel**. https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media

### 5.3 La structure proposée

1. **Image 1 : l'offre ou la promesse en clair**, avec le produit et le logo (la règle du propriétaire : la première
   dit l'offre).
2. **Image 2 : se comprend seule** (elle peut être la porte d'entrée) : elle redit en une ligne de quoi il s'agit, avec
   le logo.
3. **Images 3 à 6 : une idée par image** (un conseil, une étape, un détail du produit), même famille de gabarit pour
   tout le carrousel, mais la place du texte peut alterner.
4. **Dernière image : l'appel qui porte le désir**, où et comment acheter ou réserver, le logo en grand.
- Toutes les images à la même proportion (exigence d'Instagram) : 4:5, 1080 × 1350.
- Pas d'image « panoramique » coupée entre deux images : chaque image doit se comprendre seule.
- 5 à 7 images par défaut. Le chiffre « 7 à 10 font mieux » vient d'un éditeur sans méthode publiée (rapport de ce
  matin) : à ne pas présenter comme une règle.
- Coût : **une seule scène achetée à OpenAI peut servir plusieurs images** (recadrages, gros plans) quand le gabarit est
  posé par le Studio ; avec la façon A, chaque image est un achat.

### 5.4 Les tailles à retenir en 2026

| Réseau et format | Taille | Preuve |
|---|---|---|
| Instagram, fil et carrousel | 1080 × 1350 (4:5) ; 1080 × 1440 (3:4) seulement si le client publie depuis l'application | officiel pour la plage 4:5 à 1,91:1 (interface de publication, lien ci-dessus) ; tiers pour le 3:4 |
| Instagram et Facebook, story et Reel | 1080 × 1920 (9:16), zones libres 14 % / 35 % / 6 % | tiers (page de Meta illisible) |
| Facebook, fil | 1080 × 1350 (4:5) ou 1080 × 1080 | officiel Adobe pour Meta (lien partie 1.1) |
| TikTok, mode photo | 1080 × 1920, jusqu'à 35 images | tiers concordants https://buffer.com/resources/tiktok-carousel/ |
| Pinterest | 1000 × 1500 (2:3) ; « au-delà de 2:3, l'épingle peut être coupée » ; carrousel 2 à 5 images en 1:1 ou 2:3 | **officiel** https://help.pinterest.com/en/business/article/pinterest-product-specs |
| Fiche Google | photos JPG ou PNG, 10 Ko à 5 Mo, 720 × 720 conseillé ; pour les publications, 1200 × 900 (4:3) n'est qu'un conseil de tiers | officiel en extrait https://support.google.com/business/answer/6103862 |

À corriger dans le code : `post-aspect.ts` n'accepte pas 2:3 alors que `platforms.ts` le donne pour Pinterest ; 4:3
manque pour la fiche Google.

---

## 6. Juger une publication avant de la montrer

### 6.1 Ce que les études ajoutent

- **Les graphistes eux-mêmes ne sont pas d'accord** : 20 graphistes professionnels, 12 000 comparaisons d'écrans, accord
  entre eux très faible (0,25 sur une échelle où 1 = accord parfait). **Un juge réglé sur une seule personne fait mieux
  qu'un juge nourri des avis de tous** (60,16 % contre 57,45 % de choix justes, avec 20 fois moins de données) ; chaque
  graphiste avait noté 600 paires (environ 90 minutes). Preuve : **étude publiée** (DesignPref, novembre 2025).
  https://arxiv.org/html/2511.20513v1
  *Ce que SINA pourrait en faire* : régler le juge sur **les verdicts du propriétaire** (ses « Parfait » et ses refus),
  pas sur un goût moyen ; 300 à 600 paires notées par lui suffiraient à mesurer si le juge tranche comme lui.
- **DesignSense (Adobe)** : les grands modèles trouvent le meilleur de deux mises en page dans 67 à 72 % des cas,
  mais ne savent pas dire « les deux sont bonnes » ou « les deux sont ratées » (rapport de ce matin). Donc : la
  comparaison sert à **choisir** entre deux bonnes versions ; elle ne sert jamais de barrière.
- **TASTE (2026)** : un modèle d'IA juge la beauté presque au hasard face à dix graphistes (0,55, le hasard = 0,50) ; un
  petit juge entraîné sur leurs avis atteint 0,611, près du plafond de 0,741 d'un graphiste seul (rapport du 21 novembre).
- **PosterReward (2026)** : les juges existants regardent la beauté générale et « négligent la typographie et la mise en
  page » ; d'où l'intérêt de juges séparés. Preuve : étude publiée (résumé). https://arxiv.org/abs/2603.29855
- **PlayGround** : le vérificateur visuel qui choisit entre plusieurs rendus est la pièce qui rapporte le plus (partie 1.1).

### 6.2 La chaîne proposée (dans cet ordre, chaque étape arrête la suivante)

1. **Le calcul, gratuit** (étend `docMetrics`) : contraste sous chaque texte, taille minimale (32 pixels, titre 90),
   texte dans les zones libres (35 % en bas en vertical), texte hors du produit, part de texte de 20 % au plus, logo
   présent et dans sa marge, aucun bouton coupé (règle du propriétaire), nombre de mots, aucune ligne avec un seul mot.
2. **Le produit fidèle** : la scène comparée à la photo du client (forme, étiquette, couleur), relue par le modèle le
   plus fort, une image à la fois.
3. **Le test de l'inconnu** : un relecteur reçoit **l'image seule**, réduite à la taille d'un téléphone, sans la fiche
   de marque, et répond : ce qui est vendu, par qui, l'offre, ce qu'on peut faire. Le Studio compare à l'intention.
4. **Trois juges ciblés**, chacun avec un exemple raté et un réussi tirés des verdicts du propriétaire : la
   typographie et la hiérarchie ; l'accord entre la photo et le texte ; la variété avec les 9 dernières publications.
5. **Le choix entre deux versions** (deux gabarits ou deux places de texte), dans les deux ordres ; si les deux ordres
   ne donnent pas le même gagnant, les deux sont montrées au client.
6. **Les fautes de texte** : avec la façon B, elles ne peuvent venir que de la rédaction (le texte de la police est
   celui écrit) ; avec la façon A, garder la comparaison lettre pour lettre actuelle (`textsMatch`).

---

## 7. Ce que font les outils du marché, et ce qu'on leur reproche

| Outil | Ce qu'il fait | Reproches lus | Preuve |
|---|---|---|---|
| **Canva Magic Design** | Gabarits prêts à l'emploi qui s'adaptent au contenu ; on part d'une phrase ou d'une image | Rendu « qui sent la formule », couleurs de marque mal appliquées dans les mises en page complexes (rapport de ce matin) ; selon un comparatif, le texte écrit dans une image créée par l'IA de Canva n'est pas modifiable ensuite | aide officielle (extrait) ; avis https://www.krea.ai/blog/canva-alternatives-for-ai-first-design-in-2026 |
| **Google Pomelli** | Lit le site, en tire un « ADN » (couleurs, polices, ton), propose des campagnes ; texte modifiable dans un calque ; ne publie pas | « La qualité n'est pas au niveau d'un graphiste humain qualifié » ; texte des animations « déformé, déplacé ou illisible » ; peu de gabarits ; pays limités ; Google : « l'IA peut modifier de fins détails de vos produits » | officiel https://support.google.com/labs/answer/16715058 ; article d'éditeur (MindStudio, lien partie 1.1) |
| **Adobe Express / GenStudio** | Gabarits, kits de marque ; GenStudio écrit les gabarits en HTML | Rien de solide lu sur la qualité ; Firefly est écarté par le propriétaire | officiel (GenStudio, lien partie 1.1) |
| **Predis** | Publications et légendes à partir d'une phrase, identité de marque enregistrée | Texte en double, mots manquants, peu de modèles, crédits perdus (rapport de ce matin) | avis |
| **Kittl** | Outil tourné vers la typographie, intègre GPT Image 2 | Texte dense : lettres inversées au-delà de 100 mots | article d'éditeur |
| **Microsoft Designer** | Création gratuite par l'IA | Selon un comparatif, licence pour usage **personnel et non commercial** seulement (non vérifié à la source) | avis |
| **Simplified** | — | Rien de solide trouvé | — |

Ce qui revient : **tous partent de gabarits ou de calques** pour le texte ; aucun ne relit la création finale à la
place de l'utilisateur ; le reproche commun est le rendu « formule », que la partie 4 (rotation contrôlée) et les juges
réglés sur le propriétaire visent directement.

---

## 8. Points qui contredisent une règle du propriétaire (signalés, non recommandés)

- La façon B revient sur la règle « images finales 100 % IA » (`visual-mode.ts`). Elle reste conforme à « images créées
  par OpenAI » : la photo est toujours d'OpenAI ; seuls les mots et les formes sont posés par le Studio.
- Canva (comptes de service) serait un fournisseur payant nouveau : accord obligatoire ; je ne le recommande pas.
- Les pictogrammes dessinés en code d'un gabarit (`templates/m.ts`) : à écarter des publications par prudence.
- Les images du jeu Crello : ne jamais les reprendre, seulement les structures.
- La façon A a de bons résultats dans un test indépendant (Everypixel) : je ne prétends pas qu'OpenAI « ne sait pas
  écrire » ; je dis que B est plus sûr et moins cher à retoucher.

---

## 9. Pas vérifié

- La page officielle de Meta sur les zones libres des stories et des Reels (titre seul lisible).
- Les conditions des développeurs de Canva (page refusée au robot), le prix d'un crédit Canva, et qui a droit au
  remplissage automatique (deux messages officiels contradictoires du 23 septembre 2026).
- Les prix de Placid (page illisible), de Polotno et d'IMG.LY (sur devis).
- Les licences de Satori, de Fabric.js et de la version 10 de Konva ; je n'ai pas relu Fabric.js du tout.
- La licence du corpus de CreatiPoster et le droit d'usage des images du jeu Crello.
- Le chiffre exact de la taille minimale sur iPhone (lu dans un extrait, pas sur la page entière) ; mes conversions
  pixels → points sont un calcul.
- L'étude d'Ergonomics 2020 et celle sur la constance des profils : résumés seulement.
- Les tests indépendants de Canva Magic Design, Adobe Express, Microsoft Designer, Simplified : aucun test sérieux trouvé.
- La qualité réelle de la mise en page à calques du Studio sur une publication : **jamais essayée** ; c'est le premier
  essai à faire, gratuit (des photos déjà payées et validées peuvent servir).
- Que les 21 familles de polices déclarées couvrent les typographies que la marque choisit vraiment.

---

## Ce qu'il faut construire dans SINA, dans l'ordre

1. **Un essai gratuit d'abord** : rebrancher `poster.ts` sur trois publications déjà prévues, avec des photos déjà
   payées, et les montrer au propriétaire à côté des versions 100 % IA. *Ce que le client verra* : rien encore ; le
   propriétaire voit les deux façons côte à côte et décide.
2. **Ses vraies polices partout** : déclarer toutes les polices de marque possibles pour la composition, et refuser le
   rendu plutôt que tomber en Inter. *Le client verra* : ses titres dans la police de sa planche de marque, toujours.
3. **La photo sans aucun mot, avec la zone calme prévue** : le gabarit est choisi avant l'achat de l'image, et la
   consigne à OpenAI dit où laisser le calme. *Le client verra* : des scènes où le titre se pose naturellement.
4. **Les calques posés par le Studio** : titre, phrase, bouton, formes, vrai logo (clair sur fond sombre).
   *Le client verra* : des textes sans faute, un logo exact, et la possibilité de changer un mot d'un clic, sans payer.
5. **Les contrôles chiffrés renforcés** : texte de 32 pixels au moins (titre 90), 35 % libres en bas en vertical, 20 %
   de texte au plus, aucun bouton coupé, aucun mot seul sur une ligne. *Le client verra* : des publications lisibles
   sur son téléphone, jamais un texte rogné par l'application.
6. **La rotation contrôlée** des familles, places de texte, schémas, traitements et cadrages, sur les 9 dernières
   publications. *Le client verra* : un profil varié qui reste reconnaissable.
7. **Le juge réglé sur le propriétaire** : ses validations et refus deviennent les exemples des juges ciblés, et l'on
   mesure si le juge tranche comme lui. *Le client verra* : des publications déjà triées au goût du Studio.
8. **Le test de l'inconnu et le choix entre deux versions** avant tout affichage. *Le client verra* : des publications
   que l'on comprend sans connaître sa marque, la première disant l'offre en clair.
9. **Une création, quatre formats** : 4:5, 9:16, 2:3 et 4:3 recomposés à partir de la même photo ; ajouter 2:3 et 4:3
   au code. *Le client verra* : sa publication prête pour Instagram, sa story, Pinterest et sa fiche Google, sans
   surcoût.
10. **Les carrousels** : 5 à 7 images, la 1re dit l'offre, la 2e se comprend seule, la dernière porte l'appel, une
    phrase par image. *Le client verra* : des carrousels faits pour être enregistrés.
11. **La cible visuelle d'OpenAI** (méthode DesignAsCode) en option pour les publications importantes : OpenAI dessine
    « la meilleure version », SINA rapproche ses calques de cette image. *Le client verra* : des compositions plus
    audacieuses, toujours justes.
12. **Le meilleur rendu des polices** : mesurer sur dix publications le moteur actuel contre une page rendue par
    Playwright (césure française, lignes équilibrées), et garder le meilleur. *Le client verra* : des titres coupés
    comme dans un magazine.
