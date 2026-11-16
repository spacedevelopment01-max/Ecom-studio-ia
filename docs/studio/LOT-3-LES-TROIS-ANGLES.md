# Lot 3 : les trois angles

Compte rendu du 16 novembre 2026. Accord du propriétaire pour construire : « Oui, on construit comme ça ».
**Construit et testé avec une IA simulée. Pas encore essayé avec la vraie IA** : le lot n'est pas fini tant que SINA
ne l'a pas réussi seule sur des clients inventés. Les anciennes façons ne sont retirées qu'à ce moment-là.

## Ce qui est construit

- **Une seule façon de créer les angles** : la chaîne de `syna-agent/angles-chain.ts`, en tâche de fond
  (`syna.angles`). L'outil de SINA (`angles.propose`) ne passe plus par l'ancien moteur de préparation : plus
  d'« analyse de la fiche » payante, plus de seconde recherche sur le web.
- **SINA part de ce qu'elle sait.** Le dossier est monté sans IA : les faits du client (sa fiche, ce qu'il a dit à
  SINA, les faits confirmés du projet), sa marque choisie (nom, idée, adversaire, voix), et l'étude du marché faite
  pour la marque (paroles réelles d'acheteurs, concurrents), reprise sans être repayée. Elle ne retourne écouter le web
  que s'il y a moins de huit paroles d'acheteurs ; chaque parole gardée est relue sur sa page.
- **Les questions avant les stratèges.** La consigne de l'étape demande à SINA de vérifier d'abord ce que le client
  seul peut savoir (ce que ses clients lui disent, le moment de l'achat, ce qu'on ressent, ce qu'il refuse de faire, ce
  qui fait revenir), sans jamais redemander ce qu'elle sait, et de noter chaque réponse.
- **Trois stratèges séparées**, en même temps, qui ne se voient pas : l'angle sûr part des faits du client, l'angle
  d'émotion part des paroles d'acheteurs, l'angle audacieux part des concurrents et du moule de la catégorie. Chacune
  écrit trois propositions. Chaque angle est une scène (qui, quand, avant, après), avec son accroche, le haut du site
  en mots, une publication d'exemple, ce qu'on montre, et les informations à confirmer.
- **Le contrôle du Studio, sans IA** : un prix, un poids, une durée, un pourcentage ou un mot de garantie que le
  client n'a pas dit plafonne la note de l'angle à 5 ; une accroche déjà écrite est signalée. Une heure de la journée
  dans une scène n'est pas une promesse.
- **Un juge à part** note chaque proposition sur 10 (un concurrent pourrait-il la signer ; une promesse absente des
  faits ; l'accroche lue seule fait-elle voir quelqu'un ; l'émotion vient-elle d'une vraie parole ; clair d'abord) et
  choisit les trois à montrer, avec celui qu'il recommande. Sous 8, l'entrée est reprise une fois par sa stratège
  (deux nouvelles propositions, avec les remarques du juge), puis rejugée. Un angle qui reste sous 8 est montré avec le
  doute de SINA, et n'est jamais recommandé. Un juge en panne ne bloque pas l'étape : c'est dit au client.
- **Le lecteur qui ne sait rien** lit l'accroche, le titre et le bouton du site, et le titre de la publication des
  trois angles. Ce qu'il ne comprend pas du premier coup est réécrit, puis relu. Une réécriture qui affirme ce que le
  client n'a pas dit est écartée.
- **Trois cartes dans le fil** (`angle-cards.tsx`), affichées dès la fin de la tâche : l'entrée, l'accroche en grand,
  la scène, la promesse, le haut du site en mots, la publication d'exemple, les paroles d'acheteurs avec leur page, les
  informations à confirmer, le doute éventuel. Aucune image n'est payée à cette étape.
- **Le client choisit un angle** (`angles.choose`). Il devient l'angle actif du projet, celui que lisent le site, les
  publications et les publicités (`activateSinaAngle`). Les autres angles notés 8 ou plus restent en réserve. Il peut
  changer d'avis : aucun nombre d'angles par forfait n'est compté pour ces trois angles.
- **L'écran « Angles »** (`tab-strategie.tsx`, `/api/projects/[id]/angles`) : un écran pour relire ses trois angles et
  dire son choix à SINA ; plus de cinq angles ni de révision payante sur cet écran.
- **Un seul accord du client pour toute l'étape** ; relire des angles prêts est gratuit. Une nouvelle proposition se
  demande avec ses mots (`redo`) : elle est payante, annoncée, et ne refait pas les angles déjà montrés.
- **En direct, pas en différé** : le client attend ses angles devant l'écran, et le différé n'y ferait gagner que
  quelques centimes.

## Devis calculé par le Studio (tarifs prudents du 6 novembre 2026)

| | Coût probable | Plafond jamais dépassé |
|---|---|---|
| Les trois angles, étude de la marque suffisante | 0,94 € | 2,90 € |
| Les trois angles, avec une écoute du web en plus | 1,02 € | 2,90 € |

Ce sont des devis, pas des mesures : le coût réel sera relevé à l'essai.

## Ce qui reste à faire pour finir le lot

1. **L'essai réel** : SINA seule, avec la vraie IA, sur des clients inventés (Claude ne joue que le client). Les
   clients du lot 2 n'existent plus sur la machine de travail : chaque client d'essai refait sa marque avant ses
   angles. Le plafond se décide avec le propriétaire juste avant.
2. **Retirer les anciennes façons**, une fois l'essai réussi : l'analyse de fiche et la recherche du Pilote
   (`preparation/` : `research*.ts`, `angles-judge.ts`, et ce qui ne sert plus), les outils `pilot.*` et
   `strategy.choose`, les cinq angles et leurs révisions payantes (`marketing-strategy.tsx`,
   `marketing-angle-cards.tsx`, `strategy-status.tsx`, la route `/marketing-strategy`), le banc
   `scripts/syna-recette/banc-angles.mts`, et leurs tests.

## Défauts connus, pas corrigés

- Le nombre d'angles par forfait (1, 2 et 5) est encore dans `plans.ts` : il ne compte plus pour les trois angles de
  SINA, et se décide au lot des forfaits.
- `theme-gallery.tsx` montre encore l'ancien encadré des cinq angles (ancienne galerie, à traiter avec le lot du site).
- L'angle actif est lié à l'offre du projet au moment du choix : si l'offre change beaucoup à l'étape de l'activité,
  les publications peuvent demander de le choisir à nouveau. À regarder au lot des publications.

## Vérifié, pas vérifié

- Vérifié le 16 novembre 2026 : la compilation sans erreur ; la suite complète des tests : 557 fichiers passés sur
  560, 2 ignorés, 1 en échec (4 987 tests passés, 1 échec, 6 ignorés ; 25 minutes). L'échec
  (`tests/theme211-render-evidence.test.ts`) est celui déjà connu : le test exige un navigateur à `/usr/bin/chromium`,
  absent de la machine de travail. 11 nouveaux tests pour la chaîne des angles (`tests/sina-etape4.test.ts`).
  L'écran des trois cartes a été regardé dans le Studio privé, avec des angles d'exemple posés à la main (sans IA).
- Pas vérifié : la chaîne avec la vraie IA ; la qualité réelle des angles.
