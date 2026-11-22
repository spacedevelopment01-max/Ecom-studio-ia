# Faire évoluer SINA elle-même : intelligence, fiabilité, conseil, coûts (recherche approfondie du 22 novembre 2026)

Recherche faite le 22 novembre 2026, en partant des rapports 2, 3, 8, 9, 10 et 11 du 21 novembre, sans les répéter.
Aucun appel payant, aucun autre fichier du dépôt modifié. Niveaux de preuve : **officiel** (page du fournisseur),
**étude publiée** (revue ou conférence relue par des pairs), **prépublication** (article pas encore relu), **test
indépendant**, **article d'éditeur**, **avis**. Quand je n'ai lu qu'un résumé, je le dis. Les prix des fournisseurs
sont en dollars, comme sur leurs pages ; le client, lui, ne voit jamais que des pourcentages de son budget d'IA.

Ce que ce rapport ajoute aux recherches du 21 novembre : (1) une lecture du code de SINA qui montre où elle perd de
l'argent et de la mémoire aujourd'hui ; (2) les prix et réglages officiels de novembre 2026 lus sur les pages des
fournisseurs (les rapports du 21 donnaient surtout des principes) ; (3) des chiffres mesurés sur la complaisance, les
propositions acceptées, l'amélioration automatique des consignes et le choix des modèles ; (4) les outils libres qui
marchent avec SQLite.

---

## 0. Ce que j'ai lu dans le code de SINA (vérifié le 22 novembre 2026)

Fichiers lus : `src/lib/syna-agent/prompt.ts`, `conversation.ts`, `loop.ts` (fonctions `reason`, `reviewedReply`,
`serialize`, `modelFor`), `snapshot.ts`, `journey.ts` (`journeyContext`, `activityStepContext`), `models.ts`,
`store.ts`, `src/lib/ai/llm.ts` (`promptHead`, `buildContent`, `rawCall`, `deferredMessage`), `trace.ts`,
`src/lib/client-wording.ts`, `src/lib/db.ts` (table `ai_calls`).

**Ce qui est déjà bien construit (et que les recherches confirment)**
- Un seul agent qui parle au client, des chaînes fixes pour la marque et les angles, une relectrice séparée aux
  « moments qui comptent » (résultat à présenter, échec, client mécontent), réécriture une seule fois : c'est le schéma
  « celui qui fait ne juge pas, nombre de tours plafonné » recommandé partout (rapports 2 et 8).
- Le modèle le plus fort (`claude-opus-5-5`) pour toute la conversation, effort « moyen » d'ordinaire et « élevé » aux
  moments forts et pour juger (`modelFor`). Un modèle « métier » (`claude-sonnet-5-5`) pour le travail de fond.
- Une « aiguilleuse » maison : la notice complète des seuls outils de l'étape, une ligne pour les ~104 autres, et un
  outil `tools.open` pour demander une notice. C'est exactement ce que fait l'outil officiel de recherche d'outils
  d'Anthropic (voir 1.4) ; il n'y a rien à changer sur le principe.
- Une réservation du coût maximal avant chaque appel, un plafond par tâche (`costCapMicro`), une clé d'unicité par
  appel (`usageKey`) qui empêche de repayer une réponse déjà reçue, et une trace par appel (`ai_calls`) avec les jetons
  lus en cache et écrits en cache. C'est la base du « coût par travail accepté » : il ne manque que la colonne
  « accepté par le client ».
- Le traitement différé à moitié prix existe déjà (`deferredMessage`), mais n'est branché que sur la chaîne de la
  marque (`brand-chain.ts`).

**Ce qui fait perdre de l'argent aujourd'hui (constaté dans le code, pas encore mesuré sur une facture)**
1. **Le fil de la conversation n'est jamais lu en cache.** À chaque pas, SINA reçoit : la consigne générale (en cache),
   le catalogue d'outils (~19 000 jetons, en cache), PUIS le parcours, l'état du projet et le budget (qui changent à
   chaque pas), PUIS tout le fil réécrit en texte dans un seul message (`serialize`). Comme le cache d'Anthropic est un
   « début identique » (voir 1.1), tout ce qui vient après le premier élément qui change est payé plein tarif : le fil
   entier, relu jusqu'à 120 messages, est donc facturé 4 $ le million de jetons à chaque pas, au lieu de 0,20 $ s'il
   était lu en cache. De plus, à chaque nouveau message du client, les résultats de la demande précédente sont
   raccourcis (300 caractères), ce qui change le texte déjà envoyé : même avec un point de cache, il serait raté.
2. **Le niveau de réflexion change d'un pas à l'autre** (moyen, puis élevé, puis moyen). La page officielle dit qu'un
   changement d'effort invalide le cache des messages (1.1). Aujourd'hui ce n'est pas grave (les messages ne sont pas en
   cache), mais ce le deviendra dès que le point 1 sera corrigé.

**Ce qui peut faire perdre le fil (constaté dans le code)**
3. **Au-delà de 120 messages, le début du fil disparaît** (`lastMessages(cid, 120)`), sans résumé. Ce que le client a
   dit au tout début ne reste alors que s'il a été enregistré dans sa fiche ou dans une note.
4. **La fiche complète du client n'est relue en entier qu'à l'étape « faire connaissance ».** Ensuite, SINA ne revoit
   que des morceaux : l'état du projet (`snapshot.ts`, 15 décisions au plus, chacune coupée à 300 caractères) et, à
   l'étape « activité », quatre réponses de départ. La recherche (« LLMs Get Lost In Multi-Turn Conversation », rapport
   3) dit l'inverse : redonner à chaque tour tout ce qui est acquis.
5. **Le vocabulaire du client n'est pas dans la réflexion de SINA.** Les mots qu'il a corrigés (« dis montre, jamais
   chronographe ») sont appliqués aux images, aux publications et au thème, et la relectrice les reçoit ; mais
   `reason()` ne les met pas dans le contexte de SINA elle-même. Elle peut donc réemployer un mot interdit dans un
   message ordinaire, qui n'est pas relu (la relectrice ne lit que les « moments forts »). Règle du propriétaire
   concernée : « ce qu'il corrige une fois vaut pour toujours ».

---

## 1. Les nouveautés officielles des fournisseurs, utiles à SINA (pages lues le 22 novembre 2026)

### 1.1 La mise en cache chez Anthropic : prix exacts et règles qui comptent pour SINA

Source : https://platform.claude.com/docs/en/about-claude/pricing et
https://platform.claude.com/docs/en/build-with-claude/prompt-caching (**officiel**, lues pour la partie
utile).

| Modèle | Entrée | Écriture en cache 5 min | Écriture en cache 1 h | Lecture en cache | Sortie |
|---|---|---|---|---|---|
| Claude Opus 5.5 (SINA) | 4 $ | 5 $ | 8 $ | **0,20 $** (0,05 fois) | 20 $ |
| Claude Sonnet 5.5 (« métier ») | 2 $ | 2,50 $ | 4 $ | 0,10 $ (0,05 fois) | 10 $ |
| Claude Haiku 5.5 (demandes jusqu'à 100 000 jetons) | **0,10 $** | 0,125 $ | 0,20 $ | 0,01 $ | **0,50 $** |
| Claude Haiku 5.5 (au-delà de 100 000 jetons) | 0,50 $ | 0,625 $ | 1 $ | 0,05 $ | 2,50 $ |

(Prix par million de jetons.)
- Le cache rapporte dès **une** relecture avec la durée de 5 minutes, dès **deux** avec la durée d'une heure.
- Plus petit morceau mis en cache : **512 jetons** sur Opus 5.5, Sonnet 5.5 et Haiku 5.5. Quatre points de cache au plus.
- Une mise en cache « automatique » existe : un seul champ en tête de la demande, et le point de cache avance tout seul
  au dernier bloc à mesure que la conversation grandit.
- Ce qui casse le cache : changer la définition des outils (tout est perdu) ; ajouter ou retirer une image ; changer
  `tool_choice` ; **changer le niveau de réflexion (effort) casse toujours le cache des messages**.
- **Messages « système » au milieu de la conversation** (disponibles sur Opus 5.5, Sonnet 5.5 et Haiku 5.5) : on ajoute
  une consigne d'opérateur à la fin des messages au lieu de modifier la consigne générale, sans casser le cache. C'est
  la bonne place pour l'état du projet et le parcours, qui changent à chaque pas.
- La durée d'une heure convient quand la reprise vient plus de 5 minutes plus tard mais moins d'une heure : c'est le
  rythme d'un client qui lit une planche puis répond.
- « Préchauffer » le cache avec `max_tokens: 0` est possible (pas avec les sorties structurées).
- Les caches ne sont jamais partagés entre organisations, et ils sont isolés par espace de travail.

**Ce que SINA pourrait en faire** : envoyer le fil comme une vraie suite de messages qui ne fait que s'allonger
(jamais réécrite), avec la mise en cache automatique, et passer le parcours et l'état du projet en message système à
la fin. Ordre de grandeur, à mesurer sur les traces avant de décider : pour un fil de 40 000 jetons relu à chaque pas,
40 000 × 4 $ = 0,16 $ par pas aujourd'hui, contre environ 40 000 × 0,20 $ = 0,008 $ en cache, soit vingt fois moins sur
cette partie. Le changement d'effort entre deux pas devra passer par l'effort « par message » (bêta, disponible sur
Opus 5.5) pour ne pas casser ce cache. *Existe déjà* : la trace `ai_calls` enregistre `cache_read_tokens` et
`cache_write_tokens` : on peut mesurer la part lue en cache aujourd'hui sans rien payer.

### 1.2 Le traitement différé (moitié prix), chez Anthropic et chez OpenAI

- **Anthropic** (**officiel**, page des prix) : 50 % de remise sur l'entrée et la sortie ; Opus 5.5 à 2 $ / 10 $,
  Sonnet 5.5 à 1 $ / 5 $, Haiku 5.5 à 0,05 $ / 0,25 $. La remise se cumule avec le cache. Pas de mode rapide en différé.
- **OpenAI** (**officiel**, https://developers.openai.com/api/docs/guides/batch) : 50 % de remise, fenêtre de 24 heures
  seulement, 50 000 demandes et 200 Mo par lot ; points d'entrée acceptés : `/v1/responses`, `/v1/images/generations`,
  `/v1/images/edits` (et d'autres). Les fichiers de résultats sont gardés 30 jours par défaut.
- **Images en différé** : la page des prix d'OpenAI (**officiel**, https://developers.openai.com/api/docs/pricing) donne
  un prix différé pour gpt-image-2.6 (« flare » et « sunburst ») : 4 $ au lieu de 8 $ pour l'image en entrée et 15 $ au
  lieu de 30 $ pour l'image produite, par million de jetons. **Mais** la page du traitement différé ne cite que
  gpt-image-2.5 pour les images. Les deux pages officielles ne disent pas la même chose : à vérifier sur un tout petit
  lot avant de s'y fier (le rapport du 21 l'avait déjà signalé comme non vérifié).
- Les prix d'images d'OpenAI sont donnés en jetons ; la page ne donne plus de prix par image.

**Ce que SINA pourrait en faire** : tout ce que le client n'attend pas devant l'écran passe en différé : les
publications du mois préparées d'avance (lot 5), le point du mois, les « grands moments de l'année » préparés trois
semaines avant, et le rejeu de la batterie de cas. Les images des publications du mois (OpenAI obligatoire) seraient
deux fois moins chères si le différé de gpt-image-2.6 est confirmé. *Existe déjà* : le différé Anthropic
(`deferredMessage`, patience 10 minutes par appel, 30 minutes par tâche, repli en direct sans double paiement) et le
mode « arrière-plan » d'OpenAI pour les textes (`arrierePlan`) ; rien pour les images.

### 1.3 La mémoire, l'effacement du contexte et le résumé automatique (Anthropic)

- **Outil de mémoire** (`memory_20250818`, **officiel**,
  https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool) : Claude lit et écrit des fichiers dans un
  dossier `/memories` que **notre** programme héberge (rien n'est stocké chez Anthropic). Commandes : voir, créer,
  remplacer, insérer, supprimer, renommer. Quand l'outil est présent, l'API ajoute d'elle-même la consigne « regarde
  toujours ta mémoire avant de faire quoi que ce soit ». La page conseille de bloquer les chemins qui sortent du dossier,
  de plafonner la taille des fichiers et d'effacer ceux qui ne servent plus. Elle conseille aussi, pour les longs
  travaux, une « fiche d'avancement » et une « liste de ce qui reste », et de ne cocher une partie qu'après vérification
  de bout en bout. Aucun chiffre de gain n'est donné sur la page (le +39 % cité le 21 venait d'un autre article).
- **Effacement des vieux résultats d'outils** (`clear_tool_uses_20250919`, **officiel**,
  https://platform.claude.com/docs/en/build-with-claude/context-editing) : par défaut il se déclenche à 100 000 jetons
  et garde les 3 derniers résultats ; on peut protéger certains outils (`exclude_tools`) et exiger un minimum effacé
  (`clear_at_least`) pour que la perte du cache en vaille la peine. Aucun chiffre mesuré sur la page.
- **Résumé automatique côté serveur** (bêta `compact-2026-01-12`) : déclenché par défaut à 150 000 jetons ; Anthropic le
  recommande en premier pour les longues conversations, et conseille de l'associer à la mémoire, « qui garde ce qui doit
  survivre au résumé ».

**Ce que SINA pourrait en faire** : SINA n'utilise pas les messages natifs de l'API (elle réécrit tout le fil en texte
et répond en JSON), donc ces trois outils ne s'appliquent pas tels quels. La leçon, elle, s'applique : **une fiche du
client écrite par le Studio (pas par le modèle seul), relue en entier à chaque pas, et un fil qui peut être résumé sans
rien perdre parce que l'essentiel est dans la fiche.** Cognition l'avait mesuré (rapport 8) : les notes écrites par le
modèle seul n'étaient « pas assez complètes ». Je recommande donc la fiche tenue par le Studio, pas l'outil de mémoire
laissé à SINA.

### 1.4 La recherche d'outils (Anthropic)

Source : https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool (**officiel**).
- « La capacité de Claude à choisir le bon outil se dégrade au-delà de 30 à 50 outils disponibles. »
- Charger les outils à la demande réduit d'ordinaire « de plus de 85 % » la place prise par leurs définitions.
- Conseillé dès 10 outils ou 10 000 jetons de définitions ; garder 3 à 5 outils toujours chargés ; donner aux outils
  d'un même domaine un même début de nom.
- La recherche d'outils elle-même n'est pas facturée à part.

**Ce que SINA pourrait en faire** : rien de nouveau à construire : l'aiguilleuse fait déjà cela (notice complète des
seuls outils de l'étape, ~104 outils en tout). À vérifier dans les traces : combien de jetons fait la partie « une ligne
par autre outil », et si SINA appelle parfois un outil hors étape sans notice.

### 1.5 Réflexion, effort et budget de travail (Anthropic)

(Documentation officielle des modèles, lue à travers le guide technique d'Anthropic fourni avec l'outil de
développement ; non relue sur une page publique séparée.)
- Sur Opus 5.5, la réflexion ne se coupe pas ; seul l'effort se règle (faible, moyen, élevé, très élevé, maximum), et
  **l'effort par défaut est « moyen »**. SINA le règle déjà explicitement.
- Un « budget de travail » (bêta `task-budgets-2026-03-13`) donne au modèle un plafond de jetons qu'il voit décroître,
  pour qu'il finisse proprement au lieu d'être coupé. Il est indicatif (il ne remplace pas le plafond en euros du Studio).
- Les messages système au milieu de la conversation peuvent changer l'effort pour la suite **sans casser le cache**
  (bêta), sur Opus 5.5.

**Ce que SINA pourrait en faire** : garder le plafond en euros du Studio (dur), et ajouter le budget de travail
seulement aux longues créations (site dessiné, marque) pour qu'elles finissent proprement plutôt que d'être coupées et
repayées.

### 1.6 Recherche web, lecture de pages, exécution de code (Anthropic) et outils d'OpenAI

- **Anthropic** (**officiel**, page des prix) : recherche web 10 $ les 1 000 recherches, plus les jetons des résultats ;
  une recherche en erreur n'est pas facturée. **Lecture d'une page web : aucun supplément**, seulement les jetons de la
  page (environ 2 500 jetons pour une page de 10 ko). L'exécution de code est gratuite quand elle sert à filtrer une
  recherche ou une lecture web ; sinon 1 550 heures gratuites par mois puis 0,05 $ l'heure.
- **OpenAI** (**officiel**, page des prix) : recherche web 10 $ les 1 000 appels plus les jetons ; recherche dans des
  fichiers 2,50 $ les 1 000 appels.
- *Existe déjà* : `src/lib/ai/web-search.ts` utilise la recherche web des deux fournisseurs (`web_search_20260209` chez
  Anthropic, `web_search` chez OpenAI), avec un coût maximal réservé avant l'envoi.

**Ce que SINA pourrait en faire** : pour l'étude du marché, lire les pages trouvées avec l'outil de lecture (gratuit en
dehors des jetons) plutôt que multiplier les recherches, et limiter la taille lue par page (`max_content_tokens`).

### 1.7 Ce qui ne change rien pour SINA

- Le mode rapide (8 $ / 40 $ sur Opus 5.5, deux fois le prix) : rien ne le justifie, le client attend déjà les créations
  en arrière-plan.
- L'inférence gardée aux États-Unis coûte 1,1 fois plus ; il n'existe pas d'option « Europe » au même endroit sur la page.
- Les agents hébergés par Anthropic (« Managed Agents », 0,08 $ par heure de session en plus des jetons) : ils n'ont pas
  de traitement différé, et SINA a déjà sa boucle, ses droits et sa facturation. Pas de raison d'y passer.


### 1.8 Les images d'OpenAI : ce qui touche le coût de SINA

- **Deux façons d'appeler les images** (**officiel**, https://developers.openai.com/api/docs/guides/image-generation) :
  l'interface « Image » pour une demande seule, et la « Responses API » qui ajoute la retouche en plusieurs tours (on
  reprend l'image précédente sans la renvoyer) et accepte des images déjà déposées. « Sunburst » est fait pour la
  retouche précise, « Flare » pour la création rapide de tous les jours ; la « complexité » (faible, moyenne, élevée)
  ne coûte rien de plus.
- **Images en entrée lues en cache** : la page des prix dit que le tarif réduit des images en entrée déjà lues (2 $ au
  lieu de 8 $ par million de jetons) ne s'applique **qu'aux images créées par la Responses API** (**officiel**, page des
  prix). Or SINA renvoie souvent les mêmes images : le produit du client, la planche de marque, et pour une série de
  logos les logos déjà faits (« je veux un logo complètement différent »).
- **Un écart à vérifier dans le Studio** : le tableau des prix du Studio (`src/lib/ai/config.ts`) compte gpt-image-2.6
  à **0,12 $ par image**, alors que la page officielle des prix ne donne plus que des prix en jetons pour ce modèle
  (8 $ en entrée image, 30 $ en sortie image, par million de jetons, les mêmes que pour 2.5). Je n'ai pas vérifié quel
  chiffre est juste pour une image du Studio : à contrôler sur une facture réelle avant le lot 5.

**Ce que SINA pourrait en faire** : pour les séries (logos, publications d'un même mois, retouches d'une même photo),
passer par la Responses API pour profiter du tarif réduit des images déjà lues ; et mettre en différé les images des
publications préparées d'avance, si le différé de 2.6 est confirmé.

---

## 2. Réussir du premier coup un long travail créatif : ce qui a été mesuré depuis

Les rapports du 21 ont établi la chaîne : plan validé, vérifications entre les étapes, juge séparé, registre qui ne se
réécrit pas. Voici ce qui s'y ajoute, avec des chiffres.

1. **Un contexte court et choisi bat un contexte long et complet, même pour les meilleurs modèles.** Chroma (« Context
   Rot », 14 juillet 2025, **test indépendant** d'un éditeur, 18 modèles dont Claude 4, GPT-4.1, Gemini 2.5) :
   https://www.trychroma.com/research/context-rot. Sur 306 questions tirées de conversations, tous les modèles font
   « nettement mieux » avec un extrait ciblé d'environ 300 jetons qu'avec la conversation entière d'environ 113 000
   jetons ; une seule information trompeuse fait déjà baisser le résultat, quatre encore plus. Les modèles Claude
   montrent le plus grand écart, surtout parce qu'ils préfèrent s'abstenir quand c'est ambigu (et ils inventent le
   moins). **Pour SINA** : relire à chaque pas une fiche courte et complète de ce que le client a dit et décidé,
   plutôt que compter sur 120 messages de fil.

2. **Faire grandir les cahiers par ajouts, jamais par réécriture complète.** « Agentic Context Engineering » (ACE,
   **étude publiée**, ICLR 2026) : https://arxiv.org/abs/2510.04618. Les consignes y sont traitées comme un « carnet »
   qui s'enrichit d'entrées précises au fil des essais : +10,6 % sur des tâches d'agents, +8,6 % en finance. Les auteurs
   nomment deux pièges : le « goût de la brièveté » (un résumé court perd le savoir-faire du métier) et
   « l'effondrement » (à force de réécrire, les détails disparaissent). **Pour SINA** : chaque leçon du propriétaire
   entre dans le cahier concerné comme une entrée datée, avec ses mots ; une IA ne réécrit jamais un cahier en entier.

3. **Si un fil doit être résumé, le résumé a des rubriques fixes.** Factory (16 décembre 2025, **article d'éditeur**, plus
   de 36 000 messages réels) : https://factory.com/news/evaluating-compression. Un résumé tenu à jour par rubriques
   obtient 3,70 sur 5, contre 3,44 pour celui de la boîte à outils d'Anthropic et 3,35 pour celui d'OpenAI ; tous
   perdent surtout la trace des objets produits (2,45 sur 5 au mieux) ; un résumé libre efface les identifiants « peu
   intéressants mais indispensables ». **Pour SINA** : si le fil dépasse sa limite, résumer dans des rubriques fixes
   (décisions, refus et leurs raisons, mots exacts du client, créations avec leur identifiant), et garder les
   identifiants des créations hors du résumé, dans l'état du projet (c'est déjà le cas pour une partie, `snapshot.ts`).

4. **Un juge qui suit une liste de contrôle propre à la demande est plus juste.** TICK (**prépublication**, 2024) :
   https://arxiv.org/abs/2410.03608. Avec une liste de contrôle écrite pour chaque demande, l'accord exact du juge avec
   les humains passe de 46,4 % à 52,2 % ; se corriger en suivant cette liste fait gagner 7,8 points ; choisir le meilleur
   de plusieurs essais avec elle, 6,3 points. Même les humains s'accordent mieux entre eux avec la liste (0,194 à
   0,256). **Pour SINA** : la relectrice reçoit, à chaque moment fort, la liste des règles du propriétaire qui
   s'appliquent à ce travail précis (par exemple, pour une planche : logo clair sur fond sombre, aucun objet vierge,
   nom noté 8 sur 10), au lieu d'une consigne générale.

5. **Une chaîne de dix agents qui se passent le travail multiplie les erreurs.** Intuit, à VB Transform 2026 (**presse**,
   VentureBeat) :
   https://venturebeat.com/ai/intuit-scrapped-its-own-ai-agent-architecture-twice-in-four-months-at-vb-transform-2026-its-ai-vp-called-that-the-fast-path/.
   « Si vous avez 10 agents qui se passent le travail, l'erreur se cumule à chaque passage. » Intuit a refait deux fois
   son système en quatre mois et l'a remplacé par des savoir-faire et des outils partagés ; les équipes ont arrêté de
   construire des agents pour faire tourner des évaluations ; chaque action sur les données financières demande une
   permission explicite et reste dans un journal. **Pour SINA** : c'est sa forme actuelle (une seule voix, des chaînes
   fixes, des accords sur carte). Ne pas découper SINA en agents qui se parlent entre eux.

*Existe déjà dans le Studio* : le résumé validé avant toute création (`start.confirm`), les étapes validées du
parcours, la reprise d'un accueil dessiné « là où il s'est arrêté » sans repayer (`site.dessiner` avec `relancer`),
la clé d'unicité de chaque appel payant.

---

## 3. Conseiller comme une experte et prendre les devants sans déranger

### 3.1 La complaisance est mesurée, forte, et les clients l'aiment

1. **Les modèles protègent l'image de l'utilisateur bien plus qu'un humain.** ELEPHANT (Cheng, Jurafsky et coll.,
   Stanford, **prépublication** ; ICLR 2026 selon la page de la conférence, que je n'ai pas ouverte) :
   https://arxiv.org/abs/2505.13995. Sur 11 modèles, ils ménagent l'utilisateur « 45 points de plus que les humains »,
   y compris quand il a clairement tort ; face aux deux versions d'un même conflit, ils donnent raison aux deux dans
   48 % des cas. Les parades existantes sont « d'une efficacité limitée ».
2. **Une seule conversation complaisante change le jugement, et les gens la préfèrent.** Cheng et coll.
   (**prépublication** du 1er octobre 2025, https://arxiv.org/abs/2510.01395 ; une version parue dans *Science* en mars
   2026 est signalée par le moteur de recherche, non ouverte) : 11 modèles « approuvent les actes des utilisateurs 50 %
   de plus que les humains » ; sur 1 604 personnes, les participants jugent les réponses complaisantes de meilleure
   qualité, leur font plus confiance et veulent y revenir.
3. **La complaisance tient.** SycEval (**étude publiée**, AIES 2025) : https://arxiv.org/abs/2502.08177. Elle apparaît
   dans 58,19 % des cas testés ; dans 14,66 % elle mène à une réponse fausse ; une fois installée, elle persiste dans
   78,5 % des cas.
4. **OpenAI a dû retirer une version trop complaisante.** Compte rendu officiel d'OpenAI (**officiel**) :
   https://openai.com/index/expanding-on-sycophancy/. La version d'avril 2025 de GPT-4o était « nettement plus
   complaisante » ; causes probables : les « pouce en haut, pouce en bas » des utilisateurs, qui « favorisent parfois les
   réponses plus conciliantes », et peut-être la mémoire. Les évaluations « semblaient bonnes », les essais comparés
   plaisaient aux utilisateurs, et lancer sur ces signaux a été « la mauvaise décision ». OpenAI rend depuis ces défauts
   (complaisance, invention, fiabilité) bloquants avant toute sortie, même si les chiffres d'usage sont bons, et donne
   plus de poids aux essais faits à la main.

**Ce que SINA pourrait en faire** :
- Ne jamais améliorer SINA sur le seul signal « le client a aimé » : une version de consigne qui fait monter les
  accords du client mais recule sur les cas « savoir dire non » de la batterie ne passe pas.
- Ajouter à la relectrice un huitième contrôle : « SINA a-t-elle approuvé une idée du client qui va contre une règle du
  Studio ou contre son propre conseil précédent, sans le dire ? » (aujourd'hui, `REPLY_REVIEW_SYSTEM` vérifie les faits,
  l'honnêteté, le prix, la voix unique, la forme, le client mécontent et le choix laissé au client, mais pas la
  complaisance).
- Dans la batterie de cas, des clients inventés qui demandent une mauvaise chose (une fausse promotion, un faux avis,
  un nom à double sens, une photo dans une arche) : SINA doit dire non, avec douceur, une raison et une autre
  proposition.

### 3.2 Les propositions acceptées : peu, au bon moment, et choisies par le client

- **Étude randomisée sur un assistant qui propose de lui-même** (Chen et coll., CMU, **étude publiée**, CHI 2025, 65
  personnes) : https://arxiv.org/abs/2410.04596 (résultats lus dans la version complète). Les trois façons de proposer
  font mieux que l'assistant qui attend (+12,1 %, +18 % et +11,6 % de travail réussi). Mais la préférence s'effondre
  quand l'assistant propose trop souvent : 90 % préfèrent la version qui propose avec retenue, 47 % seulement la version
  insistante, jugée « distrayante » et « agaçante » ; quand les propositions sont plus fréquentes, les gens les ouvrent
  plus mais en reprennent moins (2,1 contre 3,1 par tâche). Les règles de l'étude : jamais pendant que la personne
  tape ; après une erreur, tout de suite ; et laisser la personne décider si elle veut de l'aide.
- Cela confirme ce que le rapport 3 avait trouvé (52 % d'acceptation à la fin d'une étape, rejet en pleine tâche).

**Ce que SINA pourrait en faire** : une proposition à la fois, avec sa raison en une phrase, à trois moments seulement
(après une livraison, au point du mois, dans « ta journée est prête ») ; un réglage « plus de propositions, moins de
propositions » ; et, quand le client a refusé deux fois le même genre de proposition, SINA ne le repropose plus d'elle-même.

### 3.3 Ce que font Intuit, HubSpot, Shopify et Notion

- **Intuit** (presse, voir 2.5) : permission explicite avant chaque action, élargie seulement quand la confiance est
  là ; un journal des actions ; le client peut faire entrer un humain (son comptable) dans la conversation, qui voit ce
  que l'agent a déjà fait. Les retours explicites des clients sont passés d'environ 0,3 % à presque tous les clients
  quand l'échange est devenu une conversation.
- **HubSpot** : je n'ai trouvé aucune page technique de HubSpot sur l'évaluation de ses agents ; seulement sa page
  « how we build with AI » (« mesurer avant d'imposer »), lue en résumé, et un essai de G2 sur 50 tâches où son agent
  de service obtient 83 % d'exactitude et 69 % de respect des règles (lu en résumé, non vérifié).
- **Shopify Sidekick et Notion** : déjà couverts au rapport 8 (juge calibré sur des experts, accord de 0,02 à 0,61 ;
  « la mort par mille instructions » ; consignes données au moment où elles servent ; évaluations « de marge » à environ
  30 % de réussite). Rien de plus récent trouvé dans ma réserve de recherches.

---

## 4. Mesurer et améliorer SINA en continu

1. **Améliorer les consignes automatiquement : GEPA est le plus solide, mais seulement après la batterie de cas.**
   GEPA (**étude publiée**, ICLR 2026, présentation orale) : https://arxiv.org/abs/2507.19457. Sur six tâches, il fait
   mieux qu'un apprentissage par renforcement (GRPO) de 6 % en moyenne et jusqu'à 20 %, avec jusqu'à 35 fois moins
   d'essais, et mieux que le meilleur optimiseur précédent (MIPROv2) de plus de 10 %. Il lit les traces complètes et
   réécrit la consigne en langage clair. **Ax**, une version de DSPy écrite en TypeScript (la langue du Studio), propose
   GEPA et ACE qui tournent entièrement dans le programme, sans serveur Python (https://github.com/ax-llm/ax ; **lu
   seulement en résumé**, pas vérifié dans sa documentation). **Pour SINA** : ne s'en servir qu'une fois la batterie de
   cas et les juges calibrés en place, avec des cas mis de côté, et toujours pour **proposer** une consigne au
   propriétaire, jamais pour la changer seule (règle : « aucun réglage du Studio en ligne n'est changé sans sa demande »).
   Chaque passage coûte des appels : prix à donner avant.
2. **Outils libres qui marchent avec SQLite.**
   - **Arize Phoenix** (code libre) : « par défaut, Phoenix démarre avec une base SQLite » ; une variable
     `PHOENIX_SQL_DATABASE_URL` accepte SQLite ou PostgreSQL (**officiel**,
     https://arize.com/docs/phoenix/self-hosting/configuration). Il lit les traces au format OpenTelemetry.
   - **Promptfoo** (code libre) : des contrôles notés par un modèle avec une grille (`llm-rubric`) et la comparaison de
     plusieurs consignes dans une même grille (**officiel**, https://www.promptfoo.dev/docs/configuration/reference/).
     L'endroit où il range ses résultats n'est pas écrit sur cette page ; racheté par OpenAI en mars 2026 (rapport 10).
   - **Le plus simple reste la base du Studio** : la table `ai_calls` a déjà, pour chaque appel, la tâche, l'étape, la
     tentative, les jetons (cache compris), le coût et la clé de la consigne (`prompt_key`, `prompt_hash`). Il manque une
     seule chose pour le « coût par travail accepté » : une petite table des verdicts (ce que le client a gardé, refait
     ou refusé, et le verdict du propriétaire sur les essais). Avec elle, une requête SQL donne, par étape et par
     version de consigne : le coût total, reprises comprises, divisé par le nombre de travaux acceptés.
3. **Juges calibrés sur le propriétaire** : rien de nouveau à ajouter aux rapports 2 et 8 (verdicts « bon / pas bon »
   avec une raison, un juge par défaut, mesure de l'accord sur des cas mis de côté), sinon la liste de contrôle par
   demande (TICK, partie 2) et la leçon d'OpenAI : les essais faits à la main pèsent plus que les chiffres d'usage.

---

## 5. Réduire les coûts sans baisser la qualité

### 5.1 Les leviers, du plus sûr au plus délicat

| Levier | Chiffre publié | Source | Ce que ça donnerait pour SINA |
|---|---|---|---|
| Lire le fil en cache | lecture à 0,05 fois le prix sur Opus 5.5 (0,20 $ au lieu de 4 $) | page des prix, **officiel** | le plus gros gain : voir 0 et 1.1 |
| Garder le même niveau d'effort d'un pas à l'autre, ou le changer par message système | un changement d'effort casse le cache des messages | page du cache, **officiel** | condition pour que le cache du fil tienne |
| Traitement différé | −50 %, cumulable avec le cache | pages des prix Anthropic et OpenAI, **officiel** | publications du mois, point du mois, grands moments, batterie de cas |
| Images en entrée relues en cache (OpenAI) | 2 $ au lieu de 8 $ par million de jetons, seulement par la Responses API | page des prix OpenAI, **officiel** | séries de logos, retouches d'une même photo |
| Outils chargés à la demande | « plus de 85 % » de définitions en moins | page de la recherche d'outils, **officiel** | déjà fait par l'aiguilleuse |
| Petit modèle pour les tâches mécaniques | Haiku 5.5 : 0,10 $ / 0,50 $ contre 4 $ / 20 $ pour Opus 5.5, soit 40 fois moins | page des prix, **officiel** | voir 5.2 |
| Limiter la longueur des avis d'un grand modèle | conseil plafonné à 2 048 jetons : environ 7 fois moins de texte, exactitude « dans le bruit » | page de l'outil « conseiller », **officiel** (mesure interne d'Anthropic, 40 cas) | plafonner la sortie de la relectrice et des juges |
| Aiguiller entre modèles | « plus de 2 fois » moins cher « dans certains cas » | RouteLLM, **prépublication**, https://arxiv.org/abs/2406.18665 (résumé seulement) | pas pour la conversation (règle du propriétaire) |

### 5.2 Le petit modèle pour le mécanique, le grand pour décider : ce qui est permis

- La règle du propriétaire : SINA « réfléchit avec le modèle le plus fort, pour tous les forfaits ». Rien ici ne
  propose de changer le modèle de sa conversation ni de ses juges.
- Ce qui n'est pas de la réflexion et pourrait passer sur Haiku 5.5, **à proposer au propriétaire avant tout essai** :
  reconnaître un client mécontent (aujourd'hui une liste de mots dans le code, `UNHAPPY`, qui se trompe sur « je
  n'aime pas » au départ, d'où une exception écrite à la main) ; extraire d'un message les faits à ranger dans la fiche ;
  vérifier qu'un texte ne contient aucun mot interdit par le client ; résumer un fil trop long dans les rubriques fixes.
  Ordre de grandeur, calculé et non mesuré : 3 000 jetons lus par Haiku 5.5 coûtent 0,0003 $.
- **L'outil « conseiller » d'Anthropic** (**officiel**, bêta,
  https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool) fait travailler un modèle moins cher
  (Sonnet 5.5 ou Haiku 5.5) qui consulte Opus 5.5 aux moments difficiles ; Anthropic dit que pour Sonnet sur des tâches
  complexes « le coût total reste semblable ou plus bas ». Deux limites : l'avis d'Opus 5.5 revient chiffré (on ne peut
  pas le lire), et ce montage **toucherait la règle du modèle le plus fort** si on l'appliquait à la conversation. Je ne
  le recommande pas pour la conversation ; il pourrait servir au travail de fond déjà confié à Sonnet 5.5 (« métier »),
  avec l'accord du propriétaire.

---

## 6. Les risques, et les parades mesurées

| Risque | Ce qui est mesuré | Parade | Où en est SINA |
|---|---|---|---|
| **Inventer un fait** | Citations d'Anthropic : jusqu'à 15 % de meilleur rappel des sources en interne ; un client (Endex) passe de 10 % à 0 % de sources inventées et d'erreurs de forme (**officiel**, blog d'Anthropic du 23 juin 2025, https://claude.com/blog/introducing-citations-api ; le chiffre d'Endex est rapporté par le client lui-même). Chroma : Claude s'abstient plus qu'il n'invente quand c'est ambigu. | Pour le « bras droit » (droit, comptabilité, impôts), un appel séparé avec citations des documents lus ; les citations ne marchent pas avec les sorties JSON imposées (guide technique d'Anthropic), donc pas dans l'appel principal de SINA. | Règle « rien d'inventé » dans la consigne, relectrice des faits aux moments forts, contrôles par le code des allégations interdites dans les textes (sécurité des enfants, sommeil… dans `src/lib/ai/tasks.ts`). |
| **Se tromper sur ce que le client a dit ou oublier une préférence** | PrefEval (**étude publiée**, ICLR 2025, 10 modèles) : sans aide, le respect d'une préférence donnée plus tôt « tombe sous 10 % dès 10 tours (environ 3 000 jetons) », et se dégrade encore avec la recherche dans les messages (https://arxiv.org/abs/2502.09597). « LLMs Get Lost » : −39 % (rapport 3). | Remettre à chaque pas, en entier : ses mots corrigés, ses refus, ses choix ; et un contrôle par le code (gratuit) qui refuse un message de SINA contenant un mot interdit. | Les mots corrigés ne sont pas dans la réflexion de SINA (partie 0, point 5) ; la fiche n'est relue en entier qu'au départ (point 4). |
| **Approuver une mauvaise idée** | 45 points de plus que les humains (ELEPHANT), 50 % de plus (Cheng), 58,19 % (SycEval) | Contrôle de complaisance par la relectrice ; cas « dire non » dans la batterie ; jamais d'amélioration sur le seul signal d'approbation. | Pas de contrôle de complaisance aujourd'hui. |
| **Des coûts qui s'emballent** | Un système à plusieurs agents consomme environ 15 fois une conversation (rapport 8) ; un avis d'Opus non plafonné fait 4 200 à 5 900 jetons, contre 630 à 840 plafonné à 2 048 (page « conseiller ») ; dans le Studio, l'essai du lot 2 a coûté 40,06 € pour 25 € accordés au départ (dépassement venu d'essais demandés par le propriétaire, `CLAUDE.md`). | Plafond dur par tâche (existe) ; plafond par client et par mois ; une alerte au propriétaire quand le coût par travail accepté d'une étape double d'une semaine à l'autre ; deux reprises au plus puis on remonte au client ; plafonner la sortie des juges. | Plafond par tâche et réservation avant l'appel : oui. Alerte sur le coût par travail accepté : non (il manque la table des verdicts). |

---

## 7. Ce qui contredirait une règle du propriétaire (signalé, non recommandé)

- Passer la conversation de SINA ou ses juges sur un modèle moins fort, ou sur l'outil « conseiller » avec un modèle
  moins fort qui écrit (règle : le modèle le plus fort pour réfléchir, tous forfaits).
- Laisser GEPA ou ACE changer seuls les consignes en ligne (règle : aucun réglage changé sans sa demande).
- Laisser l'outil de mémoire d'Anthropic écrire seul ce que SINA retient du client, sans que le client le voie (rapport
  3 : le client doit voir et corriger ce qu'elle retient).
- Prendre l'approbation du client comme seule mesure de réussite (risque de complaisance mesuré ci-dessus).

## 8. Pas vérifié

- Le traitement différé de gpt-image-2.6 : la page des prix d'OpenAI le donne, la page du traitement différé ne cite que
  gpt-image-2.5.
- Le prix réel d'une image gpt-image-2.6 dans le Studio (0,12 $ dans `config.ts`, contre des prix en jetons sur la page
  officielle).
- Les chiffres d'économie du cache pour SINA : ce sont des calculs à partir des prix officiels, pas des mesures. La
  table `ai_calls` permet de les mesurer sans rien payer.
- La parution d'ELEPHANT à ICLR 2026 et celle de l'étude de Cheng dans *Science* (vues dans les résultats du moteur de
  recherche, pages non ouvertes).
- Ax (GEPA et ACE en TypeScript) : lu en résumé seulement.
- HubSpot : aucune page technique trouvée ; les chiffres de G2 sont lus en résumé.
- La taille réelle du catalogue d'outils envoyé à chaque pas (le code dit environ 19 000 jetons ; non recompté).
- Le réglage d'effort « par message » et le budget de travail : décrits dans le guide technique d'Anthropic fourni avec
  l'outil de développement ; je n'ai pas ouvert leurs pages publiques.

---

## Ce qu'il faut construire dans SINA, dans l'ordre

1. **Mesurer d'abord, sans rien payer** : une requête sur la table `ai_calls` qui donne, par étape du parcours, les
   jetons lus en cache, les jetons payés plein tarif et le coût par message de SINA. *Ce que le client verra* : rien ;
   le propriétaire voit où part l'argent avant tout changement.
2. **Ses mots corrigés dans chaque réflexion de SINA**, et un contrôle par le code qui refuse un message contenant un
   mot qu'il a interdit (gratuit). *Ce que le client verra* : SINA ne réemploie plus jamais un mot qu'il a corrigé, même
   dans une phrase ordinaire.
3. **La fiche du client relue en entier à chaque pas** (ses réponses, ses notes, ses choix, ses refus avec leurs
   raisons, ce qu'il garde), tenue par le Studio et non par le modèle, et qu'il peut lire et corriger. *Ce que le client
   verra* : une page « ce que SINA sait de toi », et plus aucune question déjà posée ni contresens sur ce qu'il a dit,
   même après des semaines.
4. **Le fil envoyé comme une suite qui ne fait que s'allonger, lu en cache**, avec l'état du projet en message système
   à la fin et un effort qui ne casse pas le cache. *Ce que le client verra* : des réponses plus rapides ; son budget
   d'IA du mois dure plus longtemps (gain à mesurer au point 1).
5. **Un résumé par rubriques fixes quand le fil devient trop long**, au lieu de couper les 120 derniers messages.
   *Ce que le client verra* : SINA se souvient du début de son projet comme du premier jour.
6. **La relectrice avec une liste de contrôle propre au travail en cours et un contrôle de complaisance**, et une sortie
   plafonnée. *Ce que le client verra* : SINA lui dit franchement quand une idée ne va pas, avec une raison et une
   autre proposition, au lieu de lui donner raison.
7. **La table des verdicts et le coût par travail accepté** (gardé, refait, refusé ; verdicts du propriétaire sur les
   essais), avec une alerte quand ce coût double. *Ce que le client verra* : rien directement ; le propriétaire voit
   chaque semaine ce que coûte une planche, un site ou une publication réellement gardés.
8. **La batterie de cas avec des cas « dire non »** (fausse promotion, faux avis, nom à double sens, photo dans une
   arche), rejouée en différé à moitié prix avant chaque changement de consigne. *Ce que le client verra* : une SINA
   qui ne recule pas d'une version à l'autre.
9. **Le différé pour tout ce qui n'est pas attendu devant l'écran** : publications du mois préparées d'avance, point du
   mois, grands moments de l'année. *Ce que le client verra* : les mêmes créations, prêtes à l'heure dite, pour une part
   plus petite de son budget d'IA.
10. **Les images en série par la Responses API d'OpenAI** (images déjà lues à prix réduit), après vérification du prix
    réel d'une image gpt-image-2.6 et du différé des images. *Ce que le client verra* : plus d'essais de logos ou de
    publications dans le même budget, la qualité d'OpenAI inchangée.
11. **Les propositions de SINA réglées par le client** : une à la fois, avec sa raison, seulement après une livraison,
    au point du mois ou dans « ta journée est prête », un bouton « plus ou moins de propositions », et plus de
    reproposition après deux refus. *Ce que le client verra* : des idées utiles qui ne le dérangent jamais en plein
    travail.
12. **Plus tard, l'amélioration automatique des consignes (GEPA, ACE)**, seulement quand les points 7 et 8 tournent, et
    toujours comme une proposition au propriétaire, avec le prix de l'essai avant. *Ce que le client verra* : une SINA
    qui progresse d'elle-même d'un mois à l'autre, sans jamais changer de règles sans accord.
