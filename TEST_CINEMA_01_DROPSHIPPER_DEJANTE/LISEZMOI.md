# Test cinématographique n° 1 — « Le dropshipper déjanté » (14 s)

Une seule scène de 14 secondes, verticale 1080 × 1920, 24 images/s. C'est un nouveau personnage : l'ancienne figurine
3D (modèle, squelette et animations) n'a pas été réutilisée. Ni E-COM STUDIO IA ni Syna n'apparaissent.

## Livrables

| Demandé | Fichier |
| --- | --- |
| Scène complète MP4 1080 × 1920 | `le-dropshipper-dejante-1080x1920.mp4` (14,0 s, H.264 + AAC, 24 i/s, −15 LUFS) |
| Design du personnage | `personnage/` : référence maîtresse, variante non retenue, planche d'expressions et 8 images clés des plans |
| Piste audio ElevenLabs | `audio/` : les deux prises brutes, la prise retenue resserrée, l'alignement mot à mot, le mixage final |
| Projet source | `projet/` : plans IA d'origine, scripts, requêtes envoyées, composition HyperFrames, `construire.sh` |
| Captures | `captures/` (9 images), `miniature-1080x1920.jpg`, `controle/` (planches de contrôle) |
| API utilisées, coûts, évaluation | ce fichier |

## Le personnage

C'est un entrepreneur fictif d'environ 32 ans, dessiné pour ce test. Ce n'est le portrait d'aucune personne réelle.
- **Silhouette** : adulte, mince et nerveuse.
- **Visage** : cheveux châtains en bataille en vraies mèches, sourcils épais très mobiles, grands yeux noisette, nez
  long légèrement busqué, grande bouche, barbe de quelques jours.
- **Tenue** : veste prune (aubergine), t-shirt crème, jean foncé, baskets blanches usées.
- **Énergie** : celle d'un showman de scène ou d'un magicien comique, sans reprendre l'apparence ni les expressions
  d'un humoriste réel.
- **Rendu** : hybride 2D/3D, avec des volumes sculptés, des matières peintes et un fin trait d'encre.

La planche d'expressions contient les 6 expressions demandées :
- regard complice ;
- sourire gigantesque ;
- fierté ridicule ;
- panique ;
- incrédulité ;
- regard caméra sarcastique.

Le modèle a dessiné 8 têtes au lieu de 6 ; je l'ai gardée telle quelle.

## Comment la scène a été fabriquée

1. **Voix d'abord (ElevenLabs).**
   - Voix « Simon », modèle `eleven_v3`, avec des indications de jeu : crié, complice, fier, panique, exaspéré.
   - 2 prises générées. J'ai retenu la prise 1 sur des mesures :
     - le cri initial est plus fort ;
     - la voix baisse nettement sur « Tu veux faire du dropshipping ? » ;
     - la montée finale est plus haute et plus rapide.
   - Les silences ont été raccourcis sans accélérer la voix : 16,8 s → 12,4 s.
   - Mots horodatés au centième (alignement forcé ElevenLabs), puis plans calés dessus.
2. **Personnage (fal.ai `nano-banana-2`).**
   - Référence maîtresse (2 propositions, 1 retenue), puis, avec `nano-banana-2/edit`, la planche d'expressions et
     les images de départ ou de fin de chaque plan.
   - Le même personnage et le même décor sont toujours repris comme référence.
   - Deux corrections :
     - de fausses écritures sur les cartons et l'écran ;
     - un sceptre différent de la lampe du plan 2.
3. **Animation (fal.ai `kling-video/v3/standard/image-to-video`).** Un seul essai par plan (5 plans, 18 s générées
   au total). Les plans 2 et 5 sont guidés par une image de début et une image de fin.
4. **Synchro labiale (fal.ai `sync-lipsync/v2`).**
   - Chaque plan est resynchronisé sur son morceau de voix.
   - Le plan 4, légèrement accéléré au montage, a reçu une voix ralentie d'autant, pour que les lèvres retombent juste.
5. **Montage.**
   - Chaque image du film est choisie dans le plan d'origine ou synchronisé, au centième de seconde près sur la voix.
   - Agrandissement 1080 × 1920, étalonnage léger, vignettage et grain (ffmpeg).
6. **HyperFrames.**
   - Typographie géante qui réagit au volume de la voix : « TOI ! », « OUI, TOI ! », « dropshipping ? »,
     « LE PRODUIT ! », « MILLIARDAIRE ! », la liste du chaos, « FUSÉE ?! ».
   - Éclairs de transition, secousses et coups de zoom de caméra.
7. **Son.**
   - Voix, 8 bruitages générés par ElevenLabs (fanfare, caisse, pouf, chute, chaos, papiers, fusée, sifflet), 6 effets
     de la banque HyperFrames (licence Pixabay) et la musique du compositeur du studio (style « pop »).
   - La musique est baissée sous la voix. Mixage à −15 LUFS.

### Pourquoi pas Kling « Motion Control »

Ce modèle recopie les gestes d'une **vraie vidéo filmée** sur le personnage. Je n'en avais aucune.

Les autres façons d'obtenir une vidéo de référence auraient été un mauvais substitut :
- en fabriquer une avec une autre IA aurait payé deux fois pour un résultat moins bon ;
- faire bouger un mannequin 3D, c'est exactement les « bras 3D » refusés.

J'ai donc utilisé Kling v3 en « image vers vidéo », qui invente lui-même le jeu d'acteur à partir de la consigne.

**Si vous vous filmez au téléphone** (14 s, vertical, en jouant le texte), Motion Control peut transférer votre
propre jeu sur le personnage. Coût estimé : environ 14 s × 0,126 $ ≈ 1,8 $. Ce n'est pas fait.

## Calage sur la voix

| Temps | Plan | Ce qu'on voit | Voix |
| --- | --- | --- | --- |
| 0–3,1 s | 1 | Très près de l'objectif, il pointe le spectateur, tapote l'air, puis se penche, complice. « TOI ! » et « OUI, TOI ! » claquent en haut de l'image, puis « dropshipping ? » apparaît mot à mot. | « TOI ! Oui, toi ! Tu veux faire du dropshipping ? » |
| 3,1–5,4 s | 2 | Il sort la lampe de sa poche dans un éclair doré pile sur « LE », la brandit en pose de héros ; fanfare. | « Moi, j'avais LE produit ! » |
| 5,4–7,5 s | 3 | Éclair doré : la chambre devient salle du trône (couronne de travers, billets sans aucune inscription). « MILLIARDAIRE ! » tombe lettre par lettre. Le trône disparaît dans un « pouf » doré : il tombe sur les fesses et les lettres tombent avec lui. | « J'étais déjà milliardaire ! » |
| 7,5–10,8 s | 4 | Coupe brutale vers la chambre : l'ordinateur crache fenêtres, logo, photos, pubs, loupe. Il panique, les repousse, puis la pile de documents l'ensevelit. Chaque mot apparaît sur sa syllabe ; les mots sont éjectés quand il s'écroule. | « Et là… site, logo, photos, pubs, référencement… » |
| 10,8–14 s | 5 | Il fixe la caméra, bras levés, exaspéré. Sur « fusée » : recul éclair de la caméra, l'ordinateur s'illumine, décolle et se change en fusée. Le mot « FUSÉE ?! » part avec elle, ses yeux s'arrondissent, sifflet comique. Coupure. | « Je lance une boutique ou une fusée ?! » |

## Format vertical et zones de sécurité

- Les images et l'animation ont été **générées directement en vertical 9:16** : aucun recadrage d'une vidéo horizontale.
- Tous les textes sont placés hors des zones réservées par TikTok, Reels et Shorts, vérifiées sur le film rendu
  (`controle/zones-de-securite-1-image-par-seconde.png`) :
  - en haut : 200 px ;
  - en bas : 420 px ;
  - à droite : 130 px, entre 700 et 1 500 px de hauteur.
- Pendant la panique, les mots ont été déplacés pour ne jamais couvrir son visage.

## Coût des appels

| Service | Appels | Coût |
| --- | --- | --- |
| fal.ai `nano-banana-2` (+ `/edit`) | 11 appels réussis, 12 images 1K | 0,80 à 1,44 $ |
| fal.ai Kling v3 standard image-to-video | 5 appels, 18 s de vidéo | 1,51 à 2,52 $ |
| fal.ai sync-lipsync v2 | 5 appels réussis (≈ 15 s) + 1 refusé avant calcul | ≈ 0,76 $ (3 $ la minute) |
| fal.ai ffmpeg (hébergement des morceaux de voix) | 5 appels | ≈ 0,01 $ |
| **Total fal.ai** | | **entre ≈ 3,1 $ et 4,75 $** |
| ElevenLabs (voix, transcription, alignement, bruitages) | 2 prises, 8 bruitages, contrôles | **≈ 205 crédits** sur 40 219 |

**Le coût réel exact n'est pas lisible d'ici.**
- Les pages de tarifs et le tableau de bord de fal.ai sont bloqués par le réseau de cette session (seuls `fal.run` et
  `queue.fal.run` sont ouverts). Les montants ci-dessus sont donc des **estimations** à partir des tarifs publics
  trouvés, qui se contredisent selon les sources ; j'ai toujours pris l'hypothèse haute.
- Le montant exact est dans fal.ai › Billing › Usage, avec les identifiants de requête notés dans
  `projet/depenses-fal.csv`.
- Pour ElevenLabs, le compteur de crédits est réel (lu par l'API). Son prix en euros dépend de votre offre, et je ne
  l'ai pas vérifié.

Dans tous les cas, on reste **sous le budget de 10 €**. Aucune requête en erreur n'a été relancée sans raison : les
seuls refus (422 et 429) sont survenus avant tout calcul.

Contournement technique, signalé :
- sync-lipsync refuse un son envoyé directement et exige une adresse web ; or l'envoi de fichiers vers le stockage de
  fal est bloqué ici.
- J'ai donc fait passer chaque morceau de voix par l'outil de normalisation du son de fal (`ffmpeg-api/loudnorm`), qui
  le renvoie hébergé sur le CDN de fal.
- C'est le même service et le même compte, pour un coût d'environ 0,002 $ par appel.

## Évaluation honnête (sur 10)

| Critère | Note | Pourquoi |
| --- | --- | --- |
| Design du personnage | 7 | Original, adulte, très expressif, vraies mèches, veste prune. Mais le rendu reste proche d'un « dessin animé IA » courant : pas encore un style signature. La main ouverte de la référence maîtresse est mal dessinée. |
| Expressivité et jeu d'acteur | 7 | Vrai jeu : il pointe, se penche, sort la lampe en magicien, fait le roi, tombe, panique, s'écroule, s'exaspère. Il n'entre pas « depuis le côté du cadre », et le chuchotement n'est pas joué physiquement. |
| Fluidité de l'animation | 6,5 | Fluide en général. Visage déformé sur quelques images très rapides (vers 1,3 s et 8,9 s). Accélération ×1,22 au plan 4, recul éclair de 3 images et ralenti ×0,72 au plan 5 : on les sent. |
| Synchronisation labiale | 6 | Juste et lisible sur les plans rapprochés (1, début du 2, 5). Petits visages aux plans 3 et 4. Quelques images restent sans synchro (voir défauts). |
| Qualité de la voix | 7,5 | Française, naturelle, vrai cri, vraie fierté, vraie montée finale. Le « chuchotement » n'est qu'une voix baissée. |
| Humour | 6 | Les gags sont là (trône qui s'évapore, avalanche de papiers, ordinateur-fusée), mais chaque plan dure 2 s : ils n'ont pas le temps de respirer. |
| Timing comique | 6,5 | Tout tombe sur les mots : éclair sur « LE », chute en fin de « milliardaire », effondrement sur « référencement », fusée sur « fusée ». Il manque un vrai temps mort avant la chute finale. |
| Qualité des décors | 7,5 | Chambre de nuit cohérente d'un plan à l'autre (lampe chaude, mur vert, cartons), salle du trône riche. Décors sans parallaxe ; quelques feuilles volantes portent de fausses lignes d'écriture floues. |
| Mouvements de caméra | 5,5 | Surtout des zooms, des secousses et un recul. Il manque le passage rapide « du produit au visage » du plan 2 et une vraie chorégraphie de caméra. |
| Cadrage vertical | 7,5 | Pensé et généré en vertical, zones de sécurité respectées. Mais l'animation sort en 716 × 1284 et a été **agrandie** en 1080 × 1920 : la composition est native, pas la définition. |
| Qualité sonore | 7 | Voix toujours au-dessus, bruitage sur chaque action, −15 LUFS. Musique discrète et assez générique. |
| Cohérence visuelle entre les plans | 7 | Même visage, coiffure, veste et chambre dans les 5 plans. Légères variations du nez et de la largeur du visage en gros plan. |

**Moyenne : environ 6,8/10.** C'est un vrai film d'animation joué, plus qu'une présentation animée. Il n'atteint pas
encore le niveau d'un court-métrage de studio.

## Défauts restants (non corrigés)

- **Plan 1** :
  - il est déjà dans le cadre au départ : il ne « surgit » pas du côté ;
  - « TOI ! » est **devant** lui, pas derrière (il faudrait détourer le personnage) ;
  - le texte réagit à la voix et aux coups de caméra, pas physiquement à sa main.
- **Plan 2** : pas de mouvement de caméra « produit → visage ». Pendant l'éclair doré (≈ 0,3 s), son visage est noyé
  dans la lumière et ces images sont sans synchro labiale.
- **Plan 3** :
  - la couronne est déjà sur sa tête (elle ne descend pas du plafond) ;
  - il est déjà assis au lieu d'« essayer de s'asseoir » ;
  - la transformation de la chambre est faite par un éclair, pas par une métamorphose visible.
- **Plan 4** :
  - les objets volent dès la première image : l'ordinateur ne « s'allume » pas brusquement ;
  - visage déformé sur quelques images rapides ;
  - pendant l'effondrement, images sans synchro labiale (visage écrasé dans les papiers).
- **Plan 5** : les cheveux sont peu soufflés vers l'arrière ; « fusée » est dit en plan large, donc non synchronisé.
- **Définition** : 716 × 1284 agrandie en 1080 × 1920 (Kling standard). Kling Pro sortirait du 1080p, pour un coût
  plus élevé.
- **Référence maîtresse** : main ouverte mal formée ; planche d'expressions à 8 têtes au lieu de 6.

## Ce qui a été vérifié, et ce qui ne l'a pas été

Vérifié réellement :
- **Texte prononcé** : les deux prises ont été retranscrites par ElevenLabs et contiennent le texte exact.
- **Timbre** : aucune accélération de la voix.
- **Alignement** : alignement mot à mot, et alignement image par image entre vidéos d'origine et synchronisées
  (décalage 0).
- **Rendu sans décalage** : le film rendu et le montage sont alignés image par image (décalage 0), donc la synchro
  labiale n'a pas été décalée par le rendu.
- **Chaque plan regardé** : planches toutes les 0,5 s, images pleine taille, zooms sur les mains, les billets (aucune
  inscription) et les bouches.
- **Contrôles HyperFrames** : sans erreur.
- **Caractéristiques techniques** : 336 images, 14,0 s, 1080 × 1920, 24 i/s.
- **Son mesuré** : −15,0 LUFS, crêtes à −1,6 dB, voix au-dessus du fond.
- **Reconstruction** : `projet/construire.sh` refait le film sans aucun appel payant.

Non vérifié :
- **Écoute réelle** : je ne peux pas écouter le son. La qualité de jeu de la voix, du mixage et des bruitages a été
  jugée sur des mesures (volume, hauteur, débit, transcription), pas à l'oreille. À valider en l'écoutant.
- **Coût réel exact** chez fal.ai (voir plus haut).
- **Droits d'usage commercial** des images et vidéos générées et des bruitages ElevenLabs : ils dépendent des
  conditions de fal.ai, des modèles et de votre offre ElevenLabs. À confirmer de votre côté. Les effets de la banque
  HyperFrames sont sous licence Pixabay (usage commercial permis).

## Reconstruire le film

```bash
cd TEST_CINEMA_01_DROPSHIPPER_DEJANTE/projet && ./construire.sh
```

Le script reprend les plans IA déjà payés, la voix et les bruitages livrés, et ne fait aucun appel payant.

Les scripts de génération (`projet/outils/`) et les requêtes envoyées (`projet/requetes/`) sont fournis pour
mémoire :
- les consignes d'image sont écrites en français, au format du guide des images ;
- les clés ne figurent nulle part : le proxy de l'environnement les injecte.
