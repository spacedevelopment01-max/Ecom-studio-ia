# Ce que coûte le texte de SINA, et comment le diviser sans baisser la qualité (recherche du 22 novembre 2026)

Recherche faite le 22 novembre 2026, à la suite de `docs/studio/recherches-2026-11-22-approfondies/11-faire-evoluer-sina.md`
(déjà trouvé : le fil de la conversation jamais lu en cache, les prix d'Opus 5.5 et d'Haiku 5.5, le différé). Je ne le
répète pas ; je vais plus loin. Aucun appel payant, aucun autre fichier modifié.

Niveaux de preuve : **officiel** (page du fournisseur, lue ce jour), **mesure du fournisseur** (chiffres publiés par
Anthropic, OpenAI ou Google sur leurs propres essais), **test indépendant** (classement ou essai fait par un tiers),
**article d'éditeur** (une entreprise parle de son propre produit), **étude publiée** (revue ou conférence relue),
**prépublication**, **presse**, **lu en résumé** (je n'ai vu que ce que le moteur de recherche en dit). Les prix sont en
dollars, comme sur les pages ; le Studio convertit à 0,86 € le dollar (`src/lib/ai/config.ts`). Le client, lui, ne voit
jamais que des pourcentages de son budget d'IA.

---

## 0. Ce qu'il faut retenir

1. **Le choix du modèle n'est pas ce qui coûte le plus.** Dans la chaîne de la marque, passer tout le travail de fond
   (étude, équipes de noms, vérification) de Sonnet 5.5 à Opus 5.5 ne coûterait que **0,55 € de plus** par marque
   (calcul en partie 4). Ce qui coûte, c'est (a) **ce qui est relu plein tarif au lieu d'être lu en cache**, (b) **la
   longueur de ce qu'Opus écrit et réfléchit** (69 % du coût du texte de la marque), (c) **les reprises**.
2. **La règle du propriétaire (« le modèle le plus fort là où SINA décide, conseille ou juge ») peut être gardée telle
   quelle.** Les mesures montrent qu'un modèle moyen est à égalité sur certaines tâches et nettement derrière sur
   d'autres, notamment les connaissances exactes et la recherche de défauts : rien ne prouve qu'on puisse descendre
   sans perte là où SINA conseille.
3. **Le plus gros gain mesuré ailleurs vient de la façon d'envoyer les demandes, pas du modèle** : Asana a divisé le
   coût d'un agent par 76 en gardant le cache intact ; Replit annonce −90 % en ne réécrivant plus sa consigne générale ;
   Anthropic mesure qu'une conversation sans cache coûte 3,3 fois plus cher sur Opus 5.5.
4. **Plan chiffré (partie 7)** : environ **−50 % sur la conversation** et **−25 à −35 % sur le texte de la marque**, sans
   changer de modèle à aucun endroit où SINA décide, conseille ou juge. Ce sont des calculs à vérifier sur les traces
   du Studio (gratuit), puis sur un petit essai payant que le propriétaire accorde ou non.

---

## 1. Les prix officiels de novembre 2026

### 1.1 Anthropic (famille Claude)

Source : https://platform.claude.com/docs/en/about-claude/pricing (**officiel**, lue en entier le 22 novembre 2026).
Prix par million de jetons.

| Modèle | Entrée | Écriture cache 5 min | Écriture cache 1 h | Lecture cache | Sortie | Différé (entrée / sortie) |
|---|---|---|---|---|---|---|
| Claude Fable 5.2 (le plus capable, ouvert à tous) | 8 $ | 10 $ | 16 $ | 0,20 $ (0,025 fois) | 40 $ | 4 $ / 20 $ |
| **Claude Opus 5.5** (SINA) | **4 $** | 5 $ | 8 $ | **0,20 $** (0,05 fois) | **20 $** | 2 $ / 10 $ |
| Claude Sonnet 5.5 (« métier ») | 2 $ | 2,50 $ | 4 $ | 0,10 $ (0,05 fois) | 10 $ | 1 $ / 5 $ |
| Claude Haiku 5.5 (demande jusqu'à 100 000 jetons) | 0,10 $ | 0,125 $ | 0,20 $ | 0,01 $ | 0,50 $ | 0,05 $ / 0,25 $ |
| Claude Haiku 5.5 (au-delà de 100 000 jetons) | 0,50 $ | 0,625 $ | 1 $ | 0,05 $ | 2,50 $ | 0,25 $ / 1,25 $ |

Ce que dit encore la page :
- L'écriture en cache coûte 1,25 fois l'entrée (5 minutes) ou 2 fois (1 heure). Le cache rapporte dès une relecture
  (5 minutes) ou deux (1 heure). Les remises du cache et du différé **se cumulent**.
- Le différé : −50 % sur tout, cache compris ; résultats dans les 24 heures ; pas de mode rapide en différé.
- Le mode rapide d'Opus 5.5 coûte deux fois plus (8 $ / 40 $) : sans intérêt pour SINA.
- Toute la fenêtre d'un million de jetons est au même prix sur Opus 5.5 et Sonnet 5.5 (seul Haiku 5.5 change de prix
  au-delà de 100 000 jetons).
- Les modèles récents utilisent un découpage qui produit « environ 30 % de jetons en plus pour le même texte ».

**La réflexion** (https://platform.claude.com/docs/en/build-with-claude/thinking, **officiel**) : « les jetons que Claude
passe à réfléchir sont facturés comme des jetons de sortie, même quand le texte de la réflexion n'est pas rendu ». Cacher
la réflexion « réduit l'attente, pas le coût ». Sur Opus 5.5, la réflexion ne se coupe pas : seul l'effort se règle.

**L'effort** (https://platform.claude.com/docs/en/build-with-claude/effort, **officiel**) : cinq niveaux (faible, moyen,
élevé, très élevé, maximum). Par défaut « moyen » sur Opus 5.5 et Haiku 5.5, « élevé » sur Sonnet 5.5 (dont les niveaux
ont été recalibrés). L'effort agit sur **tous** les jetons de sortie : réflexion, texte, appels d'outils. Changer
l'effort entre deux demandes « peut invalider le cache » ; le changer par un message système placé dans la conversation
(« effort par message », Opus 5.5, Sonnet 5.5 et Haiku 5.5) **le garde**.

### 1.2 OpenAI

Source : https://developers.openai.com/api/docs/pricing (**officiel**, lue le 22 novembre 2026 en deux passages). Prix par
million de jetons, demandes de moins de 272 000 jetons.

| Modèle | Entrée | Lecture cache | Écriture cache 30 min | Écriture cache 12 h | Sortie |
|---|---|---|---|---|---|
| gpt-6.2-astra | 8 $ | 0,40 $ | 10 $ | 20 $ | 40 $ |
| gpt-6-astra | 10 $ | 1 $ | 12,50 $ | 25 $ | 50 $ |
| gpt-6.2-sol / gpt-6.1-sol | 2 $ | 0,10 $ | 2,50 $ | 5 $ | 10 $ |
| gpt-6.1-terra | 1 $ | 0,05 $ | 1,25 $ | 2,50 $ | 5 $ |
| gpt-6-luna | 0,10 $ | 0,01 $ | 0,125 $ | 0,25 $ | 0,50 $ |
| gpt-5.6-sol (génération précédente) | 4 $ | 0,40 $ | — | — | 20 $ |

- Différé : −50 % (gpt-5.6-sol à 2 $ / 10 $, par exemple). La formule « Flex » est en cours d'arrêt d'après la page.
- Cache (https://developers.openai.com/api/docs/guides/prompt-caching, **officiel**) : à partir de 1 024 jetons ;
  depuis GPT-5.6, écriture à 1,25 fois (30 minutes, par défaut) ou 2,5 fois (12 heures) ; lecture à 0,1 fois, et 0,05
  fois sur gpt-6.2-astra, gpt-6.2-sol, gpt-6.1-sol et gpt-6.1-terra.
- Réflexion (https://developers.openai.com/api/docs/guides/reasoning, **officiel**) : les jetons de réflexion « sont
  facturés comme des jetons de sortie » ; de « quelques centaines à des dizaines de milliers » par demande ; la page ne
  donne aucun nombre par niveau d'effort.

### 1.3 Google (Gemini)

Source : https://aistudio.google.com/docs/pricing (**officiel**, lue le 22 novembre 2026 pour ses 100 000 premiers
caractères). Prix par million de jetons ; **la sortie y comprend la réflexion**.

| Modèle | Entrée | Sortie | Lecture cache | Différé (entrée / sortie) |
|---|---|---|---|---|
| gemini-4-carbon, gemini-4-argon | 2 $, puis **4 $ au 1er décembre 2026** | 10 $, puis 20 $ | 0,10 $, puis 0,20 $ | 1 $ / 5 $, puis 2 $ / 10 $ |
| gemini-4-neon | 3 $ | 15 $ | 0,15 $ | 1,50 $ / 7,50 $ |
| gemini-4-hydrogen | 1,50 $ | 7,50 $ | 0,075 $ | 0,75 $ / 3,75 $ |
| gemini-3.8-flash | 0,75 $, puis 1,50 $ au 1er janvier 2027 | 3,75 $, puis 7,50 $ | 0,075 $ | 0,375 $ / 1,875 $ |

Les prix de Gemini 4 Carbon et Argon doublent le 1er décembre : à ce moment-là, ils coûteront autant qu'Opus 5.5.

### 1.4 Ce que l'effort change sur le nombre de jetons (mesuré)

| Mesure | Résultat | Source et niveau de preuve |
|---|---|---|
| Opus 5.5, écriture d'histoires (96 histoires par niveau) | moyen : 3 089 jetons de sortie par histoire ; élevé : 4 303 (**+39 %**) ; très élevé : 8 770 (**2,8 fois**). Qualité notée : 15,60 / 15,81 / 16,24 sur 20 ; l'élevé ne gagne contre le moyen que 58 histoires sur 96 (presque égalité), le très élevé 79 sur 96. | https://github.com/mrdivax/eqbench-cw-claude, **test indépendant** non officiel (juges : des modèles Claude, donc possible préférence pour le style Claude) |
| Opus 5.5, programmation (SWE-bench Pro) | faible / moyen / élevé / très élevé : 87,4 % / 92,8 % / 95,3 % / 96,7 % réussis, pour 0,11 $ / 0,21 $ / 0,29 $ / 0,74 $ par tâche | https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence.md, **mesure du fournisseur** |
| Opus 5.5, recherche de défauts | faible : 34 points de moins que moyen, pour un cinquième du coût | même page, **mesure du fournisseur** |
| Opus 5.5, recherches longues | moyen au lieu de faible : de 3,4 à 14 points de mieux selon l'épreuve | même page |
| Sonnet 5.5, programmation | moyen au lieu d'élevé : environ 7 points de moins pour 59 % du coût | même page |

**Leçon pour SINA** : l'effort « moyen » qu'elle utilise d'ordinaire est le bon point pour écrire (presque aussi bien
que « élevé », 28 % de jetons en moins) ; « faible » ferait perdre beaucoup sur le travail de réflexion. Le très élevé
améliore nettement l'écriture, mais coûte 2,8 fois plus : à garder pour plus tard, sur un seul moment précis, si le
propriétaire le veut.

---

## 2. Ce qui est mesuré sur la qualité : à quel point un modèle moyen approche le plus fort

### 2.1 Sonnet 5.5 face à Opus 5.5

| Tâche | Sonnet 5.5 | Opus 5.5 | Écart | Source, niveau de preuve |
|---|---|---|---|---|
| Travail de bureau varié jugé par des experts (GDPval-AA, Elo) | 1 844 | 1 846 | **nul** | Artificial Analysis, https://artificialanalysis.ai/ja/articles/claude-sonnet-5-5, **test indépendant** |
| Dossiers de travail (AA-Briefcase, Elo) | 1 811 | 1 822 | faible | même source |
| Connaissances exactes (AA-Omniscience, bonnes réponses) | 54 % | 66 % | **grand (12 points)** | même source |
| Taux d'invention sur ces questions (plus bas = mieux) | 47 % | 59 % | Sonnet invente moins | même source |
| Indice d'intelligence (au maximum) | 56 | 58 | faible | même source ; Opus : https://artificialanalysis.ai/articles/claude-opus-5-5 |
| Jetons de sortie par épreuve (au maximum) | ~193 000 | ~119 000 | Sonnet écrit **60 % de plus** | mêmes sources |
| Recherche documentaire longue (DeepResearch Bench II) | — | +2,4 points | faible, pour 1,5 fois le coût | **mesure du fournisseur** (page d'Anthropic citée en 1.4) |
| Recherche de défauts (note F1) | 0,760 | 0,827 (moyen) ; 0,850 (élevé) | **grand (7 à 9 points)** | même page |
| Histoires sous contraintes (Mazur, 50 sujets) | 0,98 (4e) | 0,999 (1er) | faible | RuntimeWire, **lu en résumé**, page non lisible |
| Programmation (SWE-bench Pro) | 87,6 % pour 0,11 $ | 92,8 % pour 0,22 $ | moyen | **mesure du fournisseur** |

Ce que cela veut dire : sur un travail « de bureau » général, Sonnet 5.5 fait aussi bien qu'Opus 5.5 ; mais il en sait
moins (12 points d'écart sur les connaissances exactes), il trouve moins bien ce qui ne va pas (7 à 9 points), et il
écrit beaucoup plus de jetons, ce qui mange une bonne part de son prix deux fois plus bas. **Trouver ce qui ne va pas,
c'est le métier du juge et du conseil** : c'est là que l'écart est le plus grand. La règle du propriétaire est donc
appuyée par les mesures.

### 2.2 Haiku 5.5 face aux deux autres

- Questions de niveau doctorat (GPQA Diamond) : Haiku 5.5 85 %, Opus 5.5 et Sonnet 5.5 91 % ; Haiku coûte environ 1/20
  d'Opus par bonne réponse (**mesure du fournisseur**).
- Tâches d'agent hébergé (79 tâches) : Haiku 5.5 en réussit 93 % pour environ 0,011 $ chacune (**mesure du fournisseur**,
  un seul passage).
- Recherche de défauts : Haiku 5.5 seul 0,577 contre 0,827 pour Opus 5.5 ; comme aide d'Opus, il fait tomber le résultat
  à 0,677 (**mesure du fournisseur**). **Haiku ne convient pas pour juger.**
- Anthropic le conseille « pour les gros volumes dont le résultat se vérifie » : classer, extraire, aiguiller (page de
  l'effort, **officiel**).

### 2.3 Plus haut qu'Opus 5.5 : Fable 5.2, GPT-6, Gemini 4

- **Fable 5.2** est, selon Anthropic, son modèle le plus capable ouvert à tous ; il coûte deux fois Opus 5.5. Sur la
  recherche de défauts, il fait mieux (de 1,6 à 5,9 points de plus qu'Opus 5.5 « élevé », pour 1,5 à 2,4 fois le coût) ;
  sur la recherche documentaire longue, il coûte 2,9 fois Opus 5.5 pour 1,9 point **de moins** (**mesure du fournisseur**).
  Aucune note d'écriture créative publiée pour lui (EQ-Bench ne l'a pas encore testé, **lu en résumé**). Fable 5.1 au
  très élevé écrit presque aussi bien qu'Opus 5.5 au très élevé (Opus gagne 49 histoires sur 96, test indépendant cité
  en 1.4).
- **Écriture créative, classements** : sur le classement des votes humains d'Arena, Opus 5.5 serait 2e (1 518) derrière
  Gemini 4 Argon ; sur EQ-Bench, Opus 5.5 serait 8e (environ 2 051) derrière GPT-6 Astra (environ 2 177). **Lu en
  résumé** : la page d'Arena m'a refusé l'accès et celle d'EQ-Bench ne montre pas son tableau à la lecture automatique.
  Les deux classements ne disent pas la même chose.
- Changer de fournisseur pour le texte demanderait l'accord du propriétaire (règle : « aucun fournisseur payant ajouté
  sans son accord »), ferait perdre le cache à chaque changement, et les classements ne donnent pas de vainqueur net. Je
  ne le recommande pas.

**Conclusion de la partie 2** : Opus 5.5 au niveau moyen est un choix solide pour SINA ; le seul modèle mesuré nettement
meilleur pour juger (Fable 5.2) coûte deux fois plus. Garder Opus 5.5 est donc à la fois la règle du propriétaire et le
bon calcul.

---

## 3. Les techniques publiées et chiffrées

### 3.1 Le cache bien placé (le plus gros gain partout)

| Qui | Ce qui a été mesuré | Source, niveau de preuve |
|---|---|---|
| Anthropic | Sans cache, Opus 5.5 coûte **3,3 fois** plus cher sur une épreuve d'agent ; Sonnet 5.5 3,1 fois ; un petit agent de tri 7,3 fois ; un agent de recherche est divisé par 4,8 à 7,2. Dans les agents réels, la part lue en cache est de 84 % (moitié des cas). | page « optimizing for cost and intelligence » citée en 1.4, **mesure du fournisseur** |
| Anthropic | Sur une conversation de 101 000 jetons, modifier la consigne générale coûte **0,50 $** la demande sur Opus 5.5 ; changer l'effort au niveau de la demande **0,41 $** ; mettre la même chose dans un **message système au fil de la conversation 0,020 $** ; changer l'effort par message 0,020 $. | même page |
| Anthropic | Durée d'une heure : rentable quand environ 1 tour sur 30 arrive après plus de 5 minutes ; à 1 sur 10, le cache de 5 minutes coûte 54 % de plus. Une « relance à vide » (demande sans réponse, `max_tokens: 0`) qui garde le cache chaud coûte 8 à 13 % de moins que la durée d'une heure sur Opus 5.5. | même page |
| **Asana** | Coût d'un agent **divisé par 76**, 5 fois plus rapide, en arrêtant de modifier le début de l'historique à chaque pas (on retirait la capture d'écran précédente, on raccourcissait les vieux textes) et en n'élaguant que par grands paquets (garder 20 captures, puis revenir à 1). | https://asana.com/inside-asana/cut-browsers-agent-cost.md, **article d'éditeur** (pas de date, pas de montants en dollars) |
| **Replit** | « Réduit le coût de **90 %** par rapport à la modification de la consigne générale » : la consigne reste fixe, et de courts rappels sont ajoutés en bas du fil, puis effacés ; ils sont choisis par un petit trieur sur « un modèle rapide et bon marché ». Placer le rappel en bas plutôt que dans la consigne fait aussi mieux travailler l'agent (15 % d'outils en plus par tour quand c'est le but). | https://frontier.replit.com/decision-time-guidance/ (20 janvier 2026), **article d'éditeur** (la base de comparaison n'est pas détaillée) |
| Cursor | Sans cache, le coût des jetons serait 10 fois plus élevé. | **lu en résumé** (articles de tiers) |

**C'est exactement le défaut de SINA** (rapport 11, partie 0) : l'état du projet et le parcours, qui changent à chaque
pas, sont placés **avant** le fil, qui est réécrit en un seul texte à chaque pas. Replit et Anthropic montrent la
correction : la consigne et les outils fixes en tête, le fil qui ne fait que s'allonger, l'état du projet en message
système à la fin.

### 3.2 La mise à l'écart des vieux résultats d'outils

- **Anthropic** (**mesure du fournisseur**, page citée en 1.4) : l'effacement automatique des vieux résultats « est un
  outil de place, pas d'économie » : chaque passage réécrit l'historique et casse le cache ; sur une longue séance il
  n'a « rien changé », sur une courte il a **ajouté 73 %**. En revanche, élaguer à la fin d'une étape a économisé 39 % et
  le résumé automatique 32 % sur une très longue séance. Déclencher le résumé à 90 000 jetons au lieu de 150 000 a fait
  baisser le coût par demande de 70 % (tours de 10 000 jetons).
- **Asana** (ci-dessus) : élaguer par grands paquets, jamais un peu à chaque pas.
- **Pour SINA** : aujourd'hui, à chaque nouveau message du client, les résultats de la demande précédente sont raccourcis
  à 300 caractères (`serialize` dans `loop.ts`) : c'est un « petit élagage à chaque pas », le cas qui coûte le plus.
  Mieux : raccourcir un résultat **une seule fois, au moment où il entre dans le fil**, puis ne plus jamais y toucher.

### 3.3 Consignes et notices chargées à la demande

- **Anthropic** : avec 502 outils tous chargés, une séance passe de 0,55 $ à 1,02 $ ; avec la recherche d'outils elle
  reste à 0,56 $ (**mesure du fournisseur**). Un tableau collé dans la demande : 5,01 $ et 7 bonnes réponses sur 25 ;
  le même tableau déposé en fichier et lu par du code : 0,40 $ et 25 sur 25.
- **Anthropic** : relire des consignes écrites pour d'anciens modèles a fait économiser 14 % par ticket, à exactitude
  égale ou meilleure (**mesure du fournisseur**).
- **Shopify** : la consigne générale de son agent ramenée de ~6 000 à ~1 500 jetons appris (« condensés »), « sans
  perte mesurée » (https://shopify.engineering/gisting, 19 août 2026, **article d'éditeur**) ; mais cette technique
  demande un modèle qu'on entraîne soi-même, impossible avec Claude.
- **Pour SINA** : l'aiguilleuse fait déjà le chargement à la demande. Il reste deux choses : garder la liste des outils
  **identique d'un pas à l'autre** (changer d'outils casse tout le cache) et relire les consignes une fois avec
  l'outil d'audit d'Anthropic.

### 3.4 Le plus fort décide, le moyen exécute

| Qui | Ce qui a été mesuré | Source, niveau de preuve |
|---|---|---|
| Anthropic | Opus 5.5 qui dirige et Sonnet 5.5 qui fait les lectures : **même résultat** qu'Opus 5.5 seul (0,831 contre 0,827) pour **31 % de moins** ; avec Haiku 5.5 comme aide, −76 % de coût mais résultat bien plus bas (0,677). Fable 5.2 qui dirige coûte 19 % de plus qu'Opus 5.5 pour le même résultat. | page citée en 1.4, **mesure du fournisseur** (recherche de défauts) |
| Anthropic | Haiku 5.5 comme aide en programmation : −32 % de coût, −4 points de réussite. | même page |
| Anthropic | L'« outil conseiller » (un modèle moins cher consulte Opus) : n'a presque jamais consulté (0 fois sur 198 questions, 1 fois sur 300 tâches), et une fois a fait 7 points **de moins** que le modèle seul. | même page |
| **Notion** | Son aiguillage « Auto » donne « environ 90 % des résultats » d'Opus 5.5 ou de GPT-6 Astra « pour environ 90 % de moins » ; exemple : polir un courriel 5 crédits au lieu de 50. Qualité jugée par des modèles, pas par des humains ; la page ne dit pas où l'écart est grand. | https://notion.com/blog/inside-notions-upgraded-model-router-auto (20 octobre 2026), **article d'éditeur** |
| **Cursor** | Aiguillage par difficulté : −41 % (« Balance ») et −68 % (« Intelligence ») par rapport à Opus 4.8 seul, satisfaction des utilisateurs égale ou meilleure ; le coût des caches perdus en changeant de modèle est compté. | https://cursor.com/blog/how-cursor-router-works (6 août 2026), **article d'éditeur** |
| **Shopify** | Un modèle entraîné pour une seule tâche (écrire des requêtes pour l'agent) : coût de service estimé à 1 M$ par an au lieu de 27 M$ (**−96 %**, environ 27 fois moins), meilleur que le modèle de pointe sur cette tâche ; mais c'est le panel de modèles de pointe qui juge chaque échec. | https://shopify.engineering/sidekicks-continual-learning-loop (5 août 2026), **article d'éditeur** (estimation sans calcul détaillé) |
| Shopify | Coût par conversation de son assistant −28 % en un trimestre (« choix des modèles, entraînement de petits modèles, cache »). | **lu en résumé** (compte rendu d'un tiers de la présentation des résultats) |

**Pour SINA** : c'est déjà la forme de la chaîne de la marque (Opus 5.5 trouve l'idée, compose, dessine et juge ;
Sonnet 5.5 fait l'étude, les équipes de noms et la vérification). La mesure d'Anthropic confirme que cette forme peut
garder le résultat **à condition** que le moyen ne fasse que lire et préparer, et que le fort relise. Le « −25 fois » de
Shopify, je ne l'ai pas trouvé : le chiffre le plus proche est ce −96 % estimé, obtenu en entraînant un petit modèle
sur une tâche étroite et répétée des milliers de fois par minute. Ce n'est pas le cas de SINA, et ce n'est pas possible
avec Claude.

### 3.5 La cascade : le petit essaie, le grand reprend si le juge refuse

| Étude | Ce qui est mesuré | Niveau de preuve |
|---|---|---|
| FrugalGPT (Stanford, 2023) | Égale le meilleur modèle « avec jusqu'à 98 % d'économie » | **prépublication**, https://arxiv.org/abs/2305.05176 ; tâches à réponse vérifiable (classer, répondre juste) |
| RouteLLM (2024) | « Plus de 85 % » d'économie sur des conversations notées (MT Bench), 45 % et 35 % sur deux épreuves de connaissances et de calcul, en gardant « 95 % des résultats » du grand modèle | **prépublication**, https://arxiv.org/abs/2406.18665 et https://lmsys.org/blog/2024-07-01-routellm/ |
| Cascades par accord des réponses (2025) | Égalent ou dépassent le grand modèle « pour 40 % du coût » en écriture libre ; signale que les cascades connues visent surtout les tâches « à réponse objective » | **étude publiée** (EMNLP 2025, partie entreprises), https://aclanthology.org/2025.emnlp-industry.171/ |
| Aiguillage et cascade unifiés (ETH Zurich) | La combinaison « bat nettement » chacune des deux ; **tout dépend de la qualité de l'estimateur** qui juge si la réponse est bonne | **prépublication**, https://arxiv.org/abs/2410.10347 |
| Anthropic | Tout faire au niveau bas, puis refaire seulement les échecs au niveau haut (avec un contrôle fiable, ici des tests) : même réussite que tout au niveau haut pour un peu plus de la moitié du coût. Un changement de modèle en cours de conversation repart de zéro pour le cache. | guide des coûts d'Anthropic fourni avec l'outil de développement, **mesure du fournisseur** |
| JFrog | Changer de modèle au milieu d'une séance perd le cache : « vous pouvez finir par payer plus que si vous n'aviez jamais aiguillé » | https://jfrog.com/blog/why-model-routing-backfires (23 juillet 2026), **article d'éditeur**, sans mesure |

**Pour SINA** : une cascade suppose un juge fiable du « bon » et du « pas bon ». Pour un nom de marque, une planche ou
un conseil, ce juge doit lui-même être le modèle le plus fort (règle du propriétaire et mesures de la partie 2). La
cascade ne fait donc économiser que là où le contrôle est **mécanique** (le code dit oui ou non). Une forme permise par
les règles : **la même Opus 5.5 au niveau moyen, puis au niveau élevé seulement quand le juge refuse** (Anthropic :
même réussite pour un peu plus de la moitié du coût, mesuré en programmation, pas sur de l'écriture).

### 3.6 Réponses plus courtes, effort adapté, différé, plafond de sortie

- **Format de réponse imposé** : un agent de tri qui finit par une seule ligne coûte 0,49 $ ; par deux lignes 0,57 $ ;
  par une note en six parties 1,40 $ ; même exactitude (78 à 85 %) (**mesure du fournisseur**, page citée en 1.4).
  Pour SINA : imposer aux **juges** une sortie courte (verdict, raisons en une ligne chacune, correction demandée), sans
  toucher à la longueur des créations.
- **Effort adapté à chaque tâche, sans casser le cache** : par l'effort par message (partie 1.1).
- **Le plafond de sortie ne fait pas économiser** : plafonné à 16 384 jetons, Opus 5.5 est coupé dans 25 % des essais
  et réussit 57,6 % au lieu de 75,6 % à 64 000, pour le même coût par tâche réussie (**mesure du fournisseur**). Une
  réponse coupée, c'est une reprise payée.
- **Dire au modèle que le temps compte** : −60 % de coût sur une recherche longue, mais −4,1 points de résultat
  (**mesure du fournisseur**). Je ne le recommande pas pour SINA (qualité d'abord).
- **Différé** : −50 % sur tout ce que le client n'attend pas devant l'écran (partie 1). Les publications du mois
  préparées d'avance, le point du mois et la batterie de cas s'y prêtent ; la création de la marque, que le client
  attend environ 14 minutes, non (le différé n'a pas de délai garanti en dessous de 24 heures).

### 3.7 Ce que je n'ai pas trouvé, et une mise en garde

- **Replit −90 %** : trouvé, mais c'est la comparaison avec « réécrire la consigne générale » (3.1), pas une baisse du
  coût total de Replit.
- **Intercom Fin** : aucune page technique d'Intercom sur ses choix de modèles ; seulement son prix (0,99 $ par
  résolution, **lu en résumé**) et l'indication qu'il fait tourner son propre modèle (**lu en résumé**).
- **Klarna, une mise en garde** : son patron a dit (entretien avec Bloomberg, 8 mai 2025) : « le coût semble
  malheureusement avoir été un critère trop dominant », et « ce qu'on obtient, c'est une qualité plus basse »
  (https://www.customerexperiencedive.com/news/klarna-reinvests-human-talent-ai-customer-service-buy-now-pay-later/747586/,
  **presse**). C'est la raison de chercher les économies dans la façon d'envoyer les demandes avant de toucher au modèle.

---

## 4. Ce que j'ai lu dans le code du Studio, côté coût du texte (22 novembre 2026)

Fichiers lus : `src/lib/syna-agent/models.ts`, `loop.ts` (`modelFor`, `reason`, `reviewedReply`, `serialize`),
`brand-chain.ts` (déroulé des appels), `src/lib/ai/llm.ts` (`account`, points de cache), `src/lib/ai/config.ts`.

1. **Où vont les modèles** : Opus 5.5 au niveau moyen pour toute la conversation, élevé aux moments forts et pour
   juger ; la relectrice en Opus 5.5 moyen ; Sonnet 5.5 moyen pour le travail de fond de la marque et des angles, et
   pour les recherches sur Internet.
2. **Le texte de la marque, calculé à partir du déroulé habituel écrit dans `brand-chain.ts`** (3 identités, 4 équipes,
   images de la planche comprises pour la direction artistique et la relecture d'images, une reprise sur deux) :
   **environ 4,28 $, soit 3,68 €**, hors recherches sur Internet et hors images. **La sortie d'Opus 5.5 (réflexion
   comprise) en fait 69 %** (2,94 $), l'entrée 1,34 $. Le reste des ~8 € annoncés vient des images, des recherches et
   des reprises. (Mesure réelle du 12 novembre 2026, notée dans le code : 2,88 € pour 3 identités sans images.)
3. **Une conversation** : 1,15 € pour 21 réponses (chiffre du propriétaire), soit environ 0,055 € la réponse. Une
   répartition qui retrouve ce chiffre, **hypothèse à vérifier sur la table `ai_calls`** : ~25 000 jetons fixes lus en
   cache (0,005 $), ~8 000 jetons payés plein tarif (état du projet, parcours et fil réécrit, 0,032 $), ~1 200 jetons
   de sortie (0,024 $). Donc environ la moitié du prix d'une réponse vient de ce qui devrait être lu en cache.
4. **Le cache n'utilise que la durée de 5 minutes** (`cache_control: { type: "ephemeral" }` sans durée, `llm.ts`). Un
   client qui lit une planche et répond 8 minutes plus tard fait tout repayer.
5. **Le compteur du Studio compte la lecture en cache à 0,1 fois le prix** pour tous les modèles (`llm.ts`, fonction
   `account`), alors qu'elle coûte 0,05 fois sur Opus 5.5 et Sonnet 5.5 : le Studio **surestime** un peu ce qui est lu en
   cache (prudent). Mais il compte toute écriture à 1,25 fois : si la durée d'une heure est adoptée (2 fois), il
   **sous-estimerait** ces écritures. À corriger avant d'adopter la durée d'une heure (gratuit, sans IA).
6. **Ce que coûterait de garder le plus fort partout** (calcul, mêmes hypothèses) :
   - Chaîne de la marque avec Opus 5.5 aussi pour l'étude, les équipes de noms et la vérification : **4,91 $ au lieu de
     4,28 $, soit +0,55 € par marque (+15 %)**.
   - Conversation : déjà entièrement en Opus 5.5 ; rien ne change.
   - Passer au modèle le plus capable d'Anthropic (Fable 5.2) partout où SINA décide et juge : **7,92 $ au lieu de
     4,28 $, soit +3,13 € par marque (+85 %)**, et la conversation deux fois plus chère ; pour un gain mesuré à la
     recherche de défauts seulement (partie 2.3). Je ne le recommande pas.

---

## 5. Les règles du propriétaire : où un modèle moins cher pourrait servir sans que SINA décide, conseille ou juge

Règle respectée telle quelle : **Opus 5.5 pour toute la conversation, les créations, les conseils et tous les juges.**
Je ne propose pas de la changer. Voici les seuls travaux où le modèle ne décide, ne conseille et ne juge rien, avec ce
que cela rapporterait (calculs, prix officiels).

| Travail | Ce qu'il fait | Modèle possible | Gain par fois | Ce qui garde la qualité |
|---|---|---|---|---|
| Vérifier qu'un texte ne contient aucun mot interdit par le client, aucune coordonnée d'exemple, aucun prix inventé | règle mécanique | **aucun modèle : le code** (gratuit) | tout | le code dit oui ou non, sans erreur |
| Ranger un message du client dans sa fiche (nom, ville, prix, préférences dites mot pour mot) | extraire | Haiku 5.5 au niveau élevé | 3 000 jetons lus : 0,0003 $ au lieu de 0,012 $ avec Opus | les mots du client sont recopiés, jamais reformulés ; le client voit et corrige sa fiche ; Opus relit la fiche à chaque pas |
| Résumer un fil trop long dans des rubriques fixes (décisions, refus et leurs raisons, mots exacts, identifiants) | mettre en forme | Sonnet 5.5 | environ 2 fois moins qu'Opus | rubriques fixes (rapport 11, partie 2) ; identifiants gardés hors du résumé ; mesuré sur la batterie de cas avant tout passage |
| Traduire en anglais un texte déjà écrit et validé en français | traduire | Sonnet 5.5 | 2 fois moins | la relecture des moments forts par Opus reste ; vocabulaire du client appliqué par le code |
| Recopier un texte validé dans la forme attendue par le thème ou une publication (champs, longueurs) | mettre en forme | Haiku 5.5 ou le code | presque tout | contrôle des longueurs et des champs par le code |
| Choisir quelle notice d'outil ajouter au pas suivant (comme le trieur de Replit) | aiguiller | Haiku 5.5 | faible | se trompe-t-il ? SINA peut toujours ouvrir une notice elle-même (`tools.open`) |
| Lire des pages trouvées sur Internet et en sortir les citations exactes | extraire | Sonnet 5.5 (déjà le cas) | — | les citations sont vérifiées par le Studio (relecture gratuite des pages) |

Ce qu'il **ne faut pas** faire, même si c'est moins cher : un modèle moins fort qui écrit la réponse au client, qui
propose un nom, un angle ou une planche, ou qui juge (même le « lecteur qui ne sait rien » : il juge la clarté) ;
une cascade ou un aiguillage dans la conversation (perte du cache, et règle du propriétaire) ; l'« outil conseiller »
(mesures décevantes, 3.4).

**Ce que rapporteraient ces travaux confiés à un modèle moins cher** : peu. Sur la chaîne de la marque, passer la seule
vérification à Haiku 5.5 fait gagner 0,05 $ (1 %). Ce n'est **pas** là que se trouve l'argent : il est dans le cache, la
longueur des juges et les reprises (partie 7). Leur intérêt est ailleurs : ils permettent d'**ajouter** des
vérifications utiles (la fiche relue à chaque pas, le résumé par rubriques) sans faire monter la facture.

---

## 6. Pas vérifié

- Les classements d'écriture créative (Arena, EQ-Bench) : lus en résumé ; pages non lisibles à la lecture automatique.
  Le seul chiffre lu à la source est le test indépendant d'EQ-Bench rejoué sur Opus 5.5 (juges Claude).
- Le chiffre de Mazur pour Sonnet 5.5 (0,98) et Opus 5.5 (0,999) : lu en résumé.
- Shopify « −25 fois » : non trouvé ; le −28 % du trimestre est lu en résumé ; le −96 % est une estimation de Shopify.
- Intercom : aucune source technique.
- La répartition d'une réponse de SINA (partie 4, point 3) : une hypothèse qui retrouve le chiffre du propriétaire ;
  la table `ai_calls` la vérifie sans rien payer.
- Les gains de la partie 7 : des calculs à partir des prix officiels et des mesures publiées, pas des mesures du Studio.
- L'effort par message et le message système au fil de la conversation : décrits par la page de l'effort (officiel) et
  le guide technique d'Anthropic ; leur page dédiée n'a pas été ouverte ; l'effort par message est encore en essai
  chez Anthropic.

---

## 7. Le plan pour diviser le coût du texte, chiffré, en gardant la qualité

Repères : le budget d'IA d'un client est de **23 € par mois** au forfait de 69 € (28,75 € le premier mois), 33 € à
99 € (41,25 €), 56,33 € à 169 € (70,42 €), calculé à 40 % puis 50 % du prix hors taxes (20 % de taxe). Un projet à plus
de 20 € prend aujourd'hui **70 % du premier mois** du plus petit forfait.

Aucune étape ne change de modèle là où SINA décide, conseille ou juge. Les étapes 1 à 4 sont gratuites à construire et
à vérifier sans IA ; l'étape 5 demande un petit essai payant dont le prix sera donné avant.

| # | Ce qui change | Gain attendu (calcul) | Preuve qui l'appuie | Ce que le client verra |
|---|---|---|---|---|
| 1 | **Mesurer d'abord** : une requête sur `ai_calls` par étape (part lue en cache, part plein tarif, sortie, reprises), et corriger le compteur du cache (0,05 fois sur Opus et Sonnet 5.5 ; 2 fois pour l'écriture d'une heure). | aucun, mais tout le reste en dépend | — | rien |
| 2 | **Le fil lu en cache** : consigne et outils fixes en tête ; le fil envoyé comme une suite qui ne fait que s'allonger ; chaque résultat raccourci **une seule fois** en entrant dans le fil ; l'état du projet, le parcours et le budget en message système à la fin ; l'effort changé par message, jamais au niveau de la demande. | réponse ~0,061 $ → ~0,036 $ : **21 réponses de 1,15 € → environ 0,65 €** (−40 %) | Anthropic (×3,3 sans cache ; 0,50 $ contre 0,020 $), Replit (−90 % contre la réécriture de la consigne), Asana (÷76) | des réponses plus rapides ; plus de travail dans le même budget |
| 3 | **Le cache d'une heure, ou la relance à vide**, pour la conversation, là où le client met plus de 5 minutes à répondre ; décidé d'après les écarts réels entre deux messages (mesurés à l'étape 1). | évite de repayer tout le fil après une pause : à 1 retour sur 10 après 5 minutes, le cache de 5 minutes coûte 54 % de plus | Anthropic (mesure du fournisseur) | rien, sinon un budget qui dure |
| 4 | **Des juges qui répondent court** : verdict, une ligne par raison, correction demandée ; liste de contrôle propre au travail (rapport 11, partie 2). La longueur des créations ne change pas. Même chose pour la relectrice des réponses. | juges deux fois plus courts : texte de la marque **−0,20 €** ; conversation : sortie −25 %, **0,65 € → environ 0,55 €** pour 21 réponses | Anthropic (une ligne : 0,49 $ contre 1,40 $, même exactitude) ; TICK (rapport 11) | rien ; des refus mieux expliqués à SINA |
| 5 | **Moins de reprises** : chaque juge reçoit la liste des règles du propriétaire qui s'appliquent au travail ; une identité refusée est refaite au niveau d'effort élevé (même modèle) plutôt que deux fois au niveau moyen ; essai sur deux clients inventés. | une reprise au lieu de deux sur 3 identités : **−0,25 €** sur le texte de la marque ; davantage sur un projet entier, où les reprises font la différence entre 8 € et plus de 20 € | Anthropic (refaire les seuls échecs au niveau plus haut : un peu plus de la moitié du coût, mesuré en programmation) | des créations justes plus souvent du premier coup |
| 6 | **Le cache entre les appels de la chaîne de la marque** : le dossier de marque (étude, brief, règles) placé en tête et identique pour tous les appels d'Opus. | si la moitié de l'entrée de chaque appel se relit : **−0,55 €** par marque | prix officiels ; part réelle à mesurer à l'étape 1 | une marque prête au même moment, pour moins |
| 7 | **Le différé** pour tout ce que le client n'attend pas : publications du mois préparées d'avance, point du mois, grands moments, batterie de cas. | **−50 %** sur ces travaux, cumulable avec le cache | prix officiels (Anthropic, OpenAI, Google) | les mêmes créations, prêtes à l'heure dite |
| 8 | **Le moins cher seulement pour le mécanique** (partie 5) : le code pour les règles, Haiku 5.5 pour ranger la fiche, Sonnet 5.5 pour résumer le fil et traduire. | faible sur la facture (~1 %) ; permet d'ajouter la fiche relue à chaque pas presque sans frais | Anthropic (Haiku : « gros volumes vérifiables ») | SINA n'oublie plus rien de ce qu'il a dit |

**Total calculé, à vérifier** :
- **Conversation** : 1,15 € → **environ 0,55 €** pour 21 réponses (**−50 %**), étapes 2 à 4.
- **Texte de la marque** : 3,68 € → **environ 2,70 €** (**−26 %**) avec les étapes 4 à 6 cumulées ; jusqu'à −35 % si le
  cache entre les appels se relit plus que la moitié. La sortie d'Opus (réflexion comprise) reste la plus grosse part, et
  elle n'est pas réduite sur les créations : c'est le prix de la qualité.
- **Projet complet** : le plus gros levier est le nombre de reprises (étape 5), qui se mesure sur l'essai ; les images
  sont traitées dans `03-couts-des-images.md`.
- **Garder le plus fort partout** coûterait 0,55 € de plus par marque (+15 %) : c'est un choix possible si le
  propriétaire le préfère ; il ne change rien à la conversation.

**Ce que je recommande de faire en premier** : les étapes 1 et 2. L'étape 1 est gratuite et dit exactement où part
l'argent ; l'étape 2 est la seule qui, partout où elle a été mesurée, divise le coût sans toucher à la qualité, parce
que le modèle reçoit exactement le même texte, seulement lu en cache.
