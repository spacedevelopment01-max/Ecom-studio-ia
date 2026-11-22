# La conversation de SINA avec le client : ce qu'on peut encore gagner (22 novembre 2026)

Périmètre : chaque réponse de SINA, de « faire connaissance » à la fin du parcours. Lu sur la dernière version de la
branche `claude/evolution-sina` (enregistrement `9b67a29a`), dans une copie de travail à part. **Aucun fichier du Studio
modifié, aucun appel payant.** Les tailles ont été mesurées en faisant tourner les fonctions du Studio sur une base
d'essai (aucune IA) ; les jetons se déduisent des caractères (environ 3 caractères par jeton, comme dans l'audit 01).

Fichiers lus en entier : `src/lib/syna-agent/loop.ts`, `conversation.ts`, `prompt.ts`, `journey.ts`, `registry.ts`,
`controle-message.ts` (le contrôle gratuit), `fiche.ts` (la fiche du client), `store.ts` et `thread.ts` (le fil et son
résumé), `snapshot.ts` (l'état du projet), `attachments.ts` (images jointes), `models.ts`, toutes les notices de
`tools/`, les notices du site dans `custom-theme/tools.ts`, et la partie de `src/lib/ai/llm.ts` qui range les blocs en
mémoire.

Ce qui est déjà fait et n'est pas redit ici : fil repris de mémoire, mémoire d'une heure, consigne des étapes 6 à 13 et
images du parcours en mémoire, seulement les outils de l'étape, effort constant (en cours).

## Les prix utilisés

| | Pour 1 000 jetons |
|---|---|
| Entrée au plein tarif (Opus 5.5, 4 $ le million) | 0,0036 € |
| Lecture en mémoire (0,20 $) | 0,00018 € |
| Écriture en mémoire d'une heure (8 $) | 0,0072 € |
| Sortie, réflexion comprise (20 $) | 0,018 € |
| Un bloc réécrit au lieu d'être relu | 0,0070 € de plus |

(1 $ = 0,90 €.)

---

## 1. Les appels payants de la conversation

| Appel | Où | Modèle, effort | Ce qui part | Mémoire | Sortie | Fois par projet | Ce qui fait repayer |
|---|---|---|---|---|---|---|---|
| **La réflexion de SINA** | `loop.ts` l. 577-613 (appel l. 612) | Opus 5.5 ; moyen, élevé aux moments forts et après un outil du site (`modelFor` l. 528, `JUDGE_TOOLS` l. 564) | consigne générale, notices de l'étape, images du parcours, le fil, puis le contexte (parcours, fiche, état du projet, budget, pièces jointes), puis les photos du dernier message | consigne, notices, images du parcours et fil en mémoire ; **le contexte jamais** | objet de réponse, plafond 12 000 puis 16 000 jetons ; environ 760 jetons mesurés sur Nadia | **une par tour d'outil**, pas une par réponse : 1 à 3 par message du client ; environ 100 sur un projet (estimé) | réponse coupée : refaite avec plus de place (`llm.ts` l. 935), rare |
| **La réécriture après le contrôle gratuit** | `loop.ts` l. 260-268 | la même | la même demande, avec la remarque à la fin du contexte | idem | idem | à chaque défaut trouvé (voir 3.9) | faux défauts (voir 3.9) |
| **La relectrice** | `loop.ts` l. 620-640 (appel l. 636) ; consigne `conversation.ts` l. 132-146 | Opus 5.5, moyen | consigne de 4 427 caractères ; dernier message du client (2 000 au plus), résultats depuis ce message (14 000 au plus), prix, mots du client, brouillon | consigne avec un point de mémoire de **5 minutes** | verdict et 4 remarques au plus, plafond 3 000 jetons | aux moments forts seulement (résultat, échec, client mécontent) : environ 15 | une panne ne fait rien repayer (le brouillon part) |
| **La réécriture après la relectrice** | `loop.ts` l. 638 | Opus 5.5, élevé | la même demande + les remarques | idem réflexion | idem | quand elle refuse | aucune seconde relecture |
| Comptage des jetons avant chaque appel | `llm.ts` (`maxCostMicro`) | gratuit chez le fournisseur | — | — | — | à chaque appel | un aller-retour de plus : un peu d'attente |

Rien d'autre n'est payant dans ce périmètre : les devis (`stepQuote`), les contrôles de `controle-message.ts`, la fiche, le
résumé du fil et les retouches de texte (`fixElision`, `withoutRepeatedQuestion`) sont faits par le code.

---

## 2. Les tailles mesurées

### 2.1 Ce qui est gardé en mémoire

| Morceau | Taille |
|---|---|
| Consigne générale (`prompt.ts`, avec la consigne de langue) | 13 455 caractères |
| Consigne de la relectrice | 4 427 caractères |
| Toutes les notices du catalogue | 114 457 caractères pour 118 outils, **dont 55 854 de schémas d'arguments** (49 %) |

Notices envoyées à chaque étape (notice complète des outils de l'étape, une ligne pour les autres) :

| Étape | Notices complètes | Catalogue | Consigne de l'étape | Total gardé en mémoire |
|---|---|---|---|---|
| 0 faire connaissance | 15 outils, 11 291 car. | 18 940 | aucune (elle est dans le contexte, voir 3.6) | 18 940 |
| 1 identités | 12 outils | 16 490 | aucune | 16 490 |
| 2 logo | **9 outils, aucun de la marque** | 13 034 | aucune | 13 034 |
| 3 marque complète | 11 outils | 13 986 | aucune | 13 986 |
| 4 angles | 13 outils | 17 182 | aucune | 17 182 |
| 5 activité (boutique) | 19 outils, 20 786 car. | 27 941 | aucune | 27 941 |
| 5 activité (services) | 18 outils | 24 227 | aucune | 24 227 |
| 6 site, avant sa création | 15 outils | 21 946 | 9 477 | 31 423 |
| 6 site, après sa création | 19 outils | 26 722 | 9 477 | 36 199 |
| 7 mise en boutique | 19 outils | 27 807 | 879 | 28 686 |
| 9 publications | 12 outils | 14 278 | 1 275 | 15 553 |

Les plus longues notices : `custom.structure` 6 335 caractères (dont 4 471 de schéma), `shop.offers` 5 159 (3 630 de
schéma, qui répète la description écrite juste au-dessus), `bookings.configure` 3 642 (3 391 de schéma), `gallery.create`
2 448, `catalogue.update` 2 324, `activity.company` 2 322.

### 2.2 Ce qui part au plein tarif à chaque réflexion (le contexte)

- Faire connaissance, client à mi-parcours (8 sujets, 3 notes) : **6 229 caractères** de parcours, dont 1 316 pour la
  fiche, plus le budget et les pièces jointes. Sur ces 6 229 caractères, environ 2 600 ne changent jamais pendant
  l'étape (les deux lignes du parcours, le paragraphe « Faire connaissance. Ton but », la consigne d'enregistrement), et
  environ 1 300 répètent la fiche (voir 3.10).
- Étapes suivantes (estimé d'après le code) : le parcours (1 050 caractères pour les deux lignes de repères), la fiche
  entière (3 000 à 5 000 caractères en fin de « faire connaissance »), la consigne fixe de l'étape quand elle n'est pas
  dans `STEP_GUIDES` (2 000 caractères pour l'activité, 2 400 pour les angles, 2 000 pour la marque), l'état du projet
  (2 000 à 4 000 caractères), et, à l'étape du site, **le compte rendu de la création, 6 000 caractères à chaque
  réflexion** (`journey.ts` l. 440). Soit environ 3 000 à 5 000 jetons au plein tarif à chaque réflexion, ce qui
  rejoint l'hypothèse du compte rendu de Nadia (3 600 à 5 000).

---

## 3. Ce qui est gaspillé, et la correction

### 3.1 Le fil entier est réécrit tous les 40 messages, souvent deux fois de suite

**Ce que fait le code.** Deux règles différentes changent le début du fil :
- `debutEntier` (`loop.ts` l. 675) raccourcit les anciens résultats quand le numéro du dernier message passe un multiple
  de 40 (80, 120, 160, 200…) ;
- `filDeConversation` (`store.ts` l. 43) fait glisser la fenêtre quand le 120ᵉ message en partant de la fin passe un
  multiple de 40, c'est-à-dire aux messages 159, 199, 239…

Chaque fois, le début du fil change, donc **tout le fil est réécrit en mémoire** (le fournisseur ne reprend que ce qui
précède le premier changement). Les deux règles tombent à un message d'écart (159 puis 160, 199 puis 200) : quand une
réflexion a lieu entre les deux, le fil est réécrit deux fois de suite.

**Combien.** Un projet complet fait environ 300 à 400 messages (un message du client, 1 à 3 réponses, 1 à 3 résultats et
les accords, sur environ 63 demandes : estimé). Cela fait 7 à 9 réécritures du fil, plus 2 ou 3 en double. Le fil fait
environ 10 000 jetons à la fin de « faire connaissance » et 25 000 à 35 000 à l'étape du site (estimé). Une réécriture de
22 000 jetons coûte 22 × 0,0070 = 0,15 €. Environ 7 réécritures qui ne tombent pas déjà sur un changement d'étape :
**environ 1 €**, entre 0,50 et 1,30 € selon la taille réelle du fil.

**Correction.**
1. Le plus petit : aligner les deux règles (la fenêtre glisse aux mêmes messages que le raccourcissement : `OFFSET min`
   au lieu de `min - 1`, ou calculer le raccourcissement à partir du début de la fenêtre). Supprime les doubles :
   environ 0,30 €.
2. Le vrai : ne raccourcir et ne faire glisser le fil **qu'au changement d'étape**, où la mémoire est de toute façon
   réécrite (les notices changent), et sinon seulement si le fil dépasse une taille haute (par exemple 60 000 jetons).
   Garder un fil un peu plus long ne coûte presque rien à relire (10 000 jetons de plus relus 30 fois : 0,05 €), alors
   qu'une réécriture coûte 0,15 à 0,25 €. Le résumé du début du fil (`DEBUT_COUPE`) existe déjà et sert tel quel.

**Pour le client** : rien ne change ; SINA garde même un peu plus du fil sous les yeux.
**À vérifier** au prochain essai : dans Administration › Consommation, les réflexions de SINA qui écrivent plus de
10 000 jetons en mémoire sans changement d'étape (`coutParEtape`, colonne « écrit »).

### 3.2 L'étape de l'activité : deux ou trois réflexions pour chaque réponse du client

**Ce que fait le code.** Pendant « faire connaissance », SINA enregistre et pose sa question suivante dans la même
réponse : une seule réflexion par message du client. À l'activité, la consigne générale ne le permet que pour
`start.answer`, `start.note`, `start.keep` et `client.wording` (`prompt.ts` l. 49). Pour enregistrer une coordonnée
(`activity.company`), un produit (`catalogue.create`) ou une offre, SINA doit donc faire un tour sans question ; le
résultat lui dit ensuite « Rappelle activity.plan pour mettre la carte à jour » (`tools/activity.ts` l. 14 et 53) ; puis
un troisième tour pour parler. Le résultat de `activity.plan` donne deux fois la liste des questions manquantes (dans la
consigne pour elle et dans les données, l. 29-31), et le contexte la redonne une troisième fois (`journey.ts` l. 434).

**Combien.** Le lot 4 mesure environ 0,075 € par réponse à cette étape, soit à peu près deux réflexions de 0,04 €.
Environ 12 réponses : en revenir à une réflexion par réponse fait gagner **environ 0,40 €** (0,30 à 0,50 €).

**Correction.**
1. Permettre d'enregistrer dans le même tour qu'une question tous les outils gratuits d'écriture de l'étape
   (`activity.company`, `catalogue.create`, `catalogue.update`, `services.profile`, `shop.offers`, `prix.preuve`). Le
   code le permet déjà : une question posée avec des actions réussies arrête la demande (`loop.ts` l. 332) ; un
   enregistrement refusé fait repartir SINA, comme aujourd'hui. Seule la phrase de `prompt.ts` l. 49 change.
2. Que ces outils remettent eux-mêmes la carte « Ton activité » à jour (le code de `activity.plan` est gratuit) et
   rendent ce qui manque encore, en une ligne. Plus besoin de rappeler `activity.plan`.
3. Les questions manquantes une seule fois dans le résultat.

**Pour le client** : meilleur. Une réponse au lieu de deux ou trois attentes de réflexion du modèle le plus fort.

### 3.3 Les retouches du site : SINA lit d'abord la section qu'elle pourrait recevoir toute prête

**Ce que fait le code.** Quand le client clique sur un élément, son message commence par « [Élément désigné · section
s1234abcd … » (`custom-theme-boutique.tsx` l. 20-23). SINA fait alors trois réflexions, toutes en effort élevé :
`custom.section` pour lire la section, `custom.edit` pour la changer, puis une phrase pour le client. Le lot 4 a mesuré
environ 0,20 € par réponse de retouche.

Autre défaut : `custom.section` annonce le code de la section jusqu'à 30 000 caractères (`custom-theme/tools.ts`
l. 964), mais le Studio coupe tout résultat à 6 000 caractères (`loop.ts` l. 370) ; SINA peut ne pas voir le passage
exact à remplacer, et `custom.edit` échoue (à vérifier sur un vrai site).

**Correction.** Quand le message porte « [Élément désigné · section … », le Studio lit lui-même la section (gratuit) et
la range dans le fil avant la première réflexion, comme si SINA l'avait demandée. Pour la donner en entier sans la
couper, en donner les textes et la partie désignée plutôt que tout le code.

**Combien.** Une réflexion de moins par retouche, environ 0,045 € (contexte 4 700 jetons : 0,017 € ; réflexion élevée
d'environ 1 000 jetons : 0,018 € ; lectures : 0,009 €). Dix retouches : **environ 0,45 €** (0,30 à 0,60 €).

**Pour le client** : meilleur, la retouche arrive plus vite.

À essayer ensuite, non compté : quand SINA renvoie la modification avec sa phrase et « fini », afficher la phrase si la
modification réussit et est vérifiée, sans quatrième réflexion (l'honnêteté est gardée : rien n'est dit avant le résultat
réussi). Encore environ 0,45 € sur dix retouches. Aujourd'hui, `done` n'est jamais lu par la boucle (`loop.ts`
l. 278-333) : toute réponse avec une action relance une réflexion.

### 3.4 Chaque retouche range la carte entière du site dans le fil

**Ce que fait le code.** Toute modification du site (`custom.edit`, `custom.structure`, `custom.undo`, `custom.photo`)
rend `customTheme: themeCard(...)` (`custom-theme/tools.ts` l. 136-160 et 76-89) : toutes les pages, toutes leurs
sections, les points à revoir et jusqu'à 60 photos d'exemple. Pour un site de 8 pages, la carte dépasse 6 000
caractères et le Studio en garde un début coupé (`{ truncated, preview }`), qui n'apprend rien de neuf à SINA.

**Combien.** Environ 1 850 jetons inutiles par modification : écrits une fois (0,013 €), relus à chaque réflexion
suivante (0,0003 € chacune), réécrits à chaque réécriture du fil, et lus par la relectrice (jusqu'à 14 000 caractères de
faits). Environ 0,025 € par modification ; dix à quinze modifications : **environ 0,25 €** (0,20 à 0,40 €).

**Correction.** Une modification rend seulement ce qui a changé : la version, la section touchée, les points à revoir
nouveaux. La carte entière reste dans `custom.show`.

**Pour le client** : égal.

### 3.5 Les changements de liste d'outils réécrivent tout le fil

**Ce que fait le code.** La liste des notices vient avant le fil. Quand elle change, tout le fil derrière elle est
réécrit. C'est normal quand une autre chose le réécrit déjà au même moment ; ce n'est pas le cas :
- au choix de l'identité (`identity.choose`), l'étape passe de 1 à 2 et la liste change, alors que rien d'autre ne
  bouge (les planches restent les mêmes images jusqu'à la fin de la marque) ;
- au premier résultat du site, la liste « avant le site » devient « après le site » (`conversation.ts` l. 61-63).
  Aujourd'hui caché par le changement d'effort de ce moment fort ; dès l'effort constant, ce sera une réécriture de plus.

Et un défaut qui fait faire des tours de plus : aux étapes 2 et 3, **la liste ne contient ni `brand.finish` ni
`identity.choose`** (l'étape 2 cherche des outils `logo.*` qui n'existent plus, l. 52), alors que le contexte de ces étapes
dit à SINA de les appeler (`journey.ts` l. 391 et 399). Pour refaire un logo ou changer d'identité, elle doit d'abord
demander la notice (`tools.open`) : une réflexion de plus à chaque fois.

**Correction.** Une seule liste pour toute la marque (étapes 1, 2 et 3 : 15 outils, dont `brand.finish`), et une seule
pour tout le site (avant et après sa création : environ 24 outils, ou 20 en laissant en une ligne `shop.buy_features` et
`prix.preuve`).

**Combien.**
- Marque : le fil réécrit au choix de l'identité (environ 18 000 jetons, 0,13 €) et deux listes écrites en moins (0,06 €),
  moins une liste un peu plus longue (0,01 €) : **environ 0,18 €**, plus 0,04 € par `tools.open` évité.
- Site (une fois l'effort constant en place) : le fil d'environ 30 000 jetons (0,21 €) et une liste de moins (0,09 €),
  moins 0,02 € de lecture en plus : **environ 0,28 €**.
- À décider (dépasse la règle des 20 notices) : une seule liste pour les angles et l'activité, environ 0,20 € de plus
  (le choix de l'angle réécrit aujourd'hui environ 30 000 jetons de fil).

**Pour le client** : meilleur (SINA a sous la main l'outil dont sa consigne parle).

### 3.6 Les consignes fixes des étapes 0 à 5 partent au plein tarif à chaque réflexion

**Ce que fait le code.** Le 22 novembre, les consignes d'étape sont passées dans la partie gardée en mémoire, mais
seulement celles qui sont dans `STEP_GUIDES` (étapes 6 à 13, `journey.ts` l. 374). Les étapes 0 à 5 écrivent leur
consigne directement dans le contexte (`journey.ts` l. 331, 340, 343, 424, 449-452, 459, 470, 475 ; `brandFinishContext`
l. 391-399) : textes fixes de 750 à 2 000 caractères, payés à chaque réflexion. Même chose pour les deux lignes de
repères du parcours (1 050 caractères), dont la légende ne change jamais.

**Correction.** Mettre ces textes fixes avec les notices de l'étape (la liste change à chaque étape de toute façon), et ne
laisser dans le contexte que ce qui bouge (les sujets encore à aborder, l'état, les identités, les angles montrés). Avec
la liste unique de la marque (3.5), une seule consigne pour les étapes 1 à 3.

**Combien** (calcul : jetons × réflexions × 0,0034 €, moins une écriture par étape) : « faire connaissance » 870 jetons ×
25 = 0,07 € ; marque 1 000 × 15 = 0,04 € ; angles 1 150 × 10 = 0,03 € ; activité 1 100 × 14 = 0,05 € ; légende du
parcours aux étapes suivantes 300 × 40 = 0,04 €. **Environ 0,22 €.**

**Pour le client** : égal.

### 3.7 L'état du projet lu à chaque réflexion contient du bruit et des doublons

`snapshot.ts`, au plein tarif à chaque réflexion dès que le projet existe :
- **« Décisions mémorisées »** (l. 18) prend toutes les clés `syna.*`, sans filtre : le site entier
  (`syna.custom_theme`), son historique, l'empreinte du site, la preuve des remises, l'identité choisie et le dessin de
  l'accueil sont recopiés en **débuts d'objets coupés à 300 caractères**, illisibles pour SINA. Environ 300 à 2 000
  caractères selon l'étape.
- **« Changements déjà faits dans ce fil »** (l. 25) recopie les 12 derniers changements, qui sont déjà dans le fil, avec
  les résultats d'outils (« changements vérifiés »). Environ 1 400 caractères.
- **« Parcours Pilote »** (l. 33) : le Pilote est retiré depuis le lot 1.
- **« Site : pas encore construit »** (l. 31) pour tout site créé par SINA au lot 4 (il ne lit que l'ancien moteur) : une
  phrase fausse, qui contredit le contexte de l'étape du site et peut pousser SINA à vérifier avec un outil (à
  vérifier).

**Correction.** Ne garder dans les décisions que les décisions et les faits, sans les valeurs qui sont des objets (comme
`fiche.ts` l. 104-106 le fait déjà) ; retirer les changements récents et la ligne du Pilote ; dire l'état du site du
lot 4.

**Combien.** Environ 700 jetons par réflexion sur environ 70 réflexions : 700 × 70 × 0,0036 = **environ 0,18 €**
(0,10 à 0,25 €). **Pour le client** : meilleur (SINA lit moins de bruit, et plus de phrase fausse sur son site).

### 3.8 Des refus ordinaires sont traités comme des échecs à expliquer

**Ce que fait le code.** Un résultat refusé qui n'est pas marqué « interne » fait un moment fort « échec »
(`conversation.ts` l. 118) : effort élevé, puis la relectrice. Or beaucoup de ces refus sont des erreurs d'argument de
SINA ou des étapes normales : « Cette identité n'est pas dans la proposition affichée », « Angle inconnu »,
« Variante introuvable », « Produit introuvable », « L'angle est déjà choisi », « Impossible de valider : … » à
l'activité, « Sujets pas encore abordés » à la confirmation de la fiche, « Rien n'est enregistré : … » pour une
retouche du site qui casse une règle (`tools/identity.ts` l. 237, `tools/angles.ts` l. 62 et 83, `tools/catalogue.ts`
l. 76, 94 et 122, `tools/activity.ts` l. 69, `custom-theme/tools.ts` l. 147).

**Correction.** Réserver le moment « échec » aux vrais échecs : une création en arrière-plan qui rate, un travail payant
refusé, une panne d'outil, un budget insuffisant. Les refus de règle et d'argument sont marqués « internes » : SINA les
corrige seule.

**Combien.** Par refus évité : une relecture (environ 0,025 €), la réflexion plus longue de l'effort élevé (environ
0,015 €), parfois une réécriture demandée par la relectrice (0,01 € en moyenne) : environ 0,05 €. Deux à cinq par
projet : **0,10 à 0,25 €**. **Pour le client** : meilleur (réponse plus rapide, pas d'excuse pour un simple refus).

### 3.9 Le contrôle gratuit fait payer des réécritures pour rien

**Ce que fait le code.** Pendant « faire connaissance », un message qui pose plusieurs questions est réécrit
(`controle-message.ts`). Deux défauts, vérifiés sur des exemples :
1. **Faux positifs.** Les mots « nom » et « site » comptent comme des coordonnées (l. 13). « As-tu déjà un nom, un logo
   ou un site ? » compte 2 questions ; « Quelle adresse e-mail veux-tu afficher sur ton site ? » en compte 3 ; « Quel nom
   de domaine aimerais-tu pour ton site ? » en compte 2. Toutes sont réécrites, alors que ce sont des questions uniques,
   celles que la fiche demande justement (« existant », « coordonnées » une par une).
2. **Mauvais ordre.** Le contrôle compte les points d'interrogation (l. 16-22) **avant** que le code gratuit retire la
   question répétée à la fin du message (`withoutRepeatedQuestion`, `loop.ts` l. 276). « Super. Tu vends sur quelle
   plateforme ? » avec la même question compte 2 et part en réécriture, alors que le nettoyage gratuit l'aurait réglé.

**Correction.** Faire le nettoyage gratuit avant de compter ; retirer « nom » et « site » de la liste ; compter des
coordonnées demandées ensemble seulement quand elles sont énumérées comme des choses à donner (pas comme des choix).

**Combien.** Une réécriture à cette étape : contexte 2 300 jetons (0,008 €), réflexion 700 jetons (0,013 €), lectures
(0,001 €) : 0,022 €. Deux à cinq par conversation : **environ 0,08 €**. **Pour le client** : meilleur. La réponse n'attend
plus une deuxième réflexion, et une bonne question n'est plus changée en une autre (la réécriture n'est jamais
recontrôlée).

### 3.10 La fiche est donnée deux ou trois fois dans le même contexte

Depuis le 22 novembre, la fiche entière est relue dès « faire connaissance ». Mais le contexte de cette étape redonne
aussi « Ce que tu sais déjà » (chaque réponse, jusqu'à 400 caractères) et « Tes notes » (`journey.ts` l. 329-333) :
**les mêmes paroles deux fois**, et une troisième dans le fil. À l'activité, « Déjà dit par le client à l'étape 0 » redonne
encore les coordonnées, le lieu, le prix et l'offre (jusqu'à 2 400 caractères, l. 426-427).

**Correction.** Garder la fiche seule, et à leur place une ligne « tout ce qu'il a dit est dans sa fiche ci-dessous : ne
redemande rien de ce qui y est ».

**Combien.** « Faire connaissance » : 170 jetons en moyenne × 25 × 0,0036 = 0,015 € ; activité : 500 × 14 × 0,0036 =
0,025 €. **Environ 0,05 €.** **Pour le client** : égal.

### 3.11 Le compte rendu de la création du site, 6 000 caractères à chaque réflexion

`journey.ts` l. 440 recopie le compte rendu entier à chaque réflexion de l'étape du site, après sa création, au plein
tarif ; le résultat de la tâche, lui, est coupé à 1 500 caractères (`loop.ts` l. 222).

**Correction.** Ranger le compte rendu entier une seule fois dans le fil, avec le résultat de la tâche (il est alors gardé
en mémoire), et ne laisser dans le contexte que ce qui reste à régler (« À compléter », photos de produits à importer,
ressemblance).

**Combien.** 2 000 jetons × 25 réflexions × 0,0034 € = 0,17 €, moins une écriture (0,014 €) : **environ 0,15 €**.
**Pour le client** : égal.

### 3.12 Les notices : des schémas d'arguments très bavards

Les schémas font 49 % des notices (2.1). Ils sont écrits dans la forme la plus longue (« "type":"string" » 484 fois, des
bornes comme « -9007199254740991 », des « anyOf » pour dire « ou rien »), et plusieurs descriptions récrivent déjà les
mêmes arguments en clair (`shop.offers`, `custom.structure`). Deux notices inutiles à « faire connaissance » :
`project.profile` et `services.profile` (3 072 caractères ; la consigne dit d'utiliser `start.answer`), et
`start.state`, toujours présent, qui relit ce que SINA a déjà dans son contexte (fiche, sujets manquants).

**Correction.** Écrire les arguments dans une forme courte (une ligne de type par argument, ses bornes, ses choix), une
seule fois (la description ou le schéma, pas les deux) ; le contrôle des arguments par le code ne change pas, et une
notice est toujours rendue si SINA se trompe. Retirer `start.state` de « toujours sous la main » et les deux fiches de
l'étape 0. À essayer d'abord au banc d'épreuves, sans IA payante pour la forme, puis sur un vrai essai.

**Combien.** Les notices coûtent environ 0,53 € d'écritures (dix listes écrites par projet, 73 000 jetons) et 0,13 € de
lectures. Un cinquième de moins : **environ 0,15 €**. **Pour le client** : égal.

### 3.13 Les pièces jointes listées à chaque réflexion

`loop.ts` l. 599 liste toutes les pièces jointes du fil (nom, taille, identifiant, début des documents) au plein tarif à
chaque réflexion. Avec 3 à 8 photos, 120 à 320 jetons × 90 réflexions × 0,0036 € : **0,04 à 0,10 €**.

**Correction.** Écrire la description de chaque pièce jointe dans le fil, sur la ligne du message qui l'apporte (gardée
en mémoire), et ne lister dans le contexte que celles dont le message est sorti de la fenêtre du fil. **Pour le
client** : égal.

### 3.14 Une raison écrite pour chaque action, que personne ne lit

La forme de réponse demande `"why": "raison courte"` pour chaque action (`prompt.ts` l. 44, `loop.ts` l. 61). Elle n'est
montrée nulle part et n'est pas reprise dans le fil. Environ 25 jetons × 1,3 action × 100 réflexions = 3 250 jetons de
sortie : **environ 0,06 €**. Correction : la retirer de la forme et de la consigne. **Pour le client** : un peu plus
rapide.

### 3.15 La relectrice : petits réglages

1. **Sa consigne a un point de mémoire de 5 minutes** (`loop.ts` l. 631, pas de `memoireLongue`). Les relectures sont
   espacées de plus de 5 minutes : la consigne est réécrite à chaque fois, 1,25 fois son prix, plus cher que sans mémoire.
   Mémoire d'une heure : **environ 0,04 €**.
2. **L'ordre.** La relectrice lit le brouillon, puis le contrôle gratuit passe derrière et peut faire réécrire une seconde
   fois (trois réflexions et une relecture pour un message). Faire le contrôle gratuit d'abord, puis relire la version
   corrigée. Rare : non compté.
3. **Elle ne voit pas ce que SINA voit** (à vérifier). Sa « seule source de vérité » est la liste des résultats depuis le
   dernier message du client. Or ce que SINA présente vient souvent du contexte : les noms de domaine et l'idée des
   identités (`journey.ts` l. 473-480), le compte rendu du site (l. 440). La relectrice peut donc demander de retirer un
   fait vrai, et faire payer une réécriture qui appauvrit le message. Lui donner les quelques lignes de l'état de l'étape
   coûte environ 0,007 € par relecture ; c'est rentable dès qu'une relecture sur sept évite une fausse réécriture. Non
   compté.
4. Ce qu'elle pourrait laisser au code, à chaque réponse et pas seulement aux moments forts : un nom d'outil dans le
   message, « mon équipe », « ma stratège », « le jury », un montant en euros à côté de « budget IA », le vouvoiement,
   « maquette » à l'étape du site, « rien n'a été débité » sans chiffre. Ces contrôles gratuits rejoindraient
   `controle-message.ts` : meilleur pour le client, gain non chiffrable.

### 3.16 Des images qui changent placées dans la partie gardée en mémoire (à vérifier)

Les images du parcours passent avant le fil, gardées en mémoire (`llm.ts` l. 300-305). Une partie change souvent :
- après la validation du site, les captures de l'accueil (jusqu'à 5 bandes, environ 7 000 jetons) sont refaites à chaque
  version du site, donc **à chaque retouche** (`attachments.ts` l. 199-238) ;
- les photos et la galerie « créées ces 20 dernières minutes » entrent puis sortent au bout de 20 minutes (l. 205 et
  214) ; l'accueil dessiné reste deux heures (l. 259) ; d'anciennes maquettes portent « créée il y a quelques minutes »
  pendant 15 minutes (l. 193).

Chaque changement réécrit les images et tout le fil derrière elles (environ 0,30 € pour un fil de 35 000 jetons). Une
retouche après la validation du site coûte donc environ 0,30 € de mémoire, contre 0,025 € si ces images-là partaient
après le fil, au plein tarif. **Correction** : garder en mémoire seulement les images stables (planches, marque finie,
planche de la charte) ; envoyer après le fil celles qui changent. **Combien** : de 0 à 0,60 € selon le nombre de
retouches après la validation du site (non mesuré). **Pour le client** : égal.

Remarque pour l'expérience (pas une économie) : pendant les retouches de l'étape du site, **avant** sa validation, SINA ne
reçoit aucune capture de son site (les captures ne viennent qu'avec `customChosenAt` ou l'ancien `siteMode`,
`attachments.ts` l. 199). Elle retouche sans voir. À vérifier avec le compte rendu du lot 4.

### 3.17 Pour le chantier de l'effort (en cours), sans gain compté ici

`JUDGE_TOOLS` (`loop.ts` l. 564) met l'effort élevé après de simples lectures (`custom.show`, `custom.section`) et après
chaque résultat de tâche, et tout message « [Élément désigné » est en effort élevé (l. 570) : une retouche fait trois
réflexions en effort élevé, alors que SINA ne juge rien en lisant une section (elle ne voit pas le site, 3.16). Si le
chantier de l'effort garde des moments forts, réserver l'effort élevé à la présentation d'un résultat et au jugement
d'une image.

### 3.18 Les doublons entre la consigne générale et les consignes d'étape (clarté)

La partie « Le parcours » de la consigne générale (`prompt.ts` l. 34-40, environ 3 500 caractères) redit en plus court les
consignes des étapes (marque, angles, activité, site) ; « une question à la fois pendant faire connaissance » est écrit
quatre fois (consigne générale deux fois, contexte de l'étape, relectrice) ; l'emploi de `start.answer` et `start.note`
est expliqué trois fois (consigne générale, contexte de l'étape, leurs notices). La consigne générale est gardée en
mémoire et commune à tous les clients : le gain est de quelques centimes. L'intérêt est d'avoir **une seule place par
règle**, pour éviter qu'elles se contredisent (exemple : la consigne générale dit « plusieurs questions simples
ensemble, six au plus », puis « pendant faire connaissance, une à la fois »). Non compté.

### 3.19 Réponses et attente

- Les réponses de SINA ne sont pas trop longues en général (25 mots au plus avant une question). Exception : le compte
  rendu du site, où la consigne demande une dizaine de points dans un seul message (`STEP_GUIDES[6]`). Le dire en trois
  parties courtes (ce que c'est, ce qui reste, la suite) serait plus clair pour le client ; gain de sortie négligeable.
- Attente : les images du parcours sont recalculées (réduites) à chaque réflexion, jusqu'à 12 par appel
  (`attachments.ts` l. 154) ; les garder prêtes par image et par taille ferait gagner une à trois secondes par réflexion,
  sans rien changer à ce que voit SINA.

---

## 4. Ce que le code pourrait faire sans IA, en résumé

- Lire la section désignée au clic (3.3) ; mettre la carte de l'activité à jour après chaque enregistrement (3.2).
- Compter les questions après le nettoyage gratuit, sans faux positifs (3.9).
- Les contrôles de forme de la relectrice qui ne demandent pas de jugement (3.15, point 4).
- Trier ce qui est un vrai échec et ce qui est une simple erreur d'argument (3.8).

## 5. À vérifier au prochain essai (gratuit, dans l'administration)

1. Le nombre de réflexions par étape et la part écrite en mémoire (`coutParEtape`) : confirme 3.1, 3.2, 3.3 et 3.5.
2. La taille réelle du fil à chaque étape (le calcul suppose 10 000 à 35 000 jetons).
3. Combien de fois SINA appelle `start.state`, `catalogue.list`, `custom.show` et `tools.open`.
4. Si `custom.section` est coupée (résultats `{ truncated }` dans le fil).

---

## Gains restants, du plus gros au plus petit

Chiffres estimés d'après le code et les mesures des lots, au prix officiel ; pas mesurés sur un vrai essai. Les gains
se recouvrent un peu (3.4 et 3.1 touchent tous deux le fil) ; le total les compte une fois.

| # | Correction | Euros par projet | Effet pour le client |
|---|---|---|---|
| 1 | Le fil n'est raccourci et ne glisse qu'au changement d'étape (ou au-delà de 60 000 jetons) ; au minimum, aligner les deux règles des 40 messages (3.1) | **≈ 1,00 €** (0,50 à 1,30) ; alignement seul ≈ 0,30 € | égal |
| 2 | Retouche du site : la section désignée est lue par le Studio avant la première réflexion (3.3) | **≈ 0,45 €** (0,30 à 0,60) | meilleur : plus rapide |
| 3 | Activité : enregistrer avec la question suivante, carte mise à jour toute seule (3.2) | **≈ 0,40 €** (0,30 à 0,50) | meilleur : une attente au lieu de deux ou trois |
| 4 | Une seule liste d'outils pour le site, avant et après sa création (3.5) | ≈ 0,28 € (dès l'effort constant) | égal |
| 5 | Une retouche rend ce qui a changé, pas la carte entière du site (3.4) | ≈ 0,25 € (0,20 à 0,40) | égal |
| 6 | Consignes fixes des étapes 0 à 5 et légende du parcours avec les notices (3.6) | ≈ 0,22 € | égal |
| 7 | Une seule liste d'outils pour toute la marque, avec `brand.finish` et `identity.choose` (3.5) | ≈ 0,18 € (+ 0,04 € par notice demandée en moins) | meilleur : moins de tours |
| 8 | État du projet sans objets coupés, sans doublon des changements, sans Pilote, avec l'état vrai du site (3.7) | ≈ 0,18 € (0,10 à 0,25) | meilleur : moins de bruit, plus de phrase fausse |
| 9 | Les refus ordinaires ne sont plus des « échecs » (ni effort élevé, ni relectrice) (3.8) | ≈ 0,17 € (0,10 à 0,25) | meilleur : plus rapide |
| 10 | Arguments des notices écrits court, une seule fois ; trois notices inutiles retirées (3.12) | ≈ 0,15 € | égal (à essayer au banc d'abord) |
| 11 | Compte rendu du site rangé une fois dans le fil (3.11) | ≈ 0,15 € | égal |
| 12 | Contrôle gratuit : après le nettoyage, sans « nom » ni « site » (3.9) | ≈ 0,08 € | meilleur : plus rapide, la bonne question reste |
| 13 | Pièces jointes décrites dans le fil, pas à chaque réflexion (3.13) | 0,04 à 0,10 € | égal |
| 14 | Retirer la raison écrite de chaque action (3.14) | ≈ 0,06 € | un peu plus rapide |
| 15 | Fiche donnée une seule fois (étapes 0 et 5) (3.10) | ≈ 0,05 € | égal |
| 16 | Consigne de la relectrice en mémoire d'une heure (3.15) | ≈ 0,04 € | égal |
| | **Total** | **≈ 3,50 €** (fourchette 2,40 à 4,50 €) | égal ou meilleur partout |

Non comptés, à décider ou à mesurer :
- images qui changent sorties de la partie gardée en mémoire (3.16) : 0 à 0,60 € ;
- fin de retouche sans réflexion de plus, la phrase prête n'étant affichée qu'après une modification réussie (3.3) :
  environ 0,45 € ;
- une seule liste d'outils pour les angles et l'activité (dépasse la règle des 20 notices) (3.5) : environ 0,20 €.

Remarque honnête sur le total : l'audit 01 estimait toute la conversation à environ 6,50 €, avant les corrections du
22 novembre. Mes gains sont élevés par rapport à ce chiffre, parce que ce calcul comptait une réflexion par réponse et ne
comptait pas les réécritures du fil tous les 40 messages. Le nombre réel de réflexions par étape et la part réécrite en
mémoire se lisent maintenant dans Administration › Consommation : ce sont les deux chiffres à lire au prochain essai,
avant de choisir dans quel ordre faire ces corrections.
