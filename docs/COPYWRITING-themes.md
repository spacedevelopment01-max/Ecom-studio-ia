# Rédaction commerciale des thèmes — inventaire et stratégie (PR #159)

Consigne en vigueur : Thomas, 21 octobre, **21 h 45** (PR #159). Les 11 thèmes sont refaits en rédaction commerciale,
chacun avec **un angle marketing précis** donné par Thomas : utilisateur, acheteur, situation d'achat, tension, désir,
angle unique, promesse tenable, objections, faits disponibles et exclusions. Elle remplace les cibles des consignes de
18 h 31 et 19 h 50, qui ne sont plus utilisées. Les cibles et les angles viennent du brief de Thomas. Les mots prêtés au
client (tension) et les situations précises sont des **hypothèses de rédaction** à valider. Les faits sont ceux du kit et
du projet. Rien n'est inventé : aucune caractéristique, aucun bienfait, aucun avis, aucun chiffre, aucun prix, aucun
stock, aucune urgence. La seule exception est la composition de FRAISE, **fictive et annoncée comme telle**, autorisée
par Thomas.

## Inventaire exhaustif (catalogue réel)

Le catalogue actif est la liste `REFERENCE_THEMES` (`src/lib/theme/theme-fit.ts`) : **11 thèmes**. Chaque thème a été
livré sur sa branche ; les branches s'empilent (aucune n'est fusionnée dans `main`, qui n'en contient que 4).

| Thème | Famille | Produit de la démonstration | Présent dans | État de la rédaction |
|---|---|---|---|---|
| SOUPLE | E-commerce | collection yoga et Pilates (4 produits) | `claude/themes-museau-souple-158` | **réécrit (21 h 45)** (voir le bilan final) |
| MUSEAU CLUB | Produit spécifique (boutique spécialisée) | collection de balade pour chiens (4 produits) | `claude/themes-museau-souple-158` | **réécrit (21 h 45)** (voir le bilan final) |
| HEUREN | E-commerce | montre bleu nuit | `claude/themes-heuren-alcove-155` et suivantes | **réécrit (21 h 45)** (voir le bilan final) |
| ALCÔVE | E-commerce | fauteuil terracotta | `claude/themes-heuren-alcove-155` et suivantes | **réécrit (21 h 45)** (voir le bilan final) |
| NOCTIL | Produit spécifique | projecteur de galaxies | `claude/themes-noctil-traverse-152` et suivantes | **réécrit (21 h 45)** (voir le bilan final) |
| TRAVERSE | Produit spécifique | sac à dos de voyage | `claude/themes-noctil-traverse-152` et suivantes | **réécrit (21 h 45)** (voir le bilan final) |
| SILLON | Produit spécifique | machine à espresso nomade | `claude/theme-sillon-148` et suivantes | **réécrit (21 h 45)** (voir le bilan final) |
| ONDE | E-commerce | casque | `main` (refonte E-commerce sur la branche #158) | **réécrit (21 h 45)** (voir le bilan final) |
| ORBE | E-commerce | lampe nomade | `main` | **réécrit (21 h 45)** (voir le bilan final) |
| FRAISE | Produit spécifique | vitamines en gummies goût fraise (produit et composition fictifs, annoncés) | `main` | **réécrit (21 h 45)** (voir le bilan final) |
| Atelier Rive | Services | aménagement et décoration intérieure | `main` | **réécrit (21 h 45)** (voir le bilan final) |

Branches de Codex en cours qui touchent les thèmes : `codex/154-integration-adaptation-client` (7 thèmes, adaptation
d'un client et génération IA) — à réunir avant toute fusion ; leur grille de forfaits (#151 / #154) n'est pas modifiée ici.

**Thèmes retirés (non réactivés)** : les 30 anciennes directions (Atelier, Clinique, Brut, Terroir, Nocturne, Pop,
Galerie, Élan, Flux, Joaillerie, Gourmand, Vitrine, Manifeste, Laboratoire, Magazine, Cinéma, Rituel, Horizon, Lookbook,
Marché, Signal, Jardin, Réception, Cabinet, Récré, Épure, Tribu, Établi, Velours, Lancement) restent lisibles par les
anciens projets mais ne sont plus proposées ; les anciennes démonstrations (ARVEN, Cime, Tribunes, Sonore, Racines &
Pierres, Pivoine, Ostral) sont retirées de l'expérience livrée depuis le 20 octobre. Aucune n'est retravaillée.

## Matrice thème → cible → angle (brief de Thomas, 21 h 45)

Les anciennes cibles sont retirées, par exemple : NOCTIL pour adulte, FRAISE « à partager », SOUPLE « un moment à elle »,
HEUREN « contre les notifications ». Les détails, les faits et ce qui n'est pas renseigné figurent dans chaque fiche.

| Thème | Utilisateur → acheteur | Situation d'achat | Angle unique | Exclusions principales |
|---|---|---|---|---|
| SOUPLE | une personne qui reprend une pratique douce chez elle après une longue pause | elle veut s'y remettre sans cours ni salle | reprendre à son rythme, sans pression de performance | rien ne remplace un encadrement ; aucun bienfait santé |
| MUSEAU CLUB | une personne qui accueille son premier chien | elle prépare les premières balades | un ensemble cohérent, un rôle clair par pièce | aucune sécurité, résistance ou matière affirmée ; aucun conseil vétérinaire |
| HEUREN | le partenaire qui la portera → celui ou celle qui l'offre | marquer une étape de vie | un cadeau qui matérialise le moment et se porte ensuite | aucune guerre aux notifications ; aucune spec (mouvement, étanchéité) |
| ALCÔVE | un lecteur en logement partagé | le canapé est à tout le monde | créer son coin lecture à soi | dimensions, tissu, confort mesuré non affirmés |
| NOCTIL | un enfant passionné d'espace → son parent (**décision de Thomas**) | offrir un cadeau à un enfant qui aime l'espace | offrir à son enfant sa propre galaxie dans sa chambre | aucune promesse sur le sommeil ni la peur du noir ; aucun positionnement adulte |
| TRAVERSE | un actif qui part en court séjour juste après le travail | le vendredi, du bureau au départ | du bureau au week-end, sans repasser par chez soi | contenance, format cabine, ordinateur non affirmés |
| SILLON | un amateur d'espresso qui voyage en van ou en camping-car | changer de paysage sans perdre son café | changer de paysage en gardant son rituel espresso | autonomie, chauffe, café compatible non affirmés |
| ONDE | un navetteur qui fait chaque jour le même trajet | le trajet quotidien en transports | transformer le trajet en rendez-vous avec sa musique | le bouton vert n'est pas le besoin central ; aucune réduction de bruit ni mesure acoustique |
| ORBE | un locataire qui meuble sans travaux | le plafonnier est celui du propriétaire | se sentir chez soi avec sa propre lumière | aucune intensité, autonomie ni dimension |
| FRAISE | un adulte qui veut une routine de vitamines simple et n'aime pas les comprimés (**décision de Thomas**) | les comprimés oubliés au fond du placard | un petit rendez-vous goût fraise | composition fictive annoncée ; aucun effet santé, anti-fatigue ou cheveux ; ni bonbon à partager ni produit capillaire |
| Atelier Rive | l'ensemble des clients des prestations (logement ou petit espace professionnel) | un emménagement, une pièce qui ne suit plus, plusieurs espaces | un intérieur adapté à sa façon de vivre : **site complet**, toutes les prestations | site jamais réduit à une campagne ; aucun tarif, délai, chantier ni avis inventés |

Les campagnes ciblées (une situation, une cible) relèvent des publications et des publicités : moteur et forfaits de
Codex, #160 et #161. Les sites ne les reprennent pas.

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

### TRAVERSE — Spécialisée — **réécrit (consigne 21 h 45)** : du bureau au week-end

| | |
|---|---|
| Utilisateur et acheteur | un actif qui part en court séjour directement après le travail (brief) |
| Situation d'achat | le vendredi, deux sacs au bureau, ou un détour par chez soi et un train qui file |
| Tension (ses mots) | « Le vendredi, je pars avec deux sacs, ou je repasse chez moi et je cours après le train. » |
| Désir | sortir du bureau et être déjà en week-end |
| Angle unique | passer du bureau au départ du week-end, sans repasser par chez soi |
| Promesse tenable | un sac à dos sobre (olive, noir) à sa place au bureau ; une organisation montrée par ce qui se voit |
| Objections traitées | fait-il sérieux au bureau, comment l'organiser pour partir directement, comment le porter, combien d'affaires (« volume non renseigné »), la démo |
| **Faits** | visuels : poche frontale zippée, compartiment principal à deux curseurs, poche latérale, sangles à boucle, poignée, bretelles, étiquette ; café, gare, aéroport, hôtel, lac |
| **Non renseigné** | volume, dimensions, poids, compatibilité avion, imperméabilité, ordinateur, modularité, matières, garantie, prix |
| Exclusions | aucune contenance, compatibilité ni équipement inventés |

Pages : accueil (« Du bureau au week-end, *sans repasser par chez soi* » → « Une journée de travail, *puis le départ* »
(au bureau, à la sortie, à destination) → « Du café du matin *au départ du soir* » → « Organisé pour le trajet, *poche par
poche* » (repères : la poche frontale pour le trajet, le compartiment pour le week-end) → finitions → « La veille au
soir » → achat → « Avant le premier départ »), fiche (« Sac à dos · du bureau au week-end », « Préparer le départ du
bureau »), carnet de route, aide, pied, SEO. **Visuels** : le kit ne contient pas de scène de bureau ; le café du matin
et le hall de gare portent le passage du travail au départ. Code : `tests/noctil-traverse-fixtures.ts`. Preuves :
`docs/preuves/copywriting/traverse/`.

### SILLON — Spécialisée — **réécrit (consigne 21 h 45)** : en van ou en camping-car

| | |
|---|---|
| Utilisateur et acheteur | un amateur d'espresso qui voyage en van ou en camping-car (brief) |
| Situation d'achat | il prépare un départ et ne veut pas renoncer à son espresso du matin sur la route |
| Tension (ses mots) | « En voyage, le café du matin, c'est une cafetière de fortune ou un gobelet d'aire d'autoroute. » |
| Désir | changer de paysage chaque jour sans changer de rituel |
| Angle unique | changer de paysage en gardant son rituel espresso |
| Promesse tenable | une machine que l'on pose sur la table, l'espresso coulant directement dans le verre placé dessous |
| Objections traitées | peut-on l'utiliser en van (« alimentation et autonomie non renseignées : vérifiez-les avant la route »), comment le café est servi, la place qu'elle prend, la démo |
| **Faits** | visuels : cylindre brun mat, bague et bouton cuivrés, service dans le verre ; lac, montagne, mer, train, hôtel |
| **Non renseigné** | autonomie, chauffe, alimentation, pression, café compatible, dimensions, garantie, prix |
| Exclusions | aucune autonomie, chauffe intégrée ni compatibilité café supposées |

Pages : accueil (« Le paysage change, *votre espresso reste* » → « Un bon espresso ne devrait pas dépendre *de l'endroit
où vous vous arrêtez* » → le moment où tout coule → détails → « Là où *vous vous arrêtez* » (haltes en tête) → achat →
« Avant de l'emporter »), fiche (« Une machine *pour vos haltes* », rituel « là où vous vous arrêtez »), « Usages » (six
haltes, du lac au dernier café au bureau), utilisation, contact, pied, SEO (titres attendus par les tests conservés :
« machine à espresso nomade », « machine à café portable »). **Visuels** : le kit ne contient **ni van ni camping-car** ;
les haltes en plein air (lac, balcon en montagne, terrasse) portent l'angle, les scènes intérieures sont présentées comme
étapes du voyage. Test d'export mis à jour (nouveau titre de la page « Usages »). Code : `tests/sillon-fixtures.ts`.
Preuves : `docs/preuves/copywriting/sillon/`.

### ONDE — E-commerce, mono-produit — **réécrit (consigne 21 h 45)** : le trajet devient un rendez-vous

| | |
|---|---|
| Utilisateur et acheteur | une personne qui fait chaque jour le même trajet en transports (brief) |
| Situation d'achat | ce temps de trajet passe à faire défiler son téléphone, ou à attendre |
| Tension (ses mots) | « Tous les jours le même trajet, et j'ai l'impression de perdre ce temps-là. » |
| Désir | que ce moment devienne le sien |
| Angle unique | transformer ce trajet en rendez-vous avec sa musique |
| Promesse tenable | un casque que l'on met en partant et retire en arrivant ; graphite discret ; commandes vertes repérables (un détail, plus le besoin central) |
| Objections traitées | peut-on le porter dans les transports (poids, autonomie, isolation non renseignés), où sont les commandes, les coloris, la démo |
| **Faits** | visuels : arceau graphite, coussinets noirs, liserés et touche verts ; train, salon, studio |
| **Non renseigné** | autonomie, connexion, isolation des bruits, qualité acoustique, poids, contenu de la boîte, garantie, prix |
| Exclusions | aucune réduction de bruit ni qualité acoustique mesurée affirmées |

Pages : accueil (« Le même trajet chaque jour, *votre rendez-vous musique* » → achat → « Noir mat, discret dans la
rame » → « Dans le train, puis chez soi » (le train en premier) → « Un seul coloris, pour tous les trajets » → « Avant
le premier trajet »), fiche (« Casque audio · pour le trajet de tous les jours »), usages (train, retour au salon,
studio), aide, pied, SEO. L'ancienne accroche « Écoutez. Posez. Repartez. » est retirée ; le test du H1 est mis à jour.
Composition E-commerce figée inchangée. Code : `tests/onde-fixtures.ts`. Preuves : kit privé, archive hors dépôt.

### ORBE — E-commerce, mono-produit — **réécrit (consigne 21 h 45)** : se sentir chez soi en location

| | |
|---|---|
| Utilisateur et acheteur | un locataire qui aménage son appartement sans pouvoir faire de travaux (brief) |
| Situation d'achat | il vient d'emménager, sous le plafonnier laissé par le propriétaire |
| Tension (ses mots) | « C'est mon appartement, mais la lumière est celle du propriétaire. » |
| Désir | se sentir chez soi |
| Angle unique | se sentir chez soi en créant son ambiance lumineuse personnelle |
| Promesse tenable | une lampe à poser, sans perçage ni fil au plafond, qui passe d'une table à l'autre et part au prochain déménagement ; trois finitions |
| Objections traitées | faut-il des travaux ou l'accord du propriétaire (non), où la poser, quelle finition, la démo |
| **Faits** | visuels et identité du kit (silhouette arrondie, Dune, Argile, Charbon ; table, bureau, chevet, fauteuil) ; prix de démonstration déjà validé |
| **Non renseigné** | dimensions, matière, alimentation, entretien, livraison, retours |
| Exclusions | aucune intensité, autonomie, dimension ni matière inventées |

Pages : accueil (« Un appartement loué. Une lumière à vous. » → « On ne choisit pas toujours son plafonnier. On choisit sa
lumière. » → « Trois finitions, pour votre intérieur » → « Du dîner à la lecture, votre lumière vous suit » → « Deux coins
à vous » → FAQ → « Ce soir, faites entrer votre lumière »), notre histoire (« Une lumière à vous, même en location »),
fiche (« Sans travaux »), FAQ, contact, livraison, pied (politiques non rédigées masquées), SEO. Identité de la démo mise à
jour (tagline). Visuels cohérents (intérieurs sobres, aucune personne). Code : `tests/engine-demo-copy.ts` (`curateOrbe`).
Preuves : kit privé, archive hors dépôt.

### Atelier Rive — Services — **réécrit (consigne 21 h 45)** : un site complet, un intérieur adapté à votre façon de vivre

Décision de Thomas : le site présente **toute l'activité et les trois prestations**, avec une identité rédactionnelle
forte. Il n'est pas réduit à une campagne : les angles ciblés (une situation, une cible) vont dans les publications et
les publicités (moteur et forfaits : Codex, #160/#161).

| | |
|---|---|
| Utilisateur et acheteur | l'ensemble des clients des prestations : la personne qui vit les lieux est celle qui fait appel à l'atelier (logement ou petit espace professionnel, d'après le positionnement du projet) |
| Situations d'achat | un emménagement, une pièce qui ne suit plus les usages, plusieurs espaces à relier |
| Tension (ses mots) | « Je sais ce qui ne va plus, pas ce qu'il faudrait faire, ni quelle prestation demander. » |
| Désir | un intérieur adapté à sa façon de vivre |
| Angle unique (identité du site) | un intérieur à votre façon de vivre : partir des usages, de la lumière et des matières |
| Promesse tenable | trois prestations décrites (pour qui, ce qu'elles couvrent) ; un parcours de contact en trois étapes : vous décrivez votre projet → nous convenons ensemble → nous proposons une direction |
| Objections traitées | quelle prestation choisir, par où commencer, faut-il savoir ce que l'on veut, un espace professionnel est-il possible, la démo |
| **Faits** | les trois prestations et leurs descriptions (projet) ; contact par formulaire ; positionnement « pour la maison comme pour un petit espace professionnel » ; photos du kit, décrites telles qu'elles sont |
| **Non renseigné** | tarifs, délais, zone d'intervention, adresse, horaires, équipe, réalisations réelles, livrables précis de chaque prestation : sections masquées dans la démo, questions prêtes dans l'éditeur |
| Exclusions | aucun chantier, client, avis, délai de réponse ni tarif inventés ; les « Inspirations » restent des images de démonstration, jamais des réalisations |

Pages : accueil (« Un intérieur à votre façon de vivre. » → « Décrire mon projet » → « Votre quotidien d'abord. La
décoration ensuite. » → « Ce que nous regardons d'abord » (vos usages, la lumière, les matières) → « Trois prestations,
selon l'ampleur de votre projet » → « Du premier message à la direction proposée » → inspirations → « Chez vous, ou dans
un petit espace professionnel » → FAQ → « Et si l'on commençait par votre projet ? »), prestations, à propos (« Un
intérieur se pense à partir de ceux qui y vivent »), contact (« Décrivez votre projet » : les trois informations à
donner), FAQ, bouton d'en-tête « Décrire mon projet », SEO de chaque page. Identité de la démo mise à jour (tagline).
Visuels : intérieurs sans personne, cohérents avec l'angle ; aucune photo ne montre un espace professionnel (dit par le
texte seulement, d'après le positionnement). Code : `curateRive` dans `tests/engine-demo-copy.ts`. Preuves : **kit
privé**, captures hors dépôt (archive privée).

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

## Bilan final des 11 thèmes (consigne du 21 octobre, 21 h 45)

Aucune fusion, aucune mise en ligne : la validation finale revient à Thomas. Les preuves publiques sont dans
`docs/preuves/copywriting/<thème>/`. Celles des kits privés (ONDE, ORBE, FRAISE, Atelier Rive) sont dans une archive
privée remise hors dépôt. Colonne « Visuels » : ce que les images du kit montrent ou ne montrent pas par rapport à l'angle.

| Thème | Angle (brief) | Pages réécrites | Commit | Preuves | Visuels | Non renseigné |
|---|---|---|---|---|---|---|
| FRAISE | vitamines goût fraise, un petit rendez-vous | accueil, fiche (composition fictive, utilisation, précautions), à propos, article, publi-rédactionnel, FAQ, contact, livraison, légales, bibliothèque, panier, bandeaux, pied, SEO | f4ce21ff, 8ce08456 | archive privée | scène de fête retirée (gros plan des gummies) ; aucune prise quotidienne montrée | composition réelle, allergènes, délais, retours ; avis à venir |
| NOCTIL | sa propre galaxie dans sa chambre | accueil, fiche, « Où le poser », aide, menu, SEO | 29f6b302 | dépôt (14) | **aucune chambre d'enfant** dans le kit (salon, bureau, coin lecture) | âge conseillé, alimentation, réglages |
| MUSEAU CLUB | premier chien, chaque pièce a son rôle | accueil, collection, 4 fiches (rôle, quand, ce qu'on voit, avec quoi), « Premières balades », aide, menu, SEO | 12407cae | dépôt (26) | cohérents (chiens portant les pièces, entrée) | tailles, matières, entretien |
| SOUPLE | reprendre en douceur, à son rythme | accueil, collection, 4 fiches, « Reprendre chez soi », aide, menu, SEO | 6281d4cd | dépôt (26) | cohérents (objets seuls, intérieur calme) | prix, matières, dimensions |
| HEUREN | il y a des étapes qui méritent une montre | accueil (ouverture sur l'écrin), fiche, aide, « Au fil du jour », inscription, SEO | 7db6b2da | dépôt (14) | cohérents (écrin et ruban en ouverture) | gravure, mouvement, étanchéité, prix |
| ALCÔVE | une alcôve à soi, le coin lecture | accueil, fiche, aide, « Pièce par pièce », pied, SEO | 2dd28312 | dépôt (14) | coin lecture cohérent ; **aucun logement visiblement partagé** | dimensions, tissu, entretien |
| TRAVERSE | du bureau au week-end | accueil, fiche, aide, carnet de route, pied, SEO | 8a6c629a | dépôt (14) | **aucune scène de bureau** (café, gare, hôtel, lac) | volume, cabine, ordinateur, poids |
| SILLON | le paysage change, votre espresso reste | accueil, fiche, usages, contact, pied, SEO | 30ae382d | dépôt (16) | **ni van ni camping-car** (lac, montagne, mer, train) | autonomie, chauffe, café compatible |
| ONDE | le trajet devient un rendez-vous musique | accueil, fiche, usages (le train d'abord), aide, inscription, SEO | 2953c68f | archive privée | cohérents (train, salon, studio) | autonomie, connexion, isolation |
| ORBE | une lumière à vous, même en location | accueil, fiche, histoire, FAQ, contact, livraison, pied, SEO | 80af9bcc | archive privée | cohérents (intérieurs sobres) | dimensions, alimentation, livraison |
| Atelier Rive | un intérieur à votre façon de vivre (site complet) | accueil, prestations, à propos, contact, FAQ, en-tête, SEO de chaque page | 466705e3 | archive privée | intérieurs cohérents ; **aucun espace professionnel** photographié | tarifs, délais, zone, horaires, équipe |

La cohérence visuelle n'est pas complète pour NOCTIL, TRAVERSE, SILLON, ALCÔVE et Atelier Rive (voir la colonne
« Visuels »). Pour les mettre au niveau du texte, il faudrait de nouveaux visuels, sans personne. Ils ne sont pas
générés ici, car aucun appel IA payant n'a été fait.

Adaptation client : les rôles de contenu par section sont dans `src/lib/theme/content-roles.ts` et
`docs/coordination/ROLES-CONTENU-THEMES.md`, destinés au moteur central ; la branche de Codex n'est pas modifiée.
Contrôles exécutés à la livraison : voir le commentaire final de la PR #159.

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
