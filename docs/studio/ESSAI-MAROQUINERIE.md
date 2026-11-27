# Dernier client de vérification : la maroquinerie

Préparé le 27 novembre 2026, **sans aucune dépense**. Accord du propriétaire : un dernier client de vérification, de bout
en bout, pour prouver que tout marche du premier coup, sans aucune correction en route. Budget d'environ 4 €. Rien n'est
lancé tant qu'il n'a pas dit oui, étape par étape, au prix annoncé.

## Le client inventé

Une maroquinerie artisanale qui fabrique et vend en ligne des sacs, des portefeuilles et des ceintures en cuir. Une marque
de produits. **Il n'a pas encore de nom** : SINA lui en propose, il choisit. Aucune photo de produit, aucune personne : les
produits de la planche restent des images d'ambiance (« image d'ambiance, ce n'est pas ton produit »). Sa fiche,
`scripts/syna-recette/clients/maroquinerie.json`, a la même forme que celle du torréfacteur :

```json
{
  "metier": "maroquinerie artisanale qui fabrique et vend en ligne des sacs, des portefeuilles et des ceintures en cuir",
  "kind": "produits",
  "produits": ["sacs en cuir", "portefeuilles en cuir", "ceintures en cuir"],
  "prix": "environ 180 € le sac, 60 € le portefeuille et 50 € la ceinture",
  "clientele": "des gens qui veulent un bel objet en cuir qui dure des années, pour eux ou pour l'offrir",
  "gouts": "chaleureux, élégant et artisanal",
  "descripteur": "maroquinerie"
}
```

Pas de « nom » : c'est voulu. **Pas de « faits »** : ils restent à donner (étape 0). Les prix, la clientèle et les goûts
sont ses réponses de départ, avec ses mots, comme chez le torréfacteur. Aucune coordonnée, aucun avis, aucun chiffre de
plus. Rien n'y vient d'un client d'essai passé.

## Avant de commencer

- Depuis la racine du dépôt. La clé Anthropic passe par `STUDIO_ANTHROPIC_KEY` dans les réglages de l'environnement, jamais
  dans la commande. Les clés des images passent par le relais de la session.
- Tout ce qui est produit va sous `data/essai-maroquinerie/` (jamais enregistré dans le dépôt) ; une seule base d'essai :
  `data/essai-maroquinerie/studio`.
- Chaque étape a son garde-fou (`PLAFOND_ESSAI_EUR`) : sous la somme des maxima, l'essai part, s'arrête proprement avant
  tout appel dont le pire cas dépasserait ce qui reste, garde ses fichiers et dit comment reprendre. Aucun appel n'est
  relancé tout seul.
- **Aucune variable de reprise ni de réassemblage** (`REPRENDRE`, `REJUGER`, `REASSEMBLER`, `REFAIRE_LOGOS`) : le chemin
  normal porte toutes les corrections d'Écume et de Mouture (voir « Le chemin normal porte tout », plus bas).

Toutes les commandes payantes commencent par le même début (noté `DEBUT` ci-dessous) :

```
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-maroquinerie/studio CLIENT_JSON=scripts/syna-recette/clients/maroquinerie.json
```

Après l'étape 1, on y ajoute le nom choisi : `CLIENT_NOM="<le nom choisi>"`.

Les devis, gratuits (aucun appel, aucune clé), qui donnent les chiffres ci-dessous :

```
DEVIS_SEULEMENT=1 DATA_DIR=data/essai-maroquinerie/studio CLIENT_JSON=scripts/syna-recette/clients/maroquinerie.json node_modules/.bin/tsx scripts/syna-recette/essai-noms.mts
DEVIS_SEULEMENT=1 DATA_DIR=data/essai-maroquinerie/studio CLIENT_JSON=scripts/syna-recette/clients/maroquinerie.json node_modules/.bin/tsx scripts/syna-recette/essai-esquisses.mts
DEVIS_SEULEMENT=1 DATA_DIR=data/essai-maroquinerie/studio CLIENT_JSON=scripts/syna-recette/clients/maroquinerie.json node_modules/.bin/tsx scripts/syna-recette/essai-finalisation.mts
DEVIS_SEULEMENT=1 DATA_DIR=data/essai-maroquinerie/studio CLIENT_JSON=scripts/syna-recette/clients/maroquinerie.json node_modules/.bin/tsx scripts/syna-recette/essai-planches.mts
DEVIS_SEULEMENT=1 LOGO_HD=1 DATA_DIR=data/essai-maroquinerie/studio CLIENT_JSON=scripts/syna-recette/clients/maroquinerie.json node_modules/.bin/tsx scripts/syna-recette/essai-planche-en-vrai.mts
```

Le plafond conseillé de chaque étape est celui du code (`plafondConseilleMicro` : deux fois le probable, arrondi au
demi-euro du dessus), sauf pour les noms, où il est relevé pour passer le départ (voir l'étape 1).

## Étape 0 — les faits à donner (gratuit), avant les noms

Le chef d'orchestre joue le client : il répond, une question à la fois, avec les mots du client. Le cahier
(`docs/sina-savoir/questions-avant-la-marque.md`) choisit, pour ce client, les parties « une boutique », « un artisan »
(reconnu par « maroquinerie » ; « artisanale » seul ne le choisit jamais, c'est voulu), « le cuir » (ajoutée le 27
novembre 2026 : tannage, coutures, finitions) et « la marque ».

```
CLIENT_JSON=scripts/syna-recette/clients/maroquinerie.json node_modules/.bin/tsx scripts/syna-recette/faits-de-l-essai.mts
```

Sortie exacte aujourd'hui :

```
Parties du cahier pour ce client : une boutique, un artisan, le cuir, la marque.
Sujets, dans l'ordre : noms, formats, origine, mentions, fabrication, matieres, tannage, coutures, finitions, annee, ville.
Rien n'est encore répondu.
Questions que SINA poserait encore, une à la fois (le client peut répondre « je ne sais pas » ou « je préfère ne pas le montrer ») :
1. [noms] Le nom exact de chacun de tes produits, tel qu'il doit s'écrire sur une étiquette.
2. [annee] L'année de création de ton entreprise.
3. [ville] La ville de ton entreprise, et si tu veux qu'elle apparaisse sur tes images et ton site.
```

Une fois les noms donnés, viennent, pour chacun : ses formats, poids ou contenances ; son origine ou sa provenance ; ses
mentions et labels ; où il est fabriqué ; ses matières ; le tannage de son cuir ; comment il est cousu ; ses finitions et
ses teintes. Puis l'année et la ville. Chaque réponse s'enregistre dans la fiche, par exemple :

```
CLIENT_JSON=scripts/syna-recette/clients/maroquinerie.json REPONSE='{"sujet":"noms","noms":["…","…","…"]}' node_modules/.bin/tsx scripts/syna-recette/faits-de-l-essai.mts
CLIENT_JSON=scripts/syna-recette/clients/maroquinerie.json REPONSE='{"sujet":"tannage","valeur":"…"}' node_modules/.bin/tsx scripts/syna-recette/faits-de-l-essai.mts
CLIENT_JSON=scripts/syna-recette/clients/maroquinerie.json REPONSE='{"sujet":"ville","etat":"ne_montre_pas"}' node_modules/.bin/tsx scripts/syna-recette/faits-de-l-essai.mts
```

Une réponse sans « produit » vaut pour tous ses produits. On répète la première commande jusqu'à « Tous les faits à
montrer sont répondus. » Gratuit : 0 €.

## Étape 1 — les noms, avec leur adresse vérifiée

```
DEBUT PLAFOND_ESSAI_EUR=3.50 \
  node_modules/.bin/tsx scripts/syna-recette/essai-noms.mts data/essai-maroquinerie/1-noms
```

La tâche de la marque du Studio telle quelle, jusqu'aux noms vérifiés ; puis, gratuit, l'adresse de chaque nom.

Probable 1,45 € (1,4492 € ; 2,26 € avec le second tour d'idées et le second tour de noms) ; somme des maxima 10,93 €
(devis gratuit du 27 novembre 2026). **Plafond conseillé 3,50 €**, pas 3 € : les trois recherches sur le web partent en
même temps, chacune réservée à son pire cas, 3,2357 € ensemble ; sous ce chiffre, la troisième est refusée et l'essai
s'arrête dès le départ (le devis le dit). Avec 3,50 €, il passe le départ et va au bout sur le déroulé habituel, seconds
tours compris (analyse de l'essai du torréfacteur, `ESSAI-TORREFACTEUR.md`, étape 1).

**Pause, son choix** : montrer `data/essai-maroquinerie/1-noms/rapport.txt` (les noms vérifiés, numérotés, et ce que SINA
dit de leur adresse). Il choisit un nom, écrit exactement comme dans le rapport. Il part ensuite partout par
`CLIENT_NOM="<le nom>"`.

## Étape 2 — les 12 esquisses relues

```
DEBUT CLIENT_NOM="<le nom choisi>" PLAFOND_ESSAI_EUR=0.50 \
  node_modules/.bin/tsx scripts/syna-recette/essai-esquisses.mts data/essai-maroquinerie/2-esquisses
```

Probable 0,15 € (0,1464 € ; 0,29 € si le métier est réécrit et un tour de remplacement fait) ; somme des maxima 1,83 €.
**Plafond conseillé 0,50 €** : il couvre le déroulé habituel et un tour de remplacement ; à un deuxième tour, l'essai
pourrait s'arrêter proprement avant sa relecture, et dirait comment reprendre.

**Pause, son choix** : montrer, en tête de `rapport.txt`, combien des 12 étaient correctes dès les deux planches et
lesquelles ont été remplacées ; puis `planche-contact.png`. Il coche deux esquisses (NN et MM) et, s'il le veut, une phrase
sous le nom : celle d'une esquisse, une de ses lignes, la sienne (« / » entre les lignes) ou « aucune ».

## Étape 3 — les deux logos finis

```
DEBUT CLIENT_NOM="<le nom choisi>" PLAFOND_ESSAI_EUR=0.50 \
  RAPPORT_ESQUISSES=data/essai-maroquinerie/2-esquisses/rapport.txt PHRASE="<sa phrase>" \
  node_modules/.bin/tsx scripts/syna-recette/essai-finalisation.mts data/essai-maroquinerie/3-logos \
  data/essai-maroquinerie/2-esquisses/esquisse-NN.png data/essai-maroquinerie/2-esquisses/esquisse-MM.png
```

Son choix entre par les deux esquisses et par `PHRASE` (pour les deux logos) ou `PHRASE_NN` (pour un seul) ; c'est son
choix, pas une reprise.

Probable 0,19 € (0,1927 € ; 0,39 € si chaque logo est refait une fois) ; somme des maxima 2,19 €. **Plafond conseillé
0,50 €.**

**Pause** : montrer `esquisse-NN-logo-garde.png` et `esquisse-MM-logo-garde.png`.

## Étape 4 — une planche de marque par logo

```
DEBUT CLIENT_NOM="<le nom choisi>" PLAFOND_ESSAI_EUR=1 \
  node_modules/.bin/tsx scripts/syna-recette/essai-planches.mts data/essai-maroquinerie/4-planches \
  data/essai-maroquinerie/3-logos/esquisse-NN-logo-garde.png data/essai-maroquinerie/3-logos/esquisse-MM-logo-garde.png
```

Le script lit la phrase de chaque logo à côté de lui, vérifie le domaine avant le dessin, et donne ses faits à la planche
(ligne des mentions vraies) et au relecteur.

Probable 0,43 € (0,4322 € ; 0,86 € si les valeurs sont réécrites et chaque planche refaite une fois) ; somme des maxima
2,13 €. **Plafond conseillé 1 €.**

**Pause, son choix** : montrer `planche-A-gardee.png` et `planche-B-gardee.png`, en entier. Il choisit sa planche, A ou B
(notée X ; NN est alors l'esquisse de son logo).

## Étape 5 — la planche choisie, refaite en vrai, avec les logos en haute définition

```
DEBUT CLIENT_NOM="<le nom choisi>" PLAFOND_ESSAI_EUR=4 LOGO_HD=1 \
  RESULTAT_PLANCHE=data/essai-maroquinerie/4-planches/planche-X-resultat.json \
  PHRASE="$(cat data/essai-maroquinerie/3-logos/esquisse-NN-phrase-du-logo.txt)" \
  METIER_COURT="$(node -p "require('./data/essai-maroquinerie/2-esquisses/esquisses.json').metier.court")" \
  node_modules/.bin/tsx scripts/syna-recette/essai-planche-en-vrai.mts data/essai-maroquinerie/5-planche-en-vrai \
  data/essai-maroquinerie/4-planches/planche-X-gardee.png data/essai-maroquinerie/3-logos/esquisse-NN-logo-garde.png
```

La découpe, l'inventaire, les 17 images refaites et relues (une reprise au plus, à la charge du Studio), les logos, la
palette, les polices et l'assemblage en 3072 × 4608 ; puis, avec `LOGO_HD=1`, les quatre petites versions du logo reprises
de l'aperçu refaites en haute définition, à la charge du Studio ; enfin `etat.json`, `essai.json` et le parcours.

Probable 1,85 € (1,8527 € : la planche en vrai 1,4980 €, LOGO_HD 0,3547 € ; 3,49 € si tout est refait une fois) ; somme
des maxima 8,31 €. **Plafond conseillé 4 €.**

**Pause** : montrer `planche-en-vrai.png` à côté de `planche-X-gardee.png`, et dire franchement ce qui diffère.

## Étape 6 — l'écran (gratuit)

```
DATA_DIR=data/essai-maroquinerie/studio node_modules/.bin/tsx scripts/syna-recette/ecran-planche-en-vrai.mts data/essai-maroquinerie/5-planche-en-vrai/etat.json
```

Il relit le client et le projet dans `essai.json`, écrit le parcours, donne l'adresse de la page Marque et le compte
fictif. Puis lancer le studio privé sur la même base (`lancer-agent.mts`) et prendre les captures avec `capture.cjs`
(ordinateur 1440 de large, téléphone 390) dans `data/essai-maroquinerie/6-ecran/`. Sans `REFAIRE_LOGOS` : les logos sont
déjà faits par le code corrigé à l'étape 5.

## Les prix

| Étape | Commande, en bref | Son choix | Probable | Plafond conseillé |
|---|---|---|---|---|
| 0. Les faits | `faits-de-l-essai.mts` | ses réponses | 0 € | — |
| 1. Les noms | `essai-noms.mts` | un nom → `CLIENT_NOM` | 1,45 € | 3,50 € |
| 2. Les 12 esquisses | `essai-esquisses.mts` | deux esquisses et la phrase | 0,15 € | 0,50 € |
| 3. Deux logos finis | `essai-finalisation.mts` + `PHRASE` | — | 0,19 € | 0,50 € |
| 4. Deux planches | `essai-planches.mts` | A ou B | 0,43 € | 1 € |
| 5. Planche en vrai et LOGO_HD | `essai-planche-en-vrai.mts` avec `LOGO_HD=1` | — | 1,85 € | 4 € |
| 6. L'écran | `ecran-planche-en-vrai.mts` | — | 0 € | — |
| **Total** | | | **4,07 €** (4,0732 €) | **9,50 €** |

Chiffres tirés des devis gratuits du code, lancés le 27 novembre 2026 sur cette fiche. Deux logos et deux planches. Les
plafonds ne seront pas dépensés : ils laissent passer le déroulé habituel et une partie des reprises à la charge du
Studio ; la somme exacte des maxima, pour aller au bout à coup sûr, serait 25,39 €. Rien n'a été lancé avec les vrais
appels.

## Le chemin normal porte tout

Vérifié sans dépense le 27 novembre 2026, ligne à ligne, entre le premier passage et le réassemblage ou la reprise.

| Correction | Premier passage de l'étape 5 | Réassemblage / reprise |
|---|---|---|
| Phrase du logo | `phrase: lignesDeLaPhrase(ligneDuLogo)` dans `plancheEnVrai`, `ligneDuLogo` = `PHRASE` | `phrase: lignesDuTexte(PHRASE)` dans `repriseDesCases` |
| Produits de la fiche | `produits: client.produits` | `produits: client.produits` |
| Faits à montrer, aux images et au relecteur | `faits: faitsDuClient` | `faits` de la fiche |
| Faits à montrer, à l'assemblage et aux logos refaits | **corrigé** : la fiche du projet de l'essai les porte (`rangerLesFaitsDansLeProjet`) ; l'assemblage les relit là | le réassemblage ne les donne pas à `textesDeLaPlanche` (voir plus bas) |
| Petits textes illisibles (`MICRO_TEXTES_EN_VRAI`) | `ligneDeLElement`, pour chaque image | la même fonction |
| Polices par leur nom | `policesDeLApercu`, `policeDuCatalogue` | les mêmes |
| Logo empilé et horizontal repris de l'aperçu | `versionsDuLogo(… tuiles)` | le même |
| Monochromes à aplats | `versionsDuLogo` | le même |
| Palette à l'encre pleine | `assemblerLaPlanche` | la même |
| Signe parasite retiré | `textesDeLaPlanche`, avec `finitions` de `RESULTAT_PLANCHE` dans la route | le même |
| Logos en haute définition | `LOGO_HD=1` sur la commande normale (`refaireLesLogosEnHdEnVrai`) | `refaireLesLogosEnHdDeLaPlanche` |
| Métier court au bas du badge | `METIER_COURT` | — |

Le test `tests/essai-chemin-normal-porte-tout.test.ts` le garantit, avec des appels simulés et cette fiche : chaque image
du premier passage reçoit la même ligne que la reprise (petits textes, produits, mentions vraies, rien de ce qu'il ne veut
pas montrer), chaque relecteur la phrase du logo, les produits et les faits, et les faits sont dans la fiche du projet.

Les étapes d'avant : les noms (`REPRENDRE=1` ne sert qu'à reprendre un arrêt), les esquisses (`uneRecherche` telle quelle),
les logos finis (`PHRASE` est le choix du client) et les planches (`REJUGER` et `REPRENDRE_X` ne servent qu'à une planche
déjà payée) n'ont besoin d'aucune variable de reprise pour porter une correction. La fiche du projet de l'essai des
planches reçoit aussi ses faits, comme dans le Studio.

**Écart restant, hors chemin normal** (dans `planche-en-vrai-tache.ts`, non corrigé ici pour ne pas croiser le correctif en
cours) : `plancheEnVraiParLeCode`, utilisé par le réassemblage seulement, appelle `textesDeLaPlanche(o.inventaire,
o.route)` sans les faits ; il faudrait un paramètre `faits` facultatif, passé à `textesDeLaPlanche`, et le donner depuis
`reassemblerLEssaiEnVrai`. Ce client n'en a pas besoin.
