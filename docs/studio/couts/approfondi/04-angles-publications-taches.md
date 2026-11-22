# Audit approfondi 04 : angles, activité, publications, publicités, tâches de fond

22 novembre 2026. Lu sur la dernière version de la branche `claude/evolution-sina` (enregistrement `9b67a29a`), dans une
copie de travail à part. **Aucun fichier du Studio modifié, aucun appel payant.** Prix : ceux des consignes (Opus 5.5 à
4 $ / 20 $ le million de jetons, lecture en mémoire 0,20 $, écriture en mémoire d'une heure ×2 ; Sonnet 5.5 à 2 $ / 10 $ ;
différé −50 % ; image d'OpenAI au jeton ; 1 $ = 0,90 €).

Ce qui est **mesuré** : la taille des consignes et des cahiers (lue dans le code et les fichiers), le nombre d'appels, leur
ordre, leurs plafonds. Ce qui est **estimé** : le nombre de jetons d'une demande quand il dépend des données du client
(environ 3 caractères par jeton), la longueur réelle des réponses (la réflexion du modèle est cachée) et le nombre moyen
d'essais par image (1,3 retenu ; **à vérifier** dans la table `ai_calls`). Rien n'a été vérifié sur une facture.

Fichiers lus en entier : `worker/index.ts`, `worker/handlers.ts` ; `src/lib/syna-agent/` : `angles-chain.ts`,
`angles-prompts.ts`, `angles-knowledge.ts`, `angles.ts`, `tools/angles.ts`, `posts-plan.ts`, `posts-knowledge.ts`,
`tools/posts.ts`, `calendar.ts`, `tools/calendar.ts`, `activity.ts`, `tools/activity.ts`, `tools/catalogue.ts`,
`tools/steps-late.ts` ; `src/lib/social-v2/` : `ai-post.ts`, `deps.ts`, `production.ts`, `single.ts`, `autopilot.ts`,
`automations.ts`, `planner.ts` (appels), `scheduler.ts` (appels) ; `src/lib/ads-v2/` : `engine.ts`, `deps.ts`,
`estimate.ts`, `platforms.ts` ; et dans `src/lib/ai/llm.ts` tout ce qui décide du prix d'un appel (mémoire, différé,
relances).

---

## 0. Ce qu'il faut retenir

1. **Aucune tâche automatique n'appelle l'IA quand rien n'a changé.** Le passage du pilote des publications (toutes les
   6 heures), les rappels du calendrier (toutes les 10 minutes), les domaines, les e-mails : tout est fait par le code.
   Le seul appel payant automatique est la création des visuels des 3 prochains jours, et une image déjà refusée n'est
   jamais repayée (ses essais sont rejoués depuis la mémoire du Studio).
2. **Le plus gros reste est un doublon dans les publications** : pour chaque image, un appel à Sonnet 5.5 (effort élevé,
   environ 15 000 jetons lus) réécrit le titre, le bouton, la scène et le concept de l'image, alors que la stratège de
   SINA (Opus 5.5, jugée) les a déjà écrits dans le plan que le client a accepté. Le titre approuvé peut donc changer sur
   l'image sans que personne l'ait relu. Même doublon dans les publicités : un appel par format au lieu d'un par idée.
3. **La relecture d'une image de publication relit trois fois certaines choses** : la photo du produit et le logo sont
   joints deux fois chacun, les trois dernières publications sont jointes en pleine taille, et la consigne entière de
   l'image (déjà résumée dans le brief joint) est recopiée.
4. **Les réponses coupées faute de place sont redemandées à l'identique** : le Studio double la limite demandée, mais
   l'envoi garde un plancher de 8 000 jetons ; de 2 000 à 4 000 puis 8 000, c'est trois fois la même limite. Touche le
   concept et la relecture des publications, le juge du plan, la relecture des publicités.
5. **Un mois courant coûte aujourd'hui environ 6,30 €, 14,70 € et 23,10 €** (publications et campagnes, hors
   conversation et hors vidéos) pour les forfaits à 69 €, 99 € et 169 € ; **environ 4,85 €, 11,30 € et 17,70 € après les
   corrections de ce rapport**, et environ 2,75 €, 7,10 € et 11,40 € si le différé des images d'OpenAI est confirmé
   (proposition du rapport 03).
6. **Deux règles du propriétaire ne sont pas tenues dans les publications et les publicités** : la relecture des images
   est faite par Sonnet 5.5 (pas par le plus fort), et le concept de l'image aussi. Ce n'est pas une économie : la
   tenir coûterait plus. C'est dit en partie 6, avec le prix.

---

## 1. L'étude pendant « faire connaissance »

**Il n'y a pas d'étude payante pendant « faire connaissance » dans le code actuel.** L'étude du marché (recherches sur
Internet, paroles d'acheteurs, concurrents) est faite au début de « La marque » par `brand-chain.ts` (hors de mon
périmètre). Les angles la reprennent sans la repayer (`brandStudyOf`, `angles-chain.ts` l. 307-310) ; ils ne retournent
écouter Internet que s'il y a moins de 8 paroles d'acheteurs (l. 309-326). Les anciennes « préparations »
(`project.prepare`, `strategy.prepare`, `worker/handlers.ts` l. 83-84) existent encore dans le code mais ne sont pas
lancées par SINA (**à vérifier** : aucun écran du parcours ne les appelle ; à retirer selon la méthode, sans gain par
projet).

---

## 2. Les trois angles (`angles-chain.ts`, tâche en différé)

Tous les appels : `llmJson` avec la tâche « strategy », modèle imposé par `sinaModels()` : **Opus 5.5, effort moyen**
(l. 149-154) ; l'écoute d'Internet en Sonnet 5.5. La tâche entière passe en différé (`worker/handlers.ts` l. 71) ; chaque
consigne est alors gardée en mémoire **une heure** (`llm.ts` l. 907), écriture payée 2 fois le prix d'entrée.

| Appel | Ligne | Envoyé (estimé) | Mémoire | Sortie (plafond) | Fois par projet |
|---|---|---|---|---|---|
| Recherche sur Internet + écoute | 313, 317 | consigne de l'étude + fiche + 30 pages (≤ 2 400 car. chacune) ≈ 18 000 | consigne seule | 9 000 | 0 (étude de la marque suffisante) ou 1 |
| Types de clients | 333 | consigne + leçon (≈ 4 500) + dossier ≈ 9 000 | consigne (1 h) | 6 000 | 1 par tour |
| Trois stratèges, en même temps | 346 | consigne propre à chaque entrée + leçon (≈ 4 500) + **le même dossier** ≈ 12 500 | consigne (1 h) | 12 000 | 3 |
| Juge | 364 | consigne du juge + dossier et 9 propositions en réponse structurée ≈ 19 500 | consigne (1 h) | 8 000 | 1 |
| Reprise de l'entrée faible | 386 | consigne de reprise + dossier + remarques ≈ 14 500 | consigne (1 h) | 10 000 | 0 à 3 (1 d'habitude) |
| Juge de la reprise | 394 | même consigne que le juge (relue en mémoire) ≈ 17 500 | oui | 6 000 | 0 ou 1 |
| Lecteur qui ne sait rien, réécriture, relecture | 415, 424, 435 | ≈ 2 500 à 5 000 | petites consignes (sous le minimum de mise en mémoire, **à vérifier**) | 5 000 | 1 à 3 |

Coût d'un tour, déroulé habituel, en différé : **environ 0,55 €** (entrée ≈ 105 000 jetons, sortie ≈ 40 000).

Ce qui va bien : l'étude n'est pas repayée ; les contrôles des chiffres et des garanties (`draftIssues`), le choix de trois
types de clients différents (`pickThree`) et le rangement des notes sont faits par le code ; chaque appel est un point de
reprise (`ctx.step`), donc une tâche reprise ne repaie rien. Aucune relecture en double.

**Ce qui reste :**
- **La mémoire d'une heure est payée sur des consignes lues une seule fois.** Les consignes des types de clients, des
  trois stratèges et de la reprise ne servent qu'une fois par tour (chaque stratège a sa propre entrée au début de sa
  consigne, la reprise annonce « 2 propositions » au lieu de « 3 » dès la première ligne). Chacune est écrite en mémoire
  au double du prix, pour rien. Correction : mettre la leçon et les règles communes (`ANGLE_RULES`, leçon de 9 053
  caractères) **en tête** de la consigne, avec leur point de mémoire, et la partie propre à chaque spécialiste après ;
  les types de clients passent avant les stratèges, qui reliraient donc la partie commune au vingtième du prix. Il faut
  pour cela que `llm.ts` accepte une consigne en deux morceaux (deux points de mémoire ; il en reste un de libre).
  Gain : 5 écritures de ≈ 4 500 jetons à 2 fois au lieu d'une écriture et de 4 lectures, soit environ 0,045 $ par tour
  (**0,04 €**). **À vérifier** : le minimum de jetons au-dessous duquel Anthropic ne garde rien en mémoire pour Opus 5.5
  (4 096 pour Opus 4.5) ; si les consignes sont sous ce seuil, il n'y a ni surcoût ni gain.
- **Une nouvelle proposition refait la liste des types de clients** (l. 332-337, une par tour). Utile quand le client
  demande d'autres clientèles ; inutile quand il demande seulement d'autres idées. Gain possible ≈ 0,04 € par nouvelle
  proposition ; à décider au cas par cas par SINA (le code connaît la demande du client). Non compté.

---

## 3. L'activité et le catalogue

Aucun appel payant propre : `activity.plan`, `activity.company`, `catalogue.*` sont gratuits ; leur coût est celui des
réponses de SINA (hors de mon périmètre).

**Catalogue renvoyé en entier ?** `catalogue.list` rend jusqu'à 60 produits complets (description coupée à 400
caractères, toutes les variantes ; `tools/catalogue.ts` l. 10-14 et 30), mais le fil de SINA coupe tout résultat à
12 000 caractères dans la demande en cours, puis à 300 ensuite (`loop.ts` l. 680). Le coût est donc borné à environ
4 000 jetons une fois. Seul défaut : au-delà d'une vingtaine de produits, la liste est coupée au milieu et SINA doit la
redemander avec un filtre. Correction possible : rendre une liste courte (nom, prix, nombre de variantes) quand il y a
plus de 15 produits, le détail sur demande. Gain : quelques centimes pour les gros catalogues seulement. Non compté.

`activity.plan` est rappelé après chaque réponse du client, mais il ne renvoie que les titres et les prix : négligeable.

---

## 4. Les publications

### 4.1 Le plan des trois groupes (`posts-plan.ts`, tâche en différé)

| Appel | Ligne | Modèle, effort | Envoyé | Mémoire | Sortie | Fois |
|---|---|---|---|---|---|---|
| Stratège | 218 | Opus 5.5, **élevé** (tâche « strategy ») | consigne + 4 cahiers = 55 171 car. (≈ 18 400 jetons) ; demande : résumé du client, angles, produits, **modèles du secteur jusqu'à 17 000 car.** ≈ 11 000 | consigne (1 h) | 8 000 (7 000 demandés, plancher de 8 000) | 1 |
| Juge | 222-225 | Opus 5.5, faible (« quality_control » en difficulté forte) | consigne + 3 cahiers = 40 822 car. (≈ 13 600) ; plan + secteur ≈ 7 000 | consigne (1 h) | 8 000 | 1 |
| Reprise des groupes refusés | 245-246 | Opus 5.5, élevé | **autre consigne** (`POSTS_FIX_SYSTEM` + les mêmes 4 cahiers, ≈ 18 400) ; même demande de départ + groupes ≈ 13 500 | consigne (1 h) | 8 000 | 0 ou 1 (souvent 1) |
| Second regard du juge | 251 | Opus 5.5, faible | même consigne que le juge (relue) | oui | 8 000 | 0 ou 1 |

Coût : environ **0,37 €** avec une reprise, **0,22 €** sans. Les contrôles des mots-dièse, des sujets, des produits, des
promesses et des personnes sont faits par le code (`planIssues`, l. 142-160).

**Ce qui reste :**
- **La reprise réécrit en mémoire les mêmes 18 400 jetons de cahiers.** Sa consigne ne diffère de celle de la stratège
  que par ses premières lignes ; la mémoire chez le fournisseur ne reprend que ce qui est identique depuis le début. La
  stratège paie déjà l'écriture d'une heure (2 fois) ; la reprise la repaie au lieu de lire au vingtième. Correction :
  une seule consigne pour écrire et réécrire (la consigne de la stratège, inchangée), et la phrase « Des groupes ont été
  refusés : réécris seulement ceux-là… » passée dans la demande. Gain : 18 400 × (2 − 0,05) × 4 $ / million × 0,5 =
  0,072 $ quand il y a reprise, soit environ **0,045 €** par plan (reprise dans 7 plans sur 10, **à vérifier**).
  Expérience : égale.
- **Plafond du juge plus bas que le plancher d'envoi** : voir 4.4 (relance identique).

### 4.2 La création des images du plan (`tools/posts.ts` → `social.v2.produce` → `ai-post.ts`, en direct)

`posts.create` crée une ligne par réseau avec **le même texte** pour tous (l. 84-90) : aucun texte n'est réécrit par
réseau, et Instagram et Facebook (tous deux en 4:5) partagent la même image (`cleDePartage`, `production.ts` l. 108-111,
déjà corrigé le 22 novembre). Pour chaque image, `designSinglePostWithAi` fait :

| Appel | Ligne | Modèle, effort | Envoyé | Mémoire | Sortie | Fois par image |
|---|---|---|---|---|---|---|
| **Concept et textes de l'image** (`copy`) | `ai-post.ts` l. 1033-1066 | **Sonnet 5.5, élevé** (« copywriting », difficulté normale) | résumé du projet (contexte) + réponse structurée : produit, services, identité, stratégie, demande, **puis le contrat complet qui recontient l'identité, la stratégie et les faits**, 8 concepts récents ≈ 15 000 jetons (devis du Studio : 18 000) | le contexte seul, 5 min (sous le minimum, **à vérifier**) | 8 000 (2 000 demandés) | 1 (gardé pour les essais suivants) |
| Image | l. 851 | OpenAI, qualité haute, 1024 × 1536 | consigne (jusqu'à 24 000 octets) + photo du produit + logo | — | 1 image | 1,3 (jusqu'à 3) |
| Relecture | l. 876 et 1085-1175 | **Sonnet 5.5, faible** (« quality_control », difficulté normale) | 10 images au plus + contrat complet ≈ 24 000 jetons | aucune (consigne de tête de deux lignes) | 8 000 | 1,3 (une par essai) |

Une publication coûte ainsi environ 0,055 $ (concept) + 1,3 × (0,075 $ d'image + 0,063 $ de relecture) = **0,234 $, soit
0,21 €** ; c'est cohérent avec les 0,22 € de la référence (`LE-STUDIO-DE-A-A-Z.md`). Le rapport 03 ne comptait ni le
concept ni les essais refusés.

**Ce qui reste :**

1. **Le concept refait par Sonnet ce que la stratège a déjà fait et que le client a accepté.** Le plan contient pour
   chaque groupe le titre, les points, le bouton, le texte, la photo décrite (`visual`) et ce qui la distingue (`look`) ;
   il est jugé par Opus et montré au client avant toute image. Puis l'appel `copy` réécrit titre, sous-ligne, bouton,
   scène et concept ; et c'est **son** titre qui va sur l'image (`cleanAiCopy`, l. 661 : le titre du plan n'est gardé que
   si celui de Sonnet contient une affirmation à prouver). Le titre que le client a accepté peut donc changer sur l'image
   sans avoir été jugé. Correction : la stratège écrit aussi le concept de l'image (cadrage, décor, lumière, matières,
   typographie, style du bouton : les champs de `AiPostCopySchema.concept`, environ 330 jetons par groupe), le juge le
   lit avec le reste, et `posts.create` passe titre, bouton et concept à la création comme « textes du client »
   (`clientTexts`, déjà prévu pour les textes saisis) : l'appel `copy` n'a plus lieu pour les publications du plan.
   Gain : 3 × 0,055 $ − 1 000 jetons de sortie de plus chez Opus en différé (0,010 $) = 0,155 $, soit **0,14 € par
   projet**. Expérience : **meilleure** (le titre accepté est celui de l'image ; le concept est écrit par le plus fort et
   jugé).
2. **La relecture joint plusieurs fois les mêmes choses** (l. 1095-1160) : la photo du produit en 768 points puis en
   pleine taille ; le logo en 768 puis en pleine taille ; les trois dernières publications en pleine taille (environ
   1 600 jetons chacune) pour juger seulement de la variété ; et dans le contrat, le reçu de l'image (`transports`,
   l. 866) qui contient **toute la consigne envoyée à OpenAI**, déjà résumée par le brief et le contrat joints. Enfin la
   longue liste de contrôles, la même pour toutes les publications de tous les clients, est dans la demande après les
   images, donc jamais gardée en mémoire. Correction : la photo et le logo une fois, en pleine taille (la version 768 en
   est une réduction) ; les trois dernières publications en vignettes de 512 points (la variété se voit très bien ainsi ;
   **l'image relue, elle, reste en pleine taille**, comme le veut le rapport 03) ; dans le reçu, l'empreinte de la
   consigne au lieu de son texte (le texte reste rangé avec l'image) ; la liste de contrôles passée en consigne de tête,
   gardée en mémoire. Gain : environ 3 200 + 1 600 + 3 000 jetons retirés et 1 400 lus au vingtième, soit **0,018 $ par
   relecture** (0,016 €) : 0,06 € par projet, 0,19 € par campagne. Expérience : égale. **À vérifier** : la taille réelle
   du reçu (estimée à 3 000 jetons).
3. **L'identité et la stratégie sont recopiées deux fois dans la demande du concept** (une fois en tête, une fois dans le
   contrat ; l. 1039-1043 et 590-591), en plus du résumé du projet joint en contexte. Correction : une seule fois. Gain estimé :
   1 500 jetons, 0,003 $ par image (**à vérifier** : taille de la stratégie du client). Expérience : égale.

### 4.3 Le calendrier, le pilote des publications et les tâches qui tournent seules

- **Calendrier de SINA** (`calendar.ts`) : gratuit, sans IA, construit avec les publications déjà créées ; rien n'est
  inventé ni comblé. Rappel du jour par le code (`remindDue`, toutes les 10 minutes, un e-mail par jour au plus).
- **Pilote des publications** (« Ma communication automatique », `autopilot.ts`, toutes les 6 heures, `worker/index.ts`
  l. 140) : les textes du mois sont écrits **par le code** (`createPlanV2` → `writeLocal`, gratuit), adaptés à chaque
  réseau par le code (`adaptForPlatform`). Seuls les visuels coûtent, et seulement pour les 3 prochains jours
  (`produceDays`, l. 271) : **aucune publication n'est préparée trop tôt**. La tâche payante reprend le même chemin que
  ci-dessus (concept, image, relecture), **en direct**, alors que personne n'attend : le visuel sert dans un à trois
  jours.
- **Règles d'automatisation**, nouvelles tentatives de paiement, domaines, e-mails : aucun appel à l'IA.
- **Une image refusée trois fois n'est jamais repayée** par les passages suivants : ses essais sont rejoués depuis la
  mémoire du Studio (`publicationStage` et `publicationStageValue`, `ai-post.ts` l. 545-550 et `publication-recipe.ts` l. 13-34), tant que le projet n'a pas changé.

**Ce qui reste :**
1. **Le concept des visuels du pilote en différé.** Rien n'oblige à servir ces appels en direct. Correction : un repère
   « pilote » dans la tâche lancée par `autopilot.ts` (l. 290), et le passage en différé de cette seule tâche (celle que
   lance `posts.create`, que le client regarde, reste en direct). Le même interrupteur met aussi la relecture en différé
   (déjà proposé par le rapport 03, compté là-bas, pas ici). Il faut une patience plus longue que les 30 minutes par
   tâche (`deferredLimits`, `llm.ts` l. 435) : un lot de 15 visuels fait environ 35 appels l'un après l'autre ; ou
   mieux, un seul dépôt pour tous les concepts du lot, puis un seul pour toutes les relectures. Gain : 0,0275 $ par
   publication, soit **0,74 €, 1,49 € et 2,23 € par mois** à 1, 2 et 3 publications par jour. Expérience : égale (les
   visuels sont prêts la veille ou l'avant-veille, comme aujourd'hui).
2. **Un compte qui gonfle tout seul** (pas une dépense, une gêne) : à chaque passage, si les mêmes publications
   attendent encore leur visuel, la tâche déjà faite est retrouvée (même clé), mais son estimation est réinscrite dans le
   journal (`autopilot.ts` l. 292) et comptée dans la dépense de la semaine (`spentThisWeek`). Le plafond de la semaine
   paraît atteint alors que rien n'a été payé, et les visuels suivants attendent. Correction : ne rien inscrire quand la
   tâche existait déjà. **À vérifier** sur un vrai compte.

### 4.4 Relance identique d'une réponse coupée (toutes les étapes de mon périmètre)

`llm.ts` envoie toujours au moins 8 000 jetons de place (`max_tokens`, l. 532), mais quand une réponse est coupée,
`llmJson` double le chiffre **demandé** (l. 935 et `jsonRetry` l. 824). Pour un appel demandé à 2 000 : la première fois
8 000, puis 4 000 → encore 8 000, puis 8 000 → encore 8 000, puis 16 000. **Deux appels entiers repayés avec la même
place**, donc très probablement coupés au même endroit. Touchés : le concept et la relecture des publications et des
publicités (2 000 et 2 500), le juge du plan (3 000, plafond 6 000 : sa seule relance a forcément la même place, puis
le plan part « non jugé »). Correction : partir du plancher réel (`Math.max(demandé, 8 000)`) avant de doubler. Gain :
0,11 $ par concept coupé, 0,12 $ par juge coupé (et un plan qui reste jugé). Fréquence inconnue : **à mesurer**
gratuitement dans `ai_calls` (champ `stop_reason` égal à `max_tokens`). Non compté dans le total. Expérience : meilleure
(moins d'attente, moins d'échecs).

### 4.5 Publications préparées puis jamais publiées

Les trois « publications » de la marque finie (images 4:5 avec le logo, relues par Opus en effort élevé, environ 0,27 €
en tout, `brand-finish.ts`) ne sont pas des lignes de publication : le calendrier ne les reprend jamais
(`publicationSources` ne lit que la table des publications). Elles ne sont donc jamais publiées. Elles ne suivent pas
l'angle choisi (elles sont faites avant les angles) : ce n'est pas un pur doublon. Proposition, une phrase pour le
propriétaire : les offrir au calendrier comme « publications de lancement de la marque » (gratuit, trois publications de
plus pour le client). Non compté (périmètre de la marque, et choix du propriétaire).

---

## 5. Les publicités préparées (`ads-v2`, étape 10, en direct)

| Appel | Ligne | Modèle, effort | Envoyé | Sortie | Fois par campagne |
|---|---|---|---|---|---|
| Textes de la série | `engine.ts` l. 157 ; `deps.ts` l. 135-152 | Opus 5.5, moyen (« ad_creative », difficulté forte) | consigne + compétences en référence + résumé publicitaire ≈ 8 000 à 24 000 | 8 000 (6 000 demandés) | 1, et 1 reprise des annonces fautives au plus |
| Photo du produit repérée sur une photo du client | `deps.ts` l. 91-134 | Sonnet 5.5, faible | une photo quadrillée | 8 000 | 0 ou 1 par projet (gardée ensuite) |
| Par idée **et par format** : concept, image, relecture (`finalAd` → `designPostWithAi`) | `engine.ts` l. 321 ; `deps.ts` l. 73-87 | comme 4.2 | comme 4.2 | comme 4.2 | 3 idées × 3 formats (fil 4:5 et 1:1, récits verticaux 9:16) = **9** |

Une campagne de 3 idées : environ 0,14 $ de textes + 9 × (0,055 $ + 1,3 × (0,079 $ + 0,063 $)) = **2,30 $, soit
2,07 €**. Les contrôles des promesses et de la longueur des textes sont faits par le code (`claimIssues`) ; pas de
relecture en double (la relecture propre au moteur publicitaire n'a pas lieu quand l'image est créée par l'IA).

**Ce qui reste :**
1. **Un concept par format au lieu d'un par idée.** Les textes de chaque idée sont écrits une fois par Opus, mais chaque
   format (4:5, 1:1, 9:16) reçoit son propre appel de concept à Sonnet, qui réinvente décor, lumière et composition :
   trois images d'une même annonce qui peuvent ne pas se ressembler. Correction : un appel de concept par idée, qui reçoit
   les trois formats et décrit la scène commune avec la place du texte dans chacun ; chaque format garde son image et sa
   relecture. Gain : 6 appels de 0,055 $, soit **0,30 € par campagne**. Expérience : meilleure (une campagne cohérente
   d'un format à l'autre).
2. **Relecture allégée** comme en 4.2 : **0,19 € par campagne**.
3. **Les angles en réserve ne servent pas aux publicités.** Le moteur publicitaire refait ses propres angles à partir de
   la fiche (`planAngles`, `engine.ts` l. 132), alors que le client a déjà payé trois angles jugés, et que la règle dit
   que les autres « restent en réserve pour ses publications et ses publicités ». Ce n'est pas une dépense de plus
   (ces angles sont faits par le code), mais c'est un travail payé qui n'est pas réemployé. **À vérifier** avec le
   propriétaire au lot des publicités.
4. **Différé possible** : personne ne regarde la campagne se faire (SINA annonce « plusieurs minutes »), mais le différé
   allongerait l'attente d'une demi-heure ou plus : c'est un choix du propriétaire, non compté.

Remarque : le même défaut existe pour les publications d'un groupe envoyé à des réseaux de formats différents (TikTok en
9:16, LinkedIn en 1:1) : un concept par format. La correction 4.2-1 le fait disparaître pour les publications du plan.

---

## 6. Deux règles du propriétaire non tenues (ce n'est pas une économie)

- **« Chaque image relue par le modèle le plus fort »** : la relecture des publications et des publicités est faite par
  **Sonnet 5.5, effort faible** (`ai-post.ts` l. 1090 : « quality_control » en difficulté normale ; `policy.ts` l. 56).
  La passer à Opus 5.5 coûterait, après l'allègement de 4.2-2, environ 0,045 $ de plus par relecture : **+1,58 €,
  +3,16 € et +4,74 € par mois** à 1, 2 et 3 publications par jour, et +0,47 € par campagne (moitié moins avec le
  différé du rapport 03). Les allègements de ce rapport en paient environ la moitié.
- **« Le plus fort partout où SINA décide »** : le concept de chaque image est décidé par Sonnet 5.5. La correction
  4.2-1 règle ce point pour les publications du plan, en économisant.

Je n'ai rien changé à ces deux points dans les chiffres ci-dessous : ils se décident avec le propriétaire.

---

## 7. Le point du mois et « ta journée est prête »

**Ils n'existent pas encore dans le code** (aucun fichier, aucune tâche). La référence les compte à 1 € par mois (point
du mois) et jusqu'à 2 à 3 € (points de la semaine). Pour qu'ils coûtent le moins possible sans rien perdre, à écrire au
moment de les construire :
- **« Ta journée est prête »** : le contenu du jour (quelle publication, quel réseau, le texte à copier) est déjà connu du
  calendrier ; le message se compose par le code, sans IA, à heure fixe. SINA (Opus) n'écrit que quand il y a quelque
  chose à conseiller (une publication refusée, un produit en rupture, une idée de la semaine), au plus une fois par
  semaine, en différé la nuit. Coût : environ **0,10 € par mois**, contre environ 1,40 € pour un message d'Opus écrit
  chaque jour en direct.
- **Le point du mois** : les chiffres sont comptés par le code ; un seul appel d'Opus en différé écrit le bilan et le
  conseil. Coût : environ **0,05 € par mois**.
- **Aucun appel si rien n'a changé** depuis le dernier point (le code compare les chiffres et le calendrier avant
  d'appeler).
- **Le plan des publications du mois (lot 5)** : s'il est écrit par la stratège (comme le plan des trois groupes), elle
  doit écrire aussi le concept de chaque image, par lots de 10 publications en différé avec les cahiers gardés en
  mémoire (environ 0,016 € par publication, juge compris), et l'appel de concept par image disparaît (0,025 € en
  différé, 0,05 € en direct). Sinon le lot 5 ajouterait un plan payant **en plus** du concept payant de chaque image.

---

## 8. Le coût d'un mois courant (forfaits à 69 €, 99 € et 169 €)

Hypothèses : 1, 2 et 3 publications en images par jour (30, 60, 90 images ; Instagram et Facebook partagent la même
image), 0, 1 et 2 campagnes de 3 idées sur Meta (fil et récits verticaux), 1,3 essai par image, relecture par Sonnet comme
aujourd'hui. **Hors** conversation avec SINA (30, 60, 120 réponses dans la référence) et **hors** vidéos (lot 9).

| Par mois | 69 € (30 publications) | 99 € (60 + 1 campagne) | 169 € (90 + 2 campagnes) |
|---|---|---|---|
| Budget d'IA d'un mois courant (40 % du prix hors taxes) | 23,00 € | 33,00 € | 56,33 € |
| Publications aujourd'hui (0,21 € chacune) | 6,33 € | 12,66 € | 18,99 € |
| Campagnes aujourd'hui (2,07 € chacune) | — | 2,07 € | 4,14 € |
| Point du mois, journée prête | pas construits | pas construits | pas construits |
| **Total aujourd'hui** | **6,33 € (28 %)** | **14,73 € (45 %)** | **23,13 € (41 %)** |
| Après les corrections de ce rapport (publication 0,162 €, campagne 1,58 €) | **4,85 € (21 %)** | **11,29 € (34 %)** | **17,72 € (31 %)** |
| En plus, relectures et images du pilote en différé (rapport 03, si OpenAI le confirme) | ≈ 2,75 € | ≈ 7,10 € | ≈ 11,40 € |
| Si la relecture passe à Opus (règle du propriétaire, partie 6) | +1,58 € | +3,63 € | +5,69 € |

Détail d'une publication après correction : concept en différé 0,0275 $, image 1,3 × 0,075 $, relecture allégée
1,3 × 0,045 $, doublon d'identité retiré : 0,180 $ (0,162 €). Une campagne : 2,30 $ − 0,33 $ (concept par idée) −
0,21 $ (relecture allégée) = 1,76 $ (1,58 €).

Le projet de départ n'est pas recompté ici (environ 17,50 € d'après le compte rendu du 22 novembre) ; mes corrections y
enlèvent environ 0,30 € (0,80 € avec une campagne à l'étape 10).

---

## Gains restants, du plus gros au plus petit

| # | Correction | Euros par projet | Euros par mois courant (69 € / 99 € / 169 €) | Effet sur l'expérience |
|---|---|---|---|---|
| 1 | Concept des visuels du pilote en différé (tâche « pilote » seulement, patience longue ou un seul dépôt par lot) | — | 0,74 / 1,49 / 2,23 € | égale (visuels prêts la veille) |
| 2 | Relecture des publications et publicités allégée : photo et logo joints une fois, trois dernières publications en vignettes, empreinte au lieu de la consigne d'OpenAI, liste de contrôles en mémoire | 0,06 € (0,25 € avec une campagne) | 0,64 / 1,47 / 2,30 € | égale (l'image relue reste en pleine taille) |
| 3 | Publicités : un concept par idée, pas par format | 0,30 € par campagne (étape 10) | 0 / 0,30 / 0,59 € | meilleure (campagne cohérente d'un format à l'autre) |
| 4 | Publications du plan : la stratège écrit aussi le concept, titre et bouton du plan passés tels quels à l'image, plus d'appel de concept par image | 0,14 € | 0 aujourd'hui ; au lot 5, le même principe évite un plan payant en plus du concept de chaque image (≈ 1 / 2 / 3 € par rapport à un concept en direct) | meilleure (le titre accepté par le client est celui de l'image, concept jugé par le plus fort) |
| 5 | Plan des publications : la reprise garde la consigne de la stratège (cahiers relus en mémoire) | 0,045 € | — | égale |
| 6 | Angles : leçon et règles communes en tête, gardées en mémoire, partie propre à chaque spécialiste après | 0,04 € (à vérifier : minimum de mise en mémoire) | — | égale |
| 7 | Identité et stratégie une seule fois dans la demande du concept | 0,01 € | 0,08 / 0,16 / 0,24 € | égale |
| 8 | Relance d'une réponse coupée : doubler à partir du plancher réel de 8 000 jetons | à mesurer (0,10 € par cas) | à mesurer | meilleure (moins d'attente, juge du plan jamais perdu) |
| 9 | Point du mois et « ta journée est prête » construits par le code, Opus en différé seulement quand il y a quelque chose à dire | — | évite ≈ 1,30 € par rapport à un message quotidien en direct (pas encore construits) | égale |
| 10 | Pilote : ne pas réinscrire la dépense d'une tâche déjà faite | 0 € | 0 € (le plafond de la semaine n'est plus atteint à tort) | meilleure |
| | **Total compté (lignes 1 à 7)** | **≈ 0,30 € par projet, 0,80 € avec une campagne** | **≈ 1,48 € / 3,44 € / 5,41 €** | |
