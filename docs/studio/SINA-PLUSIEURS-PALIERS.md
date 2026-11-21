# SINA plusieurs paliers au-dessus : ce que font les meilleurs

Recherche du 21 novembre 2026, demandée par le propriétaire : « on tourne en rond et on dépense de l'argent inutilement.
On doit passer plusieurs caps au-dessus pour SINA. […] va chercher sur internet tout ce qu'on doit faire pour la rendre
comme je veux […] et j'ai bien dit tout SINA ». Six recherches : les images, puis cinq domaines en parallèle (la
fiabilité d'un agent, la conversation avec le client, la marque et les textes, le site, les publications et le suivi).
Niveau de preuve noté pour chaque point : **officiel** (Anthropic, OpenAI, normes), **fort** (étude publiée),
**moyen** (praticien reconnu, plateforme, prépublication), **faible** (blog d'éditeur).

## Pourquoi SINA tourne en rond (diagnostic rattaché aux recherches)

1. **L'agent libre fait trop de choses** : il crée, il juge, il ajoute ses propres consignes (essai du 21 novembre : « un
   fil à plomb stylisé » transmis au dessinateur). Anthropic réserve l'agent libre aux tâches ouvertes et fait passer le
   travail répétable par des chaînes fixes avec des contrôles programmés (officiel).
2. **Des consignes empilées** : une règle ajoutée à chaque échec, à plusieurs endroits, sans retirer celles qui la
   contredisent. Plus on empile d'instructions, plus le modèle en oublie (étude IFScale, fort).
3. **Aucune batterie de cas qui fait foi** : rien ne vérifie qu'une étape réussie (marque du lot 2, angles du lot 3)
   l'est encore après un changement. C'est la cause des retours en arrière (Anthropic, évaluations d'agents, officiel).
4. **Des juges jamais réglés sur le propriétaire** : une note globale sur 10, des images jugées par lots, un juge de la
   même famille que celui qui écrit. Les juges préfèrent leur propre style, la réponse placée en premier et la plus longue
   (fort) ; la comparaison par paires suit mieux l'humain que la note (fort).
5. **Une seule tentative puis des corrections payantes**, au lieu de beaucoup de pistes bon marché puis un tri.
6. **Une technique d'images mal réglée** : le petit modèle d'OpenAI (Flare) au lieu du modèle de base (Sunburst), aucun
   réglage « fond plein » (cause de la brume et des taches depuis le 16 novembre), le texte écrit par OpenAI dans l'image.
7. **Le positionnement n'est pas verrouillé avant de créer** : 60 % des annonceurs « trouvent leur stratégie en créant »,
   ce qui coûte cher (IPA, moyen).

## Les dix piliers de la nouvelle SINA

### 1. La fiche client vivante et les étapes verrouillées
- Une fiche structurée, relue avant chaque question et chaque création : les mots exacts du client entre guillemets, ses
  refus, ses choix, avec leur date et leur portée (« pour les publications » ou « pour tout »). Le client la voit et la
  corrige (« ce que SINA sait de toi »). Les modèles perdent 39 % de qualité quand l'information arrive par morceaux ; un
  résumé tenu à jour réduit la perte (ICLR 2026, fort).
- Un registre d'avancement par client : chaque étape validée est verrouillée et ne se rouvre que sur demande explicite
  (Anthropic, harnais d'agents longs, officiel).
- Le cloisonnement entre clients se fait dans la base, jamais par une phrase de consigne.

### 2. Le positionnement d'abord, relu au client avant la première dépense
- L'ordre d'April Dunford : ce que le client ferait sans la marque, ce qu'elle a d'unique, ce que ça apporte, les clients
  qui y tiennent le plus, puis la catégorie (moyen).
- Le « travail à accomplir » en trois faces (pratique, émotionnelle, sociale) et les quatre forces (ras-le-bol, attrait,
  inquiétude, habitude) (moyen).
- La phrase « le seul » : si un concurrent peut la signer, on recommence (contrôle automatisable).
- SINA relit au client, en quelques lignes claires, son objectif, son client type, sa promesse, ses preuves ; il valide
  d'un geste (guide IPA, moyen).

### 3. Les questions : seulement celles qui changent le résultat, au bon moment
- Avant chaque question : la réponse n'est pas déjà dans la fiche, ne se devine pas des photos ou du site, et change la
  création. 1,5 à 2,7 fois moins de questions, plus de réussites (2025, fort).
- Les questions sur le but tout au début (réussite de 40 % à 78 %), celles sur les éléments à fournir avant la moitié du
  travail (fort).
- Choix en boutons, écriture libre toujours possible ; une recommandation avec une raison en une phrase et des images ;
  oser dire non à une mauvaise idée (complaisance des modèles, Anthropic, fort).
- Liste de référence des questions d'une très bonne agence : en annexe.

### 4. Les chaînes fixes pour créer, l'agent pour converser
- Marque, angles, site, publications passent par des chaînes écrites dans le code, avec des contrôles programmés entre
  les étapes ; l'agent converse, choisit la chaîne et explique (Anthropic, officiel).
- Chaque spécialiste reçoit un objectif, un format de sortie, ses sources et ses limites ; jamais l'historique entier.
- Une seule source par règle, regroupée par cahier de métier ; inventaire et suppression des contradictions ; quelques
  exemples plutôt que des listes de règles (Anthropic, contexte, officiel).
- Personne n'ajoute de consigne au dessinateur ou aux spécialistes en dehors des cahiers : ni SINA, ni Claude.

### 5. La largeur bon marché, puis le tri par duels
- Les idées sont du texte et coûtent quelques centimes : 150 à 300 pistes de noms par équipes aux consignes séparées
  (méthode Lexicon, moyen), dix idées de publication, plusieurs angles ; puis un tournoi par paires, chaque duel joué dans
  les deux sens (recherche « Chain of Ideas », moyen à fort).
- Casser l'uniformité de l'IA : demander plusieurs réponses avec leur probabilité et puiser dans les moins probables
  (1,6 à 2,1 fois plus de variété sans perte de qualité, moyen à fort). L'IA rend les créations plus semblables entre
  elles (19 études, fort) : la variété s'impose par des règles vérifiées.
- On ne paie le dessin que pour ce qui a gagné.

### 6. Des juges réglés sur l'œil du propriétaire
- Grilles en oui ou non par critère, jamais une note globale ; un juge par type de défaut ; l'ordre des critères mélangé
  et le jugement fait deux fois (l'ordre change le gagnant dans 16 à 39 % des cas, moyen).
- Comparaison par paires dans les deux ordres pour choisir entre deux images ou deux textes.
- Le juge décrit d'abord ce qu'il voit, zone par zone, avant de juger.
- Pour les textes, un jury d'une autre famille que Claude (moins cher et plus juste qu'un seul grand juge, fort).
- Le lecteur inconnu : un modèle sans aucune fiche dit ce qu'on vend, à qui et quoi faire ; sert à la clarté, jamais à
  prédire les ventes (fort sur la limite).
- Calibrage : on mesure l'accord du juge avec les verdicts du propriétaire (« Parfait », « nul », ses corrections) sur
  des cas mis de côté ; tant qu'il ne lui ressemble pas, il ne trie rien (Anthropic, Hamel Husain, Kroger : 81 % de
  prédictions justes avec 23 consignes tirées de 231 détails).
- Celui qui fait n'est jamais celui qui juge : sans signal extérieur, un modèle qui se relit peut se dégrader (Google
  DeepMind, fort).

### 7. La batterie de cas et la non-régression
- 20 à 50 cas tirés de vrais échecs pour commencer, avec des clients inventés et les verdicts figés du propriétaire
  (Anthropic, officiel). Les projets d'essai écartés ne servent jamais de cas.
- Deux batteries : les tests de capacité (pour progresser) et la non-régression (près de 100 %, chaque étape réussie y
  entre). Les résultats attendus ne se réécrivent jamais pour suivre une nouvelle consigne.
- Rejouée avant chaque changement de consigne ou de modèle, 3 essais par cas critique, en traitement différé (moitié
  prix) ; un recul bloque le changement. Les consignes sont versionnées comme du code.
- Plus tard seulement : l'amélioration automatique des consignes (GEPA, DSPy) sur ces cas, une fois les juges calibrés.

### 8. Les images
- Le modèle de base d'OpenAI (Sunburst) pour la marque et les publications ; le réglage « fond plein » pour toute photo ;
  plusieurs versions en une demande ; la retouche guidée (on entoure le défaut) au lieu de redessiner ; le logo en vrai
  fichier vectoriel (guide officiel OpenAI, officiel).
- La demande s'écrit dans l'ordre scène, sujet, détails, contraintes ; chaque image jointe reçoit son rôle numéroté ;
  chaque texte entre guillemets et épelé (officiel).
- OpenAI fait l'image sans texte ; une couche de mise en page pose le titre avec les vraies polices (méthode COLE,
  OpenCOLE, Canva, Lovart). Deux voies : des mises en page de graphiste du Studio, ou des modèles Canva remplis
  automatiquement.
- Le produit est comparé à la photo d'origine (forme, étiquette, couleur) avant d'être montré.
- Une image d'IA « bizarre » fait mal juger la marque par 42 % des gens (sondage DoubleVerify, 22 000 personnes, moyen).

### 9. Le site
- Le plan d'abord : SINA écrit le récit de l'accueil et le rôle de chaque section selon l'angle choisi, puis le Studio
  choisit la section et sa disposition dans le thème unique (méthode Relume, moyen). Garder le thème unique.
- L'image dessinée sert de direction artistique, jamais de modèle à recopier en code : même le meilleur modèle ne refait
  correctement une page d'après une image que dans 49 % des cas (Design2Code, NAACL 2025, fort).
- Relecture sur captures, téléphone et ordinateur, critère par critère (accord avec l'humain 69,5 % contre 48,5 % pour une
  note globale), deux à trois tours, on garde la meilleure version (moyen).
- Ce qui se mesure se mesure par le code : débordements élément par élément en 375, 768 et 1280, boutons entiers, zones
  à toucher d'au moins 24 points (WCAG 2.2), accessibilité, photos en double, sections vides, Lighthouse (officiel).
- Le premier écran du téléphone : un titre qui dit ce qu'on vend et pour qui, le bouton entier, aucun diaporama
  automatique (Nielsen Norman, Baymard, fort).
- Les faux avis sont interdits par la loi française depuis le 28 mai 2022 (L121-4 et L111-7-2 du Code de la
  consommation) : la section avis n'existe qu'avec de vrais avis.
- Le clic sur l'aperçu : un repère fixe par élément ; un texte change sans appel à l'IA ; les contrôles sont refaits
  après chaque changement (Lovable, Shopify).

### 10. Les textes, les publications, les publicités et le suivi
- Textes : les sept défauts relevés par 18 écrivains sur 1 057 paragraphes d'IA (mot maladroit, phrase mal construite,
  explication inutile, cliché, manque de précision, style ampoulé, temps qui changent ; fort) ; une liste française des
  tics de l'IA tirée des textes de SINA ; le concret et le sensoriel (+8,9 % de satisfaction par degré de concret, fort) ;
  la voix du client, mot pour mot, jamais inventée ; le test à trous (60 % de mots retrouvés).
- Angles : construits sur des moments d'achat différents (sept questions, au moins trois réponses qui changent ; Romaniuk
  et Sharp, moyen à fort) et des degrés de connaissance du client différents (Schwartz) ; contrôle par devinette (un juge
  doit retrouver quel client va avec quel texte).
- Publications : un calendrier du mois sur 2 à 4 temps forts et 3 à 5 thèmes ; jamais une semaine vide (Buffer,
  2,1 millions de publications) ; des carrousels dont la 2e image se comprend seule (0,55 % d'interaction contre 0,37 %
  pour une image seule) ; le test de l'inconnu et la grille en oui ou non avant tout affichage.
- Publicités : les trois angles × deux formats, notées avant d'être remises, livrées en pièces détachées (image sans
  texte, image avec texte, textes courts). La qualité de la création pèse 47 % de l'effet sur les ventes (Nielsen) ; chez
  Kroger, une vente coûtait 25 $ avec une création faible contre 11 $ avec une bonne (moyen).
- Vidéos, en dernier : images fixes validées, puis plans courts animés, puis montage de 9 à 15 secondes sous-titré avec
  du son ; le produit contrôlé image par image.
- Suivi : montrer le travail accompli augmente la valeur perçue même à résultat égal (Harvard, Buell et Norton, cinq
  expériences, fort) ; un objectif écrit suivi chaque mois ; cinq chiffres qui parlent à un commerçant, mesurés par le
  Studio (demandes, visites, ventes) ; prendre les devants aux pauses (52 % d'acceptation en fin d'étape, 62 % de refus en
  pleine tâche) ; un seul « ta journée est prête » par jour qui regroupe tout.

### Et les coûts
- Le « coût par sortie acceptée » (tout ce qui est dépensé, reprises comprises, divisé par ce qui est validé) suivi dans
  un tableau de bord, avec le taux d'acceptation du premier coup et l'accord entre juge et propriétaire.
- Le cache des parties fixes (lecture à 0,05 à 0,1 fois le prix), le traitement différé à moitié prix pour ce qui n'est
  pas urgent (officiel).
- Deux reprises au plus, puis SINA s'arrête et montre ; un contrôle gratuit avant chaque appel payant.

## L'ordre proposé (le plus d'effet pour le moins d'argent)

1. **La batterie de cas et les verdicts du propriétaire** (gratuit) : le socle qui empêche les retours en arrière.
2. **Le ménage des consignes** (gratuit) : une seule source par règle, plus aucune consigne ajoutée hors des cahiers.
3. **Les juges refaits et calibrés** (quelques euros, prix annoncé avant) : accord mesuré avec le propriétaire.
4. **Les chaînes refaites** : fiche et positionnement verrouillés, largeur puis tri, images bien réglées, texte posé par
   la mise en page, site par le plan.
5. **Un essai réel sur trois clients inventés**, budget fixé avec le propriétaire avant.

## Annexe : les questions qu'une très bonne agence pose toujours

SINA ne pose une question que si la réponse n'est pas déjà dans les photos, le site existant ou ce que le client a dit.

1. Pourquoi maintenant : qu'est-ce qui te décide à lancer ou refaire ta marque ?
2. Que vends-tu exactement, et qu'est-ce qui te rapporte le plus ?
3. Qu'est-ce que tu veux vendre davantage dans les mois qui viennent ?
4. Raconte-moi ton dernier client content : qu'est-ce qui l'a décidé ?
5. Quel client voudrais-tu attirer davantage, et dans quelle situation te cherche-t-il ?
6. Quel problème a-t-il juste avant de te trouver ?
7. Qu'est-ce qui le fait hésiter avant d'acheter (prix, confiance, délai) ?
8. Pourquoi te choisit-on plutôt qu'un autre ?
9. Qui sont tes concurrents, et en quoi se ressemblent-ils tous ?
10. Que peux-tu affirmer que les autres ne peuvent pas, et avec quelle preuve ?
11. Si tu fermais demain, qu'est-ce que tes clients regretteraient ?
12. Quels mots tes clients emploient-ils pour parler de toi (avis, messages) ?
13. Trois mots pour ta marque, et trois mots qu'elle ne doit jamais évoquer ?
14. Une marque que tu admires, et une à laquelle tu ne veux surtout pas ressembler ?
15. Qu'est-ce qui doit rester de ce que tu as déjà (nom, couleur, logo) ?
16. Où vends-tu : en ligne, en boutique, chez le client, dans quelle zone ?
17. Que doit faire un visiteur sur ton site : acheter, réserver, appeler, demander un devis ?
18. Tes prix, tes délais, tes conditions (livraison, retours, rendez-vous) ?
19. Quelles photos as-tu, et lesquelles te ressemblent le plus ?
20. Quelles preuves réelles as-tu : avis, années de métier, chiffres, labels ?
21. Sur quels réseaux es-tu, et lesquels t'amènent des clients ?
22. Combien veux-tu y consacrer, et à quoi verras-tu dans trois mois que ça marche ?
23. Y a-t-il des choses interdites ou obligatoires dans ton métier (mentions, règles) ?

## Principales sources

- Anthropic : [agents efficaces](https://www.anthropic.com/engineering/building-effective-agents),
  [contexte](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents),
  [évaluations d'agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents),
  [agents longs](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents),
  [système multi-agent](https://www.anthropic.com/engineering/multi-agent-research-system),
  [outils pour agents](https://www.anthropic.com/engineering/writing-tools-for-agents),
  [cache](https://platform.claude.com/docs/en/build-with-claude/prompt-caching),
  [traitement différé](https://platform.claude.com/docs/en/build-with-claude/batch-processing),
  [complaisance](https://www.anthropic.com/research/towards-understanding-sycophancy-in-language-models),
  [esthétique des interfaces](https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics).
- OpenAI : [guide des modèles d'images](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide),
  [guide des agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/).
- Recherche : [IFScale](https://arxiv.org/abs/2507.11538), [conversations par morceaux](https://arxiv.org/abs/2505.06120),
  [questions utiles](https://arxiv.org/html/2511.08798v2), [moment des questions](https://arxiv.org/html/2605.07937v1),
  [Design2Code](https://aclanthology.org/2025.naacl-long.199/), [relecture sur captures](https://arxiv.org/html/2604.05839),
  [liste de contrôle par site](https://arxiv.org/abs/2507.04952), [juges et biais](https://arxiv.org/abs/2306.05685),
  [préférence pour son propre style](https://arxiv.org/abs/2410.21819), [jury de modèles](https://arxiv.org/abs/2404.18796),
  [défauts de l'écriture d'IA](https://arxiv.org/abs/2409.14509), [variété par probabilités](https://arxiv.org/abs/2510.01171),
  [homogénéisation](https://research.tilburguniversity.edu/en/publications/generative-ai-makes-creative-output-more-homogeneous/),
  [auto-correction sans signal extérieur](https://arxiv.org/abs/2310.01798), [échecs des systèmes multi-agents](https://arxiv.org/abs/2503.13657),
  [GEPA](https://arxiv.org/abs/2507.19457), [Chain of Ideas](https://arxiv.org/pdf/2410.13185), [COLE](https://arxiv.org/pdf/2311.16974),
  [GenArtist](https://arxiv.org/html/2407.05600v1), [montrer le travail accompli](https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376),
  [assistants qui prennent les devants](https://dl.acm.org/doi/10.1145/3706598.3713357).
- Métier : [guide IPA des briefs](https://ipa.co.uk/media/12104/better-briefs-booklet_10_single-pages.pdf),
  [April Dunford](https://www.aprildunford.com/post/a-quickstart-guide-to-positioning),
  [travail à accomplir](https://hbr.org/2016/09/know-your-customers-jobs-to-be-done),
  [Lexicon](https://www.lennysnewsletter.com/p/naming-expert-david-placek),
  [voix du client](https://copyhackers.com/organize-your-voc-data/),
  [Nielsen Norman, premier écran](https://www.nngroup.com/articles/page-fold-manifesto/),
  [Baymard](https://baymard.com/research-articles/current-state-ecommerce-product-page-ux),
  [Buffer](https://buffer.com/resources/how-often-to-post-on-instagram/),
  [guide TikTok petites entreprises](https://ads.tiktok.com/business/library/TikTok_SMB_Creative_Playbook_2025.pdf),
  [étude Kroger](https://ppc.land/half-of-krogers-meta-and-dv360-spend-went-to-low-converting-ads-study-finds/),
  [Google Pomelli](https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli-photoshoot/),
  [Relume](https://www.relume.ai/resources/publish/doc/how-to-create-and-edit-wireframes-for-your-relume-site),
  [Lovable](https://lovable.dev/blog/visual-edits), [Canva](https://www.canva.dev/docs/connect/autofill-guide/),
  [loi sur les avis](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049571119).
