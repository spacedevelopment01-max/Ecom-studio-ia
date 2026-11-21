# Construire SINA de A à Z : ce que disent les sources

Recherche du 21 novembre 2026, demandée par le propriétaire : « je veux que tu ailles voir comment créer SINA comme nos
exigences de A à Z […] chercher toutes les infos sur ce genre d'IA comme SINA et voir comment on la construit […] à la
base SINA est censée tout faire toute seule avec simplement quelques questions et réponses […] ton avis je m'en fiche, je
veux de vrais résultats sur de vraies recherches approfondies ».

Cinq recherches : les produits qui font déjà une partie du travail de SINA (une vingtaine), les récits d'ingénierie des
équipes qui ont bâti les agents autonomes les plus réussis (Manus, Anthropic, Cognition, OpenAI, Shopify, Replit,
Lovable, Vercel, Cursor, Notion, Google, LangChain, Klarna), la recherche universitaire 2023-2026 sur les agents qui
créent seuls, les briques techniques, et le passage de quelques réponses à un travail complet. Ce document ne rapporte que
ce que disent les sources ; le niveau de preuve est noté : **officiel** (l'équipe ou l'éditeur), **étude publiée**,
**prépublication**, **test indépendant**, **avis** d'utilisateurs.

Complète `SINA-PLUSIEURS-PALIERS.md` (même jour : fiabilité, conversation, marque, site, publications).

---

## 1. Ce qui existe : personne ne fait encore toute la chaîne avec de bons résultats

- Dans les sources lues, **aucun produit ne fait toute la chaîne** (marque créée de zéro, angles, site, publications,
  publicités, suivi mensuel) avec des résultats jugés bons. Chacun en couvre un morceau : Pomelli, Holo et Predis partent
  d'une marque qui existe ; Looka et Lovart font la marque mais pas un vrai site ; Durable, Wix et Hostinger font le site
  avec une marque sommaire ; Sintra et Marblism font des publications sans identité construite. Aucune source ne parle
  d'angles marketing produits automatiquement.
- Tooltester, après avoir testé les créateurs de sites par IA : « l'intelligence n'est pas aussi avancée que les
  utilisateurs le voudraient » (test indépendant).

### Les défauts constatés partout
1. **Peu d'information au départ donne un résultat générique** : Durable (3 questions) « tous les modèles se
   ressemblent » ; Pomelli : consigne vague ou site pauvre donne des visuels faibles (tests et avis). Mais **plus
   d'information ne suffit pas si la chaîne qui construit est fragile** : Wix Harmony a rendu « l'un des pires sites »
   avec un résumé détaillé (test indépendant).
2. **Une bibliothèque commune fait des résultats qui se ressemblent** : Looka (une bibliothèque pour 20 millions
   d'utilisateurs), 10Web (le même dessin pour une boulangerie et une agence), Wix Harmony (la même police d'un essai à
   l'autre), AdCreative (« les mêmes modèles »).
3. **Deux façons de construire, deux défauts opposés** : les pièces assemblées (Relume, Framer, Durable, ADI) donnent
   des pages propres mais standard ; le code écrit librement (Harmony, Horizons, Manus) donne des pages cassées (pages
   vides, boutons morts, texte de remplissage, cartes coupées sur téléphone).
4. **L'IA invente** : Durable a écrit trois faux témoignages ; Sidekick a inventé une croissance de 887 % ; la publicité
   Gemini du Super Bowl a affirmé un faux chiffre sur le gouda ; Air Canada a été jugé responsable de ce qu'avait dit son
   agent (décision de justice, 2024).
5. **Le texte dans les images reste un point faible** (Lovart, Pomelli).
6. **Les plaintes sur l'argent dépassent souvent celles sur la qualité** : crédits brûlés sur les échecs, montées de
   forfait (Sintra, Lovart, Manus, AdCreative, Durable).

### Ce qui distingue les résultats jugés bons (constats isolés)
- Partir de vraie matière : le site, les photos, les réseaux du client (Pomelli : « tout ce que Pomelli crée est ancré
  dans cet ADN », officiel).
- Poser des questions avant de dessiner (Lovart, avis) ; Wix pose des questions qui s'adaptent aux réponses (officiel).
- Une couche qui garde la cohérence de marque d'un livrable à l'autre (Lovart, Typeface, Jasper).
- Un dessin pensé d'abord par des designers : Framer premier du seul test où tous ont reçu le même résumé.
- Seul Shopify publie sa façon de vérifier : juges réglés sur des experts (accord de 0,02 à 0,61, contre 0,69 entre deux
  experts humains), simulateur de marchand qui rejoue de vraies conversations avant chaque mise en ligne ; en 2026, un cas
  n'est gardé que si quatre modèles juges sont d'accord ; « un non honnête vaut mieux qu'une réponse fausse donnée avec
  assurance » (officiel).

---

## 2. Ce que la recherche a mesuré

### Ce qui est établi solidement
1. **Découper bat faire d'un seul coup** : plan, puis exécution par morceaux, puis contrôle. Confirmé par plusieurs
   équipes indépendantes sur les affiches (COLE, PosterAgent), les bannières (BannerAgency, MIMO) et les pages web (DCGen,
   LaTCoder).
2. **Un contrôle extérieur fait nettement monter la qualité** : voir le rendu, cliquer, vérifier. WebGen-Agent fait
   passer Claude de 26,4 % à 51,9 % de fonctions qui marchent sur un site entier, et l'aspect de 3,0 à 3,9 sur 5
   (prépublication). Se relire sans rien d'extérieur n'est pas fiable : sans retour extérieur, l'IA ne se corrige pas et se
   dégrade parfois (ICLR 2024, étude publiée).
3. **Créer un site complet qui marche reste difficile** : 40 à 50 % des fonctions marchent pour les meilleurs résultats
   publiés (WebGen-Bench, NeurIPS 2025). Refaire une page d'après une image n'est juste que dans 49 % des cas
   (Design2Code, étude publiée). L'aspect est bien mieux réussi que les interactions.
4. **Une IA juge mal la beauté** telle que la voient les designers : les juges automatiques ne dépassent pas 0,55
   d'accord avec dix designers professionnels, quand le hasard donne 0,50 ; un petit juge entraîné sur leurs avis atteint
   0,611 (TASTE, 2026). Une IA préfère ses propres textes (NeurIPS 2024). Sur la créativité marketing, les juges IA sont
   « faiblement et irrégulièrement » d'accord avec 678 créatifs (11 012 comparaisons) et ne peuvent pas les remplacer
   (Creativity Benchmark 2025).
5. **L'IA uniformise** : chaque création est meilleure, l'ensemble moins varié (Science Advances 2024 : +8,1 % de
   nouveauté, +10,7 % de ressemblance) ; les réponses des modèles se ressemblent bien plus entre elles que celles des
   humains, et ni le réglage du hasard ni une consigne « plus créative » ne comblent l'écart (PNAS Nexus).
6. **Les clients simulés ne remplacent pas de vrais clients** pour tester des visuels : aucune configuration ne retrouve
   plus de 2 effets humains sur 6 sur des logos, emballages et publicités (2026).
7. **Plusieurs agents aident quand le travail se découpe en parties indépendantes, nuisent quand les étapes
   s'enchaînent** : +80,9 % sur les tâches parallèles, −39 à −70 % sur les tâches séquentielles, erreurs multipliées par
   17 quand des agents travaillent sans se parler (Google, 180 configurations). Un agent seul avec une consigne soignée
   égale presque la meilleure discussion entre agents (ACL 2024). Plusieurs agents coûtent 2 à 20 fois plus (MIMO).

### Ce qui fait monter la qualité au premier essai
- **Le plan avant l'exécution** : présent dans tous les systèmes qui gagnent ; « planifier puis résoudre » bat « réfléchis
  étape par étape » et approche une consigne à 8 exemples (ACL 2023). Mais un bon plan ne suffit pas sans regard sur le
  résultat (GraphicBench).
- **Les exemples tirés de réalisations réussies** : aller chercher des mises en page proches fait mieux avec moitié moins
  de données (RALF, CVPR 2024) ; AdMuse et WebViSE rangent des « savoir-faire » tirés de réussites.
- **Plusieurs versions en parallèle plutôt que des retouches successives d'une seule** : de meilleurs taux de clic et de
  meilleures notes d'experts sur des publicités (Dow et al., 2010, étude publiée). Plus de calcul pour chercher et trier
  améliore les images (CVPR 2025), mais le meilleur trieur change selon la tâche.
- **Les retours humains précis** : les retours de designers sous forme de croquis ou de corrections directes valent
  mieux que des classements ; un petit modèle entraîné sur 1 460 annotations a battu GPT-5 (Apple 2025).
- **Des rôles différents pour lutter contre l'uniformité** (LLM Discussion, COLM 2024).
- **Mesures réelles en publicité** : des visuels faits entièrement par l'IA jusqu'à +19 % de taux de clic face à des
  experts sur 106 000 affichages Google, mais −31,5 % quand l'IA est signalée (document de travail NYU et Emory, non
  publié) ; écrire « intelligence artificielle » dans une description fait baisser l'intention d'achat (étude publiée,
  plus de 1 000 adultes).

### Ce qui reste non prouvé
- Aucun travail ne mesure un agent qui crée seul une identité complète (nom, logo, charte) face à des designers.
- Aucun essai ne compare une « agence » d'agents à un agent seul, jugés par des professionnels, sur un vrai travail.
- Aucun banc d'essai ne mesure la cohérence d'une marque sur plusieurs canaux.
- La plupart des notes de qualité publiées sont données par GPT-4o, juge dont TASTE montre la faiblesse.

---

## 3. Passer de quelques réponses à un travail complet

- **Toute l'information d'un coup vaut mieux qu'au compte-gouttes** : −39 % de performance en moyenne quand elle arrive
  par morceaux ; les modèles font des suppositions trop tôt « et ne s'en remettent pas » ; redonner tout d'un coup rétablit
  la performance (Microsoft et Salesforce, plus de 200 000 conversations, ICLR 2026).
- **Le choix des questions compte plus que leur nombre** : choisir la question qui réduit le plus l'incertitude fait
  gagner 38,1 % de tâches réussies (NeurIPS 2024) ; poser des questions sans méthode dégrade le résultat ; apprendre à
  s'abstenir tant qu'on n'est pas sûr fait gagner 22,3 % (MediQ, NeurIPS 2024).
- **Les modèles devinent au lieu de demander** : ils devinent seuls les exigences non dites dans 41,1 % des cas, et une
  consigne incomplète est deux fois plus fragile quand le modèle change.
- **Une IA qui interroge l'utilisateur obtient plus qu'une consigne écrite par lui**, et fait surgir des points qu'il
  n'avait pas prévus (GATE).
- **Les préférences se construisent devant les options** (Bettman, Luce et Payne, 1998) : quelques réactions à des images
  suffisent à guider la création (ViPer, ECCV 2024) ; environ 77 % des choix d'un utilisateur prédits à partir de paires
  d'images. Looka commence par faire choisir des exemples de logos.
- **L'enrichissement automatique réduit les questions mais doit être vérifié** : une adresse de site suffit à Pomelli
  pour le ton, les polices, les images et les couleurs ; mais les agents de recherche approfondie n'ont que 39 à 77 % de
  faits justes (14 modèles) et un lien valide ne prouve pas que la page soutient l'affirmation ; les premiers agents
  d'Anthropic choisissaient des fermes de contenus.
- **Montrer le plan avant d'agir** : Gemini montre son plan de recherche et le fait valider ; Spec Kit de GitHub suit
  cahier des charges, plan, tâches, exécution, avec une étape « clarifier » qui reporte les réponses dans le cahier.
- **Vérifier par des questions indépendantes du premier jet** : faits justes de 55,9 à 71,4, entités inventées de 2,95
  à 0,68 par réponse (chaîne de vérification, ACL 2024).
- **La fiabilité baisse avec la longueur de la tâche** : pour 80 % de réussite, la durée des tâches réussies est environ
  5 fois plus courte que pour 50 % (METR).
- **Ce que les sources établissent sur l'information minimale** : aucun nombre idéal de questions n'existe ; ce qui
  compte : les questions qui réduisent le plus l'incertitude, toute l'information rassemblée avant de créer, les goûts
  appris en montrant des options, l'enrichissement automatique vérifié, et partout la même chaîne : plan validé,
  vérifications entre les étapes, relecture avec un retour extérieur.

---

## 4. Comment les équipes ont bâti leurs agents

### Les principes sur lesquels toutes convergent
1. **Commencer simple, un seul agent, et n'ajouter une pièce que si une mesure la justifie** (Anthropic, OpenAI,
   Shopify, Cognition). Lovable : « nous avons supprimé presque tout le code de l'agent » ; avec plus de liberté l'agent
   « se perdait » ; ils sont passés à une chaîne d'outils prévisible.
2. **Peu d'outils, bien distincts** : clairs jusqu'à 20, flous de 20 à 50, au-delà « plusieurs façons de faire la même
   chose » (Shopify) ; Manus : moins de 20 fonctions de base.
3. **Le contexte est une ressource rare** : « le plus petit ensemble d'informations à fort signal » (Anthropic) ; des
   consignes rendues au moment où elles servent plutôt qu'en tête (« la mort par mille instructions », Shopify) ; Replit
   injecte de courts rappels au moment de la décision, au plus trois ou quatre à la fois, pour 90 % de coût en moins
   qu'en modifiant la consigne principale ; OpenAI Codex : un fichier d'instructions d'environ 100 lignes, « une carte,
   pas un manuel de 1 000 pages ».
4. **Des fichiers comme mémoire et une liste de tâches tenue à jour** : Manus (« todo.md », environ 50 appels d'outils
   par tâche), Anthropic (plus de 200 fonctions écrites en JSON, toutes marquées « échoue » au départ, cochées seulement
   après un test dans un vrai navigateur ; le JSON parce que le modèle l'écrase moins qu'un texte libre).
5. **Celui qui fait ne juge pas** : « les agents surnotent systématiquement leur propre travail » ; rendre un évaluateur
   séparé « sceptique » est « bien plus faisable » ; au départ Claude trouvait les défauts puis se persuadait d'accepter
   (Anthropic, officiel).
6. **Vérifier le résultat réel, pas ce que l'agent affirme** : Replit confie le test à un sous-agent qui clique dans un
   navigateur, contre les « interfaces Potemkine » (0,20 dollar par séance ; autonomie de 20 à plus de 200 minutes) ;
   Vercel v0 répare automatiquement les erreurs du texte brut du modèle (jusqu'à 10 % du temps) en moins de 250 ms.
7. **Évaluer en continu à partir d'échecs réels** : 20 à 50 tâches tirées d'échecs réels ; non-régression presque à
   100 % ; 75 % de réussite par essai ne donne que 42 % de chances de réussir 3 fois de suite ; lire les historiques avant
   de croire une note (Anthropic) ; Shopify rejoue ses échecs de production et a réduit son coût de service de 96 %.
8. **Revoir le cadre à chaque nouveau modèle et retirer ce qui ne sert plus** (Anthropic, Manus reconstruit 4 à 5 fois,
   Cognition).

### Le coût de la qualité
- Le cache divise le prix des parties déjà lues par 10 (Manus) ; le traitement différé coûte 50 % de moins (Anthropic,
  OpenAI, images comprises pour certains modèles).
- Un agent consomme environ 4 fois une conversation, plusieurs agents environ 15 fois (Anthropic).
- Le cadre planificateur, constructeur, évaluateur d'Anthropic : seul, 20 minutes pour 9 dollars ; avec le cadre,
  6 heures pour 200 dollars, pour un résultat bien meilleur.

### Les briques techniques décrites par les sources
- **Chaque appel payant est une étape enregistrée**, pour reprendre après une panne sans repayer (Inngest, Temporal,
  Restate, DBOS ; DBOS enregistre dans la base existante, SQLite pour commencer).
- **L'accord humain est une pause durable** qui n'occupe aucune machine, avec trois issues : oui, non, pas de réponse.
- **Une clé d'unicité pour toute action irréversible** (paiement, publication).
- **Une mémoire simple** : des fichiers et un état enregistré ; les services de mémoire spécialisés ont des chiffres
  contestés (le banc d'essai LoCoMo a 6,4 % de réponses attendues fausses).
- **Les cahiers de métier sous forme de « compétences »** chargées seulement quand elles servent (norme ouverte de
  décembre 2025), et les services extérieurs branchés par MCP.
- **Des traces de chaque étape et un petit jeu de cas réels** ; selon LangChain (1 300 équipes), 89 % ont des traces mais
  52 % seulement ont des évaluations, et la qualité est le premier frein (32 %).
- Le conseil d'Anthropic : commencer par appeler directement les modèles, car les cadres « ajoutent des couches qui
  cachent les consignes et les réponses ».

### Les points où les équipes se contredisent
- Un agent ou plusieurs (Cognition et Shopify contre ; Anthropic +90,2 % en recherche, Cursor des centaines d'agents).
- Les notes écrites par le modèle lui-même (Manus et Anthropic pour ; Cognition les juge incomplètes).
- Le juge automatique (cœur de l'évaluation chez Shopify ; « peu fiable » selon la boîte à outils d'Anthropic).
- La liberté de l'agent (Lovable l'a réduite ; Replit et Notion l'étendent).

---

## 5. La construction de SINA qui découle de ces sources

Chaque élément renvoie à ce qui précède. C'est un assemblage de ce que les sources ont mesuré ou décrit, pas un avis.

**A. Les fondations (avant toute création)**
- Un état durable par client dans la base : la fiche (mots exacts, refus, choix, avec date et portée) et un registre
  d'étapes en JSON, chaque étape cochée seulement après vérification réelle et verrouillée ensuite (§4, principe 4).
- Chaque appel payant enregistré comme une étape, l'accord du client comme une pause durable, une clé d'unicité pour
  chaque action irréversible (§4, briques).
- Des traces de chaque étape et un jeu de 20 à 50 cas tirés des vrais échecs du Studio, rejoué avant chaque changement ;
  non-régression presque à 100 % ; réussite mesurée sur plusieurs essais (§4, principe 7).

**B. Le recueil : peu de questions, toutes au début, et des choix à montrer**
- Enrichissement automatique d'abord : site, réseaux, avis publics, concurrents, vérifiés et cités (§3).
- Puis seulement les questions qui réduisent le plus l'incertitude, rassemblées au début (§3 : −39 % au compte-gouttes,
  +38,1 % avec les bonnes questions).
- Les goûts appris en montrant des options (planches d'exemples, paires d'images) plutôt qu'en questions écrites (§3).
- Un cahier des charges et un plan montrés au client et validés avant la première dépense (§3 : Gemini, Spec Kit).

**C. La production : des chaînes fixes, découpées, contrôlées de l'extérieur**
- Pour chaque livrable : plan, exécution par morceaux, contrôle extérieur (rendu, capture, clic, code), et un
  évaluateur séparé et sceptique (§2, établi 1 et 2 ; §4, principes 5 et 6).
- Les critères vérifiables sont jugés par le code et par des juges calibrés sur des humains ; **le goût n'est jamais
  confié à un juge IA seul** (§2, établi 4 : accord proche du hasard) : plusieurs versions en parallèle (§2 : Dow 2010),
  le client choisit, et un juge entraîné sur les verdicts du propriétaire sert seulement à écarter ce qui est sûrement
  raté (§2 : 0,611 avec un petit juge entraîné).
- Les pièces du site viennent d'un système de sections (propre) mais avec une variété imposée par des règles vérifiées,
  car l'IA uniformise (§1, défaut 2 et 3 ; §2, établi 5).
- Des exemples tirés de réalisations réussies, rangés et rappelés au bon moment (§2 : RALF, AdMuse, WebViSE).

**D. L'agent qui parle au client**
- Un seul agent principal, moins de 20 outils bien distincts ; des sous-agents seulement pour isoler une recherche ou un
  contrôle et rendre un résumé (§4, principes 1 et 2 ; §2, établi 7).
- Des consignes courtes, une « carte » qui renvoie aux cahiers chargés à la demande, et de courts rappels donnés au
  moment de la décision (§4, principe 3).
- Aucune invention : toute affirmation sur l'entreprise ancrée dans la fiche ; vérification par questions indépendantes
  (§1, défaut 4 ; §3).

**E. Le suivi et l'amélioration continue**
- Les échecs de production deviennent des cas, rejoués avant chaque changement (§4 : Shopify).
- Le cadre est revu à chaque nouveau modèle, et ce qui ne sert plus est retiré (§4, principe 8).
- Le coût de la qualité est assumé et mesuré : cache, traitement différé, et un plafond par travail (§4, coût).

---

## Principales sources

- Produits : [Pomelli](https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli/),
  [Wix](https://www.wix.com/press-room/home/post/now-live-wix-delivers-the-next-generation-of-web-creation-with-the-release-of-the-ai-website-builde),
  [Tooltester](https://www.tooltester.com/en/blog/ai-website-builder/),
  [test de Wix Harmony](https://www.flowcre8tive.com.au/post/is-wix-harmony-good-for-small-businesses-we-tested-it-to-find-out),
  [Durable](https://www.firmcritics.com/review/durable-ai/), [Looka](https://lumance.ai/blog/looka-logo-maker-an-honest-design-review-2026),
  [test commun](https://aisitebench.com/), [Shopify, agents en production](https://shopify.engineering/building-production-ready-agentic-systems),
  [Shopify, sélection des cas](https://shopify.engineering/sidekick-curation).
- Ingénierie : [Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus),
  [Cognition](https://cognition.com/blog/dont-build-multi-agents),
  [Anthropic, agents longs](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents),
  [Anthropic, planificateur et évaluateur](https://www.anthropic.com/engineering/harness-design-long-running-apps),
  [Anthropic, multi-agent](https://www.anthropic.com/engineering/multi-agent-research-system),
  [Anthropic, agents efficaces](https://www.anthropic.com/engineering/building-effective-agents),
  [OpenAI, guide](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf),
  [OpenAI Codex](https://openai.com/index/harness-engineering/),
  [Replit, rappels au moment de la décision](https://frontier.replit.com/decision-time-guidance/),
  [Replit, tests automatiques](https://frontier.replit.com/automated-self-testing/),
  [Lovable](https://lovable.dev/blog/how-we-built-lovable-and-why-we-keep-rebuilding-it),
  [Vercel v0](https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent),
  [Cursor](https://cursor.com/blog/dynamic-context-discovery), [Notion](https://www.notion.com/blog/notion-ai-more-for-less).
- Recherche : [WebGen-Bench](https://arxiv.org/abs/2505.03733), [WebGen-Agent](https://arxiv.org/abs/2509.22644),
  [Design2Code](https://arxiv.org/abs/2403.03163), [Sketch2Code](https://aclanthology.org/2025.naacl-long.198/),
  [COLE](https://arxiv.org/abs/2311.16974), [BannerAgency](https://arxiv.org/abs/2503.11060), [MIMO](https://arxiv.org/abs/2507.03326),
  [PosterAgent](https://arxiv.org/abs/2505.21497), [TASTE](https://arxiv.org/abs/2605.20731),
  [Creativity Benchmark](https://arxiv.org/abs/2509.09702), [plusieurs agents selon la tâche](https://arxiv.org/abs/2512.08296),
  [MAST](https://arxiv.org/abs/2503.13657), [auto-correction](https://arxiv.org/pdf/2310.01798),
  [conversations par morceaux](https://arxiv.org/abs/2505.06120), [Uncertainty of Thoughts](https://arxiv.org/abs/2402.03271),
  [MediQ](https://arxiv.org/abs/2406.00922), [exigences non dites](https://arxiv.org/abs/2505.13360),
  [GATE](https://arxiv.org/abs/2310.11589), [ViPer](https://link.springer.com/chapter/10.1007/978-3-031-72904-1_23),
  [prototypes en parallèle](https://hci.stanford.edu/publications/2010/parallel-prototyping/ParallelPrototyping2010-submitted.pdf),
  [Plan-and-Solve](https://preview.aclanthology.org/setup/2023.acl-long.147), [chaîne de vérification](https://aclanthology.org/2024.findings-acl.212/),
  [METR](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/),
  [uniformisation, PNAS Nexus](https://academic.oup.com/pnasnexus/article/5/3/pgag042/8529001),
  [Doshi et Hauser](https://pubmed.ncbi.nlm.nih.gov/38996021/), [retours de designers, Apple](https://arxiv.org/html/2509.16779),
  [faits justes des recherches automatiques](https://arxiv.org/html/2605.06635v1).
- Briques : [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview), [Inngest](https://www.inngest.com/docs/learn/durable-agents),
  [DBOS](https://docs.dbos.dev/ai/ai-quickstart), [Temporal](https://docs.temporal.io/develop/typescript/integrations/openai-agents),
  [mémoire par fichiers](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool),
  [Letta](https://www.letta.com/blog/benchmarking-ai-agent-memory/), [enquête LangChain](https://www.langchain.com/state-of-agent-engineering).
