# Lot 3 : les trois angles

Compte rendu du 16 novembre 2026. Accord du propriétaire pour construire : « Oui, on construit comme ça ».
**Construit, puis essayé avec la vraie IA sur deux clients inventés le même jour.** Reste l'avis du propriétaire sur
les angles, puis le retrait des anciennes façons.

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
- **Les types de clients d'abord** (règle du propriétaire, voir l'essai) : SINA dresse la liste des types de clients
  différents du commerce, chacun avec son envie et son besoin ; chaque proposition en vise un ; les trois angles
  montrés visent trois types de clients différents, et c'est le Studio qui le garantit, pas le juge.
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

## L'essai réel (16 novembre 2026)

Clients repris de l'essai du lot 2 (copie sans clé sur la branche `essai-lot2-donnees`, jamais fusionnée) : le
réparateur de vélos « Bécane » et la maroquinière « Atelier Vasco ». SINA a travaillé seule ; Claude n'a joué que les
clients. **Dépensé : 5,04 €** comptés par le Studio (accords : 4 €, puis 6 € pour la suite). Faute de Claude, dite au
propriétaire : les cinq premiers échanges (0,47 €) sont partis avant son oui sur le prix.

| | Création des angles | Devis probable | Durée |
|---|---|---|---|
| Bécane, premier essai (écoute du web comprise) | 0,90 € | 1,02 € | 4 minutes |
| Bécane, après la règle des types de clients (une entrée reprise) | 1,24 € | 1,08 € | 6 minutes |
| Atelier Vasco (étude suffisante, aucune reprise) | 0,72 € | 1,00 € | 3 minutes |

Vu avec la vraie IA :
- SINA pose ses questions avant de créer, une à la fois, les note, et relève une contradiction avec ce que le client
  avait dit (le délai de retour du vélo) ; elle demande à la maroquinière qui sont ses différents types de clientes ;
- l'écoute du web quand l'étude n'a aucune parole d'acheteur (4 paroles gardées, relues sur leur page, et dit au client) ;
- les types de clients dressés avant les stratèges (5 pour Bécane, 6 pour Atelier Vasco) ;
- les trois stratèges, le juge, une reprise d'entrée (l'émotion de Bécane), le lecteur qui ne sait rien (3 à 4 phrases
  reprises par création), une phrase encore peu claire dite au client ;
- rien d'inventé : les prix et les faits sont ceux du client, le délai est écrit « le plus souvent le soir même » ;
- le choix d'un angle, enregistré comme angle actif du projet ; une nouvelle proposition demandée avec ses mots ;
- SINA dit d'elle-même son doute sur un angle noté 8 par le juge (l'audacieux d'Atelier Vasco contredit la signature).

**Décision du propriétaire pendant l'essai** (ses mots) : « un angle marketing c'est le fait d'aller chercher une
typologie de client différente, avec des envies et besoins différents, mais qui recherche le même produit ; c'est juste
qu'il n'est pas mis en avant et en valeur de la même façon sur le site et la communication ». Le premier essai montrait
deux angles pour le même client (le vieux vélo au garage). Construit et revu avec la vraie IA : la liste des types de
clients avant les stratèges, un type de client par proposition, trois angles = trois types de clients différents
garantis par le Studio (`pickThree`), le type de client en tête de chaque carte.

Corrigé après l'essai, testé avec une IA simulée seulement : ce que SINA note dans la mémoire du projet fait partie des
faits (une question déjà répondue revenait dans « à confirmer ») ; les questions « à confirmer » sont au tutoiement.

Pas vu avec la vraie IA : un angle montré avec le doute du juge (aucun n'est resté sous 8) ; un troisième client.
**Le propriétaire n'a pas encore dit si les angles lui conviennent** : le lot n'est pas fini sans son avis.

## La leçon des angles (16 novembre 2026, après l'essai)

Avis du propriétaire sur les angles de l'essai : « on peut mieux faire et bien différencier la clientèle type sur
angles différents ». Puis sa demande : aller voir sur internet comment faire comprendre à SINA ce qu'est un angle,
lui en faire une leçon, et lui en rendre compte.

- Lu : sept pages (agences de publicité, un spécialiste français, Mailchimp, Strategyn), plus des résumés du livre
  d'Eugene Schwartz et de la méthode Strategyzer. Retour au propriétaire, avec les captures :
  https://claude.ai/artifact/EdYHvAQAnTzKxcBfpuudYV
- Écrit : le cahier `docs/sina-savoir/angles-marketing.md` (sa définition d'abord ; ce qu'est un vrai type de client,
  c'est-à-dire une situation, jamais un âge ni une crainte partagée par tous ; ce qui change d'un angle à l'autre ; les
  règles, dont l'épreuve de l'échange ; les fautes).
- Branché : le cahier est lu à chaque création (`angles-knowledge.ts`) par celle qui dresse les types de clients, les
  trois stratèges et le juge ; SINA pose au commerçant les questions de la leçon.
- Constat sur l'essai : deux « types de clients » montrés n'en étaient pas (« ceux qui craignent la mauvaise surprise
  sur la facture », « celle qui veut voir le travail de près »).
- Proposé, pas encore accepté ni construit : choisir les trois clientèles AVANT d'écrire, chaque stratège écrivant
  pour ces trois-là ; un produit ou une prestation vedette différente par angle ; les trois clientèles côte à côte en
  haut de l'écran.
- Pas vérifié : la leçon avec la vraie IA.

## Ce qui reste à faire pour finir le lot

1. **L'avis du propriétaire** sur les angles de Bécane et d'Atelier Vasco.
2. **Retirer les anciennes façons** : l'analyse de fiche et la recherche du Pilote
   (`preparation/` : `research*.ts`, `angles-judge.ts`, et ce qui ne sert plus), les outils `pilot.*` et
   `strategy.choose`, les cinq angles et leurs révisions payantes (`marketing-strategy.tsx`,
   `marketing-angle-cards.tsx`, `strategy-status.tsx`, la route `/marketing-strategy`), le banc
   `scripts/syna-recette/banc-angles.mts`, et leurs tests. Puis supprimer la branche `essai-lot2-donnees` quand les
   clients d'essai ne servent plus (ils peuvent resservir au lot du site).

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
