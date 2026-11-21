<!-- Rapport complet de recherche du 21 novembre 2026, tel que rendu ; sujet : La création de sites par IA -->

# Comment les meilleurs font des sites par IA (2025-2026) : ce que SINA peut reprendre

Je n'ai modifié aucun fichier du dépôt. J'ai cherché sur Internet et lu les pages clés : deux articles de recherche en entier, une page d'aide de Relume et un article technique de Lovable. Pour le reste, je me suis appuyé sur les résumés de recherche.

Niveaux de preuve :
- **forte** : étude publiée ou norme officielle ;
- **moyenne** : document de l'éditeur ou article de recherche pas encore relu par des pairs ;
- **faible** : avis de blogs.

## 1. Les créateurs de sites par IA aujourd'hui

1. **Les meilleurs outils grand public assemblent des sections déjà éprouvées, et n'écrivent pas de code libre.** Squarespace Blueprint pose quelques questions, puis compose avec ses propres sections, ses paires de polices et ses palettes. Webflow crée la page d'accueil et, en même temps, des réglages communes (couleurs, textes, espacements). Le thème unique de SINA va donc dans le bon sens ; il faut le garder.
   - Sources : https://www.squarepros.io/blog/squarespace-blueprint-ai et https://webflow.com/blog/ai-site-builder
   - Preuve : moyenne.
2. **Relume fait le plan d'abord.** Le plan du site vient en premier. Chaque section reçoit un titre et une phrase qui dit son rôle, et c'est cette phrase qui sert à choisir la pièce dans une bibliothèque de plus de 1 000. Chaque pièce a plusieurs dispositions, et on peut la remplacer sans perdre le texte. Pour SINA : elle écrit d'abord le récit de l'accueil, avec le rôle de chaque section selon l'angle choisi, puis le Studio choisit la section et sa disposition.
   - Source : https://www.relume.ai/resources/publish/doc/how-to-create-and-edit-wireframes-for-your-relume-site
   - Preuve : moyenne.
3. **Le défaut des sections toutes faites : les sites d'un même métier se ressemblent.** C'est le reproche fait à Squarespace. Les règles de variété du Studio corrigent exactement ce défaut, il faut les garder bloquantes.
   - Source : https://www.squarepros.io/blog/squarespace-blueprint-ai
   - Preuve : faible.
4. **Les outils qui écrivent du code libre donnent la « moyenne » de tout ce que le modèle a déjà vu, quand rien ne les guide.** Ce sont v0, Lovable et Bolt. On obtient toujours les mêmes choses : la même police, un dégradé violet, trois cartes à pictogrammes, une petite pastille au-dessus du titre. Anthropic le reconnaît dans sa propre documentation (le modèle « converge vers le générique »).
   - Sources : https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics et https://vibecodekit.dev/ai-slop-design
   - Preuve : moyenne.
5. **Wix Harmony fait travailler son assistante sur la structure interne de Wix, pour qu'une petite modification ne casse pas la page.** Pour SINA : chaque changement passe par les réglages du thème, jamais par une réécriture libre.
   - Source : https://www.wix.com/blog/what-is-wix-harmony
   - Preuve : moyenne.

## 2. Sections et règles, ou création libre

1. **Ne pas tirer le site d'une image « dessinée » en écrivant du code libre.** Dans l'étude de référence (Design2Code), même le meilleur modèle oublie des éléments et se trompe de disposition. Les pages refaites à partir d'une image ne pouvaient remplacer l'original que dans 49 % des cas. Pour SINA : l'image dessinée sert de direction artistique (ambiance, couleurs, ordre des parties), puis elle se traduit en sections et dispositions du thème.
   - Source : https://aclanthology.org/2025.naacl-long.199/
   - Preuve : forte.
2. **Google Stitch dessine de beaux écrans, mais ses retouches sont fragiles et donnent un résultat différent d'une fois sur l'autre.** C'est la même leçon que le point 1.
   - Source : https://redwerk.com/blog/google-stitch-ai-vibe-design-tool/
   - Preuve : faible.
3. **La variété ne viendra pas du modèle tout seul.** Une analyse de 19 études montre que l'IA rend les créations plus semblables entre elles. Une autre étude montre que c'est vrai de tous les modèles, pas d'un seul. La variété doit donc être imposée par des règles vérifiées, comme le fait déjà `variete-sites.ts`.
   - Sources : https://research.tilburguniversity.edu/en/publications/generative-ai-makes-creative-output-more-homogeneous/ et https://academic.oup.com/pnasnexus/article/5/3/pgag042/8529001
   - Preuve : forte.
4. **Le modèle se trompe sur des pièces personnalisées qu'il ne connaît pas.** La documentation de v0 le dit. Pour SINA : lui donner un catalogue clair de chaque section (rôle, dispositions possibles, contenu attendu, une image de chaque disposition). Il ne faut pas compter sur le nom de la section pour qu'elle devine.
   - Source : https://v0.app/docs/design-systems-legacy
   - Preuve : moyenne.

## 3. Le contrôle de qualité automatique

1. **Une boucle de relecture sur captures d'écran.** Le Studio prend la capture, un modèle qui voit la critique, le site est corrigé, et on recommence pendant trois tours en gardant la meilleure version. Résultats de l'étude :
   - environ 11 % de qualité en plus avec un modèle Claude ;
   - seulement 1,5 % en plus quand on corrige sans regarder la capture ;
   - un juge qui note critère par critère est d'accord avec les humains dans 69,5 % des cas, contre 48,5 % pour une seule note globale.

   Pour SINA : captures sur téléphone et sur ordinateur, une note par critère, deux à trois tours au plus.
   - Source : https://arxiv.org/html/2604.05839
   - Preuve : moyenne (article pas encore relu par des pairs).
2. **Une liste de contrôle propre à chaque site, jugée sur les captures.** Avec cette méthode, le juge est d'accord avec des experts dans environ 91 % des comparaisons. Pour SINA : tirer la liste du plan du site et des règles du propriétaire (ouverture, boutons, preuves, variété).
   - Source : https://arxiv.org/abs/2507.04952
   - Preuve : moyenne à forte.
3. **Le juge a des préjugés connus.** Il favorise la réponse placée en premier, et il favorise parfois ce qu'il a écrit lui-même. Pour SINA : un juge différent de celui qui fait, et deux comparaisons avec l'ordre inversé. C'est la règle du propriétaire, « celui qui fait n'est jamais celui qui juge ».
   - Source : https://arxiv.org/html/2406.07791v9
   - Preuve : moyenne.
4. **Les critiques des modèles restent moins bonnes que celles des experts.** Ce qui se mesure doit donc se mesurer par le code, pas à l'œil du modèle :
   - les débordements, cherchés élément par élément en nommant le fautif, en largeur 375, 768 et 1280 ;
   - les éléments coupés, même quand la page ne défile pas de côté ;
   - les photos en double et les sections vides.
   - Sources : https://arxiv.org/pdf/2407.08850 et https://zenn.dev/orectic/articles/horizontal-overflow-detection-playwright?locale=en
   - Preuve : forte (critiques) et moyenne (méthode).
5. **Des seuils officiels à reprendre comme barrières.**
   - Chaque zone à toucher fait au moins 24 × 24 points (norme d'accessibilité WCAG 2.2) ; 44 est conseillé pour les boutons.
   - L'outil axe vérifie l'accessibilité automatiquement.
   - La boutique de thèmes Shopify exige une moyenne Lighthouse d'au moins 60 en vitesse et 90 en accessibilité (accueil, fiche produit, collection). Pour le seuil de 90, je n'ai trouvé qu'un ancien article de Shopify : je ne l'ai pas confirmé sur la page des exigences actuelles.
   - Sources : https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html et https://shopify.dev/docs/storefronts/themes/best-practices/performance/testing-for-performance
   - Preuve : forte.

## 4. Ce qui fait vendre, en règles vérifiables

1. **Le premier écran décide.** Les gens ne descendent que si le haut de la page leur donne envie, et la bande juste au-dessus du bas de l'écran est regardée deux fois plus que celle juste en dessous. Règle à vérifier sur le premier écran du téléphone (390 × 844) : un titre qui dit ce qu'on vend et pour qui, sans phrase de bienvenue, et le bouton principal visible en entier.
   - Source : https://www.nngroup.com/articles/page-fold-manifesto/
   - Preuve : forte.
2. **Pas de diaporama qui défile tout seul à l'ouverture.** Les visiteurs ne voient pas ce qu'il montre.
   - Sources : https://baymard.com/research-articles/homepage-carousel et https://conversionxl.com/blog/dont-use-automatic-image-sliders-or-carousels
   - Preuve : moyenne à forte.
3. **Sur une fiche produit, les avis sont la partie la plus consultée après les photos.** Une étude souvent citée donne 270 % d'achats en plus avec cinq avis ; je ne l'ai lue que de seconde main.
   - Source : https://baymard.com/research-articles/current-state-ecommerce-product-page-ux
   - Preuve : forte (Baymard), faible (le chiffre).
4. **Les faux avis sont interdits par la loi.** En France, c'est une pratique trompeuse depuis le 28 mai 2022 (article L121-4 du Code de la consommation). L'article L111-7-2 oblige aussi à dire si les avis sont contrôlés. Règle : la section avis n'existe qu'avec de vrais avis importés, accompagnés de la mention du contrôle. Sinon, on montre une preuve vraie : garantie, savoir-faire, vraies photos.
   - Source : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049571119
   - Preuve : forte.
5. **La livraison offerte est souvent ratée par les clients quand elle n'est affichée que dans un bandeau.** Règle : la mettre à côté du prix sur la fiche produit.
   - Source : https://baymard.com/blog/collections/product-page
   - Preuve : moyenne (je n'ai pas lu l'article complet).

## 5. La variété sans perdre la qualité

1. **Donner à SINA les trois leviers d'Anthropic** :
   - préciser chaque dimension (police, couleur, mouvement, fond) avec les vraies valeurs de la marque ;
   - lui donner des inspirations différentes à chaque client ;
   - lui donner la liste des choix trop banals qu'elle doit éviter (ceux du thème 1, point 4).
   - Source : https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics
   - Preuve : moyenne.
2. **Demander « plus original » ne suffit pas** : le modèle remplace un choix banal par un autre. Il faut donner des valeurs exactes.
   - Source : https://honello.com/blog/why-ai-websites-have-purple-gradients
   - Preuve : faible.
3. **Faire varier le récit, pas seulement les sections.** L'ordre des parties suit l'angle choisi par le client, qui est différent pour chaque client. C'est la méthode de Relume (thème 1, point 2) ; l'appliquer aux angles est ma proposition, non prouvée.
4. **Ajouter une comparaison des captures entre sites** (empreinte visuelle de l'accueil, comparée aux 12 derniers sites), en plus de la liste des pièces communes. Les chercheurs demandent des façons de travailler qui encouragent la variété. Ma proposition précise n'est pas prouvée.
   - Source : https://www.tilburguniversity.edu/current/press-releases/ai-making-creative-output-increasingly-similar

## 6. Modifier en cliquant sur l'aperçu

1. **Lovable donne un numéro fixe à chaque élément au moment de construire la page**, pour que le clic retrouve exactement ce qu'il faut changer. Les retouches simples (un texte, une couleur) se font sans appeler l'IA : c'est moins cher, plus rapide et sans erreur inventée. Pour SINA : chaque élément du thème porte un repère fixe (section, bloc, réglage), et un texte se modifie directement.
   - Source : https://lovable.dev/blog/visual-edits
   - Preuve : moyenne.
2. **Shopify signale déjà quelle section ou quel bloc est sélectionné dans l'aperçu**, et l'élément choisi doit rester visible à l'écran. Pour SINA : garder la même découpe en sections et blocs pour que le clic mène au bon réglage.
   - Source : https://shopify.dev/docs/storefronts/themes/architecture/sections/integrate-sections-with-the-theme-editor
   - Preuve : forte.
3. **Framer entoure tout ce qui est modifiable quand on passe en mode modification**, et réserve les changements de mise en page. Pour SINA : montrer au client ce qui est cliquable. Un changement de structure passe par SINA et les règles de variété.
   - Source : https://www.framer.com/updates/on-page-editing
   - Preuve : moyenne.
4. **Les retours qui désignent un endroit précis apprennent mieux que les notes ou les classements.** C'est vrai pour une correction faite directement ou un croquis. L'accord entre spécialistes est de 76 % sur les corrections directes, contre 49 % sur les classements. Pour SINA : enregistrer chaque demande avec l'élément visé et le changement exact, et s'en servir comme mémoire de ce que le client corrige.
   - Source : https://arxiv.org/html/2509.16779
   - Preuve : moyenne à forte.
5. **Après chaque modification, refaire les contrôles mécaniques sur la section touchée** (débordement, bouton entier, doublon). C'est ma proposition, dans l'esprit de Wix Harmony (thème 1, point 5).

## Les 5 changements qui auraient le plus d'effet

1. **Une relecture sur captures**, téléphone et ordinateur, par un juge distinct de celui qui fait. Il note critère par critère, avec une liste propre au site. Deux à trois tours, et on garde la meilleure version.
2. **Des barrières mesurées par le code avant tout affichage** :
   - débordements cherchés élément par élément ;
   - boutons entiers ;
   - zones à toucher d'au moins 24 points ;
   - accessibilité ;
   - Lighthouse d'au moins 60 en vitesse et 90 en accessibilité ;
   - ni photo en double, ni section vide.
3. **Garder le thème unique, avec le plan d'abord.** SINA écrit le récit et le rôle de chaque section. L'image dessinée ne sert que de direction artistique, traduite en sections existantes, jamais en code libre.
4. **Des règles de vente vérifiables sur le premier écran du téléphone** (titre clair, bouton entier, aucun diaporama automatique). Des preuves vraies uniquement, comme l'exige la loi française.
5. **Le clic sur l'aperçu avec un repère fixe par élément.** Les textes changent sans appel à l'IA, et les contrôles sont refaits après chaque changement.
