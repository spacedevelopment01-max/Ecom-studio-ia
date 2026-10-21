# Rédaction commerciale des thèmes — inventaire et stratégie (revue du 21 octobre, PR #159)

Consigne de Thomas (21 octobre, 18 h 31) : une rédaction émotionnelle et commerciale pour **chaque** thème, un thème
après l'autre, SOUPLE d'abord. Avant d'écrire : une cible et sa situation, une tension, un désir central, **un seul**
angle, une promesse tenable, les faits disponibles et les objections. Ce sont des **hypothèses de travail**, pas des
résultats d'étude. Rien d'inventé : ni caractéristique, ni bienfait, ni avis, ni chiffre, ni prix, ni stock, ni urgence.

## Inventaire exhaustif (catalogue réel)

Le catalogue actif est la liste `REFERENCE_THEMES` (`src/lib/theme/theme-fit.ts`) : **11 thèmes**. Chaque thème a été
livré sur sa branche ; les branches s'empilent (aucune n'est fusionnée dans `main`, qui n'en contient que 4).

| Thème | Famille | Produit de la démonstration | Présent dans | État de la rédaction |
|---|---|---|---|---|
| SOUPLE | E-commerce | collection yoga et Pilates (4 produits) | `claude/themes-museau-souple-158` | **réécrit** (voir le bilan final) |
| MUSEAU CLUB | Produit spécifique (boutique spécialisée) | collection de balade pour chiens (4 produits) | `claude/themes-museau-souple-158` | **réécrit** (voir le bilan final) |
| HEUREN | E-commerce | montre bleu nuit | `claude/themes-heuren-alcove-155` et suivantes | **réécrit** (voir le bilan final) |
| ALCÔVE | E-commerce | fauteuil terracotta | `claude/themes-heuren-alcove-155` et suivantes | **réécrit** (voir le bilan final) |
| NOCTIL | Produit spécifique | projecteur de galaxies | `claude/themes-noctil-traverse-152` et suivantes | **réécrit** (voir le bilan final) |
| TRAVERSE | Produit spécifique | sac à dos de voyage | `claude/themes-noctil-traverse-152` et suivantes | **réécrit** (voir le bilan final) |
| SILLON | Produit spécifique | machine à espresso nomade | `claude/theme-sillon-148` et suivantes | **réécrit** (voir le bilan final) |
| ONDE | E-commerce | casque | `main` (refonte E-commerce sur la branche #158) | **réécrit** (voir le bilan final) |
| ORBE | E-commerce | lampe nomade | `main` | **réécrit** (voir le bilan final) |
| FRAISE | Produit spécifique | gummies à la fraise | `main` | **réécrit** (voir le bilan final) |
| Atelier Rive | Services | aménagement et décoration intérieure | `main` | **réécrit** (voir le bilan final) |

Branches de Codex en cours qui touchent les thèmes : `codex/154-integration-adaptation-client` (7 thèmes, adaptation
d'un client et génération IA) — à réunir avant toute fusion ; leur grille de forfaits (#151 / #154) n'est pas modifiée ici.

**Thèmes retirés (non réactivés)** : les 30 anciennes directions (Atelier, Clinique, Brut, Terroir, Nocturne, Pop,
Galerie, Élan, Flux, Joaillerie, Gourmand, Vitrine, Manifeste, Laboratoire, Magazine, Cinéma, Rituel, Horizon, Lookbook,
Marché, Signal, Jardin, Réception, Cabinet, Récré, Épure, Tribu, Établi, Velours, Lancement) restent lisibles par les
anciens projets mais ne sont plus proposées ; les anciennes démonstrations (ARVEN, Cime, Tribunes, Sonore, Racines &
Pierres, Pivoine, Ostral) sont retirées de l'expérience livrée depuis le 20 octobre. Aucune n'est retravaillée.

## Matrice thème → cible → angle (hypothèses à valider par Thomas)

| Thème | Cible et situation | Tension | Désir central | Angle (un seul) | Objections à traiter sans promesse |
|---|---|---|---|---|---|
| **SOUPLE** | une femme qui passe ses journées à répondre aux besoins des autres et voudrait un moment à elle, à la maison | tout le monde compte sur elle ; le sport à la maison devient vite une obligation de plus | « Pendant quelques minutes, je ne suis disponible que pour moi. » | **un rendez-vous avec soi, pas une obligation** | faut-il tout acheter ? (non, à son rythme) ; peu de place (le tapis se roule) ; prix et ouverture (non connus : « Prix à définir ») |
| MUSEAU CLUB | un propriétaire de chien en ville qui sort plusieurs fois par jour | la laisse introuvable, les sacs oubliés, un matériel dépareillé | sortir en un geste, fier de son duo | **la balade commence à la porte : tout est prêt, tout va ensemble** | tailles et matières (non connues : blocs masqués) |
| HEUREN | quelqu'un qui veut une belle montre discrète, pour soi ou à offrir | les montres qui réclament (notifications) ou qui crient | porter un bel objet qui ne demande rien | **un bleu à regarder, pas un écran à surveiller** | mouvement, étanchéité (non connus) ; signature répétée corrigée (voir plus bas) |
| ALCÔVE | une personne qui n'a pas de vrai fauteuil et s'assoit toujours « en attendant » | le canapé partagé, les chaises où l'on se tient droit | s'enfoncer enfin, tenu de partout | **s'asseoir pour de bon** | dimensions, tissu, entretien (non connus) |
| NOCTIL | un parent dont l'enfant retarde le coucher, ou un adulte qui veut changer sa chambre le soir | le moment d'éteindre vécu comme une contrainte | que la nuit devienne un spectacle attendu | **éteindre devient le meilleur moment** | aucun bienfait sur le sommeil ne sera affirmé |
| TRAVERSE | quelqu'un qui part souvent pour deux ou trois jours | refaire son sac, choisir entre sac du quotidien et sac de voyage | partir sans y penser | **le même sac du lundi matin au départ du vendredi** | volume, poids, cabine (non connus) |
| SILLON | un amateur d'espresso qui part (van, randonnée, bureau sans machine) | le café de station, le gobelet tiède | garder son rituel où qu'il soit | **votre espresso ne reste plus à la maison** | pression, capsules ou mouture, autonomie (non connues) |
| ONDE | une personne qui travaille ou se déplace dans le bruit | les sollicitations, les commandes qu'on cherche à tâtons | se retrouver d'un geste | **d'un geste, vous êtes ailleurs** (touches vertes repérables) | réduction de bruit, autonomie (non affirmées) |
| ORBE | un locataire ou un petit logement qui veut changer d'ambiance sans travaux | le plafonnier qui fige la pièce | une atmosphère différente dans chaque pièce, chaque soir | **déplacez la lumière, l'ambiance suit** | autonomie, intensité (non connues) |
| FRAISE | une famille ou une bande d'amis qui grignote à plusieurs (goûter, pique-nique, table de fête) | les sachets déchirés, entamés, oubliés au fond du placard ou du sac | une douceur posée au milieu, qu'on partage | **le flacon qui fait le tour de la table** | **aucune** allégation de santé ; ingrédients, allergènes, texture, délais et retours non affirmés |
| Atelier Rive | un couple ou une famille dont l'intérieur ne lui ressemble plus, sans savoir par où commencer | peur de se tromper, de dépenser pour un résultat qui n'est pas « nous » | être compris avant d'être conseillé | **un intérieur qui vous ressemble, à partir de votre façon de vivre** | tarifs, délais, zone (fournis par le client, sinon « à compléter ») |

Rôles des pages, pour chaque thème : l'accueil crée l'envie, les scènes et pages d'usage permettent de se projeter, les
fiches expliquent le choix, les informations pratiques rassurent. L'angle se décline ; le slogan n'est pas répété
partout.

## Fiches par thème (état de la livraison)

### SOUPLE — E-commerce, 4 produits — **réécrit (consigne 21 h 45)** : reprendre après une longue pause

| | |
|---|---|
| Utilisateur et acheteur | une personne qui veut reprendre une pratique douce (yoga, Pilates) à la maison après une longue interruption (brief) |
| Situation d'achat | elle a arrêté (travail, enfants, déménagement…) et se dit que c'est le moment de recommencer |
| Tension (ses mots) | « Ça fait si longtemps que j'ai peur de ne plus y arriver. » |
| Désir | recommencer sans se comparer à son niveau d'avant |
| Angle unique | recommencer à son rythme, sans pression de performance |
| Promesse tenable | une pièce suffit pour la première séance (le tapis) ; la brique et la sangle rapprochent ce qui paraît loin ; l'anneau ouvre au Pilates plus tard ; tout se range |
| Objections traitées | par quoi recommencer, quelle pièce pour quoi, « ces accessoires remplacent-ils un cours ? » (non), la place, ce que permet la démo |
| **Faits** | visuels du lot (couleurs, formes, logo, rangement roulé ou debout) et noms des pièces |
| **Non renseigné** | prix, matières, dimensions, adhérence, entretien, livraison, garantie (masqués, prêts dans l'éditeur) |
| Exclusions | le matériel ne remplace pas un accompagnement ; aucun bienfait, résultat, programme ni niveau promis |

Pages : accueil plein écran conservé (« Reprendre en douceur, à votre rythme, chez vous. » ; bouton « Choisir ma première
pièce ») → « Pas de niveau à retrouver. *Un rythme à reprendre.* » → « Personne ne vous chronomètre… » → « Recommencez
avec une pièce, *ajoutez les autres plus tard* » → « Le tapis déroulé, la reprise commence. » → « Et un soir, l'envie du
Pilates » → sangle → « Avant de reprendre » → « Et si vous repreniez ce soir ? ». Fiches (tapis « pour la première
séance », brique « quand le sol paraît loin », sangle, anneau « pour varier ensuite »), collection « Reprendre chez soi :
les quatre pièces », page « Reprendre chez soi », aide, menus, pied, SEO. L'ancienne accroche (« Toute la journée, on
compte sur vous… ») est remplacée : elle visait une autre cible. Tests mis à jour (H1, bouton, titre des recommandations).
Visuels cohérents (objets seuls, intérieur calme). Capture mobile : la dernière tuile de la mosaïque apparaît vide à
cause de l'animation d'apparition au moment de la capture ; elle s'affiche sur ordinateur. Code :
`tests/museau-souple-fixtures.ts`. Preuves : `docs/preuves/copywriting/souple/` (26 captures).

### MUSEAU CLUB — Spécialisée, 4 produits — **réécrit (consigne 21 h 45)** : premier chien

| | |
|---|---|
| Utilisateur et acheteur | une personne qui accueille son premier chien (brief) |
| Situation d'achat | les jours autour de l'arrivée du chien, devant un rayon où tout se ressemble |
| Tension (ses mots) | « Harnais, collier, laisse… je ne sais pas ce qui sert à quoi, ni par quoi commencer. » |
| Désir | des premières balades simples, sans hésiter au moment de sortir |
| Angle unique | préparer ses premières balades avec un ensemble cohérent, un rôle clair par pièce |
| Promesse tenable | porter (harnais pour la promenade, collier au quotidien), relier (la laisse, à chaque sortie), accompagner (la pochette à sacs) ; tout s'accroche |
| Objections traitées | par quoi commencer, harnais ou collier, comment tout s'accroche, faut-il tout acheter, ce que permet la démo |
| **Faits** | visuels : anneaux, mousquetons, boucles, maille crème, ouverture de la pochette, rangement près de la porte |
| **Non renseigné** | tailles, matières, entretien, sacs fournis, livraison, garantie (questions masquées, prêtes dans l'éditeur) |
| Exclusions | aucun conseil de dressage ou de santé ; aucune matière, taille, résistance ni sécurité affirmées |

Pages : accueil (« Premier chien, premières balades : *chaque pièce a son rôle* » → « Ce qui sert à quoi, *en un coup
d'œil* » → harnais « à porter, pour la promenade » → collier « au quotidien, et pour le petit tour du soir » → pochette →
« Prêts près de la porte, avant même son arrivée » → « Avant les premières sorties » → inscription) ; quatre fiches
structurées « Son rôle / Quand l'utiliser / Ce qu'on voit / Avec quelle pièce » ; collection ; « Les premières balades »
(ex-« La balade ») ; aide ; menus ; pied ; SEO. Visuels cohérents (chiens portant les pièces, entrée, boîte d'accueil).
Test mis à jour : le H1 attendu devient « Premier chien, premières balades ». Code : `tests/museau-souple-fixtures.ts`.
Preuves : `docs/preuves/copywriting/museau-club/` (26 captures).

### HEUREN — E-commerce, mono-produit — **réécrit (consigne 21 h 45)** : le cadeau d'une étape de vie

| | |
|---|---|
| Acheteur | une personne qui offre une montre à son compagnon (brief) |
| Utilisateur | lui, qui la portera |
| Situation d'achat | une étape de sa vie à marquer : nouveau poste, anniversaire, projet qui aboutit |
| Tension (ses mots) | « Je veux un cadeau à la hauteur du moment, pas un objet qui finira dans un tiroir. » |
| Désir | que le cadeau garde la trace du moment, et qu'il le porte ensuite |
| Angle unique | un cadeau qui matérialise ce moment et se porte ensuite au quotidien |
| Promesse tenable | une montre à aiguilles au cadran bleu nuit soleillé, présentée en écrin sur les photos, sobre au bureau comme le soir |
| Objections traitées | pour quelles occasions, comment elle est présentée (contenu de l'écrin non renseigné), le bleu au quotidien, connectée ou non, ce que permet la démo |
| **Faits** | visuels : cadran, index, aiguilles, boîtier, bracelet, écrin et ruban, décors (bureau, veston, voyage, chevet) |
| **Non renseigné** | gravure (nouvelle question masquée), mouvement, étanchéité, taille, matières, bracelet, garantie, prix |
| Exclusions | plus de « guerre contre les notifications » ; rien d'inventé sur la gravure, le mouvement ou les matières |

Pages : accueil (ouverture sur **l'écrin et son ruban** au lieu de la pierre noire : « Il y a des étapes qui méritent une
montre. » → « Un bleu qu'il regardera longtemps » → « Ce qu'il découvrira, *point par point* » → « Un cadeau qui se
porte, *bien après la fête* » → « Du bureau au dîner, il la garde » → achat → « Avant de l'offrir » → inscription « pour
préparer votre cadeau »), fiche (« Montre à aiguilles · à offrir »), « Au fil du jour » (après le jour J), aide, pied, SEO.
Visuels cohérents (écrin, tenues sobres, voyage, chevet) ; la scène sur pierre noire passe à l'inscription. Code :
`tests/heuren-alcove-fixtures.ts`. Preuves : `docs/preuves/copywriting/heuren/`.

### ALCÔVE — E-commerce, mono-produit — **réécrit (consigne 21 h 45)** : le coin lecture à soi

| | |
|---|---|
| Utilisateur et acheteur | un lecteur qui vit dans un logement partagé (colocation, famille) (brief) |
| Situation d'achat | il lit sur un coin de canapé que tout le monde utilise, ou sur son lit, faute de mieux |
| Tension (ses mots) | « Chez nous, le canapé est à tout le monde : je n'ai pas d'endroit pour lire tranquille. » |
| Désir | un espace à soi, que l'on a envie de retrouver |
| Angle unique | créer son coin lecture à soi |
| Promesse tenable | un fauteuil dont le dossier et les accoudoirs forment un seul arrondi autour d'un coussin épais, qui trouve sa place dans une chambre ou un coin de salon |
| Objections traitées | où l'installer dans un logement partagé, quelle place il prend (« dimensions non renseignées : mesurez votre coin »), le terracotta, l'aspect de près, la démo |
| **Faits** | visuels : silhouette, tissu terracotta texturé, pieds en bois brun, coin lecture avec table d'appoint, vue de dessus avec livre, lampe du soir |
| **Non renseigné** | dimensions, tissu, rembourrage, entretien, livraison et montage, garantie, prix |
| Exclusions | aucun confort, maintien, dimension ni matière inventés |

Pages : accueil (« Une alcôve à soi. » avec « Votre coin lecture » et « le canapé est à tout le monde » → « Ce qui vous
entoure, *quand vous lisez* » → « Le canapé est à tout le monde. Ce fauteuil est à vous. » → « Là où vous lisez » →
« Sous la lampe, *un chapitre de plus* » → achat → « Avant de créer votre coin »), fiche (« Fauteuil · votre coin
lecture », vue de dessus « un livre à côté »), « Pièce par pièce » (la lumière pour lire), aide, pied, SEO. Visuels
cohérents (coin lecture, livre, lampe) ; aucun ne montre un logement visiblement partagé (sans personne, règle du studio).
Code : `tests/heuren-alcove-fixtures.ts`. Preuves : `docs/preuves/copywriting/alcove/`.

### NOCTIL — Spécialisée — **réécrit (consigne 21 h 45)** : l'enfant utilise, le parent achète

| | |
|---|---|
| Utilisateur | un enfant passionné d'espace (planètes, fusées, étoiles) — **décision de Thomas** |
| Acheteur | son parent, qui cherche une surprise |
| Situation d'achat | anniversaire, Noël, ou envie de lui faire plaisir |
| Tension (mots du parent) | « Il connaît toutes les planètes ; je voudrais lui offrir autre chose qu'un livre de plus. » |
| Désir | le voir émerveillé, le laisser imaginer |
| Angle unique | offrir à son enfant sa propre galaxie dans sa chambre |
| Promesse tenable | une galaxie violette au plafond ou sur un mur ; un bouton éclairé facile à repérer ; une « petite planète » sur l'étagère le jour |
| Objections traitées | où s'affiche la galaxie, peut-il l'allumer seul, l'aide-t-il le soir (« nous ne promettons rien de tel »), et le jour, ce que permet la démo |
| **Faits** | visuels du kit (sphère indigo, arceau, objectif, socle, bouton violet ; projection au plafond ou au mur) |
| **Non renseigné** | âge conseillé, alimentation, réglages, dimensions, garantie (questions masquées, prêtes dans l'éditeur) |
| Exclusions | aucun effet sur le coucher, le sommeil ou la peur du noir ; aucun âge ni réglage inventé |

Pages : accueil (« Offrez-lui sa propre galaxie, *au plafond de sa chambre* » → « Sa chambre, *son univers* » → « Sa
chambre d'abord, *et ailleurs ensuite* » → « Quand le jour tombe, son univers s'allume » → « Le jour, *une planète sur
l'étagère* » → « Le cadeau qui fait lever les yeux » → « Avant de l'offrir »), fiche (« Projecteur de galaxies · à
offrir », « Préparer *la surprise* »), « Où poser sa galaxie » (ex-« Une galaxie par pièce »), aide, menus, pied, SEO.

**Visuels — incohérence signalée** : le kit ne contient **aucune chambre d'enfant**. Les scènes montrent un salon
cinéma, un bureau, un loft, une chambre et un coin lecture d'adultes. Choix faits avec les médias disponibles (tous
restent utilisés, c'est testé) : ouverture sur l'objet seul (halo), chambre représentée par la vue « au-dessus du lit »
et l'alcôve à coussins ; les autres scènes sont présentées comme « ailleurs dans la maison » (soirée film en famille,
coin lecture pour une histoire). Pour une cohérence complète, il faudrait de nouveaux visuels de chambre d'enfant (sans
personne). Code : `tests/noctil-traverse-fixtures.ts`. Preuves : `docs/preuves/copywriting/noctil/`.

### TRAVERSE — Produit spécifique — **réécrit**

1. **Cible** : une personne qui travaille en ville et part souvent deux ou trois jours en sortant du bureau.
2. **Tension** : « Le vendredi, je pars avec deux sacs, ou un sac de randonnée qui jure avec ma veste. »
3. **Désir et angle** : partir sans repasser par chez soi → le même sac du lundi matin au départ du vendredi.
4. **Promesse et faits** : un sac à dos sobre (olive, noir) aux poches visibles, au dos ou à la main ; faits = visuels.
   Contenance, format cabine, imperméabilité, compartiment ordinateur et modularité jamais affirmés.
5. **Objections** : fait-il sérieux au bureau, comment le porter, ce qu'on garde sous la main, prix et contenance (information dédiée).
6. **Parcours** : « Le même sac du lundi matin *au départ du vendredi* » → trois temps → carnet de route → repères →
   finitions → ce qu'on emporte → achat → FAQ « Avant de partir avec » → inscription.

Pages réécrites : accueil, fiche, aide, pied, SEO (le carnet de route garde ses étapes). Preuves : `docs/preuves/copywriting/traverse/`.

### SILLON — Produit spécifique — **réécrit**

1. **Cible** : un amateur d'espresso qui passe ses journées loin de sa machine (bureau sans machine, hôtel, train, plein air).
2. **Tension** : « Au bureau, à l'hôtel, en week-end : partout, le café de la pause est une déception. »
3. **Désir et angle** : garder son espresso partout → votre espresso ne reste plus à la maison.
4. **Promesse et faits** : on pose la machine, on glisse un verre dessous, l'espresso y coule ; faits = visuels. Pression,
   café compatible, alimentation, autonomie et dimensions jamais affirmés.
5. **Objections** : où l'utiliser, comment le café est servi, la place qu'elle prend, prix et caractéristiques (information dédiée).
6. **Parcours** : « Votre espresso *ne reste plus à la maison* » → l'idée → le moment où tout coule → détails → lieux →
   achat → FAQ « Avant de l'emporter » → inscription.

Corrections : le bouton d'en-tête « Commander » (commande désactivée) devient « Voir la machine » ; une seule
inscription (celle de l'accueil, plus de second formulaire dans le pied). Pages réécrites : accueil, fiche, contact,
pied, SEO. Preuves : `docs/preuves/copywriting/sillon/`.

### ONDE — E-commerce, mono-produit — **réécrit**

1. **Cible** : une personne qui écoute sa musique d'un lieu à l'autre (salon, train, studio) et la reprend vingt fois par jour.
2. **Tension** : « Le casque sur les oreilles, je cherche toujours le bon bouton. »
3. **Désir et angle** : être dans sa musique sans y penser → d'un geste, vous êtes dans votre musique.
4. **Promesse et faits** : une touche verte repérable d'un coup d'œil, un seul coloris, un graphite discret ; faits = visuels.
   Autonomie, connexion, réduction de bruit et poids jamais affirmés.
5. **Objections** : où sont les commandes, les coloris, où le porter, prix et caractéristiques (information dédiée).
6. **Parcours** : « Écoutez. Posez. *Repartez.* » (le casque qui se trouve sans chercher) → achat → le détail mat → trois
   usages → un seul coloris → FAQ « Avant de choisir » → inscription.

Correction visuelle : l'inscription passe sur le fond clair (le champ e-mail vert sur vert n'était pas lisible). Pages
réécrites : accueil, fiche, aide, SEO. Preuves : **kit privé**, captures hors dépôt (archive privée remise à Thomas).

### ORBE — E-commerce, mono-produit — **réécrit**

1. **Cible** : un locataire ou un petit logement qui veut changer d'ambiance sans travaux.
2. **Tension** : « Le plafonnier écrase la pièce, et je ne peux rien y changer. »
3. **Désir et angle** : une atmosphère différente selon le moment → la lumière change de place, l'atmosphère aussi.
4. **Promesse et faits** : une lampe à poser (table du dîner, bureau, table de nuit), trois finitions Dune, Argile, Charbon,
   abat-jour arrondi sur pied fin ; faits = visuels et variantes. Autonomie, intensité, alimentation et dimensions jamais
   affirmées.
5. **Objections** : où la poser, quelle finition choisir, faut-il des travaux (non : elle se pose), information démo dédiée.
6. **Parcours** : ouverture « Le plafonnier écrase la pièce ? » → l'idée « une lampe qui suit la soirée » → trois finitions →
   « Du dîner à la lecture, la lumière vous suit » → deux soirées (fauteuil, chevet) → FAQ → « Ce soir, déplacez la
   lumière ».

Ce qui manquait : la page FAQ et la page livraison affichaient des « [À compléter] » publics ; la FAQ répond désormais aux
vraies hésitations, la page livraison dit ce qui est vrai (boutique de démonstration : rien n'est expédié ni remboursé).
Pied de page : les trois politiques non rédigées menaient à une page introuvable dans l'aperçu ; liens masqués dans la
démo (réglage « Liens vers les politiques » intact dans l'éditeur). Le prix affiché (79 €) est celui de la démo déjà
validée, non modifié. Pages réécrites : accueil, fiche, notre histoire, FAQ, contact, livraison, SEO. Code :
`tests/engine-demo-copy.ts` (`curateOrbe`), appliqué après la composition par le moteur dans `demoProject`. Preuves :
**kit privé**, captures hors dépôt (archive privée).

### Atelier Rive — Services — **réécrit** (parcours de contact, pas de fiche produit)

1. **Cible** : un couple ou une famille dont l'intérieur ne suit plus sa vie (salon devenu bureau, chambre partagée,
   emménagement), sans savoir par où commencer.
2. **Tension** : « J'ai peur de dépenser pour un résultat qui ne nous ressemble pas. »
3. **Désir et angle** : être compris avant d'être conseillé → partir de votre façon de vivre chaque pièce.
4. **Promesse et faits** : la méthode décrite (vous racontez → nous convenons ensemble → nous proposons une direction) et
   les trois prestations du kit ; faits = photos du kit (décrites telles qu'elles sont). Tarifs, délais, zone, adresse,
   horaires et équipe **inconnus** : sections masquées dans la démo, prêtes dans l'éditeur.
5. **Objections** : par où commence-t-on, faut-il savoir ce que l'on veut, une seule pièce est-elle possible, ce site
   est-il actif (information démo).
6. **Parcours** : « Votre intérieur ne suit plus votre vie ? » → « Parler de votre projet » (vers le contact) → « Être
   compris avant d'être conseillé » → « Ce que nous regardons d'abord » (vos usages, la lumière, les matières, illustrés
   par trois photos du kit jusque-là inutilisées) → trois façons de commencer → comment ça se passe → inspirations →
   FAQ → formulaire « Et si l'on commençait par votre projet ? ».

Ce qui manquait : « [À compléter] » publics dans les réalisations, l'équipe, le contact, la FAQ, les mentions légales et
l'adresse de l'à-propos ; un intitulé « Nous trouver » vide dans le pied. Les réalisations deviennent des
« Inspirations » (aucun client ni chantier inventé : légendes tirées des photos). Pied de page : le nom n'est plus
répété, le second menu ne reprend plus les pages déjà listées et « Conditions générales » / « Confidentialité », non
rédigées, ne renvoient plus aux mentions légales. Mentions légales : marque de démonstration dite comme telle. Pages
réécrites : accueil, prestations, à propos, FAQ, contact, mentions légales, pied, SEO. Code : `curateRive` dans
`tests/engine-demo-copy.ts`. Preuves : **kit privé**, captures hors dépôt (archive privée).

### FRAISE — Spécialisée (référence Lumora) — **réécrit (consigne 21 h 45)**, composition inchangée

Décision de Thomas : des **vitamines** en gummies goût fraise ; produit et composition **fictifs** autorisés pour la
démonstration et signalés comme tels. Ni bonbons à partager, ni produit capillaire.

| | |
|---|---|
| Utilisateur et acheteur | un adulte qui veut une routine de vitamines simple mais n'aime pas avaler des comprimés (brief, à valider) |
| Situation d'achat | une boîte de comprimés déjà achetée, oubliée au fond du placard |
| Tension (ses mots) | « Les comprimés, je les oublie, ou je les avale à contrecœur. » |
| Désir | une routine qu'on a envie de tenir |
| Angle unique | faire de sa routine de vitamines un petit rendez-vous goût fraise |
| Promesse tenable | deux gummies par jour, goût fraise, rien à avaler d'un coup ; un flacon = un mois |
| Objections traitées | qu'y a-t-il dedans, combien par jour, est-ce un bonbon, enfants, sucre, « est-ce que ça marche ? », quelle offre |
| **Faits** | visuels (flacon transparent, couvercle rouge, « 60 douceurs » sur l'étiquette) ; trois offres et prix de démonstration ; paiement désactivé |
| **Fictif annoncé** | composition pour 2 gummies : vitamine C 40 mg (50 % des VNR), D3 5 µg (100 %), B6 0,7 mg (50 %), B12 1,25 µg (50 %) ; ingrédients ; dose de 2 par jour |
| Exclusions | aucun effet santé, anti-fatigue, immunité, beauté ou cheveux ; aucun avis, note, remise sur prix de référence, garantie ni délai inventés |

Parcours (sections Lumora inchangées) : « Vos vitamines *ont le goût de fraise* » → avis (« à venir ») → « Dans deux
gummies, *quatre vitamines* » (composition fictive) → « Pourquoi *en gummies* » → « Deux gummies, *c'est la dose du
jour* » → « Avant de commencer » → « Un mois, *trois ou cinq ?* » (offres en durée de routine) → repères → « Bon à savoir
avant de commencer » (aucun effet promis) → « Un rendez-vous *qui tient dans la journée* » → questions → inscription.
Fiche : titre « Gummies vitaminés goût fraise », onglets Composition (fictive), Utilisation, Précautions (mentions d'usage
d'un complément alimentaire). Pages : à propos, article « 4 raisons de prendre vos vitamines en gummies », publi-rédactionnel
« La boîte de comprimés est restée au fond du placard », FAQ, contact, livraison, légales, bibliothèque, bandeaux, panier,
pied, SEO.

**Visuels** : la scène « table de fête » (coupes, gâteau) contredit un produit vitaminé ; elle est remplacée partout par le
gros plan des gummies. Les gummies enrobées de sucre et les fraises fraîches restent cohérentes avec le goût annoncé ;
aucune image ne montre la prise quotidienne (pas de personne, règle du studio). Code : `tests/fraise-demo-copy.ts`.
Preuves : kit privé, archive hors dépôt.

## Bilan final des 11 thèmes (consigne du 21 octobre, 19 h 50)

Les angles sont des hypothèses éditoriales, à valider par Thomas. Aucune fusion, aucune mise en ligne. Les preuves
« dépôt » sont dans `docs/preuves/copywriting/<thème>/` ; celles des kits privés (ONDE, ORBE, FRAISE, Atelier Rive)
sont dans une archive privée remise hors dépôt.

| Thème | Famille | Angle (un seul) | Pages réécrites | Commit | Preuves | Limites restantes |
|---|---|---|---|---|---|---|
| SOUPLE | E-commerce | un rendez-vous avec soi, pas une obligation | accueil, collection, 4 fiches, « Pratiquer chez soi », aide, menus, pied, SEO | d48c80d9 | dépôt (26 captures) | prix et ouverture inconnus : « Prix à définir », achat désactivé |
| MUSEAU CLUB | Spécialisée | la balade commence à la porte | accueil, collection, 4 fiches, « La balade », aide, inscription, SEO | 4fa83755 | dépôt (26) | tailles et matières inconnues (blocs masqués) |
| HEUREN | E-commerce | un bleu à regarder, pas un écran à surveiller | accueil, fiche, aide, « Au fil du jour » relue, inscription, SEO | cdf39c9f | dépôt (14) | mouvement, étanchéité, écrin non renseignés |
| ALCÔVE | E-commerce | s'asseoir pour de bon | accueil, fiche, aide, « Pièce par pièce » relue, inscription, SEO | cdf39c9f | dépôt (14) | dimensions, tissu, entretien non renseignés |
| NOCTIL | Spécialisée | ce soir, on ne sort pas : on change de ciel (une cible adulte) | accueil, fiche, univers, aide, SEO | 2e4b954a | dépôt (14) | aucun bienfait sur le sommeil, aucune spec |
| TRAVERSE | Spécialisée | le même sac du lundi au vendredi | accueil, fiche, aide, « Carnet de route » relue, SEO | 2e4b954a | dépôt (14) | volume, poids, format cabine non renseignés |
| SILLON | Spécialisée | votre espresso ne reste plus à la maison | accueil, fiche, contact, usages relue, pied, SEO | aef8a18d | dépôt (16) | pression, café, autonomie non renseignés |
| ONDE | E-commerce | d'un geste, vous êtes dans votre musique | accueil, fiche, aide, usages relue, inscription, SEO | 15fab0e4 | archive privée | autonomie, connexion, réduction de bruit non affirmées |
| ORBE | E-commerce | la lumière change de place, l'atmosphère aussi | accueil, fiche, histoire, FAQ, contact, livraison, pied, SEO | c71d8475 | archive privée | dimensions, alimentation, livraison ; prix démo 79 € conservé |
| FRAISE | Spécialisée | le flacon qui fait le tour de la table | accueil, fiche, à propos, article, publi-rédactionnel, FAQ, contact, livraison, légales, bibliothèque, panier, pied, SEO | d0cfeaaf | archive privée | ingrédients, allergènes, délais, retours non renseignés ; avis à venir |
| Atelier Rive | Services | être compris avant d'être conseillé | accueil, prestations, à propos, FAQ, contact, légales, pied, SEO | c71d8475 | archive privée | tarifs, délais, zone, adresse, équipe inconnus (masqués) |

Adaptation client : les rôles de contenu par section sont dans `src/lib/theme/content-roles.ts` et
`docs/coordination/ROLES-CONTENU-THEMES.md`. Ils sont destinés au moteur central ; la branche de Codex n'est pas
modifiée. Contrôles exécutés à la livraison : voir le commentaire final de la PR #159.

## Boutiques des clients

- **Charte du client prioritaire** : quand le client a validé ses couleurs (charte), le thème choisi change la
  composition, jamais ces couleurs (`adoptDirection`, test `palette-direction`). **Repli documenté** : sans charte
  validée ni couleurs réelles (site existant, logo fourni), le thème choisi apporte sa palette ; les vraies couleurs
  restent gardées à part (« Vos couleurs ») et le client peut y revenir.
- **Plus de signature répétée** : sur une même page, un titre ou un texte déjà affiché par une section visible n'est
  plus repris par une autre ; il devient le repère neutre du rôle de la section (« En situation », « Chez vous ») ou
  disparaît (`distinctCopy`, tous thèmes). Corrige « L'heure bleue, au poignet » reprise sur le projet HEUREN.
- La rédaction automatique d'un client suit la marque du projet (signature, histoire, positionnement) ; l'angle par
  thème ci-dessus sert de modèle à la rédaction IA de Codex (#154), qui n'est **pas** vérifiée ici.
