# Essai complet avec un nouveau client : le torréfacteur

Préparé le 26 novembre 2026, **sans aucune dépense**. Demande du propriétaire : « On se refait une marque de projet depuis
le départ jusqu'à la planche finale avec mes choix ». Rien n'est lancé tant qu'il n'a pas dit oui, étape par étape, au
prix annoncé.

## Le client inventé

Un petit torréfacteur artisanal qui vend en ligne des cafés en grains et moulus, et des coffrets. Une marque de produits.
**Il n'a pas encore de nom** : SINA lui en propose, il choisit. Aucune photo de produit, aucune personne : les produits de
la planche restent des images d'ambiance (« image d'ambiance, ce n'est pas ton produit »). Sa fiche,
`scripts/syna-recette/clients/torrefacteur.json` :

```json
{
  "metier": "petit torréfacteur artisanal qui vend en ligne des cafés en grains et moulus, et des coffrets",
  "kind": "produits",
  "produits": ["cafés en grains", "cafés moulus", "coffrets"],
  "prix": "environ 9 € le paquet de 250 g, en grains ou moulu ; environ 30 € le coffret de trois cafés",
  "clientele": "des gens qui aiment le bon café et veulent le boire frais chez eux, et des gens qui cherchent un cadeau",
  "gouts": "chaleureux, simple et artisanal",
  "descripteur": "café"
}
```

Pas de « nom » : c'est voulu. Le format ne demande pas de ville, il n'y en a pas. Les prix, la clientèle et les goûts sont
ce qu'un client dirait, avec ses mots ; ils vont dans sa fiche comme ses réponses de départ dans le Studio (prix, client
idéal, image voulue). Aucune coordonnée, aucun avis, aucun chiffre de plus. Le mot du métier (« café ») sert aux adresses
de remplacement (par exemple « nom-cafe.fr »).

**Le nom choisi part ensuite à toutes les étapes par `CLIENT_NOM`**, qui l'emporte sur la fiche. Sans lui, les étapes 2 à
6 refusent de partir : « Nom du client manquant (CLIENT_NOM, par exemple le nom choisi à l'essai des noms, ou « nom » du
fichier) : rien n'est lancé. »

## Avant de commencer

- Depuis la racine du dépôt. La clé Anthropic passe par `STUDIO_ANTHROPIC_KEY` dans les réglages de l'environnement, jamais
  dans la commande. Les clés des images passent par le relais de la session.
- Tout ce qui est produit va sous `data/essai-torrefacteur/` (jamais enregistré dans le dépôt) ; une seule base d'essai :
  `data/essai-torrefacteur/studio`.
- Chaque étape a son garde-fou (`PLAFOND_ESSAI_EUR`) : un appel qui ferait dépasser ne part pas, et le script s'arrête en
  le disant. Aucun appel n'est relancé tout seul.

Toutes les commandes payantes commencent par le même début (noté `DEBUT` ci-dessous) :

```
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-torrefacteur/studio CLIENT_JSON=scripts/syna-recette/clients/torrefacteur.json
```

Après l'étape 1, on y ajoute le nom choisi : `CLIENT_NOM="<le nom choisi>"`.

Les devis, gratuits (aucun appel, aucune clé) :

```
DEVIS_SEULEMENT=1 DATA_DIR=data/essai-torrefacteur/studio node_modules/.bin/tsx scripts/syna-recette/essai-noms.mts
DEVIS_SEULEMENT=1 DATA_DIR=data/essai-torrefacteur/studio node_modules/.bin/tsx scripts/syna-recette/essai-esquisses.mts
DEVIS_SEULEMENT=1 DATA_DIR=data/essai-torrefacteur/studio node_modules/.bin/tsx scripts/syna-recette/essai-finalisation.mts
DEVIS_SEULEMENT=1 DATA_DIR=data/essai-torrefacteur/studio node_modules/.bin/tsx scripts/syna-recette/essai-planches.mts
DEVIS_SEULEMENT=1 LOGO_HD=1 DATA_DIR=data/essai-torrefacteur/studio node_modules/.bin/tsx scripts/syna-recette/essai-planche-en-vrai.mts
```

## Étape 1 — les noms, avec leur adresse vérifiée

Nouveau script : `essai-noms.mts`. Il lance **la tâche de la marque du Studio telle quelle**, jusqu'aux noms vérifiés, comme
la carte « La marque » la lance pour un client sans nom : trois recherches sur le web et l'étude du marché, les idées de
la marque, quatre équipes de noms (chacune seule), le juge des noms le plus sévère, un second tour s'il en garde trop
peu, puis la vérification des noms gardés sur le web. La tâche s'arrête là, comme dans le Studio. Ensuite, gratuit,
l'adresse de chaque nom vérifié par les annuaires publics des registres (la même vérification que la planche), et
l'adresse que la planche écrirait.

```
DEBUT PLAFOND_ESSAI_EUR=3 \
  node_modules/.bin/tsx scripts/syna-recette/essai-noms.mts data/essai-torrefacteur/1-noms
```

Depuis le 26 novembre 2026 (« Il faut arrêter de montrer des plafond aussi haut ça va faire peur aux clients »), le plafond
de l'essai peut être proche du probable : 3 € est deux fois le probable (1,45 €), arrondi. Le script part sous la somme des
maxima (9,8495 €) et le dit ; il s'arrête proprement avant tout appel dont le pire cas dépasserait ce qui reste, garde ses
fichiers et les points de reprise de la tâche, écrit ce qui est fait et ce qu'il faudrait au plus pour finir. Pour
reprendre là, sans refaire ni repayer les étapes finies : la même commande, même dossier, avec `REPRENDRE=1`. Il refuse
toujours un client qui a déjà un nom.

**Où il risque de s'arrêter à 3 €** (ordre des appels et leurs maxima, devis gratuit du 26 novembre 2026) : dès le départ.
Les trois recherches sur le web partent en même temps, chacune réservée à son pire cas (1,0786 €) : 3,2357 € > 3 €, la
troisième est refusée avant de partir. Les deux premières sont payées (environ 0,24 € d'habitude) et perdues : l'étude
n'est pas faite, l'étape se refait à la reprise. Passé ce départ, et si chaque appel coûte son probable, le moment le plus
serré est la recherche des noms gardés (1,0786 € au pire) : 2,37 € sur le déroulé habituel, 2,65 € avec le second tour
d'idées, 2,90 € avec le second tour de noms, tous sous 3 € ; avec les deux seconds tours, 3,18 € : là, il s'arrêterait
avant cette recherche. Avec 3,50 €, l'essai passe le départ et va au bout dans tous ces cas, sauf réponses coupées en
série (les reprises courtes des équipes, 0,13 € au plus chacune).

Probable 1,45 € (2,26 € avec le second tour d'idées et le second tour de noms) ; plafond minimal exact 9,85 €. Le plafond est
haut parce que chaque recherche sur le web est comptée à son maximum (1,08 € chacune, quatre recherches), alors qu'une
recherche coûte en général 0,12 €.

À savoir : dans le Studio, l'accord de l'étape ne donne à cette tâche que 8,66 € au plus : il ne compte pas la vérification
des noms gardés. Le Studio compte sur ce que chaque appel rend de sa réservation pour la payer. L'essai prend la somme des
maxima comme plafond de la tâche, pour aller au bout à coup sûr. Je n'ai rien changé dans le Studio.
Corrigé après e4ba3c1c (26 novembre 2026) : l'accord du Studio donne maintenant à la tâche des noms la somme des maxima de
tous ses appels, vérification des noms gardés comprise (9,85 €), calculée par la même fonction que le plafond minimal de
l'essai (`devisDesNomsVerifies`). L'essai lui-même ne change pas : mêmes commandes, même devis (le refus sous 9,85 € est
retiré le 26 novembre 2026, voir plus haut).

**Pause.** Montrer au propriétaire `data/essai-torrefacteur/1-noms/rapport.txt` : les noms vérifiés, numérotés, avec pour
chacun ce que SINA dit de son adresse (« … est déjà pris ; libre aujourd'hui : … ») et l'adresse que la planche écrirait.
Le détail est dans `noms.json`. Depuis le 26 novembre 2026, le rapport dit aussi, tour par tour, les noms que SINA écarte
et pourquoi : les contrôles gratuits du Studio (concurrent, nom mal formé, déjà montré…), le juge (sa raison et sa note pour
les presque gardés ; il n'écrit rien pour un nom refusé, et c'est dit), puis la vérification ; ils sont aussi dans
`noms.json` (`ecartes`). Le client ne les voit jamais. Pour un essai déjà fait, sans rien refaire ni payer, si sa base
d'essai est encore là :

```
DATA_DIR=data/essai-torrefacteur/studio node_modules/.bin/tsx scripts/syna-recette/essai-noms-ecartes.mts data/essai-torrefacteur/1-noms
```

**Son choix** : un nom, écrit exactement comme dans le rapport. Il part ensuite partout par `CLIENT_NOM="<le nom>"`.

## Étape 2 — les 12 esquisses relues

```
DEBUT CLIENT_NOM="<le nom choisi>" PLAFOND_ESSAI_EUR=1.83 \
  node_modules/.bin/tsx scripts/syna-recette/essai-esquisses.mts data/essai-torrefacteur/2-esquisses
```

La recherche du parcours, telle quelle : le métier en mots simples, deux planches de six esquisses, la découpe gratuite, un
appel au relecteur. **Toujours 12 esquisses correctes** : chaque écartée est remplacée par le même modèle, avec une nouvelle
planche de six, à la charge du Studio, au plus trois tours ; sinon rien n'est montré.

Probable 0,15 € (0,29 € si le métier est réécrit et un tour de remplacement fait) ; plafond minimal exact 1,83 €.

**Pause.** Montrer, en tête de `rapport.txt`, combien des 12 étaient correctes dès les deux planches et lesquelles ont été
remplacées ; puis `planche-contact.png` (les 12, numérotées) et `planche-contact-complete.png` (toutes, les écartées barrées).
La phrase relevée sous chaque esquisse est dans `rapport.txt`.

**Son choix** : deux esquisses (leurs numéros NN et MM) et, s'il le veut, une phrase sous le nom : celle d'une esquisse
(« esquisse 5 »), une de ses lignes (« esquisse 5 ligne 1 »), la sienne (« / » entre les lignes) ou « aucune ». Le métier
court écrit à cette étape (`esquisses.json`, « metier.court ») servira au bas du badge si le logo n'a pas de phrase.

## Étape 3 — les deux logos finis

```
DEBUT CLIENT_NOM="<le nom choisi>" PLAFOND_ESSAI_EUR=2.20 \
  RAPPORT_ESQUISSES=data/essai-torrefacteur/2-esquisses/rapport.txt PHRASE="<sa phrase>" \
  node_modules/.bin/tsx scripts/syna-recette/essai-finalisation.mts data/essai-torrefacteur/3-logos \
  data/essai-torrefacteur/2-esquisses/esquisse-NN.png data/essai-torrefacteur/2-esquisses/esquisse-MM.png
```

Son choix entre par les deux chemins d'esquisse et par `PHRASE` (pour les deux logos) ou `PHRASE_NN` (pour un seul), comme
pour Écume. Le métier est relu dans le rapport de l'étape 2, jamais réécrit.

Probable 0,19 € (0,39 € si chaque logo est refait une fois) ; plafond minimal exact 2,20 € (2,1906 €).

**Pause.** Montrer `esquisse-NN-logo-garde.png` et `esquisse-MM-logo-garde.png`. La phrase de chaque logo est gardée dans
`esquisse-NN-phrase-du-logo.txt`. Un logo refusé deux fois : il choisit une autre esquisse déjà vue, l'étape se relance pour
elle seule, au même prix par logo.

## Étape 4 — une planche de marque par logo

```
DEBUT CLIENT_NOM="<le nom choisi>" PLAFOND_ESSAI_EUR=2.14 \
  node_modules/.bin/tsx scripts/syna-recette/essai-planches.mts data/essai-torrefacteur/4-planches \
  data/essai-torrefacteur/3-logos/esquisse-NN-logo-garde.png data/essai-torrefacteur/3-logos/esquisse-MM-logo-garde.png
```

Le script lit, à côté de chaque logo, la phrase qu'il porte, vérifie le domaine avant le dessin, puis fait et relit chaque
planche. Une planche en erreur n'empêche pas l'autre.

Probable 0,43 € (0,86 € si les mots du métier sont réécrits et chaque planche refaite une fois) ; plafond minimal exact
2,14 € (2,1341 €).

**Pause.** Montrer `planche-A-gardee.png` et `planche-B-gardee.png`, en entier. A est le logo de l'esquisse NN, B celui de
l'esquisse MM.

**Son choix** : sa planche, A ou B (notée X ; NN est alors l'esquisse de son logo).

## Étape 5 — la planche choisie, refaite en vrai, avec les quatre logos en haute définition

Sur le chemin normal, **sans `REASSEMBLER`** : `LOGO_HD=1` marche maintenant sur cette commande (voir plus bas).

```
DEBUT CLIENT_NOM="<le nom choisi>" PLAFOND_ESSAI_EUR=8.31 LOGO_HD=1 \
  RESULTAT_PLANCHE=data/essai-torrefacteur/4-planches/planche-X-resultat.json \
  PHRASE="$(cat data/essai-torrefacteur/3-logos/esquisse-NN-phrase-du-logo.txt)" \
  METIER_COURT="$(node -p "require('./data/essai-torrefacteur/2-esquisses/esquisses.json').metier.court")" \
  node_modules/.bin/tsx scripts/syna-recette/essai-planche-en-vrai.mts data/essai-torrefacteur/5-planche-en-vrai \
  data/essai-torrefacteur/4-planches/planche-X-gardee.png data/essai-torrefacteur/3-logos/esquisse-NN-logo-garde.png
```

Son choix entre par `RESULTAT_PLANCHE`, la planche et le logo donnés (le script refuse un logo qui n'est pas celui de la
planche choisie) et `PHRASE`. Dans l'ordre : la découpe, l'inventaire, les 17 images refaites et relues (une reprise au
plus, à la charge du Studio), les logos, la palette, les polices et l'assemblage en 3072 × 4608 ; puis, avec `LOGO_HD=1`,
les quatre petites versions du logo reprises de l'aperçu (compact, icône, favicon, badge) refaites en haute définition, à
la charge du Studio, relues en un appel, une reprise des refusées ; enfin les logos et la planche refaits par le code avec
les versions gardées, `etat.json`, `essai.json` et le parcours. Si le symbole du logo se sépare du nom, rien n'est repris de
l'aperçu : aucun appel de plus, et le rapport le dit.

Le script refuse de partir sous le plafond minimal exact de la commande, 8,3057 € (la planche en vrai, 6,6978 €, et
LOGO_HD, 1,6080 €). Probable 1,85 € (3,49 € si tout est refait une fois). Hors plafond, une réponse de texte mal formée à
réparer coûterait au plus 3,08 € de plus ; elle n'est pas couverte, l'essai s'arrêterait en le disant.

**La reprise d'une passe interrompue** (construite le 26 novembre 2026, après l'arrêt de la première passe de Mouture à la
sixième image sur une erreur de connexion du fournisseur : résultat incertain, 0,0873 € retenus ; l'inventaire et cinq
images reçus, rien relu) : la même commande, même dossier de sortie, avec `REPRENDRE=1` en plus. L'inventaire, les images,
les relectures et les logos déjà reçus sont repris tels quels, jamais redemandés ni repayés ; la planche et le logo doivent
être ceux de la passe d'avant. Le rapport et la dépense d'avant vont dans `passe-1/`. Le reste est fait normalement, puis
LOGO_HD, l'assemblage, `etat.json`, `essai.json` et le parcours. L'appel au résultat incertain n'est refait que parce que
le propriétaire relance lui-même : jamais tout seul. Tout arrêt écrit désormais « Comment reprendre ». Pour Mouture
(planche A, logo de l'esquisse 11, plafond donné à la première passe : 4 €) :

```
DEBUT CLIENT_NOM="Mouture" PLAFOND_ESSAI_EUR=3 LOGO_HD=1 REPRENDRE=1 \
  RESULTAT_PLANCHE=data/essai-torrefacteur/4-planches/planche-A-resultat.json \
  PHRASE="$(cat data/essai-torrefacteur/3-finalisation/esquisse-11-phrase-du-logo.txt)" \
  METIER_COURT="$(node -p "require('./data/essai-torrefacteur/2-esquisses/esquisses.json').metier.court")" \
  node_modules/.bin/tsx scripts/syna-recette/essai-planche-en-vrai.mts data/essai-torrefacteur/5-planche-en-vrai \
  data/essai-torrefacteur/4-planches/planche-A-gardee.png data/essai-torrefacteur/3-finalisation/esquisse-11-logo-garde.png
```

Devis gratuit de ce qui reste (même début, `DEVIS_SEULEMENT=1`) : 12 images (dont celle de l'appel incertain), 4
relectures, puis LOGO_HD ; probable 1,41 € (3,05 € si chaque image est refaite une fois), somme des maxima de ce qui reste
7,22 € ; plafond conseillé 3 € (deux fois le probable, arrondi). Aucun appel isolé ne demande plus : le plus cher qui
reste est une relecture, 0,27 € au plus.

Ce qu'elle écrit en plus dans `5-planche-en-vrai` : `logos-hd/` (pour chaque version et chaque tour : le texte envoyé, la
tuile et le logo joints, l'image reçue, la demande et le verdict de la relecture).

## Étape 6 — l'écran (gratuit)

```
DATA_DIR=data/essai-torrefacteur/studio node_modules/.bin/tsx scripts/syna-recette/ecran-planche-en-vrai.mts data/essai-torrefacteur/5-planche-en-vrai/etat.json
```

Il relit le client et le projet dans `essai.json`, écrit le parcours et donne l'adresse de la page Marque et le compte
fictif. Puis lancer le studio privé sur la même base (`lancer-agent.mts`) et prendre les captures avec `capture.cjs`
(ordinateur 1440 de large, téléphone 390) dans `data/essai-torrefacteur/6-ecran/`.

## Le chemin normal porte les corrections d'Écume

Vérifié sans dépense le 26 novembre 2026 par un essai de bout en bout du chemin normal, avec des appels simulés, sur les
vrais fichiers d'Écume (`tests/planche-en-vrai-chemin-normal-ecume.test.ts`) : les 17 images gardées, la story et le
téléphone compris ; la palette écrite de l'aperçu ; la police du spécimen choisie par l'inventaire ; le bloc 01 repris de
l'aperçu ; la petite finition nettoyée ; le site en une image ; et **la planche est la même, au pixel près, que celle du
réassemblage** avec les mêmes images. Tout ce que le réassemblage corrige est donc aussi sur le chemin normal.

| Correction | Où, sur le chemin normal |
|---|---|
| Polices de mise en page | `assemblerLaPlanche` (planche-en-vrai-code.ts), appelée par `assemblerEtRanger` (planche-en-vrai-tache.ts) |
| Palette de l'aperçu (codes écrits, encre et mots) | `paletteDeLaPlanche` dans `plancheEnVrai` ; lignes de la palette dans `assemblerLaPlanche` |
| Spécimen mesuré | `assemblerLaPlanche`, avec `phrasesDesPolices` (assemblerEtRanger) |
| Bloc 01 repris de l'aperçu sans symbole séparable | `versionsDuLogo(… tuiles)` dans `plancheEnVrai`, `tuilesDuBloc01` dans `assemblerEtRanger` |
| Titres nettoyés | `textesDeLaPlanche` (assemblerEtRanger) |
| Zone de la case | `decouperLesApercus` (les cases qui touchent une bande de titre), puis `raisonsDuRefusEnVrai(… deborde)` dans `refaireLesElements` |
| Heure du téléphone | `raisonsDuRefusEnVrai(… element)` dans `refaireLesElements` |
| Recalage sur les gouttières | `decouperLesApercus` (planche-en-vrai.ts), au début de `plancheEnVrai` |
| Fond de l'aperçu gardé | `assemblerLaPlanche` |
| Découpe au plus juste | `rangerLesImages` → `imageMontree` (planche-en-vrai-tache.ts) |
| Site en une image | `rangerLaPlanche` → `imageDuSite` |
| Écran qui suit l'état | le script écrit `etat.json` et `essai.json` après tout (LOGO_HD compris) et enregistre le parcours (`enregistrerLeParcours`) |
| Signe parasite en petite finition | à la planche de marque, `signeParasiteIsole` (planche-de-marque.ts) ; dans la planche en vrai, `planche.finitions` lu par `textesDeLaPlanche` |
| Phrase du logo par ses lignes | `donneesDeLaPlanche` (lignes du résultat), `lectureDeLaPlanche` à la planche de marque, `texteDuBasDuBadge` en vrai |
| Police qui suit le spécimen | `demandeDeLInventaire(… catalogueDesPolicesParGenre())`, puis `policeDuCatalogue` dans `plancheEnVrai` |
| 12 esquisses toujours correctes | `uneRecherche` (logo-graphistes.ts), appelée telle quelle par l'essai des esquisses |

Branché pendant cette préparation : `LOGO_HD` sur le chemin normal (avant, le script le refusait sans `REASSEMBLER`) ; la
ligne du logo et le métier court donnés à la planche en vrai comme dans le Studio (avant, le bas du badge d'un logo sans
phrase restait vide dans l'essai, alors que le Studio y met le métier court).

## Les prix

| Étape | Son choix | Probable | Si tout est refait une fois | Plafond minimal exact |
|---|---|---|---|---|
| 1. Les noms | un nom → `CLIENT_NOM` | 1,45 € | 2,26 € | 9,85 € |
| 2. Les 12 esquisses | deux numéros et la phrase | 0,15 € | 0,29 € | 1,83 € |
| 3. Deux logos finis | une planche par logo | 0,19 € | 0,39 € | 2,20 € |
| 4. Deux planches | A ou B | 0,43 € | 0,86 € | 2,14 € |
| 5. Planche en vrai et LOGO_HD | — | 1,85 € | 3,49 € | 8,31 € |
| 6. Écran | — | 0 € | 0 € | 0 € |
| **Total** | | **4,07 €** | **7,30 €** | **24,33 €** |

Chiffres tirés des devis gratuits du 26 novembre 2026 (somme exacte des plafonds minimaux : 24,3068 € ; arrondis aux
plafonds des commandes : 24,33 €). Deux logos et deux planches. Les plafonds comptent tous les maxima, reprises et tours de
remplacement à la charge du Studio compris : ils garantissent d'aller au bout, ils ne seront presque jamais dépensés.
LOGO_HD est à la charge du Studio, comme pour Écume. Rien n'a été lancé avec les vrais appels.
