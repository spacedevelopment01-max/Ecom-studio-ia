# La planche de marque

Compte rendu du 24 novembre 2026. Construit sans aucun appel payant, sur la branche locale `planche-de-marque` ; rien
n'est envoyé ni fusionné sans le oui du propriétaire.

## Ce que le propriétaire a dit

- Sa demande de départ, mot pour mot : « Oui et cette partie là en xhigh, quand le client reçois ses 12 logos il peut en
  choisir jusqu'à 2 dans le 1er forfait 3 dans le forfait du milieu et 4 dans le dernier forfait et chaque logo choisi à
  sa planche comme tu viens de le faire et je veux exactement les même planche dans sina ».
- Son accord écrit, mot pour mot (24 novembre 2026) : « Oui, garde vrai-produit-du-client-joint et
  publication-incomprehensible pour la marque finie, le site et les vraies publications, ajoute et scelle
  planche-de-marque-openai (une planche par logo choisi, 2.5 Sunburst xhigh 1536x2304, le logo puis la disposition, le
  texte de base mot pour mot sauf les six parties du métier et la phrase des données vérifiées), planche-donnees-verifiees
  (l'année en cours et le domaine vérifié, « disponible » ou « à vérifier », comparés lettre pour lettre) et
  planche-refusee-deux-fois-jamais-montree (une reprise à la charge du Studio avec les raisons ; refusée deux fois, elle
  n'est pas montrée et SINA propose de la finir à sa charge), et mets à jour les parties Identité et Maquette du site sur
  la planche de CLAUDE.md. »

## Ce qui change pour le client

1. Il choisit son nom, puis ses esquisses (2, 3 ou 4 selon son forfait) ; chaque esquisse devient un logo fini, relu.
2. **Chaque logo choisi reçoit sa planche de marque** : une seule grande image, faite comme les planches de Tenon et de
   Racine, avec son logo, ses couleurs, ses typographies, son ton, ses images de référence, ses produits, ses trois
   publications, son site sur ordinateur et sur téléphone, son emballage, et le bloc du nom de domaine.
3. Sur la planche, le nom de domaine a été vérifié juste avant le dessin : « disponible », « à vérifier », ou « Adresse à
   choisir » si tout est pris ; l'année est celle du jour. Sans photo de personne ni accord écrit, aucune personne n'y
   apparaît.
4. La planche est montrée seule, en entier, sans rien posé dessus : on peut l'agrandir et la télécharger. Dessous : la
   case du domaine (« libre aujourd'hui, seule la réservation le garantit ») et le bouton « Choisir ». Au choix, le
   domaine est revérifié gratuitement.
5. SINA dit en une phrase : « Chaque planche est une présentation de ton identité : ta marque finie et ton site
   garderont tes vraies informations. »
6. Une planche ratée n'est jamais montrée : refusée, elle est refaite une fois aux frais du Studio, avec les raisons du
   refus ; refusée deux fois, SINA le dit et propose de la refaire à sa charge. Avec moins de deux planches montrées, le
   choix attend.

## Ce qui est construit

- **Les deux fichiers fixes**, rangés mot pour mot dans `assets/planche-de-marque/` : la disposition des essais (celle
  de la planche « tête de chien » de Poppy, la même que celle jointe à Tenon et à Racine) et le texte de base. Leurs
  empreintes sont vérifiées avant chaque envoi : un fichier changé n'est jamais envoyé.
- **Le texte envoyé** : le texte de base mot pour mot, sauf les six parties du métier (le nom à cinq endroits ; la ligne
  de la marque ; l'exemple d'émotion du format carré ; le type de site en quatre lignes liées : boutique pour un client
  qui vend des produits, site de marque avec sa demande — devis, rendez-vous ou réservation — pour des prestations ; les
  images de référence ; les produits ou prestations). Puis, à la toute fin, la phrase des données vérifiées. Un test
  refait exactement les textes envoyés pour Tenon et pour Racine.
- **Les valeurs du métier** : un seul appel par client, par le modèle de texte le plus fort (effort moyen), à partir de
  sa fiche et du métier déjà écrit pour la recherche du logo. Le contrôle gratuit vérifie le nom exact, trois ou quatre
  traits, chaque produit retrouvé dans les mots du client (sinon il est retiré, jamais inventé), aucune personne sans
  accord, aucun chiffre ni promesse. Une seule réécriture, aux frais du Studio.
- **L'image** : le modèle d'images des logos, en qualité la plus haute, 1536 × 2304, avec le logo fini joint d'abord,
  puis la disposition, et rien d'autre ; sans secours ; une panne n'est jamais relancée ; plafond, garde-fou et comptage
  comme toute image ; la trace complète (texte, réglages, images jointes, consommation) gardée avec l'image.
- **Le relecteur** : le modèle de texte le plus fort, effort élevé. Il lit la planche découpée en quatre bandes, avec
  le logo et la disposition ; il recopie le nom, le copyright et le domaine, que le code compare lettre pour lettre. Il
  refuse un nom ou un logo faux ou redessiné, une faute, une promesse ou un chiffre inventé, une année fausse, un domaine
  différent, une personne sans accord, un logo foncé sur fond sombre, le mot « maquette » ou « mockup », un élément
  recopié de la disposition, une note sous 8.
- **La tâche de fond** : pour les nouveaux projets, la planche remplace la grande scène et le haut du site des planches
  proposées. Chaque appel payé a son point de reprise : une relance ne repaie rien. La chaîne des textes reste (le site,
  la marque finie et les publications la lisent).
- **L'écran** : la conversation et l'onglet Marque montrent la planche entière, avec l'agrandissement, le
  téléchargement et la case du domaine ; SINA la voit entière, avec ce qu'en a dit le relecteur.
- **Le devis** : une planche par logo choisi entre dans l'accord unique de l'étape « La marque », à la place des images
  des planches proposées ; la borne du Studio compte une reprise par planche et une réécriture des valeurs. La grande
  scène de la marque finie (elle n'est plus faite avant le choix) est comptée dans ce même accord : la fin de la marque
  reste couverte sans nouvelle carte.

## Ce qui reste comme avant

- Les anciens projets gardent leurs planches et l'ancien code ; le banc d'épreuves le rejoue.
- La marque finie, le site et les vraies publications gardent leurs règles (épreuves `vrai-produit-du-client-joint` et
  `publication-incomprehensible`, gardées par l'accord écrit).
- Les vraies publications restent celles du module des publications (éteint par défaut) ; pour les nouveaux projets, la
  bande des publications n'est plus posée sur une planche : elle reste un fichier livrable à part.

## Les prix

Mesuré lors des essais (déjà payés) : une planche de Tenon ou de Racine en qualité la plus haute, 0,1241 € (de 0,1206 à
0,1241 € selon le logo joint).

Calculés par le devis du Studio (des calculs, pas des mesures), pour la seule part des planches de marque (valeurs du
métier, planches et relectures) :

| Planches | Probable | Au plus | Reprises à la charge du Studio, au plus |
|---|---|---|---|
| 2 | 0,43 € | 1,07 € | 1,07 € |
| 3 | 0,63 € | 1,52 € | 1,52 € |
| 4 | 0,83 € | 1,97 € | 1,97 € |

Pour un client, toute l'étape « La marque » (étude, noms vérifiés, recherche du logo, logos finis, planches de marque,
marque finie) :

| Forfait | Probable | Au plus |
|---|---|---|
| 2 planches | 4,52 € | 14,92 € |
| 3 planches | 5,30 € | 17,07 € |
| 4 planches | 5,83 € | 19,21 € |

Les images des planches d'avant (grande scène, haut du site, direction artistique et relectures) coûtaient, au même
devis, 0,89 € probable et 2,16 € au plus pour 2 planches : la planche de marque coûte moins cher.

## La disposition des métiers des animaux

La disposition des essais montre une marque d'accessoires pour chiens : pour un client proche des animaux, le risque
qu'elle soit recopiée est réel. Un emplacement est prévu dans le code ; il est vide. Tant qu'il est vide, ce métier
prend la disposition standard et le relecteur reçoit en plus la consigne de refuser toute copie.

Proposition à valider : la planche de Racine (`docs/studio/essais-logos-api/planche-racine-xhigh/planche-racine-xhigh.png`,
branche `claude/chef-orchestre-sina`) : mêmes blocs aux mêmes places, une boutique, aucun animal, aucune personne en
entier (une main dans une image de référence).

## Ce qui n'est pas vérifié

- Aucun essai réel : ni le dessin, ni la relecture, ni les valeurs du métier n'ont été faits avec la vraie IA.
- Le modèle d'images n'a jamais reçu la phrase des données vérifiées : on ne sait pas encore s'il écrit l'année et le
  domaine exactement (les planches d'essai portaient « © 2024 »).
- Les écrans n'ont pas été regardés dans un navigateur.

## Le relecteur de la planche : le texte lisible et les promesses mesurables (25 novembre)

Préparé sans aucune dépense, sur une branche locale (`reprise-du-logo`), sans rien envoyer.

**Ce qui s'est passé.** L'essai réel des planches de Racine (preuves :
`docs/studio/essais-complets/images/racine/planches-execution`, branche `claude/essais-complets`, commit 86645c7) a vu
toutes les planches refusées, à 6, 7, 7,5 et 7,5. Les raisons : les lignes d'alphabet sous les polices, déformées ; le
petit texte circulaire du badge, déformé ; des mots de réassurance du site (« Livraison soignée », « Conseils
pratiques », « Emballage soigné »…) pris pour des promesses ; des mains sur A-1. Ce que les planches tiennent bien :
© 2026 juste, « racine-officiel.fr — disponible », aucune personne (sauf A-1), aucun prix, aucun chiffre.

**Ses mots.** Devant A-2 et B-2, à la question « Ces deux planches te paraissent montrables à un client telles
quelles ? » : « C'est très bien ».

**Ce qui change.**

1. **Les micro-textes décoratifs.** Le relecteur ne juge pas ceux qui sont illisibles à taille normale : les lignes
   d'alphabet des spécimens de polices, le petit texte circulaire d'un badge, l'heure de la barre d'état d'un téléphone.
   Il les range à part (`microTextes`). Le code les écarte aussi des fautes d'un verdict d'avant, à des mots sûrs
   (alphabet, spécimen, bas de casse, badge, sceau, texte circulaire, barre d'état) ou à une ligne qui commence par
   « abc » sans espace. Tout texte lisible reste juste ; le nom, l'année et le domaine sont toujours comparés lettre pour
   lettre par le code.
2. **Les promesses.** Seules font refuser les promesses mesurables ou les garanties : un chiffre, gratuit, offert, un
   délai, un montant, un prix, un remboursement, une garantie, une note, un avis, un nombre de clients, une sécurité
   promise (« Paiement sécurisé » reste un refus). Le code écarte, de façon sûre, un mot qualitatif ordinaire (soigné,
   sélectionné, conseils, qualité) : jamais une phrase qui porte un chiffre ou un de ces mots, jamais plus de six mots.
3. **Le repère.** La consigne lui donne la question et sa réponse, mot pour mot, sans image d'essai. La comparaison aux
   « meilleures agences » est retirée. Le seuil reste 8. Une note sous 8 qui ne tient qu'à ce qui est écarté ne compte
   pas ; sans rien d'écrit, elle reste un refus. Ce qui est écarté est écrit au compte rendu.
4. La reprise de la planche ne change pas (une fois, à la charge du Studio, ses raisons à la fin du texte).

**Le rejeu, honnête.** Les quatre verdicts réels sont copiés tels quels dans `tests/fixtures/relecteur-planche`.
- A-2 (7) : quatre lignes d'alphabet et le texte circulaire du badge ; « Plantes de qualité », « Conseils pratiques »,
  « Emballage soigné ». Rien d'autre. « Gardée », la note non comptée.
- B-2 (7,5) : quatre lignes d'alphabet et l'heure de la barre d'état du téléphone (« 0-6T ») ; « Livraison soignée »,
  « Conseils jardinage ». « Gardée », la note non comptée. À savoir : l'heure du téléphone n'était pas dans les deux
  exemples donnés ; elle est rangée avec les micro-textes illisibles à taille normale. Sans cela, B-2 resterait refusée.
- A-1 (6) : des mains, sans accord : « refusée », comme il se doit. Restent aussi une faute d'un texte lisible
  (« CULTIVER AUJOURD'HUI DES DEMAINS PLUS VERTS ») et « Paiement sécurisé ».
- B-1 (7,5) : l'emballage recopié de la disposition : « refusée ». Reste aussi « Paiement sécurisé ».

Ce qui a été vérifié : le code. Ce qui ne l'a pas été : ce que le vrai relecteur rangera et notera avec sa nouvelle
consigne ; seul un essai réel le dira.

**Les épreuves.** Une épreuve nouvelle est scellée : `relecteur-de-planche-texte-lisible-et-promesses-mesurables`, avec
ses mots et la question. Une épreuve scellée est contredite et marquée remplacée, sans être réécrite :
`planche-refusee-deux-fois-jamais-montree` (« faute, promesse ou chiffre inventé, …, note sous 8 » font refuser). L'attendu
de la nouvelle reprend tout ce qui reste vrai d'elle. Ne sont pas contredites : `planche-donnees-verifiees` (le nom,
l'année et le domaine restent comparés lettre pour lettre) et `planche-de-marque-openai` (la requête et le texte ne
changent pas). L'accord écrit manque encore ; la phrase qui couvre tout est dans
`docs/studio/LOGO-METHODE-DES-GRAPHISTES.md`.

## La phrase sous le logo, reprise mot pour mot sur sa planche (25 novembre)

Préparé sans aucune dépense, sur une branche locale, sans rien envoyer.

**Ce qui s'est passé.** Constat de l'essai réel d'Écume du 25 novembre 2026, présenté par le chef d'orchestre : la
planche de marque ne connaît pas la phrase choisie sous le logo. Sa « ligne de la marque » est écrite par les valeurs du
métier, sans lien avec la phrase du logo. Or le choix du client se reprend mot pour mot.

**Ce qui change.**

1. **Chaque planche reçoit la phrase de son logo**, toutes ses lignes, dans l'ordre. Dans le Studio, c'est la phrase
   choisie pour l'esquisse dont ce logo est tiré (méthode des graphistes) ; dans l'essai, celle du fichier
   `esquisse-NN-phrase-du-logo.txt`, à côté du logo fini (s'il manque, rien n'est lancé).
2. **Le code la pose dans la ligne de la marque**, mot pour mot, après l'appel des valeurs du métier, qui ne la reçoit
   pas et ne peut pas la réécrire. La ligne garde le nom, le métier et les traits, puis : « Sa phrase, choisie par le
   client et écrite sous le logo […] : « … » puis « … » ; c'est aussi son slogan : partout où la planche l'écrit,
   écris-la exactement […] ». Le reste du texte de base ne change pas d'un mot ; la phrase des données vérifiées reste à
   la toute fin. Le contrôle gratuit vérifie que chaque ligne figure mot pour mot dans le texte envoyé, sinon rien n'est
   envoyé.
3. **Le relecteur la reçoit** et recopie chaque endroit où elle est écrite sur la planche ; le code compare lettre pour
   lettre, comme le nom, l'année et le domaine (la casse, les espaces et un point final mis à part). Une lettre, une
   ligne manquante, en trop ou hors de l'ordre, ou la phrase lue nulle part : la planche est refusée comme un nom mal
   écrit, puis refaite une fois à la charge du Studio avec cette raison. Ce qui touche la phrase n'est jamais rangé avec
   les micro-textes décoratifs, même sur un badge.
4. **Sans phrase** (« aucune », ou rien de choisi) : rien ne change, ni le texte, ni la demande au relecteur, ni sa
   réponse.
5. La phrase est gardée avec la planche (`phrase`), et dans le résultat de l'essai (`planche-X-resultat.json`).

**Le prix ne change pas** : le prix au plus d'une planche est déjà compté au texte le plus long permis.

**L'épreuve.** `planche-reprend-la-phrase-du-logo` est ajoutée et scellée, rejouée gratuitement. Aucune épreuve scellée
n'est contredite : `planche-de-marque-openai` dit « le texte de base mot pour mot sauf les six parties du métier et la
phrase des données vérifiées », et la phrase entre dans l'une de ces six parties, la ligne de la marque ;
`planche-donnees-verifiees` (la phrase des données vérifiées reste à la toute fin) et
`relecteur-de-planche-texte-lisible-et-promesses-mesurables` (tout texte lisible reste juste) restent vraies.

**Ce qui n'est pas vérifié.** Aucun essai réel : on ne sait pas encore si le modèle d'images écrit la phrase exactement
sur la planche, ni ce que le vrai relecteur relèvera.

## L'essai réel d'Écume, étape 3 : ce qui a tout bloqué, et ce qui change (25 novembre)

L'essai s'est arrêté en erreur après 0,23 €. Le constat du chef d'orchestre : « Écume, étape 3 : arrêt en erreur, 0,23 €
dépensés. La planche A est très belle, mais trois défauts […] ont tout bloqué. » Preuves : branche
`claude/essais-complets`, `docs/studio/essais-complets/images/ecume/3-planches/` ; le verdict réel est copié tel quel dans
`tests/fixtures/ecume-planches/`.

1. **La phrase est comparée par ses lignes seulement.** Le relecteur écrivait « 01 Logo principal : SAVONNERIE
   ARTISANALE / BULLES DE SOIN AU NATUREL » et le code comparait toute la chaîne : quinze refus faux, la phrase était
   juste partout. Le relecteur répond maintenant, pour chaque endroit, `{ emplacement, lignes, cachee }` ; le code ne
   compare que les lignes, lettre pour lettre. Un verdict d'avant (une chaîne) se lit sans l'emplacement (ce qui précède
   un « : », même quand l'emplacement en porte un, comme « Format 1:1 »), ses lignes coupées sur « / ».
2. **Une phrase cachée en partie par un objet de la scène n'est pas mal écrite.** Le relecteur le dit (`cachee`) et écrit
   « … » à la place de ce qui est caché ; le code compare les seuls mots visibles, chacun juste et dans l'ordre. Un mot
   visible faux, déformé ou « [illisible] » fait refuser. Une faute relevée qui ne dit que la partie cachée n'en est pas
   une. La consigne porte la règle en termes généraux, sans nom ni exemple d'essai.
3. **La reprise part toujours.** Elle n'était jamais partie : 8 939 octets pour 7 000 permis, à cause de 18 raisons. Les
   raisons sont dédoublonnées, rangées des plus graves aux moins graves (une personne visible sans accord, le nom, la
   phrase choisie, l'année, le domaine, puis le reste, la note en dernier), chacune coupée à 600 octets au plus, et
   gardées tant que le texte tient ; ce qui ne tient pas est compté à la fin. Le relecteur dit aussi où il voit une
   personne (`personnesVues`), pour que la reprise sache quoi retirer ; pour un verdict d'avant, le code le prend dans son
   « pourquoi ».
4. **L'échec d'une planche n'empêche jamais les autres.** La planche B n'avait jamais été lancée. Dans le Studio comme
   dans le script, chaque planche est indépendante : une planche en erreur n'est jamais relancée ni montrée, elle est
   signalée au Studio (journal des erreurs et notification de l'administration, jamais au client), et les autres sont
   faites. Les règles restent : refusée deux fois, elle n'est pas montrée ; avec moins de deux planches montrées, le
   choix attend.

**Rejoué par le code sur le verdict réel de A** (sans aucun appel) : plus aucun des quinze refus faux. Restent : la main
visible dans l'image de référence « Mousse délicate » (avec l'endroit) ; « Dites-le nous ! » au lieu de « Dites-le-nous ! » ;
la phrase déformée sur le sac en tissu (la 2e ligne est dite « déformée », « [illisible] », donc refusée même avec la
1re ligne cachée par l'étiquette) ; la note de 5. Le texte de la reprise fait 6 062 octets.

**Les épreuves.** `planche-phrase-par-lignes-et-reprise-qui-part-toujours` est ajoutée et scellée. Elle contredit deux
épreuves scellées, marquées remplacées, avec l'accord écrit du propriétaire encore à recevoir :
`relecteur-de-planche-texte-lisible-et-promesses-mesurables` (« avec toutes ses raisons à la fin du texte ») et
`planche-reprend-la-phrase-du-logo` (« une ligne manquante » fait refuser). Leurs rejeux sont gardés tels quels et rejoués
par la nouvelle épreuve.

## Les produits de la fiche seulement, et le signe déclaré isolé (26 novembre 2026)

Essai réel du torréfacteur, étape 4 (deux planches, 0,76 €) : la planche A est gardée à 9/10 ; la planche B est refusée
deux fois. Constat du chef d'orchestre : « Plus grave, et pas vu par le relecteur : la planche B invente des produits. »
Elle montre « Brésil Sul de Minas », « Éthiopie Yirgacheffe », « Guatemala Antigua », « Colombie », que le client n'a jamais
donnés. Règle : « SINA n'invente jamais l'équipe ni les biens à vendre ». Ce qui change, sans aucun appel payant :

1. **Le texte de la planche** (partie « produits », l'une des six parties du métier) : pour une boutique, juste après la
   liste, une ligne dit en positif que les étiquettes, les emballages, les fiches produits et le site ne portent que les
   noms du client (« Cafés en grains », « Cafés moulus », « Coffrets »). Le texte des preuves (Tenon, Racine) ne change pas ;
   un site de marque non plus. Un ancien premier essai d'une boutique ne se reprend plus tel quel : son texte n'est plus
   celui que le Studio enverrait.
2. **Le contrôle gratuit des valeurs** refuse (une réécriture à la charge du Studio) toute origine, variété, gamme, tout
   pays ou nom propre absents de la fiche, dans les produits, les images, l'émotion et les traits.
3. **Le relecteur** reçoit la liste des produits du client et relève à part (`produitsInventes`) chaque nom de produit
   lisible qui n'en est pas un. Le code compare : un nom de la fiche (singulier ou pluriel) est permis ; tout autre fait
   refuser, avec une raison claire pour la reprise.
4. **Le signe isolé** : le relecteur avait écrit « un petit crochet en forme de « ? » égaré, hors des mots », que le code ne
   reconnaissait pas. Il le déclare maintenant lui-même à part (`signesIsoles`) ; le code le range en petite finition, sauf
   s'il touche une lettre, un mot, le nom, la phrase du logo, l'adresse ou l'année.
5. « 100% Arabica » reste refusé : un fait chiffré inventé sur le produit.

Sur la planche A, à l'œil : « Café en grains », « Café moulu », « Cafés en grains », « Cafés moulus », « Coffrets café ».
Une petite ligne « L'ESSENTIEL » sous « CAFÉ EN GRAINS » sur le sachet de la publication 4:5 ressemble à un nom de gamme
que le client n'a pas donné ; le relecteur a rangé les petites lignes sous les noms des paquets dans les micro-textes illisibles. Le sondage de la story (« Café noir », « Café au
lait », « Cappuccino ») nomme des boissons, pas des produits vendus.

Épreuves ajoutées et scellées : `planche-produits-de-la-fiche-seulement`, `planche-signe-isole-declare-par-le-relecteur`.
Verdicts réels copiés tels quels : `tests/fixtures/torrefacteur-planches`.

**Correction (même jour).** La reprise renvoyait au dessinateur le nom inventé, recopié de l'emplacement du relecteur
(« sachet Éthiopie »). Désormais, les raisons envoyées pour la reprise ne recopient jamais un nom inventé : la raison des
produits inventés dit seulement où, en termes neutres, et rappelle les noms du client ; dans les autres raisons, les noms
inventés, les pays et les mots d'origine, de variété ou de gamme absents de la fiche sont retirés. Le compte rendu garde
les noms exacts. L'épreuve `planche-produits-de-la-fiche-seulement`, jamais envoyée, est corrigée et rescellée.
