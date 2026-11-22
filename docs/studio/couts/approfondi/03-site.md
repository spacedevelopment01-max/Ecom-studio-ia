# La création du site : ce qui reste à gagner (audit approfondi)

22 novembre 2026. Lu sur la dernière version de « SINA évolue » (`claude/evolution-sina`, enregistrement `9b67a29a`),
dans un dossier de travail à part. **Aucun fichier du Studio modifié, aucun appel payant.**

Fichiers lus : `src/lib/syna-agent/custom-theme/` (surtout `site-job.ts`, `tools.ts` pour la conception, `design.ts`,
`second-regard.ts`, `originality.ts`, `brand.ts` pour les textes, leur relecture et les photos, `gallery.ts` pour le
contrôle des photos, `looks.ts` et `shots.ts` pour les regards et les captures, `controle-image.ts`, `knowledge.ts`,
`photo-budget.ts`, `photos-produits.ts`), `src/lib/syna-agent/dessin/`, `src/lib/syna-agent/mockup-code/`, et pour
comprendre la mise en mémoire et le différé : `src/lib/ai/llm.ts`, `worker/handlers.ts`.

Déjà fait, non redit ici : mémoire d'une heure en différé, résumé du client gardé en mémoire pour chaque section
(`bc02e5c5`), images comptées au jeton, Haiku 5.5 au niveau léger.

## Prix et hypothèses

- Prix : Opus 5.5 à 4 $ (entrée) et 20 $ (sortie, réflexion comprise) le million de jetons ; relu en mémoire 0,20 $ ;
  écrit en mémoire d'une heure 8 $ ; Haiku 5.5 à 0,10 $ et 0,50 $ ; différé −50 % ; 1 $ = 0,90 €.
- Une photo du site (OpenAI, qualité haute, au jeton) : environ **0,05 €** avec la photo du produit jointe et son
  contrôle (rapport `03-couts-des-images.md` : 1 372 jetons produits pour un 1024 × 1536). À vérifier sur une facture.
- Une section écrite coûte **0,06 € en moyenne** (mesuré, `SECTION_TEXT_TYPICAL_MICRO`). Je le décompose ainsi
  (estimé, environ 3 caractères par jeton) : 3 000 jetons de demande au plein tarif, 11 000 relus en mémoire (consigne,
  cahier, dossier), 2 600 jetons écrits, dont environ 1 000 à 1 600 de réflexion et le reste en réponse. **La part de
  réflexion n'est pas connue** : elle se mesure sans rien payer (voir la partie 9).
- Site de référence : une boutique d'un produit, environ **50 sections** (43 à 70), **10 pages**, **15 photos**.

---

## 1. Le chemin d'une création de site

`site.create` (`site-job.ts` l. 255) met en file une seule tâche, `syna.site`, servie en différé (`worker/handlers.ts`
l. 59 et 73). Tout se suit **l'un après l'autre** :

1. **Conception** (`tools.ts` `runDesign`, l. 301) : concepteur → juge de l'ordre (qui rend la conception corrigée) →
   juge de l'originalité → second regard → une reprise du concepteur si un point est refusé → juge et second regard
   relisent la reprise → une dizaine de correcteurs sans IA (variété, rythme, allures, famille, signature).
2. **Structure** (fiches, menu) : sans IA.
3. **Montage** (`brand.ts` `runCustomBrandJob`, l. 905) : plan des textes → une écriture **par section** (43 à 70
   appels) → relecture de tous les textes → 0 à 6 reprises → relecture de toutes les descriptions de photos → 0 à 8
   redescriptions → chaque photo, puis son contrôle → deux regards en image.
4. **Contrôle par l'image** (`controle-image.ts`) : sans IA.

Le différé (`llm.ts` l. 435) : chaque appel est déposé **seul** dans son paquet chez le fournisseur ; il attend au plus
10 minutes ; la tâche attend au plus **30 minutes en tout** ; au-delà, tout part au plein tarif. Le compteur est le même
pour la conception et le montage (même tâche).

---

## 2. Chaque appel payant

| # | Appel | Où | Modèle, effort | Ce qui part | Mémoire | Sortie | Fois | Ce qui fait repayer |
|---|---|---|---|---|---|---|---|---|
| 1 | Concepteur | `tools.ts` l. 367, appelé l. 469 | Opus 5.5, moyen | consigne et 4 cahiers ≈ 62 000 car. (≈ 20 000 jetons) ; demande : dossier, bibliothèque de la famille, partitions, références, sites déjà faits (≈ 45 000 à 60 000 car., à mesurer) | consigne en mémoire 1 h ; demande au plein tarif | plafond 64 000 jetons ; **30 000 à 46 000 écrits** (mesuré le 18 novembre) | 1 | réponse coupée : relancée en entier avec plus de place (`llm.ts` l. 931) |
| 2 | Juge de l'ordre | `tools.ts` l. 470 | Opus 5.5, moyen | sa consigne et 4 cahiers ≈ 50 000 car. ; **la même demande que 1** + la conception entière (≈ 25 000 jetons) | consigne écrite 1 h, **jamais relue** | **rend toute la conception** (même taille que 1) | 1 | idem |
| 3 | Juge de l'originalité | `tools.ts` l. 451 (l. 475, 491) | Opus 5.5 (qualité, difficile) | consigne et 2 cahiers ≈ 24 000 car. ; dossier 7 000 car., références 5 000, accueil et page qui vend | consigne 1 h | 2 500 | 1 à 2 | — |
| 4 | Second regard | `tools.ts` l. 457 (l. 482, 498) | Opus 5.5 | consigne et cahier de l'ordre ≈ 8 000 car. ; dossier 6 000 car. et **toutes les pages importantes** (jusqu'à 36 000 jetons) | consigne 1 h | 3 000 | 1 à 2 | — |
| 5 | Reprise du concepteur | `tools.ts` l. 489 | Opus 5.5, moyen | demande de 1 + conception + points refusés | consigne relue | **rend toute la conception** | 0 à 1 | idem 1 |
| 6 | Plan des textes | `brand.ts` l. 992 | Opus 5.5, moyen | consigne et cahier ≈ 18 000 car. ; dossier et liste des sections | consigne 1 h, jamais relue | 36 000 au plus ; mesuré 0,42 € | 1 | coupée : relancée |
| 7 | Référencement à part | `brand.ts` l. 1017 | Opus 5.5 | dossier, pages | — | 4 000 | 0 à 1 (si le plan l'a oublié) | — |
| 8 | **Écriture d'une section** | `brand.ts` l. 1043 | Opus 5.5, moyen | consigne et cahier ≈ 24 400 car. + dossier : en mémoire ; demande ≈ 3 000 jetons (partie 3) | oui, sauf la demande | 14 000 (28 000 après coupure) ; ≈ 2 600 écrits | **43 à 70** | coupée : relancée |
| 9 | Relecture des textes | `brand.ts` l. 1107 | Opus 5.5, moyen | dossier + les textes de toutes les sections | consigne 1 h, jamais relue | 8 000 ; mesuré 0,18 € | 1 | — |
| 10 | Reprise d'une section | `brand.ts` l. 1130 | Opus 5.5, moyen | comme 8 + corrections | oui | 14 000 | 0 à 6 (2 d'ordinaire) | — |
| 11 | Description de photos oubliées | `brand.ts` l. 1222 | Opus 5.5, moyen | **dossier dans la demande** (pas en mémoire) + section | consigne seule | 6 000 | 0 à n (rare) | — |
| 12 | Relecture des photos prévues | `brand.ts` l. 1259 | Opus 5.5, moyen | dossier, direction artistique, toutes les descriptions | consigne 1 h, jamais relue | 12 000 ; mesuré 0,18 € | 1 | — |
| 13 | Redescription d'une photo | `brand.ts` l. 1300 | Opus 5.5, moyen | **dossier dans la demande**, section, autres photos | consigne relue | 6 000 | 0 à 5, puis 0 à 3 | — |
| 14 | Photo | `brand.ts` l. 1413 | OpenAI GPT Image 2.6, haute | description (3 à 6 ko) + photo du produit si elle est montrée | — | 1 image | 15 (29 au plus) | une reprise si une personne apparaît |
| 15 | Contrôle d'une photo | `brand.ts` l. 1428 → `gallery.ts` l. 177 | **Haiku 5.5**, faible | la photo (≈ 2 100 jetons) + celle du produit | — | court | 15 à 30 | — |
| 16 | Regard sur une page | `brand.ts` l. 1480 | Haiku 5.5, faible | capture de la page sur téléphone | — | 1 500 | 2 | — |

Sans IA : structure, menu, contrôle par l'image (`controle-image.ts`, `ressemblance.ts`), faits posés, répétitions,
liens morts, produits sans photo, personnes dans les descriptions.

---

## 3. Ce qui est renvoyé à chaque section (`sectionWritePrompt`, `brand.ts` l. 691)

En mémoire depuis le 22 novembre : la consigne du rédacteur, son cahier et le dossier du client.
**Encore au plein tarif dans chacune des 43 à 70 demandes** :

| Morceau | Taille estimée | Le même pour toutes ? |
|---|---|---|
| Promesse, voix, menu du plan | ≈ 750 car. | oui |
| **Titres de toutes les autres sections** (« ne les répète pas ») | ≈ 2 300 car. pour 50 sections | presque (tous sauf le sien) |
| Faits forts dits ailleurs (20 au plus) | ≈ 1 200 car. | presque |
| Liste des pages du site | ≈ 300 car. | oui |
| Parcours du visiteur sur la page | 500 à 1 200 car. | le même pour toute la page |
| Fiche du produit (pages produit) | jusqu'à 1 300 car. | la même pour toute la page |
| Conception de la section, son plan, ce que le Studio posera, formules déjà dites, même pièce ailleurs | 1 000 à 3 000 car. | propre à la section |
| Le code de la section | 475 car. en médiane (mesuré sur 165 pièces), jusqu'à 2 500 | propre à la section |

Soit **≈ 1 500 jetons communs à tout le site** et 300 à 700 communs à la page, repayés à chaque section.

---

## 4. La question posée : écrire les textes par page plutôt que par section

### Ce qui changerait
Un appel par page (10 à 12 appels au lieu de 43 à 70). Le rédacteur reçoit une fois le plan, le parcours de la page et
la fiche du produit, puis toutes les sections de la page avec leur code et leur part du plan ; il rend les textes de
toutes. Le plan des textes, la relecture et les reprises restent tels quels.

### Ce que ça gagne (sur le site de référence, avant tout différé)
- La partie commune à la page n'est plus renvoyée qu'une fois : ≈ 15 000 jetons de parcours et de fiche produit en
  moins, soit 15 000 × 4 $ / 1 000 000 = **0,06 $**.
- 40 relectures de la mémoire en moins (12 500 jetons chacune) : 40 × 12 500 × 0,20 $ / 1 000 000 = **0,10 $**.
- **La réflexion** : aujourd'hui elle recommence 50 fois (relire le plan, la voix, les règles). Si elle fait 1 000 à
  1 600 jetons par section, et 2 500 à 4 000 par page : 50 000 à 80 000 jetons deviennent 25 000 à 40 000, soit
  15 000 à 40 000 × 20 $ / 1 000 000 = **0,30 à 0,80 $**.
- Total : **0,46 à 0,96 $, soit 0,40 à 0,85 € en direct, 0,20 à 0,45 € en différé**. Plus, si la partie 3 n'est pas
  faite d'abord : la partie commune au site (0,25 €).

### La qualité
- **Meilleure à l'intérieur d'une page** : le rédacteur voit la page entière, donc il n'écrit pas deux fois la même
  formule, le même fait ou la même scène à deux sections d'écart. C'est exactement ce que le relevé des répétitions
  (`deja`) et la relecture rattrapent aujourd'hui après coup.
- **Égale d'une page à l'autre**, à condition de garder ce qui protège déjà : le plan (titres, messages, faits répartis),
  les formules déjà dites et « la même pièce sur une autre page » (`memePieceAilleurs`), calculés avant chaque page.
- **Risques, à vérifier sur un essai** : une page de 13 sections rend 15 000 à 30 000 jetons ; une réponse coupée
  repaierait toute la page (relance automatique avec plus de place). Parade : plafond large, et une page de plus de 8
  sections écrite en deux moitiés. Une écriture longue peut soigner moins les dernières sections : à juger sur l'essai,
  par le propriétaire.
- Un premier pas sans risque : **les pièces pratiques ensemble** (en-tête, pied de page, recherche, panier de côté,
  panier, compte, mentions légales, page introuvable : 7 à 9 sections courtes et factuelles) en un seul appel.

**Mon avis** : à faire, en deux temps (pièces pratiques, puis pages), avec un essai sur deux clients inventés et le
compte rendu de la relecture (nombre de sections refusées) comparé à aujourd'hui.

---

## 5. Le différé qui s'arrête après 30 minutes : la même économie, autrement

Le propriétaire a refusé d'allonger l'attente : je ne le propose pas, ni de couper la tâche en deux pour avoir deux fois
30 minutes (ce serait la même chose déguisée).

### Ce qui se passe probablement aujourd'hui (à mesurer)
La conception seule écrit 30 000 à 46 000 jetons au concepteur, autant au juge de l'ordre, autant à la reprise. Un
modèle écrit quelques dizaines de jetons par seconde : chacun de ces trois appels prend vraisemblablement **8 à 12
minutes**, plus l'attente chez le fournisseur. **La conception peut donc user à elle seule les 30 minutes** : alors le
plan, les 43 à 70 sections, les relectures et les reprises partent tous au plein tarif. Le rapport 01 supposait « une
vingtaine d'appels » en différé ; il ne comptait pas la conception. Le temps réellement attendu est compté par le Studio
(`deferredWaitedMs`) : à lire sur le prochain essai, sans rien payer.

Risque à vérifier au passage : un appel déposé en différé et encore en cours 15 minutes après (10 minutes de patience
puis 5 de grâce, `llm.ts` l. 471-472) **ne repart pas en direct : il échoue**, son coût est retenu comme incertain, et
la conception s'arrête (« Conception non faite »). Une conception de 46 000 jetons est près de cette limite.

### Ce qui permet d'en faire plus dans les mêmes 30 minutes
1. **Déposer ensemble ce qui ne dépend pas l'un de l'autre**, dans un seul paquet : le fournisseur les traite en même
   temps, et la tâche n'attend qu'une fois. Sans rien changer à la qualité :
   - le juge de l'originalité et le second regard (ils lisent la même conception), puis leurs secondes lectures ;
   - les reprises de sections après la relecture (chacune porte sur une section différente) ;
   - les redescriptions de photos après leur relecture ;
   - avec l'écriture par page : les fiches des produits ensemble, puis les pages pratiques ensemble.
2. **Des réponses plus courtes à la conception** (partie 6) : 8 minutes de moins par appel concerné.
3. **Donner la patience aux paquets qui rapportent le plus** : un paquet de 10 pages (≈ 2,50 $ au plein tarif) attendu
   5 minutes rapporte 1,25 $ ; le concepteur seul (≈ 0,80 $) attendu 10 minutes rapporte 0,40 $. Quand il ne reste plus
   assez de patience pour les deux, le paquet passe d'abord.

### Ce que ça gagne
Les textes du montage (plan, sections, relectures, reprises) coûtent environ 3 € au plein tarif après les parties 3 et
4. En passer 40 à 60 points de plus en différé : 3 € × 50 % × 40 à 60 % = **0,60 à 0,90 €**, jusqu'à 1,20 € si presque
tout y passe. Proche des 1,30 € qu'aurait rapportés l'attente plus longue, **sans attendre plus longtemps**.

### L'expérience
**Meilleure** : aujourd'hui, 50 appels l'un après l'autre, puis 15 photos l'une après l'autre. Avec les paquets et les
photos créées trois ou quatre à la fois (rien ne coûte plus : partie 7), le site arrive plus tôt. Estimé : 10 à 20
minutes de moins ; à mesurer.

---

## 6. La conception : relectures en double et reprises qu'un contrôle par le code éviterait

### 6.1 Le juge de l'ordre et la reprise réécrivent toute la conception
Le juge de l'ordre « rend la conception CORRIGÉE et complète » (`design.ts` l. 161) : il recopie les 50 à 70 sections
avec leur raison, ce qu'elles disent et leurs photos, alors qu'il en change d'ordinaire quelques-unes. La reprise du
concepteur fait de même. **Correction** : qu'ils rendent la liste de leurs changements (remplacer telle section par
telle autre avec sa raison, déplacer, changer un parcours, une partition, la famille) ; le Studio les applique et
contrôle le résultat, comme il le fait déjà pour ses propres corrections. Ce qui ne s'applique pas est dit.
- Gain : ≈ 20 000 jetons écrits en moins par appel concerné, soit 20 000 × 20 $ / 1 000 000 = 0,40 $. Le juge passe
  toujours, la reprise environ une fois sur deux (à mesurer) : **0,60 $, soit 0,55 € en direct, 0,27 € en différé**.
- Expérience : égale (le même juge, la même reprise, les mêmes contrôles), plus rapide (≈ 8 minutes par appel), et moins
  de risque de dépasser la limite du différé.

### 6.2 La reprise est lancée pour des points que le code corrige ensuite lui-même
La liste des points refusés (`tools.ts` l. 487) mélange ce que les juges refusent et ce que le contrôle du Studio
trouve : variété entre sites, rythme, allures, famille, signature, style, photos que seul le client peut donner. Or,
**après** la reprise, le Studio corrige lui-même la plupart de ces points sans IA (`fitVarieteSites`,
`fitVarietePieces`, `fitRythme`, `fitFormes`, `fitFamille`, `fitStyle`, `fitSignature`, remplacement des pièces aux
photos introuvables, l. 510 à 590). **Correction** : passer ces correcteurs avant de décider la reprise, puis faire
juger la version corrigée ; ne payer la reprise que pour ce qui reste (refus des juges, objections sans réponse, règles
que le code ne sait pas réparer).
- Une reprise coûte ≈ 1 $ au plein tarif (≈ 45 000 jetons lus, 40 000 écrits), ≈ 0,50 $ après 6.1, plus la seconde
  lecture des deux juges. Combien de fois elle n'a été lancée que pour des points réparables par le code : **inconnu**,
  à lire dans les traces. Gain estimé : **0,05 à 0,35 €**.
- Expérience : égale ou meilleure (les juges lisent la version que le client recevra), plus rapide quand la reprise est
  évitée (≈ 10 minutes).

### 6.3 Trois relectures de l'ordre
Les dix règles d'or, la partition de la page et le nombre de sections sont vérifiés **trois fois** : par le juge de
l'ordre (points 1 à 3 de sa consigne), par le second regard (points A, C et E) et par le code (`ordreGaps`, `ordre.ts`
l. 177). Seuls deux points du second regard demandent vraiment un lecteur : « la raison du choix parle-t-elle de CE
client » (D) et « le premier écran dit-il vraiment ce qui est vendu, une preuve est-elle une vraie preuve » (F).
**Correction** : que le second regard ne juge que D et F (demande plus courte, moins de refus en double qui déclenchent la
reprise), ou qu'il soit réuni au juge de l'originalité en un seul juge qui rend deux avis (ils lisent presque le même
dossier ; celui qui fait reste séparé de celui qui juge). Gain : **0,03 à 0,07 €** ; surtout moins de reprises inutiles
(6.2). À décider par le propriétaire si la réunion des deux juges est retenue.

### 6.4 Mise en mémoire de la grande demande : pas rentable
J'ai vérifié : mettre en mémoire la grande demande du concepteur pour la reprise coûte plus qu'il ne rapporte avec la
mémoire d'une heure (écrite 2 fois, relue une seule fois : 2,1 contre 2 aujourd'hui). À ne pas faire.

---

## 7. Les photos

- **Photos créées que personne ne verra ?** J'ai cherché les photos cachées sur téléphone ou sur ordinateur dans les
  feuilles de style des pièces : aucune. Les cartes, les vignettes de produits, le panier et la recherche ne créent
  rien (vraie photo ou « Ta photo ici »). Reste **la page introuvable**, qui a sa photo créée (`FIXES`, `site-job.ts`
  l. 74) : rarement vue.
- **Images déjà payées qui pourraient servir** : la marque a déjà créé, relu par le modèle le plus fort et fait choisir
  au client, une **grande scène 16:9 sans aucun texte** (`brand-images.ts`, emplacement « hero »), et des images de
  marque (objet au logo, signes). Le site ne les reprend jamais (`clientImages` ne prend que les envois du client).
  **Proposition** : la grande scène de la planche sert d'ouverture à l'accueil quand son format le permet, et une image
  de marque déjà faite sert à la page introuvable. Gain : 2 photos et leurs contrôles, ≈ **0,10 €**. Expérience :
  meilleure (le client retrouve en ouvrant son site la scène qu'il a aimée sur sa planche). Changement visible : à
  proposer au propriétaire avant tout.
- **Les photos du client** : déjà prises en premier (photos qu'on ne peut pas inventer, puis ambiance), et les photos
  d'un site refait sont reprises sans repayer. Rien de plus à gagner sans toucher à la règle « les photos des fiches
  produits restent sur les emplacements produit ».
- **Descriptions écrites pour rien** : le rédacteur doit décrire « CHAQUE image » de sa section (`SECTION_WRITE_SYSTEM`),
  y compris les vignettes de produits, les photos que seul le client peut donner et les plans d'adresse, qui ne seront
  jamais créées. Le code sait lesquelles seront créées (`photosACreer`). **Correction** : lui donner la liste exacte.
  ≈ 10 descriptions de 300 jetons en moins, soit 3 000 × 20 $ / 1 000 000 = 0,06 $ : **0,03 à 0,05 €**.
- **Photos l'une après l'autre** : 15 photos d'environ une minute à la suite. Les créer trois ou quatre à la fois ne
  change aucun prix et fait gagner 10 minutes environ.

---

## 8. Les regards en image et les captures

- **Le regard sur la page est presque aveugle.** La capture du téléphone fait 390 × 3 600 points au plus (`shots.ts`
  l. 22) ; avant l'envoi, toute image est ramenée dans un carré de 1 568 points (`llm.ts` l. 253) : la page arrive en
  **170 × 1 568 points**, où aucun texte ne se lit, et seulement ses 3 600 premiers points (une page de 10 à 13
  sections en fait bien plus). La conversation de SINA, elle, découpe déjà ses captures en bandes de 1 200 points
  (`attachments.ts` l. 199). **Correction** : la même découpe pour ce regard (3 à 4 bandes par page). Coût : moins d'un
  centime de plus avec Haiku. Expérience : meilleure (le regard voit enfin ce qu'il juge).
- **Captures trop grandes envoyées à un modèle cher** : aucune dans ce périmètre (les deux regards sont faits par Haiku,
  et le contrôle par l'image est fait par le code). Les bandes jointes aux réponses de SINA relèvent de l'audit de la
  conversation.

---

## 9. Petits gaspillages

1. **Mémoire d'une heure imposée aux appels qui ne reviennent pas.** En différé, tout appel reçoit la mémoire d'une heure
   (`avecMemoire`, `llm.ts` l. 907) : sa consigne est écrite au double du prix, même si rien ne la relit. C'est le cas du
   juge de l'ordre (≈ 16 700 jetons), du plan (≈ 6 000), de la relecture des textes (≈ 6 300), de celle des photos
   (≈ 5 700), du juge de l'originalité quand il ne passe qu'une fois (≈ 8 000), du second regard (≈ 2 700), et du
   concepteur quand il n'y a pas de reprise (≈ 20 000). **Correction** : pas de point de mémoire sur ces appels-là.
   ≈ 45 000 à 65 000 jetons × 4 $ de trop, en partie en différé : **0,12 à 0,15 €**. Expérience : égale. (Quand beaucoup
   de clients créeront leur site dans la même heure, ces consignes, les mêmes pour tous, redeviendront utiles en
   mémoire : à revoir à ce moment-là.)
2. **Le plan des textes est limité à 40 sections** (`SitePlanSchema`, `brand.ts` l. 313) alors qu'un site en a 43 à 70.
   Le modèle écrit le plan de toutes, puis le Studio coupe à 40 sans rien dire (`salvage`, `llm.ts` l. 1016) : les
   dernières (pied de page, recherche, pages de la fin) sont payées puis jetées, et s'écrivent sans leur message, leur
   titre ni leurs faits, d'où plus de répétitions et de reprises. **Correction** : porter la limite à 90. Gain : 0,01 €
   (43 sections) à 0,09 € (70 sections, 30 entrées de 170 jetons jetées) ; qualité meilleure.
3. **Le dossier du client renvoyé au plein tarif** dans les descriptions et redescriptions de photos (`brand.ts`
   l. 1225 et 1303) au lieu d'être mis à part en mémoire : moins d'un centime par projet. À faire en passant.

---

## 10. Hors du chemin habituel

- **`dessin/`** (« dessiner puis coder », `site.dessiner`) : essai du Studio, seulement à la demande du client. Plan,
  juge des faits (Opus), cinq dessins, photos, code par le modèle d'OpenAI choisi par le propriétaire. Il n'est pas dans
  la liste des tâches servies en différé (`TACHES_EN_DIFFERE`) : son plan et ses deux relectures pourraient l'être
  (quelques centimes). Rien à compter dans un projet ordinaire.
- **`mockup-code/`** (anciennes maquettes, `syna.mockup.code`) : seulement pour les projets qui en ont déjà. Rien à
  compter dans un projet ordinaire ; le site d'aujourd'hui n'en garde que la route des images (`mockupImageRoute`).

## 11. Un écart à signaler, qui n'est pas une économie

Les règles du propriétaire disent « chaque image relue par le modèle le plus fort, une à la fois ». **Les photos du site
sont contrôlées par Haiku 5.5** (`gallery.ts` l. 177, `CHECK_MODEL`). Les relire par Opus 5.5 en effort élevé coûterait
environ 0,06 $ par photo, soit ≈ 0,80 € de plus par site. C'est à lui de trancher ; je ne le compte pas.

## 12. À mesurer sans rien payer, avant de décider

1. Le temps réellement attendu en différé par la création du site, et le nombre d'appels servis en différé
   (`deferredWaitedMs`, Administration › Consommation).
2. La part de réflexion d'une section : jetons écrits comptés par appel (`ai_calls`) comparés à la longueur de la
   réponse gardée.
3. Combien de reprises de la conception n'avaient que des points réparables par le code.
4. Le nombre exact de jetons de chaque consigne et de chaque demande (comptage gratuit du fournisseur).

---

## Gains restants, du plus gros au plus petit

Gains par projet (site de référence). Les lignes 1, 2, 4 et 6 se recouvrent en partie : leur somme n'est pas exacte.
**Total estimé : environ 2 € par projet (1,5 à 2,8 €)** sur les ≈ 7 € de la création du site.

| # | Correction | Euros par projet | Effet sur l'expérience |
|---|---|---|---|
| 1 | Déposer ensemble, dans un même paquet, les appels qui ne dépendent pas l'un de l'autre (juges, reprises, redescriptions, pages) et donner la patience du différé aux paquets qui rapportent le plus ; photos créées trois ou quatre à la fois | **0,60 à 1,20 €** | meilleure : site plus rapide, aucune attente de plus |
| 2 | Écrire les textes par page (d'abord les pièces pratiques ensemble, puis chaque page) | **0,40 à 0,85 €** en direct (0,20 à 0,45 € en différé) | égale, meilleure à l'intérieur d'une page ; à vérifier sur un essai |
| 3 | Le juge de l'ordre et la reprise du concepteur rendent la liste de leurs changements, pas toute la conception | **0,27 à 0,55 €** | égale, ≈ 8 minutes de moins par appel, moins de risque d'échec en différé |
| 4 | Partie commune du plan (promesse, voix, menu, tous les titres, faits répartis, pages) mise en mémoire avec le dossier, pour toutes les sections et leurs reprises | **0,13 à 0,25 €** | égale |
| 5 | Correcteurs sans IA passés avant de décider la reprise de la conception ; reprise seulement pour ce qui reste | **0,05 à 0,35 €** (à mesurer) | égale ou meilleure (les juges lisent la version finale) |
| 6 | Emplacements de texte numérotés par le code au lieu de passages de code recopiés (« find » et « replace ») | **0,10 à 0,20 €** (à vérifier) | meilleure : plus de « texte non remplacé » |
| 7 | Pas de mémoire d'une heure sur les appels qui ne reviennent pas | **0,12 à 0,15 €** | égale |
| 8 | La grande scène de la planche en ouverture, une image de marque déjà faite sur la page introuvable (à proposer au propriétaire) | **≈ 0,10 €** | meilleure : le site reprend la scène aimée sur la planche |
| 9 | Plan des textes porté de 40 à 90 sections | **0,01 à 0,09 €** | meilleure : chaque section a son plan |
| 10 | Second regard limité à ce que seul un lecteur voit, ou réuni au juge de l'originalité (à décider) | **0,03 à 0,07 €** | égale, moins de reprises inutiles |
| 11 | Le rédacteur ne décrit que les photos qui seront créées | **0,03 à 0,05 €** | égale |
| 12 | Dossier du client mis à part en mémoire pour les descriptions de photos | **< 0,01 €** | égale |
| 13 | Regard sur la page découpé en bandes lisibles | **0 €** (moins d'un centime de plus) | meilleure : le regard voit la page |
