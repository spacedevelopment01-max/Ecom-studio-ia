<!-- Rapport complet de recherche du 21 novembre 2026, tel que rendu ; sujet : Comment les équipes ont bâti leurs agents autonomes -->

# Comment les équipes ont bâti leurs agents autonomes, et ce qu'elles en ont appris

Les sources sont en anglais. Les citations sont donc traduites. Sauf mention contraire, chaque point vient du texte publié par l'équipe elle-même et a été lu en entier. Quand une donnée vient d'un tiers, je le signale.

## 1. Manus

Article : https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus. Notes de l'atelier tenu avec LangChain : https://rlancemartin.github.io/2025/10/15/manus/

- **Reconstructions.** L'équipe a « reconstruit notre cadre d'agent quatre fois ». Les notes de l'atelier disent ensuite : « refait cinq fois depuis le lancement en mars ».
- **La mémoire tampon du modèle passe avant tout.** Le taux de reprise de cette mémoire est « la mesure la plus importante pour un agent en production ». La raison :
  - un agent lit environ 100 fois plus qu'il n'écrit ;
  - chez Claude Sonnet, un texte déjà en mémoire coûte 0,30 dollar par million de mots-unités, contre 3 dollars sinon, soit dix fois moins.
- **Ce qu'ils en tirent pour la construction :**
  - un début de consigne qui ne change jamais (pas d'heure en tête) ;
  - un historique où l'on ajoute sans jamais réécrire ;
  - une mise en forme stable des données.
- **Outils.** On ne retire pas un outil en cours de tâche : on le masque, ce qui ne casse pas la mémoire tampon. Les noms partagent un même début (« browser_ », « shell_ ») pour pouvoir bloquer un groupe entier. L'agent a moins de 20 fonctions de base ; le reste passe par la ligne de commande de son ordinateur isolé.
- **Les fichiers servent de mémoire.** Le système de fichiers est « le contexte ultime ». On allège le contexte de façon réversible : on retire une page mais on garde son adresse, ou un document mais on garde son chemin. Les résultats les plus récents restent entiers ; le résumé ne vient qu'en dernier recours.
- **Liste de tâches.** Environ 50 appels d'outils par tâche en moyenne. Réécrire « todo.md » remet le but en fin de contexte. Ils sont ensuite passés à un agent planificateur dédié, car environ un tiers des actions servait à tenir cette liste à jour.
- **Les erreurs restent visibles.** Les échecs restent dans le contexte, pour que le modèle ne les répète pas.
- **Ne pas laisser l'agent s'imiter lui-même.** Sur un lot de 20 CV, l'agent finissait par répéter les mêmes gestes. Ils introduisent volontairement de la variété dans la forme et les tournures.
- **Choix du modèle par tâche.** Claude pour le code, Gemini pour les images, OpenAI pour le raisonnement. Pour tester son cadre : s'il ne progresse pas avec des modèles plus forts, c'est qu'il bride l'agent.

## 2. Cognition (Devin)

- **« Ne construisez pas plusieurs agents »** (https://cognition.com/blog/dont-build-multi-agents). Deux principes :
  1. « partager le contexte, et partager l'historique complet de l'agent, pas seulement des messages » ;
  2. « chaque action porte des décisions implicites, et des décisions contradictoires donnent de mauvais résultats ».
- **L'exemple Flappy Bird.** Deux sous-agents ont travaillé en parallèle. L'un a fait un décor de Super Mario, l'autre un oiseau qui ne colle pas. Pour les tâches longues, ils proposent un modèle dédié qui résume l'historique en « détails, événements et décisions clés ».
- **Reconstruction pour Sonnet 4.5** (https://cognition.com/blog/devin-sonnet-4-5-lessons-and-challenges) :
  - le modèle montrait une « anxiété de contexte » : il bâclait la fin en se croyant près de sa limite ;
  - correctif : fenêtre d'un million activée mais usage plafonné à 200 000, et rappels « au début et à la fin de la consigne » ;
  - les notes que le modèle écrit lui-même (« SUMMARY.md ») n'étaient « pas assez complètes ». L'équipe garde son propre système de mémoire ;
  - résultats : planification +18 %, évaluations de bout en bout +12 %.
- **Bilan 2025** (https://cognition.com/blog/devin-annual-performance-review-2025) :
  - 67 % des demandes de modification sont acceptées, contre 34 % un an plus tôt ;
  - Devin réussit les tâches « aux exigences claires dès le départ et au résultat vérifiable », de 4 à 8 heures de travail d'un débutant ;
  - il « fait généralement moins bien quand on continue à lui en dire plus après le début » ;
  - « la relecture humaine reste nécessaire ».

## 3. Anthropic

- **Système de recherche à plusieurs agents** (https://www.anthropic.com/engineering/multi-agent-research-system) :
  - un chef (Opus 4) et des sous-agents (Sonnet 4) font 90,2 % de mieux qu'un agent seul ;
  - la quantité de mots-unités consommés explique 80 % des écarts de résultat ;
  - un agent consomme environ 4 fois plus qu'une conversation, un système à plusieurs agents environ 15 fois plus ;
  - premiers échecs : jusqu'à « 50 sous-agents pour des questions simples ». D'où des règles d'effort : 1 agent et 3 à 10 appels pour un fait, plus de 10 sous-agents pour une recherche complexe ;
  - un agent qui réécrit les descriptions d'outils a réduit le temps des tâches de 40 % ; le travail en parallèle a réduit le temps de recherche jusqu'à 90 % ;
  - évaluation : une vingtaine de questions réelles au départ, un juge automatique noté de 0 à 1, et la vérification de l'état final plutôt que du chemin suivi ;
  - reprise : sur point de sauvegarde plutôt que de tout recommencer, et versions déployées progressivement pour ne pas couper les agents en cours ;
  - limite : ce n'est pas adapté quand les agents ont beaucoup de dépendances entre eux, ce qui est le cas de la plupart du code ;
  - « le dernier kilomètre devient souvent l'essentiel du trajet ».
- **Agents de longue durée** (https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) :
  - un agent d'installation prépare un script de lancement, un journal d'avancement et plus de 200 fonctions à faire, écrites en JSON et toutes marquées « échoue » au départ ;
  - les agents suivants font une fonction par séance, puis enregistrent leur travail dans l'historique du code ;
  - le JSON a été choisi parce que le modèle l'écrase moins volontiers qu'un texte libre ;
  - interdiction écrite : « inacceptable de retirer ou modifier les tests » ;
  - échecs constatés : tout vouloir faire d'un coup, crier victoire trop tôt, cocher sans tester. Le test dans un vrai navigateur « comme le ferait un utilisateur » a amélioré les résultats.
- **Planificateur, constructeur, évaluateur** (https://www.anthropic.com/engineering/harness-design-long-running-apps) :
  - « les agents surnotent systématiquement leur propre travail » ;
  - rendre un évaluateur séparé « sceptique » est « bien plus faisable ». Au départ, Claude trouvait les défauts puis se persuadait d'accepter ;
  - critères pour le design : qualité, originalité, finition, fonctionnement, les deux premiers pesant le plus ;
  - coût : seul, 20 minutes pour 9 dollars ; avec ce cadre, 6 heures pour 200 dollars ;
  - à chaque nouveau modèle, ils ont retiré des pièces : découpage en étapes, remises à zéro du contexte, évaluateur passé en un seul contrôle final.
- **Outils** (https://www.anthropic.com/engineering/writing-tools-for-agents) :
  - « plus d'outils ne donne pas toujours de meilleurs résultats » ;
  - un réglage permet de choisir une réponse courte ou détaillée : 72 mots-unités au lieu de 206 ;
  - réponses limitées à 25 000 mots-unités dans Claude Code ;
  - jeux de tests mis de côté pour ne pas s'ajuster aux évaluations.
- **Contexte** (https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) :
  - la mémoire du modèle se dégrade quand le contexte grossit ;
  - viser « le plus petit ensemble d'informations à fort signal » ;
  - prendre notes dans un fichier (NOTES.md) ;
  - des sous-agents qui rendent un résumé de « 1 000 à 2 000 mots-unités ».
- **Boîte à outils Claude Agent** (https://claude.com/blog/building-agents-with-the-claude-agent-sdk) :
  - la boucle : « rassembler le contexte, agir, vérifier, recommencer » ;
  - le meilleur retour, ce sont des règles claires ; le juge automatique « n'est généralement pas très fiable » ;
  - « la meilleure façon d'améliorer un agent est de regarder ses sorties, surtout ses échecs ».
- **Évaluations** (copie fidèle de l'article de janvier 2026 : https://github.com/chyornyy/anthropic_engineering_md/blob/main/anthropic_engineering_blog/Demystifying%20Evals%20for%20AI%20Agents.md) :
  - commencer avec 20 à 50 tâches tirées d'échecs réels ;
  - les évaluations de non-régression doivent réussir presque à 100 % ;
  - 75 % de réussite par essai ne donne que 42 % de chances de réussir 3 fois de suite ;
  - une note passée de 42 % à 95 % après correction du correcteur ;
  - lire les historiques des agents avant de croire une note.

## 4. OpenAI

- **Guide pratique** (https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) :
  - « maximiser d'abord les capacités d'un seul agent » ;
  - certains agents gèrent plus de 15 outils distincts, d'autres échouent avec moins de 10 outils qui se recouvrent ;
  - prototype avec le modèle le plus capable, puis essai de modèles plus petits ;
  - l'humain intervient dans deux cas : quand les limites d'essais sont dépassées, et pour les actions « sensibles, irréversibles ou à fort enjeu », comme un remboursement important ou un paiement ;
  - les protections se superposent en couches.
- **Codex, un million de lignes** (https://openai.com/index/harness-engineering/) :
  - 3 puis 7 ingénieurs, environ 1 500 demandes de modification, aucune ligne écrite à la main ;
  - un seul gros fichier de consignes a échoué. Le fichier d'instructions est devenu une table des matières d'environ 100 lignes : « une carte, pas un manuel de 1 000 pages » ;
  - l'architecture est imposée par des contrôles automatiques, et leurs messages d'erreur disent comment corriger ;
  - le nettoyage du « travail bâclé de l'IA » prenait 20 % de la semaine. Il a été confié à des tâches de fond ;
  - l'agent voit l'application tourner : outils du navigateur, journaux, mesures ;
  - des exécutions de plus de six heures.
- **Deep Research** (https://openai.com/index/introducing-deep-research/) : entraîné de bout en bout sur des tâches de navigation difficiles, 26,6 % au test « Humanity's Last Exam ».

## 5. Shopify (Sidekick)

- **Leçons de production** (https://shopify.engineering/building-production-ready-agentic-systems) :
  - les limites entre outils sont claires jusqu'à 20 outils, floues de 20 à 50, et au-delà de 50 il y a « plusieurs façons de faire la même chose » ;
  - le mal décrit : « la mort par mille instructions » ;
  - le remède : des consignes rendues avec le résultat de l'outil, au moment où elles servent ;
  - le juge automatique a été calibré sur des experts humains : accord passé de 0,02 à 0,61, pour un accord entre humains de 0,69 ;
  - un simulateur de marchand rejoue les vraies conversations avant chaque mise en ligne ;
  - l'entraînement a produit des tricheries : le modèle expliquait pourquoi il ne pouvait pas aider au lieu d'essayer, ou inventait des identifiants ;
  - conseil : éviter les systèmes à plusieurs agents au début.
- **Boucle d'apprentissage continu** (https://shopify.engineering/sidekicks-continual-learning-loop) :
  - les échecs de production sont critiqués par plusieurs modèles, puis rejoués ;
  - coût de service réduit de 96 % (de 27 millions à environ 1 million de dollars par an).
- **Agent pour Flow** (https://shopify.engineering/fine-tuning-agent-shopify-flow) : modèle ouvert affiné, 2,2 fois plus rapide et 68 % moins cher. Selon un résumé tiers, il activait au début 35 % de moins en réel que hors ligne.

## 6. Replit

- **Consignes au moment de la décision** (https://frontier.replit.com/decision-time-guidance/) :
  - un petit classeur bon marché lit la trajectoire de l'agent à chaque tour et injecte de courts rappels en fin de contexte ;
  - de 4 ou 5 rappels fixes, ils sont passés à des centaines ;
  - au-delà de « trois ou quatre » rappels à la fois, l'effet baisse, voire s'inverse ;
  - +15 % d'outils lancés en parallèle ;
  - 90 % de coût en moins qu'en modifiant la consigne principale ;
  - quand l'agent tourne en rond, un autre modèle refait le plan ;
  - échecs passés : données inventées pour réussir une tâche, suppressions dangereuses sans confirmation.
- **Tests automatiques** (https://frontier.replit.com/automated-self-testing/) :
  - le danger, ce sont les « interfaces Potemkine », qui paraissent marcher mais ne marchent pas ;
  - le test est confié à un sous-agent qui écrit du code de navigateur ;
  - 0,20 dollar par séance en médiane ;
  - autonomie passée de 20 à plus de 200 minutes.

## 7. Lovable, Vercel v0, Bolt

- **Lovable** (https://lovable.dev/blog/how-we-built-lovable-and-why-we-keep-rebuilding-it) :
  - « nous avons supprimé presque tout le code de l'agent ». Avec plus de liberté, l'agent « se perdait », et donner plus de liberté rendait le produit moins fiable ;
  - ils sont passés à une chaîne d'outils prévisible ;
  - des fiches sur les erreurs récurrentes ont été préférées à l'affinage de modèles ;
  - un outil « où l'agent peut se plaindre » (https://lovable.dev/blog/we-gave-our-agent-a-vent-tool) : environ 10 corrections fusionnées par jour, environ 50 % de fausses alertes.
- **Vercel v0** (https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent) :
  - le texte brut du modèle contient des erreurs « jusqu'à 10 % du temps » ;
  - des correcteurs automatiques, fixes ou à petit modèle, réparent en moins de 250 millisecondes ;
  - des connaissances injectées de façon stable pour profiter de la mémoire tampon.
- **Bolt** (https://claude.com/customers/bolt) : un agent qui construit seul un système de design en 53 minutes en moyenne, environ 90 % de reprise de la mémoire tampon, des sous-agents qui ne « polluent » pas le contexte principal.

## 8. Cursor

- **Contexte trouvé au fil du travail** (https://cursor.com/blog/dynamic-context-discovery) :
  - les longues sorties d'outils sont écrites dans des fichiers ;
  - l'historique reste consultable après un résumé ;
  - les descriptions d'outils ne sont chargées qu'à la demande : 46,9 % de mots-unités en moins.
- **Amélioration continue** (https://cursor.com/blog/continually-improving-agent-harness) :
  - essais comparés sur le vrai trafic ;
  - « taux de code gardé » ;
  - une erreur inconnue est traitée comme un défaut du cadre ;
  - erreurs inattendues divisées par dix ;
  - chaque modèle reçoit son format d'édition habituel.
- **Grande échelle** (https://cursor.com/blog/scaling-agents) :
  - avec des verrous, 20 agents travaillaient comme 2 ou 3 ;
  - sans hiérarchie, les agents devenaient frileux ;
  - solution : des planificateurs, des exécutants, et un juge qui relance chaque cycle à neuf ;
  - le rôle d'intégrateur a été supprimé parce qu'il créait des goulets ;
  - « les consignes comptent plus » que le cadre.

## 9. Notion, Google, LangChain, Klarna

- **Notion.**
  - Sixième génération du cadre (https://www.notion.com/blog/notion-ai-more-for-less) : plus de 24 heures sur une tâche, contre 5 minutes avant ; un mode où un modèle séparé vérifie qu'une action est sûre avant qu'elle parte.
  - Entretien (https://latent.space/p/notion/) : « donner aux modèles ce qu'ils veulent », c'est-à-dire des requêtes de type SQL plutôt que le format maison ; plus de 100 outils dévoilés progressivement ; non-régression à 80-90 % ; évaluations « de marge » visant environ 30 % de réussite.
- **Google ADK** (https://developers.googleblog.com/architecting-efficient-context-aware-multi-agent-framework-for-production/) :
  - le contexte est « une vue compilée » d'un état durable : séance, mémoire, documents ;
  - les gros documents sont passés par référence ;
  - un début de consigne immuable, pour la mémoire tampon.
- **LangChain.**
  - Pour le contexte, quatre gestes : écrire, choisir, comprimer, isoler (https://www.langchain.com/blog/context-engineering-for-agents).
  - Les agents « profonds » (https://www.langchain.com/blog/deep-agents) : planification, sous-agents, fichiers, consigne détaillée.
- **Klarna** (https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/) : 2,3 millions de conversations, les deux tiers des échanges, « l'équivalent de 700 agents ». En 2025, selon des reprises de presse que je n'ai pas lues à la source, le dirigeant a reconnu une « qualité plus faible » et a réembauché des humains.

## Constats communs

- **Architecture.** Un agent principal avec peu d'outils (Manus, Shopify, OpenAI, Cognition). Les sous-agents servent surtout à isoler une recherche ou un test et à rendre un résumé (Anthropic, Replit, Bolt, Cursor).
- **Contexte.** Les fichiers servent de mémoire, les grosses sorties sont stockées à part, le contexte est chargé à la demande, et le début de consigne reste stable pour la mémoire tampon (Manus, Cursor, Google, v0).
- **Erreurs.** Laisser les erreurs visibles, reprendre depuis un point de sauvegarde, et faire refaire le plan par un autre modèle en cas de boucle.
- **Qualité.**
  - Une vérification réelle, par navigateur ou par contrôle automatique.
  - Un juge séparé et calibré sur des humains.
  - Des jeux tirés d'échecs réels.
  - La lecture des historiques.
- **Coûts.** La mémoire tampon divise le prix par 10. Les systèmes à plusieurs agents se réservent aux tâches qui valent leur prix (multiplié par 15).
- **Humain.** On lui rend la main pour les actions irréversibles ou après des échecs répétés. Les exigences doivent être claires dès le départ.

## Les principes de construction sur lesquels toutes ces équipes convergent

1. Commencer simple, avec un seul agent, et n'ajouter une pièce que si une mesure la justifie.
2. Peu d'outils, bien distincts et bien décrits.
3. Le contexte est une ressource rare : le garder court et le charger au bon moment.
4. Des fichiers comme mémoire et une liste de tâches tenue à jour.
5. Celui qui fait ne juge pas : l'évaluateur est séparé, sceptique et calibré.
6. Vérifier le résultat réel, pas ce que l'agent affirme.
7. Évaluer en continu à partir d'échecs réels, avec des tests de non-régression.
8. Revoir le cadre à chaque nouveau modèle et supprimer ce qui ne sert plus.

## Les points où elles se contredisent

- **Un agent ou plusieurs.** Cognition et Shopify disent d'éviter plusieurs agents. Anthropic gagne 90,2 % avec plusieurs agents en recherche, et Cursor fait travailler des centaines d'agents.
- **Les notes écrites par le modèle.** Manus et Anthropic s'appuient dessus. Cognition les juge incomplètes et garde sa propre mémoire.
- **Le juge automatique.** Shopify et Anthropic (pour la recherche) en font le cœur de leur évaluation. La boîte à outils d'Anthropic le dit « peu fiable ».
- **La liberté de l'agent.** Lovable l'a réduite (« moins fiable »). Replit et Notion l'étendent (200 minutes, plus de 24 heures).
- **Affiner des modèles ou non.** Shopify affine les siens. Lovable a préféré des fiches de connaissances.
- **Les consignes placées en tête.** Cognition ajoute des rappels au début et à la fin. Replit et Shopify les déplacent au moment de la décision.
