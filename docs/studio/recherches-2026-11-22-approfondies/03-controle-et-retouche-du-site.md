# Recherche approfondie du 22 novembre 2026 : contrôler le site avant que le client le voie, et le retoucher en cliquant

Ce rapport va plus loin que deux rapports déjà faits : `docs/studio/recherches-2026-11-22/01-themes-sur-mesure.md`
(parties 5 et 6) et le rapport 5 du 21 novembre (`.lecture/recherches-21-novembre.md`). Je ne répète pas ce qu'ils
disent déjà (les six erreurs de WebAIM, le chiffre de 57 % de Deque, les seuils de vitesse de Google, la boucle de
relecture « environ 11 % de mieux », le numéro fixe de Lovable, le cadre bleu de Framer). Je pars de leurs trous :
- ils ne donnaient que les chiffres d'en-tête des juges (94,4 %, 96 %, + 55 %), sans dire ce qui produit ces chiffres ;
- ils disaient « trois passages de Lighthouse, la médiane » : la documentation officielle dit **cinq** ;
- le seuil de 90 en accessibilité chez Shopify n'était « pas confirmé » : il l'est maintenant ;
- rien sur l'orthographe, ni sur la façon concrète de brancher chaque contrôle sur Playwright ;
- pour la retouche en cliquant, seuls Lovable, Shopify et Framer étaient vus, et en résumé.

Aucun autre fichier du dépôt n'a été modifié. Aucun appel payant à une IA ni à un fournisseur.

**Niveaux de preuve**
- **officiel** : documentation, page d'aide ou norme de l'éditeur, sur ce qu'il fait lui-même ;
- **étude publiée** : article relu par des pairs (conférence ou revue) ;
- **article de recherche** : déposé en ligne, pas encore relu ;
- **test indépendant** : quelqu'un a essayé l'outil lui-même et le raconte ;
- **avis** : blog, forum, plainte d'utilisateur, article d'éditeur sur un concurrent.

---

## 0. Ce que fait déjà le Studio (lu dans le code le 22 novembre 2026)

**Les contrôles avant que le client voie son site**
- **Règles de composition, sans IA, à chaque enregistrement** : `checkCustomTheme` (`src/lib/syna-agent/custom-theme/theme.ts`)
  refuse une page manquante, une page en double, une vraie photo posée deux fois (même fichier), etc. Elle tourne dans
  `saved()` (`custom-theme/tools.ts`), donc aussi après chaque retouche.
- **Comparaison en image avec les autres sites du Studio** (`controle-image.ts`, `ressemblance.ts`) : l'accueil est capturé
  sur téléphone et ordinateur, son empreinte comparée aux 12 derniers sites et aux 30 derniers du même métier, et le Studio
  corrige seul, sans IA.
- **Le regard en image** (`looks.ts`, appelé dans `brand.ts`) : l'accueil et la page qui vend, **sur téléphone seulement**,
  sont regardés par un modèle avec deux rôles (« la cliente » et « le directeur artistique »), des notes de 0 à 10 et
  jusqu'à six problèmes. **Rien n'est corrigé tout seul** : les problèmes vont dans le compte rendu. Le modèle utilisé
  est `CHECK_MODEL` (`mockup-code/check.ts` : un petit modèle, effort bas).
- **Le second regard** (`second-regard.ts`) : un autre appel vérifie l'ordre des pages, « conforme » ou « non
  conforme », deux appels au plus.
- **Débordement** : `shootPages` (`shots.ts`) mesure seulement le débordement de la page entière (`scrollWidth` moins la
  largeur de l'écran), pas l'élément fautif. Le script `scripts/debug-overflow.ts` cherche l'élément fautif, mais pour les
  écrans du Studio, pas pour les sites des clients.
- **Bouton coupé** : la règle existe dans la feuille de style et un test vérifie le texte de la feuille
  (`tests/bouton-a-ombre-jamais-coupe.test.ts`), **pas le rendu** dans un navigateur.
- **Contraste** : un test de l'ancien moteur (`tests/syna301-contraste-section.test.ts`) ; rien sur le site rendu.
- **Ce qui n'existe pas** : axe-core, pa11y, Lighthouse, mesure des zones à toucher, poids des images, photos
  ressemblantes (et non identiques), liens morts sur le rendu, orthographe. Playwright est installé (`package.json`), Theme
  Check de Shopify aussi (`@shopify/theme-check-node`), et `sharp` pour les images.

**La retouche en cliquant**
- Chaque section porte un repère fixe `data-ct="sXXXXXXXX"` (`render.ts`, ligne 188).
- **Dans une section, l'élément est désigné par son chemin** de type `div:nth-child(2) > a:nth-child(1)` (`pathOf`, dans
  `PICK_JS`, `render.ts`). Ce chemin change dès qu'un élément est ajouté ou retiré avant lui : **ce n'est pas un repère
  fixe par élément**.
- Le clic envoie un message à SINA (`designationMessage`, `custom-theme-boutique.tsx`). **Chaque demande passe par le
  modèle le plus fort, au niveau élevé** (`needsJudgement` renvoie vrai dès « [Élément désigné », `loop.ts` ; `modelFor`),
  avec jusqu'à 120 messages du fil et 12 images, en plusieurs tours (lire la section, la modifier, répondre). **Même pour
  changer un mot.**
- La retouche elle-même (`custom.edit`) est sûre : remplacement exact d'un passage, styles limités à la section, aucun
  script ajouté.
- **Annulation** : `custom.undo` remonte la dernière version ; l'historique garde 15 versions (`HISTORY_MAX`, `theme.ts`).
  Le client ne voit ni l'historique ni une comparaison avant et après.
- **Après une retouche** : seules les règles de composition sont refaites. Ni débordement, ni bouton, ni contraste.
- Sur téléphone, le survol n'existe pas : le client ne voit l'étiquette (« Titre », « Image ») qu'après avoir touché.

---

# Partie A : le contrôle de qualité automatique

## 1. Les juges qui regardent le site en image

### 1.1 La grille : ce qui fait vraiment monter l'accord avec les humains

- **WebVR (mars 2026) : des critères tout petits, notés oui ou non.**
  - *Le fait.* Chaque critère ne vérifie **qu'une seule chose visible** (« le titre est-il centré ? », « le fond est-il uni ? »,
    « l'icône du menu est-elle en haut à droite ? »), noté 1 ou 0 ; la note est la part des critères tenus. De 32 à 248
    critères par page, rangés en quatre familles : allure générale, en-tête et pied de page, disposition de chaque section,
    mouvements et réactions. Un critère que la page de référence elle-même ne tient pas est retiré.
  - *Les chiffres* (5 experts, 50 comparaisons) : moyenne des juges **sans grille 64 %, avec grille 86,7 %** quand le juge
    voit le rendu et le code ; avec la vidéo seule 79,3 %, avec le code seul 76,7 %. Le meilleur juge monte à 96 %. Sans
    grille, les notes sont « gonflées » et se tassent dans une bande étroite. Trois passages du même juge varient peu
    (écart type de 0,48 point sur 100).
  - *Source.* https://arxiv.org/html/2603.13391 ; https://webvr-benchmark.github.io
  - *Preuve.* Article de recherche. Petit échantillon (50 cas).
  - *Attention.* Le juge à 96 % est Kimi-K2.5, d'un fournisseur qui n'est pas dans la liste du propriétaire : je ne le
    recommande pas ; c'est la **méthode** (critères atomiques, rendu et code ensemble) qui se reprend.
  - *Ce que SINA pourrait en faire.* Remplacer les notes de 0 à 10 du regard actuel par une liste de critères oui ou non,
    tirés du plan de chaque page et des règles du propriétaire (« le titre de l'ouverture se lit sur la photo », « le bouton
    principal est entier dans le premier écran du téléphone », « aucune photo n'est dans une arche »…).

- **ArtifactsBench : plusieurs captures valent mieux qu'une.**
  - *Le fait.* Le juge reçoit trois captures (avant, pendant, après un geste scripté, 1024 × 768, Playwright), le code, et
    une liste de dix critères (cinq visuels : disposition, fidélité, mouvement, réaction, clarté ; cinq sur le code). Accord
    par paires avec des ingénieurs (280 demandes, 6 modèles) : Gemini-2.5-Pro **79,1 % sans image, 87,1 % avec une capture,
    91 % avec plusieurs** ; un juge ouvert (Qwen2.5-VL-72B) plafonne à 71,3 %. Le texte ne teste pas la préférence du juge
    pour ses propres œuvres.
  - *Source.* https://arxiv.org/html/2507.04952
  - *Preuve.* Article de recherche.
  - *Ce que SINA pourrait en faire.* Donner au juge, pour chaque page, la capture du téléphone, celle de l'ordinateur et
    une capture après un geste (menu ouvert, panier ouvert), plus le HTML de la section en cause.

- **WebDevJudge (conférence ICLR 2026) : comparer deux versions vaut mieux que noter une seule.**
  - *Le fait.* 654 paires de sites jugées par des experts. Meilleur juge en comparaison par paires : **70,3 %** d'accord avec
    les experts (GPT-4.1 ; Claude-4-Sonnet 70,2 %), contre **84,6 %** entre humains. En note unique, le meilleur tombe à
    63,9 %. La comparaison par paires gagne **plus de 8 points** en moyenne. En note unique, une grille oui ou non bat
    nettement une échelle de 1 à 5. Sans le code, le juge perd plus (environ 10,7 points pour Claude) que sans l'image
    (2,6 points). Un juge « agent » qui clique dans le site ne fait pas mieux (les erreurs s'accumulent). L'ordre de
    présentation biaise toujours un peu le juge : il faut inverser l'ordre.
  - *Source.* https://arxiv.org/html/2510.18560v2 (version relue : https://iclr.cc/virtual/2026/poster/10010879)
  - *Preuve.* Étude publiée (ICLR 2026).
  - *Ce que SINA pourrait en faire.* Pour décider si une correction a amélioré la page, poser la question « A ou B ? »
    avec les deux captures et les deux codes, deux fois avec l'ordre inversé ; ne garder la correction que si elle gagne
    les deux fois.

- **« MLLM as a UI Judge » (octobre 2025)** : sur 30 écrans, les modèles approchent le jugement du public sur certains
  critères et s'en écartent sur d'autres. *Source* : https://arxiv.org/html/2510.08783v1. *Preuve* : article de recherche,
  **lu seulement en résumé**.

### 1.2 Les exemples à donner au juge

- **UICrit (UIST 2024) : huit exemples d'écrans ressemblants, choisis à la fois par l'image et par l'usage.**
  - *Le fait.* 983 écrans, 3 059 critiques de designers. Les exemples choisis par ressemblance de l'image **et** de la tâche
    battent le tirage au hasard, la ressemblance de l'image seule et celle de la tâche seule ; huit exemples font mieux que
    deux ou quatre. Pour localiser un défaut, des repères chiffrés sur les bords de la capture marchent, une grille posée
    dessus non. Gain : 0,31 → 0,48 sur une note de qualité (environ + 55 %), **mais les humains font 0,75**, et les experts
    préfèrent les critiques humaines 81 fois sur 100. **Seules 13,1 % des 5 927 remarques faites par Gemini étaient
    valables.**
  - *Source.* https://arxiv.org/html/2407.08850v3
  - *Preuve.* Étude publiée (UIST 2024).
  - *Ce que SINA pourrait en faire.* Les refus et les corrections du propriétaire sur de vrais sites (Bécane, les essais du
    lot 4…) deviennent la réserve d'exemples ; le juge en reçoit huit, choisis parmi les sites du même genre et de la même
    allure. Et surtout : **une remarque du juge n'est jamais appliquée sans vérification**, car la grande majorité sont
    fausses.

- **La suite d'UICrit : vérifier chaque remarque par un autre modèle aide, mais peu.**
  - *Le fait.* Une chaîne de six appels (écrire, filtrer, réécrire, valider, localiser, recadrer avec un modèle séparé) fait
    passer la qualité de 0,45 à **0,47** (humains 0,56), soit 22 % de l'écart comblé ; l'accord entre experts eux-mêmes
    reste faible (kappa 0,22) : la critique de design est subjective.
  - *Source.* https://arxiv.org/html/2412.16829v2
  - *Preuve.* Article de recherche.
  - *Ce que SINA pourrait en faire.* Ne pas empiler les juges : **chaque remarque doit se rattacher à un critère oui ou non
    vérifiable**, et quand c'est mesurable (débordement, contraste, taille), c'est le code qui tranche, pas un second
    modèle.

### 1.3 Le nombre de tours

- **La boucle « capture, critique, correction » : le premier tour fait presque tout.**
  - *Le fait.* Avec Claude Sonnet 4.5 comme critique et comme auteur, la note moyenne passe de 7,58 à 7,96 (tour 1), 8,02
    (tour 2), 8,05 (tour 3) : gains de **+ 0,37, puis + 0,06, puis + 0,03**. Les mots consommés passent d'environ 6 400 à
    environ 131 500 au bout de trois tours (les chiffres semblent cumulés). Sur un petit modèle, la qualité du code baisse à
    chaque tour, parce que la critique ne regarde que l'image.
  - *Source.* https://arxiv.org/html/2604.05839
  - *Preuve.* Article de recherche (Bristol et Amazon).
  - *Ce que SINA pourrait en faire.* **Un tour de correction, plus un tour de vérification**, pas trois : au-delà, on paie
    beaucoup pour presque rien. Un deuxième tour seulement si un critère bloquant reste faux.

### 1.4 Garder la meilleure version

- *Le fait.* La même étude garde la version la mieux notée (à égalité, la plus récente) ; avec Sonnet, la meilleure venait
  d'un tour de correction dans 86 % des cas, et la note « meilleure version » monte à 8,40. **Mais c'est le même juge qui
  choisit et qui note** : ce chiffre est flatté (l'article ne le discute pas).
- *Source.* https://arxiv.org/html/2604.05839
- *Preuve.* Article de recherche.
- *Ce que SINA pourrait en faire.* Garder chaque version du site avec ses résultats ; choisir la meilleure **d'abord par les
  contrôles du code** (zéro défaut bloquant), puis par la comparaison par paires du juge (ordre inversé), jamais par la note
  que le juge vient de donner à sa propre correction. Une correction qui casse un contrôle du code est jetée, même si le
  juge la préfère.

### 1.5 Ce que j'en retire pour le juge de SINA

1. Une liste de critères oui ou non par page, tirée du plan et des règles du propriétaire, et non des notes de 0 à 10.
2. Le juge voit téléphone, ordinateur, une capture après un geste, et le HTML de la section en cause.
3. Huit exemples de vrais refus du propriétaire, choisis parmi les sites ressemblants.
4. Chaque remarque nomme le critère qu'elle enfreint ; ce qui se mesure est rendu au code.
5. Un tour de correction, une vérification ; la version gardée est choisie par le code puis par paires, ordre inversé.
6. Le juge est d'un autre réglage que l'auteur (règle du propriétaire : « celui qui fait n'est jamais celui qui juge »).
   Aujourd'hui le regard tourne sur un petit modèle à effort bas, alors que le propriétaire veut que SINA juge avec le
   modèle le plus fort : **écart à signaler**.

---

## 2. Les contrôles par le code (gratuits)

Tous se branchent sur la fonction `open()` de `src/lib/syna-agent/custom-theme/shots.ts`, qui ouvre déjà le site dans un
Chromium local, servi par le Studio lui-même. Un seul passage du navigateur peut faire tous les contrôles, aux trois
largeurs 375, 768 et 1280.

| Contrôle | Outil | Comment le brancher | Seuil | Existe déjà ? |
|---|---|---|---|---|
| Débordement, élément par élément | Script dans la page (`page.evaluate`) | Voir 2.1 | 0 élément fautif | Page entière seulement |
| Bouton coupé ou recouvert | Script dans la page + Playwright | Voir 2.2 | 0 | Test de la feuille, pas du rendu |
| Zones à toucher | axe-core, règle `target-size` | Voir 2.3 | 24 × 24 ; 44 × 44 visé pour les boutons | Non |
| Contraste | axe-core `color-contrast` + mesure sur la capture | Voir 2.4 | 4,5 : 1 ; 3 : 1 grand texte et icônes | Non |
| Accessibilité générale | `@axe-core/playwright` | Voir 2.5 | 0 faute « grave » ou « critique » | Non |
| Lighthouse | module `lighthouse`, port de débogage | Voir 2.6 | 60 en vitesse, 90 en accessibilité | Non |
| Images lourdes | `sharp` + audits Lighthouse | Voir 2.7 | [À compléter : seuil à fixer] | Non |
| Photos en double | même fichier : oui ; ressemblantes : empreinte d'image | Voir 2.7 | 0 | En partie |
| Section vide | Script dans la page sur chaque `[data-ct]` | Voir 2.7 | 0 | Non |
| Texte d'exemple oublié | Recherche dans le rendu | Voir 2.7 | 0 | Avant la boutique seulement |
| Liens morts | Script dans la page + `page.request` | Voir 2.7 | 0 | Non |
| Thème Shopify | Theme Check (déjà installé) | Sur l'export | 0 erreur | Pour l'ancien moteur |

### 2.1 Débordements élément par élément, à 375, 768 et 1280

- *Le fait.* Méthode publiée : parcourir tous les éléments, garder ceux dont le bord droit dépasse la largeur de l'écran
  (1 pixel de tolérance), écarter ceux qui sont fixes à l'écran et ceux qu'un parent coupe (carrousel), puis nommer le fautif
  et son dépassement. Limites dites par l'auteur : les décorations `::before`/`::after` ne sont pas vues ; attendre la fin du
  chargement des polices (`document.fonts.ready`) ; ce qui défile dans un cadre défilant est écarté même si c'est une erreur.
- *Source.* https://zenn.dev/orectic/articles/horizontal-overflow-detection-playwright?locale=en
- *Preuve.* Avis technique (avec le code).
- *Piège que je relève dans ce code.* Si la feuille met `overflow-x: hidden` sur `body`, **tout** est considéré comme
  coupé par un parent et le contrôle passe à tort. Le contrôle du Studio doit s'arrêter avant `body` et `html`, et signaler
  à part un `overflow-x: hidden` posé sur eux (il cache le défaut au lieu de le corriger).
- *Ce que SINA pourrait en faire.* Remplacer la mesure de `shootPages` par la liste des fautifs, avec la section (`data-ct`)
  de chacun : le Studio sait alors quelle section reprendre, sans IA.

### 2.2 Boutons coupés ou recouverts

- *Le fait.* Playwright définit officiellement « reçoit les événements » : l'élément est la cible du clic à son point
  d'action ; un élément posé par-dessus fait échouer ce contrôle.
- *Source.* https://playwright.dev/docs/actionability
- *Preuve.* Officiel.
- *Ce que je propose (non prouvé ailleurs, mais simple).* Pour chaque bouton et lien-bouton : 1) son cadre, **agrandi de son
  ombre** (lue dans `box-shadow`), doit être entièrement à l'intérieur de chaque parent qui coupe (en hauteur aussi, pas
  seulement en largeur) ; 2) `document.elementFromPoint` aux quatre coins et au centre doit renvoyer le bouton ou l'un de
  ses enfants ; 3) le bouton principal de l'ouverture doit être entier dans le premier écran du téléphone (390 × 844). C'est
  exactement la règle « jamais un bouton coupé, sur téléphone comme sur ordinateur », vérifiée sur le rendu et non plus sur
  le texte de la feuille.

### 2.3 Zones à toucher (WCAG 2.2, critère 2.5.8)

- *Le fait.* Chaque cible fait au moins 24 × 24 pixels, **sauf** : si un cercle de 24 pixels centré sur la petite cible ne
  touche aucune autre cible ni le cercle d'une autre petite cible ; si la même fonction existe ailleurs sur la page en assez
  grand ; si le lien est dans une phrase ; si la taille vient du navigateur ; si la présentation est indispensable. Le
  critère 2.5.5 (niveau supérieur) vise 44 × 44.
- *Source.* https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- *Preuve.* Officiel (norme).
- *Le fait important pour le branchement.* Dans axe-core, la règle `target-size` existe (étiquette `wcag22aa`) mais elle est
  **éteinte par défaut** (« jusqu'à ce que WCAG 2.2 soit plus largement adopté »). Il faut l'allumer exprès, par exemple
  `new AxeBuilder({ page }).withRules(["target-size"])` ou en ajoutant l'étiquette `wcag22aa`.
- *Source.* https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md
- *Preuve.* Officiel.
- *Ce que SINA pourrait en faire.* Barrière à 24 pour tout ce qui se touche, et 44 pour le bouton principal de chaque page
  et la barre d'achat (le Studio choisit, c'est un goût de qualité, pas une obligation de la loi).

### 2.4 Contraste

- *Le fait.* La boutique de thèmes Shopify exige 4,5 : 1 pour le texte courant, 3 : 1 pour le texte de plus de 18 points,
  les bordures et les icônes (confirmé sur la page actuelle). La règle `color-contrast` d'axe-core rend deux sortes de
  résultats : « échec » et « à revoir » ; elle ne sait pas trancher quand le fond est une photo.
- *Sources.* https://shopify.dev/docs/storefronts/themes/store/requirements ;
  https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md
- *Preuve.* Officiel.
- *Ce que je propose (non prouvé ailleurs).* Pour chaque texte posé sur une photo (l'ouverture surtout) : prendre les pixels
  de la capture sous le cadre du texte, avec le texte masqué, et calculer le contraste entre la couleur du texte et la
  couleur la plus défavorable de cette zone. C'est la règle du propriétaire « le texte se pose sur la partie calme de la
  photo », mesurée au lieu d'être confiée au regard du modèle.

### 2.5 axe-core et pa11y : un seul des deux

- *Le fait (axe-core).* Le paquet `@axe-core/playwright` s'utilise ainsi : `await new AxeBuilder({ page }).withTags([...]).analyze()`,
  après les gestes voulus (l'analyse porte sur l'état actuel de la page) ; `.include()` limite à une partie, `.exclude()`
  retire un élément et tout ce qu'il contient. Playwright prévient que l'automatique ne trouve pas tout.
- *Source.* https://playwright.dev/docs/accessibility-testing
- *Preuve.* Officiel.
- *Le fait (pa11y).* pa11y 10 demande Node 22.13 ou plus (le Studio a Node 22.23), fonctionne avec Puppeteer (pas
  Playwright), et propose deux moteurs : HTML_CodeSniffer (par défaut) et axe-core.
- *Source.* https://github.com/pa11y/pa11y
- *Preuve.* Officiel.
- *Ce que SINA pourrait en faire.* **Prendre axe-core seul**, par `@axe-core/playwright` : pa11y ajouterait un second
  navigateur (Puppeteer) et réutiliserait de toute façon axe-core. Règle « une seule façon de faire ». Après une retouche,
  `.include('[data-ct="sXXXXXXXX"]')` refait l'analyse sur la seule section touchée, en une fraction de seconde.

### 2.6 Lighthouse : cinq passages, pas trois, et pas sur l'aperçu

- *Le fait.* La documentation de Lighthouse dit : « la médiane de **5** passages est deux fois plus stable qu'un seul » ;
  elle fournit `computeMedianRun` (`lighthouse/core/lib/median-run.js`) pour choisir le passage médian. Les variations
  viennent surtout de la page elle-même, du réseau et de la machine.
- *Source.* https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md
- *Preuve.* Officiel.
- *Le fait (Shopify).* Exigence actuelle de la boutique de thèmes : moyenne d'au moins **60 en vitesse et 90 en
  accessibilité** sur l'accueil, une fiche produit et une collection, **sur téléphone et sur ordinateur** (le doute du
  rapport précédent sur le 90 est levé). Les sections ne doivent pas être vides.
- *Source.* https://shopify.dev/docs/storefronts/themes/store/requirements
- *Preuve.* Officiel.
- *Le branchement.* Lighthouse ouvre **sa propre page** dans le navigateur : l'interception du Studio (`page.route` dans
  `shots.ts`) ne s'y applique pas. Il faut donc servir le site sur un vrai petit serveur local (le même contenu que `serve()`),
  lancer Chromium avec `--remote-debugging-port`, et donner ce port à Lighthouse. Le paquet `playwright-lighthouse` fait ce
  branchement, mais il annonce n'aller que jusqu'à Lighthouse 11 : mieux vaut appeler le module `lighthouse` directement.
- *Source.* https://github.com/abhinaba-ghosh/playwright-lighthouse
- *Preuve.* Officiel (page du paquet).
- *Ce que je relève.* La vitesse mesurée sur l'aperçu du Studio **n'est pas** celle de la future boutique Shopify,
  WooCommerce ou PrestaShop (autre serveur, autres scripts). La note d'accessibilité, elle, se transpose bien. Pour les sites
  de services hébergés par le Studio, la vitesse mesurée est la vraie.
- *Ce que SINA pourrait en faire.* Accessibilité : barrière à 90 avant que le client voie son site. Vitesse : barrière à 60
  sur les sites hébergés par le Studio ; pour les boutiques, mesure faite après la mise en ligne, et dite au client.

### 2.7 Images lourdes, photos en double, sections vides, texte d'exemple, liens morts

- **Images lourdes.** Lighthouse signale les images trop grandes pour leur place, mal compressées ou dans un ancien format.
  Sans Lighthouse, le Studio peut comparer, avec `sharp` (déjà installé), la taille réelle de chaque fichier à la taille
  affichée (cadre × densité de l'écran). *Preuve* : connaissance générale de l'outil, **page des audits non relue
  aujourd'hui**. [À compléter : le seuil de poids par image, à fixer sur le premier site réel.]
- **Photos en double.** Aujourd'hui, seul le même fichier posé deux fois est refusé (`theme.ts`, ligne 531). Deux photos
  créées séparément peuvent pourtant se ressembler presque à l'identique. *Proposition* (non prouvée ici) : une empreinte
  d'image très simple (réduire en 9 × 8 gris, comparer les pixels voisins) calculée avec `sharp`, comparée entre toutes les
  photos du site.
- **Section vide.** Pour chaque `[data-ct]` du rendu : hauteur, nombre de mots visibles, nombre d'images chargées
  (`naturalWidth > 0`). Une section sans mot ni image, ou dont l'image ne s'est pas chargée, est un défaut bloquant (la
  boutique de thèmes Shopify interdit aussi les sections vides).
- **Texte d'exemple oublié.** Le Studio sait déjà quelles sections ont des textes d'exemple (`clientTexts`, `sampleTexts`) et
  refuse la mise en boutique tant qu'un « À compléter » ou une photo d'exemple reste (`install.ts`, `custom.choose`). Il
  manque **le même contrôle sur ce que le visiteur voit** (texte rendu, y compris ce que posent les scripts des pièces) :
  chercher « [À compléter », les phrases connues de la bibliothèque, les noms de photos d'exemple (`photos/sl-…`).
- **Liens morts.** Chaque lien du rendu doit mener à une page du site (clé connue de `ctGo`), à une ancre qui existe, ou à
  une adresse extérieure qui répond (`page.request.head`, depuis le serveur du Studio). Un bouton sans destination est un
  défaut.

---

## 3. Les contrôles du texte du site

### 3.1 Orthographe et grammaire françaises

- **LanguageTool.**
  - *Le fait.* L'interface publique gratuite **interdit les requêtes automatiques** (20 requêtes par minute et 20 Ko par
    requête au plus, lien vers leur site obligatoire) et conseille d'installer son propre serveur. Le serveur se lance en Java
    (Java 8 ou plus) : `java -cp languagetool-server.jar org.languagetool.server.HTTPServer --config server.properties --port 8081`,
    et répond sur `/v2/check` avec `language` et `text`. Par défaut, il n'est joignable que depuis la machine elle-même.
  - *Sources.* https://dev.languagetool.org/public-http-api ; https://dev.languagetool.org/http-server
  - *Preuve.* Officiel. Je n'ai pas relu la licence ni la qualité en français sur ces pages.
- **Grammalecte.**
  - *Le fait.* Correcteur de grammaire et de typographie **dédié au français**, licence libre GPL 3, en Python (3.7 ou plus),
    avec une ligne de commande et un serveur. Dernière version : 2.3.0, du 15 décembre 2025. Le projet a été confié à
    l'entreprise Algoo en janvier 2026, une relance est en cours ; aucune version plus récente.
  - *Source.* https://grammalecte.net/
  - *Preuve.* Officiel. Je n'ai pas relu le nom du script serveur ni son adresse.
- *Ce que SINA pourrait en faire.* Un seul correcteur, installé sur le serveur du Studio, gratuit, sans aucune donnée qui
  sort : **Grammalecte** pour le français (il connaît la typographie française : espaces avant « : ; ! ? », guillemets), et
  LanguageTool seulement si l'anglais du site doit être relu aussi. Chaque faute trouvée va au rédacteur de SINA pour une
  seule reprise ; les textes du client, repris mot pour mot, ne sont **jamais** corrigés sans lui demander. Utiliser
  Grammalecte en serveur séparé ne mélange pas son code avec celui du Studio (à confirmer avec un juriste si le propriétaire
  le souhaite).

### 3.2 Promesses non prouvées

- *Le fait.* La directive européenne 2024/825 (dite « EmpCo ») ajoute à la liste des pratiques toujours interdites les
  allégations environnementales **générales** (du type « respectueux de l'environnement », « vert ») sans preuve d'une
  performance reconnue, et les labels qui ne reposent pas sur une certification. Elle s'applique depuis le 27 septembre 2026.
  En octobre 2026, la France ne l'avait pas encore transposée (projet de loi DDADUE en discussion) ; les cabinets rappellent
  que les allégations trompeuses sont **déjà** sanctionnables en droit français.
- *Sources.* https://kpmg.com/av/fr/avocats/eclairages/2026/10/directive-empco-dite-ecgt.html ; résumé du moteur pour
  https://www.mayerbrown.com/fr/insights/publications/2026/10/the-eu-directive-on-empowering-consumers-for-the-green-transition-two-years-on-what-it-requires-and-where-the-member-states-stand
- *Preuve.* Avis de cabinets d'avocats ; **le texte de la directive n'a pas pu être relu** (page EUR-Lex vide pour mon
  outil) ; la liste exacte des pratiques interdites est donc à relire.
- *Ce que SINA pourrait en faire.* Un contrôle sans IA, après l'écriture des textes : une liste de mots qui demandent une
  preuve (« écologique », « naturel », « bio », « artisanal », « fait main », « le meilleur », « n° 1 », « garanti », un
  chiffre, un délai, un label). Chaque mot trouvé doit se rattacher à un fait du dossier (`site-facts.ts`, `preuves.ts`) ;
  sinon, il est rendu au rédacteur ou remplacé par « [À compléter : la preuve de … ] ». C'est la règle « rien d'inventé »,
  appliquée au site rendu.

### 3.3 Mots d'initié

- *Le fait.* Je n'ai pas trouvé d'outil sérieux en français qui repère les mots d'initié. La formule de lisibilité française
  de Kandel et Moles (1958) est une adaptation de celle de Flesch, mais ses coefficients exacts ne sont pas confirmés par ce
  que j'ai lu, et des chercheurs notent qu'elle est peu utilisée.
- *Source.* Résumé du moteur pour https://aclanthology.org/2025.jeptalnrecital-taln.34.pdf
- *Preuve.* Lu seulement en résumé.
- *Ce que SINA pourrait en faire.* Trois mesures simples, sans IA : phrases de plus de 20 mots sur les titres et les boutons,
  mots absents d'une liste des mots courants du français, et sigles non expliqués. Ce qui ressort va au relecteur de textes
  de SINA (« clair d'abord, beau ensuite »), qui décide ; le code ne réécrit rien.

---

# Partie B : modifier en cliquant sur l'aperçu

## 4. Comment font les autres

### 4.1 Lovable

- **Repère fixe.** Au moment de construire la page, chaque élément reçoit un numéro stable qui survit aux changements ; le
  clic retrouve l'endroit exact du code. Le code est tenu dans le navigateur sous forme d'arbre, et une retouche modifie
  l'arbre (jamais un rechercher-remplacer), puis seules les lignes changées partent.
  *Source* : https://lovable.dev/blog/visual-edits — *Preuve* : article de l'éditeur sur lui-même.
- **Ce qui a changé depuis** (documentation actuelle). Les « Visual Edits » sont remplacés par une barre d'outils à quatre
  modes : choisir des éléments, **modifier le texte sur place**, dessiner une annotation, commenter. **Il n'y a plus de
  réglage direct des couleurs, polices ou espacements** : on choisit l'élément et on dit le changement en mots. Le texte
  modifié sur place est gratuit (100 retouches par jour) ; une demande sur un élément choisi est payante comme une
  construction. On peut choisir plusieurs éléments d'un coup (touche ou cadre tiré à la souris).
  *Source* : https://docs.lovable.dev/features/visual-edit — *Preuve* : officiel.
- **Historique.** Chaque version se regarde sans rien changer, se marque d'un signet, montre ses changements de code ;
  revenir à une version remet **tout** le projet (pas une seule retouche) et ne rend pas ce qui a été payé ; les très vieilles
  versions se regardent mais ne se restaurent plus.
  *Source* : https://docs.lovable.dev/features/projects/history — *Preuve* : officiel.

### 4.2 Framer

- **Retouche ciblée.** Choisir une section avant d'écrire limite l'agent à cette zone ; « le reste de la page ne change
  pas ». *Source* : https://www.framer.com/help/articles/how-to-use-agents/ — *Preuve* : officiel.
- **Comment ils évitent de casser le reste** (récit de construction) : le modèle envoie une suite de petites retouches
  plutôt qu'un gros rendu ; il reçoit en retour **les rectangles** où chaque élément s'est posé ; un **contrôleur** de règles
  (disposition, typographie, contraste, accessibilité) répond à chaque sortie ; un rendu dans un navigateur sur le serveur
  sert de vérification, plus lente ; **chaque message peut être annulé** ; l'agent travaille **sur une copie du projet,
  jamais sur la version en ligne**, que l'on fusionne ou que l'on jette. Des évaluations tournent chaque nuit, et un
  échantillon de vraies séances est relu chaque jour.
  *Source* : https://www.framer.com/blog/building-framer-agents/ — *Preuve* : article de l'éditeur sur lui-même.
- **Modification sur la page** : en mode modification, tout ce qui se change est entouré de bleu ; texte, images et
  composants se changent dans le navigateur ; l'équipe est prévenue et le propriétaire garde la main sur la mise en ligne.
  *Source* : https://www.framer.com/updates/on-page-editing — *Preuve* : officiel.

### 4.3 Webflow

- *Le fait.* Une demande sur un seul élément peut changer une **classe partagée**, donc tous les endroits qui l'utilisent ;
  même chose pour une variable ou un composant. Webflow conseille : demander d'abord à l'IA qui utilise cette classe, faire
  créer une classe propre à ce cas, travailler dans une branche de page, sauvegarder le site avant, relire le journal des
  changements avant de publier. Le bouton « annuler » de l'assistant ne recule que d'une action dans la conversation.
- *Sources.* https://university.webflow.com/course-lesson/ai-guardrails-how-far-do-ai-changes-reach ;
  résumé du moteur pour https://help.webflow.com/hc/articles/34205154436243
- *Preuve.* Officiel (cours de Webflow) ; la page d'aide sur l'annulation est lue seulement en résumé.
- *Ce que SINA pourrait en faire.* Le Studio a déjà la bonne règle (styles limités à la section par `:scope`). Il faut la
  garder absolue : une retouche demandée sur un élément ne touche **jamais** l'allure générale ; un changement d'allure
  générale passe par `custom.structure`, et SINA le dit au client avant.

### 4.4 Wix (éditeur Harmony et son assistante Aria)

- *Le fait.* Choisir un élément l'étiquette automatiquement dans la conversation ; tout ce que fait Aria se retouche aussi à
  la main. **Aria ne peut modifier que la version ordinateur du site** : la version téléphone se retouche à la main. Aria
  travaille tout de suite, sans aperçu avant ; Wix prévient qu'elle peut donner des résultats inattendus.
- *Source.* https://support.wix.com/en/article/wix-harmony-editor-working-with-aria
- *Preuve.* Officiel.

### 4.5 Shopify (éditeur de thème, Sidekick, Canvas)

- **Repère fixe.** L'éditeur reconnaît sections et blocs par des attributs posés sur leur élément parent ; il prévient le
  thème par des événements (`shopify:section:select`, `shopify:block:select`, `shopify:section:load`…). Le thème doit garder
  l'élément choisi visible (un diaporama se déplace jusqu'à la diapositive choisie et s'arrête) et relancer ses scripts quand
  une section est redessinée.
  *Source* : https://shopify.dev/docs/storefronts/themes/best-practices/editor/integrate-sections-and-blocks — *Preuve* : officiel.
- **Sur téléphone** (17 juin 2026) : l'éditeur a été refait pour que **le site reste à l'écran pendant la retouche**, les
  réglages s'ouvrant dans un panneau compact ; une carte montre toute la structure ; les commandes sont plus grandes pour le
  doigt ; **toucher une section ou un bloc fait apparaître une demande à Sidekick qui sait déjà ce qui est choisi**.
  *Source* : https://changelog.shopify.com/posts/online-store-editor-with-sidekick-on-mobile — *Preuve* : officiel.
- **Canvas** (1er octobre 2026, accès anticipé) : Sidekick travaille directement sur les fichiers du thème ; on clique sur un
  élément pour le modifier ou on demande en conversation ; **« Sidekick vérifie son code et regarde des captures pour voir
  comment ses changements sont tombés »**. Canvas ne remplace pas encore l'éditeur.
  *Source* : https://www.shopify.com/news/introducing-canvas — *Preuve* : officiel. Selon des blogs (non relus), les changements
  de Sidekick effacent l'historique d'annulation et Canvas n'existe que sur ordinateur.
- **Blocs créés par l'IA** : Sidekick crée des blocs dans les sections qui l'acceptent ; le Studio n'en a pas besoin, mais
  le principe (l'IA ajoute dans un cadre prévu, validé par la plateforme) est le même que celui du thème unique.
  *Source* : https://shopify.dev/docs/storefronts/themes/architecture/blocks/ai-generated-theme-blocks — *Preuve* : officiel.

### 4.6 v0 (Vercel)

- *Le fait.* Le « mode design » : survol, clic, poignées et panneau de réglages (police, couleurs du texte et du fond,
  marges, bordure, arrondi, ombre, **texte modifié directement**). Les retouches s'affichent tout de suite mais restent **en
  attente** jusqu'à « Appliquer » ; il y a annuler, refaire, remettre l'élément comme avant, et **un bouton avant / après**.
  Chaque application crée une version que l'on compare ou que l'on annule. **Indisponible sur les écrans de téléphone.**
  *Source* : https://v0.app/docs/design-mode — *Preuve* : officiel.
- *Plainte.* Le 20 mars 2026, un utilisateur rapporte qu'une retouche d'un seul mot (taille, gras, police) a aussi changé
  les éléments voisins, alors qu'il avait demandé de ne rien toucher d'autre ; Vercel s'excuse, sans explication.
  *Source* : https://community.vercel.com/t/why-v0-design-mode-applies-unsolicited-changes-to-surrounding-elements-during-targeted-edits/36673
  — *Preuve* : avis. *Ma lecture* : « Appliquer » renvoie les retouches à l'IA, qui réécrit ; une retouche directe doit être
  appliquée par le code, pas par le modèle.

### 4.7 Bolt

- *Le fait.* Outil « choisir » : survol, clic, flèches pour passer d'un élément à l'autre ; double-clic pour **modifier le
  texte sur place** ; barre d'outils limitée à ce qui s'applique à l'élément (couleurs, taille, alignement, lien, texte de
  remplacement des images, cadrage de l'image). Les retouches s'accumulent en un **lot**, gratuit tant qu'il n'est pas
  enregistré ; on retire une retouche du lot d'un clic ; une fois enregistré, on ne peut plus annuler une seule retouche,
  seulement revenir à une version. Une demande écrite sur un élément part directement à l'IA.
  *Source* : https://support.bolt.new/building/visual-edits — *Preuve* : officiel.

### 4.8 Builder.io et Plasmic

- **Builder.io** : on choisit des éléments, on règle la disposition et les styles, l'IA écrit le code avec les composants
  existants, puis une demande de fusion se relit. Je n'ai trouvé ni comment l'élément est rattaché au code, ni d'annulation
  détaillée. *Source* : https://www.builder.io/c/docs/fusion-toolbar — *Preuve* : officiel, mais muet sur ces points.
- **Plasmic** (27 mai 2026) : pas encore d'IA maison ; des actions pour un agent extérieur (lire le projet, insérer, changer
  le style d'un élément, supprimer), et des conseils : faire **relire avant** un composant partagé, créer une variante plutôt
  que changer ce qui sert ailleurs, garder des règles permanentes (« ne touche pas l'en-tête ni le pied de page »), et
  **demander la liste de ce qui a changé**. *Source* : https://www.plasmic.app/blog/using-plasmic-through-chrome-devtools-mcp
  — *Preuve* : article de l'éditeur.
- **Readdy** (en plus) : les retouches directes (texte, lien, image) s'empilent dans une liste de **cinq au plus**, envoyées
  ensemble ; chaque envoi crée une version ; annuler, refaire, remettre. *Source* :
  https://docs.readdy.ai/features/select-to-edit-and-quick-edit.md — *Preuve* : officiel.

### 4.9 Ce qui ressort, point par point

| Besoin | Ce que font les meilleurs | Le Studio aujourd'hui |
|---|---|---|
| Repère fixe par élément | Lovable : numéro posé à la construction ; Shopify : attribut par section et par bloc | Section : oui (`data-ct`). Élément : chemin `nth-child`, qui bouge |
| Changer un texte sans IA | Lovable, v0, Bolt, Readdy, Framer : texte modifié sur place | Non : chaque mot passe par le modèle le plus fort, niveau élevé |
| Retouche ciblée sans casser | Framer : zone choisie, petites retouches, copie du projet ; Webflow : classe propre au cas | Oui : styles limités à la section ; risque restant, l'élément visé par un chemin instable |
| Annulation | Partout ; Bolt et v0 : retouches en attente annulables une à une | Dernière version seulement, 15 versions, invisible pour le client |
| Historique et avant / après | v0 : bouton avant / après ; Lovable : versions à regarder, signets | Non |
| Contrôles refaits après | Framer : contrôleur de règles à chaque sortie + rendu ; Shopify Canvas : code vérifié et captures | Règles de composition seulement |
| Sur téléphone | Shopify : site visible, panneau compact, grandes commandes, demande liée au choix | Clic = désigner ; pas d'aperçu avant de toucher |

## 5. Les plaintes, et ce qui rend une retouche agréable pour un débutant sur téléphone

**Les plaintes qui reviennent** (niveau avis, sauf mention)
- **« J'ai demandé un détail, il a changé autre chose. »** v0 (plainte de mars 2026 ci-dessus) ; Lovable (fil Reddit où l'on
  conseille d'écrire à chaque demande « ne change rien d'autre », lu seulement en résumé :
  https://redlib.hackliberty.org/r/lovable/comments/1la8biq/why_does_lovable_keep_on_breaking_old_codes) ; Webflow le
  reconnaît lui-même pour les classes partagées (officiel, 4.3).
- **« Retoucher le téléphone a cassé l'ordinateur. »** Fil du forum de Wix Studio, avril et mai 2026 (lu en résumé) :
  https://forum.wixstudio.com/t/mobile-editing-destroys-my-desktop-view-and-vice-versa/54227.md
- **« Je paie pour réparer ce que l'IA a cassé. »** Lovable écrit lui-même qu'annuler ne rend pas ce qui a été payé
  (officiel, 4.1) et conseille de changer de méthode après deux ou trois essais ratés (résumé du moteur pour
  https://docs.lovable.dev/tips-tricks/best-practice).
- **« L'éditeur n'est pas fait pour les débutants. »** Forum Shopify, juillet 2025, réponse d'un habitué : « vos problèmes
  ne sont que la pointe d'un très gros iceberg » (https://community.shopify.com/t/new-theme-editor-inquiry-not-for-beginners-like-me/552662/2) ;
  autre fil de 2026 : le nouvel éditeur « même pas utilisable sur petit écran » (lu en résumé).
- **Sur téléphone, les outils d'IA se retirent** : Aria (Wix) ne retouche pas la version téléphone ; le mode design de v0 est
  indisponible sur téléphone ; Canvas (Shopify) serait réservé à l'ordinateur (blogs). Seul l'éditeur Shopify refait en juin
  2026 met l'IA au doigt du marchand sur téléphone (officiel). **Le client du Studio, lui, sera souvent sur téléphone :
  c'est là que SINA peut faire mieux que tous.**

**Ce qui rend la retouche agréable** (tiré des documentations ci-dessus, et de la règle du propriétaire « clair d'abord »)
1. Le site reste à l'écran pendant qu'on demande (Shopify sur téléphone).
2. On voit ce qui est cliquable avant de toucher (Framer : tout entouré en mode modification).
3. Un mot se change sur place, tout de suite, gratuitement (Lovable, Bolt, v0).
4. Ce qui est en attente se voit, et chaque retouche s'annule seule (Bolt, Readdy, v0).
5. Un bouton avant / après (v0).
6. On revient à une version d'avant en la regardant d'abord (Lovable).
7. La demande sait déjà ce qui est choisi : pas besoin de l'expliquer (Shopify, Wix).
8. Ce qui a changé est dit en une phrase (Plasmic conseille de le demander à l'agent).

---

## 6. Pas vérifié

- La qualité réelle de Grammalecte et de LanguageTool sur des textes de vente en français : aucun essai fait ici.
- La licence exacte de LanguageTool et le nom du script serveur de Grammalecte : pages relues sans ces détails.
- Le texte de la directive 2024/825 (EUR-Lex illisible pour mon outil) et l'état de la loi française après octobre 2026.
- La page des audits de Lighthouse sur les images ; le seuil de poids à retenir.
- L'option de Playwright qui fait les contrôles d'un clic sans cliquer (`trial`) : elle n'est pas sur la page lue.
- Builder.io : comment un élément choisi est rattaché au code, et son annulation.
- L'historique d'annulation de Shopify Canvas et sa disponibilité sur téléphone (seulement des blogs).
- « MLLM as a UI Judge », les fils Reddit et Wix, la page d'aide de Webflow sur l'annulation : lus seulement en résumé.
- Aucun des chiffres des juges n'a été mesuré sur des sites du Studio. Le premier essai réel du lot 4 doit le faire.
- **Signalé, non recommandé** : le meilleur juge de WebVR (Kimi-K2.5) vient d'un fournisseur hors de la liste du propriétaire.

---

## Ce qu'il faut construire dans SINA, dans l'ordre

1. **Les contrôles du rendu, en un seul passage du navigateur, à 375, 768 et 1280** (gratuit, sans IA) : éléments qui
   débordent (avec leur section), boutons coupés ou recouverts (ombre comprise), sections vides, images non chargées, liens
   morts, texte d'exemple visible. *Le client verra* : un site où aucun bouton n'est coupé, aucun texte ne dépasse, aucune
   case vide, sur son téléphone comme sur son ordinateur.
2. **axe-core sur le rendu**, avec la règle des zones à toucher allumée exprès, et la mesure du contraste du texte posé sur
   les photos. *Le client verra* : des textes qui se lisent sur chaque photo et des boutons faciles à toucher du doigt.
3. **Lighthouse cinq fois, médiane**, accessibilité au moins 90 partout ; vitesse au moins 60 sur les sites hébergés par le
   Studio. *Le client verra* : « ton site s'ouvre vite et se lit bien », dit avec le vrai chiffre, jamais un chiffre inventé.
4. **Un juge à critères oui ou non**, tirés du plan de chaque page et des règles du propriétaire, qui voit téléphone,
   ordinateur, une capture après un geste et le HTML de la section, avec huit vrais refus du propriétaire en exemples ; le
   modèle le plus fort, séparé de l'auteur. *Le client verra* : un site déjà relu point par point avant qu'il le voie.
5. **Un tour de correction, une vérification, la meilleure version gardée** : choisie d'abord par les contrôles du code, puis
   par une comparaison « A ou B » faite deux fois en ordre inversé. *Le client verra* : la meilleure version, pas la dernière.
6. **Le texte relu par Grammalecte** sur le serveur du Studio, et **les promesses rattachées à une preuve** du dossier (sinon
   « À compléter »). Les textes du client ne sont jamais corrigés sans lui. *Le client verra* : aucune faute, aucune
   promesse qu'il ne pourrait pas tenir.
7. **Un repère fixe sur chaque élément modifiable**, posé à la construction (par exemple `data-ct-el`), à la place du chemin
   qui bouge. *Le client verra* : SINA change exactement ce qu'il a touché, même après d'autres retouches.
8. **Le texte modifié sur place, sans IA** : il touche un titre ou un bouton, le texte devient modifiable, il tape, c'est
   enregistré tout de suite, gratuit. SINA n'est appelée que pour ce qui demande du jugement (photo, disposition, « rends-le
   plus chaleureux »). *Le client verra* : un mot changé en deux secondes, sans attendre ni consommer son budget d'IA.
9. **Les contrôles refaits après chaque retouche, sur la section touchée** (débordement, bouton, contraste, zones à toucher,
   axe-core limité à la section) ; une retouche qui casse un contrôle n'est pas enregistrée et SINA le dit. *Le client
   verra* : une retouche ne casse jamais le reste du site.
10. **Avant / après et historique visibles** : un bouton pour comparer la section avant et après, la liste des versions en
    vignettes, « revenir à celle-ci » après l'avoir regardée ; chaque retouche s'annule seule. *Le client verra* : il ose
    essayer, parce que tout se défait.
11. **La retouche pensée pour le téléphone** : le site reste à l'écran, la demande s'ouvre en bas dans un panneau compact
    avec ce qui est choisi déjà écrit, de grandes commandes, et un mode où tout ce qui se touche est entouré avant de
    toucher. *Le client verra* : il retouche son site dans le bus, sans ordinateur.
12. **Une phrase de SINA après chaque retouche** : ce qui a changé, où, et ce qui a été vérifié (« le bouton est entier sur
    téléphone, le texte se lit sur la photo »). *Le client verra* : il sait toujours ce que SINA a fait et pourquoi c'est sûr.
