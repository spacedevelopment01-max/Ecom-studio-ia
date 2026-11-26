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

**Premier passage (25 novembre 2026) : arrêt en erreur, 0,23 € dépensés.** La planche A a été dessinée et relue
(0,2348 € comptés : les mots du métier, la planche, sa relecture), puis tout s'est arrêté : la reprise n'est jamais partie
(« Texte de la planche trop long », 8 939 octets) et la planche B n'a jamais été lancée. Fichiers : branche
`claude/essais-complets`, `docs/studio/essais-complets/images/ecume/3-planches/`. Les quatre défauts sont corrigés sans
dépense (détail : `docs/studio/PLANCHE-DE-MARQUE.md`, dernière partie) : la phrase est comparée par ses lignes seulement ;
une ligne cachée en partie par un objet n'est plus une faute ; la reprise part toujours (raisons dédoublonnées, rangées,
bornées) ; l'échec d'une planche n'empêche plus les autres.

Rejouées par le code corrigé, sans aucun appel, les raisons du refus de A sont maintenant : une personne visible (une main
dans l'image de référence « Mousse délicate ») ; « Dites-le nous ! » au lieu de « Dites-le-nous ! » ; la phrase déformée
sur le sac en tissu (sa 2e ligne est « illisible ») ; la note de 5. Les quinze refus faux de la phrase ont disparu. Le
texte de la reprise fait 6 062 octets (7 000 permis).

### Le chemin d'essai : reprendre A, faire B

La planche A n'est pas refaite depuis le début : son premier essai, déjà payé, est repris (`REPRENDRE_A`). Son image et
son verdict deviennent le point de reprise du Studio, sans aucun appel ; le code recalcule ses raisons à partir du verdict
réel (`planche-A-1-relecture-verdict-recalcule.json`, l'original n'est jamais réécrit) ; seule la reprise unique part, à
la charge du Studio. Le script vérifie avant tout appel que le logo A est bien celui du premier essai (empreinte du reçu)
et que le texte du premier essai est exactement celui que le Studio enverrait aujourd'hui (mêmes mots du métier, même
domaine, même année, même phrase) ; sinon rien n'est lancé. Les mots du métier ne sont pas refaits (ils sont lus dans
`valeurs-du-metier.json`) et le domaine n'est pas revérifié (celui du premier dessin, `domaine.json`). La planche B part
depuis le début. Si une planche s'arrête en erreur, l'autre continue ; le script le dit et finit avec le code 2.

Si `data/essai-ecume/` n'est plus là, copier d'abord les fichiers de la branche des essais (depuis la racine du dépôt) :

```
git fetch origin claude/essais-complets
mkdir -p data/essai-ecume/2-finalisation data/essai-ecume/3-planches
for f in planche-A-1-brute.png planche-A-1-relecture-verdict.json planche-A-1-texte-envoye.txt planche-A-1-recu.json domaine.json valeurs-du-metier.json; do
  git show FETCH_HEAD:docs/studio/essais-complets/images/ecume/3-planches/$f > data/essai-ecume/3-planches/$f; done
for f in esquisse-06-logo-garde.png esquisse-06-phrase-du-logo.txt esquisse-10-logo-garde.png esquisse-10-phrase-du-logo.txt; do
  git show FETCH_HEAD:docs/studio/essais-complets/images/ecume/2-finalisation/$f > data/essai-ecume/2-finalisation/$f; done
```

(`planche-A-1.png` est accepté aussi à la place de `planche-A-1-brute.png`.) Le devis, gratuit :

```
DEVIS_SEULEMENT=1 DATA_DIR=data/essai-ecume/studio REPRENDRE_A=data/essai-ecume/3-planches \
  node_modules/.bin/tsx scripts/syna-recette/essai-planches.mts data/essai-ecume/3-planches \
  data/essai-ecume/2-finalisation/esquisse-06-logo-garde.png data/essai-ecume/2-finalisation/esquisse-10-logo-garde.png
```

Calculé le 25 novembre 2026 par ce devis (aucun appel) : la reprise de A et sa relecture (à la charge du Studio, 0,1981 €
probable), la planche B et sa relecture (0,1981 € probable), et la reprise possible de B. **Probable 0,3961 €** sans
refus de B (0,5942 € si B est refaite une fois) ; **plafond minimal exact 1,3493 €** (somme des maxima : 3 × 0,2047 € pour
les images et 3 × 0,2451 € pour les relectures). Le script refuse de partir sous ce plafond : 1,35 € passe (marge de
0,0007 €). Hors plafond : une réponse de texte mal formée à réparer coûterait au plus 0,8817 € de plus ; elle n'est pas
couverte, l'essai s'arrêterait en le disant.

```
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-ecume/studio CLIENT_JSON=scripts/syna-recette/clients/ecume.json \
  PLAFOND_ESSAI_EUR=1.35 REPRENDRE_A=data/essai-ecume/3-planches node_modules/.bin/tsx scripts/syna-recette/essai-planches.mts data/essai-ecume/3-planches \
  data/essai-ecume/2-finalisation/esquisse-06-logo-garde.png data/essai-ecume/2-finalisation/esquisse-10-logo-garde.png
```

Vérifié sans dépense le 25 novembre 2026 : sur les vrais fichiers de la branche des essais, avec des appels simulés, le
script reprend A (logo et texte reconnus), n'appelle ni les mots du métier ni le domaine, envoie la reprise de A (6 062
octets) puis fait B. Le rapport et `depense.json` de ce passage remplacent ceux du premier : les premiers restent sur la
branche des essais.

**Second passage (26 novembre 2026) : 0,67 € dépensés** (0,6685 € comptés). Fichiers : branche `claude/essais-complets`,
`docs/studio/essais-complets/images/ecume/3-planches-2/`. La planche B est gardée à 8,5/10 (refusée à 7 au premier essai,
reprise à la charge du Studio). La planche A, reprise et notée 8/10, que le relecteur juge « montrable », était pourtant
refusée, pour une seule raison : un accent parasite isolé, « Écume – Savonnerie artisanale |´ », dans le titre de
référencement du bloc 10.

**Décision, sans dépense (26 novembre 2026)** : la règle du propriétaire, déjà scellée pour les logos, « les petites
finitions ne font pas refuser ». Un signe parasite isolé, hors des mots, qui ne change aucun mot (un accent, un trait, une
barre ou un point égaré) est une petite finition : noté au compte rendu, jamais une raison de refus ; une note sous 8 qui
ne tient qu'à des finitions ne compte pas. Le code le vérifie lui-même (`signeParasiteIsole`, `planche-de-marque.ts`) : le
texte lu, sans ces signes, doit être exactement le texte attendu. Un accent ou un signe dans un mot ou collé à un mot, une
lettre fausse, un mot mal écrit, le nom, la phrase du logo, l'adresse et l'année font toujours refuser. Épreuve :
`planche-signe-parasite-petite-finition`.

**La planche en vrai nettoie cet accent** (26 novembre 2026, sans dépense) : la finition notée voyage avec la planche
gardée (`planche.finitions`, écrite aussi par le rejugement dans `planche-A-resultat.json`) ; le bloc 10 est alors
redessiné par le code, ses lignes nettoyées des signes isolés, même quand le copyright et le domaine sont justes. Si B est
choisie, sa police « Nunito », montrée en écriture manuscrite, est remplacée par la manuscrite du catalogue la plus
proche, Dancing Script, et SINA le dit. Détail : `docs/studio/PLANCHE-EN-VRAI.md`, dernière partie.

### Rejuger A sans aucun appel

Le script des planches relit une planche à partir de son image et de son verdict déjà payés, avec le code d'aujourd'hui
(`REJUGER=<dossier>`, `REJUGER_PLANCHE=<lettre>`, `REJUGER_ESSAI=<numéro>` sinon le dernier). Aucune clé, aucun plafond,
aucun appel. Si `data/essai-ecume/3-planches-2` n'existe pas, copier d'abord le dossier de la branche des essais (depuis la
racine du dépôt) :

```
git fetch origin claude/essais-complets
mkdir -p data/essai-ecume/3-planches-2
git archive -o data/essai-ecume/3-planches-2.tar FETCH_HEAD docs/studio/essais-complets/images/ecume/3-planches-2
tar -x --strip-components=6 -C data/essai-ecume/3-planches-2 -f data/essai-ecume/3-planches-2.tar
rm data/essai-ecume/3-planches-2.tar
```

Puis :

```
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-ecume/studio CLIENT_JSON=scripts/syna-recette/clients/ecume.json \
  REJUGER=data/essai-ecume/3-planches-2 REJUGER_PLANCHE=A node_modules/.bin/tsx scripts/syna-recette/essai-planches.mts
```

Essayé le 26 novembre 2026 sur une copie des vrais fichiers : **A, essai 2, gardée (note 8/10)**, aucune raison de refus ;
l'accent écrit en petite finition ; les alphabets des spécimens non comptés, comme avant. Le script écrit
`planche-A-2-relecture-verdict-rejuge.json` (l'original n'est jamais réécrit), `planche-A-gardee.png` (l'image payée,
telle quelle), `planche-A-resultat.json` qui dit la planche gardée (l'ancien est gardé dans
`planche-A-resultat-avant-rejugement.json`), et ajoute au rapport le rejugement et la ligne « Planches gardées, prêtes
pour le choix : A, B ». Dépense : 0 €. Code de sortie 0 si elle est gardée, 2 si elle reste refusée.

**Pause.** Montrer `planche-A-gardee.png` (le logo 6) et `planche-B-gardee.png` (le logo 10), seules les gardées, en
entier. Le domaine écrit est dans `domaine.json`. Il choisit **sa planche** : A ou B. Pour l'étape 4, le dossier est
`data/essai-ecume/3-planches-2`.

## Étape 4 — la planche choisie, refaite en vrai

**Le propriétaire a choisi la planche B** (logo de l'esquisse 10, phrase « SAVONNERIE » puis « ARTISANALE »). Si les
dossiers manquent, copier d'abord `3-planches-2` (voir l'étape 3) et `2-finalisation` (depuis la racine du dépôt) :

```
git fetch origin claude/essais-complets
mkdir -p data/essai-ecume/2-finalisation
git archive -o data/essai-ecume/2-finalisation.tar FETCH_HEAD docs/studio/essais-complets/images/ecume/2-finalisation
tar -x --strip-components=6 -C data/essai-ecume/2-finalisation -f data/essai-ecume/2-finalisation.tar
rm data/essai-ecume/2-finalisation.tar
```

Le devis, gratuit (`DEVIS_SEULEMENT=1`, aucun appel), recalculé le 26 novembre 2026 avec la liste des polices du
catalogue donnée à l'inventaire : **probable 1,4980 €** sans refus (2,7819 € si chaque image est refaite une fois) ;
**plafond minimal exact 6,6978 €** (3,6059 € pour le client et 3,0918 € de borne du Studio) ; hors plafond, une réponse de
texte mal formée à réparer coûterait au plus 3,0764 € de plus ; plafond conseillé 7,60 €, inchangé. Le devis ne dépend pas de la planche choisie.

```
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=data/essai-ecume/studio CLIENT_JSON=scripts/syna-recette/clients/ecume.json \
  PLAFOND_ESSAI_EUR=7.60 RESULTAT_PLANCHE=data/essai-ecume/3-planches-2/planche-B-resultat.json \
  PHRASE="$(cat data/essai-ecume/2-finalisation/esquisse-10-phrase-du-logo.txt)" \
  node_modules/.bin/tsx scripts/syna-recette/essai-planche-en-vrai.mts data/essai-ecume/4-planche-en-vrai \
  data/essai-ecume/3-planches-2/planche-B-gardee.png data/essai-ecume/2-finalisation/esquisse-10-logo-garde.png
```

Vérifié sans dépense le 26 novembre 2026, avec des appels simulés sur les vrais fichiers de la branche des essais : le
script accepte la planche B, son résultat (domaine, année, disposition), le logo 10 (empreinte reconnue) et sa phrase ;
la phrase est lue par ses lignes, « SAVONNERIE » puis « ARTISANALE » (le « / » du fichier n'est jamais écrit : le bas du
badge porte « SAVONNERIE ARTISANALE ») ; si l'inventaire lit « Nunito » en écriture manuscrite, comme le relecteur l'a
vu, la police des textes devient la manuscrite du catalogue que l'inventaire juge la plus proche du spécimen (Dancing
Script s'il n'en choisit aucune valable), et SINA dit son nom. La planche est assemblée en 3072 × 4608. La phrase donnée
par `PHRASE` doit dire les mêmes lignes que le résultat de la planche, sinon rien n'est lancé ; sans `PHRASE`, ce sont
celles du résultat.

Pour une autre planche, avec X la planche choisie et NN l'esquisse de son logo :

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
| 3 bis. Reprise de A et planche B (après l'arrêt du premier passage) | 0,40 € | 0,59 € | 1,35 € |
| 3 ter. Rejugement de A, sans appel | 0 € | 0 € | 0 € |
| 4. Planche en vrai | 1,50 € | 2,78 € | 6,70 € |
| 5. Écran | 0 € | 0 € | 0 € |
| **Total** | **2,27 €** | **4,32 €** | **12,87 €** |

Chiffres tirés des devis gratuits du 25 novembre 2026 (somme exacte des plafonds minimaux : 12,85 € ; arrondis aux
plafonds donnés ci-dessus : 12,87 €). Le plafond de l'étape 1 compte les trois tours de remplacement, à la charge du
Studio. Déjà dépensé : 0,12 € pour le premier passage de l'étape 1, mis de côté, et 0,23 € pour le premier passage de
l'étape 3, arrêté en erreur (son premier essai de A est repris, la ligne 3 bis remplace la ligne 3 ; le total du tableau
compte encore la ligne 3). Le plafond minimal est la somme de tous les maxima, reprises comprises : il
garantit d'aller au bout, il ne sera presque jamais dépensé.
