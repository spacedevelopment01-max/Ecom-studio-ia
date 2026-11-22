# Les techniques publiées en 2025-2026 pour baisser le coût d'un agent comme SINA sans baisser la qualité (22 novembre 2026)

Recherche sur Internet, pages officielles d'Anthropic et d'OpenAI lues à la source, plus les équipes qui publient leurs
chiffres. Aucun appel payant, aucun autre fichier du dépôt modifié. Ce qui est déjà dans
`docs/studio/couts/02-couts-des-modeles-de-texte.md` et `03-couts-des-images.md` n'est pas répété : je renvoie à leur
partie.

Niveaux de preuve : **officiel** (page du fournisseur lue ce jour), **mesure du fournisseur**, **article d'éditeur**
(une entreprise parle de son produit), **prépublication**, **presse**, **lu en résumé** (seulement l'extrait du moteur
de recherche), **calcul** (mon calcul à partir des prix des consignes : Opus 5.5 à 4 $ / 20 $, lecture en mémoire
0,20 $, écriture d'une heure ×2 ; Haiku 5.5 à 0,10 $ / 0,50 $ ; différé −50 % ; 1 $ = 0,90 €), **à vérifier**.


Toutes les pages d'Anthropic citées ont été lues à la source, dans leur version texte
(`https://platform.claude.com/docs/en/<page>.md`), le 22 novembre 2026.

---

## 0. Ce qu'il faut retenir

1. **Il ne reste pas de grosse économie cachée dans les techniques publiées** : le gros (fil en mémoire, mémoire d'une
   heure, juges courts, différé) est déjà trouvé et en grande partie corrigé. Ce qui reste fait **de 0,2 € à environ
   2,6 € par projet**, presque tout **conditionnel** à ce que le code fait aujourd'hui (à vérifier, gratuitement).
2. **Le plus gros reste vient d'une règle nouvelle d'Anthropic pour Opus 5.5** : ne jamais réécrire le début du fil
   (liste d'outils, consigne générale, anciens résultats d'outils) ; sinon tout est relu plein tarif et la demande peut
   même **échouer** (erreur 400). Les outils s'ajoutent et l'état du projet se donne par **message système** placé en fin
   de fil, dont une version « d'un seul tour » qui ne coûte plus rien après son tour (parties 1.4, 1.5, 2.2 bis).
3. **Le cache est déjà partagé entre tous les clients** pour la partie commune (consigne et outils de SINA), à condition
   qu'elle soit identique à l'octet près et que tout passe par un seul espace de travail (partie 2.2). « Plus de 4 points
   de cache » n'existe pas et n'est pas nécessaire (partie 2.1).
4. **La plus grosse somme n'est pas technique** : les abonnements Claude Max, Ultra, Team et ChatGPT Pro, Business
   donnent désormais **100 à 500 $ par mois de crédits d'API**. Si le propriétaire en a déjà un, le relier au Studio ne
   coûte rien (partie 7). Les programmes pour jeunes entreprises sont fermés (Anthropic) ou réservés aux entreprises
   soutenues par un fonds (OpenAI).
5. **Pour la vitesse** : réponses en flux pour tout ce qui n'a pas à être relu, relecture lancée dès la fin du brouillon,
   montage du site dès les premiers morceaux (partie 5) ; tout cela à prix égal.

---

## 1. Anthropic : la gestion du contexte (le fil qui grossit)

### 1.1 La mise à l'écart automatique des vieux résultats d'outils (`context_management`)

- **Ce qu'elle fait** : le serveur d'Anthropic remplace les plus vieux résultats d'outils par un court texte de place,
  avant que la demande n'arrive au modèle ; le Studio garde l'historique complet. Réglages : seuil de déclenchement
  (par défaut 100 000 jetons d'entrée), nombre de résultats récents gardés (3 par défaut), quantité minimale à effacer
  (`clear_at_least`), outils jamais effacés (`exclude_tools`). Une deuxième règle efface les vieilles réflexions.
- **Statut** : **en essai** (en-tête `context-management-2025-06-27`), valable sur Opus 5.5, Sonnet 5.5, Haiku 5.5
  (https://platform.claude.com/docs/en/build-with-claude/context-editing, **officiel**).
- **Effet sur le cache, mot pour mot** : « Invalidates cached prompt prefixes when content is cleared [...] You'll incur
  cache write costs each time content is cleared ». La page ne donne **aucun gain mesuré**.
- **Mesure d'Anthropic** déjà notée dans le rapport 02 (partie 3.2) : +73 % de coût sur une séance courte, rien de
  changé sur une longue. Je ne la répète pas.
- **Pour SINA : non.** Une conversation de SINA fait une vingtaine de réponses et reste loin des 100 000 jetons ;
  chaque effacement ferait réécrire tout le fil en mémoire. Aucun gain, risque de perte.

### 1.2 La compression du fil (`compaction`), et sa nouveauté de septembre 2026 : la compression à la demande

Nouveau depuis le rapport 02 : il existe maintenant **deux** façons de compresser.
- **À un seuil** (`compact_20260112`) : le serveur résume quand le fil atteint le seuil choisi, dans la demande même.
- **À la demande** (`compact-2026-09-04`, **en essai**, Opus 5.5, Sonnet 5.5 et Haiku 5.5 compris) : le Studio envoie le
  fil avec `"compaction": {"type": "summarize"}` ; Claude rend un seul bloc signé qui résume tout ; ce bloc remplace
  ensuite les vieux messages, en tête du fil. On peut **garder les derniers tours mot pour mot**, **faire le résumé en
  arrière-plan pendant que la conversation continue**, et **écrire sa propre consigne de résumé** (jusqu'à 16 384
  caractères) (https://platform.claude.com/docs/en/build-with-claude/compaction et `compaction-on-demand`,
  **officiel**).
- **Ce que coûte un résumé, mot pour mot** : « The summarization call is billed and rate-limited like any other
  request » ; « Sending a block back on later requests adds no compaction cost. » Le résumé se fait avec le modèle de
  la demande (donc Opus 5.5 chez SINA si on garde la même demande). Les images et documents résumés **disparaissent** :
  « Images, documents [...] inside the summarized messages are gone once the block replaces them ».
- **Gain mesuré** : −32 % sur une très longue séance (rapport 02, 3.2) ; rien d'autre de publié.
- **Une règle nouvelle, importante pour SINA** : sur Opus 5.5, Sonnet 5.5 et Haiku 5.5, Anthropic écrit de **ne pas raccourcir soi-même un ancien résultat d'outil déjà envoyé** (« Don't use the prune ») : « if your application rewrites an earlier tool
  result, that invalidates every thinking block already in the history after the result [...] and the request might
  fail » ; il conseille la compression à la place, qui se fait sur le serveur et « neither invalidates thinking blocks »
  (https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence, partie « Manage the
  context lifecycle », **officiel**).
  Le rapport 02 a relevé que `serialize` (`loop.ts`) raccourcit à 300 caractères les résultats de la demande précédente à
  chaque nouveau message. **Si le fil est envoyé avec les blocs de réflexion d'Opus, ce raccourcissement après coup peut
  donc faire échouer la demande, pas seulement casser le cache** (à vérifier dans le code : je n'ai pas lu le code, par
  consigne ; c'est au rapport qui lit `loop.ts` de le confirmer). La correction proposée par le rapport 02 (raccourcir
  **une seule fois, à l'entrée** dans le fil) reste la bonne et devient obligatoire.
- **Pour SINA** : la compression à la demande ne sert qu'**après la livraison**, quand le fil d'un client dure des mois
  (publications, publicités, améliorations). Faite en arrière-plan, juste après une réponse, elle ne fait jamais
  attendre le client. Consigne de résumé à écrire avec des rubriques fixes (décisions, refus et leurs raisons mot pour
  mot, vocabulaire du client), ce que demande déjà la règle « ce qu'il a dit une fois vaut pour toujours ».
  Gain : il dépend de la longueur du fil après livraison, qui n'est pas mesurée ; **à chiffrer sur `ai_calls`**.
  Effet : égal ou meilleur (Anthropic : « response quality degrades as a conversation grows »), à condition que la
  fiche du client et les mots exacts restent hors du résumé.

### 1.3 L'outil de mémoire (`memory_20250818`)

- **Ce qu'il fait** : un outil que le Studio met en œuvre lui-même (lecture et écriture de petits fichiers) ; Claude y
  range ce qu'il veut retrouver plus tard, d'une conversation à l'autre. **Stable** (plus en essai), Opus 5.5 compris
  (https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool, **officiel**). Prix : celui d'un outil
  ordinaire ; « Standard client tool, no special caching interaction ».
- **Gain mesuré** : la page n'en donne aucun. Un chiffre circule (« +39 % » sur une épreuve de recherche, avec la mise à
  l'écart des résultats) : je ne l'ai trouvé que chez des tiers, **lu en résumé**, et c'est un gain de réussite, pas
  d'argent.
- **Pour SINA : pas utile tel quel.** Le Studio a déjà sa base (projet, fiche, refus) et la place en tête de la
  demande ; laisser le modèle décider seul de ce qu'il note ajouterait des appels d'outil payés. La seule idée à
  reprendre est le principe : la fiche du client est rangée hors du fil, et c'est elle qui survit à une compression.

### 1.4 Le message système au fil de la conversation, et sa nouveauté d'août 2026 : le message d'un seul tour

Le rapport 02 a noté le message système placé dans la conversation (stable sur Opus 5.5). **La nouveauté** :
- **Le message système « d'un seul tour »** (`clear_at: "next_user_message"`, **en essai**, en-tête
  `mid-conversation-system-clear-at-2026-08-21`, Opus 5.5 compris) : son texte n'est lu que pour le tour en cours ; dès que
  le message suivant du client arrive, il reste à sa place mais « renders nothing and costs no input tokens, on that
  request and every later one ». Rien d'antérieur ne change, donc **le cache continue de correspondre et les blocs de
  réflexion restent valides** (https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages,
  **officiel**). Règle : le renvoyer à l'identique, jamais le reconstruire.
- **Ce que cela change pour SINA** : c'est exactement la place qu'il faut pour **l'état du projet, le parcours et le
  budget**, qui changent à chaque pas. Le rapport 02 (partie 3.1) les a trouvés **avant** le fil, ce qui faisait tout
  relire plein tarif ; la branche `claude/evolution-sina` a mis en mémoire le résumé du client et la consigne de l'étape
  (consignes), mais je ne sais pas si l'état du projet a été déplacé (**à vérifier**). Avec le message d'un seul tour : ils arrivent **après** le dernier message du client, sont
  lus une fois au tarif d'entrée, puis ne coûtent plus rien et ne s'empilent pas.
- **Gain (calcul)**, sur l'hypothèse du rapport 02 (environ 8 000 jetons payés plein tarif par réponse, dont l'état du
  projet) : si l'état fait 2 000 jetons et que les 6 000 autres (fil) passent en lecture en mémoire, une réponse passe de
  8 000 × 4 $ = 0,032 $ à 2 000 × 4 $ + 6 000 × 0,20 $ = 0,0092 $ d'entrée, soit **−0,023 $ par réponse, −0,41 € pour 21
  réponses**. Ce gain **est le même** que l'étape 2 du plan du rapport 02 (« l'état du projet en message système à la
  fin ») : il ne s'additionne pas ; ce que le message d'un seul tour ajoute, c'est que **ces états ne s'empilent pas**
  dans le fil (sans lui, 21 états de 2 000 jetons finiraient relus en mémoire à chaque réponse : environ 20 000 jetons ×
  0,20 $ = 0,004 $ de plus par réponse en fin de conversation, **≈ 0,04 € par projet**) et que le fil reste plus court.
- **Effet** : égal ; plus rapide (moins à relire).

### 1.5 Changer d'outils en cours de conversation sans casser le cache (septembre 2026)

- **Nouveau** (**en essai**, `inline-tools-2026-09-15`) : un message système peut **ajouter ou retirer un outil**
  (`tool_addition`, `tool_removal`), et même définir un outil complet, sans toucher à la liste des outils en tête ;
  « the prompt cache still hits and only the appended message is processed as new input » (même page, **officiel**).
- **Mise en garde officielle** : sur Opus 5.5, une demande qui **modifie la consigne générale ou la liste des outils**
  et renvoie d'anciens blocs de réflexion reçoit une **erreur 400**, même juste après une compression (page « optimizing
  for cost and intelligence », partie « What breaks the cache », **officiel**). Changer d'outils d'une étape à l'autre
  (la marque, les angles, le site) en réécrivant la liste fait donc **perdre tout le cache** et peut **faire échouer**
  la demande.
- **Pour SINA** : garder la même liste d'outils de bout en bout (rapport 02) ; quand une étape a vraiment besoin d'un
  outil de plus, l'ajouter par un message système. Gain (calcul) : un changement de liste fait réécrire tout ce qui est en
  mémoire, environ 25 000 jetons fixes et 10 000 jetons de fil, avec la mémoire d'une heure déjà adoptée :
  35 000 × (8 $ − 0,20 $) / million = **0,27 $ par changement**. Sur 5 changements d'étape, **≈ 1,23 € par projet**,
  **seulement si** le Studio réécrit aujourd'hui la liste des outils d'une étape à l'autre (**à vérifier** dans `loop.ts`
  par le rapport qui le lit ; 0 € s'il garde déjà la même liste). Effet : égal, plus rapide, et plus d'erreur 400 possible.

### 1.6 Les fils gardés chez Anthropic (`thread`, août 2026) : plus rapide, pas moins cher

- **Ce qu'il fait** (**en essai**, `message-threads-2026-08-12`) : Anthropic garde la conversation de son côté ; chaque
  demande n'envoie que les nouveaux messages. « Requests are smaller, and time to first token stays lower and steadier
  as the conversation grows. » Le fil expire 5 minutes après la dernière demande ; s'il a expiré, on renvoie tout.
- **Prix** : « Threads do not change pricing or rate limits. » Le cache se règle comme avant (au plus 4 points).
  Incompatible avec le différé (https://platform.claude.com/docs/en/build-with-claude/message-threads, **officiel**).
- **Pour SINA** : **aucun gain d'argent**, un gain de vitesse non chiffré par Anthropic sur la première lettre de la
  réponse. Le fil de SINA est court (quelques dizaines de milliers de jetons) : le gain serait petit. **À garder pour
  plus tard**, quand les fils d'après livraison deviendront longs.

---

## 2. Anthropic : le cache, au-delà de ce qui est fait

Déjà fait sur la branche `claude/evolution-sina` (consignes) : fil en mémoire, mémoire d'une heure, résumé du client et
consigne de l'étape en mémoire. Ce qui suit est ce qui reste, d'après les pages officielles.

### 2.1 « Plus de 4 points de cache » : impossible, mais ce n'est pas un frein

- **Mot pour mot** : « You can define up to 4 cache breakpoints » ; le cache automatique (un champ `cache_control` en
  haut de la demande, qui suit seul la fin du fil) « uses one of the 4 available breakpoint slots » ; un cinquième point
  renvoie une erreur 400. **Il n'existe aucune option pour plus de 4**
  (https://platform.claude.com/docs/en/build-with-claude/prompt-caching, **officiel**).
- **Ce qui compte vraiment** : Anthropic cherche un morceau déjà en mémoire jusqu'à **20 blocs en arrière** de chaque
  point (« The lookback window is 20 blocks ») ; plusieurs points ne servent que si « a growing conversation pushes your
  breakpoint 20 or more blocks past the last cache write ». Les points eux-mêmes sont gratuits.
- **Une règle utile et peu connue** : quand Claude utilise un outil d'Anthropic (recherche sur Internet, lecture de
  page), le serveur pose **seul** un point de cache après chaque résultat, **toujours de 5 minutes**, même si le reste
  est réglé à une heure (https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-use-with-prompt-caching,
  **officiel**).
- **Pour SINA** : 4 points suffisent (outils, consigne générale, fiche du client, fin du fil). Le seul risque est une
  longue chaîne d'outils (la création du site) qui ferait plus de 20 blocs entre deux points : poser le point
  automatique en haut de la demande règle cela. **Gain : 0 € de plus** que ce qui est fait, sauf si `ai_calls` montre des
  relectures manquées en fin de longue chaîne (**à vérifier**, gratuit).

### 2.2 Le cache partagé entre clients pour la partie commune

- **Ce que dit Anthropic** : les caches ne sont jamais partagés entre organisations ; sur l'API d'Anthropic ils sont
  aussi séparés **par espace de travail** ; entre deux demandes du même espace, une partie identique « 100 percent
  identical » est relue, **quel que soit le client** (même page, **officiel**). Autrement dit, **la consigne générale
  de SINA et ses outils, s'ils sont mis en tête et identiques à l'octet près, sont déjà partagés entre tous les clients
  du Studio**, sans rien à demander.
- **Les conditions** : (a) un seul espace de travail pour toutes les demandes de SINA (une clé par client, ou un espace
  par client, couperait le partage) ; (b) rien de propre au client avant le premier point de cache (ni nom, ni date,
  ni heure, ni ordre variable des outils : l'outil de diagnostic d'Anthropic, ci-dessous, le vérifie) ; (c) la même
  durée de mémoire pour tout le monde.
- **Gain (calcul)** : chaque client qui ouvre une séance alors qu'un autre a utilisé SINA dans l'heure lit les ~25 000
  jetons fixes au lieu de les écrire : 25 000 × (8 $ − 0,20 $) / million = **0,195 $, soit 0,18 € par séance ouverte**.
  Avec 4 séances par projet (hypothèse), **jusqu'à ≈ 0,70 € par projet** ; presque rien tant que le Studio a peu de
  clients en même temps. Même principe pour le **relecteur d'images** (consignes et planche des 50 logos aimés, communes
  à tous) : le rapport 03 (partie 3.5) compte déjà le gain de la relecture ; le partage entre clients ne fait
  qu'économiser la première écriture.
- **Effet** : égal ; la première réponse arrive plus vite (Anthropic : le cache « cuts latency »).

### 2.2 bis Ce qui change à chaque tour se met après le dernier point de cache

- **Mot pour mot** : « Put per-request text, such as a status line, at the end of the newest user turn, after the last
  cache breakpoint. On later requests, leave each earlier turn as you sent it » (page « optimizing for cost and
  intelligence », partie « What breaks the cache », **officiel**). Dans l'essai d'Anthropic, une ligne d'état de 25 jetons
  placée en tête faisait réécrire toute la conversation à chaque demande.
- **Pourquoi c'est un gain de plus avec la mémoire d'une heure** : tout ce qui est **avant** le dernier point est écrit en
  mémoire à **2 fois** le prix d'entrée (8 $ au lieu de 4 $ sur Opus 5.5). Un état du projet qui ne sera jamais relu tel
  quel n'a rien à faire là : placé **après** le dernier point, il est payé 4 $, pas 8 $.
- **Gain (calcul)** : un état de 2 000 jetons par réponse, 2 000 × (8 $ − 4 $) / million = 0,008 $ ; sur 21 réponses,
  **≈ 0,15 € par projet**, **si** le point automatique du Studio est aujourd'hui posé sur le tout dernier bloc, état compris
  (**à vérifier**, gratuit, en lisant `cache_creation_input_tokens` dans `ai_calls`). Effet : égal.

### 2.3 L'outil de diagnostic du cache (stable depuis 2026, gratuit)

- **Ce qu'il fait** : on ajoute `"diagnostics": {"previous_message_id": ...}` ; Anthropic compare la demande à la
  précédente et dit **où** elle a divergé (`model_changed`, `system_changed`, `tools_changed`, `messages_changed`), avec
  le nombre de jetons perdus (https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics, **officiel**,
  « stable »). La page ne lui donne aucun prix. Il ne garde que des empreintes, pas le texte.
- **Pour SINA** : c'est l'étape 1 « mesurer d'abord » du rapport 02, faite par Anthropic, sans IA en plus. **Gain direct
  : 0 €** ; il garantit les gains des parties 1 et 2.

### 2.4 Une heure, ou 5 minutes gardées chaudes : ce que dit la mesure d'Anthropic pour Opus 5.5

- Pour Opus 5.5 et Sonnet 5.5, Anthropic donne une règle nouvelle (page « optimizing for cost and intelligence »,
  **mesure du fournisseur**) : si seulement 1 ou 2 pauses sur 20 durent entre 5 minutes et une heure, garder le cache
  de 5 minutes chaud par une demande vide toutes les 4 minutes coûte **8 à 13 % de moins** que la mémoire d'une heure ;
  si une pause précède **chaque** tour, la mémoire d'une heure gagne (la demande vide coûte « over 50% more » à
  45 minutes de pause).
- **Une mise en garde chiffrée** : « Choose the cache duration when a conversation starts » ; passer en cours de
  conversation de 5 minutes à une heure réécrit tout une fois : **0,80 $** à 100 000 jetons sur Opus 5.5.
- **Pour SINA** : le client lit une planche, réfléchit, répond ; une pause de plus de 5 minutes avant presque chaque
  tour est probable. **La mémoire d'une heure, déjà adoptée, est donc le bon choix** ; à confirmer sur les écarts réels
  entre deux messages (`ai_calls`, gratuit). Vérifier aussi que **toutes** les demandes d'une même conversation portent la
  même durée (une seule demande à 5 minutes au milieu fait réécrire).

### 2.5 Le différé combiné au cache : la recette officielle

- **Mot pour mot** : « Gather a set of message requests that have a shared prefix. Send a batch request with a single
  request that has this shared prefix and a 1-hour cache block [...] As soon as this is complete, submit the rest of the
  requests » ; avec la mémoire de 5 minutes, les relectures sont au hasard, car les demandes d'un lot passent « in any
  order » (https://platform.claude.com/docs/en/build-with-claude/prompt-caching, foire aux questions, **officiel**).
  La plupart des lots finissent **en moins d'une heure** (page du différé, **officiel**). Les remises se cumulent.
- **Pour SINA** : les publications du mois (lot 5), le point du mois, les angles en réserve. **Gain (calcul)**, si 30
  textes de publications partagent un dossier de marque de 10 000 jetons et sont 30 demandes séparées : sans cache,
  30 × 10 000 × 2 $ = 0,60 $ ; avec la recette, 10 000 × 4 $ (écriture d'une heure en différé) + 29 × 10 000 × 0,10 $ =
  0,069 $ ; **−0,53 $, soit ≈ 0,48 € par client et par mois** (hypothèse sur la forme des demandes : **à vérifier** quand
  le lot 5 sera construit). Effet : égal ; les publications sont prêtes à l'avance.

---

## 3. Anthropic : les outils économes en jetons

### 3.1 L'ancien réglage « outils économes en jetons » n'existe plus

- L'ancienne page renvoie aujourd'hui au guide de passage aux nouveaux modèles : l'économie est **intégrée** aux modèles
  récents. Ce qui reste mesurable : l'en-tête invisible qu'Anthropic ajoute dès qu'il y a des outils coûte **286 jetons**
  sur Opus 5.5 (https://platform.claude.com/docs/en/about-claude/pricing, partie « Tool use pricing », **officiel**),
  relus en mémoire. **Gain : 0 €.**

### 3.2 La recherche d'outils à la demande (`defer_loading`)

- **Ce qu'elle fait** (**stable**) : les outils marqués `defer_loading: true` ne sont pas envoyés ; Claude les cherche
  quand il en a besoin, et leur définition arrive dans le fil, **sans casser le cache** (« The prefix is untouched, so
  prompt caching is preserved »). Anthropic conseille de garder chargés les 3 à 5 outils les plus utilisés
  (https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool, **officiel**).
- **Mesures** : −85 % de jetons de définitions (77 000 → 8 700), et réussite d'Opus 4.5 de 79,5 % à 88,1 %
  (https://www.anthropic.com/engineering/advanced-tool-use, 24 novembre 2025, **mesure du fournisseur**) ; à 502 outils,
  0,56 $ au lieu de 1,02 $ (rapport 02).
- **Quand elle sert, mot pour mot** : « Your tool definitions consume more than 10k tokens » ; elle est moins bonne
  « when you have fewer than 10 tools ». Chaque outil cherché coûte un tour de plus (un peu d'attente).
- **Pour SINA** : seulement si ses définitions d'outils dépassent 10 000 jetons (**à vérifier** sur une demande réelle,
  gratuit, par le compteur de jetons d'Anthropic). Comme elles sont déjà lues en mémoire à 0,05 fois le prix, le gain
  serait faible : 10 000 jetons × 0,20 $ / million = 0,002 $ par réponse, **≈ 0,04 € pour 21 réponses**. Son intérêt
  serait surtout la **justesse** du choix d'outil s'il y en a plus de 30.

### 3.3 Les appels d'outils écrits en code (`allowed_callers`)

- **Ce qu'il fait** (**stable**) : Claude écrit un petit programme qui appelle plusieurs outils de suite dans un bac à
  sable d'Anthropic ; seuls les résultats filtrés reviennent dans le fil.
- **Mesures** : −37 % de jetons sur des recherches complexes, réussite un peu meilleure (article cité, **mesure du
  fournisseur**) ; −38 % de jetons d'entrée sur un agent à 75 outils ; mais **+8 % de coût** quand chaque tour ne fait
  qu'un ou deux appels (« Sequential single-call workflows do not benefit »)
  (https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling, **officiel**).
- **Prix** : celui de l'exécution de code, **gratuite** quand la recherche ou la lecture de pages d'Anthropic est dans la
  demande ; sinon 1 550 heures offertes par mois puis 0,05 $ l'heure (page des prix, **officiel**).
- **Pour SINA : non** pour la conversation (un ou deux outils par tour). **Peut-être** pour la recherche sur Internet du
  travail de fond (plusieurs pages lues de suite) : à mesurer sur un essai, gain non chiffrable avant.

### 3.4 La recherche sur Internet : ce qui coûte et ce qui est gratuit

- Recherche : **10 $ les 1 000** (1 centime la recherche) plus les jetons des résultats, qui restent dans le fil « in
  later conversation turns ». Lecture de page : **gratuite** hors jetons, avec un plafond `max_content_tokens` et un
  filtrage qui retire le superflu des pages (page des prix et page « optimizing », **officiel**).
- Une page moyenne fait environ 2 500 jetons, une grande page de documentation 25 000 (page des prix, **officiel**).
- **Manus** (« Context Engineering for AI Agents », 18 juillet 2025, **article d'éditeur**) : une compression qu'on peut
  défaire, « a web page can be dropped if its URL is kept ».
- **Pour SINA** : plafonner les pages lues (`max_content_tokens`) et ne garder dans le fil que les citations utiles et
  l'adresse. Gain (calcul) : une grande page de 25 000 jetons ramenée à 3 000 sur Sonnet 5.5 (2 $ le million) fait
  **0,044 $ de moins par page** ; sur 10 pages par marque, **≈ 0,40 € par projet**, **si** le Studio garde aujourd'hui les
  pages entières (**à vérifier** dans le code de recherche). Effet : égal (les citations sont vérifiées par le Studio).

---

## 4. Anthropic : des sorties structurées plus courtes, et moins de reprises

- **Ce que dit la page** (https://platform.claude.com/docs/en/build-with-claude/structured-outputs, **officiel**) :
  la sortie structurée garantit le schéma (échantillonnage contraint) ; elle ajoute une petite consigne payée ; la
  première fois qu'un schéma sert, une attente en plus, puis il est gardé 24 heures ; **changer de format en cours de
  conversation casse le cache**. Sur Opus 5.5, forcer un outil (`tool_choice` « any » ou « tool ») renvoie une erreur
  400 : il faut « auto » avec l'option `strict` (notes de version, **officiel**).
- **Ce que cela rapporte à SINA** : (a) **plus jamais de reprise pour un résultat mal formé** : la règle des consignes
  « les cas d'échec qui font repayer (schéma refusé) » disparaît là où le schéma est garanti. Gain : le nombre de reprises
  pour schéma refusé, **à compter dans `ai_calls`** (gratuit) ; chaque reprise évitée d'un juge Opus vaut environ
  0,02 à 0,05 $. (b) **Des noms de champs courts** et aucun champ inutile : chaque clé est réécrite à chaque sortie et
  payée 20 $ le million. Pour un juge à 10 champs, passer de noms longs (« raisonDetailleeDuRefus ») à des noms courts
  (« raison ») gagne environ 5 jetons par champ, soit 50 jetons × 20 $ / million = **0,001 $ par appel** : négligeable.
  Le vrai gain reste celui du rapport 02 (juges qui répondent en une ligne par raison).
- **Effet** : égal ; plus sûr.

---

## 5. Les réponses en flux : le client voit la réponse arriver

- **Anthropic** : le flux est stable ; avec des outils, l'API attend qu'une valeur soit complète avant de l'envoyer ;
  l'option `eager_input_streaming` (stable) envoie les morceaux d'une grande valeur d'outil **dès qu'ils sont écrits**
  (« reduces the time to the first fragment of a large parameter ») ; pour la réflexion, `display: "omitted"` ne
  renvoie rien de la réflexion, donc la réponse commence plus tôt
  (https://platform.claude.com/docs/en/build-with-claude/streaming et `fine-grained-tool-streaming`, **officiel**).
- **Prix** : aucun changement ; le flux ne coûte ni ne rapporte.
- **Une limite propre à SINA** : la règle du propriétaire « rien n'est montré sans avoir été relu » interdit de montrer
  au client une réponse **avant** sa relecture. Le flux ne peut donc pas servir à afficher le brouillon de SINA.
  Ce qu'il permet sans toucher à la règle :
  1. **afficher tout de suite ce que SINA est en train de faire** (« je prépare ta planche », l'étape en cours), écrit
     par le Studio, pas par le modèle ;
  2. **commencer la relecture dès la dernière lettre** du brouillon, sans attendre la fin de l'échange ;
  3. pour la création du site (`site.create`, une grande valeur d'outil), **commencer à monter les premières sections
     pendant que la suite s'écrit**, avec `eager_input_streaming` (morceaux pas toujours complets : il faut les
     assembler avec soin).
- **Gain : 0 €** ; effet : **meilleur** (moins d'attente ressentie). À mesurer : le temps entre le message du client et
  la première chose affichée.

---

## 6. L'effort par message et les limites de réflexion

### 6.1 L'effort par message (en essai, Opus 5.5 compris)

- **Ce qu'il fait** : un message système vide portant `output_config.effort` change l'effort pour les tours suivants,
  sans toucher au réglage du haut de la demande, donc **sans casser le cache** (en-tête
  `mid-conversation-output-config-2026-07-01`) ; il vaut à partir du prochain message du client et reste jusqu'au
  prochain changement ; il ne faut jamais le déplacer ni le retirer ensuite
  (https://platform.claude.com/docs/en/build-with-claude/effort-per-message, **officiel**).
- **Mesure** : changer l'effort en haut de la demande coûte **20 à 40 fois** ce que coûte le même changement par message,
  sur une conversation de 100 000 jetons (page « optimizing », **mesure du fournisseur** ; déjà cité en partie dans le
  rapport 02).
- **Pour SINA** : l'« effort constant » est en cours (consignes). L'effort par message est ce qui permet de **garder un
  effort élevé aux moments forts** (rapport 02 : Opus « élevé » juge mieux) **sans** payer une réécriture. Sur un fil de
  35 000 jetons en mémoire d'une heure, un changement en haut coûterait 35 000 × (8 $ − 0,20 $) / million = **0,27 $**,
  contre presque rien par message. Gain direct : 0 € par rapport à l'effort constant ; c'est un **gain de qualité au même
  prix**. Une précaution officielle : après une compression, l'effort réglé par message est oublié et doit être redit.

### 6.2 Les limites de réflexion : ce qui existe en novembre 2026

- Sur Opus 5.5, la réflexion **ne se coupe pas** et l'ancien plafond (`budget_tokens`) renvoie une erreur 400 ; elle se
  règle par l'effort seulement (notes de version, **officiel**).
- **Le budget de tâche** (`task_budget`, **en essai**, Opus 5.5 compris) : un compte à rebours que seul le modèle voit,
  pour toute une boucle d'outils ; « a soft hint, not a hard cap » ; **minimum 20 000 jetons** ; si on le change à chaque
  demande, il casse le cache (https://platform.claude.com/docs/en/build-with-claude/task-budgets, **officiel**). La page
  ne publie **aucun gain mesuré**.
- **Le plafond de sortie (`max_tokens`)** : ne fait pas économiser, il fait repayer (rapport 02, 3.6).
- **Pour SINA : rien à gagner sans perte.** Les appels de SINA sont plus courts que 20 000 jetons (le budget de tâche
  ne s'y applique pas) ; sur la création du site, un budget ferait finir plus tôt, donc moins bien, contre la règle
  « bon du premier coup ». **Je ne le recommande pas.**

---

## 7. Remises de volume, engagements de dépense et crédits, au 22 novembre 2026

| Offre | Ce qu'elle donne | Conditions | Pour le Studio | Source |
|---|---|---|---|---|
| **Anthropic, remises de volume** | « negotiated on a case-by-case basis » | gros volumes, par l'équipe commerciale | pas avant un volume bien plus grand ; aucun chiffre publié | https://platform.claude.com/docs/en/about-claude/pricing, **officiel** |
| **Anthropic, crédits des abonnements Max, Ultra et Team** (nouveau en 2026) | **100 $ par mois** (Max), 200 $ (Ultra), jusqu'à 500 $ (Team, 20 $ par place standard, 100 $ par place premium) de crédits pour l'API | abonnement actif depuis 7 jours ; crédits perdus en fin de mois ; seulement l'API d'Anthropic en direct (pas Bedrock ni Google) ; non cessibles, « used by the holder of the Anthropic account » | **si le propriétaire a déjà un de ces abonnements**, relier l'organisation de l'API du Studio lui rend jusqu'à 100 à 500 $ par mois **sans rien payer de plus** ; ne pas souscrire pour les crédits (le crédit ne dépasse jamais le prix) | https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers et https://www.anthropic.com/legal/credit-terms, **officiel** |
| **Anthropic, programme pour jeunes entreprises** | 1 000 $ de crédits, un an de Team (5 places) ; jusqu'à 100 000 $ par un fonds d'investissement partenaire | **fermé** : « Our current cohort is now full, and we're not accepting new applications right now » | impossible aujourd'hui ; s'inscrire à la lettre d'information | https://claude.com/programs/startups, **officiel** ; TechCrunch, 6 octobre 2026, **presse** |
| **OpenAI, crédits des abonnements ChatGPT Pro et Business** (28 octobre 2026) | 100, 200 ou 500 $ par mois selon le Pro ; Business : 20 $ par place standard, 100 $ par place premium, plafonné à 500 $ ; **couvrent l'interface des images** | abonnement payé depuis 7 jours ; même adresse ; crédits perdus en fin de mois | même logique : **si le propriétaire a déjà un Pro ou un Business**, les images de SINA peuvent être payées par ces crédits | https://developers.openai.com/api/docs/guides/chatgpt-api-credits, **officiel** |
| **OpenAI, programme pour jeunes entreprises** | crédits non chiffrés | **seulement par un fonds d'investissement partenaire** | non applicable sans fonds | https://openai.com/startups/, **officiel** |
| **OpenAI, engagement annuel et « Scale Tier »** | remises non chiffrées sur le traitement normal ; unités achetées pour 30 jours au moins | « available to Enterprise customers » | non applicable | https://openai.com/api-scale-tier/, **officiel** |
| **OpenAI, fenêtres de 2 h et 8 h** (17 novembre 2026, **en essai**) | −30 % (2 h) et −40 % (8 h) | **modèles de texte GPT-6.x seulement**, pas les images | non applicable (le texte de SINA est chez Anthropic) | https://developers.openai.com/api/docs/guides/background, **officiel** |

**Ce que cela peut valoir** (calcul) : 100 $ de crédits par mois, c'est 90 €, soit le coût d'environ **5 projets complets**
à 17,50 €. C'est de loin la plus grosse somme de ce rapport, mais elle **dépend d'un abonnement que seul le propriétaire
peut dire avoir**, et elle n'est pas « par projet ». Je ne la compte pas dans le total.

---

## 8. OpenAI : les images

Ce qui est déjà dans le rapport 03 n'est pas repris (prix au jeton, aperçus, tailles natives, fond « opaque », différé
non confirmé pour la 2.6, prix réduit des images déjà lues fermé pour la 2.6, retouche ciblée, `n`).

### 8.1 Réutiliser un résultat déjà payé

- **Chez OpenAI** : la réutilisation officielle passe par l'interface « Responses » (garder l'image dans la
  conversation, ou son identifiant, puis la retoucher) ; **la 2.6 n'y est pas** (« Responses `v1/responses` Not
  supported », page du modèle, relue ce jour, **officiel**). L'interface « Image » accepte un identifiant de fichier déjà
  déposé (`file_id`) : on n'envoie plus les octets, mais on paie l'image jointe.
- **Ce qui reste, et c'est au Studio de le faire** : garder chaque image produite avec l'empreinte de sa demande, et la
  reprendre au lieu de repayer quand la même demande revient (une reprise après une coupure, une tâche relancée, une
  planche réaffichée). OpenAI dit aussi de ne **jamais relancer seul** une erreur `image_generation_user_error` sans changer
  la demande (guide des images, partie « Handling blocked requests », **officiel**) : c'est déjà la règle du propriétaire.
- **Gain** : 0,07 $ (prix réel d'une image de planche, rapport 03) par image non repayée ; le nombre de cas est **à
  compter** dans `ai_calls` (deux demandes identiques à moins d'une heure d'écart).

### 8.2 Éditer au lieu de régénérer

- Rien de nouveau depuis le rapport 03 (même prix, plus l'image de départ jointe ; intérêt : la réussite). La nouveauté
  du 4 novembre (retouche guidée par annotation, `markup`) est au même prix : « Markup-guided edits use the same token rates as other
  edits, with no extra fee » (**officiel**).

### 8.3 Plusieurs versions d'un coup (`n`)

- Toujours **non écrit** par OpenAI ; aucune mesure publiée trouvée (recherche faite le 22 novembre 2026 : guides de prix
  de tiers, forum d'OpenAI). Reste à lire `usage` d'une demande à `n: 2` lors d'un essai déjà accordé (rapport 03).

### 8.4 Nouveau : ce que coûte une image jointe, et comment la payer moins

- **Une mesure de juin 2026** sur `gpt-image-2` (forum d'OpenAI, « OpenAI *must* document the input image pricing of
  gpt-image-2 (so I did) », 7 et 12 juin 2026, **mesure**, faite par un développeur sur ses factures) : une image jointe
  est comptée par carrés de 32 points, **plafonnée à 1 536 jetons** ; une image plus petite est **agrandie** jusqu'à
  1 024 points de grand côté avant d'être comptée ; une image en longueur coûte moins : 512 × 512 → 1 024 jetons, mais
  1 024 × 512 → 512 jetons.
  Cela rejoint la seule mesure sur la 2.6 du rapport 03 (1 523 jetons, près du plafond).
- **Ce que cela veut dire pour SINA** (**à vérifier sur la 2.6** en relisant les `input_tokens_details` déjà enregistrés,
  gratuit) : (a) **réduire une image jointe sous 1 024 points ne fait rien gagner** (elle est agrandie) ; (b) **recadrer
  au plus près** ce qu'on joint fait gagner : un logo en longueur, découpé à sa forme (par exemple 1 024 × 400), coûterait
  environ 512 jetons au lieu de 1 024 à 1 536 en carré ou en portrait.
- **Gain (calcul)** : environ 500 à 1 000 jetons × 8 $ / million = **0,004 à 0,008 $ par image qui porte le logo** ;
  une dizaine sur une planche, **≈ 0,05 € par projet** ; 30 publications par mois, **≈ 0,15 à 0,20 € par mois**. Effet :
  égal (le dessinateur reçoit le même logo, sans marge vide).

### 8.5 Les nouveautés de novembre 2026 (annonce du 4 novembre, relevées dans le journal des changements d'OpenAI)

https://developers.openai.com/api/docs/changelog (**officiel**) : la 2.6 Sunburst et Flare apportent la
**complexité réglable** (« no separate fee », par défaut « high »), la **retouche guidée par annotation**, la **sortie en
SVG** et la **sortie en GIF animé**. Rien d'autre sur les images depuis (journal relu jusqu'au 19 novembre).
- **Complexité « low » pour une retouche simple** : même prix, moins d'attente, moins de changements non voulus
  (déjà dans le rapport 03, partie 3.3) ; **effet : plus rapide**.
- **SVG** : un logo rendu en dessin vectoriel, net à toute taille et sans fond à retirer. Coût, mot pour mot : « you pay
  the image model's rate for the reference image and the authoring model's rate for the tokens it uses to produce the
  SVG » ; aucun chiffre publié. **À essayer un jour sur un logo déjà gardé**, avec l'accord du propriétaire (prix
  inconnu : je ne le recommande pas avant un essai d'une seule image).
- **GIF** : les vidéos se traitent en dernier (consignes).

---

## 9. Ce que publient les autres équipes (en plus du rapport 02)

| Qui, quand | Ce qui est publié | Niveau | Ce que SINA en reprend |
|---|---|---|---|
| **Manus**, « Context Engineering for AI Agents: Lessons from Building Manus », Yichao Ji, 18 juillet 2025 (https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus) | le taux de lecture en mémoire est « the single most important metric for a production-stage AI agent » ; rapport entrée / sortie d'environ 100 pour 1 ; ne jamais ajouter ni retirer d'outils en cours de route ; compression qu'on peut défaire (garder l'adresse d'une page, pas la page) ; laisser les erreurs dans le fil ; varier un peu la forme pour ne pas tomber dans la répétition | **article d'éditeur** | les parties 1.5 et 3.4 ; et l'idée « ne pas se répéter » rejoint la règle de variété des sites et des publications |
| **Anthropic**, « Advanced tool use », 24 novembre 2025 (https://www.anthropic.com/engineering/advanced-tool-use) | recherche d'outils : −85 % de jetons de définitions ; appels écrits en code : −37 % de jetons ; exemples d'usage dans la définition d'un outil : justesse des réglages de 72 % à 90 % | **mesure du fournisseur** | partie 3 ; les **exemples dans la définition d'un outil** (un ou deux appels modèles) sont une idée gratuite pour réduire les appels mal formés, donc les reprises |
| **ProjectDiscovery**, cité par Ginger AI (18 juin 2026) | taux de lecture en mémoire passé de 7,4 % à 84 % après un changement d'ordre des éléments | **lu en résumé** (page source non ouverte) | confirme la partie 2.2 bis |
| **LangChain, Iron Mind** (2026) | −77 % et −88 % de coût d'entrée avec le cache bien placé | **lu en résumé**, pages d'éditeurs | rien de neuf par rapport au rapport 02 |

---

## 10. Pas vérifié

- **Tout ce qui dépend du code** (je n'ai pas lu le code, par consigne) : le raccourcissement après coup dans `serialize`
  (partie 1.2), la liste d'outils changée d'une étape à l'autre (1.5), l'espace de travail unique (2.2), la place du
  dernier point de cache (2.2 bis), les pages lues gardées entières (3.4), la taille des définitions d'outils (3.2), le
  recadrage des images jointes (8.4). Chaque gain de ces parties est conditionnel.
- **Le partage du cache entre clients** : écrit par Anthropic pour un même espace de travail ; son gain dépend du nombre de
  clients actifs dans la même heure, inconnu aujourd'hui.
- **Le comptage des images jointes de la 2.6** : la règle des carrés de 32 points est mesurée sur `gpt-image-2` par un
  développeur, pas publiée par OpenAI ; une seule mesure existe sur la 2.6.
- **`n` chez OpenAI**, **le prix d'un logo en SVG**, **le différé de la 2.6** : non publiés.
- **Les crédits d'abonnement** : les conditions d'Anthropic n'interdisent pas l'usage pour un service vendu à des
  clients, mais ne le disent pas non plus ; à confirmer auprès d'Anthropic et d'OpenAI avant de compter dessus.
- **Les chiffres de Manus, LangChain, Iron Mind, ProjectDiscovery** : articles d'éditeurs ou lus en résumé.
- **L'outil de mémoire « +39 % »** : lu en résumé chez des tiers seulement.

Aucun appel payant n'a été fait pour ce rapport. Aucun fichier du dépôt n'a été modifié en dehors de ce rapport.

---

## Gains restants, du plus gros au plus petit

Prix des consignes. « Si » veut dire que le gain n'existe que si le code fait aujourd'hui ce qui est décrit (à vérifier
par les rapports qui lisent le code, gratuitement).

| # | Correction | Euros par projet | Effet sur l'expérience |
|---|---|---|---|
| 1 | **Relier les crédits d'un abonnement déjà payé** (Claude Max, Ultra ou Team ; ChatGPT Pro ou Business) à l'organisation de l'API du Studio | **pas par projet : 90 à 450 € par mois**, soit 5 à 25 projets ; seulement si l'abonnement existe déjà | égale |
| 2 | **Garder la même liste d'outils de bout en bout** ; un outil de plus s'ajoute par message système (`inline-tools-2026-09-15`) | **jusqu'à 1,23 €** (si la liste change à chaque étape) ; évite aussi des erreurs 400 sur Opus 5.5 | égale, plus rapide |
| 3 | **Partie commune en tête, identique à l'octet, un seul espace de travail** : la consigne et les outils de SINA lus en mémoire d'un client à l'autre | **0 à 0,70 €** (selon le nombre de clients actifs dans la même heure) | meilleure : première réponse plus rapide |
| 4 | **Différé et cache ensemble** (une demande d'amorce en mémoire d'une heure, puis le reste du lot) pour les publications du mois | **≈ 0,48 € par client et par mois** (si 30 demandes séparées sur le même dossier) | égale |
| 5 | **Pages lues sur Internet plafonnées** (`max_content_tokens`), seules les citations et l'adresse gardées dans le fil | **≈ 0,40 €** (si les pages entières sont gardées aujourd'hui) | égale |
| 6 | **L'état du projet après le dernier point de cache** (payé 4 $ au lieu de 8 $ le million) | **≈ 0,15 €** (si le point est posé sur le tout dernier bloc) | égale |
| 7 | **Logo joint recadré à sa forme**, jamais réduit sous 1 024 points | **≈ 0,05 €** par planche ; **≈ 0,15 à 0,20 € par mois** de publications (à vérifier sur la 2.6) | égale |
| 8 | **L'état du projet en message système d'un seul tour** (`clear_at`), qui ne s'empile pas dans le fil | **≈ 0,04 €** (en plus de l'étape 2 du rapport 02, qu'il ne double pas) | égale, plus rapide |
| 9 | **Recherche d'outils à la demande**, seulement si les définitions dépassent 10 000 jetons | **≈ 0,04 €** | égale ; meilleure si plus de 30 outils |
| 10 | **Sortie structurée stricte** partout où un schéma est attendu : plus de reprise pour schéma refusé | **à compter** dans `ai_calls` (0,02 à 0,05 $ par reprise de juge évitée) | égale, plus sûre |
| 11 | **Une image déjà payée n'est jamais repayée** : empreinte de chaque demande, reprise du résultat gardé | **à compter** (≈ 0,07 $ par image non repayée) | meilleure : plus rapide après une coupure |
| 12 | **Les réponses en flux** pour tout ce qui n'a pas à être relu (ce que SINA est en train de faire), relecture lancée dès la fin du brouillon, montage du site dès les premiers morceaux | 0 € | **meilleure** : moins d'attente ressentie |
| 13 | **L'effort par message** pour garder l'effort élevé aux moments forts sans casser le cache | 0 € (évite 0,27 $ par changement fait en haut) | **meilleure** au même prix |
| 14 | **L'outil de diagnostic du cache** sur chaque demande | 0 € (garantit les lignes 2, 3, 6, 8) | égale |
| 15 | **Compression à la demande, en arrière-plan**, pour les fils d'après livraison | non chiffrable aujourd'hui | égale ou meilleure |
| — | Écartés : mise à l'écart automatique des résultats (casse le cache, +73 % mesuré sur un fil court), budget de tâche (minimum 20 000 jetons, finit plus tôt), plafond de sortie plus bas, outil de mémoire, appels d'outils en code dans la conversation (+8 %), fils gardés chez Anthropic (aucun gain d'argent), fenêtres de 2 h et 8 h d'OpenAI (texte seulement) | — | — |

**Total de mon périmètre** (lignes 2 à 9, toutes conditionnelles) : **de 0,2 € à environ 2,6 € par projet** selon ce que le
code fait déjà, **plus environ 0,65 € par client et par mois** sur les publications (lignes 4 et 7), **plus 90 à 450 € par
mois** de crédits si le propriétaire a déjà l'un des abonnements cités (ligne 1, hors total par projet). La qualité ne
baisse nulle part ; la vitesse est égale ou meilleure partout.
