<!-- Rapport complet de recherche du 21 novembre 2026, tel que rendu ; sujet : La recherche universitaire sur les agents qui créent seuls -->

# Ce que la recherche a mesuré sur les IA qui font seules un travail de marketing ou de création (2023-2026)

**Comment j'ai lu.** J'ai fait une trentaine de recherches approfondies, puis j'ai lu les résumés de tous les travaux cités. Pour BannerAgency, MIMO, COLE et TASTE, j'ai aussi lu les parties « méthode » et « résultats ». Pour les articles de fin 2026 (numéros arXiv en 26xx), je n'ai lu que le résumé, et beaucoup n'y donnent pas de chiffres. Trois chiffres viennent de comptes rendus de seconde main : l'étude de NYU et Emory, le gain de taux de clic de CAIG, et le « 20 % » de Self-Refine, ce dernier confirmé ensuite dans le résumé. Je ne donne aucun avis personnel. Je n'ai modifié aucun fichier.

---

## 1. Marque, identité, publicité et campagnes

**Le nom et le logo de bout en bout.** Je n'ai trouvé aucun travail universitaire qui mesure un agent créant seul un nom, un logo et une charte. Une revue de 2024 sur la création de noms par l'IA dit que ce domaine « en est à ses débuts » (MTI, doi 10.3390/mti8070056). Pour les noms, l'essai notable reste antérieur aux grands modèles de langue (arXiv 1706.09335, 2017) : ses noms ont reçu des notes comparables aux noms écrits par des humains. Sur les logos, on trouve des générateurs de dessins vectoriels jugés par de petits groupes :
- SVGen (arXiv 2508.09168) : 15 designers d'interface et 15 développeurs.
- Chat2SVG (arXiv 2411.16602) : 17 participants ayant une formation en graphisme.
- GLDesigner (arXiv 2411.11435) : logos en lettres, choix par paires.

**La créativité marketing jugée par des professionnels.** *Creativity Benchmark* (2025, https://arxiv.org/abs/2509.09702) a fait comparer à l'aveugle des réflexions et des idées produites par plusieurs modèles pour 100 marques de 12 secteurs. 678 créatifs en activité ont fait 11 012 comparaisons par paires. Résultats :
- Les modèles sont très proches et aucun ne domine. Le meilleur ne bat le moins bon que 61 % du temps.
- Les juges automatiques (des IA) sont faiblement et irrégulièrement d'accord avec les humains. Les auteurs concluent qu'ils ne peuvent pas les remplacer.

**Les bannières publicitaires faites par plusieurs agents.**
- **BannerAgency** (2025, https://arxiv.org/abs/2503.11060). Quatre rôles : un stratège (but, ton, public), un concepteur du fond, un concepteur du premier plan avec un relecteur, et un développeur qui produit un fichier modifiable. Il est testé sur 400 demandes (100 logos, 13 formats). Il est noté de 1 à 5 par GPT-4o sur six critères, dont l'identité de marque. La concordance avec les notes humaines est de 0,85 à 0,95. Ses notes vont de 4,2 à 4,9, contre 1,2 à 3,6 pour DALL·E 3, FLUX et OpenCOLE. Après corrections guidées par des humains, la note humaine passe de 2,56 à 3,55. Coût : de 0,09 à 1,21 $ par bannière. Il n'est pas comparé à des designers.
- **MIMO** (2025, https://arxiv.org/abs/2507.03326). Un superviseur, une équipe de création (rédacteur, chercheur d'images), une équipe de relecteurs (texte, mise en page, fond) et un correcteur, avec trois tours au plus. Ensuite, cinq juges votent pour éliminer les versions une à une. Les notes de GPT-4o montent de 4,1-4,2 (image directe) à 4,65-4,88. Retirer le juge de cohérence de marque fait la plus forte baisse ; retirer le juge du texte ne change presque rien. Coût : 0,15 $ pour l'image directe, 2,87 $ pour le système complet, soit 2 à 20 fois plus.
- **AdMuse** (octobre 2026, arXiv 2610.40190). Il range des publicités réussies sous forme de « savoir-faire » réutilisables, puis aiguille la demande, produit plusieurs pistes, choisit et corrige. Le résumé ne donne aucun chiffre.

**Des mesures réelles de taux de clic.**
- **CAIG**, chez JD (WWW 2025, arXiv 2502.06823). Il apprend à faire des fonds d'images publicitaires grâce à un modèle qui prédit les clics. Un essai en ligne rapporte +7,4 % de taux de clic. Je n'ai vu ce chiffre que dans un compte rendu, et sans test de signification.
- **NYU et Emory**, Lee, Todri, Adamopoulos et Ghose (SSRN 5638311, 2025). Essai réel sur le réseau Display de Google, environ 106 000 affichages, plus un essai en laboratoire. Les visuels faits entièrement par l'IA obtiennent jusqu'à +19 % de taux de clic face à ceux d'experts humains. Les visuels humains retouchés par l'IA ne font pas mieux que les visuels humains. Dire que l'IA a servi fait baisser l'efficacité jusqu'à −31,5 %. C'est un document de travail non encore publié ; je l'ai lu à travers ses comptes rendus.
- **Essai sur X** (arXiv 2503.18238). Des équipes humain + IA écrivent de meilleurs textes, mais la performance globale des publicités est la même que celle d'équipes humaines.

**Les campagnes sur plusieurs canaux.** Je n'ai trouvé aucun banc d'essai public qui mesure la cohérence d'une marque d'un canal à l'autre. Une revue de 2025 (arXiv 2507.02097) le cite comme un manque. **Pixie** (arXiv 2611.10016, novembre 2026) a été jugé par des experts du marketing sur la justesse et la régularité, mais son résumé ne donne aucun chiffre.

---

## 2. Les agents qui créent un site entier

- **Design2Code** (2024, https://arxiv.org/abs/2403.03163). 484 vraies pages web à refaire à partir d'une capture. Dans un essai humain sur 100 pages, GPT-4V avec auto-correction pouvait remplacer la page d'origine dans 49 % des cas, et elle était jugée meilleure que l'originale dans 64 % des cas. Les mesures automatiques ne classent pas les méthodes comme les humains. Les travaux suivants découpent la page en morceaux : DCGen (arXiv 2406.16386), LayoutCoder, et LaTCoder, préféré par des juges humains dans plus de 60 % des cas.
- **Sketch2Code** (NAACL 2025, https://aclanthology.org/2025.naacl-long.198/). 731 croquis faits à partir de 484 pages, 10 modèles testés. Même les meilleurs lisent mal les croquis. Chaque retour d'un utilisateur simulé améliore le résultat en moyenne. Les experts en interfaces **préfèrent nettement l'agent qui pose des questions** à celui qui attend les retours ; le résumé ne chiffre pas cet écart.
- **Interaction2Code** (ASE 2025, https://arxiv.org/abs/2411.03292). Les modèles refont bien l'aspect d'une page, avec une ressemblance de structure de 0,60 à 0,78. Ils échouent sur les parties qui réagissent aux gestes : 0,40 à 0,56. Les auteurs relèvent dix types d'échecs.
- **WebGen-Bench** (NeurIPS 2025, https://arxiv.org/abs/2505.03733). 101 sites à créer de zéro, 647 vérifications faites par un agent qui navigue sur le site.
  - Meilleur résultat d'origine : 27,8 % des fonctions marchent (Bolt.diy avec DeepSeek-R1).
  - Un modèle de 32 milliards de paramètres entraîné sur 6 667 consignes atteint 38,2 %.
  - **WebGen-Agent** (arXiv 2509.22644) fait passer Claude 3.5 Sonnet de 26,4 % à 51,9 %, et l'aspect de 3,0 à 3,9 sur 5. Il s'appuie sur des captures d'écran et des retours d'exécution à chaque étape.
  - **WebLoop** (arXiv 2610.11543) entraîne un même modèle à produire, critiquer et corriger : +15,4 points (38,9 %). Le gain se retrouve dès le premier jet.
  - **WebGen-R1** (arXiv 2604.20398) est un apprentissage par récompenses qui contrôle la structure, le fonctionnement et l'aspect. Un petit modèle de 7 milliards y égale DeepSeek-R1 sur les fonctions et le dépasse sur l'aspect ; le résumé ne donne pas de chiffres.
- **WebDev Arena** (LMArena). Des humains votent entre deux sites anonymes. Je n'ai pas trouvé d'article de méthode ; les classements changent chaque mois et les écarts en tête sont faibles.
- **ArtifactsBench** (Tencent 2025, arXiv 2507.04952). 1 825 tâches, jugées par une IA guidée par une liste de contrôle propre à chaque tâche. Concordance annoncée avec les experts : 94,4 %.
- **UI-Bench** (arXiv 2508.20410). 10 outils qui créent des sites, 300 sites, plus de 4 000 jugements d'experts par paires.
- **Apple, retours de designers** (2025, arXiv 2509.16779). 1 460 annotations de designers ont servi à entraîner un modèle qui note les interfaces. Les retours sous forme de croquis ou de corrections directes valent mieux que des classements. Un petit modèle ainsi entraîné a battu GPT-5 dans les jugements humains.
- **WebViSE** (arXiv 2610.33929). Il tire des « savoir-faire visuels » de sites réels et les range pour guider la création. Le résumé annonce de meilleurs résultats d'aspect et en jugement humain, sans chiffres.

---

## 3. Graphisme et affiches de bout en bout

- **COLE** (2023, arXiv 2311.16974). La chaîne : un modèle qui écrit le plan, un pour le fond, un pour les objets, un pour la typographie, un assemblage modifiable, puis une relecture. Environ 100 000 visuels pour l'entraînement. Essai humain avec environ 20 personnes et 6 designers. Face à DALL·E 3, COLE gagne 69,6 % des fois sur la justesse du texte et 70,5 % sur le message transmis. Mais **les designers préfèrent DALL·E 3 pour la beauté**. Ils préfèrent COLE à CanvaGPT.
- **OpenCOLE** (CVPR 2024 atelier, arXiv 2406.08232). Une version reproductible, à égalité avec COLE selon GPT-4V. Les textes y sont souvent illisibles.
- **CreatiDesign** (ICLR 2026, arXiv 2505.19114). Un seul modèle d'image qui reçoit le produit, la mise en page et la consigne. 400 000 exemples. Il suit mieux l'intention que les autres modèles, en mesures automatiques.
- **Paper2Poster / PosterAgent** (NeurIPS 2025, arXiv 2505.21497). Trois temps : un analyseur, un planificateur de la mise en page, puis une boucle « peintre et commentateur » qui corrige les débordements. Les affiches de GPT-4o en une seule image séduisent au premier regard mais transmettent mal le contenu (39,9 % au questionnaire). Sa version open source fait mieux sur presque toutes les mesures avec 87 % de calcul en moins, pour environ 0,005 $ par affiche.
- **GraphicBench / GraphicTown** (arXiv 2504.11571). 1 079 demandes : couvertures de livre, cartes de visite, cartes postales, affiches. Les plans ressemblent à ceux d'humains, mais leur exécution échoue souvent : mauvais placements dans l'espace, agents qui se contredisent, aucun regard sur le résultat intermédiaire.
- **LayoutAgent** (arXiv 2509.22720). Il porte sur le placement d'objets dans une scène, pas sur le graphisme publicitaire.

**Peut-on faire confiance à une IA pour juger la beauté ? TASTE** (2026, https://arxiv.org/abs/2605.20731).
- Dispositif : 10 designers professionnels classent les images de 4 modèles récents (GPT Image 1.5, FLUX.2, Nano Banana 2, Seedream) sur 9 critères.
- Les juges automatiques testés (des IA qui regardent les images, et des noteurs de préférence) ne dépassent pas **0,55 d'accord**, quand le hasard donne 0,50.
- Les designers eux-mêmes sont peu d'accord entre eux, surtout sur l'harmonie des couleurs.
- Un petit juge entraîné sur leurs avis atteint 0,611.

---

## 4. Plusieurs agents à rôles, ou un seul agent ?

**Les gains mesurés.**
- MIMO : passer d'une consigne unique à plusieurs agents fait monter les notes de 4,0 à environ 4,6-4,8 sur 5 (GPT-4o juge).
- **LLM Discussion** (COLM 2024, arXiv 2405.06373). Des agents à rôles différents discutent en trois phases. Ils battent l'agent seul et le « débat » sur l'originalité. Mesure : 1 400 évaluations par 42 personnes, sur des tests de créativité.
- arXiv 2605.17885 (2026) : des équipes d'IA à plusieurs agents produisent des idées plus nouvelles que des équipes humaines (effet très fort, d = 1,50 ; 4 541 idées contre 341). L'utilité est égale. Elles battent aussi l'agent seul ; le résumé ne chiffre pas cet écart.

**Les pertes mesurées.**
- **Wang et al.** (ACL 2024, arXiv 2402.18272) : un agent seul avec une consigne soignée égale presque la meilleure discussion entre agents. La discussion n'aide que quand la consigne ne contient aucun exemple.
- **Google** (arXiv 2512.08296) : 180 configurations testées. Plusieurs agents gagnent +80,9 % sur les tâches qui se découpent en morceaux parallèles. Ils perdent 39 à 70 % sur les tâches où chaque étape dépend de la précédente. Les erreurs sont multipliées par 17 quand des agents travaillent sans se parler.
- **MAST** (NeurIPS 2025, arXiv 2503.13657) : 14 façons d'échouer, en trois familles (conception, mésentente entre agents, vérification). ChatDev ne réussit que 33 % des programmes, et des corrections simples ne gagnent que 15,6 %.

Coût : plusieurs agents coûtent 2 à 20 fois plus cher (MIMO). Je n'ai trouvé aucun essai qui compare, avec des juges humains, une « agence » complète (stratège, rédacteur, directeur artistique, critique) à un agent seul sur un vrai travail publicitaire.

---

## 5. Agents de marketing autonomes et clients simulés

- **Vending-Bench** (2025, arXiv 2502.15840). Une IA gère seule un distributeur sur une longue durée. Certaines parties dépassent un humain, mais **toutes les IA ont des parties qui déraillent** (commandes oubliées, boucles de panique), sans lien avec la longueur de la mémoire. La version 2 couvre une année simulée.
- **Prédire les réactions sur les réseaux sociaux** (arXiv 2604.19787, 2026). 1 511 vrais participants, 27 modèles. Les IA trouvent 70,7 % des réactions. Mais un simple classeur de textes fait mieux (0,36 contre 0,29 sur une mesure corrigée du hasard).
- **Qiu et al.** (arXiv 2502.12073) : sans exemples, les IA prédisent les actions moins bien qu'un ancien modèle de 2018 (BERT).
- **ConsumerSimBench** (arXiv 2605.17079). 1 553 sujets réels, 23 122 critères. Même les meilleures IA retrouvent moins de la moitié des réactions réelles ; ce chiffre vient d'un compte rendu.
- **« Seeing Is Not Perceiving »** (arXiv 2609.25677, 2026). Six expériences classiques sur des logos, emballages et publicités, déclarées à l'avance. Aucune configuration ne retrouve plus de 2 effets humains sur 6, et l'une donne même l'effet inverse. Les IA reproduisent moins de la moitié de la variété des réactions humaines.
- **SoMe** (arXiv 2512.14720) et **AD-Bench** (arXiv 2602.14257) mesurent l'analyse de données sociales et publicitaires, pas la création.

---

## 6. Ce qui fait monter la qualité au premier essai

- **Relire et corriger.** Self-Refine (2023, arXiv 2303.17651) : +20 points en moyenne sur 7 tâches, et les humains préfèrent le résultat. Mais Huang et al. (ICLR 2024, arXiv 2310.01798) montrent que **sans retour extérieur**, l'IA ne se corrige pas en raisonnement, et se dégrade parfois. Les gains les plus nets en création de sites viennent de retours extérieurs : capture d'écran, vérification par un agent qui clique (WebGen-Agent, PosterAgent).
- **Le juge.** Une IA préfère ses propres textes, et ce biais grandit avec sa capacité à les reconnaître (NeurIPS 2024, arXiv 2404.13076). Pour la beauté, les juges automatiques sont proches du hasard (TASTE).
- **Le plan avant l'exécution.** Il est présent dans tous les systèmes qui gagnent : COLE, BannerAgency, PosterAgent, DCGen. GraphicBench montre qu'un bon plan ne suffit pas sans regard sur le résultat.
- **Les exemples et la recherche documentaire.** RALF (CVPR 2024, arXiv 2311.13602) va chercher des mises en page proches et fait mieux avec moitié moins de données d'entraînement. AdMuse et WebViSE réutilisent des savoir-faire tirés de réalisations réussies.
- **Choisir parmi plusieurs.** Pour les images, plus de calcul pour chercher et trier améliore la qualité (Ma et al., CVPR 2025). Mais le meilleur trieur change selon la tâche (arXiv 2501.09732). MIMO élimine les candidats par vote.
- **Apprendre des retours humains.** Les retours de designers (Apple), les clics réels (CAIG ; CTOP, arXiv 2507.20227) et les récompenses sur le fonctionnement (WebGen-R1, WebLoop) donnent des gains mesurés, et WebLoop les retrouve dès le premier jet.
- **La diversité.** L'IA rend chaque texte meilleur mais tous les textes plus semblables entre eux (Doshi et Hauser, Science Advances 2024). Les réponses de différents modèles se ressemblent plus entre elles que celles de différents humains (arXiv 2501.19361). Donner des rôles différents aux agents sert justement à lutter contre cette uniformité (LLM Discussion).

---

## Ce que la recherche établit solidement

1. Découper le travail (plan, puis exécution par morceaux, puis contrôle) bat la création d'un seul coup, pour les affiches, les bannières et les pages web. C'est confirmé par plusieurs équipes indépendantes.
2. Un contrôle **extérieur** (voir le rendu, cliquer, vérifier) fait nettement monter la qualité, par exemple de 26 % à 52 % des fonctions qui marchent sur WebGen-Bench. Se relire soi-même, sans rien d'extérieur, est peu fiable.
3. Créer un site complet qui marche reste difficile : environ 40 à 50 % des fonctions marchent sur WebGen-Bench pour les meilleurs résultats publiés et vérifiés. L'aspect est bien mieux réussi que les gestes et les interactions.
4. Une IA juge mal la beauté telle que la voient les designers, et elle favorise ce qu'elle a produit elle-même.
5. L'IA uniformise : chaque création est meilleure, mais l'ensemble est moins varié.
6. Les clients simulés ne remplacent pas de vrais clients pour tester des visuels.
7. Plusieurs agents aident quand le travail se découpe en parties indépendantes. Ils nuisent quand les étapes s'enchaînent, et ils coûtent plus cher.

## Ce qui reste fragile ou non prouvé

1. Aucun travail ne mesure un agent qui crée seul une identité complète (nom, logo, charte) face à des designers.
2. Aucun essai ne compare une « agence » d'agents à un agent seul, jugés par des professionnels, sur un vrai travail de marque ou de publicité.
3. La plupart des notes de qualité (BannerAgency, MIMO, OpenCOLE) sont données par GPT-4o, juge dont TASTE montre la faiblesse. Les notes proches de 5 sur 5 sont donc à lire avec prudence.
4. Les preuves de taux de clic sont rares. Le +19 % de NYU et Emory est un document de travail non encore publié. Le +7,4 % de CAIG est donné sans test de signification. D'autres essais trouvent une égalité.
5. Aucun banc d'essai ne mesure la cohérence d'une marque sur plusieurs canaux.
6. Beaucoup de travaux de 2026 (AdMuse, WebViSE, Pixie, WebGen-R1) n'ont que des résumés sans chiffres et ne sont pas relus par des pairs. Les classements publics (WebDev Arena) changent tous les mois.
7. Les gains de créativité des équipes d'IA sont mesurés sur des tests d'idées, pas sur des campagnes qui vendent.
