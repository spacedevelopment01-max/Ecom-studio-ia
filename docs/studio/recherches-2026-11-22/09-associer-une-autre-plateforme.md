# Associer Claude à une autre plateforme pour finir SINA

Recherche du 22 novembre 2026, faite sur Internet (pages lues une par une). Aucun appel payant à une IA, aucun autre
fichier du dépôt modifié.

**La question du propriétaire :** « Est-ce que je peux associer Claude à une autre plateforme pour finir la
construction de SINA et la rendre encore meilleure ? »

**Niveaux de preuve :**
- **officiel** : page de l'éditeur ou du classement lui-même ;
- **classement indépendant** : épreuve tenue par quelqu'un qui ne vend pas le modèle (Vals AI, Artificial Analysis,
  Design Arena, Scale) ;
- **étude** : article de recherche (souvent pas encore relu par des pairs) ;
- **éditeur** : chiffre donné par le vendeur lui-même, ou blog d'un concurrent ;
- **mon avis** : proposition de ma part, non vérifiée.

Les prix sont en dollars, comme sur les pages officielles. Pour les euros : 1 € = 1,0990 $ (taux de la Banque centrale
européenne du 20 novembre 2026, déjà utilisé dans la recherche 08).

---

## En bref

- **Oui, c'est possible, et le Studio le fait déjà à deux endroits sans le dire comme ça** : le code des sites est écrit
  par GPT-6.2 Sol d'OpenAI (choix du 19 novembre, `src/lib/syna-agent/dessin/job.ts`) et relu par Claude ; les images
  sont créées par OpenAI et relues par Claude. Celui qui fait n'est déjà pas de la même famille que celui qui juge.
- **Claude n'est pas le meilleur partout.** En novembre 2026, il est en tête quand il faut construire tout un projet
  pas à pas (Design Arena, épreuve « agents »), mais Google (Gemini 4 Neon dans Antigravity) fait aussi bien pour moins
  cher et plus vite, et GPT-6.2 Sol fait une page web d'un seul coup un peu mieux, pour deux fois moins cher au mot.
- **Ce qui marche, d'après les études :** un relecteur d'une autre famille, qui commente sans écrire. Deux relectures
  de familles différentes trouvent plus d'erreurs que deux relectures du même modèle (56,7 % contre 42,7 % des erreurs
  cachées). **Ce qui ne marche pas :** deux agents qui écrivent dans le même code, et un second outil d'écrans (v0,
  Figma Make) qui ferait les sites d'une deuxième façon.

---

## 1. Les autres agents qui écrivent du code : ce que disent les classements

### Attention avant de lire les chiffres

Les classements ne mesurent pas tous la même chose, et beaucoup de pages qui les recopient se contredisent. Le même
modèle peut gagner ou perdre 20 points selon l'**outillage** qui l'entoure (Claude Code, Codex, Antigravity, ou un
outillage neutre). Le classement « SWE-bench Verified » est **saturé** : les meilleurs sont à 96-97 %, il ne départage
plus personne. Je n'ai gardé que des pages lues moi-même, avec leur date.

### Le tableau

| Classement (date de la page) | Qui est en tête | Où est Claude | Niveau | Lien |
|---|---|---|---|---|
| Artificial Analysis, indice des agents qui codent (version 2.1 : trois épreuves, page de 2026 sans date précise) | Antigravity + Gemini 4 Neon : **59**, 6,86 $ et 30 min par tâche | Claude Code + Fable 5.2 : 58 (7,51 $, 31 min) ; Claude Code + Opus 5.5 au plus haut : 58 (12,61 $, 1 h 06) | classement indépendant | https://artificialanalysis.ai/agents/coding-agents/comparisons/antigravity-cli-vs-claude-code |
| Même indice, Codex | Codex + GPT-6.2 Astra : **53** (3,20 $ à 5,12 $) ; GPT-6.2 Sol : 50 pour 0,90 $ | Claude Code devant Codex de 5 points, mais 2 à 14 fois plus cher par tâche | classement indépendant | https://artificialanalysis.ai/agents/coding-agents/comparisons/antigravity-cli-vs-codex |
| Design Arena, épreuve « agents » (22 nov. 2026) | **Claude Opus 5.5 : 1439** (note des duels), 68,9 % de victoires | 1er ; GPT-6 Astra 2e (1391) ; Gemini 4 Carbon 9e (1303) | classement indépendant (votes du public) | https://www.designarena.ai/leaderboard |
| Design Arena, page web écrite d'un seul coup (22 nov. 2026) | **GPT-6.2 Sol : 1402** | Fable 5.2 2e (1393) ; Opus 5.5 **7e (1382)** ; Gemini 4 Neon 5e (1389). Les sept premiers tiennent en 20 points | classement indépendant | https://www.designarena.ai/leaderboard/code |
| Design Arena, outils qui montent un site (22 nov. 2026) | **Replit : 1268**, puis Anything, Lovable (1243) | Claude Code n'y figure pas. Figma Make 9e (1211), v0 12e (1190), Bolt 13e (1182) | classement indépendant | https://www.designarena.ai/leaderboard?tab=builders |
| Vals AI, Terminal-Bench 2.0 (4 juin 2026, anciens modèles) | GPT 5.5 : **73,2 %** | Opus 4.8 : 70,0 % ; Opus 4.7 : 68,5 % | classement indépendant | https://www.vals.ai/benchmarks/terminal-bench-2 |
| Vals AI, SWE-bench Verified (1er sept. 2026) | Claude Opus 5 : **97,0 %** | 1er, mais DeepSeek V4 Pro est à 96,4 % pour 0,10 $ au lieu de 1,29 $ par tâche. Épreuve saturée | classement indépendant | https://www.vals.ai/benchmarks/swebench |
| Scale, SWE-bench Pro, partie publique (page lue le 22 nov., sans date) | Muse Spark 1.1 (Meta) : **61,5 %** | Opus 4.6 : 51,9 % (4e). La page ne montre encore aucun modèle de la génération 5 ou 6 : elle est en retard | classement indépendant | https://labs.scale.com/leaderboard/swe_bench_pro |
| Google, page de Gemini 4 Neon (nov. 2026) | Neon : 65,4 % sur CursorBench 4.1 | Opus 5.5 : 58,1 % (CursorBench) ; mais Opus 5.5 en tête sur Terminal-Bench 4.1 (65,8 % contre 65,2 %) et FrontierCode 2.0 (47,3 % contre 46,2 %) | **éditeur** (Google se mesure lui-même) | https://deepmind.google/models/gemini/ |
| LiveCodeBench | DeepSeek V4 Pro Max : 93,5 % (octobre) | non vérifié : le classement officiel n'est plus mis à jour depuis 2025 d'après les pages qui le recopient | recopié, non vérifié | https://llm-stats.com/benchmarks/livecodebench |

### Où Claude Code est en tête

- Construire tout un projet, étape par étape, avec outils et vérifications : 1er de l'épreuve « agents » de Design Arena.
- À égalité avec le meilleur (à 1 point près) sur l'indice d'Artificial Analysis, et devant Codex de 5 points.
- Comme **relecteur** du code d'un autre : dans l'étude de Xiang et ses collègues (116 exercices), Claude relisant les
  brouillons de Codex fait passer la réussite de 71,6 % à 89,7 % ; l'inverse fait baisser la réussite de Claude de
  91,4 % à 82,8 % (https://arxiv.org/abs/2607.21656, étude).

### Où d'autres font mieux

- **Prix et vitesse :** Antigravity avec Gemini 4 Neon obtient la même note que Claude Code pour environ la moitié du
  prix d'Opus 5.5 au plus haut (6,86 $ contre 12,61 $ par tâche) et deux fois plus vite. Codex avec GPT-6.2 Sol coûte
  0,90 $ par tâche pour une note de 50.
- **Une page web d'un seul coup :** GPT-6.2 Sol, Fable 5.2, GPT-6.2 Astra et Gemini 4 Neon passent devant Opus 5.5 sur
  Design Arena. L'écart est petit, mais il existe.
- **Prix au mot :** GPT-6.2 Sol coûte 2 $ / 10 $ par million de jetons (entrée / sortie) ; Opus 5.5 coûte 4 $ / 20 $ ;
  Gemini 4 Neon 3 $ / 15 $. Sources : https://learn.chatgpt.com/docs/pricing,
  https://platform.claude.com/docs/en/about-claude/pricing, https://aistudio.google.com/docs/pricing (attention : Google
  annonce une hausse de Gemini 4 Carbon et Argon au 1er décembre 2026, de 2 $ / 10 $ à 4 $ / 20 $).
- **Les tâches « dans le terminal »** (installer, lancer, réparer) : GPT 5.5 devant Opus 4.8 chez Vals AI en juin. Sur
  la nouvelle version de l'épreuve, Google donne Opus 5.5 légèrement devant : c'est donc à égalité aujourd'hui.

### Les autres noms de la liste

Je n'ai trouvé **aucun chiffre indépendant sur une même épreuve** pour Cursor (son modèle Composer 2.5 est à 79,6 % sur
SWE-bench Verified chez Vals AI, épreuve saturée), Devin, Factory, l'agent de GitHub Copilot, Amazon Kiro et Google
Jules. Leurs vendeurs publient leurs propres mesures. Prix relevés sur des pages qui les recopient, non vérifiés sur
la page officielle : Devin à partir de 20 $ par mois ; Jules inclus dans Google AI Pro à 19,99 $ par mois (100 tâches
par jour) ; Kiro avec une formule à 100 $ par mois ; Lovable à partir de 25 $ par mois.

---

## 2. Les façons éprouvées d'associer deux plateformes

### A. Un second regard automatique sur chaque changement du code

Un autre outil lit chaque demande de fusion sur GitHub et laisse des remarques. Il n'écrit rien dans le code.

| Outil | Ce que c'est | Ce qui est mesuré | Prix officiel | Difficulté pour le propriétaire |
|---|---|---|---|---|
| **Codex d'OpenAI sur GitHub** | On branche le dépôt dans les réglages de Codex et on coche « relecture automatique ». Il ne signale que les erreurs graves (niveaux P0 et P1). Il lit un fichier `AGENTS.md` pour les règles | Aucun chiffre indépendant propre à cette relecture. Une étude (ci-dessous) montre que deux familles trouvent plus d'erreurs que deux fois la même | Inclus dans ChatGPT Plus à 20 $ par mois (environ 18,20 €), compté dans la part « relecture de code » de l'abonnement ; Business à 25 $ par utilisateur et par mois | **Facile** : quelques cases à cocher, il faut un droit d'écriture sur le dépôt. Il semble avoir déjà ChatGPT (non vérifié : quelle formule) |
| **GitHub Copilot, relecture** | Relecture par GitHub lui-même, réglable pour toutes les demandes de fusion d'un dépôt | GitHub prévient : « il ne trouvera pas forcément tous les problèmes ». Chiffres de ses concurrents : 36,7 % à 54 % des erreurs trouvées selon le test (non indépendant) | Pro à 10 $ par mois avec 15 $ de crédits ; une relecture moyenne coûte 1,50 $ (0,25 $ à 5 $) : environ 10 relectures par mois incluses | **Facile** depuis GitHub |
| **CodeRabbit** | Robot de relecture spécialisé | 1er de l'épreuve de Martian au début de 2026 (note de 51,2 % qui mêle erreurs trouvées et fausses alertes), puis dépassé par Greptile et Cubic dans des relevés plus récents | 30 $ par développeur et par mois (Essentials) ; gratuit pour les dépôts publics | Facile, mais **un abonnement de plus** |
| **Greptile** | Robot de relecture spécialisé | 60,8 % au relevé du 30 juillet 2026 de l'épreuve de Martian, d'après Greptile lui-même (**éditeur**) | 50 relectures gratuites par mois pour un développeur, puis 1 $ la relecture simple | Facile, un abonnement de plus |
| **Relecture de Claude Code** (pour comparer) | Plusieurs agents Claude relisent en parallèle | Anthropic : 54 % des demandes reçoivent une vraie remarque au lieu de 16 % ; moins de 1 % de remarques jugées fausses (**éditeur**) | 15 à 25 $ par relecture, formules Team et Enterprise seulement | Même famille que celui qui écrit : n'apporte pas le regard d'une autre famille |

Sources : https://learn.chatgpt.com/docs/third-party/github, https://learn.chatgpt.com/docs/pricing,
https://docs.github.com/en/copilot/concepts/agents/code-review, https://github.com/features/copilot/plans,
https://www.coderabbit.ai/pricing, https://www.coderabbit.ai/blog/coderabbit-tops-martian-code-review-benchmark,
https://www.greptile.com/pricing, https://www.greptile.com/content-library/greptile-martian-code-review-benchmark,
https://claude.com/blog/code-review.

### B. Un outil spécialisé pour l'apparence des écrans

| Outil | Ce que c'est | Où il est meilleur que Claude | Prix officiel | Ce qui coince pour CE projet |
|---|---|---|---|---|
| **v0** (Vercel) | Fait des écrans et des petites applications à partir d'une phrase, se relie à GitHub | Rien de mesuré : 12e sur 15 outils chez Design Arena | Gratuit (7 messages par jour) ; Plus 30 $ par mois | Il produit son propre code, hors du moteur de thèmes du Studio |
| **Figma Make** | Le même genre d'outil, dans Figma | 9e sur 15 chez Design Arena | Professionnel 16 $ par mois (siège complet) | Même problème ; utile seulement pour dessiner, pas pour livrer |
| **Google Stitch** | Fait des maquettes d'écrans avec Gemini, export vers Figma et en HTML | Pas dans le classement de Design Arena | Gratuit pendant l'essai de Google (limites non confirmées sur une page officielle) | Même problème ; outil d'essai, peut changer |

Sources : https://v0.app/pricing, https://www.figma.com/pricing/, https://www.designarena.ai/leaderboard?tab=builders,
https://www.nxcode.io/fr/resources/news/google-stitch-pricing-plans-complete-guide-2026 (recopié, non officiel).

**Pourquoi ça ne colle pas ici :** SINA monte chaque site avec **un seul thème très riche** du Studio (décision du
15 novembre). Un outil qui dessine des écrans à côté créerait une deuxième façon de faire les sites, contraire à la
règle « une seule façon de faire chaque chose ». Les sites de SINA, eux, ne sont pas faits par Claude Code mais par
SINA dans le Studio ; c'est là que la qualité se joue.

### C. Un juge d'une autre famille dans SINA elle-même

Ce que disent les études :
- **Un modèle préfère ce qui lui ressemble.** Sur 9 312 jugements, chaque famille de modèles favorise les réponses de
  sa propre famille de 3,4 à 8,4 points ; et la composition d'un jury change à elle seule 18,5 % des verdicts
  (https://arxiv.org/abs/2609.17857, étude). GPT-4 était le plus partial des huit modèles mesurés en 2024
  (https://arxiv.org/abs/2410.21819, étude).
- **Un jury de plusieurs familles juge mieux qu'un seul grand juge**, pour plus de sept fois moins cher dans l'étude
  d'origine (https://arxiv.org/abs/2404.18796, étude de 2024, petits modèles d'alors).
- **Deux relectures de familles différentes** retrouvent 56,7 % des erreurs cachées, contre 42,7 % pour deux relectures
  du même modèle ; les deux familles ne trouvent pas les mêmes erreurs (41 % seulement en commun). Mais un seul relecteur
  d'une autre famille ne fait pas mieux qu'une relecture neuve par le même modèle
  (https://arxiv.org/abs/2610.01471, étude : 150 erreurs cachées, 900 relectures).
- **L'effet dépend du sens :** Claude relisant Codex aide beaucoup ; Codex relisant Claude a fait baisser la réussite
  (https://arxiv.org/abs/2607.21656, étude sur 116 exercices, relecteurs sans droit de lancer les essais).

Ce qui existe déjà dans le Studio : le code des sites (GPT-6.2 Sol) est relu par Claude, et les images (OpenAI) sont
relues par Claude. **Ce qui manque :** les textes que Claude écrit (noms de marque, angles, textes du site,
publications) sont jugés par Claude seul. C'est exactement le cas où l'étude mesure une préférence pour soi.

Prix d'un second juge (**mon estimation**, à vérifier par un essai) : une relecture de 6 000 jetons lus et 2 000 écrits
coûte environ 0,03 $ avec GPT-6.2 Sol (2 $ / 10 $ par million) et 0,05 $ avec Gemini 4 Neon (3 $ / 15 $). Pour une
dizaine de décisions importantes par projet : de l'ordre de 0,30 € à 0,50 € de plus par projet. OpenAI est **déjà un
fournisseur du Studio** : aucun nouveau compte à ouvrir.

---

## 3. Ce que conseillent les équipes qui le font

- **Celui qui écrit ne note pas sa propre copie.** C'est la règle déjà inscrite pour SINA ; les études ci-dessus la
  confirment, et ajoutent : « d'une autre famille, c'est mieux, mais pas magique ».
- **Le relecteur commente, il n'écrit pas.** Codex sur GitHub ne laisse que des remarques graves ; OpenAI rappelle que
  ses règles « ne remplacent ni les essais automatiques ni l'accord d'un humain » (page officielle ci-dessus).
- **Chaque remarque est vérifiée avant d'être suivie.** Une relecture faite par une autre famille peut aussi se tromper
  (l'étude sur Codex relisant Claude le montre). La remarque est donc confirmée par un essai automatique avant d'être
  appliquée.
- **Un jury mélangé plutôt qu'un seul juge**, et l'ordre des propositions inversé à chaque fois : dans l'étude sur les
  jurys, 55,4 % des verdicts s'inversaient quand on changeait l'ordre des deux réponses (https://arxiv.org/abs/2609.17857).

---

## 4. Ce qui ne marcherait pas ou ferait perdre du temps

- **Deux agents qui écrivent en même temps dans le même code.** L'étude CROCODIL montre qu'un modèle qui reprend le code
  d'un autre le modifie jusqu'à 14 % de plus que le sien, sans que le code marche mieux ; une simple consigne « change le
  moins possible » ne corrige pas ce travers (https://arxiv.org/abs/2609.03894, étude, résumée ici :
  https://codex.danielvaughan.com/2026/09/07/crocodil-cross-model-code-editing-excessive-edits-codex-cli/). Avec deux
  écrivains, on aurait aussi des changements qui se marchent dessus, et deux styles dans le même fichier.
- **Changer d'outil pour construire** (passer à Antigravity ou à Codex). Antigravity est au même niveau et moins cher,
  mais le Studio a été écrit avec ses règles dans Claude Code (`CLAUDE.md`, essais, compétences) ; tout refaire
  coûterait du temps pour un gain mesuré de 1 point. Et le vrai manque du projet n'est pas l'outil : **rien n'a encore
  été essayé en vrai.**
- **Un outil d'écrans à côté** (v0, Figma Make, Stitch) : deuxième façon de faire les sites, et ils sont derrière
  Lovable et Replit sur Design Arena.
- **La relecture de Claude Code payante** (15 à 25 $ la relecture, formules d'équipe) : chère, et de la même famille.
- **Empiler des abonnements** (CodeRabbit et Greptile et Copilot) : ils trouvent en partie les mêmes erreurs, et chaque
  remarque de plus est du temps de tri.
- **Un juge d'une autre famille partout dans SINA** : le prix double pour peu de gain sur les étapes simples. À garder
  pour les décisions qui comptent.

---

## Ma recommandation pour CE projet (3 points)

1. **Oui à un second regard sur le code : Codex d'OpenAI sur GitHub, qui commente sans écrire.** Il relit chaque demande
   de fusion de Claude Code et ne signale que les erreurs graves. Claude Code reste le seul à écrire ; il vérifie chaque
   remarque par un essai automatique avant de la suivre. Prix : compris dans un abonnement ChatGPT Plus (20 $ par mois,
   environ 18,20 €) s'il l'a déjà ; sinon c'est ce montant. Ce qu'il lui faudra faire : brancher le dépôt dans Codex et
   cocher « relecture automatique » (je lui donnerai les étapes en captures). Je n'ajoute rien au dépôt sans son oui.
2. **Oui, plus tard, à un second juge d'une autre famille dans SINA, mais seulement sur ses textes décisifs** (nom de
   marque, angles, textes du site, publications), là où Claude juge aujourd'hui ce qu'écrit Claude. Le juge serait
   GPT-6.2 Sol, déjà branché ; SINA ne garde que ce que les deux juges acceptent. Environ 0,30 € à 0,50 € de plus par
   projet (estimation). Je le proposerai avec le lot concerné, avec le prix de l'essai, et il dira oui ou non.
3. **Non à un deuxième outil qui construit ou qui dessine les écrans.** Pas de v0, Figma Make, Stitch, Lovable,
   Antigravity ou Devin en parallèle : deux façons de faire, du code qui se marche dessus, et aucun gain mesuré qui le
   justifie. Le meilleur moyen de rendre SINA meilleure maintenant, c'est l'essai réel du lot 4 avec des clients
   inventés.

---

## Ce que je n'ai pas pu vérifier

- Le classement officiel de **WebDev Arena** (arena.ai) : la page m'a été refusée (erreur 403). Les pages qui le
  recopient donnent Opus 5.5 ou Fable 5.2 en tête au 8-15 novembre, sans que je puisse le confirmer.
- Le classement officiel de **Terminal-Bench** (tbench.ai) : le tableau ne se charge pas en lecture simple. J'ai pris
  Vals AI (juin) et les chiffres de Google à la place.
- Le classement officiel de **SWE-bench** (swebench.com) : page coupée à la lecture. Celui de **Scale** ne montre pas
  encore les modèles récents.
- **Aucun chiffre indépendant** pour Cursor, Devin, Factory, Copilot (agent), Kiro, Jules, Bolt sur une même épreuve que
  Claude Code, ni pour la relecture de Codex sur GitHub mesurée seule.
- **Quelle formule ChatGPT** le propriétaire possède, et la part exacte de relectures comprise dans ChatGPT Plus (la
  page officielle dit seulement qu'elle est comptée à part).
- Les limites gratuites officielles de **Google Stitch**, et les prix officiels de Devin, Jules, Kiro et Lovable (relevés
  sur des pages qui les recopient).
- **Aucune étude** trouvée sur le meilleur juge pour des **images** (logos, publications) ; les études citées portent sur
  du code et du texte.
- Les études citées sont récentes (2026) et pour la plupart **pas encore relues par des pairs** ; elles portent sur de
  petits ensembles (116 exercices, 150 erreurs cachées).
- Le prix d'un second juge dans SINA est **mon estimation**, pas une mesure.
