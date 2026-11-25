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

## Étape 1 — les 12 esquisses

```
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-ecume/studio CLIENT_JSON=scripts/syna-recette/clients/ecume.json \
  PLAFOND_ESSAI_EUR=0.44 node_modules/.bin/tsx scripts/syna-recette/essai-esquisses.mts data/essai-ecume/1-esquisses
```

Le métier écrit en mots simples, puis les deux planches de six esquisses, découpées gratuitement.
Probable 0,07 € (0,09 € si le métier est réécrit une fois) ; plafond minimal 0,44 €.

**Pause.** Montrer au propriétaire `data/essai-ecume/1-esquisses/planche-contact.png` (les esquisses numérotées) et les
deux planches entières (`planche-*.png`). Ce script s'arrête à la découpe : les esquisses ne sont pas relues avant
d'être montrées. Il choisit **deux esquisses** (leurs numéros NN et MM) et, s'il le veut, **une phrase sous le nom** :
celle écrite sur une esquisse, recopiée lettre pour lettre, ou la sienne, ou « aucune ».

## Étape 2 — les deux logos finis

```
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-ecume/studio CLIENT_JSON=scripts/syna-recette/clients/ecume.json \
  PLAFOND_ESSAI_EUR=2.20 RAPPORT_ESQUISSES=data/essai-ecume/1-esquisses/rapport.txt PHRASE="<sa phrase>" \
  node_modules/.bin/tsx scripts/syna-recette/essai-finalisation.mts data/essai-ecume/2-finalisation \
  data/essai-ecume/1-esquisses/esquisse-NN.png data/essai-ecume/1-esquisses/esquisse-MM.png
```

- La phrase : `PHRASE` vaut pour les deux logos ; `PHRASE_NN` (par exemple `PHRASE_4`) pour un seul logo ; « aucune »
  pour un logo sans phrase ; rien du tout : la règle d'avant (une ligne seulement si elle dit le vrai métier). Elle est
  reprise mot pour mot, contrôlée par la fonction du Studio, et une faute évidente fait tout refuser avant la dépense.
- Le métier est relu dans le rapport de l'étape 1, jamais réécrit.

Probable 0,19 € (0,39 € si chaque logo est refait une fois) ; plafond minimal 2,20 €.

À montrer : `esquisse-NN-logo-garde.png` et `esquisse-MM-logo-garde.png`. Le fichier `esquisse-NN-phrase-du-logo.txt`
garde la phrase que porte chaque logo (vide : aucune). Un logo refusé deux fois n'est pas gardé : le propriétaire choisit
une autre esquisse déjà vue, et l'étape se relance pour elle seule (un seul chemin d'esquisse, un autre dossier de
sortie), au même prix par logo.

## Étape 3 — une planche de marque par logo

```
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-ecume/studio CLIENT_JSON=scripts/syna-recette/clients/ecume.json \
  PLAFOND_ESSAI_EUR=2.14 node_modules/.bin/tsx scripts/syna-recette/essai-planches.mts data/essai-ecume/3-planches \
  data/essai-ecume/2-finalisation/esquisse-NN-logo-garde.png data/essai-ecume/2-finalisation/esquisse-MM-logo-garde.png
```

Les mots du métier (contrôlés), le domaine vérifié par le Studio avant le dessin, la disposition standard (Écume n'est
pas un métier des animaux), puis chaque planche et sa relecture.
Probable 0,43 € (0,86 € si chaque planche est refaite une fois) ; plafond minimal 2,14 €.

**Pause.** Montrer `planche-A-gardee.png` (le logo NN) et `planche-B-gardee.png` (le logo MM), seules les gardées, en
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
| 1. Esquisses | 0,07 € | 0,09 € | 0,44 € |
| 2. Deux logos finis | 0,19 € | 0,39 € | 2,20 € |
| 3. Deux planches | 0,43 € | 0,86 € | 2,14 € |
| 4. Planche en vrai | 1,50 € | 2,78 € | 6,70 € |
| 5. Écran | 0 € | 0 € | 0 € |
| **Total** | **2,19 €** | **4,12 €** | **11,48 €** |

Chiffres tirés des devis gratuits du 25 novembre 2026 (somme exacte des plafonds minimaux : 11,45 € ; arrondis aux
plafonds donnés ci-dessus : 11,48 €). Le plafond minimal est la somme de tous les maxima, reprises comprises : il
garantit d'aller au bout, il ne sera presque jamais dépensé.
