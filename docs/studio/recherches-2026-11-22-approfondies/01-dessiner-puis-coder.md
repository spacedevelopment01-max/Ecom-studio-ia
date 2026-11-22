# Dessiner l'accueil en image, puis le monter avec les pièces du thème : comment faire mieux

Recherche approfondie du 22 novembre 2026. Elle complète, sans les répéter, la partie 2 de
`docs/studio/recherches-2026-11-22/01-themes-sur-mesure.md` (DCGen : 85 % des erreurs sont des oublis ; ScreenCoder ;
la revue de 2026 ; VisRefiner ; Design2Code) et le rapport 5 du 21 novembre (Design2Code, 49 % ; boucle de relecture,
environ 11 % de mieux). La méthode du propriétaire, « dessiner l'accueil en image puis le coder avec les pièces du
thème », est gardée : je ne propose que ce qui l'améliore.

Aucun fichier du dépôt n'a été modifié en dehors de celui-ci. Aucun appel payant à une IA ni à un fournisseur.

**Niveaux de preuve**
- **officiel** : document de l'éditeur, sur ce qu'il fait lui-même ;
- **étude publiée** : article relu par des pairs (conférence ou revue) ;
- **article de recherche** : déposé en ligne, pas encore relu ;
- **test indépendant** : un testeur a essayé lui-même ;
- **article d'éditeur** et **avis** : en dernier.

Pour chaque article, j'ai lu le texte complet (version en ligne de l'article), sauf mention contraire. Les chiffres
viennent des tableaux ; quand le texte et le tableau se contredisent, je le dis.

---

## 0. Ce que fait le code du Studio aujourd'hui (vérifié dans le dépôt)

Ce point change la lecture de tout le rapport.

- **La méthode « dessiner puis coder » (`src/lib/syna-agent/dessin/`, outil `site.dessiner`)** fait : un plan de toute
  la page (8 à 10 sections, textes exacts), un juge des faits, cinq dessins par OpenAI (ordinateur en trois morceaux,
  téléphone en deux, chacun recevant les précédents comme modèle), les photos, puis **un modèle de code (Sol 6.2) qui
  écrit en code libre un thème Shopify** (`CODE_SYSTEM` dans `methode.ts` : « une section par section du plan
  (sections/<marque>-<nom-court>.liquid) »), puis Theme Check et des captures à 390, 820 et 1 440 px. **Il n'utilise pas
  les pièces du thème unique.** Le résultat est rangé à côté du site, pas posé dessus.
- **La création du site (`site.create`, `custom-theme/site-job.ts`)** monte le site avec les pièces du thème unique
  (partitions, juge de l'ordre, tenue, variété, contrôle par l'image), mais **sans dessin préalable**.
- **Une ancienne chaîne, `mockup-code/`** (#492, encore branchée : `syna.mockup.code` dans `worker/handlers.ts`), lisait
  une maquette dessinée, faisait correspondre chaque section à une pièce de la bibliothèque ou à une section sur mesure,
  puis faisait une boucle captures, comparaison et corrections, avec une ressemblance locale gratuite
  (`localSimilarity` : gris sur une grille 24 × 48 et histogramme des couleurs).
- **Le Studio a déjà une empreinte visuelle soignée** (`custom-theme/ressemblance.ts` : bandes, couleurs en Lab, grain,
  alignement souple des sections), utilisée pour comparer un accueil aux sites récents, pas au dessin.

Donc la méthode voulue par le propriétaire, « dessin, puis montage avec les pièces du thème », n'existe pas encore en
une seule chaîne : les deux moitiés existent séparément. La recherche ci-dessous dit fortement comment les relier.

---

## 1. Les méthodes publiées pour passer d'une image de page à un site fidèle

### 1.1 Ce qu'elles ont toutes en commun

Toutes les méthodes qui battent « l'image entière d'un coup » font la même chose en trois temps : **découper** l'image,
**traiter chaque morceau** avec une consigne étroite, **réassembler** selon une structure explicite. La revue de 150
systèmes (novembre 2026) le résume dans sa partie 12.1 : « une structure intermédiaire explicite bat le passage direct
des pixels au code » ; « garder le calcul certain là où la justesse se vérifie, mêler modèle et algorithme » ; « la
fidélité visuelle et un code facile à entretenir divergent » ; « la fidélité visuelle n'implique pas que la page
marche ». Elle range parmi les problèmes ouverts « la généralisation à un système de style » et « les composants
inventés ou oubliés ».
- Source : https://arxiv.org/html/2611.18575 (lu en partie : les parties 1 à 6, 8.2, 9.2, 11, 12 ; le texte fait
  342 000 caractères).
- Preuve : article de recherche (revue).

### 1.2 LayoutCoder (ISSTA 2025)
- **Étapes.** 1) Un détecteur sans IA (UIED) repère tous les éléments ; 2) il relie chaque élément à ses voisins et
  forme des groupes d'éléments alignés à gauche et régulièrement espacés (cartes, listes) ; 3) il projette les blocs à
  l'horizontale et à la verticale, et coupe d'abord **le plus grand vide** (loi de proximité de la Gestalt), puis
  recommence dans chaque morceau, ce qui donne un arbre de rangées et de colonnes ; 4) chaque morceau final est codé à
  part par le modèle, avec une consigne stricte (pas de largeur fixe, marges à zéro) ; 5) **l'assemblage est fait par
  un algorithme, pas par le modèle**.
- **Chiffres.** Sur 350 sites réels (Snap2Code) : BLEU 26,07 contre 1,95 pour Claude avec relecture, ressemblance CLIP
  80,35 contre 71,96. Sur des sites créés après la date d'entraînement des modèles : 76,14 contre 71,51. Notes humaines
  (1 à 5, 1 920 notes) : disposition 4,07 contre 1,64, allure 4,13 contre 1,64. Retirer le tri des vides fait perdre
  6,3 points de CLIP. Deux fois moins cher et plus rapide que DCGen (2,90 $ contre 6,31 $ sur Design2Code), et 100 % de
  pages produites contre 60 à 91 %.
- **Limites dites.** Un seul passage par essai, à température zéro ; dépend des boîtes du détecteur ; le texte annonce
  des gains en pourcentage qui sont en fait des écarts absolus.
- Source : https://arxiv.org/html/2506.10376v1
- Preuve : étude publiée (ISSTA 2025).
- **Ce que SINA pourrait en faire.** Découper l'image dessinée par un calcul sans IA (le plus grand vide d'abord,
  puis les bandes de fond uni), au lieu de demander au modèle « combien de sections vois-tu » : le découpage devient
  certain, gratuit et répétable.

### 1.3 LaTCoder (KDD 2025)
- **Étapes.** 1) Découpage par lignes de couleur unie, horizontales puis verticales, sur trois niveaux au plus, sans
  jamais couper un texte (lu par OCR) ; écart minimal entre deux coupes 50 px ; un bloc de moins de 300 × 300 px est
  fondu dans son voisin (meilleur réglage mesuré) ; 2) chaque bloc est codé seul avec une consigne en quatre temps
  (analyser, écrire, vérifier textes et couleurs, polir) ; 3) deux assemblages : par positions absolues, ou par le
  modèle ; 4) **un vérificateur sans IA choisit le meilleur des deux** : moitié écart moyen des pixels, moitié CLIP.
- **Chiffres.** Avec GPT-4o sur des pages difficiles : écart moyen des pixels 61,6 → 33,9 (−37 %), note visuelle
  0,75 → 0,80. Préférence humaine : au moins 60 % contre chaque méthode concurrente, 79,7 % contre DCGen. La consigne
  en quatre temps compte : sans elle, la note visuelle tombe de 0,80 à 0,71.
- **Point très utile.** Les auteurs écrivent que **le juge IA n'était « pas assez fiable » pour choisir entre deux
  versions** ; ils ont pris une mesure calculée.
- **Limites dites.** Un petit bloc est parfois mal centré ; Gemini « oublie » des blocs à l'assemblage ; le découpage
  suppose des lignes de fond uni.
- Source : https://arxiv.org/html/2508.03560v1
- Preuve : étude publiée (KDD 2025).
- **Ce que SINA pourrait en faire.** Demander au dessinateur des **bandes de fond uni bien séparées** (voir partie 3),
  ce qui rend le découpage exact ; et, quand deux montages sont possibles, laisser une mesure calculée trancher.

### 1.4 DOne (mars 2026)
- **Étapes.** 1) Un détecteur entraîné découpe la page en régions de sens (en-tête, ouverture, cartes) ; 2) un second
  détecteur repère les éléments (boutons, pictogrammes, textes) et les range ; 3) **le modèle écrit d'abord un plan en
  arbre (JSON)**, puis seulement le code qui remplit ce plan.
- **Chiffres.** Ressemblance CLIP 0,744 contre 0,673 pour DCGen et 0,648 pour la traduction directe (Claude 3.7) ;
  préférence de 20 développeurs et graphistes : 58,6 % pour DOne ; temps pour obtenir une page : 9,8 → 3,2 minutes.
  Le découpage en régions apporte le plus gros gain à lui seul (0,648 → 0,723).
- **Limites.** Liste fixe de types d'éléments ; l'apport propre du plan JSON n'est pas isolé ; le texte annonce
  « plus de 10 % » quand le tableau donne environ 9 %.
- Source : https://arxiv.org/html/2604.01226
- Preuve : article de recherche.
- **Ce que SINA pourrait en faire.** Le « plan en arbre » existe déjà chez SINA (le plan de page) ; ce qui manque est le
  **plan lu sur le dessin**, comparé au plan écrit avant le dessin.

### 1.5 ComUICoder (février 2026) : des pièces réutilisables
- **Étapes.** 1) Découpage mêlant détecteur et modèle (cartes, menus, formulaires) ; 2) les blocs qui se ressemblent
  (mesure : 15 % SSIM, 85 % LPIPS inversé, seuil 0,5 ; même forme de graphe) deviennent **une seule pièce réutilisée** ;
  3) le modèle écrit un gabarit de page avec des emplacements, puis une pièce par groupe ; 4) **retour élément par
  élément** sur les blocs les plus ratés et les plus grands : cinq types de consigne seulement, **ajouter, retirer,
  déplacer, redimensionner, changer le contenu**.
- **Chiffres.** Repérage des blocs 0,93, texte 0,92, position 0,82, couleur 0,83 ; 60 % de code réutilisé. Les tableaux
  se contredisent entre eux (0,93 et 0,90).
- **Limite.** Les pièces sont créées par le modèle, **pas prises dans une bibliothèque existante**.
- Source : https://arxiv.org/html/2602.19276 (lu aux deux tiers)
- Preuve : article de recherche.
- **Ce que SINA pourrait en faire.** Les cinq types de consigne sont exactement les cinq gestes possibles sur une pièce
  du thème (ajouter un bloc, en retirer un, changer la disposition, changer la taille, changer le texte ou la photo) :
  le juge ne devrait pouvoir répondre que dans ce vocabulaire.

### 1.6 Widget2Code (CVPR 2026) : une petite langue et un traducteur certain
- **Étapes.** Le modèle ne produit pas du code mais une **petite langue de description** (WidgetDSL : disposition,
  style, hiérarchie), avec des **gabarits de pièces** déjà écrits (boutons, curseurs, graphiques) qu'il instancie ; un
  **traducteur sans IA** en tire le code ; une boucle de rendu cherche la plus petite largeur sans débordement ; les
  couleurs sont mesurées sur l'image (8 couleurs dominantes par regroupement des pixels) et données au modèle ;
  les pictogrammes sont cherchés dans une bibliothèque de 50 000.
- **Chiffres.** Géométrie 95 → 100 ; disposition 69,5 → 82,2 ; palette 47 → 58 (reste le point faible).
- **Limites.** Pas d'étude humaine ; un seul modèle essayé ; l'ajout de la petite langue seule fait baisser la
  palette (47 → 42).
- Source : https://arxiv.org/html/2512.19918v1
- Preuve : étude publiée (CVPR 2026).
- **Ce que SINA pourrait en faire.** C'est le modèle le plus proche du thème unique : les pièces du thème sont la
  « petite langue », le moteur du thème est le traducteur. **Le modèle ne devrait jamais écrire de code, seulement
  choisir des pièces, des dispositions et des réglages**, et les couleurs devraient être mesurées sur le dessin par le
  code, pas lues par le modèle.

### 1.7 Prototype2Code (2024) : partir d'une maquette structurée
- **Étapes.** À partir d'une maquette Figma ou Sketch (calques) : nettoyage des calques éclatés, regroupements
  (barres, cartes, listes), arbre de rangées et colonnes, reconnaissance de 25 types d'éléments, puis le modèle n'écrit
  que le style.
- **Chiffres.** SSIM 0,91 contre 0,64 (CodeFun) et 0,58 (code tiré d'une capture) sur 30 maquettes ; 5 développeurs
  jugent le code plus utilisable (4,4 contre 3,0 et 2,6).
- **Limite.** Pages fixes seulement ; la comparaison avec la méthode « capture » est reconnue peu équitable (une
  maquette en calques porte bien plus d'information qu'une image).
- Source : https://arxiv.org/html/2405.04975
- Preuve : article de recherche.
- **Ce que SINA pourrait en faire.** Leçon : plus le dessin porte de structure, plus le code est fidèle. Le dessin
  d'OpenAI n'a pas de calques ; il faut donc lui faire porter sa structure autrement (bandes nettes, inventaire écrit,
  voir partie 3).

### 1.8 DesignRepair (ICSE 2025) : réparer avec un savoir de pièces
- **Étapes.** Un savoir tiré du système de style de Google (24 types de pièces, 228 règles « à faire » ou « à ne pas
  faire », 399 recommandations) ; la page est affichée par un navigateur, ses éléments et leurs mesures sont relevés ;
  le modèle relie chaque élément à un type de pièce, reçoit les règles de ce type seulement, et propose une correction
  par pièce et par propriété (espacement, texte, couleur, zone cliquable).
- **Chiffres.** Défauts trouvés : 92 % de ceux qui existent, 87 % de justes (contre 32 % et 55 % pour l'outil
  précédent) ; 26 personnes notent les pages réparées 3,92 contre 3,04 avant ; mais 20 % préfèrent l'original.
- Source : https://arxiv.org/html/2411.01606
- Preuve : article de recherche (annoncé à ICSE 2025 selon des résumés ; je ne l'ai pas vérifié).
- **Ce que SINA pourrait en faire.** Écrire, pour chaque pièce du thème, ses règles « à faire » et « à ne pas faire »
  mesurables (bouton entier, zone de 44 px, pas d'arche, texte sur zone calme) et ne donner au correcteur que les
  règles des pièces présentes.

### 1.9 Sketch2Code (NAACL 2025) : poser des questions ou suivre des remarques
- **Ce qui a été mesuré.** Sur 731 croquis : quand un « client simulé » compare la capture à la cible et fait des
  remarques, les modèles progressent à chaque tour (GPT-4o : 82,3 → 86,3 en cinq tours, environ +0,8 par tour).
  **Quand c'est le modèle qui pose des questions, il recule** (−1,1 % par question en ressemblance), et les gains se
  font dans les deux premiers tours, puis plafonnent ou reculent après trois ou quatre. 7 experts sur 8 préfèrent
  pourtant l'agent qui pose des questions. Des remarques d'expert font un peu mieux que des remarques simulées
  (+1,62 % contre +1,41 % par remarque).
- Source : https://arxiv.org/html/2410.16232 (lu aux deux tiers)
- Preuve : article de recherche (sa publication en conférence n'est pas vérifiée).
- **Ce que SINA pourrait en faire.** La boucle de correction doit être menée par **des remarques précises venues de la
  comparaison**, pas par le modèle qui se juge lui-même ; deux tours font l'essentiel.

### 1.10 Interaction2Code (2024-2025) : ce qui bouge
- **Ce qui a été mesuré.** 127 pages, 374 gestes (menus, onglets, survols). Les parties animées sont bien moins
  réussies que la page : par exemple CLIP 0,47 sur la partie animée contre 0,63 sur la page. Trois fautes
  graves : élément animé absent, aucun effet, mauvaise fonction. Ce qui aide : **entourer en rouge la zone animée**
  (+11 % d'usage avec Claude 3.5), **prévenir des fautes connues** dans la consigne, **agrandir la zone** (rien n'est
  produit à taille réelle, presque tout à ×1,2 et plus), et **ajouter une description écrite** (CLIP 0,37 avec l'image
  seule, 0,42 avec le texte seul, 0,67 avec les deux).
- Source : https://arxiv.org/html/2411.03292
- Preuve : article de recherche.
- **Ce que SINA pourrait en faire.** Le dessin ne montre jamais le menu ouvert, le tiroir du panier ni le survol : ces
  comportements doivent venir des pièces du thème (qui les ont déjà), jamais d'une lecture de l'image.

### 1.11 Les suites de Design2Code
- **Design2Code lui-même** (NAACL 2025), relu en entier aujourd'hui pour ce qui manquait : les modèles **oublient 30 à
  40 % des blocs** sur les pages difficiles ; donner au modèle **la liste des textes** de la page fait passer le repérage
  des blocs de 56,6 à 67,7 (GPT-4o, pages difficiles), puis une relecture à 72,1 ; mais **la relecture fait reculer
  Gemini** (84,8 → 84,1 ; 73,7 → 71,2). Source : https://arxiv.org/html/2403.03163 ; étude publiée.
- **UI2Code^N** (ICML 2026) : afficher, regarder, corriger. Sur de vraies pages : 66 → 68 → 70 → 73 → 74 en cinq
  passages (gains de +2, +2, +3, +1) ; sur des pages simples, plafond dès le troisième. Une récompense fondée sur CLIP
  **fait reculer** le modèle (72,3 → 62,0) ; un juge mal réglé fait perdre 3 %. Source :
  https://arxiv.org/html/2511.08195v1 ; étude publiée.
- **DesignBench** (2025-2026, 900 pages, React, Vue, Angular) : pour retoucher ou réparer une page existante, **le
  code seul fait mieux que l'image seule**, et ajouter l'image au code n'apporte que peu. Source :
  https://arxiv.org/abs/2506.06251 (résumé seulement) ; article de recherche.
- **Vision2Code, WebRenderBench, Figma2Code, ReLook** : voir parties 2 et 5.

### 1.12 Les méthodes qui partent d'une bibliothèque de pièces existante
C'est le cas du Studio, et c'est **le moins étudié** :
- la revue de 2026 (partie 8.2) range la « recherche dans une bibliothèque de pièces » parmi les trois familles qui
  marchent (« elle ancre la création dans une bibliothèque existante pour que le modèle réutilise les pièces
  canoniques »), mais ne cite que Widget2Code et ComUICoder, et **aucun chiffre** ; elle classe la « généralisation à un
  système de style » parmi les problèmes ouverts ;
- DesignRepair et Widget2Code sont les plus proches (règles par type de pièce ; gabarits instanciés et traducteur
  certain) ;
- côté produits, Builder.io, v0 et Figma Make le font (partie 4), avec des limites rapportées.
- **Pas trouvé** : une étude qui mesure, sur des pages réelles, la justesse du choix « quelle pièce de la bibliothèque
  pour ce morceau d'image ». Le seul chiffre est celui d'un éditeur (Builder.io, environ 70 %, partie 4).
- **Ce que SINA pourrait en faire.** Puisque personne ne l'a mesuré, le Studio doit le mesurer lui-même : un petit banc
  d'essai gratuit fait de captures de ses propres pièces (voir partie 6).

---

## 2. Comparer automatiquement le dessin et le site monté

### 2.1 Les mesures, et leur accord mesuré avec un œil humain

| Mesure | Ce qu'elle regarde | Accord avec l'œil humain | Source |
|---|---|---|---|
| Écart des pixels, SSIM, PSNR | les pixels un à un | **à peu près nul** : SSIM −0,05, PSNR 0,06 (corrélation avec 4 juges sur 180 paires d'images, hors pages web) ; près du hasard pour des animations web | Vision2Code ; Animation2Code |
| CLIP | l'allure générale (textes effacés dans Design2Code) | moyen : 0,44 | Vision2Code |
| DreamSim | l'allure perçue, sensible à la disposition et aux couleurs | **le meilleur des calculs** : 0,69 ; 96 % d'accord avec des humains sur des photos ordinaires | Vision2Code ; dépôt DreamSim |
| Blocs, texte, position, couleur (Design2Code) | chaque bloc de texte apparié | ensemble, elles prédisent le choix humain entre deux pages dans **79,9 %** des cas ; ce qui pèse le plus : les blocs présents et leur position ; **le texte pèse à l'envers** | Design2Code |
| Recouvrement des boîtes (disposition) | la place des parties | 69,2 % d'accord, quand deux humains s'accordent à 65,8 % | Sketch2Code |
| Juge IA, grille générale | tout | 0,79 à 0,81 | Vision2Code |
| **Juge IA, grille propre au domaine** | ce que le domaine exige | **0,84 à 0,85, le meilleur** | Vision2Code |
| Juge IA par blocs (0 à 1 par bloc) | chaque bloc de la page | 0,66 en moyenne (0,80 en médiane), quand deux humains s'accordent à 0,78 | Vision2Web |

- Sources : https://arxiv.org/html/2605.11307 (tableau 3a lu ; le domaine des pages web n'y est pas, ce qui limite la
  portée) ; https://arxiv.org/html/2403.03163 ; https://arxiv.org/html/2410.16232 ;
  https://arxiv.org/html/2603.26648v1 ; https://github.com/ssundaram21/dreamsim ; Animation2Code
  (https://arxiv.org/pdf/2606.28593, connu seulement par le résumé du moteur de recherche).
- Preuve : articles de recherche ; Design2Code est une étude publiée.
- **Deux leçons fermes.**
  1. **Les mesures au pixel (SSIM, écart moyen) ne disent presque rien de ce qu'un humain voit.** Le Studio ne doit
     jamais décider sur elles. Or l'ancienne ressemblance de `mockup-code/pipeline.ts` (`localSimilarity`) est de cette
     sorte (gris sur une grille et histogramme).
  2. **Le meilleur juge est un juge IA avec une grille écrite pour le domaine**, et la meilleure mesure calculée est
     celle qui regarde **les parties présentes et leur place**, pas les pixels.
- **Ce que SINA pourrait en faire.** Une note de fidélité en deux étages : un calcul gratuit qui vérifie les parties
  présentes, leur ordre, leur place et leurs couleurs (partie 2.3), puis un juge IA avec la grille du Studio, appelé
  seulement sur les bandes que le calcul signale.

### 2.2 Ce que les mesures publiées supposent, et qui ne marche pas tel quel chez SINA
- Design2Code et WebRenderBench **exigent le code des deux pages** : Design2Code colore chaque texte dans le code
  source pour le retrouver ; WebRenderBench (45 100 pages) lit la structure des deux pages dans le navigateur, apparie les
  éléments par leur texte (au moins 80 % de lettres communes), puis note la place relative (60 % de sa note), le nombre
  d'éléments par groupe (20 %) et le style : couleur du texte, du fond, taille, arrondi (20 %). Chez SINA, le dessin
  n'est qu'une image.
- Sources : https://arxiv.org/html/2403.03163 ; https://arxiv.org/html/2510.04097 ; le code d'évaluation de Design2Code
  est public mais réservé à la recherche (https://github.com/NoviScl/Design2Code).
- **Ce que SINA pourrait en faire.** Le Studio a un avantage que les chercheurs n'ont pas : **il connaît d'avance tous les
  textes** (ils viennent du plan) et il lit la structure exacte du site monté. Il suffit donc de **retrouver sur le dessin
  où se trouve chaque texte du plan** (lecture automatique des textes, gratuite : tesseract.js, licence Apache 2.0, marche
  dans Node, plus de 100 langues ; https://github.com/naptha/tesseract.js), puis d'appliquer à ces paires la méthode de
  WebRenderBench : même bande, même côté, même ordre, même couleur de texte et de fond.

### 2.3 Les outils libres utilisables sans fournisseur
- **pixelmatch** (déjà dans Playwright) : écart des pixels ; utile seulement pour vérifier qu'une retouche n'a rien
  changé ailleurs, jamais pour juger la ressemblance. https://playwright.dev/docs/test-snapshots (lu dans le rapport du
  matin).
- **ssim.js** : licence MIT, mais dépôt archivé depuis le 7 décembre 2023. https://github.com/obartra/ssim. À ne pas
  prendre, vu la partie 2.1.
- **DreamSim** : licence MIT, en Python, `pip install dreamsim` ; version légère trois fois plus rapide. Entraîné sur des
  photos, pas sur des pages web : à essayer sur nos propres paires avant d'y croire.
- **L'empreinte du Studio** (`custom-theme/ressemblance.ts`) : déjà écrite, gratuite, en Lab, par bandes et par
  section. Elle sert aujourd'hui à comparer un accueil aux sites récents ; elle peut comparer, section par section, la
  bande du dessin et la section montée.
- **Ce que SINA pourrait en faire.** Ne rien ajouter de lourd : l'empreinte du Studio plus la lecture des textes
  suffisent pour le calcul ; DreamSim seulement si un essai gratuit sur nos paires montre qu'il suit le jugement du
  propriétaire.

---

## 3. Dessiner un accueil plus facile à monter, sans perdre la beauté

### 3.1 Ce que dit le guide officiel d'OpenAI (GPT Image 2.6)
- **Faits.** Décrire l'interface « comme si le produit existait déjà », avec la disposition, la hiérarchie, les
  espacements et de vrais éléments, sans langage d'« art conceptuel » ; mettre chaque texte voulu entre guillemets,
  avec sa place et son style ; demander « aucun autre texte » et vérifier l'orthographe ; **donner un numéro et un rôle
  à chaque image jointe** (« disposition », « style », « contenu ») et dire comment les combiner ; pour retoucher, une
  seule modification par demande, en redisant ce qui ne doit pas changer ; pour viser une zone précise, **joindre un
  calque transparent où la zone est entourée** ; tailles libres en multiples de 16, rapport entre les côtés de 3 pour 1
  au plus, 3 840 px au plus par côté ; réglages « quality » (finesse des petits textes) et « complexity » (combien le
  modèle prépare avant de dessiner).
- Source : https://developers.openai.com/api/docs/guides/image-prompting?model=gpt-image-2.6 (lu aux trois quarts).
- Preuve : officiel.
- **Ce que SINA pourrait en faire.** Le rapport 3 pour 1 explique pourquoi l'accueil se dessine en morceaux : c'est
  une limite du modèle, pas un choix. Donner à chaque image jointe son rôle écrit (aujourd'hui `consignesDessins` joint
  le logo et les morceaux précédents sans leur donner de rôle numéroté) ; et retoucher un défaut du dessin par une
  retouche ciblée avec calque, plutôt qu'en redessinant tout le morceau.

### 3.2 Des bandes nettes : ce qui rend le découpage exact
- **Faits.** LaTCoder ne découpe bien que le long de **lignes de couleur unie** ; LayoutCoder coupe d'abord **le plus
  grand vide** ; DOne montre que le découpage en régions est le plus gros gain (CLIP 0,648 → 0,723). Les blocs plus
  petits que 300 × 300 px nuisent (meilleur réglage de LaTCoder).
- Sources : parties 1.2 à 1.4.
- **Ce que SINA pourrait en faire.** Ajouter à la consigne de dessin, dite en positif : « chaque section occupe une
  bande pleine largeur avec son propre fond, nettement séparée de la suivante ; une section ne commence jamais au milieu
  d'une autre » ; et, pour le téléphone, « chaque écran se termine à la fin d'une section ». Cela ne retire rien à la
  beauté (les meilleurs sites alternent déjà des fonds), et cela permet au Studio de découper le dessin par un calcul,
  puis de vérifier que le nombre de bandes est celui du plan.

### 3.3 L'inventaire écrit avant le dessin, et la liste des textes donnée au modèle
- **Faits.** Donner au modèle la liste des textes de la page fait passer le repérage des blocs de 56,6 à 67,7 sur les
  pages difficiles (Design2Code) ; joindre une description écrite à l'image fait passer la note des parties animées de
  0,37 à 0,67 (Interaction2Code) ; prévenir le modèle des fautes connues aide les grands modèles, mais fait reculer les
  petits.
- **Déjà dans le Studio.** Le plan porte tous les textes exacts, et `decrireSections` les donne au dessinateur. C'est
  juste.
- **Ce que SINA pourrait en faire.** Compléter le plan, pour chaque section, par **l'inventaire de ses éléments**
  (titre, phrase, bouton, photo, cartes, nombre de cartes) et **sa pièce du thème avec sa disposition**, avant le
  dessin. Le dessinateur dessine cet inventaire ; le montage le reprend ; le contrôle vérifie les trois.

### 3.4 Dessiner « dans la langue » du thème
- **Faits.** ControlGUI (2025) fait dessiner des écrans à un modèle d'images guidé par un squelette (placement des
  éléments et sens de lecture) et dit obtenir des dessins plus fidèles à l'intention et plus variés qu'avec le texte
  seul ; 72 500 écrans et pages appariés à leur squelette. UI-Diffuser et PrototypeFlow font de même.
- Sources : https://arxiv.org/html/2502.03330v2 ; https://arxiv.org/pdf/2306.06233 ;
  https://arxiv.org/html/2412.20071v3 (connus seulement par le résumé du moteur de recherche).
- Preuve : articles de recherche, non lus en entier.
- **Attention.** Ces outils utilisent un modèle d'images libre (Stable Diffusion), qui n'est pas un fournisseur accordé
  et qui contredirait la règle « images par OpenAI ». Je ne le recommande pas. L'idée, elle, se transpose avec OpenAI.
- **Ce que SINA pourrait en faire, deux façons, à départager par un essai.**
  1. **Douce** : pour chaque section, joindre au dessinateur la petite capture de la disposition choisie, rendue par
     le thème aux couleurs de la marque, avec le rôle « disposition seulement, à embellir librement ». Le dessin reste
     libre dans son allure, mais il est montable.
  2. **Forte** : rendre tout l'accueil monté (pièces choisies, textes, couleurs, sans photos) en squelette gris, et
     demander à OpenAI de l'« habiller » en conservant la disposition. Le dessin devient montable à coup sûr, mais il
     risque de perdre ce qui fait sa force (une idée de mise en page que le thème n'a pas). **Ce point touche la règle
     du cahier** « personne ne donne la liste des sections au concepteur » : la façon forte ne doit donc jamais choisir
     les sections à la place de SINA, seulement dessiner celles qu'elle a choisies.

### 3.5 Le double dessin téléphone et ordinateur
- **Faits.** Avec trois maquettes par page (ordinateur, tablette, téléphone), les meilleurs agents de 2026 font
  nettement moins bien sur téléphone : par exemple 63,3 sur ordinateur contre 48,3 sur téléphone (OpenHands avec
  Gemini 3 Pro), 54,2 contre 46,8 (Claude Code avec Claude Opus 4.5) ; fautes fréquentes : petits décalages de taille,
  de place et de couleur dans les éléments répétés, photos mal choisies quand leurs noms de fichier sont vagues.
- Source : https://arxiv.org/html/2603.26648v1
- Preuve : article de recherche.
- **Ce que SINA pourrait en faire.** La plupart des visiteurs d'une petite marque arrivent sur téléphone : **la
  comparaison qui compte d'abord est le dessin téléphone contre la capture téléphone**, puis l'ordinateur. Et chaque
  photo donnée au montage porte un nom qui dit sa section et son rôle (le Studio le fait déjà en partie : « PHOTO DE LA
  SECTION n »).

### 3.6 Ce qui bouge ne se lit pas sur une image
- **Fait.** Interaction2Code : un menu, un onglet ou un survol se reproduit mal à partir d'images (partie 1.10).
- **Ce que SINA pourrait en faire.** Le dessin montre l'état fermé ; menus, tiroir du panier, survols et barre d'achat
  viennent toujours des pièces du thème, qui les ont déjà et les ont fait tester.

---

## 4. Ce que font les produits, et leurs limites rapportées

| Produit | Comment il passe de la maquette au code | Ce qui est rapporté | Preuve |
|---|---|---|---|
| **Builder.io Visual Copilot** | relie les pièces de la maquette aux pièces de code du client ; l'ancienne correspondance écrite à la main (fichiers de liaison) est **abandonnée** au profit d'un repérage automatique des pièces du dépôt | l'éditeur annonce lui-même environ **70 %** de correspondances justes, les cas limites étant revus à la main ; la même page promet aussi « 100 % » de parité, sans explication | article d'éditeur : https://www.builder.io/design-system-intelligence ; officiel : https://www.builder.io/c/docs/component-mapping-migration-guide |
| **Figma Make** | lit un paquet de pièces publié, les styles d'une bibliothèque, et surtout des **consignes d'usage écrites** | des utilisateurs (juin à décembre 2025) rapportent que Make reprend ses pièces génériques au lieu des leurs, ne voit pas les variantes ni les états, et qu'une utilisatrice obtient **de meilleurs résultats sans la bibliothèque** ; Figma ne donne pas de date de correction | officiel : https://help.figma.com/hc/articles/43602393097239 ; avis : https://forum.figma.com/suggest-a-feature-11/figma-make-not-using-my-library-components-42235 |
| **v0** | apprend le système de style par un « registre » (pièces, couleurs, polices, blocs) | la documentation dit que v0 est entraîné sur les pièces par défaut de shadcn/ui et « peut avoir du mal avec toute personnalisation » | officiel : https://v0.app/docs/design-systems (guide marqué « ancien ») |
| **Google Stitch** | dessine des écrans ; depuis le 21 avril 2026, un fichier DESIGN.md porte les règles de style et leur raison, en format ouvert (brouillon) | des testeurs : code exporté sans pièces réutilisables, « un échafaudage » ; DESIGN.md « dit à quoi les choses ressemblent, pas ce qui doit exister » | officiel : https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/ ; avis (résumés du moteur de recherche) |
| **Lovable** | importe une maquette Figma (extension, connexion directe ou fichier), ou une capture accompagnée d'une description | la documentation recommande de corriger ensuite par des demandes successives (styles, dispositions, éléments manquants) | officiel (résumé du moteur de recherche) : https://docs.lovable.dev/integrations/figma |
| **Uizard** | transforme une capture en écran modifiable | « marche pour tous les appareils » ; des listes extérieures disent que les mises en page complexes demandent du ménage | officiel : https://support.uizard.io/en/articles/7915206-using-screenshot-scanner (résumé seulement) |
| **Anima** | code React depuis Figma ; pièces maison seulement avec son outil Frontier, ou en offre entreprise | pas de documentation claire sur la correspondance avec ses propres pièces | article d'éditeur (résumé seulement) |
| **Locofy** | quatre modèles maison, dont un qui transforme les structures répétées en pièces réutilisables | chiffres de fidélité publiés par l'équipe de Locofy elle-même ; meilleurs résultats sur des maquettes bien rangées | article de recherche de l'éditeur : https://arxiv.org/abs/2507.16208 (résumé seulement) |
| **Relume, Framer** | partent du plan et de sections toutes faites, pas d'une image | voir le rapport du matin (parties 1.5) et le rapport 5 du 21 novembre | déjà lus |

**Ce qui ressort.**
- Aucun produit ne publie de mesure indépendante de la justesse « maquette vers pièces existantes ». Le seul chiffre
  (environ 70 %, Builder.io) vient de l'éditeur.
- Les deux qui travaillent le plus avec des pièces existantes (Figma Make, v0) disent ou laissent dire que **le modèle
  revient à ce qu'il connaît** quand les pièces ne lui sont pas expliquées. Figma en tire la leçon la plus précise : un
  catalogue des pièces avec leurs autres noms, à quoi chacune sert, un **arbre de décision** (« le visiteur doit choisir
  parmi des options : liste déroulante »), des exemples justes et faux, et l'interdiction d'inventer une variante qui
  n'existe pas.
- **Ce que SINA pourrait en faire.** Ne pas prendre de produit (ils sont payants, hors de la liste des fournisseurs, et
  écrivent du code libre) ; reprendre la méthode de Figma pour le catalogue des pièces, avec un arbre de décision
  « ce que je vois sur le dessin → la pièce et la disposition ».

---

## 5. Les boucles « afficher, comparer, corriger »

### 5.1 Ce qui a été mesuré
- **Les gains se font aux deux ou trois premiers tours.** UI2Code^N : +2, +2, +3, +1 sur de vraies pages, plafond dès le
  troisième sur des pages simples. Sketch2Code : gains surtout dans les deux premiers tours. ReLook : en pratique, environ
  deux tours ; plafond fixé à trois.
- **Sans garde-fou, ça se dégrade.** ReLook : le modèle de départ « s'effondre » après deux ou trois tours malgré les
  remarques ; d'où sa règle : **une correction n'est gardée que si sa note dépasse strictement la meilleure note déjà
  obtenue**, sinon on reprend un autre essai (10 au plus), puis on s'arrête et on garde la meilleure. VisRefiner : la
  version du tour en cours oscille, mais **la meilleure version gardée** continue de monter (92,0 → 94,2 en cinq tours) ;
  les grands modèles généraux ne s'améliorent pas toujours en se relisant (GPT-4o −0,3 sur des pages simples, +5,2 sur
  des pages difficiles ; Claude 3 Opus −0,2 et +4,7). Design2Code : la relecture fait reculer Gemini.
- **Le juge décide de tout.** UI2Code^N : un juge mal réglé fait perdre 3 % ; une note par CLIP fait reculer (72,3 →
  62,0). LaTCoder : le juge IA n'était pas assez fiable pour choisir entre deux versions.
- **Ce qui fait progresser.** Des remarques **localisées et précises** venues de la comparaison (Sketch2Code, ComUICoder :
  ajouter, retirer, déplacer, redimensionner, changer le contenu) ; traiter d'abord **les blocs les plus ratés et les plus
  grands** (ComUICoder) ; voir sa propre capture (UI2Code^N ; le rapport 5 : 11 % de mieux avec capture, 1,5 % sans).
- **Ce qui dégrade.** Laisser le même modèle se juger ; corriger toute la page à chaque tour ; une note globale floue ;
  des corrections larges (VisRefiner perd plus souvent devant des humains quand il change beaucoup).
- Sources : https://arxiv.org/html/2511.08195v1 ; https://arxiv.org/html/2510.11498v1 (ACL 2026) ;
  https://arxiv.org/html/2602.05998v1 ; https://arxiv.org/html/2410.16232 ; https://arxiv.org/html/2602.19276 ;
  https://arxiv.org/html/2508.03560v1 ; https://arxiv.org/html/2403.03163
- Preuve : études publiées (UI2Code^N à ICML 2026, ReLook à ACL 2026, Design2Code) et articles de recherche.

### 5.2 Ce que cela donne pour SINA
- **Deux tours au plus**, sur les seules sections signalées, chacune corrigée par un **geste de pièce** (changer la
  disposition, ajouter ou retirer un bloc, changer un réglage de taille, de fond ou de photo), jamais par une réécriture.
- **Garder la meilleure version**, et n'accepter un tour que s'il améliore la note calculée **et** ne casse aucune
  barrière (bouton entier, pas de débordement, pas de doublon de photo, variété).
- **Le juge n'est pas celui qui monte** (règle du propriétaire), et il juge **avec la grille du Studio**, section par
  section, dessin et capture côte à côte.
- **Aucun tour payant relancé tout seul** si le résultat d'un appel est incertain (règle du propriétaire) : la boucle
  s'arrête et le dit.
- Le prix d'un tour se mesure au premier essai ; je n'en invente aucun ici. Repère du cahier : la relecture du code a
  coûté 0,03 € sur Braise, et un contrôle de fidélité d'une photo est plafonné à environ 0,08 €.

---

## 6. Ce qui ferait encore monter la qualité

1. **Une présélection calculée des pièces, avant le modèle.** Widget2Code cherche d'abord les 50 pictogrammes les plus
   proches par l'image, puis en garde 5 par le sens. Pour SINA : comparer chaque bande du dessin aux captures des
   dispositions du thème rendues aux couleurs de la marque (empreinte du Studio, gratuite), et ne proposer au modèle que
   les trois plus proches qui respectent la partition, la variété et les règles. Le modèle choisit parmi trois ; il ne
   peut plus inventer.
2. **Les couleurs mesurées sur le dessin par le code.** Widget2Code mesure les 8 couleurs dominantes de l'image et les
   donne au modèle ; la palette reste pourtant son point faible. Pour SINA : relever par le code les fonds de chaque
   bande, la couleur des boutons et des titres sur le dessin, les rapprocher des couleurs de la marque, et en faire les
   réglages de la tenue ; un écart fort est signalé.
3. **Le calcul certain là où la justesse se vérifie** (revue de 2026, régularité 2) : découpage, comptage des bandes,
   présence des textes, ordre, couleurs, boutons entiers, débordements, doublons ; le modèle seulement pour le goût.
4. **Un petit banc d'essai du Studio, gratuit d'abord.** Rendre chaque disposition de chaque pièce avec un contenu
   d'essai, en capture téléphone et ordinateur ; s'en servir comme « faux dessins » pour vérifier, sans IA, que la
   présélection du point 1 retrouve la bonne pièce. Mesurer ensuite le choix par le modèle sur quelques dessins réels,
   avec un budget décidé avec le propriétaire.
5. **Mesurer l'accord avec le propriétaire.** Aucune mesure publiée n'a été calibrée sur des sites de petites marques.
   Lui montrer une dizaine de paires « dessin et site » et lui demander seulement « fidèle ou pas » permettrait de régler
   le seuil de la note calculée sur son œil, comme `ressemblance.ts` l'a été sur Bécane et Atelier Vasco.
6. **Retoucher le dessin plutôt que le refaire** quand une seule zone est fausse (calque entouré, guide OpenAI) ; le
   client voit le dessin corrigé, pas un nouveau dessin.

---

## 7. Points qui contrediraient une règle du propriétaire (signalés, pas recommandés)

- **ControlGUI, UI-Diffuser** : dessin par Stable Diffusion, qui n'est pas un fournisseur accordé, alors que toutes les
  images de SINA doivent venir d'OpenAI.
- **Builder.io, Locofy, Anima, Figma Make, v0, Stitch** : produits payants hors de la liste des fournisseurs ; ils
  écrivent du code libre, quand la règle est de monter avec les pièces du thème.
- **Le squelette imposé (partie 3.4, façon forte)** : acceptable seulement si SINA a d'abord choisi elle-même les
  sections ; sinon il contredit le cahier (« personne ne donne la liste des sections au concepteur ») et la variété.
- **La méthode actuelle `site.dessiner`** écrit un thème en code libre (Sol 6.2) : c'est un écart avec la règle « avec
  les pièces du thème », et un site écrit ainsi n'est pas vérifié par `variete-sites.ts` ni par le juge de l'ordre
  (vérifié : `dessin/job.ts` n'appelle ni l'un ni l'autre). Ce n'est pas une recherche mais un constat du code.

---

## 8. Pas vérifié

- Je n'ai pas lu les articles complets d'UICopilot, de WebSight, de DCGen et de ScreenCoder aujourd'hui (DCGen et
  ScreenCoder ont été lus ce matin, voir le rapport du matin) ; UICopilot (arbre grossier puis code fin) n'est connu que
  par la revue de 2026 ; WebSight (jeu de 2 millions de pages synthétiques et modèle de 8 milliards de paramètres) n'est
  connu que par ses résultats dans LayoutCoder (CLIP 66,9 à 76,4, le plus bas des grands modèles).
- DesignBench : résumé seulement. Animation2Code, ControlGUI, UI-Diffuser, PrototypeFlow, Locofy (article), Lovable,
  Uizard, Anima : résumés seulement.
- Les lieux de publication de DesignRepair, Sketch2Code et Interaction2Code ne sont pas vérifiés.
- Les chiffres de DreamSim contre SSIM et LPIPS sur son propre banc d'essai ne sont pas relus (le dépôt ne donne que les
  variantes de DreamSim).
- Aucune étude trouvée qui mesure le choix d'une pièce dans une bibliothèque existante à partir d'une image de page.
- Aucune étude trouvée sur la fidélité des dessins d'OpenAI (GPT Image 2.6) pour des pages web : ce que je dis de
  leurs défauts vient des essais du Studio (cahier, partie 4).
- Les prix : aucun prix nouveau n'est donné ici. Ceux cités viennent du cahier `dessiner-puis-coder.md`.

---

## Ce qu'il faut construire dans SINA, dans l'ordre

1. **Relier le dessin au montage par les pièces du thème.** Le plan de l'accueil nomme, pour chaque section, sa pièce et
   sa disposition (choisies par SINA dans ce qui est permis par la partition, la variété et les règles) ; après le
   dessin, c'est `site.create` qui monte avec ces pièces, et le code libre de `site.dessiner` est retiré au moment où la
   nouvelle façon a fait ses preuves. *Le client voit* : un accueil qui ressemble à son dessin, et qui se retouche en
   cliquant comme le reste de son site.
2. **Des consignes de dessin « montables »**, dites en positif : une section par bande pleine largeur, fond propre et
   limite nette ; chaque écran de téléphone finit à la fin d'une section ; chaque image jointe numérotée avec son rôle.
   *Le client voit* : des dessins aussi beaux, plus clairs à lire, section après section.
3. **L'inventaire de chaque section dans le plan** (éléments, nombre de cartes, pièce, disposition), dessiné puis
   vérifié. *Le client voit* : plus rien d'oublié entre le dessin et le site (l'oubli est la faute n° 1 mesurée).
4. **Le découpage du dessin par le calcul** (bandes de fond uni, plus grand vide d'abord), comparé au nombre de sections
   du plan ; un dessin qui ne tombe pas juste est retouché sur la zone fautive, pas redessiné. *Le client voit* : aucun
   dessin incomplet ne lui est montré.
5. **La présélection des trois pièces les plus proches** pour chaque bande, par l'empreinte gratuite du Studio ; le
   modèle choisit parmi elles. *Le client voit* : un site plus fidèle, sans pièce inventée.
6. **Les couleurs et les textes relevés sur le dessin par le code** (fonds, boutons, titres ; position de chaque texte du
   plan par lecture automatique gratuite), comparés au site monté. *Le client voit* : les couleurs de son dessin sur son
   site.
7. **Le catalogue des pièces écrit pour l'IA** à la façon de Figma : autres noms, rôle, quand la prendre, quand ne pas la
   prendre, arbre de décision « ce que je vois → la pièce et la disposition », exemples justes et faux, une capture de
   chaque disposition. *Le client voit* : moins de sections qui « tombent à côté » de son dessin.
8. **La note de fidélité en deux étages** : calcul gratuit (parties présentes, ordre, place, couleurs), puis juge IA
   avec la grille du Studio sur les seules sections signalées, dessin et capture côte à côte, **téléphone d'abord**.
   *Le client voit* : SINA lui dit franchement ce qui est fidèle et ce qui ne l'est pas.
9. **La boucle de correction bornée** : deux tours au plus, sur les sections signalées, par gestes de pièce seulement ;
   un tour n'est gardé que s'il améliore la note sans casser une barrière ; la meilleure version est toujours gardée ;
   rien de payant relancé seul. *Le client voit* : un site corrigé avant d'être montré, jamais abîmé par une correction.
10. **Les comportements toujours tirés des pièces** (menus, tiroir du panier, survols, barre d'achat), jamais de l'image.
    *Le client voit* : un site qui marche, pas seulement une belle image.
11. **Le banc d'essai du Studio et le réglage sur l'œil du propriétaire** : captures de toutes les dispositions comme
    faux dessins (gratuit), puis une dizaine de paires montrées au propriétaire (« fidèle ou pas ») pour régler le seuil.
    *Le client voit* : rien directement ; la note qui décide pour lui juge comme le propriétaire.
12. **L'essai de la façon « douce » contre la façon « forte » (partie 3.4)**, sur trois clients inventés, avec un budget
    décidé avec le propriétaire avant de lancer, et les dessins montrés tout de suite. *Le client voit* : la façon qui
    garde la beauté du dessin et la fidélité du site, choisie sur preuve.
