<!-- Rapport complet de recherche du 21 novembre 2026, tel que rendu ; sujet : De quelques réponses à un travail complet -->

# Comment passer de peu d'information à un travail complet et juste : ce que disent les sources

Recherche faite le 21 novembre 2026, sans aucune modification du dépôt. Pour chaque point, le niveau de preuve est indiqué : **officiel** (page de l'éditeur), **étude publiée** (revue ou conférence à comité de lecture), **prépublication** (article de recherche pas encore relu par des pairs), **test indépendant**, **blog**. Quand un chiffre n'a été vu que dans un résumé secondaire, je le précise.

---

## 1. L'enrichissement automatique : déduire la marque et le marché

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

## 2. Poser les bonnes questions, et combien

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

## 3. Réussir du premier coup une tâche longue

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

## 4. Personnaliser vraiment, et éviter le générique

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

## 5. Les risques mesurés et les parades

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

## Ce que les sources établissent sur la quantité d'information minimale pour réussir du premier coup

- **Aucune source ne donne un nombre de questions idéal.** Les études mesurent un gain par question bien choisie, pas un minimum universel.
- **Le choix des questions compte plus que leur nombre.** Les questions qui réduisent le plus l'incertitude font gagner (+38,1 % avec Uncertainty of Thoughts). Les questions posées sans méthode font perdre (MediQ). Les modèles laissés à eux-mêmes devinent plutôt que de demander : ils devinent seuls les exigences non dites dans 41,1 % des cas, et le résultat est deux fois plus fragile.
- **Toute l'information d'un coup vaut mieux qu'au compte-gouttes.** La performance baisse de 39 % quand elle arrive par morceaux. L'information complète dès le départ reste la meilleure base mesurée (MediQ).
- **L'enrichissement automatique réduit les questions, mais il faut le vérifier.** Une adresse de site suffit à Pomelli pour le ton, les polices, les images et les couleurs. Mais les recherches automatiques n'ont que 39 à 77 % de faits justes et 40 à 94 % de citations justes selon les tests.
- **Pour les goûts, quelques réactions à des images suffisent à guider la création.** C'est le cas de ViPer et Looka, et environ 77 % des choix d'un utilisateur sont prévus à partir de paires d'images. C'est cohérent avec le fait que les préférences se construisent devant les options (Bettman, Luce et Payne, 1998).
- **Un questionnaire perd des répondants avec la longueur**, surtout au-delà d'environ 8 à 10 minutes. Ce sont des données d'éditeur.
- **Même avec assez d'information, réussir du premier coup demande la même chaîne partout :** un plan validé, des vérifications entre les étapes et une relecture avec un retour extérieur. La relecture par le modèle seul n'est pas fiable en raisonnement.
