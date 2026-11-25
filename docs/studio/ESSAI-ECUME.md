# Essai complet avec un nouveau client : Écume

Préparé le 25 novembre 2026, **sans aucune dépense**. Rien n'est lancé tant que le propriétaire n'a pas dit oui, étape
par étape, au prix annoncé.

## Le client inventé

Écume, une savonnerie artisanale qui vend en ligne des savons solides, des shampoings solides et des baumes. Type
« produits ». Elle garde son nom. Aucune photo de produit, aucune personne. Sa fiche :
`scripts/syna-recette/clients/ecume.json`, donnée aux quatre scripts par `CLIENT_JSON`.

Les scripts n'ont plus de client par défaut : sans client donné, ou avec un client incomplet, ils refusent de partir et
disent ce qui manque. Racine ne sert plus que d'exemple dans les essais simulés.

Domaine vérifié gratuitement le 25 novembre 2026 par la vérification du Studio (annuaires publics des registres) :
ecume.fr et ecume.com sont pris, ecumefrance.fr et ecumefrance.com étaient libres ce jour-là. La planche écrira donc
« ecumefrance.fr — disponible » si rien ne change d'ici l'essai (le domaine est revérifié juste avant le dessin).

## Avant de commencer

- Depuis la racine du dépôt. La clé Anthropic passe par `STUDIO_ANTHROPIC_KEY` dans les réglages de l'environnement,
  jamais dans la commande. Les clés des images passent par le relais de la session.
- Tout ce qui est produit va sous `data/essai-ecume/` (jamais enregistré dans le dépôt) ; une seule base d'essai :
  `data/essai-ecume/studio`.
- Chaque étape a son garde-fou (`PLAFOND_ESSAI_EUR`) : un appel qui ferait dépasser ne part pas, et le script s'arrête
  en le disant. Aucun appel n'est relancé tout seul.

Toutes les commandes payantes commencent par le même début :

```
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-ecume/studio CLIENT_JSON=scripts/syna-recette/clients/ecume.json
```

Les devis, gratuits (aucun appel, aucune clé) :

```
DEVIS_SEULEMENT=1 DATA_DIR=data/essai-ecume/studio node_modules/.bin/tsx scripts/syna-recette/essai-esquisses.mts
DEVIS_SEULEMENT=1 DATA_DIR=data/essai-ecume/studio node_modules/.bin/tsx scripts/syna-recette/essai-finalisation.mts
DEVIS_SEULEMENT=1 DATA_DIR=data/essai-ecume/studio node_modules/.bin/tsx scripts/syna-recette/essai-planches.mts
DEVIS_SEULEMENT=1 DATA_DIR=data/essai-ecume/studio node_modules/.bin/tsx scripts/syna-recette/essai-planche-en-vrai.mts
```

## Étape 1 — les esquisses, triées par le relecteur (à refaire en entier)

Le premier passage du 25 novembre 2026 (0,12 € comptés, 8 esquisses gardées sur 12) a montré trois défauts, corrigés
depuis sans dépense : la découpe tranchait la grande forme beige pâle de la case 6 (le fond est maintenant mesuré) ; le
relecteur écartait les médaillons et badges ronds pour « arche » (critère retiré pour les logos) ; il ne relevait que la
première des deux lignes sous le nom (tout le texte est maintenant relevé, ligne par ligne). Le propriétaire : « Non sina
doit réussir à faire les 12 logos correctement sur la planche ». L'étape 1 est donc refaite en entier, avec de nouvelles
planches, sur son oui ; on ne reprend pas les anciennes.

```
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-ecume/studio CLIENT_JSON=scripts/syna-recette/clients/ecume.json \
  PLAFOND_ESSAI_EUR=1.83 node_modules/.bin/tsx scripts/syna-recette/essai-esquisses.mts data/essai-ecume/1-esquisses-2
```

Exactement la recherche du parcours : le métier en mots simples, les deux planches de six esquisses (qualité inchangée),
la découpe gratuite, puis un seul appel au relecteur (effort moyen). Une esquisse refusée n'est jamais montrée. **Toujours
12 esquisses correctes** : chaque écartée est remplacée avec le même modèle, par une nouvelle planche de six de ce modèle
(« Évite ces pistes déjà présentées : … »), relue, à la charge du Studio, au plus trois tours ; si la borne est atteinte,
rien n'est montré (jamais moins de 12) et le compte rendu le dit. Le texte sous le nom est relevé en entier, ligne par
ligne, dans l'ordre.
Probable 0,15 € (0,29 € si le métier est réécrit et un tour de remplacement fait) ; plafond minimal 1,83 €, les trois
tours de remplacement compris (devis gratuit du 25 novembre 2026).

**Pause.** Montrer au propriétaire :
- en tête de `rapport.txt` (et dans `esquisses.json`, champ `compte`) : **le vrai résultat**, combien des 12 étaient
  correctes dès les deux planches, puis combien ont dû être remplacées, lesquelles et pourquoi ;
- `data/essai-ecume/1-esquisses-2/planche-contact.png` : les 12 esquisses, numérotées comme le client les voit ;
- `planche-contact-complete.png` : toutes les esquisses découpées, remplacements compris, les écartées barrées d'un
  bandeau rouge « ÉCARTÉE » avec leur raison, les correctes en trop d'une planche de remplacement sous un bandeau gris
  « EN PLUS » ;
- dans `rapport.txt`, le texte relevé sous chaque esquisse, toutes ses lignes (« proposable tel quel » ou non).

Il choisit **deux esquisses** (leurs numéros NN et MM) et, s'il le veut, **une phrase sous le nom** : celle d'une
esquisse, toutes ses lignes (« esquisse 5 ») ou une seule (« esquisse 5 ligne 1 »), la sienne (« / » entre ses lignes),
ou « aucune ».

## Étape 2 — les deux logos finis

```
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-ecume/studio CLIENT_JSON=scripts/syna-recette/clients/ecume.json \
  PLAFOND_ESSAI_EUR=2.20 RAPPORT_ESQUISSES=data/essai-ecume/1-esquisses-2/rapport.txt PHRASE="<sa phrase>" \
  node_modules/.bin/tsx scripts/syna-recette/essai-finalisation.mts data/essai-ecume/2-finalisation \
  data/essai-ecume/1-esquisses-2/esquisse-NN.png data/essai-ecume/1-esquisses-2/esquisse-MM.png
```

- La phrase : `PHRASE` vaut pour les deux logos ; `PHRASE_NN` (par exemple `PHRASE_4`) pour un seul logo ;
  `PHRASE="esquisse 5"` pour toutes les lignes relevées sous l'esquisse 5, dans l'ordre (refusée si l'orthographe d'une
  seule ligne n'est pas sûre, comme dans le parcours) ; `PHRASE="esquisse 5 ligne 1"` pour sa première ligne seulement ;
  sa phrase à lui, entre guillemets, avec « / » entre ses lignes (par exemple
  `PHRASE="SAVONNERIE ARTISANALE / SAVONS · SHAMPOINGS · BAUMES"`) ; « aucune » pour un logo sans phrase ; rien du tout :
  la règle d'avant (une ligne seulement si elle dit le vrai métier). Chaque ligne est reprise mot pour mot, contrôlée par
  la fonction du Studio, et une faute évidente fait tout refuser avant la dépense. Le logo fini doit porter exactement ces
  lignes, dans cet ordre : une ligne manquante, mal écrite ou en trop le fait refuser, jamais « inventée ».
- `esquisses.json` peut être corrigé à la main avant l'étape 2 (le script le relit tel quel, le contrôle d'orthographe du
  code s'applique à chaque ligne) : la phrase d'une esquisse en tableau de lignes
  (`"phrase": { "lignes": ["…", "…"], "ok": true }` ou `"phrase": ["…", "…"]`), ou une chaîne avec « / » entre les lignes.
- Le métier est relu dans le rapport de l'étape 1, jamais réécrit. Les esquisses données doivent être des esquisses
  gardées par le relecteur (`esquisses.json`, à côté du rapport) : une écartée fait tout refuser.

Probable 0,19 € (0,39 € si chaque logo est refait une fois) ; plafond minimal 2,20 €.

À montrer : `esquisse-NN-logo-garde.png` et `esquisse-MM-logo-garde.png`. Le fichier `esquisse-NN-phrase-du-logo.txt`
garde la phrase que porte chaque logo (vide : aucune). Un logo refusé deux fois n'est pas gardé : le propriétaire choisit
une autre esquisse déjà vue, et l'étape se relance pour elle seule (un seul chemin d'esquisse, un autre dossier de
sortie), au même prix par logo.

## Étape 3 — une planche de marque par logo

Les logos choisis : A = le logo de l'esquisse 6, B = celui de l'esquisse 10.

```
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-ecume/studio CLIENT_JSON=scripts/syna-recette/clients/ecume.json \
  PLAFOND_ESSAI_EUR=2.14 node_modules/.bin/tsx scripts/syna-recette/essai-planches.mts data/essai-ecume/3-planches \
  data/essai-ecume/2-finalisation/esquisse-06-logo-garde.png data/essai-ecume/2-finalisation/esquisse-10-logo-garde.png
```

Les mots du métier (contrôlés), le domaine vérifié par le Studio avant le dessin, la disposition standard (Écume n'est
pas un métier des animaux), puis chaque planche et sa relecture.

**La phrase sous le logo** (25 novembre 2026) : le script lit, à côté de chaque logo, la phrase qu'il porte
(`esquisse-06-phrase-du-logo.txt` et `esquisse-10-phrase-du-logo.txt`, écrits par l'étape 2 ; vide : aucune). Chaque
planche reçoit la phrase de son logo, toutes ses lignes dans l'ordre, posée mot pour mot dans la ligne de la marque après
l'appel des valeurs du métier ; le relecteur dit où il la lit et le code compare lettre pour lettre (mal écrite : la
planche est refaite une fois, à la charge du Studio). Si le fichier de phrase manque à côté d'un logo, rien n'est lancé.
Le rapport écrit, en tête, la phrase de chaque logo.

Recalculé le 25 novembre 2026 par le devis du script (`DEVIS_SEULEMENT=1`, aucun appel), pour deux planches avec la
reprise possible de chacune à la charge du Studio : probable 0,4322 € sans refus (0,8645 € si les mots du métier sont
réécrits et chaque planche refaite une fois) ; **plafond minimal exact 2,1341 €** (somme des maxima : 1,0670 € pour le
client et 1,0670 € de borne du Studio). La phrase ne change pas le devis : le prix au plus d'une planche est compté au
texte le plus long permis, et celui du relecteur sur une demande plus longue que la vraie. Le script **refuse de partir**
si `PLAFOND_ESSAI_EUR` est sous ce plafond minimal : 2,14 € passe (marge de 0,0059 €). Hors plafond : une réponse de texte
mal formée à réparer coûterait au plus 1,5898 € de plus en tout ; elle n'est pas couverte, l'essai s'arrêterait en le
disant, sans rien dépenser de plus.

**Pause.** Montrer `planche-A-gardee.png` (le logo 6) et `planche-B-gardee.png` (le logo 10), seules les gardées, en
entier. Le domaine écrit est dans `domaine.json`. Il choisit **sa planche** : A ou B.

## Étape 4 — la planche choisie, refaite en vrai

Avec X la planche choisie et NN l'esquisse de son logo :

```
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-ecume/studio CLIENT_JSON=scripts/syna-recette/clients/ecume.json \
  PLAFOND_ESSAI_EUR=6.70 RESULTAT_PLANCHE=data/essai-ecume/3-planches/planche-X-resultat.json \
  PHRASE="$(cat data/essai-ecume/2-finalisation/esquisse-NN-phrase-du-logo.txt)" \
  node_modules/.bin/tsx scripts/syna-recette/essai-planche-en-vrai.mts data/essai-ecume/4-planche-en-vrai \
  data/essai-ecume/3-planches/planche-X-gardee.png data/essai-ecume/2-finalisation/esquisse-NN-logo-garde.png
```

Le domaine, l'année et la disposition sont relus dans le résultat de la planche choisie ; le script refuse si le logo
donné n'est pas celui de cette planche. Les 17 images refaites, relues, puis les logos, la palette, les polices et la
planche assemblée.
Probable 1,50 € (2,78 € si chaque image est refaite une fois) ; plafond minimal 6,70 € (7,60 € conseillé, qui couvre
aussi une réponse mal formée à réparer).

## Étape 5 — l'onglet Marque, en captures (gratuit)

```
DATA_DIR=data/essai-ecume/studio node_modules/.bin/tsx scripts/syna-recette/ecran-planche-en-vrai.mts data/essai-ecume/4-planche-en-vrai/etat.json
```

Il relit le client et le projet dans `essai.json`, écrit le parcours et donne l'adresse de la page Marque et le compte
fictif. Puis lancer le studio privé sur la même base (`lancer-agent.mts`, après une construction du Studio si elle
n'est pas faite) et prendre les captures avec `capture.cjs` (ordinateur 1440 de large, téléphone 390), dans
`data/essai-ecume/5-ecran/`.

## Les prix

| Étape | Probable | Si tout est refait une fois | Plafond minimal |
|---|---|---|---|
| 1. Esquisses triées (refaite) | 0,15 € | 0,29 € | 1,83 € |
| 2. Deux logos finis | 0,19 € | 0,39 € | 2,20 € |
| 3. Deux planches (avec la phrase de chaque logo) | 0,43 € | 0,86 € | 2,14 € |
| 4. Planche en vrai | 1,50 € | 2,78 € | 6,70 € |
| 5. Écran | 0 € | 0 € | 0 € |
| **Total** | **2,27 €** | **4,32 €** | **12,87 €** |

Chiffres tirés des devis gratuits du 25 novembre 2026 (somme exacte des plafonds minimaux : 12,85 € ; arrondis aux
plafonds donnés ci-dessus : 12,87 €). Le plafond de l'étape 1 compte les trois tours de remplacement, à la charge du
Studio. Déjà dépensé : 0,12 € pour le premier passage de l'étape 1, mis de côté. Le plafond minimal est la somme de tous les maxima, reprises comprises : il
garantit d'aller au bout, il ne sera presque jamais dépensé.
