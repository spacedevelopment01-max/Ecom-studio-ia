# Où part l'argent quand SINA crée un projet : audit du code

22 novembre 2026. Lu sur la version la plus récente de SINA (branche `claude/evolution-sina`, dernier enregistrement
`ce9cbd89`). **Aucun fichier du Studio modifié, aucun appel payant.**

## Comment ces chiffres ont été obtenus

- **Mesuré sans rien payer** : la taille exacte des consignes et des notices d'outils, en faisant tourner les fonctions
  du Studio sur une copie (aucun appel à l'IA) ; les devis que le Studio calcule lui-même (`chainQuote`, `finishQuote`,
  `anglesQuote`, `siteQuote`, `aiPostEstimate`).
- **Repris des essais réels** (comptes rendus des lots) : 1,15 € pour 21 réponses de « faire connaissance » ; 0,53 € pour
  une seule réponse au choix de l'identité ; sites créés à 5,30 €, 7,25 €, 11,98 € et 9,79 € (dont, pour Atelier
  Vasco, 8,40 € de réflexion et d'écriture, 2,80 € pour 25 photos, 0,78 € de contrôles) ; angles de 0,72 € à 1,24 € ;
  marque en différé « environ 25 % moins chère et deux fois plus longue ».
- **Estimé** : le nombre de jetons se déduit des caractères (environ **3 caractères par jeton** pour un texte français
  avec des notices ; à vérifier avec le comptage gratuit du fournisseur). La réflexion cachée du modèle est comptée dans
  la réponse ; sa longueur réelle n'est pas connue sans essai. Le nombre de réponses de SINA par étape vient des essais.
- **Pas vérifié** : aucune facture d'Anthropic ni d'OpenAI. Tous les euros sont ceux que **le Studio compte**
  (1 $ = 0,86 €).

## Les prix : ce que le Studio compte, comparé aux prix officiels

| Modèle | Studio (`src/lib/ai/config.ts`) | Officiel (recherche du 22 novembre, rapport 11) | Écart |
|---|---|---|---|
| Opus 5.5 (SINA, la plupart des créations) | 4 $ / 20 $ le million (l. 154) ; lecture en mémoire 0,05 fois (`llm.ts` l. 352-355) | 4 $ / 20 $ ; lecture 0,20 $ | aucun (corrigé le 22 novembre : le Studio comptait le double sur la lecture) |
| Sonnet 5.5 (études, équipes de noms, contrôles) | 2 $ / 10 $ ; lecture 0,05 fois | 2 $ / 10 $ ; lecture 0,10 $ | aucun |
| Haiku 5.5 (contrôles des photos du site) | 0,10 $ / 0,50 $ (l. 156) | 0,10 $ / 0,50 $ | aucun |
| Haiku 4.5 | 1 $ / 5 $ (l. 157) | 1 $ / 5 $ | prix juste, mais **c'est lui que le Studio prend pour le niveau « léger »** (`orchestrator/policy.ts` l. 37) : dix fois le prix de Haiku 5.5 |
| Écriture en mémoire | 1,25 fois l'entrée (`llm.ts` l. 345), durée 5 minutes partout (aucune durée d'une heure demandée) | 1,25 fois (5 min), 2 fois (1 h) | aucun |
| Différé | moitié prix (`llm.ts` l. 389) | −50 % | aucun ; mais le différé s'arrête après 30 minutes d'attente par tâche (l. 391, 413) |
| Images d'OpenAI 2.6 « Flare » (toutes les images de SINA) | **0,12 $ par image** + 5 $ le million d'octets de consigne (l. 163) | prix en jetons seulement : 8 $ le million pour une image reçue, 30 $ pour une image produite | **à vérifier** : la consommation mesurée sur la version 2.5 (1 372 à 1 909 jetons produits, soit environ 0,06 $) donnerait une image deux fois moins chère que ce que le Studio compte |
| Recherche sur Internet | pas dans la table par défaut : se saisit dans l'administration | 10 $ les 1 000 recherches + les jetons lus | à vérifier qu'il est saisi |

Conclusion : pour les textes, le Studio compte juste. Pour les images, il compte peut-être trop (0,12 $ au lieu
d'environ 0,06 $) : seule une facture d'OpenAI le dira.

---

## 1. Tous les appels payants d'un projet complet

Projet de référence : une boutique d'un produit, forfait à 3 identités, deux réseaux (Instagram et Facebook), une
réponse de SINA par message du client, sans reprise demandée par le client. « Différé » = moitié prix.

### 1.1 Chaque réponse de SINA (toutes les étapes)

Un appel à Opus 5.5 par réflexion (`loop.ts` l. 576-600), effort **moyen**, ou **élevé** quand elle présente un
résultat, explique un échec, répond à un client mécontent ou juge le site (`modelFor`, l. 527-531). Ce qui part, dans
l'ordre (`llm.ts` l. 249-279) :

| Morceau | Taille mesurée | En mémoire ? |
|---|---|---|
| Consigne générale de SINA (`prompt.ts`) | 13 455 caractères, environ 4 500 jetons | oui (point 1) |
| Notices des outils de l'étape (aiguilleuse, `conversation.ts` l. 49-97) | de 6 926 caractères (faire connaissance, 2 300 jetons) à 27 941 (activité, 9 300 jetons) ; site : 21 946 à 26 722 ; le catalogue entier ferait 76 155 | oui (point 2) |
| Le fil, un bloc par message (`filEnBlocs`, l. 645-650) | grandit : environ 5 000 jetons en moyenne pendant « faire connaissance », 20 000 à 35 000 plus tard | oui depuis le 22 novembre (point 3 sur le dernier bloc) |
| Le parcours, la fiche, l'état du projet, le budget, les pièces jointes (`context`, l. 588) | 3 500 à 7 000 jetons (la consigne de l'étape du site fait à elle seule 9 477 caractères) | **non**, plein tarif à chaque réponse |
| Images jointes (`journeyImages`, `attachments.ts` l. 150-257) | marque : 9 vignettes de 512 px (environ 2 200 jetons), puis 8 vignettes et la planche en 1 024 px (environ 4 000) ; site : jusqu'à 10 bandes de capture (environ 3 000 jetons chacune) | **non** |
| Réponse (réflexion comprise) | environ 1 200 à 1 500 jetons en effort moyen ; 3 000 à 4 000 en effort élevé (estimé) | — |

Autour d'elle, aux mêmes moments :
- **La relectrice** (`loop.ts` l. 607-627) : Opus 5.5, effort moyen ; consigne 2 734 caractères, faits jusqu'à
  14 000 caractères ; environ 0,05 € par relecture.
- **La réécriture** quand la relectrice refuse, ou quand le contrôle gratuit trouve une règle cassée (l. 260-267) :
  une réflexion entière de plus.

Nombre sur le projet : environ **63 réponses**, dont **13 moments forts** (7 résultats de création, 3 échecs,
2 mécontentements, plus les retouches du site jugées en effort élevé).

### 1.2 Étape « La marque » : les planches proposées (tâche de fond, en différé)

Chaîne de `brand-chain.ts` (tailles d'entrée et de sortie prévues par le Studio, l. 68-87 ; consignes mesurées) :

| Appel | Modèle, effort | Consigne mesurée | Demande | Réponse | Fois |
|---|---|---|---|---|---|
| Recherche sur Internet | Sonnet 5.5 + outil de recherche (8 recherches au plus) | 1 000 jetons | + pages lues (jusqu'à 20 000 jetons par recherche) | 12 000 au plus | 3 |
| Étude du marché | Sonnet 5.5, moyen | 3 214 car. | résumé du client + 45 pages, environ 30 000 jetons | 7 000 | 1 |
| Idées de marque | Opus 5.5, moyen | 17 251 car. | résumé du client + étude, environ 22 000 | 12 000 | 1 à 2 |
| Équipes de noms | Sonnet 5.5, moyen | 21 820 car. | 12 000 | 9 000 | 4 (+ 4 au second tour) |
| Juge des noms | Opus 5.5, moyen | 9 441 car. | 16 000 | 3 000 | 1 à 2 |
| Composition des routes | Opus 5.5, moyen | 10 419 car. | 26 000 | 9 000 | 1 |
| Vérification des noms | Sonnet 5.5 + Internet | 2 391 car. | 12 000 | 2 500 | 1 |
| Planche de chaque route | Opus 5.5, moyen | **46 907 car. (15 600 jetons)** | 18 000 | 10 000 | 3 |
| Lecteur qui ne sait rien | Opus 5.5, moyen | 1 221 car. | 2 500 | 2 500 | 1 |
| Directeur de création | Opus 5.5, moyen | 10 720 car. | 26 000 | 6 000 | 1 |
| Reprise d'une route | Opus 5.5, moyen | **47 464 car.** | 22 000 | 10 000 | 1 à 3 |
| Relecture de la reprise | Opus 5.5, moyen | 7 696 car. | 30 000 | 4 000 | 1 |
| Direction artistique des images | Opus 5.5, moyen | 15 620 car. | 7 000 | 6 000 | 3 |
| **Images** (logo 1:1 en 1024×1024, grande scène 16:9 en 1536×1024, maquette du site 9:16 en 1024×1536) | OpenAI 2.6 Flare, qualité haute | consigne de 3 à 6 ko + images de référence (logo, scène, logos déjà faits, planche des 50 logos aimés) | — | 1 image | 9, plus les reprises (2 au plus par image, `REPRISES_MAX`) : environ 13 |
| Relecteur des images | Opus 5.5, **élevé**, une image à la fois (l. 302) | 3 816 car. | 1 à 3 images (1 400 à 2 000 jetons chacune) | 2 500 | une par image : environ 13, plus une seconde lecture en cas de doute |

Le résumé du client (sa fiche et ses notes) est recopié dans presque chaque demande. Tous les textes partent en différé ; ni les
images, ni les recherches.

### 1.3 Étape « La marque » : la marque finie (dès le choix, en direct)

`brand-finish.ts` : l'objet qui porte le logo (1:1), les signes (1:1), trois publications (4:5, faites en 1024×1536) et
le symbole (1:1), soit **6 images** en qualité haute, chacune relue par Opus 5.5 en effort élevé ; la direction
artistique est reprise de la proposition (pas repayée). Devis du Studio : **1,35 € probables, 2,34 € au plus**.

### 1.4 Étape « Les angles » (tâche de fond, en différé)

`angles-chain.ts` l. 54-63 : écoute d'Internet (Sonnet, seulement s'il manque des paroles d'acheteurs), types de clients
(Opus), trois stratèges (Opus, un par angle), juge (Opus), une reprise (Opus), relecture, lecteur, clarification.
Consignes de 0,8 à 5,9 k caractères, demandes de 2 500 à 19 500 jetons, réponses de 2 000 à 7 000. Devis : **1,05 €
probables** au plein tarif ; mesuré 0,72 à 1,24 € avant le différé.

### 1.5 Étape « Le site » (tâche de fond, en différé dans la limite de 30 minutes)

`custom-theme/site-job.ts` l. 120-150 et `brand.ts` :

| Appel | Modèle | Fois | Coût mesuré ou prévu |
|---|---|---|---|
| Conception (concepteur, cahier de 47 392 car.), juge de l'ordre, second regard, juge de l'originalité | Opus 5.5 | 4 à 7 | 1,33 € prévus au plein tarif |
| Plan des textes du site (sortie jusqu'à 36 000 jetons) | Opus 5.5, moyen | 1 | 0,42 € mesuré |
| **Écriture de chaque section** (consigne + cahier du rédacteur : 24 400 car., en mémoire ; demande : résumé du client + plan de la section + code de la section) | Opus 5.5, moyen | **43** (un produit) à 70 (trois produits) | 0,06 € en moyenne, jusqu'à 0,14 € |
| Relecture des textes, puis reprises | Opus 5.5 | 1 + 2 | 0,18 € + 2 × 0,06 € |
| Consignes des photos, relecture des photos | Opus 5.5 | 2 à 3 | 0,18 € |
| **Photos** (qualité haute) | OpenAI 2.6 Flare | 15 d'ordinaire, 29 au plus | environ 0,11 € chacune (2,80 € pour 25) |
| Contrôles des photos et regard sur les pages | Haiku 5.5, faible | 15 à 30 | quelques centimes |

Devis du Studio pour une boutique d'un produit : **8,49 € probables, 12,74 € au plus** (au plein tarif).

### 1.6 Étape « Les publications »

- Plan (`posts-plan.ts` l. 208-218, en différé) : la stratège (Opus 5.5, effort élevé, consigne de **55 171
  caractères**), le juge (consigne de 40 822 caractères), une reprise. Devis : 0,34 € probables.
- Création (`tools/posts.ts` l. 50-55, en direct) : pour **chaque groupe et chaque réseau**, une idée (Sonnet 5.5,
  18 000 jetons lus), une image 4:5 en 1024×1536 qualité haute, un contrôle (Sonnet 5.5, 24 000 jetons lus), jusqu'à
  3 essais (`social-v2/deps.ts` l. 238-244). Environ 0,21 € par essai. Avec 3 groupes et 2 réseaux : **6 images**.

---

## 2 et 3. Le coût estimé, ligne par ligne, puis par étape

### 2.1 Une réponse de SINA, au prix du Studio

| | Avant le 22 novembre (mesuré : 1,15 € pour 21) | Aujourd'hui, réponse ordinaire | Aujourd'hui, moment fort |
|---|---|---|---|
| Consigne générale et notices (lues en mémoire) | 0,001 € | 0,002 € | 0,001 € |
| Le fil | 0,017 € (5 000 jetons au plein tarif) | 0,012 € (20 000 lus + 2 000 écrits) | **0,116 €** (27 000 jetons réécrits : le changement d'effort efface la mémoire) |
| Parcours, fiche, état du projet | 0,012 € | 0,017 € | 0,017 € |
| Images jointes | 0 | 0,003 € | 0,014 € |
| Réponse et réflexion | 0,021 € | 0,022 € | 0,060 € |
| Relectrice et réécriture éventuelle | — | — | 0,08 € |
| **Total** | **0,051 €** (× 21 = 1,07 €, proche des 1,15 € mesurés) | **0,057 €** | **0,29 €**, puis 0,11 € de plus à la réponse suivante (retour à l'effort moyen : la mémoire est encore réécrite) |

### 2.2 Total par étape (coût probable compté par le Studio, aujourd'hui)

| Étape | Ce qui coûte | Coût |
|---|---|---|
| Faire connaissance | 21 réponses | 0,85 € |
| La marque | planches proposées 4,80 € (textes en différé 1,50 € ; 13 images 1,70 € ; leur relecture 0,40 € ; 4 recherches 1,20 €) ; marque finie 1,35 € ; environ 10 réponses dont 3 moments forts 1,60 € | 7,75 € |
| Les angles | création 0,60 € (différé) ; 5 réponses 0,60 € | 1,20 € |
| L'activité | environ 12 réponses (notices de 9 300 jetons) | 0,90 € |
| Le site | création environ 7,00 € (textes 5,00 € : une partie seulement passe en différé avant la limite de 30 minutes ; photos 2,00 €) ; environ 10 réponses avec retouches 2,00 € | 9,00 € |
| Les publications | plan 0,20 € ; 6 images avec leur idée et leur contrôle 1,60 € ; 6 réponses 0,60 € | 2,40 € |
| **Projet entier** | | **≈ 22 €** (≈ 23 € avec une reprise de logo ; 30 € et plus si plusieurs images sont refusées et refaites, comme pour le plombier : 20,06 € jusqu'à la seule marque finie) |

Pour situer : sur le forfait à 69 €, le budget d'IA du premier mois est d'environ 28,75 € (50 % de 57,50 € hors taxes).
Un projet à 22 € en prend les trois quarts avant la première publication du quotidien.

### 2.3 Les 10 postes les plus chers

| # | Poste | Coût par projet | Part |
|---|---|---|---|
| 1 | Textes de la création du site (43 sections, plan, conception, juges, relectures) | ≈ 5,00 € | 23 % |
| 2 | Moments forts de SINA (13 : effort élevé, mémoire réécrite, relectrice, réécritures) | ≈ 3,50 € | 16 % |
| 3 | Réponses ordinaires de SINA (≈ 50) | ≈ 3,00 € | 14 % |
| 4 | Photos du site (15 à 17, reprises comprises) | ≈ 2,00 € | 9 % |
| 5 | Images des planches proposées (≈ 13) et leur relecture | ≈ 2,10 € | 10 % |
| 6 | Textes de la chaîne de la marque (idées, noms, planches, reprises) | ≈ 1,50 € | 7 % |
| 7 | Publications créées (6 images, idée, contrôle) | ≈ 1,60 € | 7 % |
| 8 | Marque finie (6 images, relues en direct) | ≈ 1,35 € | 6 % |
| 9 | Recherches sur Internet (marque, vérification des noms) | ≈ 1,20 € | 5 % |
| 10 | Chaîne des angles | ≈ 0,60 € | 3 % |

Toutes images comptées (planches, marque finie, site, publications), le projet en crée **environ 46**, soit **environ
5,50 à 6 €** au prix du Studio. La conversation de SINA, toutes étapes, coûte **environ 6,50 €**. Ce sont les deux plus gros
blocs.

---

## 4. Ce qui est gaspillé, poste par poste

### Conversation de SINA (6,50 €)

1. **Le changement d'effort efface la mémoire du fil.** L'effort passe de moyen à élevé à chaque moment fort, puis
   redescend (`loop.ts` l. 530). Chez Anthropic, changer l'effort efface la mémoire des messages ; or les notices et le
   fil sont des messages. À chaque aller et retour, 20 000 à 35 000 jetons sont réécrits au prix fort (1,25 fois) au
   lieu d'être lus (0,05 fois), deux fois de suite. Ce défaut n'avait pas d'effet avant le 22 novembre (rien n'était en
   mémoire) ; il en a maintenant. Environ **1,80 €** par projet.
2. **La mémoire ne dure que 5 minutes.** Après une création en arrière-plan (marque : 15 à 30 minutes ; site : bien
   plus) ou un client qui réfléchit plus de 5 minutes (choisir son identité), tout le fil est réécrit. Une durée d'une
   heure coûte un peu plus à l'écriture (2 fois au lieu de 1,25) mais évite ces réécritures. Environ **1,40 €** net.
3. **Ce qui ne change pas est placé dans la partie qui change.** La consigne de l'étape (jusqu'à 9 477 caractères pour
   le site, environ 4 000 pour « faire connaissance ») est recopiée dans le parcours, après le fil, donc payée plein
   tarif à chaque réponse ; elle est pourtant la même pour tous les clients à la même étape et pourrait aller avec les
   notices, en mémoire. Les images jointes sont, elles aussi, après le fil : renvoyées plein tarif à chaque réponse.
   Environ **0,70 €**.
4. **Les résultats de la demande précédente sont raccourcis** (de 12 000 à 300 caractères, et les actions de 400 à
   160, `loop.ts` l. 659) au message suivant du client : les blocs de la dernière demande, écrits en mémoire, sont
   réécrits. Coût faible, tant qu'une demande ne dépasse pas 20 blocs ; au-delà, le fournisseur ne retrouve plus la
   mémoire et tout le fil est réécrit.
5. **Les réécritures** : une réponse refusée par la relectrice ou par le contrôle gratuit est refaite en entier. Elles
   protègent la qualité ; à garder.

### Textes du site (5 €)

1. **Le différé s'arrête après 30 minutes d'attente par tâche** (`llm.ts` l. 391 et 413). Le site fait 45 à 70 appels
   l'un après l'autre : passé une vingtaine, les suivants partent au plein tarif. Allonger la patience ferait gagner
   environ **1,30 €**, mais le site serait plus long à venir (estimé : 30 à 60 minutes de plus). C'est un choix du
   propriétaire, pas de qualité.
2. **Le résumé du client est recopié dans chacune des 43 à 70 demandes** (`brand.ts` l. 691-708), après la consigne
   mise en mémoire, donc au plein tarif. Il pourrait passer dans la partie en mémoire (`context`), commune à toutes les
   sections : environ **0,30 €**.
3. **La mémoire de 5 minutes en différé** : chaque appel attend son tour chez le fournisseur ; si l'attente dépasse
   5 minutes, la consigne de 8 000 jetons du rédacteur est réécrite au lieu d'être lue. Non mesuré : la part lue en
   mémoire est affichée dans l'administration (`memoire.ts`) ; à regarder après le prochain essai. Jusqu'à 1 € si la
   mémoire est souvent manquée.

### Images (6 €, toutes étapes)

1. **Une image par réseau, même quand le format est le même.** Instagram et Facebook demandent tous deux du 4:5
   (`social-v2/platforms.ts` l. 55 et 75), mais chaque réseau reçoit sa propre idée, sa propre image et son propre
   contrôle (`tools/posts.ts` l. 54). Avec deux réseaux : 3 images payées en trop, environ **0,80 €**.
2. **Images refusées puis refaites** : chaque refus coûte l'image et sa relecture (jusqu'à 2 reprises par image). La
   panne de transparence (cause de la plupart des refus du plombier) est corrigée depuis le 21 novembre (fond plein
   demandé, contrôle gratuit avant la relecture payée) ; le logo est relu avant ce qui le porte. Le reste des refus est
   le prix de la règle « rien n'est montré sans avoir été relu ».
3. **Un logo redessiné à cause d'un trait** (contrôle gratuit du trait près du nom) : une image en plus quand un autre
   logo de la série en a déjà un. Rare.
4. **Comptage peut-être trop haut** : 0,12 $ par image comptés, peut-être 0,06 $ facturés (voir les prix). Sur
   46 images, l'écart serait d'environ 2,40 € **dans le compte du Studio**, pas chez le fournisseur. À vérifier sur une
   facture d'OpenAI avant tout changement.

### Chaîne de la marque (1,50 € de textes)

1. Les consignes de la planche (15 600 jetons) et de la reprise (15 800 jetons) partent 3 à 6 fois, l'une après
   l'autre, en différé : leur mémoire de 5 minutes peut expirer entre deux. Une durée d'une heure sur ces consignes :
   environ **0,15 €**.
2. Le résumé du client, recopié dans chaque appel, n'est pas en mémoire : environ **0,10 €** à gagner sur les appels qui
   ont la même consigne (les trois planches, les reprises).
3. Le relecteur des images en effort élevé, une image à la fois : c'est la décision du propriétaire (21 novembre). À
   garder.

### Petits postes

- **Le niveau « léger » est Haiku 4.5** (`policy.ts` l. 37 ; tri des photos, classement) : dix fois le prix de
  Haiku 5.5, qui est plus récent. Quelques centimes par projet, gagnés sans rien perdre.
- **Les exemples de publications de la planche** (3 images de la marque finie) ne servent pas de premières
  publications : l'étape des publications en refait 3. Ce n'est pas un gaspillage tant que les deux n'ont pas le même
  rôle ; une idée à proposer au propriétaire, pas comptée.
- **Appels qui pourraient se faire sans IA** : presque tout ce qui peut l'être l'est déjà (noms de domaine, fond blanc
  du logo, transparence, trait, lecture des paroles de clients sur les pages, contrôle des règles du message). La
  seconde lecture d'une image en cas de doute (Opus en effort élevé, seulement pour recopier un texte) pourrait être
  essayée avec un lecteur de texte gratuit ; gain faible, résultat incertain sur des lettres dessinées.
- **Réponses trop longues** : rien de flagrant. Les sorties longues (plan du site jusqu'à 36 000 jetons, idées de
  marque 12 000) correspondent à des travaux réellement longs.

---

## 5. Le fil de la conversation est-il lu en mémoire ?

**Oui, sur cette branche, depuis l'enregistrement `920e7482` du 22 novembre** (« Économies : mise en mémoire chez le
fournisseur mesurée… »). Vérifié dans le code :

| Point | Où | État |
|---|---|---|
| Ordre des blocs | `llm.ts` l. 249-264 et 266-279 | consigne générale (point 1, l. 489) → notices de l'étape (point 2) → **le fil, un bloc par message** (point 3 sur le dernier bloc) → la partie qui change (parcours, état du projet, budget, pièces jointes) → images → demande. **La partie qui change est bien après le fil.** |
| Points de mémoire | `headBlocks` | 3 sur les 4 permis ; il en reste un. |
| Le fil ne glisse plus à chaque message | `store.ts` l. 42-49 | son début ne bouge que tous les 40 messages ; au-delà de 120 messages, un résumé à rubrique fixe remplace le début. |
| Lecture comptée au vrai prix | `llm.ts` l. 352-355 | 0,05 fois pour Opus et Sonnet 5.5 (corrigé le même jour). |
| Essai qui le vérifie | `tests/sina-memoire-fournisseur.test.ts` | présent. |

La mesure de 1,15 € pour « faire connaissance » date **d'avant** cette correction. Avec elle, la même conversation
coûterait environ **0,85 €** (estimé : un quart de moins ; peu, car le fil est encore court à ce moment-là et la réponse de
SINA, qui ne se met jamais en mémoire, pèse plus de la moitié).

**Ce qui casse encore la mémoire du fil** :
1. le changement d'effort entre moyen et élevé (`loop.ts` l. 530) : le plus coûteux ;
2. la durée de 5 minutes (aucune durée d'une heure demandée, `llm.ts`) ;
3. le raccourcissement des résultats de la demande précédente (`loop.ts` l. 659) : seuls les derniers blocs sont
   réécrits, sauf si la demande précédente a ajouté plus de 20 blocs (le fournisseur ne remonte pas plus loin) ;
4. le changement de notices quand l'étape change (normal, une fois par étape).

---

## Les économies possibles sans baisser la qualité, chiffrées, dans l'ordre du gain

Aucune ne change un modèle, un effort de création, une relecture ou une règle du propriétaire. Gains estimés par
projet, au prix du Studio.

| # | Économie | Ce que ça change | Gain estimé |
|---|---|---|---|
| 1 | **Ne plus changer l'effort au milieu du fil** : garder l'effort constant dans la demande, et passer « élevé » aux moments forts par un message d'opérateur à l'intérieur de la conversation, prévu par Anthropic pour changer l'effort sans effacer la mémoire (fonction en essai chez le fournisseur ; demande de mettre le fil en plusieurs messages) | la mémoire du fil n'est plus effacée à chaque moment fort | **≈ 1,80 €** |
| 2 | **Mémoire d'une heure pour le fil de SINA** (et pour les consignes des tâches en différé) | plus de réécriture après une création en arrière-plan ou une pause du client | **≈ 1,40 €** |
| 3 | **Une image par format, pas par réseau** pour les publications (Instagram et Facebook en 4:5 reçoivent la même image, chacune avec son texte) | la même publication, payée une fois | **≈ 0,80 €** (avec deux réseaux) |
| 4 | **Mettre en mémoire ce qui ne change pas** : la consigne de l'étape avec les notices ; les images jointes dans le fil, à l'endroit où elles sont arrivées | les mêmes informations, lues au lieu d'être repayées | **≈ 0,70 €** |
| 5 | **Site : le résumé du client en mémoire** pour les 43 à 70 sections, et vérifier la part lue en mémoire des appels en différé | même texte, moins cher | **≈ 0,30 € à 1 €** |
| 6 | **Marque : mémoire d'une heure sur les grandes consignes** et résumé du client en mémoire pour les appels qui ont la même consigne | idem | **≈ 0,25 €** |
| 7 | **Haiku 5.5 au lieu de Haiku 4.5 pour le niveau léger** | modèle plus récent, dix fois moins cher | **≈ 0,05 €** |
| | **Total** | | **≈ 5,30 €** |

**Coût estimé d'un projet complet** (de « faire connaissance » aux premières publications, sans reprise) :
**environ 22 € aujourd'hui, environ 17 € après ces économies.**

À décider par le propriétaire, hors de cette liste parce qu'ils touchent au temps ou demandent une vérification :
- **Patience du différé** (30 minutes par tâche aujourd'hui) : l'allonger pour le site ferait gagner environ 1,30 €
  de plus, mais le site arriverait plus tard. Avec elle : **environ 15,50 €**.
- **Prix des images** : si une facture d'OpenAI confirme environ 0,06 $ par image, le compte du Studio baisse encore
  d'environ 2,40 € par projet (le fournisseur ne coûte pas moins cher, le Studio compterait juste) : **environ 13 €**.
