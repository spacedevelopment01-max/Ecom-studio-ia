<!-- Rapport complet de recherche du 21 novembre 2026, tel que rendu ; sujet : Fiabilité, constance et coûts d'un agent -->

# Rendre SINA fiable, constante et économe : ce que font les meilleurs

J'ai fait la recherche sur Internet et lu les pages principales. Aucun fichier du dépôt n'a été modifié. Il y a trois niveaux de preuve :
- **officiel** : Anthropic, OpenAI, normes publiques ;
- **recherche** : articles universitaires ;
- **vendeur** : blogs d'outils ou de consultants.

Quand un chiffre ne vient que d'un résumé et pas de la source elle-même, je le signale.

---

## 1. Architecture : chaînes fixes d'abord, agent libre seulement où il faut

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

## 2. Évaluations : une batterie de cas de référence, rejouée à chaque changement

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

## 3. Juges d'images et de textes créatifs

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

## 4. Contexte et mémoire

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

## 5. Coûts

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

## 6. Suivi en production et amélioration continue

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

## 7. Erreurs classiques qui font tourner en rond

- **Accuser le modèle d'abord.** Une étude de 1 642 traces classe 14 façons dont les systèmes multi-agents échouent. Une grande part vient de la conception et du cahier des charges, pas du modèle. Source : https://arxiv.org/abs/2503.13657 (recherche).
- **Rajouter une règle à chaque échec** sans retirer celles qui la contredisent. Sources : IFScale ; Anthropic, contexte.
- **Annoncer « fini » sans vérification de bout en bout.** Source : Anthropic, harnais (officiel).
- **Un juge global qui donne une note sur 10, jamais confronté aux verdicts humains.** Sources : Husain ; Anthropic, évaluations.
- **Réécrire les résultats attendus pour que les tests passent.** Source : Ganglani (blog).
- **Viser 100 % sur des tests trop faciles**, ou se fier à des mesures génériques. Source : Husain.
- **Laisser le modèle se corriger seul sans signal extérieur.** Source : Huang et coll. (recherche).

---

## Les 5 changements qui auraient le plus d'effet

1. **Une batterie de cas de référence et de non-régression**, avec des clients inventés et les verdicts figés du propriétaire. On la rejoue (3 essais par cas, en traitement différé) avant chaque changement de consigne ou de modèle. On bloque si une étape déjà réussie recule.
2. **Des juges calibrés sur le propriétaire.** Ses verdicts « bon / pas bon » avec une raison, un juge par défaut, la comparaison par paires pour les images, et une mesure d'accord affichée.
3. **Des étapes validées verrouillées.** Un registre par client où chaque étape réussie est figée et ne se rouvre que sur demande. Les chaînes fixes passent par des contrôles programmés.
4. **Le ménage des consignes.** Une seule source par règle, l'inventaire et la suppression des contradictions, quelques exemples neutres à la place des listes, et la partie fixe en tête pour la mise en cache.
5. **Le « coût par sortie acceptée » suivi dans un tableau de bord.** Avec des traces par client, étape et version, et un plafond de 2 reprises avant de remonter au client. Ces traces servent ensuite à améliorer les consignes, au besoin avec GEPA.
