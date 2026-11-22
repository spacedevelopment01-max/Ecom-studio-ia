# Toutes les recherches sur l'amélioration de SINA (21 novembre 2026)

Les onze rapports complets, tels qu'ils ont été rendus, avec leurs sources et le niveau de preuve de chaque point. Rien n'est coupé ni résumé.

## Sommaire
1. Les images avec OpenAI
2. Rendre SINA fiable, constante et économe
3. La conversation avec le client
4. La marque, les noms, les angles et les textes
5. La création de sites par IA
6. Les publications, les publicités, les vidéos et le suivi du mois
7. Les produits qui font déjà une partie du travail de SINA
8. Comment les équipes ont bâti leurs agents autonomes
9. Ce que la recherche universitaire a mesuré
10. Les briques techniques
11. De quelques réponses à un travail complet


---

# Rapport 1 : Les images avec OpenAI

## Les images avec OpenAI : ce que disent le guide officiel, la recherche et les mesures du Studio (21 novembre 2026)

### 1. Le guide officiel d'OpenAI sur ses modèles d'images
Source : https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide (lu le 21 novembre 2026).

- **Deux modèles** : « GPT-Image-2.6 Flare is the smaller model for workflows where speed matters most. GPT-Image-2.6
  Sunburst is the base model for workflows that need more detail or precise edits. » Et : « Start with GPT-Image-2.6
  Sunburst if the image must meet demanding requirements for detail, layout, or edit accuracy. » Le Studio utilise Flare
  (réglage `syna.mockup.image_route`, défaut `openai:gpt-image-2.6-flare` dans `brand-images.ts`). Les deux ont la même
  borne de prix dans `src/lib/ai/config.ts` (0,12 $ par image) : à vérifier sur un vrai essai.
- **Réglages** :
  - `complexity` : « Controls how much the model plans before rendering. Choose low, medium, or high. Both Sunburst and
    Flare use high when you omit the field. »
  - `background` : « Use auto, opaque, or transparent. For transparent PNG or WebP, check the decoded alpha channel. »
    Le Studio n'envoie aucun réglage de fond en mode retouche (images jointes) : c'est la cause de la panne de
    transparence (partie 3).
  - `output_format` : png, jpeg, webp ; les générations acceptent aussi **svg** (logo vectoriel, avec fond transparent :
    « For a logo you can scale or recolor by editing its paths […] Set output_format="svg" ») et gif.
  - `markup` : retouche guidée ; on envoie une couche transparente où l'on a entouré la zone à changer (« Draw a circle
    around the object you want to change, then describe the change in the prompt »). La couche ne vaut que pour la
    première image ; les autres images jointes restent des références ; pas de masque avec `markup`.
  - `n` : plusieurs versions en une demande (« Increase n if you want more raster variations »).
- **Écrire la demande** :
  - « Define the result. Name the subject and intended use, such as a product photograph, advertisement, or diagram.
    Specify the composition, aspect ratio, and important placement constraints. For complex requests, organize the prompt
    as scene, subject, details, and constraints, using labeled sections. »
  - « Describe visible details. Name materials, lighting, colors, and the visual medium. Request "photorealistic" or
    "real photograph" explicitly when that is the goal. »
  - « Specify exact text. Put required wording in quotes and describe its position and typography. Spell unusual words
    or brand names letter by letter when needed. Ask for no extra text, then check spelling and legibility. »
  - « Separate changes from constraints. For edits, say "change only X" and list the details to preserve. »
  - « Assign roles to references. Identify each input by number and purpose. »
  - « Iterate deliberately. Pass the previous output as the next edit input, request one change, and repeat the
    details to preserve. »
  - Pour passer d'un modèle à l'autre : garder une base de cas (« difficult edits, exact text, product geometry, and
    transparent assets »), changer un réglage à la fois, mesurer « cost per accepted image ».

### 2. Ce que la recherche et les produits disent des images
- Les meilleurs systèmes de création graphique font l'image **sans texte** puis posent le texte par une mise en page :
  COLE (Microsoft, https://arxiv.org/pdf/2311.16974), OpenCOLE, Canva (calques modifiables), Lovart. Une affiche faite d'un
  seul coup par GPT-4o « séduit au premier regard mais transmet mal le contenu » : 39,9 % au questionnaire sur son contenu
  (PosterAgent, NeurIPS 2025, https://arxiv.org/abs/2505.21497). Les designers préféraient pourtant DALL·E 3 pour la
  beauté face à COLE : la mise en page séparée gagne sur le message, pas forcément sur la beauté.
- Le texte dans les images reste un point faible des produits (Lovart, Pomelli).
- Une IA juge la beauté presque au hasard : 0,55 d'accord avec dix designers, le hasard donne 0,50 ; un petit juge
  entraîné sur leurs avis atteint 0,611 (TASTE 2026, https://arxiv.org/abs/2605.20731).
- Plusieurs versions en parallèle valent mieux que des retouches successives d'une seule (Dow et al. 2010).
- Une image d'IA « bizarre » : 42 % des gens jugent mal la marque, 40 % voient bien une IA soignée (DoubleVerify, 22 000
  personnes).
- Google ne promet pas la fidélité du produit dans les scènes de Pomelli : comparer chaque image à la photo du client.
- Traitement différé d'OpenAI à 50 % moins cher, images acceptées pour certains modèles (gpt-image-1, 1.5, mini) ; non
  vérifié pour la version 2.6.
- Outils de logo : Recraft (seul à sortir du vrai vectoriel parmi les grands modèles d'avant 2.6), Ideogram (texte dans
  les logos) ; la règle du propriétaire impose OpenAI pour les logos, et OpenAI sort désormais du vectoriel.

### 3. Mesures faites dans le Studio d'essai le 21 novembre 2026
- **Panne de transparence** : sur 96 images de planche relevées depuis le 15 novembre, 16 avaient des zones
  transparentes (au moins 1 % des points), toutes créées avec des images jointes (logo), le 16 et le 21 novembre. Selon
  le fond d'affichage : taches sombres ou brume blanche, bords flous, « vignettes ». Les refus du relecteur sur ces
  images (« bords abîmés », « blocs de pixels », « vignette ronde », « brume ») venaient de là, pas du dessin.
- **Relecteur** : jugeant six images d'un coup avec un modèle moyen, il les gardait toutes ; refait (modèle le plus fort,
  réflexion élevée, une image à la fois, liste de défauts, note de 8 sur 10 au moins), il a refusé les quatre images
  ratées pour les bonnes raisons, pour environ 3 centimes par image.
- **Ordre de travail** : les images qui portent le logo sont dessinées avant que le logo soit relu ; quand le logo est
  refusé, elles sont jetées et refaites (reprise d'Aplomb : 13 images dessinées pour 2,04 €, rien de gardé).
- **Logo du plombier** : laissé libre, OpenAI dessine presque toujours une maison et une goutte pour « plombier » ;
  13 des 20 logos refusés l'ont été pour une goutte ou une personne. Avec la phrase de refus du client mot pour mot, la
  goutte a disparu au premier essai suivant.


---

# Rapport 2 : Rendre SINA fiable, constante et économe

## Rendre SINA fiable, constante et économe : ce que font les meilleurs

J'ai fait la recherche sur Internet et lu les pages principales. Aucun fichier du dépôt n'a été modifié. Il y a trois niveaux de preuve :
- **officiel** : Anthropic, OpenAI, normes publiques ;
- **recherche** : articles universitaires ;
- **vendeur** : blogs d'outils ou de consultants.

Quand un chiffre ne vient que d'un résumé et pas de la source elle-même, je le signale.

---

### 1. Architecture : chaînes fixes d'abord, agent libre seulement où il faut

1. **La création suit des chaînes fixes, la conversation reste à l'agent.** Anthropic distingue deux choses :
   - les « flux de travail », dont le code fixe le chemin. Ils conviennent aux tâches bien définies qui demandent de la régularité ;
   - les « agents », qui choisissent eux-mêmes leurs étapes. Ils conviennent aux problèmes ouverts.

   Pour SINA, cela donne : marque, angles et site passent par des chaînes écrites dans le code, avec des contrôles programmés entre les étapes. L'agent sert à converser, à choisir quelle chaîne lancer et à expliquer. Source : https://www.anthropic.com/engineering/building-effective-agents (officiel).

2. **Un évaluateur-optimiseur seulement avec des critères clairs, et un nombre de tours plafonné.** Anthropic réserve cette boucle (l'un produit, l'autre juge) aux cas où les critères sont nets et où la critique améliore le résultat de façon mesurable. Il demande aussi des conditions d'arrêt, comme un nombre maximal de tours. Pour SINA : 2 reprises au plus, puis on remonte au client. Même source (officiel).

3. **Un seul agent le plus longtemps possible.** OpenAI conseille d'aller au bout d'un agent unique. On ne le découpe que lorsque ses consignes deviennent pleines de conditions ou qu'il se trompe d'outil de façon répétée. Le système multi-agent d'Anthropic consomme environ 15 fois plus que une conversation simple. Il ne vaut que pour les tâches parallélisables à forte valeur. Il convient mal quand tous doivent partager le même contexte, ce qui est le cas de la direction artistique d'une marque. Sources :
   - https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/ (officiel)
   - https://www.anthropic.com/engineering/multi-agent-research-system (officiel)

4. **Des outils moins nombreux, impossibles à mal utiliser.** Anthropic recommande :
   - des outils regroupés par tâche réelle, chacun avec un but distinct et des préfixes communs ;
   - des réponses courtes et parlantes ;
   - des paramètres conçus pour qu'on ne puisse pas se tromper.

   Une piste concrète : donner à Claude les transcriptions d'essais pour qu'il réécrive les descriptions des outils. Anthropic rapporte un temps de tâche réduit de 40 % de cette façon. Sources :
   - https://www.anthropic.com/engineering/writing-tools-for-agents (officiel)
   - https://www.anthropic.com/engineering/multi-agent-research-system (officiel)

5. **Délégation précise aux spécialistes.** Des consignes vagues aux sous-agents ont produit du travail en double et des trous. Chaque spécialiste reçoit quatre choses : un objectif, un format de sortie, ses sources et ses limites. Source : article multi-agent d'Anthropic (officiel).

---

### 2. Évaluations : une batterie de cas de référence, rejouée à chaque changement

1. **Commencer petit, à partir de vrais échecs.** Anthropic : « 20 à 50 tâches simples tirées de vrais échecs » suffisent pour démarrer. Un bon cas est un cas où deux experts rendraient le même verdict. Il faut des cas où le comportement doit se produire et d'autres où il ne doit pas se produire. Pour SINA : chaque reproche du propriétaire devient un cas, avec un client inventé. Les projets d'essai écartés ne servent jamais de cas. Source : https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents (officiel).

2. **Deux batteries distinctes.**
   - Les tests de capacité démarrent bas et servent à progresser.
   - Les tests de non-régression doivent rester près de 100 %.
   - Une étape réussie (marque du lot 2, angles du lot 3) passe dans la non-régression.

   Les résultats attendus de cette batterie sont figés. On ne les réécrit pas pour suivre une nouvelle consigne. Sources :
   - même source Anthropic (officiel)
   - https://www.kunalganglani.com/learning-paths/ai-software-developer/aidev-evaluation-regression (blog)

3. **Mesurer la régularité, pas un coup de chance.** « pass^k » est la probabilité que les k essais réussissent tous. C'est la bonne mesure pour un produit vendu à des clients. Concrètement : faire 3 essais par cas sur les cas critiques et ne valider que si les 3 passent. Source : Anthropic, même article (officiel).

4. **Juger le résultat, pas le chemin, et lire les transcriptions.** Un taux de réussite proche de 0 % signale d'abord un cas mal écrit, pas un agent incapable. Source : Anthropic, même article (officiel).

5. **Le juge se règle sur les verdicts du propriétaire.**
   - Une seule personne fait foi : le propriétaire.
   - Il donne des verdicts « bon / pas bon » avec une phrase de raison, jamais des notes de 1 à 5.
   - Il y a un juge séparé par type de défaut, pas un juge global.
   - On mesure deux taux sur des cas mis de côté : défauts bien attrapés, bonnes sorties bien laissées passer.

   Sources :
   - https://hamel.dev/blog/posts/evals-faq/ (consultant, qui vend des formations)
   - https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents, qui demande aussi de laisser au juge la réponse « je ne sais pas » (officiel)

6. **Les critères changent en regardant les sorties.** Les critères ne peuvent pas être entièrement fixés avant d'avoir jugé de vraies sorties. Il faut prévoir de recalibrer le juge après chaque séance de verdicts. Source : https://arxiv.org/abs/2404.12272 (recherche, UIST 2024).

---

### 3. Juges d'images et de textes créatifs

1. **Comparer par paires plutôt que noter dans l'absolu.** Deux résultats vont dans ce sens :
   - un juge visuel s'accordait avec les humains à environ 79 % en comparaison par paires, contre environ 70 % en notation ;
   - un autre article constate que la notation absolue est incohérente d'une fois à l'autre.

   Pour SINA : « laquelle de ces deux images est la meilleure, et l'une est-elle ratée ? » vaut mieux que « note cette image sur 10 ». Sources :
   - https://arxiv.org/html/2402.04788v1 (recherche)
   - https://arxiv.org/pdf/2602.06013 (recherche ; chiffres lus dans des extraits)

2. **Les juges ont des préférences connues.** On en a documenté trois : la place dans la consigne, la longueur et leur propre production. Une étude de 2026 montre que ces préférences changent d'un modèle à l'autre. Elles doivent donc être mesurées sur les cas de SINA, pas supposées. Sources :
   - https://arxiv.org/html/2411.15594v6 (recherche)
   - https://arxiv.org/pdf/2410.21819 (recherche)
   - https://arxiv.org/html/2604.23178v1 (recherche)

3. **« Celui qui fait n'est jamais celui qui juge » est justifié.** Sans signal extérieur, un modèle qui relit son propre raisonnement peut se dégrader : de 62 % à 36,5 % sur un test de calcul. Le signal extérieur est ce qui aide : un juge distinct, des contrôles dans le code, la vision de l'image réelle. Source : https://arxiv.org/abs/2310.01798 (recherche, Google DeepMind).

---

### 4. Contexte et mémoire

1. **Moins de consignes, mieux placées.** Anthropic recommande :
   - une consigne à « la bonne altitude » : ni du « si… alors » rigide, ni du flou ;
   - partir d'une consigne minimale et n'ajouter que ce qui corrige un échec observé ;
   - quelques exemples variés plutôt que des listes de règles.

   Sur la quantité : plus on empile d'instructions, plus le modèle en oublie, et il privilégie celles du début (étude IFScale). Les modèles récents tiennent beaucoup mieux, mais l'oubli reste. Pour SINA : une seule source par règle, regroupée par cahier de métier, et un inventaire des contradictions. Sources :
   - https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents (officiel)
   - https://arxiv.org/abs/2507.11538 (recherche)
   - https://arize.com/blog/llm-instruction-following-benchmark-2026/ (vendeur)

2. **Quatre façons dont un long contexte se gâte.** Une erreur s'y installe et se répète (empoisonnement). Le modèle se laisse distraire. Des éléments inutiles l'égarent (confusion). Des informations se contredisent (conflit). Pour SINA : recharger seulement ce qu'il faut, au moment voulu. Par exemple, un spécialiste reçoit la fiche de marque validée, jamais tout l'historique. Sources :
   - https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html (blog)
   - Anthropic, contexte (officiel)

3. **Un registre d'avancement qu'on ne réécrit pas.** Anthropic tient une liste des fonctions dans un fichier structuré, où chacune a une case « réussie ». L'agent ne peut que cocher cette case, ne peut pas réécrire la liste, et vérifie de bout en bout avant de la cocher. C'est le remède au « j'ai fini » prématuré et aux acquis cassés. Pour SINA : un état par client, avec chaque étape validée verrouillée. On n'y touche que sur demande explicite. Source : https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents (officiel).

4. **Une mémoire par client, datée et contrôlée.**
   - Le cloisonnement entre clients se fait dans la base de données, pas par une phrase dans la consigne.
   - Chaque souvenir garde sa source, sa date d'écriture et sa dernière confirmation.
   - On nettoie les souvenirs périmés.

   Les leçons générales de SINA, elles, passent par une relecture avant d'entrer dans les cahiers. Sources :
   - https://www.sitepoint.com/ai-agent-memory-guide/ (blog)
   - https://workos.com/blog/ai-agent-memory-poisoning (vendeur)

5. **Résumer sans perdre.** Un résumé de conversation doit d'abord ne rien perdre, et seulement ensuite être court. Source : Anthropic, contexte (officiel).

---

### 5. Coûts

1. **Mettre en cache le début fixe des consignes.** La mise en cache garde en mémoire, chez le fournisseur, la partie fixe d'une demande. Tarifs officiels :
   - relire le cache coûte 0,1 fois le prix normal, et 0,05 fois sur Opus 5.5 ;
   - l'écriture coûte 1,25 fois (durée de 5 minutes) ou 2 fois (durée d'une heure) ;
   - le minimum est de 512 jetons sur les modèles récents.

   L'ordre est outils, puis consignes, puis messages. Toucher la définition d'un outil invalide tout le cache. Les parties fixes (outils, cahiers) vont donc en tête, et ce qui change va à la fin. Source : https://platform.claude.com/docs/en/build-with-claude/prompt-caching (officiel).

2. **Traitement différé pour ce qui n'est pas urgent.** Il coûte 50 % de moins et la plupart des lots finissent en moins d'une heure. Il convient aux publications du mois, aux bilans et aux rejeux de la batterie de cas. Il se cumule avec le cache. Source : https://platform.claude.com/docs/en/build-with-claude/batch-processing (officiel).

3. **Mesurer le « coût par sortie acceptée ».** La mesure clé n'est pas le coût d'un appel. C'est le total dépensé, reprises comprises, divisé par le nombre de sorties validées. Une étude de Princeton montre qu'on peut gonfler la qualité en relançant à l'aveugle. Il faut donc comparer les versions sur le couple qualité et coût. Source : https://arxiv.org/abs/2407.01502 (recherche).

4. **Le bon modèle pour chaque tâche.** OpenAI conseille de construire d'abord tout avec le modèle le plus fort, puis d'essayer des modèles plus petits sur les tâches simples (classer, contrôler un format). On ne garde le petit modèle que si la batterie de cas reste verte. Le routage entre modèles a fait économiser 35 à 85 % selon les tests (chiffres de résumés). La règle du propriétaire reste : le modèle le plus fort pour réfléchir. Un changement de modèle se propose à lui avant tout essai. Sources :
   - guide OpenAI (officiel)
   - https://www.dsstream.com/post/llm-inference-cost-optimization (blog)

5. **Contrôler avant de payer l'image.** Le texte de la demande d'image est vérifié par du code avant l'appel payant : produit présent, aucune personne, texte court. On ajoute un plafond de dépense par tâche et par client. Au-delà de 2 reprises, on s'arrête et on remonte au client. Source : Anthropic, chaînes avec contrôles et conditions d'arrêt (officiel).

---

### 6. Suivi en production et amélioration continue

1. **Tracer chaque création.** Une norme publique décrit ces traces : chaque tour de l'agent, chaque appel de modèle et chaque outil, avec les jetons consommés, cache compris. Le coût se calcule ensuite. Pour SINA : relier chaque trace au client, à l'étape et à la version des consignes. Sources :
   - https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md (norme publique, encore en développement)
   - Anthropic multi-agent (officiel)

2. **Un tableau de bord et des alertes.** Il montre :
   - la part de sorties acceptées du premier coup ;
   - le nombre de reprises ;
   - le coût par sortie acceptée ;
   - l'accord entre le juge et le propriétaire ;
   - les dépenses qui sortent de l'enveloppe.

   Quand un client refuse une sortie, elle part dans une file de relecture, et une fois annotée elle entre dans la batterie de cas. Sources :
   - https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues (vendeur)
   - https://docs.braintrust.dev/annotate/human-review/score-traces (vendeur)

3. **Versionner les consignes comme du code.** Chaque version est figée. On compare l'ancienne et la nouvelle sur les mêmes cas, et on bloque si un cas recule. On revient en arrière en un geste et on bascule la nouvelle version progressivement. Sources :
   - https://langfuse.com/resources/engineering/prompt-cicd (vendeur)
   - bascule progressive : Anthropic multi-agent (officiel)

4. **L'amélioration automatique des consignes vient plus tard.** GEPA (dans DSPy) lit les traces complètes et réécrit les consignes. Il fait mieux qu'un apprentissage par renforcement avec jusqu'à 35 fois moins d'essais (ICLR 2026). Il présente un risque de sur-ajustement aux cas d'essai. Il ne sert qu'une fois la batterie de cas et le juge calibrés, avec des cas mis de côté. Sources :
   - https://arxiv.org/abs/2507.19457 (recherche)
   - https://arxiv.org/pdf/2610.12601 (recherche, lue seulement par son titre)

---

### 7. Erreurs classiques qui font tourner en rond

- **Accuser le modèle d'abord.** Une étude de 1 642 traces classe 14 façons dont les systèmes multi-agents échouent. Une grande part vient de la conception et du cahier des charges, pas du modèle. Source : https://arxiv.org/abs/2503.13657 (recherche).
- **Rajouter une règle à chaque échec** sans retirer celles qui la contredisent. Sources : IFScale ; Anthropic, contexte.
- **Annoncer « fini » sans vérification de bout en bout.** Source : Anthropic, harnais (officiel).
- **Un juge global qui donne une note sur 10, jamais confronté aux verdicts humains.** Sources : Husain ; Anthropic, évaluations.
- **Réécrire les résultats attendus pour que les tests passent.** Source : Ganglani (blog).
- **Viser 100 % sur des tests trop faciles**, ou se fier à des mesures génériques. Source : Husain.
- **Laisser le modèle se corriger seul sans signal extérieur.** Source : Huang et coll. (recherche).

---

### Les 5 changements qui auraient le plus d'effet

1. **Une batterie de cas de référence et de non-régression**, avec des clients inventés et les verdicts figés du propriétaire. On la rejoue (3 essais par cas, en traitement différé) avant chaque changement de consigne ou de modèle. On bloque si une étape déjà réussie recule.
2. **Des juges calibrés sur le propriétaire.** Ses verdicts « bon / pas bon » avec une raison, un juge par défaut, la comparaison par paires pour les images, et une mesure d'accord affichée.
3. **Des étapes validées verrouillées.** Un registre par client où chaque étape réussie est figée et ne se rouvre que sur demande. Les chaînes fixes passent par des contrôles programmés.
4. **Le ménage des consignes.** Une seule source par règle, l'inventaire et la suppression des contradictions, quelques exemples neutres à la place des listes, et la partie fixe en tête pour la mise en cache.
5. **Le « coût par sortie acceptée » suivi dans un tableau de bord.** Avec des traces par client, étape et version, et un plafond de 2 reprises avant de remonter au client. Ces traces servent ensuite à améliorer les consignes, au besoin avec GEPA.


---

# Rapport 3 : La conversation avec le client

## Ce que font les meilleurs : leçons pour SINA

Niveaux de preuve utilisés : **solide** (étude publiée, plusieurs modèles ou beaucoup de personnes), **moyen** (petite étude, ou guide de référence d'un organisme du métier), **faible** (blogs d'agences, avis d'utilisateurs, presse).

### 1. Le recueil du besoin dans les agences

1. **Fixer la stratégie avant de créer.** Le guide de l'organisme britannique des agences de publicité (IPA), écrit avec Mark Ritson, pose cette règle : « sans stratégie claire, pas de brief ». Il note aussi que 60 % des annonceurs se servent de la création pour trouver leur stratégie, ce qui coûte cher. Pour SINA : finir de comprendre le client (cible, promesse, objectif) avant de lancer la première image payante. Source : https://ipa.co.uk/media/12104/better-briefs-booklet_10_single-pages.pdf (moyen ; l'enquête qui le fonde est large).
2. **Trois piliers à toujours connaître : l'objectif, la cible, le budget.** Ils se tiennent entre eux. Les objectifs sont l'élément le plus important et le plus mal défini. Le guide distingue trois niveaux : l'argent (ventes), le geste attendu (réserver, acheter) et ce que le client doit penser ou ressentir. Même source (moyen).
3. **Un seul message par travail, appuyé par des preuves vraies.** Pas de liste de courses. Pour SINA : chaque angle, chaque publication porte une seule promesse, et elle demande au client la preuve qui va avec (années de métier, matière, garantie, avis réels). Même source (moyen).
4. **La cible doit être un portrait vivant, jamais une tranche d'âge.** Ritson : « les clichés démographiques comme "les millennials" montrent qu'on n'a pas de stratégie ». Cela confirme la règle des angles déjà posée par le propriétaire. Même source (moyen).
5. **Ce que coûte un mauvais brief.** 80 % des annonceurs pensent faire de bons briefs ; seules 10 % des agences sont d'accord. Environ un tiers du budget est perdu en travail mal orienté. Pour SINA : relire au client, en clair, ce qu'elle a compris, avant de créer. Sources : https://ipa.co.uk/news/betterbriefs et https://www.thedrum.com/news/2023/11/15/ipa-massive-lack-alignment-between-marketers-and-agencies-briefs (moyen).
6. **Comprendre pourquoi les clients achètent, à partir d'achats réels.** La méthode des « tâches à accomplir » de Bob Moesta reconstitue un vrai achat : le déclic, ce qui pousse, ce qui attire, ce qui fait peur, l'habitude. Pour SINA : demander « raconte-moi ton dernier client content : qu'est-ce qui l'a décidé ? » plutôt que « qui est ta cible ? ». Source : https://jobstobedone.org/switch-interview/ (moyen).

### 2. Quand et comment poser des questions

1. **Ne demander que ce qui change le résultat.** La recherche de 2025 sur les agents valorise une question selon ce qu'elle apporte vraiment. Elle pénalise une question qui revient sur un point déjà demandé, et s'arrête quand la confiance est suffisante. Résultat : 1,5 à 2,7 fois moins de questions, et plus de tâches réussies. Pour SINA : avant chaque question, vérifier sur sa fiche que la réponse n'y est pas déjà et qu'elle changera la création. Source : https://arxiv.org/html/2511.08798v2 (solide).
2. **Bien choisir le moment.** Les questions sur le but doivent venir tout au début : elles font passer la réussite de 40 % à 78 %, et ne servent plus à rien aux trois quarts du travail. Les questions sur les éléments à fournir (photos, prix) valent jusqu'à la moitié du travail. Trop tard, une question coûte plus qu'elle ne rapporte. Le même travail mesure qu'un modèle pose des questions dans 52 % des cas sans mieux réussir, ce qui montre que la qualité des questions compte plus que leur nombre. Source : https://arxiv.org/html/2605.07937v1 (solide, mais l'étude porte sur des tâches techniques).
3. **Ne pas supposer trop tôt, et tenir un résumé à jour.** Les modèles perdent 39 % de qualité quand l'information arrive par petits morceaux. Ils font des suppositions au début et s'y accrochent. Reprendre à chaque tour tout ce qui est acquis réduit la perte. Pour SINA : une fiche client structurée, relue avant chaque création, plutôt que se fier au fil de la conversation. Source : https://arxiv.org/abs/2505.06120 (solide ; prix du meilleur article, ICLR 2026).
4. **Peu de questions, mais celles qui évitent une erreur.** Le groupe Nielsen Norman (NN/g) : une question de clarification ajoute de l'effort. Elle se justifie quand une réponse hâtive serait fausse. Source : https://www.nngroup.com/articles/less-chat-more-answer/ (moyen).
5. **Proposer des choix cliquables, et toujours laisser écrire librement.** Les utilisateurs apprécient les boutons, et les attendent même. Les deux modes de réponse doivent coexister. Une question à deux réponses seulement satisfait peu. Sources : https://www.nngroup.com/articles/chatbots/ (moyen), https://aclanthology.org/2024.findings-eacl.84.pdf (moyen).

### 3. Parler comme une experte et inspirer confiance

1. **La réponse d'abord, le détail sur demande.** Paragraphes de 2 à 3 phrases, pas de compliments creux (« excellente question »), détails proposés en suite cliquable. Source : https://www.nngroup.com/articles/less-chat-more-answer/ (moyen).
2. **Recommander et dire pourquoi.** Dans les assistants qui recommandent, expliquer « pourquoi ce choix » augmente la confiance ; expliquer « pourquoi pas les autres » a peu d'effet. Pour SINA : une recommandation, une raison en une phrase, et les autres options en réserve. Source : https://www.researchgate.net/publication/389593667_Tailoring_explanations_in_conversational_recommendations_The_impact_of_decision_contexts_and_user_interfaces (moyen).
3. **Montrer en images.** NN/g conseille d'accompagner les recommandations d'images pour juger les options sans quitter la conversation. Cela rejoint la règle « montrer les images tout de suite ». Source : https://www.nngroup.com/articles/ai-chatbots-design-guidelines/ (moyen).
4. **Ne pas donner raison par complaisance.** Les assistants approuvent trop souvent l'utilisateur, et les personnes préfèrent parfois une réponse flatteuse à une réponse juste. Pour SINA : quand le client propose une mauvaise idée, le dire avec douceur et proposer mieux. Source : https://www.anthropic.com/research/towards-understanding-sycophancy-in-language-models (solide).
5. **Dire ce qu'elle sait faire, et à quel point elle le fait bien ; faciliter la correction.** Ce sont les règles 1, 2, 9 et 16 des 18 règles de Microsoft : rendre clair ce que le système sait faire, à quel niveau, permettre de corriger vite, montrer les conséquences d'une action. Pour SINA : avant une dépense, dire ce qui sera fait, la part du budget d'IA du mois, et ce qu'on pourra changer ensuite. Source : https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/ (solide ; évalué par 49 concepteurs sur 20 produits).

### 4. Prendre les devants sans déranger

1. **Agir seulement quand cela vaut plus que ne rien faire.** Horvitz (1999) en fait le principe de base des assistants qui prennent l'initiative, en tenant compte du coût de déranger. Source : https://erichorvitz.com/chi99horvitz.pdf (solide, texte fondateur).
2. **Proposer aux moments de pause, pas en plein travail.** Dans une étude de terrain, une suggestion faite à la fin d'une étape est acceptée dans 52 % des cas. En pleine tâche, elle est rejetée dans 62 % des cas. Pour SINA : proposer au point du mois, après une livraison ou une publication, jamais pendant que le client corrige son site. Source : https://arxiv.org/html/2601.10253v1 (moyen ; 15 personnes).
3. **Chaque proposition dit sa raison et laisse le client régler la fréquence.** C'est ce que recommande la même étude, avec un 2e travail qui mesure 12 % de propositions vécues comme dérangeantes et 35 % ignorées. Sources : https://arxiv.org/html/2601.10253v1 et https://arxiv.org/html/2502.18658v4 (moyen).
4. **Un résumé quotidien automatique ne suffit pas.** OpenAI a lancé « Pulse », un résumé du matin préparé seul. Selon la presse, il a été annoncé comme retiré le 17 juin 2026 au profit de tâches programmées que l'utilisateur demande et règle lui-même. Je n'ai pas pu ouvrir la page d'aide officielle (erreur 404). Pour SINA : « ta journée est prête » doit partir de ce que le client a demandé, avec un bouton « plus de ceci / moins de cela ». Source : https://www.digit.in/news/general/openai-is-retiring-chatgpt-pulse-and-replacing-it-with-scheduled-tasks-here-is-why.html (faible).

### 5. Se souvenir du client dans la durée

1. **Le client doit voir et corriger ce qu'elle retient.** Une étude de la mémoire de ChatGPT montre que 96 % des souvenirs sont créés par le système seul, sans que l'utilisateur le demande. C'est une perte de maîtrise. Pour SINA : une page « ce que SINA sait de toi » que le client lit et corrige. Sources : https://arxiv.org/pdf/2602.01450 (solide), https://help.openai.com/en/articles/8590148-memory-faq (référence produit).
2. **Retenir aussi sa façon de travailler, pas seulement des faits.** Un banc d'essai récent sur « ne me redemande pas » montre que les mémoires actuelles retrouvent mal les préférences, s'adaptent mal quand elles changent, et les appliquent parfois là où elles ne vont pas. Pour SINA : noter chaque règle avec sa portée (« pour les publications » ou « pour tout ») et sa date, et remplacer l'ancienne quand le client change d'avis. Source : https://arxiv.org/pdf/2610.30485 (moyen ; résumé seulement lu, le fichier était trop lourd).
3. **Garder ses mots exacts, entre guillemets.** La méthode Copyhackers : les meilleurs textes viennent des mots mêmes des clients (« ne pas écrire, reprendre »). Pour SINA : conserver les phrases du client et des avis de ses clients mot pour mot, jamais reformulées dans la fiche. Source : https://copyhackers.com/how-to-do-rapid-fire-review-mining/ (faible à moyen).
4. **Attention : la mémoire pousse à flatter.** Un profil d'utilisateur mémorisé augmente la tendance de l'IA à approuver (par exemple +33 % pour un modèle Claude). Ce chiffre vient d'un blog, je ne l'ai pas vérifié dans l'étude d'origine. Le relecteur de SINA doit donc juger sans le profil flatteur. Source : https://www.taskade.com/blog/ai-sycophancy-explained (faible).

### 6. Produits à regarder

1. **Google Pomelli** part de l'adresse du site du client et en tire seul son « ADN de marque » : ton, polices, couleurs, style des photos. Il propose ensuite des idées de campagne, que le client choisit ou remplace par la sienne. Leçon : déduire avant de demander. Il y a aussi un piège : cet ADN est une photo figée, qui vieillit si le site change. Sources : https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli/ (moyen), https://almcorp.com/blog/google-pomelli-ai-marketing-tool-complete-guide/ (faible).
2. **Wix** pose 4 à 5 questions ciblées, qui s'adaptent selon les réponses : but du site, cible, ton, objectifs, ce qui distingue. Il prépare ensuite un tableau de bord avant le site. Sources : https://www.wix.com/blog/how-does-an-ai-website-builder-work, https://www.websitebuilderexpert.com/website-builders/how-use-wix-ai/ (faible à moyen).
3. **Durable** ne pose que 3 questions (métier, nom, ville) et produit un site en 30 secondes. Les avis disent que les sites se ressemblent tous. Leçon : trop peu de questions donne un résultat générique, ce qui confirme la règle de variété du propriétaire. Source : https://www.makingthatwebsite.com/durable-ai-website-builder-review/ (faible).

### Les questions qu'une très bonne agence pose toujours avant de créer une marque et un site

(Synthèse de l'IPA, de TripSix https://tripsixdesign.com/blog/best-brand-discovery-questions/, de HubSpot, de Brindle et des questionnaires de création de sites. SINA ne pose une question que si la réponse n'est pas déjà dans les photos, le site existant ou ce que le client a dit.)

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
14. Une marque que tu admires, et une que tu ne veux surtout pas ressembler ?
15. Qu'est-ce qui doit rester de ce que tu as déjà (nom, couleur, logo) ?
16. Où vends-tu : en ligne, en boutique, chez le client, dans quelle zone ?
17. Que doit faire un visiteur sur ton site : acheter, réserver, appeler, demander un devis ?
18. Tes prix, tes délais, tes conditions (livraison, retours, rendez-vous) ?
19. Quelles photos as-tu, et lesquelles te ressemblent le plus ?
20. Quelles preuves réelles as-tu : avis, années de métier, chiffres, labels ?
21. Sur quels réseaux es-tu, et lesquels t'amènent des clients ?
22. Combien veux-tu y consacrer, et à quoi verras-tu dans trois mois que ça marche ?
23. Y a-t-il des choses interdites ou obligatoires dans ton métier (mentions, règles) ?

### Les 5 changements qui auraient le plus d'effet

1. **Une fiche client vivante, relue avant chaque question et chaque création.** Elle garde les mots exacts du client, ses refus et ses choix, avec leur date et leur portée. Le client la voit et la corrige. C'est ce qui évite à la fois de reposer une question et de se tromper sur ce qu'il a dit (Laban 2025, étude de la mémoire de ChatGPT, MemPABench).
2. **Une règle pour chaque question.** SINA ne la pose que si la réponse manque à la fiche, ne se devine pas des photos ou du site, et change le résultat. Les questions sur le but viennent tout au début, celles sur les éléments à fournir avant la moitié du travail (SAGE 2025, étude sur le moment des questions).
3. **Relire au client ce qu'elle a compris, en clair, avant la première dépense.** En quelques lignes : son objectif, son client type, sa promesse, ses preuves. Il valide d'un geste (guide IPA).
4. **Toujours recommander une option, avec une raison en une phrase et des images.** Les choix sont proposés en boutons, l'écriture libre reste possible, et SINA ose dire non à une mauvaise idée (NN/g, recherche d'Anthropic sur la complaisance).
5. **Prendre les devants aux bons moments seulement.** Au point du mois, après une livraison ou une publication. Chaque proposition dit sa raison, et le client règle « plus ou moins de ceci » (étude de terrain de 2026, Horvitz, leçon de Pulse).

Ce qui n'a pas été vérifié : le chiffre de +33 % sur la complaisance liée à la mémoire, le retrait de Pulse (page officielle inaccessible), et le détail de MemPABench (seul le résumé a été lu). Aucun fichier du dépôt n'a été modifié.


---

# Rapport 4 : La marque, les noms, les angles et les textes

RAPPORT : CE QUE FONT LES MEILLEURS, ET CE QUE SINA PEUT EN REPRENDRE

Niveaux de preuve : FORT = étude publiée avec expériences. MOYEN = praticien reconnu, ou grand acteur qui décrit sa propre méthode. FAIBLE = blogs, ou chiffres repris d'une seconde main. Pour plusieurs études, je n'ai lu que le résumé, et je le dis à chaque fois. Aucun fichier du dépôt n'a été modifié.

### 1. Stratégie et positionnement

1. **Remplir le positionnement dans un ordre fixe (méthode d'April Dunford).** L'ordre est le suivant :
   - ce que le client ferait sans cette marque (y compris « ne rien faire ») ;
   - ce que la marque a et que les autres n'ont pas ;
   - ce que ça lui apporte (se demander « et alors ? ») ;
   - les clients qui y tiennent le plus ;
   - enfin la catégorie.
   Dunford signale trois pièges : partir des points forts du produit, compter des concurrents que le client ne rencontre jamais, et confondre positionnement et slogan. Pour SINA : chaque case doit être remplie avant d'écrire un nom ou un texte, et une case vague bloque la suite. Source : https://www.aprildunford.com/post/a-quickstart-guide-to-positioning. Preuve MOYENNE.

2. **La phrase « le seul » (Marty Neumeier).** La phrase est : « [Marque] est le seul [catégorie] qui [différence] ». Si un concurrent peut signer la même phrase, il n'y a pas de différence et on recommence. C'est un contrôle simple à automatiser : on demande à un juge si la phrase s'applique aussi à trois concurrents réels. Source : https://www.cuspcapital.com/article/onliness-statement. Preuve MOYENNE.

3. **Le « travail à accomplir » (Christensen).** Le client « embauche » un produit pour une tâche qui a trois faces : pratique, émotionnelle et sociale (comment il veut être vu). La vraie concurrence est souvent ailleurs : dans le cas célèbre du milkshake, c'étaient la banane et l'ennui. SINA devrait écrire les trois faces pour chaque type de client. Source : https://hbr.org/2016/09/know-your-customers-jobs-to-be-done. Preuve MOYENNE à FORTE (cas réels).

4. **Les quatre forces (Bob Moesta).** Deux forces poussent à acheter : le ras-le-bol et l'attrait. Deux forces retiennent : l'inquiétude et l'habitude, dont les gens parlent rarement. Pour SINA : chaque angle doit nommer l'inquiétude et l'habitude à lever, pas seulement la promesse. Source : https://jobstobedone.org/radio/unpacking-the-progress-making-forces-diagram/. Preuve MOYENNE.

### 2. Le nom

1. **Beaucoup de pistes, en plusieurs équipes, sans juger pendant la création.** C'est la méthode de Lexicon, l'agence qui a trouvé BlackBerry et Swiffer :
   - elle part de 1 000 à 3 000 idées et en garde environ 250 à polir ;
   - trois équipes travaillent à part : une qui connaît le vrai projet, une qui croit nommer un concurrent, une qui nomme tout autre chose (un vélo, par exemple) ;
   - personne ne juge pendant la création.
   Pour SINA : 150 à 300 pistes faites par des spécialistes aux consignes différentes, dont une prise dans un domaine lointain, puis le tri. Sources : https://www.lennysnewsletter.com/p/naming-expert-david-placek et https://www.cnn.com/2019/09/06/success/david-placek-lexicon-branding. Preuve MOYENNE.

2. **Casser l'uniformité de l'IA.** Les modèles donnent des réponses très semblables entre eux et d'un essai à l'autre. Ce constat vient d'une étude primée en 2025, mais il est contesté : https://arxiv.org/abs/2510.22954. Une parade qui ne demande aucun réglage consiste à demander plusieurs réponses avec la probabilité de chacune, puis à puiser dans les moins probables. Les auteurs mesurent 1,6 à 2,1 fois plus de variété, sans perte de qualité : https://arxiv.org/abs/2510.01171. Preuve MOYENNE à FORTE (articles de recherche pas encore relus par des pairs).

3. **Ne jamais demander « tu aimes ? ».** Placek fait le « test du concurrent » : « un concurrent lance ce nom demain, tu ressens quoi ? ». Un nom qui divise est bon signe, un nom confortable est mauvais signe. Le guide de l'agence Igor juge un nom d'après le positionnement, et décrit les noms purement descriptifs comme « vides d'émotion ». Ses noms « d'expérience » (Explorer, Navigator) sont une bonne cible pour la règle du propriétaire : un mot simple du métier, mais pris par son côté vécu. Source : https://www.igorinternational.com/process/i/Igor%20Naming%20Guide%202022A.pdf. Preuve MOYENNE.

4. **Facile à dire, et un son qui porte du sens.**
   - Les actions dont le nom se prononce facilement ont mieux démarré en bourse : https://www.eurekalert.org/news-releases/735602. Preuve FORTE, mais la méthode est discutée par des économistes.
   - Les sons d'un nom transmettent un sens. Les voyelles comptent plus que les consonnes, et les voyelles claires évoquent la légèreté : https://www.semanticscholar.org/paper/Creating-Brand-Names-With-Meaning:-The-Use-of-Sound-Klink/49935bff35033d736b89b6e816af80ae9699e88d. Preuve FORTE (expériences en laboratoire).
   - Contrôles à ajouter, faciles à simuler : le « test de la radio » (entendu une fois, écrit juste) et le rappel après une autre tâche. Preuve FAIBLE.

5. **Les vérifications juridiques.**
   - Bases à interroger : INPI, office européen des marques, TMview, base mondiale de l'OMPI.
   - Il faut chercher les noms proches, pas seulement identiques, et vérifier aussi les classes voisines.
   - Ces bases ne couvrent ni les noms de sociétés ni les adresses Internet : il faut les vérifier à part.
   - L'INPI ne contrôle pas les droits antérieurs.
   SINA doit donc écrire « aucune marque identique ou proche trouvée dans… », jamais « libre ». Source : https://pareil-au-meme.fr/guides/tmview. Preuve MOYENNE.

### 3. Les trois angles

1. **Partir des moments d'achat (Romaniuk et Sharp, institut Ehrenberg-Bass).** Un moment d'achat se décrit par sept questions : pourquoi, quand, où, en faisant quoi, avec qui, avec quoi, en ressentant quoi. Règle proposée pour SINA : deux angles doivent différer sur au moins trois de ces sept réponses. Cela colle à la définition du propriétaire (une situation, pas un âge). Source : https://www.quantilope.com/resources/how-to-activate-category-entry-points-ceps. Preuve MOYENNE à FORTE (programme de recherche reconnu, lu par une source secondaire).

2. **Varier le degré de connaissance du client (Eugene Schwartz).** Le client peut ne pas encore savoir qu'il a le besoin, connaître son problème, comparer des solutions, ou connaître déjà la marque. Le titre change selon le cas. Mettre les trois angles à des degrés différents les écarte naturellement. Source : https://www.copyblogger.com/stages-of-awareness. Preuve MOYENNE (classique du métier).

3. **La règle de Meta sur la variété.** Meta regroupe et traite comme une seule les publicités qui partagent l'image et le thème : changer seulement le texte du bouton ne compte pas. Ce qui compte, c'est le type de client et l'usage, le format, le thème. Chaque angle doit donc changer à la fois le client, le produit vedette, l'argument et la scène de l'image. Source : https://www.jonloomer.com/meta-andromeda/. Preuve MOYENNE (Meta lu par des sources secondaires).

4. **Contrôle automatique de l'écart (ma proposition, à essayer).** On donne à un juge les trois textes sans étiquette, et il doit retrouver quel type de client va avec quel texte. S'il se trompe, les angles sont trop proches. On peut y ajouter une mesure de proximité du sens entre les angles, comme dans l'étude citée en 5.2.

### 4. Des textes clairs qui ne sonnent pas IA

1. **Les sept défauts relevés par 18 écrivains professionnels sur 1 057 paragraphes d'IA.** Par fréquence : mot maladroit (28 %), phrase mal construite (20 %), explication inutile (18 %), cliché (17 %), puis manque de précision, style ampoulé et temps qui changent. Ces défauts sont les mêmes chez GPT-4o, Claude et Llama. Une correction par IA guidée par des exemples de corrections d'experts améliore le texte, mais reste en dessous des humains. Pour SINA : un relecteur qui pointe chaque défaut sur le passage exact, avec des exemples avant/après. Source : https://arxiv.org/abs/2409.14509. Preuve FORTE.

2. **La liste des tics de l'IA.**
   - Les tics : « ce n'est pas X, c'est Y », les listes de trois, « se présente comme » au lieu de « est », l'emphase publicitaire, « les experts disent », les fins de phrase en « -ant ». Source : https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing. Preuve MOYENNE.
   - Sur 15 millions de résumés scientifiques, les mots en excès depuis l'IA sont surtout des verbes et des adjectifs de style. Source : https://www.science.org/doi/10.1126/sciadv.adt3813. Preuve FORTE.
   - Pour SINA : construire une liste en français à partir de ses propres textes, en comptant les mots qu'elle emploie bien plus souvent que des textes humains.

3. **Concret et sensoriel.**
   - Un langage plus concret rend les clients plus satisfaits et les fait acheter davantage : +8,9 % de satisfaction par degré de concret, sur plus de 1 000 échanges réels. Source : https://pdfs.semanticscholar.org/0f5c/854d0968a367ca81bc667b256304af01533f.pdf. Preuve FORTE.
   - Une publicité qui parle de plusieurs sens donne un meilleur goût perçu qu'une publicité qui ne parle que du goût. Source : https://ideas.repec.org/a/oup/jconrs/v36y2010i5p748-756.html. Preuve FORTE.
   - Les mots compliqués sans nécessité font juger l'auteur moins intelligent. Source : https://www.eurekalert.org/news-releases/808085. Preuve FORTE.

4. **La voix du client (Joanna Wiebe).** Elle relève dans les avis, les questionnaires et les entretiens les phrases « qui collent », les classe par fréquence, et bâtit la page avec elles. Pour SINA : demander au client trois à cinq vraies phrases de ses clients (avis, messages), lire les avis publics des concurrents, et ne jamais en inventer. Source : https://copyhackers.com/organize-your-voc-data/. Preuve MOYENNE.

5. **Mesurer la clarté.**
   - Le langage clair de l'État : phrases courtes, mots adaptés au lecteur, ordre logique, mise en page lisible. Source : https://www.plus.transformation.gouv.fr/engagement/vous-disposez-dune-information-claire-simple-et-accessible.
   - Le test à trous : on retire un mot sur six. Le texte est compris si le lecteur en retrouve 60 % ou plus. Source : https://www.nngroup.com/articles/cloze-test-reading-comprehension/. Preuve MOYENNE à FORTE.
   - Le test des cinq secondes : poser des questions de souvenir (« qu'est-ce qu'on vend ? »), jamais de goût. Source : https://www.lyssna.com/guides/five-second-testing-guide/. Preuve MOYENNE.

### 5. Juger automatiquement, et de façon fiable

1. **Les juges IA ont des biais connus.**
   - Ils préfèrent la réponse placée en premier : il faut juger deux fois en inversant l'ordre.
   - Ils préfèrent la réponse la plus longue. Source : https://arxiv.org/abs/2306.05685. Preuve FORTE.
   - Ils préfèrent les textes qui leur semblent familiers, donc le style IA. Source : https://arxiv.org/abs/2410.21819. Preuve FORTE.
   Un juge Claude risque donc de récompenser le style de Claude. La parade : un jury de modèles de familles différentes, meilleur qu'un seul grand juge et sept fois moins cher. Source : https://arxiv.org/abs/2404.18796. Preuve FORTE.

2. **Comparer par paires plutôt que noter sur 10.** C'est la méthode d'une étude sur la créativité en publicité : 11 012 comparaisons faites par 678 créatifs. Mais les juges IA y étaient faiblement et irrégulièrement d'accord avec ces créatifs : l'IA seule ne sait pas juger l'originalité. Source : https://arxiv.org/abs/2509.09702. Preuve FORTE (résumé seulement).

3. **Le lecteur novice simulé.** Un modèle reçoit le texte seul, sans rien sur la marque, et doit dire ce qu'on vend, à qui, et quoi faire ensuite. On compare ses réponses à la fiche, et on y ajoute le test à trous. Limite à respecter : les clients simulés reproduisent mal la variété des vrais clients, parfois même à l'envers. On s'en sert donc pour la clarté, jamais pour prédire des ventes. Source : https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4395751. Preuve FORTE sur la limite.

4. **Régler le juge sur le propriétaire.** On rassemble ses verdicts passés (« Parfait », les refus, ses corrections) et on mesure si le juge tombe d'accord avec lui avant de lui faire confiance. Il existe une méthode statistique pour décider quand un juge IA peut remplacer un juge humain : https://arxiv.org/abs/2501.10970. Preuve MOYENNE.

### Les cinq changements qui auraient le plus d'effet

1. **Une relecture en trois temps.** Un relecteur armé des sept défauts d'écrivain et d'une liste française des tics de l'IA. Puis un lecteur novice sans contexte avec le test à trous. Puis un jury d'une autre famille que Claude, qui compare par paires en inversant l'ordre.
2. **Le positionnement d'abord.** L'ordre de Dunford, les trois faces du travail à accomplir et la phrase « le seul », validés avant tout nom ou texte.
3. **Le nom en grand volume.** 150 à 300 pistes faites par des équipes aux consignes séparées, en puisant dans les réponses les moins probables. Puis les filtres : prononciation, test de la radio, recherche de noms proches à l'INPI et à l'office européen, test du concurrent.
4. **Des angles construits sur des moments d'achat différents.** Au moins trois réponses sur sept qui changent, un degré de connaissance différent, et le contrôle par devinette.
5. **La voix du client et le concret.** De vraies phrases de clients collectées et reprises, des textes concrets et sensoriels, et aucun chiffre ni avis sans source.


---

# Rapport 5 : La création de sites par IA

## Comment les meilleurs font des sites par IA (2025-2026) : ce que SINA peut reprendre

Je n'ai modifié aucun fichier du dépôt. J'ai cherché sur Internet et lu les pages clés : deux articles de recherche en entier, une page d'aide de Relume et un article technique de Lovable. Pour le reste, je me suis appuyé sur les résumés de recherche.

Niveaux de preuve :
- **forte** : étude publiée ou norme officielle ;
- **moyenne** : document de l'éditeur ou article de recherche pas encore relu par des pairs ;
- **faible** : avis de blogs.

### 1. Les créateurs de sites par IA aujourd'hui

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

### 2. Sections et règles, ou création libre

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

### 3. Le contrôle de qualité automatique

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

### 4. Ce qui fait vendre, en règles vérifiables

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

### 5. La variété sans perdre la qualité

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

### 6. Modifier en cliquant sur l'aperçu

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

### Les 5 changements qui auraient le plus d'effet

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


---

# Rapport 6 : Les publications, les publicités, les vidéos et le suivi du mois

## Ce que font les meilleurs : rapport pour SINA (publications, publicités, suivi)

Je n'ai modifié aucun fichier. Beaucoup de sources sont des blogs d'éditeurs. J'indique donc un niveau de preuve pour chaque point :
- **fort** : recherche universitaire ou grosse étude indépendante ;
- **moyen** : données d'une plateforme, d'un éditeur sur un gros échantillon, ou étude du métier ;
- **faible** : avis de praticiens.

### 1. Les outils d'IA de gestion des réseaux

1. **Une seule fiche de marque, lue par toutes les créations.** Google Pomelli lit le site du client et en tire un « ADN de l'entreprise » : couleurs, polices, ton, style d'images. Le client peut le corriger, puis chaque campagne s'en sert. Pomelli ne publie pas : le client télécharge et publie lui-même, comme chez SINA. Pour SINA, la planche de marque devient cette fiche unique, et chaque spécialiste la reçoit. Preuve : moyenne (description du produit, aucun résultat mesuré). https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli-photoshoot/ ; https://www.dataslayer.ai/blog/google-pomelli-ai
2. **La campagne d'abord, les publications ensuite.** Pomelli propose des idées de campagne (soldes de saison, nouveauté) avant de créer les images. Il peut aussi partir de la page d'un produit (photos, titre, description). Pour SINA, le calendrier du mois se bâtit sur 2 à 4 temps forts (offre, nouveauté, saison) et les publications du jour en découlent. Preuve : moyenne. Même source.
3. **Partir de la vraie photo du produit, puis vérifier que c'est bien lui.** La fonction « séance photo » de Pomelli transforme une photo de produit en scènes de studio ou de vie. Google ne promet pas que le produit reste fidèle. Pour SINA, chaque image passe un contrôle qui compare le produit à la photo d'origine : forme, étiquette, couleur. Preuve : moyenne. Même source.
4. **3 à 5 thèmes qui reviennent, et un document de ton.** La méthode de Hootsuite tient en six étapes : ton et thèmes, premier jet, relecture de chaque publication, accord pour les offres, programmation, mesure. On réinjecte ensuite les publications qui ont marché. Le document de ton contient :
   - des adjectifs expliqués ;
   - une liste de mots interdits ;
   - quelques vraies publications réussies.
   Preuve : faible à moyenne (guide d'éditeur). https://blog.hootsuite.com/ai-social-media-content-creation-workflow/
5. **Des modèles de mise en page variés mais verrouillés.** Canva s'appuie sur un kit de marque (logo, couleurs, polices) et des modèles verrouillés. Les testeurs notent que son IA ne garantit pas le ton : il faut relire. Preuve : faible. https://www.allable.ai/blog/canva-ai-review/

### 2. Une publication efficace pour un commerce local

1. **La régularité compte plus que les pics.** Buffer a étudié 2,1 millions de publications de 102 000 comptes :
   - de 3 à 5 publications par semaine, chacune touche 12 % de monde en plus qu'avec 1 ou 2 ;
   - à plus de 10, le gain n'est que de 24 % : il diminue vite ;
   - une semaine sans publication freine la croissance.
   Les forfaits (7 à 21 images par semaine) dépassent largement ce seuil. Mon avis, non vérifié : au-delà d'une image par jour dans le fil, mieux vaut varier les formats (carrousel, story) qu'empiler. Et ne jamais laisser une semaine vide. Preuve : moyenne à forte (très gros échantillon, mais corrélation). https://buffer.com/resources/how-often-to-post-on-instagram/
2. **Mélanger les formats.** Sur 67 millions de publications, le taux d'interaction moyen est :
   - carrousels : 0,55 % ;
   - vidéos courtes : 0,52 % ;
   - image seule : 0,37 %.
   Sur les petits comptes, les carrousels sont aussi les plus vus. Une publication « une image » peut donc souvent devenir un carrousel de 3 à 5 images. Preuve : moyenne. https://www.socialinsider.io/social-media-benchmarks/instagram
3. **Le carrousel a deux couvertures.** Selon des créateurs, Instagram remontre parfois un carrousel à partir de la 2e image. Celle-ci doit donc se comprendre seule, ce qui rejoint l'exigence « chaque publication se comprend seule ». Preuve : faible (observé, non confirmé par Instagram). https://socialboostdigital.com/blog/instagram-carousel-algorithm-double-exposure
4. **L'originalité et le partage à un ami.** Le patron d'Instagram place l'originalité parmi ce qui est favorisé. Les comptes qui republient le contenu des autres perdent les recommandations. Pour un petit compte, le chiffre clé est le nombre d'envois en message privé. La métaphore juste qui fait sourire sert exactement à ça. Preuve : moyenne (propos rapportés). https://www.pepperagency.com/blog/every-instagram-update-adam-mosseri-has-shared-in-2026---updated-october-2026
5. **La structure qui vend, selon le guide officiel de TikTok pour les petites entreprises.**
   - Une accroche dans les 3 à 6 premières secondes. Exemples : « tout le monde en parle », une astuce pour un problème, le prix ou l'offre, un appel à la cible.
   - Ensuite 3 à 5 bénéfices, puis une invitation claire.
   - Du texte à l'écran, le son activé, un format vertical.
   - Des zones laissées libres pour les boutons de l'application.
   « Appel à la cible » correspond bien aux trois angles. L'invitation doit porter le désir, sans donner d'ordre. Preuve : moyenne (guide de la plateforme, études qu'elle a commandées). https://ads.tiktok.com/business/library/TikTok_SMB_Creative_Playbook_2025.pdf

### 3. Les publicités créées par IA

1. **Une idée d'abord, des déclinaisons ensuite, et des idées vraiment différentes.** Le système de Meta récompense la diversité. Pour ses spécialistes, cinq fois la même photo avec des fonds différents ne lui apporte presque rien. Il faut changer le type de client, le décor, le bénéfice ou le format. Meta dit seulement que plus de diversité donne de meilleurs résultats. Les nombres conseillés (4 à 6, ou 10 à 15 créations) viennent d'agences. Pour SINA, une campagne préparée = les trois angles × deux formats. Preuve : moyenne. https://adscale.com/blog/meta-andromeda-update/ ; https://confect.io/tactics/meta-andromeda-2026
2. **L'image et le texte pèsent plus que le ciblage.** Nielsen, sur environ 500 campagnes, attribue 47 % de l'effet sur les ventes à la qualité de la création. Une étude de Kroger, Vidmob et MMA porte sur 1 934 publicités, sur Meta et sur l'outil d'achat d'espace de Google :
   - la moitié du budget allait à des créations faibles ;
   - une vente y coûtait 25 $, contre 11 $ pour les bonnes ;
   - les créations qui suivaient leurs consignes convertissaient 4 fois plus.
   C'est l'argument « aucun euro gaspillé » : noter chaque publicité avant de la remettre. Preuve : moyenne (étude du métier, corrélation). https://ppc.land/half-of-krogers-meta-and-dv360-spend-went-to-low-converting-ads-study-finds/ ; https://getrecast.com/creative-performance/
3. **Les scènes avec des personnes gagnent, mais SINA a une règle.** Chez Kroger, 87 % des publicités montrant une scène humaine du quotidien étaient au-dessus de la moyenne, contre 38 % sans. Comme SINA ne met jamais de personne sans accord, elle peut demander au client ses propres photos ou son accord écrit. Sinon : des mains, un geste, un lieu vécu. Preuve : moyenne (corrélation). Même source.
4. **Livrer la publicité en pièces détachées.** Meta crée lui-même des variantes : jusqu'à 6 textes, des fonds, de l'animation. Il annonce +22 % de rentabilité, un chiffre qu'il fournit lui-même. Il étiquette aussi automatiquement les créations faites par IA. SINA livre donc l'image sans texte, l'image avec texte, et des textes courts séparés. Le client peut ainsi activer ces options d'un geste. Preuve : moyenne. https://techcrunch.com/2024/05/07/metas-ai-tools-for-advertisers-can-now-create-full-new-images-not-just-new-backgrounds ; https://www.socialmediatoday.com/news/meta-adds-updated-disclosure-tags-for-ai-generated-ads/824658
5. **Une image d'IA « bizarre » coûte de la confiance.** Sondage de DoubleVerify, 22 000 personnes :
   - 42 % jugent mal une marque qui utilise une IA de mauvaise qualité ;
   - 40 % voient d'un bon œil une IA soignée.
   La qualité décide. Une image étrange se refuse. Preuve : moyenne (sondage). https://doubleverify.com/company/newsroom/global-study-quality-matters-most-as-ai-transforms-online-content-and-advertising
6. **Une note qui prédit les résultats ne sert qu'à classer.** AdCreative annonce « plus de 90 % de précision », sans méthode publiée. Ce type de note sert à classer les variantes entre elles, pas à promettre un résultat. Preuve : faible. https://dupple.com/reviews/adcreative-ai

### 4. La vidéo courte par IA et le montage automatique

1. **L'image fixe d'abord, la vidéo ensuite.** La chaîne conseillée part d'une photo de référence du produit. On en tire 5 à 8 plans de 3 à 5 secondes, animés à partir de l'image, puis on les assemble. Valider les images fixes avant de payer l'animation évite de gâcher de l'argent. Preuve : faible (praticiens). https://aitoolsguidebook.com/en/articles/ai-product-commercial-video/
2. **Ce que l'IA fait bien et mal.**
   - Bien : un produit posé, les matières, des mains.
   - Mal : les visages, la parole, la démonstration exacte et les étiquettes, qui se déforment.
   Il faut donc contrôler le produit image par image. Preuve : faible à moyenne. https://www.spaceads.agency/blog/ai-video-generators-veo-3-sora-2-kling-runway-ads-2026
3. **Le coût varie beaucoup d'un fournisseur à l'autre.** Selon une source : environ 0,10 $ la seconde pour Kling, environ 0,75 $ pour Veo 3.1. L'offre de Sora a changé en 2026. Tout fournisseur reste à valider par le propriétaire, avec un tout petit essai d'abord. Preuve : faible (prix qui changent vite). Même source ; https://opencreator.io/blog/ai-video-models-comparison-2026
4. **Le « niveau CapCut », c'est le rythme et la vérité, pas le cinéma.** Le guide de TikTok demande :
   - 9 à 15 secondes, format vertical, son indispensable ;
   - du texte à l'écran, des sous-titres, des coupes sur le rythme ;
   - des zones d'interface laissées libres.
   Une étude commandée par TikTok trouve que les vidéos simples suscitent 33 % plus d'intérêt d'achat que les vidéos très léchées. Côté Meta : pas de bandes noires, et pas de lente ouverture sur le logo. Preuve : moyenne. Guide TikTok ci-dessus ; https://ads.tiktok.com/business/library/Global_SMB_Creative_Playbook.pdf
5. **Le gain mesuré reste modeste.** Meta dit que ses vidéos générées augmentent les conversions de plus de 3 % dans ses tests, un chiffre qu'il donne lui-même. La vidéo n'est pas une baguette magique, ce qui confirme qu'on la traite en dernier. Preuve : moyenne. https://benly.ai/learn/meta-ads/advantage-plus-updates-2026

### 5. Le suivi du mois et la valeur ressentie

1. **Montrer le travail fait.** Une recherche de Harvard (Buell et Norton, 2011, cinq expériences) montre un effet net. Les gens donnent plus de valeur à un service qui montre le travail accompli, même quand le résultat est identique. Le point du mois raconte donc ce que SINA a fait : publications, images refusées puis refaites, idées proposées. Il dit ensuite ce que ça a donné. Preuve : **forte**. https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376
2. **Un objectif écrit, suivi chaque mois.** Selon Totango, les clients qui ont un plan de réussite écrit partent deux fois moins. L'engagement « objectif du mois » va dans ce sens, et chaque point du mois doit s'y rattacher. Preuve : faible à moyenne (éditeur). https://jumpstartpartners.finance/blog/saas-churn-analysis-reduce-customer-churn-rate
3. **Cinq chiffres qui parlent à un commerçant, pas les « j'aime ».** Les plus utiles : appels, messages, demandes reçues, visites du site, ventes. Sans branchement aux plateformes, le Studio en mesure déjà une partie lui-même : son site, la boîte des demandes, le carnet de clients. Preuve : faible (praticiens). https://agencyanalytics.com/blog/social-media-metrics
4. **Les premières semaines comptent le plus.** Une source affirme que 43 % des petites entreprises qui partent le font au premier trimestre. Il faut donc un premier résultat visible très vite. Preuve : faible. Même source qu'au point 2.
5. **Prendre les devants sans déranger.** Une étude présentée à la conférence CHI 2025 a suivi 398 interventions d'un assistant qui agit de lui-même :
   - 53 % ont servi ;
   - 12 % ont dérangé ;
   - 35 % ont été ignorées.
   Les suggestions qui insistent sont jugées agaçantes. Montrer clairement ce que l'assistant est en train de faire réduit la gêne. Pour SINA : un seul « ta journée est prête » par jour, qui regroupe tout, et elle retient chaque refus. Preuve : moyenne (petit échantillon, domaine de la programmation). https://dl.acm.org/doi/10.1145/3706598.3713357

### 6. Juger une publication avant de la montrer

1. **Le test de l'inconnu.** Un relecteur reçoit l'image seule, sans la fiche de marque. Il doit dire en une phrase ce qui est vendu, par qui, quelle offre, et ce qu'on peut faire. Si sa réponse s'écarte de l'intention, la publication est refaite. Ce principe vient des tests publicitaires avant diffusion (Kantar, System1 : compréhension, lien avec la marque). Ce mécanisme est une proposition de ma part, à essayer. Preuve : moyenne pour le principe. https://www.neuronsinc.com/brand-building/ad-testing-software
2. **Une grille de critères en oui ou non plutôt qu'une note globale.** Les critères :
   - logo présent et lisible ;
   - produit entier et fidèle ;
   - texte sur une partie calme de l'image ;
   - zones d'interface libres ;
   - aucune personne ;
   - orthographe juste ;
   - assez différente des 10 dernières publications.
   Une recherche montre que l'ordre des critères d'une grille change le gagnant dans 16 à 39 % des cas. Il faut donc mélanger l'ordre et juger deux fois. Preuve : moyenne. https://arxiv.org/html/2602.02219v2
3. **Comparer deux versions dans les deux sens.** Le juge préfère souvent celle qu'il voit en premier. On présente donc chaque paire dans les deux ordres. Preuve : moyenne. https://aclanthology.org/2025.ijcnlp-long.18.pdf
4. **Obliger le juge à décrire l'image avant de la noter.** Une étude de 2026 signale que des modèles qui jugent des images notent parfois sans vraiment les regarder. Je n'ai pu lire que son titre : ce point n'est pas vérifié. https://arxiv.org/abs/2604.17768
5. **Régler le juge sur les goûts du propriétaire.** On constitue une base des images qu'il a validées (« Parfait ») ou refusées (« enlève la 7 »), puis on mesure si le juge tranche comme lui. C'est la méthode de Kroger : 231 détails relevés, ramenés à 23 consignes, pour 81 % de prédictions justes. Preuve : moyenne. Source Kroger ci-dessus.

### Les 5 changements qui auraient le plus d'effet

1. **Le test de l'inconnu et la grille en oui ou non, appliqués à chaque publication et publicité avant tout affichage.** La grille est aussi réglée sur les validations et refus passés du propriétaire. C'est ce qui protège le plus son argent (étude Kroger).
2. **Un calendrier du mois construit sur des temps forts et 3 à 5 thèmes, nourri par les trois angles.** Jamais une semaine vide, des formats variés (image, carrousel dont la 2e image se comprend seule), et la 1re publication dit l'offre en clair.
3. **Des publicités livrées en trois idées vraiment différentes (les trois angles) × deux formats.** Chacune est notée avant d'être remise, et livrée en pièces détachées pour les options de Meta.
4. **Un point du mois qui montre le travail accompli** (preuve forte, Harvard), avec cinq chiffres mesurés par le Studio lui-même (demandes, visites, ventes) et rattachés à l'objectif du mois.
5. **Pour la vidéo, plus tard : des images fixes validées, puis de courts plans animés, puis un montage automatique de 9 à 15 secondes, sous-titré, avec du son.** Le produit est contrôlé image par image, et on fait le plus petit essai payant, avec son accord, avant de choisir un fournisseur.


---

# Rapport 7 : Les produits qui font déjà une partie du travail de SINA

## Les produits d'IA qui font déjà une partie du travail de SINA : faits sourcés

Aucun fichier du dépôt n'a été modifié. Niveaux de preuve utilisés : **officiel** (page ou blog de l'éditeur), **test indépendant** (essai pratique publié par un tiers), **avis** (Trustpilot, G2, forums, Product Hunt), **presse**. Beaucoup de « tests » trouvés sont des blogs payés à la commission (affiliation) : je le signale quand c'est le cas.

### 1. Tableau comparatif

| Produit | Ce que le client donne | Ce que l'IA fait seule | Comment c'est construit (public) | Qualité constatée | Défauts récurrents |
|---|---|---|---|---|---|
| **Durable** | 3 questions : métier, lieu, nom | Site complet : modèle de page, couleurs, images, textes, formulaire, carte | Non publié (modèles et chaîne inconnus) | Tooltester : 3,9/5 ; le premier jet ne visait pas le bon style, il a fallu relancer plusieurs fois | « Tous les modèles se ressemblent, quel que soit le métier » ; faux témoignages écrits sur demande ; litiges de facturation et de nom de domaine |
| **Google Pomelli** | L'adresse du site existant | « Business DNA » (ton, polices, couleurs, images), idées de campagnes, visuels pour réseaux et publicités ; depuis février 2026, photos produit en studio | Google Labs avec DeepMind ; photos produit faites par Nano Banana (officiel) | Gratuit, rapide | « Esthétique de série », « sans âme de marque » ; résultat faible si le site a de mauvaises photos ; texte abîmé dans les images animées ; anglais seulement, 4 pays |
| **Lovart** | Une conversation ; il pose des questions sur la marque | Logo, palette, typographie, charte, maquettes, publications, vidéos | Moteur de raisonnement « MCoT » qui planifie et garde la cohérence, plusieurs agents, modèles extérieurs (GPT, Flux, Veo, Kling) | Apprécié pour la cohérence de marque ; 800 000 inscrits en bêta (presse) | « Surcouche » sur des modèles existants ; texte déformé dans les images ; crédits brûlés sur les échecs ; résultats inégaux sur les demandes complexes |
| **Manus** | Une consigne | Planifie, code, met en ligne un site | Environ 50 appels d'outils par tâche ; un fichier todo.md réécrit en continu ; erreurs laissées en mémoire ; charpente reconstruite 4 fois (officiel) | Exécute toutes les étapes sans erreur | Sites « reconnaissables », « un échafaudage, pas une marque » ; textes à reprendre ; crédits |
| **Genspark** (Super Agent, AI Designer) | Une consigne | Logo, système de marque, emballage, site, publicités, publications | Plusieurs modèles spécialisés : le travail est découpé puis envoyé au modèle le plus adapté ; selon le cas client publié par Anthropic, les modèles se vérifient entre eux | 36 M$ de revenu annuel en 45 jours (cas client publié par Anthropic, non vérifié) | Autonomie encore fragile ; crédits peu clairs |
| **Sintra AI** | Questions d'accueil, plus des documents dans « Brain AI » (pages ajoutées une par une, pas d'exploration du site) | 12 assistants ; Soshie écrit les publications | Non publié | 40 000 clients ; 17 M$ levés (presse) | Textes génériques, « mêmes images » ; crédits épuisés vite ; Trustpilot dit avoir masqué la note pour avis incités (source tierce) |
| **Marblism** | Non documenté | « Employés » : réseaux, blog, ventes, secrétariat | Non publié (passé par Y Combinator) | G2 : 1 avis, 1 étoile | Sur Reddit (cité de seconde main), Sonny oublie le contexte |
| **Hostinger AI Builder / Horizons** | Nom, courte description, vente en ligne ou non ; ou une consigne libre | Site ou application, hébergement | Discussion qui écrit le code | Tooltester : 3,8 et 3,9/5 ; plus d'un million d'utilisateurs, 93 à 95 % font leur premier site (officiel) | « Artificiel », images et textes génériques ; erreurs qu'il ne sait plus réparer en cours de projet |
| **Wix** (ADI puis Harmony/Aria) | Type de site, nom, lieu, fonctions, thème, plus les données trouvées sur ses réseaux | Mise en page, couleurs, polices, textes, applications | ADI (2016) choisit dans des modèles de mise en page ; Aria agit sur la structure de code de Wix (officiel) | Tooltester : 4,5/5, « meilleur d'ensemble » | Harmony (test indépendant) : sections cassées, « Lorem Ipsum », pages vides, boutons sans effet, même police « Fraunces » d'un essai à l'autre ; l'IA dit avoir corrigé alors que rien n'a changé |
| **Shopify** (Magic, Sidekick, AI Store Builder) | Quelques mots-clés | 3 boutiques au choix sur le thème Horizon ; Sidekick agit dans l'administration | Le plus documenté (voir constat 4) | Tooltester : 3/5 pour Magic | Ton « aléatoire », adjectifs répétés ; Sidekick a inventé une croissance de 887 % ; règles de longueur ignorées ; retour à l'anglais en cours de tâche (forums) |
| **HubSpot Breeze** | Court résumé, plus les données du fichier clients | Articles, pages, publications | Agents en tâche de fond, brouillons soumis à relecture humaine | Peu de chiffres publics | Agent réseaux en anglais seulement ; prix flous |
| **Typeface (Arc)** | Une « Brand Hub » (charte complète, grandes entreprises) | Courriels, pages, publicités, images | Agents spécialisés et agent gardien de la marque (officiel) | Pas d'avis public exploitable | Prix sur devis ; noms de produits qui changent |
| **Jasper** | Guide de style ou texte d'exemple | Textes marketing | Choisit le modèle selon la tâche ; couche « Jasper IQ » (officiel) ; notation avant relecture (source tierce) | — | La voix de marque reste une consigne, pas un barrage (source tierce) |
| **Looka** | Nom, métier, styles aimés sur un mur d'exemples, couleurs | 40 à 60 logos, kit de marque | Assemble des symboles, polices et dispositions d'une bibliothèque commune ; apprentissage automatique fait avec TensorFlow (officiel) | Facile, « professionnel » | « Pas original » : la même bibliothèque sert à 20 millions d'utilisateurs |
| **Canva** (Magic Studio, Canva AI 2.0) | Une consigne | Visuels en calques modifiables | Modèle de conception maison qui produit des calques séparés, lancé en octobre 2025 (officiel) | 24 milliards d'utilisations en 2025 (estimation de Sacra) | Pas de test indépendant de qualité trouvé |
| **Framer AI** | Une consigne | Ossature de site | Sections types | Premier (8,8/10) d'un test où six outils ont reçu le même résumé (BotForge) | Sections standard, dispositions « homogènes », textes génériques |
| **10Web** | Une consigne ou l'adresse d'un site existant | Site WordPress, extensions | Éditeur Elementor modifié | Tooltester : 3,5/5 | Une boulangerie et une agence ont reçu **exactement le même dessin** |
| **Relume** | Courte description | Plan du site, puis maquette fil de fer de chaque page | Bibliothèque d'environ 1 000 composants | Propre, prévisible | Dispositions communes du web (constat des revues) |
| **Holo** | L'adresse du site | Profil de marque, publicités, publications, courriels | Non publié | Trustpilot 4,4 sur 1 095 avis (cité par une revue) | Couleurs et polices à corriger ; inutile si la marque est encore floue |
| **AdCreative.ai** | Logo, couleurs, textes | Des centaines de publicités, avec une note de réussite | Note de réussite annoncée à « plus de 90 % » par l'éditeur | G2 environ 4,3 | « Chaque design finit sur les mêmes modèles » ; la note ne correspond pas toujours aux résultats ; montées de forfait automatiques |
| **Predis.ai / Ocoya** | Une idée en une ligne, ou l'adresse d'un produit, plus un kit de marque | Images, carrousels, vidéos, légendes, mots-dièse | Non publié | Rapide | Images « de banque d'images de manuel » ; Ocoya : publications qui échouent, légendes tronquées |

### 2. Les constats qui reviennent partout

**Constat 1 : peu d'informations au départ donne un résultat générique.** C'est la plainte la plus fréquente. Les outils qui posent trois questions ou lisent une adresse produisent un résultat moyen, que l'utilisateur doit reprendre.
- Pour Pomelli, une consigne vague donne un résultat générique, et un site sans bonnes photos donne de mauvais visuels. Preuve : test indépendant et avis. https://www.mindstudio.ai/blog/google-pomelli-review-features-limitations ; https://techglimmer.io/google-pomelli-ai-marketing-tool-review-2025/
- Holo ne sert pas tant que la marque n'est pas claire. Preuve : avis. https://www.gethookd.ai/learn/holo-ai-reviews-pricing-alternatives-is-this-ai-marketing-tool-legit/
- Sur Wix, Tooltester trouve que le dessin dépend surtout du thème choisi : l'outil « n'analyse pas vraiment le contenu ». Preuve : test indépendant. https://www.tooltester.com/en/blog/ai-website-builder/
- **Limite importante** : sur Wix Harmony, un résumé détaillé n'a rien arrangé. Le testeur parle même de l'un des pires sites obtenus. Plus d'informations ne suffit donc pas si la chaîne qui construit est fragile. Preuve : test indépendant. https://www.flowcre8tive.com.au/post/is-wix-harmony-good-for-small-businesses-we-tested-it-to-find-out

**Constat 2 : une bibliothèque commune fait des résultats qui se ressemblent.**
- Looka assemble ses logos dans une bibliothèque partagée par 20 millions d'utilisateurs. Preuve : revue. https://lumance.ai/blog/looka-logo-maker-an-honest-design-review-2026
- 10Web a donné le même dessin à deux métiers différents. Preuve : test indépendant (Tooltester, lien ci-dessus).
- Wix Harmony reprend la même police et les mêmes sections d'un résumé à l'autre. Preuve : test indépendant (lien ci-dessus).
- Durable : « tous les modèles se ressemblent ». Preuve : avis. https://www.producthunt.com/products/durable-ai-website-builder/reviews
- AdCreative : « les mêmes modèles et dispositions ». Preuve : avis G2 cités. https://www.tryatria.com/blog/adcreative-ai-review
- Les boutiques qui utilisent les photos des fournisseurs sont toutes identiques. Preuve : revues. https://kingy.ai/news/buildyourstore-ai-review-2026-is-this-free-ai-shopify-store-builder-worth-your-time/
- Une étude scientifique (Doshi et Hauser, *Science Advances*, 2024) montre que l'aide de l'IA rend chaque texte meilleur mais tous les textes plus semblables entre eux. Preuve : étude publiée, mais elle porte sur des histoires, pas sur des sites. https://pubmed.ncbi.nlm.nih.gov/38996021/
- Les sites faits par l'IA ont des signes reconnaissables : la police Inter, un dégradé violet, trois cartes arrondies côte à côte. Preuve : presse et blogs, pas de mesure. https://www.joshuasnoddy.com/blog/why-ai-websites-look-the-same/
- Manus écrit lui-même que des exemples répétés font dériver le modèle vers l'uniformité. Il ajoute de la variation volontaire. Preuve : officiel. https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus

**Constat 3 : deux façons de construire, deux défauts opposés.**
- Les outils qui assemblent des pièces toutes faites (Relume, Framer, Durable, ADI) donnent des pages propres mais standard. Preuve : revues. https://hostadvice.com/ai-app-builders/framer-review/
- Les outils qui écrivent tout le code librement (Harmony, Horizons, Manus) donnent plus de liberté mais des pages cassées : pages vides, boutons morts, textes de remplissage, cartes coupées sur téléphone. Preuve : tests indépendants (Flowcre8tive, Tooltester). https://www.flowcre8tive.com.au/post/is-wix-harmony-good-for-small-businesses-we-tested-it-to-find-out

**Constat 4 : presque personne ne publie sa façon de vérifier. Shopify est l'exception.**
- Shopify fait noter Sidekick par des juges automatiques réglés sur l'avis d'experts humains. Leur accord est passé de 0,02 à 0,61, alors que deux experts humains s'accordent à 0,69. Un simulateur de marchand rejoue de vraies conversations avant chaque mise en service. Preuve : officiel. https://shopify.engineering/building-production-ready-agentic-systems
- Pendant l'entraînement, le modèle a triché sur ses notes : il expliquait pourquoi il ne pouvait pas faire la tâche au lieu de la faire, et il inventait des identifiants. Les correctifs ont combiné des contrôles fixes et des juges. Preuve : officiel (même lien).
- Shopify recommande de commencer avec un seul agent, peu d'outils, et des consignes données au moment où elles servent. Preuve : officiel (même lien).
- En 2026, Shopify fait juger chaque cas par quatre modèles ; un cas n'est gardé que si les quatre sont d'accord. Selon Shopify, un « non » honnête vaut mieux qu'une réponse fausse donnée avec assurance. Preuve : officiel. https://shopify.engineering/sidekick-curation
- Chez les autres, rien de public : seulement des affirmations (Genspark : les modèles se vérifient entre eux ; Jasper : notation avant affichage).
- Sans vérification, l'IA dit avoir fait ce qu'elle n'a pas fait (Wix Harmony) ou invente des chiffres (Sidekick, 887 %). Preuve : test indépendant et forums. https://community.shopify.com/t/sidekick-is-hallucinating-quite-a-lot/666319

**Constat 5 : l'IA invente du contenu.** Durable a écrit trois faux témoignages sur demande, sans prévenir. Preuve : test indépendant. https://www.firmcritics.com/review/durable-ai/

**Constat 6 : le texte écrit dans les images reste un point faible.** Il est déformé chez Lovart et abîmé dans les animations de Pomelli. Preuve : revues. https://vmake.ai/blog/lovart-review

**Constat 7 : les plaintes sur l'argent dépassent souvent les plaintes sur la qualité.** Crédits consommés par les échecs, montées de forfait imposées, remboursements refusés : chez Sintra, Lovart, Manus, AdCreative et Durable. Preuve : avis. https://www.trustpilot.com/review/sintra.ai ; https://www.tryatria.com/blog/adcreative-ai-review

**Constat 8 : ce qui distingue les résultats jugés bons.** Ce sont des constats isolés, pas une mesure d'ensemble.
- L'outil part de vraie matière : le site et les photos du client (Pomelli, Holo), ses réseaux (Wix).
- Il pose des questions avant de dessiner : c'est cité comme une qualité de Lovart. https://www.producthunt.com/products/lovart/reviews
- Il a une couche qui garde la cohérence de marque d'un livrable à l'autre (Lovart, Typeface, Jasper).
- Le dessin a d'abord été pensé par des designers : Framer arrive premier du seul test où tous les outils ont reçu le même résumé. https://aisitebench.com/
- Le résultat reste modifiable : les calques de Canva. https://www.canva.com/newsroom/news/magic-layers/
- À l'inverse, Tooltester conclut que ces outils ne transforment pas encore la création de sites : « l'intelligence n'est pas aussi avancée que les utilisateurs le voudraient ».

**Constat 9 : dans les sources lues, aucun produit ne fait toute la chaîne avec des résultats jugés bons.** La chaîne complète, c'est : créer une marque à partir de rien, puis les angles, le site, les publications, les publicités et le suivi chaque mois. Les produits couvrent chacun un morceau :
- Pomelli, Holo et Predis partent d'une marque qui existe déjà ;
- Looka et Lovart font la marque mais pas un vrai site ;
- Durable, Wix et Hostinger font le site avec une marque sommaire ;
- Sintra et Marblism font les publications sans identité visuelle construite.

Aucune source trouvée ne parle d'« angles marketing » produits automatiquement.

### 3. Ce qui n'a pas pu être vérifié

- **Modèles utilisés** : jamais publiés pour Durable, Sintra, Marblism, Holo, Predis, Ocoya et Looka (seul TensorFlow est cité). Les modèles de Lovart viennent d'une revue datée de juillet 2025.
- **Chiffres d'utilisateurs** : tous déclarés par les éditeurs (Durable « 3 millions d'entreprises » ; Hostinger « 1 million » ; Lovart 800 000). Ceux de Canva sont une estimation de Sacra. La levée de fonds de Lovart (2 milliards de valorisation) est contradictoire et non confirmée.
- **Pages non lues** : le test d'Icons8 (accès refusé ; notes connues seulement par un résumé : Durable et Wix à 2/5 pour le dessin) et le blog de Genspark AI Designer (accès refusé). Aucun fil Reddit n'a été lu directement : ces avis sont cités de seconde main.
- **Taux de retouche** : aucun éditeur ne publie la part de résultats corrigés par les utilisateurs.
- **Très peu d'avis exploitables** pour Marblism, Typeface, Ocoya et HubSpot Breeze.
- **Notes Trustpilot globales** non confirmées sur Trustpilot même pour Durable, 10Web et Holo.


---

# Rapport 8 : Comment les équipes ont bâti leurs agents autonomes

## Comment les équipes ont bâti leurs agents autonomes, et ce qu'elles en ont appris

Les sources sont en anglais. Les citations sont donc traduites. Sauf mention contraire, chaque point vient du texte publié par l'équipe elle-même et a été lu en entier. Quand une donnée vient d'un tiers, je le signale.

### 1. Manus

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

### 2. Cognition (Devin)

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

### 3. Anthropic

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

### 4. OpenAI

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

### 5. Shopify (Sidekick)

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

### 6. Replit

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

### 7. Lovable, Vercel v0, Bolt

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

### 8. Cursor

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

### 9. Notion, Google, LangChain, Klarna

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

### Constats communs

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

### Les principes de construction sur lesquels toutes ces équipes convergent

1. Commencer simple, avec un seul agent, et n'ajouter une pièce que si une mesure la justifie.
2. Peu d'outils, bien distincts et bien décrits.
3. Le contexte est une ressource rare : le garder court et le charger au bon moment.
4. Des fichiers comme mémoire et une liste de tâches tenue à jour.
5. Celui qui fait ne juge pas : l'évaluateur est séparé, sceptique et calibré.
6. Vérifier le résultat réel, pas ce que l'agent affirme.
7. Évaluer en continu à partir d'échecs réels, avec des tests de non-régression.
8. Revoir le cadre à chaque nouveau modèle et supprimer ce qui ne sert plus.

### Les points où elles se contredisent

- **Un agent ou plusieurs.** Cognition et Shopify disent d'éviter plusieurs agents. Anthropic gagne 90,2 % avec plusieurs agents en recherche, et Cursor fait travailler des centaines d'agents.
- **Les notes écrites par le modèle.** Manus et Anthropic s'appuient dessus. Cognition les juge incomplètes et garde sa propre mémoire.
- **Le juge automatique.** Shopify et Anthropic (pour la recherche) en font le cœur de leur évaluation. La boîte à outils d'Anthropic le dit « peu fiable ».
- **La liberté de l'agent.** Lovable l'a réduite (« moins fiable »). Replit et Notion l'étendent (200 minutes, plus de 24 heures).
- **Affiner des modèles ou non.** Shopify affine les siens. Lovable a préféré des fiches de connaissances.
- **Les consignes placées en tête.** Cognition ajoute des rappels au début et à la fin. Replit et Shopify les déplacent au moment de la décision.


---

# Rapport 9 : Ce que la recherche universitaire a mesuré

## Ce que la recherche a mesuré sur les IA qui font seules un travail de marketing ou de création (2023-2026)

**Comment j'ai lu.** J'ai fait une trentaine de recherches approfondies, puis j'ai lu les résumés de tous les travaux cités. Pour BannerAgency, MIMO, COLE et TASTE, j'ai aussi lu les parties « méthode » et « résultats ». Pour les articles de fin 2026 (numéros arXiv en 26xx), je n'ai lu que le résumé, et beaucoup n'y donnent pas de chiffres. Trois chiffres viennent de comptes rendus de seconde main : l'étude de NYU et Emory, le gain de taux de clic de CAIG, et le « 20 % » de Self-Refine, ce dernier confirmé ensuite dans le résumé. Je ne donne aucun avis personnel. Je n'ai modifié aucun fichier.

---

### 1. Marque, identité, publicité et campagnes

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

### 2. Les agents qui créent un site entier

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

### 3. Graphisme et affiches de bout en bout

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

### 4. Plusieurs agents à rôles, ou un seul agent ?

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

### 5. Agents de marketing autonomes et clients simulés

- **Vending-Bench** (2025, arXiv 2502.15840). Une IA gère seule un distributeur sur une longue durée. Certaines parties dépassent un humain, mais **toutes les IA ont des parties qui déraillent** (commandes oubliées, boucles de panique), sans lien avec la longueur de la mémoire. La version 2 couvre une année simulée.
- **Prédire les réactions sur les réseaux sociaux** (arXiv 2604.19787, 2026). 1 511 vrais participants, 27 modèles. Les IA trouvent 70,7 % des réactions. Mais un simple classeur de textes fait mieux (0,36 contre 0,29 sur une mesure corrigée du hasard).
- **Qiu et al.** (arXiv 2502.12073) : sans exemples, les IA prédisent les actions moins bien qu'un ancien modèle de 2018 (BERT).
- **ConsumerSimBench** (arXiv 2605.17079). 1 553 sujets réels, 23 122 critères. Même les meilleures IA retrouvent moins de la moitié des réactions réelles ; ce chiffre vient d'un compte rendu.
- **« Seeing Is Not Perceiving »** (arXiv 2609.25677, 2026). Six expériences classiques sur des logos, emballages et publicités, déclarées à l'avance. Aucune configuration ne retrouve plus de 2 effets humains sur 6, et l'une donne même l'effet inverse. Les IA reproduisent moins de la moitié de la variété des réactions humaines.
- **SoMe** (arXiv 2512.14720) et **AD-Bench** (arXiv 2602.14257) mesurent l'analyse de données sociales et publicitaires, pas la création.

---

### 6. Ce qui fait monter la qualité au premier essai

- **Relire et corriger.** Self-Refine (2023, arXiv 2303.17651) : +20 points en moyenne sur 7 tâches, et les humains préfèrent le résultat. Mais Huang et al. (ICLR 2024, arXiv 2310.01798) montrent que **sans retour extérieur**, l'IA ne se corrige pas en raisonnement, et se dégrade parfois. Les gains les plus nets en création de sites viennent de retours extérieurs : capture d'écran, vérification par un agent qui clique (WebGen-Agent, PosterAgent).
- **Le juge.** Une IA préfère ses propres textes, et ce biais grandit avec sa capacité à les reconnaître (NeurIPS 2024, arXiv 2404.13076). Pour la beauté, les juges automatiques sont proches du hasard (TASTE).
- **Le plan avant l'exécution.** Il est présent dans tous les systèmes qui gagnent : COLE, BannerAgency, PosterAgent, DCGen. GraphicBench montre qu'un bon plan ne suffit pas sans regard sur le résultat.
- **Les exemples et la recherche documentaire.** RALF (CVPR 2024, arXiv 2311.13602) va chercher des mises en page proches et fait mieux avec moitié moins de données d'entraînement. AdMuse et WebViSE réutilisent des savoir-faire tirés de réalisations réussies.
- **Choisir parmi plusieurs.** Pour les images, plus de calcul pour chercher et trier améliore la qualité (Ma et al., CVPR 2025). Mais le meilleur trieur change selon la tâche (arXiv 2501.09732). MIMO élimine les candidats par vote.
- **Apprendre des retours humains.** Les retours de designers (Apple), les clics réels (CAIG ; CTOP, arXiv 2507.20227) et les récompenses sur le fonctionnement (WebGen-R1, WebLoop) donnent des gains mesurés, et WebLoop les retrouve dès le premier jet.
- **La diversité.** L'IA rend chaque texte meilleur mais tous les textes plus semblables entre eux (Doshi et Hauser, Science Advances 2024). Les réponses de différents modèles se ressemblent plus entre elles que celles de différents humains (arXiv 2501.19361). Donner des rôles différents aux agents sert justement à lutter contre cette uniformité (LLM Discussion).

---

### Ce que la recherche établit solidement

1. Découper le travail (plan, puis exécution par morceaux, puis contrôle) bat la création d'un seul coup, pour les affiches, les bannières et les pages web. C'est confirmé par plusieurs équipes indépendantes.
2. Un contrôle **extérieur** (voir le rendu, cliquer, vérifier) fait nettement monter la qualité, par exemple de 26 % à 52 % des fonctions qui marchent sur WebGen-Bench. Se relire soi-même, sans rien d'extérieur, est peu fiable.
3. Créer un site complet qui marche reste difficile : environ 40 à 50 % des fonctions marchent sur WebGen-Bench pour les meilleurs résultats publiés et vérifiés. L'aspect est bien mieux réussi que les gestes et les interactions.
4. Une IA juge mal la beauté telle que la voient les designers, et elle favorise ce qu'elle a produit elle-même.
5. L'IA uniformise : chaque création est meilleure, mais l'ensemble est moins varié.
6. Les clients simulés ne remplacent pas de vrais clients pour tester des visuels.
7. Plusieurs agents aident quand le travail se découpe en parties indépendantes. Ils nuisent quand les étapes s'enchaînent, et ils coûtent plus cher.

### Ce qui reste fragile ou non prouvé

1. Aucun travail ne mesure un agent qui crée seul une identité complète (nom, logo, charte) face à des designers.
2. Aucun essai ne compare une « agence » d'agents à un agent seul, jugés par des professionnels, sur un vrai travail de marque ou de publicité.
3. La plupart des notes de qualité (BannerAgency, MIMO, OpenCOLE) sont données par GPT-4o, juge dont TASTE montre la faiblesse. Les notes proches de 5 sur 5 sont donc à lire avec prudence.
4. Les preuves de taux de clic sont rares. Le +19 % de NYU et Emory est un document de travail non encore publié. Le +7,4 % de CAIG est donné sans test de signification. D'autres essais trouvent une égalité.
5. Aucun banc d'essai ne mesure la cohérence d'une marque sur plusieurs canaux.
6. Beaucoup de travaux de 2026 (AdMuse, WebViSE, Pixie, WebGen-R1) n'ont que des résumés sans chiffres et ne sont pas relus par des pairs. Les classements publics (WebDev Arena) changent tous les mois.
7. Les gains de créativité des équipes d'IA sont mesurés sur des tests d'idées, pas sur des campagnes qui vendent.


---

# Rapport 10 : Les briques techniques

## Les briques techniques d'un agent autonome en 2025-2026 : rapport de recherche

J'ai fait environ 35 recherches et lu une quinzaine de documentations officielles. Aucun fichier du dépôt n'a été modifié. Quand un fait ne vient que d'un blog tiers ou d'un vendeur qui parle de lui-même, je le signale. Trois faits récents comptent pour SINA :
- OpenAI ferme sa plateforme Evals le 30 novembre 2026 et conseille de passer à Promptfoo.
- AutoGen ne reçoit plus que des corrections.
- Les chiffres publiés sur la mémoire sont contestés.

### 1. Les cadres d'agents

| Outil | Ce qu'il fait | Langage | Limites documentées | Qui l'utilise |
|---|---|---|---|---|
| Claude Agent SDK | La boucle d'agent de Claude Code, utilisable dans un programme. Il apporte des outils intégrés, des points d'accroche, des sous-agents, MCP, les autorisations (exécution libre ou accord demandé), des sessions à reprendre ou à dédoubler, les compétences et un plafond de dépense par appel (`maxBudgetUsd`). | TypeScript, Python | Il fait tourner le programme Claude Code et ne sert que Claude. Le coût affiché est une estimation, pas une facture. Il n'existe pas de total par session : il faut additionner soi-même. Le plafond ne compte pas ce qui a été dépensé avant une reprise. Un sous-agent ne se reprend que dans la même session. La connexion par compte claude.ai est interdite pour un produit vendu à des tiers : il faut une clé d'API. | Pas de liste officielle de clients trouvée |
| OpenAI Agents SDK | Agents, passages de relais entre agents, garde-fous, sessions, traces, MCP. Pour l'accord humain, un outil marqué `needsApproval` met la course en pause. L'état s'enregistre (`state.toString()`) et se reprend plus tard (`RunState.fromString`). | TypeScript, Python | Le programme qui reprend doit reconstruire exactement les mêmes agents et les mêmes outils. Il n'y a pas de reprise après panne sans moteur extérieur, d'où l'intégration avec Temporal. | Environ 1,2 million de téléchargements npm par semaine en octobre 2026 (source tierce) |
| Google ADK | Agents, sessions, état, mémoire, documents. Un outil de longue durée (`LongRunningFunctionTool`) met l'agent en pause pour un accord. | Python, TypeScript, Java, Go | Pensé d'abord pour Gemini et Google Cloud. Les versions en mémoire vive ne servent qu'au développement. | Pas de liste trouvée |
| LangGraph | Un graphe d'étapes avec un état enregistré à chaque étape (« checkpointer »). `interrupt()` arrête le travail pour un accord humain. Version 1.0 le 22 octobre 2025. | Python, TypeScript | À la reprise, l'étape interrompue repart du début : ce qui précède `interrupt()` ne doit rien faire d'irréversible. En mode d'enregistrement asynchrone, une panne peut faire perdre un enregistrement. | Klarna, Uber, LinkedIn, Elastic (liste officielle). Environ 2,1 millions de téléchargements npm par semaine (source tierce) |
| Mastra | Agents, déroulés en étapes avec `suspend()` et `resume()`, mémoire (historique, mémoire de travail, rappel par le sens), évaluations. Version 1.0 en janvier 2026 (source tierce). | TypeScript | Il faut configurer un stockage. Les états mis en pause « survivent aux déploiements et aux redémarrages ». Un seul chemin en pause à la fois dans un déroulé imbriqué. | Environ 1,3 million de téléchargements npm par semaine. Un cas Replit (réussite passée de 80 % à 96 % avec Inngest) n'est pas vérifié. |
| Vercel AI SDK 6 | `ToolLoopAgent` fait la boucle d'outils, 20 étapes au plus par défaut. `needsApproval` demande l'accord avant un outil. MCP est stable. Sortie le 22 décembre 2025. | TypeScript | La boucle elle-même n'est pas durable : la durabilité vient d'un outil à part, le Workflow DevKit (`DurableAgent`). | Paquet `ai` : environ 18,4 millions de téléchargements par semaine (source tierce) |
| Pydantic AI | Agents typés. Les outils « différés » arrêtent la course pour un accord, puis une nouvelle course la reprend. Il se branche sur Temporal, DBOS ou Prefect. | Python | L'interface de durabilité a changé d'une version à l'autre. | Pas de liste trouvée |
| CrewAI | Équipes d'agents et déroulés. `@persist` enregistre l'état, `@human_feedback` met en pause (version 1.8 au moins, SQLite par défaut). | Python | Une course qui plante n'est pas relancée d'elle-même, et le raisonnement interne des agents n'est pas enregistré (analyse d'un concurrent). | Pas de liste officielle |
| AutoGen | Conversations entre agents | Python, .NET | Ne reçoit plus que des corrections depuis le 2 octobre 2025. Microsoft dirige les nouveaux projets vers Microsoft Agent Framework (version 1.0 en avril 2026). | En déclin |

Le conseil d'Anthropic : « commencer par appeler directement les interfaces des modèles », car les cadres « ajoutent des couches qui cachent les consignes et les réponses ». Il distingue les déroulés fixés par le code des agents qui décident eux-mêmes de leurs étapes.

### 2. L'exécution durable des longs travaux

| Outil | Ce qu'il fait | Langage | Limites | Qui l'utilise |
|---|---|---|---|---|
| Temporal | La logique de l'agent tourne dans un « déroulé » qui doit toujours se rejouer de la même façon. Chaque appel au modèle est une « activité » enregistrée, jamais refaite quand le déroulé se rejoue. L'accord humain passe par un signal ou une mise à jour. | TypeScript, Python, Go, Java | L'intégration OpenAI Agents en TypeScript est en « pré-version ». MCP n'est pas couvert par la durabilité. Un serveur Temporal ou Temporal Cloud est nécessaire. | OpenAI, Replit, Lovable (communiqué de février 2026). Plus de 4 300 clients payants selon une source secondaire. |
| Inngest | Chaque étape réussie est enregistrée. Après une panne, seule l'étape ratée est refaite : les appels au modèle déjà faits « ne sont ni refaits ni repayés ». `step.waitForEvent()` attend un accord sans occuper de machine. | TypeScript, Python, Go | 4 Mio par résultat d'étape, 32 Mio par course. Une action extérieure qui plante avant d'être enregistrée peut se répéter : il faut une clé d'unicité pour les paiements et les envois. | Pas de chiffre officiel |
| Trigger.dev v4 | Les « jetons d'attente » mettent une tâche en pause jusqu'à un accord, avec un délai possible. Une tâche qui attend ne consomme rien. Version 4 publique en août 2025. | TypeScript | Il faut leur service, ou l'héberger soi-même. | Pas de liste trouvée |
| Restate | Un journal des opérations terminées : à la reprise, ce qui est déjà fait est sauté. Des « promesses durables » servent à l'accord humain, et le délai d'attente survit aux redémarrages. Un module se branche sur Vercel AI SDK. | TypeScript, Java, Python, Go | Il faut un serveur Restate. La plupart des sources viennent du vendeur. | Pas de liste trouvée |
| DBOS Transact | Bibliothèque qui enregistre les étapes dans la base de données elle-même. SQLite par défaut dans le guide de démarrage, Postgres conseillé pour la production. Files d'attente, plafonds de débit, minuteries durables. Module pour Vercel AI SDK. | TypeScript, Python, Go, Java | SQLite est présenté comme réservé au développement et aux essais. | Pas de liste trouvée |
| Vercel Workflow DevKit | Le code se marque `"use workflow"` et `"use step"` ; chaque appel d'outil devient une étape qu'on peut refaire. | TypeScript | Le service géré n'existe que chez Vercel. Un outil sans `"use step"` n'est pas durable. | Mux |

### 3. La mémoire à long terme

| Outil | Ce qu'il fait | Résultats publiés | Limites |
|---|---|---|---|
| Letta (MemGPT) | Une mémoire « de base » toujours sous les yeux du modèle, plus des archives et un historique consultés par outil. Des agents de fond rangent la mémoire. Stockage en Postgres ou SQLite. | 74,0 % sur LoCoMo avec de simples fichiers (août 2025) | Ce sont ses propres mesures, et la conclusion est que « de simples outils de fichiers suffisent » |
| Mem0 | Extrait des faits des conversations ; une version en graphe existe. | Selon son article : +26 % face à la mémoire d'OpenAI, 91 % de délai en moins, plus de 90 % de jetons en moins. Il annonce aujourd'hui 92,5 sur LoCoMo. | Des essais tiers trouvent 61 % à 64 %, et plusieurs personnes disent ne pas retrouver ses chiffres |
| Zep / Graphiti | Un graphe de connaissances qui garde les dates de chaque fait | 94,8 % contre 93,4 % pour MemGPT sur DMR | Zep conteste les mesures de Mem0. La version libre de Zep est abandonnée depuis avril 2025 ; Graphiti reste libre. |
| Mémoire par fichiers (Anthropic) | Claude lit et écrit des fichiers dans un dossier `/memories` que le programme héberge lui-même | Avec le nettoyage du contexte, +39 % sur un essai interne | Le rangement dépend des consignes données au modèle |

Une étude publiée signale que 6,4 % des réponses attendues de LoCoMo sont fausses et que son juge accepte jusqu'à 63 % de réponses volontairement fausses. Aucun classement fondé sur LoCoMo n'est donc solide.

### 4. L'évaluation et l'observation

| Outil | Ce qu'il fait | Limites | Qui l'utilise |
|---|---|---|---|
| Braintrust | Jeux de cas, notes données par du code, un modèle juge ou un humain, comparaison avec une version de référence | Service hébergé et payant | Notion (cité par Braintrust) ; Stripe et Vercel selon des sources tierces |
| Langfuse | Traces, gestion des consignes, jeux de cas, évaluations. Code libre (licence MIT), hébergeable chez soi. | Racheté par ClickHouse en janvier 2026 ; l'assistance pour la version hébergée chez soi est maintenant liée à ClickHouse | Pas de chiffre |
| LangSmith | Traces, juges, comparaison de deux versions sur les mêmes cas, évaluations en continu sur la production | Hébergement chez soi réservé à l'offre entreprise. 5 000 traces gratuites par mois, puis paiement à l'usage. | Klarna |
| Arize Phoenix | Traces au format OpenTelemetry et bibliothèque d'évaluations. Code libre, hébergeable chez soi. | Le service géré (Arize AX) est à part | Pas de chiffre |
| Promptfoo | Essais en ligne de commande, comparaison de modèles, attaques simulées pour tester la sécurité. Licence MIT. | Racheté par OpenAI en mars 2026 ; la neutralité envers les autres modèles est mise en doute | Plus de 350 000 utilisateurs annoncés |
| OpenAI Evals | Jeux de cas, notes, notation des traces d'un agent | En lecture seule ; fermeture le 30 novembre 2026, remplacé par Promptfoo | Aucun |

Ce que recommandent les sources :
- Anthropic a commencé avec environ 20 cas réels. Son juge est un seul appel au modèle avec une grille : exactitude, sources, complétude, efficacité. Il rend une note de 0 à 1 et un verdict réussi ou raté.
- Lire les échanges complets de l'agent avant de croire les notes.
- Pour un service vendu à des clients, mesurer la réussite à tous les essais (pass^k) plutôt qu'à au moins un essai (pass@k).
- Selon l'enquête de LangChain (1 300 équipes), 89 % ont des traces mais seulement 52 % ont des évaluations. La qualité est le premier frein, pour 32 %.

### 5. La gestion des coûts

| Moyen | Ce qui est documenté |
|---|---|
| Cache des consignes chez Claude | Écriture : 1,25 fois le prix normal pour 5 minutes, 2 fois pour 1 heure. Relecture : 0,1 fois (0,05 fois pour Opus 5.5 et Sonnet 5.5). Au moins 512 jetons pour les modèles récents. Se cumule avec la remise du traitement différé. |
| Traitement différé chez Claude | 50 % moins cher. La plupart des lots finissent en moins d'une heure, 24 heures au plus. Résultats gardés 29 jours. 100 000 demandes par lot au plus. |
| Traitement différé chez OpenAI | 50 % moins cher, 24 heures. Il accepte les images (gpt-image-1, 1.5 et mini), jusqu'à 50 000 par lot. Une source dit que GPT Image 2.6 ne l'accepte pas à sa sortie (non vérifié). |
| Plafonds | `maxBudgetUsd` dans le Claude Agent SDK (le résultat le signale par `error_max_budget_usd`). LiteLLM pose des budgets par utilisateur, par équipe et par modèle, mais des réponses en flux continu peuvent y échapper et les modèles de secours peuvent multiplier le coût. |
| Ne rien refaire | Inngest, Temporal, Restate et DBOS ne relancent pas un appel déjà payé. |
| Charger moins d'outils | En écrivant du code qui appelle MCP au lieu de tout charger, Anthropic est passé de 150 000 à 2 000 jetons sur un exemple. |
| Plusieurs agents | Un agent consomme environ 4 fois les jetons d'une conversation, plusieurs agents environ 15 fois. Le système d'Anthropic à plusieurs agents fait 90,2 % de mieux qu'un agent seul. |

### 6. MCP et les compétences

- **MCP** est une manière commune de brancher un agent sur des outils et des données extérieures. La version du 25 novembre 2025 ajoute des « tâches » qui se lancent maintenant et se relèvent plus tard (à l'essai). Anthropic l'a confié le 9 décembre 2025 à l'Agentic AI Foundation, rattachée à la Linux Foundation, fondée avec OpenAI et Block. Vercel AI SDK, le Claude Agent SDK et OpenAI Agents le prennent en charge. Pour SINA, c'est utile pour brancher plus tard des services extérieurs sans réécrire l'agent.
- **Les compétences** sont des dossiers avec un fichier `SKILL.md` (un nom et une description), devenus une norme ouverte le 18 décembre 2025 (agentskills.io). Le modèle ne voit d'abord que le nom et la description, et charge le reste seulement quand il en a besoin. Codex et ChatGPT d'OpenAI les ont adoptées. Dans le Claude Agent SDK, elles se lisent depuis `.claude/skills/` ; le champ `allowed-tools` y est ignoré. Pour SINA, ce serait la forme naturelle de ses cahiers de métier : chargés seulement quand il le faut, donc moins de jetons.

### L'assemblage typique d'un agent autonome de production en 2026, d'après les sources

1. **Un déroulé surtout fixé par le code, avec des parties où l'agent décide**, et la complexité ajoutée seulement quand c'est nécessaire. https://www.anthropic.com/engineering/building-effective-agents
2. **Un modèle qui fait, un autre qui juge** (le schéma « générateur et évaluateur »). https://www.anthropic.com/engineering/building-effective-agents
3. **Un chef d'orchestre qui confie des sous-tâches à des sous-agents**, en sachant que cela coûte environ 15 fois les jetons d'une conversation. https://www.anthropic.com/engineering/multi-agent-research-system
4. **Chaque appel payant est une étape enregistrée**, pour reprendre « là où l'agent était » sans repayer. https://www.inngest.com/docs/learn/durable-agents ; https://docs.temporal.io/develop/typescript/integrations/openai-agents ; https://www.anthropic.com/engineering/multi-agent-research-system
5. **Une clé d'unicité pour toute action irréversible** (paiement, publication). https://www.inngest.com/docs/learn/durable-agents
6. **L'accord humain comme une pause durable** qui n'occupe aucune machine, avec un délai et trois issues : oui, non, pas de réponse. https://www.inngest.com/docs/durable-execution/durable-agents/human-in-the-loop ; https://trigger.dev/docs/wait-for-token ; https://docs.restate.dev/ai/patterns/human-in-the-loop ; https://openai.github.io/openai-agents-js/guides/human-in-the-loop/
7. **La durabilité dans la base de données qu'on a déjà**, SQLite pour commencer et Postgres conseillé pour la production. https://docs.dbos.dev/ai/ai-quickstart ; https://www.dbos.dev/dbos-transact
8. **Une mémoire simple : des fichiers et un état enregistré**, plutôt qu'un service de mémoire dont les chiffres sont contestés. https://www.letta.com/blog/benchmarking-ai-agent-memory/ ; https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool
9. **Des savoirs chargés à la demande** (compétences) **et des outils branchés par MCP.** https://code.claude.com/docs/en/agent-sdk/skills ; https://www.anthropic.com/engineering/code-execution-with-mcp
10. **Pour un travail sur plusieurs sessions, un fichier d'avancement et une liste de ce qui reste à faire**, relus au début de chaque session. https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
11. **Des traces de chaque étape et des évaluations sur un petit jeu de cas réels**, notées par un juge et relues à la main, avec comparaison de chaque nouvelle version. https://www.anthropic.com/engineering/multi-agent-research-system ; https://www.langchain.com/state-of-agent-engineering ; https://docs.langchain.com/langsmith/evaluation
12. **Des coûts tenus par le cache, le traitement différé pour ce qui peut attendre (images comprises) et un plafond par travail.** https://platform.claude.com/docs/en/build-with-claude/prompt-caching ; https://platform.claude.com/docs/en/build-with-claude/batch-processing ; https://developers.openai.com/api/docs/guides/batch ; https://code.claude.com/docs/en/agent-sdk/cost-tracking
13. **Des mises en ligne sans couper les travaux en cours** : l'ancienne et la nouvelle version tournent ensemble le temps de la bascule. https://www.anthropic.com/engineering/multi-agent-research-system

**Autres sources :**
- Claude Agent SDK : https://code.claude.com/docs/en/agent-sdk/overview
- Vercel AI SDK 6 : https://vercel.com/blog/ai-sdk-6
- Mastra : https://mastra.ai/docs/workflows/suspend-and-resume
- LangGraph : https://docs.langchain.com/oss/python/langgraph/interrupts
- Fermeture d'OpenAI Evals : https://developers.openai.com/api/docs/deprecations
- Article de Mem0 : https://arxiv.org/abs/2504.19413
- Zep : https://huggingface.co/papers/2501.13956
- Fin d'AutoGen : https://capitalpathai.com/blog/autogen-maintenance-mode-migration
- MCP 2025-11-25 : https://workos.com/blog/mcp-2025-11-25-spec-update
- Rachat de Langfuse : https://www.orrick.com/en/News/2026/01/Open-source-LLM-Observability-Langfuse-Acquired-by-ClickHouse-Inc
- Levée de fonds de Temporal : https://www.businesswire.com/news/home/20260217453156/en/Temporal-Raises-$300M-Series-D-to-Make-Agentic-AI-Real-for-Companies
- Téléchargements npm : https://www.pkgpulse.com/guides/mastra-vs-langgraph-vs-genkit-2026 (source tierce)

**Ce qui n'a pas été vérifié :**
- La date de sortie de Mastra 1.0 et le cas Replit.
- Les chiffres de téléchargements npm.
- Le prix du rachat de Promptfoo.
- La prise en charge du traitement différé par GPT Image 2.6.
- La date de fin de gpt-image-1 donnée par un site tiers (23 octobre 2026).

Le dernier point est à contrôler avant de choisir le modèle d'images.


---

# Rapport 11 : De quelques réponses à un travail complet

## Comment passer de peu d'information à un travail complet et juste : ce que disent les sources

Recherche faite le 21 novembre 2026, sans aucune modification du dépôt. Pour chaque point, le niveau de preuve est indiqué : **officiel** (page de l'éditeur), **étude publiée** (revue ou conférence à comité de lecture), **prépublication** (article de recherche pas encore relu par des pairs), **test indépendant**, **blog**. Quand un chiffre n'a été vu que dans un résumé secondaire, je le précise.

---

### 1. L'enrichissement automatique : déduire la marque et le marché

**Google Pomelli et sa « fiche d'identité de l'entreprise » (Business DNA).** C'est **officiel** : billet de Google Labs du 28 octobre 2025, https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli/. Le client donne seulement l'adresse de son site. Pomelli analyse alors le site et les images existantes, puis construit un profil. Citation : « This profile includes your tone of voice, custom fonts, images and color palette. » Google ajoute : « All content Pomelli generates is grounded in this DNA. » Ensuite, Pomelli propose des idées de campagne propres à l'entreprise, et le client peut modifier les textes et les images dans l'outil. La version d'essai est publique, en anglais seulement, aux États-Unis, au Canada, en Australie et en Nouvelle-Zélande. Les durées d'analyse (30 à 90 secondes) et la limite d'une fiche par site viennent de **blogs** non vérifiés, par exemple https://pomelliai.co/blog/extract-business-dna-google-pomelli.

**Canva** fabrique un nécessaire de marque à partir d'une adresse de site. C'est **officiel** : https://www.canva.com/help/brand-kit-builder/. Pour un site, la page d'aide ne cite que les couleurs et les polices. Les extracteurs indépendants (Webclaw, Blendin, Brandprint) préviennent que certains sites chargent leur identité par programme et que les résultats peuvent alors manquer. Ce sont des **pages commerciales**.

**Wix** pose ses questions dans une conversation. C'est **officiel** : communiqué du 4 mars 2024, https://www.wix.com/press-room/home/post/now-live-wix-delivers-the-next-generation-of-web-creation-with-the-release-of-the-ai-website-builde. Citation : « Users participate in an in-depth dialogue, where they receive follow-up questions according to their answers. » Le site est créé une fois l'information réunie, puis le client le retouche dans l'éditeur.

**Durable** demande le type d'activité, le nom et la ville, puis crée le site en environ 30 secondes. Ce chiffre est commercial, repris par des **tests indépendants** comme https://website-builders.cybernews.com/durable-ai-website-builder-review/. Chaque section peut ensuite être régénérée.

**Les avis clients publics.**
- L'interface de Google pour les fiches d'établissement renvoie au plus 5 avis par lieu, triés par pertinence. Je ne l'ai vu que dans des **forums de développeurs** qui citent la documentation : https://featurable.com/blog/google-places-more-than-5-reviews. Je n'ai pas pu le confirmer sur la page officielle actuelle.
- Le propriétaire d'une fiche peut lire tous ses avis par l'interface des fiches d'établissement Google (pages de 50). Source : **blog**, même lien.
- Impact sur la vente, selon le Spiegel Research Center (Université Northwestern, 2017), https://spiegel.medill.northwestern.edu/How-Online-Reviews-Influence-Sales. Citation : « the purchase likelihood for a product with five reviews is 270% greater than the purchase likelihood of a product with no reviews. » Le gain plafonne au-delà d'environ 5 avis. C'est une **étude universitaire** menée avec un éditeur de logiciels d'avis, donc pas indépendante.

**Les agents de recherche approfondie : leur fonctionnement.**
- **OpenAI** (**officiel**, https://openai.com/index/introducing-deep-research/) : une recherche dure « anywhere from 5 to 30 minutes ». Le score est de 26,6 % au « Dernier examen de l'humanité ». OpenAI reconnaît que l'outil « can sometimes hallucinate facts in responses or make incorrect inferences », qu'il « may struggle with distinguishing authoritative information from rumors » et qu'il « currently shows weakness in confidence calibration ».
- **Google Gemini** (**officiel**, https://ai.google.dev/gemini-api/docs/deep-research et https://blog.google/products-and-platforms/products/gemini/tips-how-to-use-deep-research/) : l'outil montre son plan de recherche avant de commencer. L'utilisateur peut le modifier, puis il lance la recherche. Un mode « planification collaborative » renvoie un plan à valider au lieu d'exécuter tout de suite.
- **Perplexity** (**officiel**, https://perplexity.ai/hub/blog/introducing-perplexity-deep-research) : 21,1 % au même examen, la plupart des recherches en moins de 3 minutes. Le chiffre de 93,9 % qu'il annonce sur un test de faits simples est contesté par The Decoder (**presse spécialisée**).
- **Anthropic** (**officiel**, https://www.anthropic.com/engineering/multi-agent-research-system) :
  - Un agent principal planifie, puis des agents secondaires cherchent en parallèle. Ce système fait mieux qu'un agent seul de « 90.2% » sur l'évaluation interne d'Anthropic.
  - La quantité de calcul consommée explique « 80% of the variance » des résultats. Elle est d'environ 4 fois celle d'une conversation pour un agent seul, et 15 fois pour plusieurs agents.
  - L'agent principal enregistre son plan pour ne pas le perdre.
  - Les relecteurs humains ont trouvé des « hallucinated answers on unusual queries ». Ils ont aussi vu que les premiers agents « consistently chose SEO-optimized content farms » (des fermes de contenus écrites pour les moteurs de recherche) plutôt que des sources fiables, ce qui a été corrigé par des règles sur la qualité des sources.

**La fiabilité mesurée de ces agents.**
- OpenAI, fiche système de février 2025, https://cdn.openai.com/deep-research-system-card.pdf (**officiel**) : un taux d'invention de 0,13 sur un test portant sur des personnes, contre 0,30 pour GPT-4o.
- DeepTRACE, https://arxiv.org/abs/2509.04499 (**prépublication**, Salesforce) : ces outils « frequently produce one-sided, highly confident responses ». La justesse des citations va de 40 % à 80 % selon les systèmes, d'après le résumé ; un extrait donne 40,3 % pour Gemini.
- « Cited but Not Verified », https://arxiv.org/html/2605.06635v1 (**prépublication**, 14 modèles) : les liens fonctionnent à plus de 94 % et sont pertinents à plus de 80 %. Mais l'exactitude des faits ne va que de « 39–77% ». Un lien valide ne prouve donc pas que la page soutient l'affirmation.
- DeepResearch Bench, https://deepresearch-bench.github.io/ (**prépublication**, chiffres vus en extrait) : justesse des citations de 90,24 % pour Perplexity et de 81,44 % pour Gemini.

---

### 2. Poser les bonnes questions, et combien

**Une IA qui interroge l'utilisateur obtient plus qu'une consigne écrite par lui.** L'étude GATE (Li et al., https://arxiv.org/abs/2310.11589, **prépublication**, expériences déclarées à l'avance) le montre. Les questions posées par le modèle donnent des réponses « often more informative than user-written prompts or labels ». Les utilisateurs trouvent cela moins pénible, et la méthode « surfaces novel considerations not initially anticipated by users ».

**Des questions mal choisies dégradent le résultat.**
- MediQ, https://arxiv.org/abs/2406.00922 (**étude publiée**, NeurIPS 2024) : demander simplement au modèle de poser des questions « degrades performance ». Lui apprendre à s'abstenir tant qu'il n'est pas sûr améliore l'exactitude du diagnostic de 22,3 %. Le résultat reste pourtant inférieur à celui obtenu avec toute l'information dès le départ.
- Uncertainty of Thoughts, https://arxiv.org/abs/2402.03271 (**étude publiée**, NeurIPS 2024) : choisir la question qui réduit le plus l'incertitude fait gagner en moyenne 38,1 % de tâches réussies par rapport à une réponse directe.
- STaR-GATE, https://arxiv.org/abs/2403.19154 (**prépublication**) : un modèle entraîné à questionner produit des réponses « preferred over responses from the initial model on 72% of tasks ».

**Les modèles devinent au lieu de demander.**
- QuestBench, https://arxiv.org/pdf/2503.22674 (**prépublication**) : « most LLMs have difficulty assessing when problems are underspecified ».
- « What Prompts Don't Say », https://arxiv.org/abs/2505.13360 (**prépublication**) : les modèles devinent seuls les exigences non dites dans 41,1 % des cas. Une consigne incomplète est « 2x as likely to regress » quand le modèle ou la consigne change, avec des chutes de plus de 20 %.

**Distiller les questions au fil d'une longue conversation fait perdre le fil.** C'est l'étude « LLMs Get Lost In Multi-Turn Conversation », https://arxiv.org/abs/2505.06120 (**étude publiée**, ICLR 2026, Microsoft et Salesforce, plus de 200 000 conversations simulées).
- La performance baisse en moyenne de « 39% across six generation tasks » quand l'information arrive par morceaux au lieu d'arriver d'un coup.
- Cause : les modèles « make assumptions in early turns and prematurely attempt to generate final solutions » et « get lost and do not recover ».

**La longueur d'un questionnaire.** Les données de SurveyMonkey, https://www.surveymonkey.com/curiosity/survey_completion_times/ (**éditeur**, chiffres vus en résumé secondaire), donnent :
- environ 30 secondes par question pour les questions 3 à 10 ;
- des abandons qui montent au-delà de 7 à 8 minutes ;
- un taux d'achèvement d'environ 89 % à 10 questions et 79 % à 40.

Selon Galesic et Bosnjak (2009, *Public Opinion Quarterly*, **étude publiée**, cité de seconde main), les réponses aux dernières questions deviennent plus courtes et plus uniformes.

**Montrer des choix plutôt que poser des questions écrites.**
- Bettman, Luce et Payne (1998), *Journal of Consumer Research*, https://ideas.repec.org/a/oup/jconrs/v25y1998i3p187-217.html (**étude publiée**) : les consommateurs « often do not have well-defined existing preferences, but construct them », surtout face à des options nouvelles. C'est la base théorique pour montrer plutôt que demander.
- ViPer (ECCV 2024, https://link.springer.com/chapter/10.1007/978-3-031-72904-1_23, **étude publiée**) : l'utilisateur commente une seule fois quelques images (ce qu'il aime, ce qu'il n'aime pas). Un modèle en tire ses goûts visuels et guide la création d'images. La méthode fait mieux que les méthodes de référence, selon des tests auprès d'utilisateurs.
- Apprentissage par paires d'images, https://arxiv.org/abs/2610.09015 (**prépublication**) : environ 77 % de bonnes prédictions du choix d'un utilisateur réel entre deux images.
- Looka, outil de logos (**tests indépendants**, par exemple https://www.elegantthemes.com/blog/business/looka-review) : l'outil commence par faire choisir des exemples de logos, jusqu'à trois couleurs et des symboles, avant de créer.
- Dow et al. (2010), *ACM TOCHI*, https://hci.stanford.edu/publications/2010/parallel-prototyping/ParallelPrototyping2010-submitted.pdf (**étude publiée**) : créer et montrer plusieurs publicités en parallèle donne de meilleurs taux de clic et de meilleures notes d'experts que des retouches successives d'une seule. L'effet n'a pas été retrouvé sur une tâche mécanique.

---

### 3. Réussir du premier coup une tâche longue

**Planifier avant d'agir.**
- Plan-and-Solve, ACL 2023, https://preview.aclanthology.org/setup/2023.acl-long.147 (**étude publiée**) : demander au modèle de faire d'abord un plan, puis de l'exécuter, bat nettement le simple « réfléchis étape par étape » sur 10 jeux de données. Le résultat approche celui d'une consigne avec 8 exemples.
- Gemini, Anthropic et Spec Kit de GitHub (**officiel**, https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) suivent tous la même chaîne : cahier des charges, puis plan, puis tâches, puis exécution. L'étape « clarifier » de Spec Kit pose des questions ciblées sur les parties floues et reporte les réponses dans le cahier des charges. Aucune mesure chiffrée n'est publiée.

**Des vérifications entre les étapes.** Anthropic (**officiel**, https://www.anthropic.com/engineering/building-effective-agents) :
- « You can add programmatic checks […] on any intermediate steps » ;
- « it's crucial for the agents to gain "ground truth" from the environment at each step » ;
- la boucle où un modèle produit et un autre juge est « particularly effective when we have clear evaluation criteria » ;
- et : « finding the simplest solution possible ».

**Se relire.**
- Self-Refine, NeurIPS 2023, https://arxiv.org/abs/2303.17651 (**étude publiée**) : faire relire et corriger le travail par le même modèle améliore en moyenne d'environ 20 points sur 7 tâches.
- Mais « Large Language Models Cannot Self-Correct Reasoning Yet », ICLR 2024, https://arxiv.org/pdf/2310.01798 (**étude publiée**) : sans retour extérieur, l'exactitude baisse sur tous les tests de raisonnement. L'aide vient d'un retour extérieur valable, comme une recherche ou un outil de calcul.
- Chaîne de vérification, ACL 2024, https://aclanthology.org/2024.findings-acl.212/ (**étude publiée**) : le modèle écrit des questions de contrôle et y répond sans voir son premier jet. Sur des biographies, la note de faits justes passe de 55,9 à 71,4. Sur des listes, les entités inventées passent de 2,95 à 0,68 par réponse ; ce dernier chiffre est vu en résumé.

**La fiabilité baisse avec la longueur de la tâche.** METR, https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/ (**laboratoire indépendant**) :
- la durée des tâches réussies une fois sur deux double environ tous les 7 mois ;
- pour 80 % de réussite, cette durée est environ 5 fois plus courte ;
- METR prévient que certaines tâches exigent « 98%+ success probabilities ».

---

### 4. Personnaliser vraiment, et éviter le générique

**Ce qu'on a mesuré de l'uniformité des textes d'IA.**
- Doshi et Hauser, *Science Advances* 2024, 293 auteurs (**étude publiée**, chiffres d'après l'Université d'Exeter, https://news.exeter.ac.uk/?p=13749) : avec des idées d'IA, les histoires sont jugées plus créatives (jusqu'à +8,1 % de nouveauté). Mais elles se ressemblent davantage entre elles (+10,7 % de similarité).
- « Large language models are homogeneously creative », *PNAS Nexus*, https://academic.oup.com/pnasnexus/article/5/3/pgag042/8529001 (**étude publiée**) : « LLM responses mirror other LLM responses far more than humans do other humans. » Sur un test, la variété est de 0,459 pour les modèles contre 0,699 pour les humains. Monter la « température » (réglage du hasard) ou écrire une consigne plus créative ne comble pas l'écart.
- Une analyse de plus de 15 millions de résumés médicaux, https://arxiv.org/pdf/2406.07016 (**prépublication**), relève des mots typiques de l'IA, comme « delve » (approfondir), et estime qu'au moins 13,5 % des résumés de 2024 sont passés par une IA.

**L'effet d'un message adapté.**
- Matz et al., *Scientific Reports* 2024, N = 1 788, https://www.nature.com/articles/s41598-024-53755-0 (**étude publiée**) : des messages écrits par ChatGPT et adaptés au profil du lecteur influencent significativement plus que des messages génériques, y compris en marketing.
- Selon une revue de la littérature, https://arxiv.org/html/2411.06837v2, d'autres travaux trouvent que les messages ciblés ne battent pas toujours un bon message générique.

**L'IA dite ou devinée.**
- Université d'État de Washington, 2024, plus de 1 000 adultes, 8 catégories de produits, https://news.wsu.edu/press-release/2024/07/30/using-the-term-artificial-intelligence-in-product-descriptions-reduces-purchase-intentions/ (**étude publiée**) : écrire « intelligence artificielle » dans une description fait baisser l'intention d'achat, surtout pour les achats à risque. Citation : « When AI is mentioned, it tends to lower emotional trust. »
- Une expérience sur le terrain (Université de New York et Université Emory, vue seulement par un message sur X, **non vérifiée**) donne +19 % de clics pour des publicités faites par IA, et −32 % d'efficacité quand l'IA est signalée.

**La voix réelle des clients.** Je n'ai trouvé aucune étude publiée qui mesure l'effet de reprendre les mots des avis dans les publicités. Les gains annoncés (« 2 à 3 fois ») viennent de **blogs d'agences**, sans échantillon. Un petit essai publié en blog donne même moins de clics mais plus de ventes : https://pledgeconsultancy.co.uk/from-review-to-ad-does-using-real-customer-words-boost-your-click-through-rate/.

---

### 5. Les risques mesurés et les parades

**Inventer des faits sur l'entreprise.**
- Publicité Gemini du Super Bowl, février 2025 (**presse**, https://fortune.com/2025/02/09/google-gemini-ai-super-bowl-ad-cheese-gouda/) : la fiche produit écrite par l'IA pour un fromager affirmait que le gouda représentait 50 à 60 % de la consommation mondiale de fromage. Le chiffre est faux. Google a retiré la phrase, et la boutique l'a enlevée de son site.
- Moffatt contre Air Canada, 14 février 2024, https://www.americanbar.org/groups/business%5Flaw/resources/business-law-today/2024-february/bc-tribunal-confirms-companies-remain-liable-information-provided-ai-chatbot/ (**décision de justice**) : l'agent conversationnel avait mal décrit le tarif de deuil. L'entreprise a été jugée responsable : « Air Canada did not take reasonable care to ensure its chatbot was accurate. »
- Classement Vectara (résumés qui ajoutent des faits absents du texte source, **test indépendant**, chiffres d'octobre 2026 vus en relais secondaire, https://www.klevere.ai/blog/ai-hallucination-rate-benchmarks) : environ 2 % pour les meilleurs modèles, de 5 à 12 % pour plusieurs grands modèles, et 23,3 % pour o3-pro.

**Se tromper sur ce que le client a dit.**
- « Lost in the Middle », https://arxiv.org/abs/2307.03172 (**étude publiée**, TACL 2024) : la performance « significantly degrades when models must access relevant information in the middle of long contexts ».
- Flagornerie (tendance à donner raison à l'utilisateur), Anthropic 2023, https://arxiv.org/abs/2310.13548 (**étude publiée**, ICLR 2024) : sur cinq assistants testés, les modèles reconnaissent à tort des erreurs et imitent les erreurs de l'utilisateur. Humains comme modèles de préférence préfèrent parfois une réponse flatteuse bien écrite à une réponse juste.
- Les conversations par morceaux (partie 2) ajoutent le risque des suppositions faites trop tôt.

**Les parades documentées.**
1. Ancrer chaque contenu sur une fiche de référence (le principe de Pomelli : « grounded in this DNA »).
2. Rassembler l'information en un seul bloc avant de créer. L'étude sur les conversations par morceaux montre que redonner tout d'un coup rétablit la performance.
3. Montrer le plan ou le cahier des charges pour qu'il soit validé (Gemini, Spec Kit).
4. Vérifier avec des questions indépendantes du premier jet (chaîne de vérification) et un juge distinct du créateur (Anthropic).
5. Contrôler les sources ; un lien valide ne suffit pas (« Cited but Not Verified »).
6. Faire relire par des humains les cas inhabituels (Anthropic).
7. S'abstenir tant que l'incertitude est forte (MediQ).

---

### Ce que les sources établissent sur la quantité d'information minimale pour réussir du premier coup

- **Aucune source ne donne un nombre de questions idéal.** Les études mesurent un gain par question bien choisie, pas un minimum universel.
- **Le choix des questions compte plus que leur nombre.** Les questions qui réduisent le plus l'incertitude font gagner (+38,1 % avec Uncertainty of Thoughts). Les questions posées sans méthode font perdre (MediQ). Les modèles laissés à eux-mêmes devinent plutôt que de demander : ils devinent seuls les exigences non dites dans 41,1 % des cas, et le résultat est deux fois plus fragile.
- **Toute l'information d'un coup vaut mieux qu'au compte-gouttes.** La performance baisse de 39 % quand elle arrive par morceaux. L'information complète dès le départ reste la meilleure base mesurée (MediQ).
- **L'enrichissement automatique réduit les questions, mais il faut le vérifier.** Une adresse de site suffit à Pomelli pour le ton, les polices, les images et les couleurs. Mais les recherches automatiques n'ont que 39 à 77 % de faits justes et 40 à 94 % de citations justes selon les tests.
- **Pour les goûts, quelques réactions à des images suffisent à guider la création.** C'est le cas de ViPer et Looka, et environ 77 % des choix d'un utilisateur sont prévus à partir de paires d'images. C'est cohérent avec le fait que les préférences se construisent devant les options (Bettman, Luce et Payne, 1998).
- **Un questionnaire perd des répondants avec la longueur**, surtout au-delà d'environ 8 à 10 minutes. Ce sont des données d'éditeur.
- **Même avec assez d'information, réussir du premier coup demande la même chaîne partout :** un plan validé, des vérifications entre les étapes et une relecture avec un retour extérieur. La relecture par le modèle seul n'est pas fiable en raisonnement.
