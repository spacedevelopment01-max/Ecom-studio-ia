# La planche en vrai

Compte rendu du 25 novembre 2026. Construit sans aucun appel payant, sur la branche locale `planche-en-vrai` ; rien
n'est envoyé ni fusionné sans le oui du propriétaire. Tout est derrière le réglage `sina.planche.envrai`, éteint par
défaut, et ne concerne que les nouveaux projets (ceux qui ont une planche de marque).

## Ce que le propriétaire a dit

Mot pour mot (25 novembre 2026, relayé par le chef d'orchestre) :

- « En soit c'est juste une planche de démonstration et une fois que le client à choisi sa planche sina doit lui refaire
  à l'identique mais cette fois ci en vrai sur son studio. Tu vois ça que je veux dire et ça doit être à l'identique en
  visuel » ;
- « Le clients pourra télécharger les logo image au besoin et les code couleur seront la aussi en copier coller ? », puis
  « Oui lance la construction ».

Son accord écrit pour les épreuves, mot pour mot (25 novembre 2026) :

« Oui, marque vrai-produit-du-client-joint comme remplacée par ma décision du 25 novembre, ajoute et scelle
vrai-produit-dans-la-planche-en-vrai (sa photo jointe à chaque case où le produit se voit, mise en scène gardée à
l'identique, relecture qui compare et refuse un autre produit ; sans photo, image d'ambiance jamais posée comme son
produit) et planche-en-vrai-a-l-identique (17 images refaites en 2.5 Sunburst high à partir de leur aperçu, logo joint
seulement s'il y est, marges des formats larges, 10 versions, palette mesurée et polices par le code, assemblage
3072×4608, une reprise à la charge du Studio, l'aperçu gardé si elle est refusée deux fois ; une fois la planche de
marque faite, le mélange de deux identités n'est plus proposé), et mets à jour la partie Identité de CLAUDE.md. »

Preuves (branche `claude/chef-orchestre-sina`, `docs/studio/essais-logos-api/racine-planche-en-vrai/`) : `lancer.py`
(la règle, les requêtes, les tailles), `refaire-elements.py`, `assembler-planche.py`, `boites.json`, les bilans, et
`comparaison-demonstration-en-vrai.jpg`.

## Ce qui change pour le client

1. Il choisit sa planche de démonstration, comme avant. Le mélange de deux identités n'est plus proposé ; s'il le
   demande, SINA lui dit simplement que ce n'est plus possible et qu'elle peut retoucher sa marque ensuite.
2. SINA refait sa planche **en vrai, à l'identique** : chaque image en haute définition, ses dix logos, ses couleurs
   mesurées sur la planche, ses polices, le tout assemblé en 3072 × 4608.
3. Dans l'onglet Marque : la planche en vrai entière, « Tout télécharger » (un zip), les dix logos en PNG haute définition
   sur fond transparent, chaque couleur avec son code et un bouton « Copier », les deux polices avec leur nom à copier et
   leur fichier, chaque image en haute définition, téléchargeable seule.
4. Son site lit la palette et les polices de la planche, reprend l'ouverture 1920 × 720 et les images de son univers
   sans les refaire. Les trois publications refaites sont les premières de son calendrier ; une publication que
   l'inventaire juge incompréhensible pour un inconnu reste sur la planche, et SINA le dit.
5. Sans photo de son produit : les produits de la planche sont des images d'ambiance, marquées « image d'ambiance, ce
   n'est pas ton produit » ; ils ne vont jamais sur les emplacements produit du site (« Ta photo ici » y reste). Quand il
   envoie ses photos, SINA peut refaire ces cases, sur son budget, avec une carte.

## Ce qui est construit

- **Les cases fixes** : `assets/planche-de-marque/cases.json`, empreinte vérifiée comme la disposition, une entrée par
  disposition (standard et animaux) : les 17 images, les 10 tuiles du logo, les 5 pastilles, la palette, les
  typographies, le ton, le bloc 10, le haut et les 10 titres.
  - Standard : les 13 cases de `boites.json`, les `TUILES` et les `POSTS` d'`assembler-planche.py`, repris tels quels ;
    l'ouverture du site (découpée dans l'écran de l'ordinateur), le ton, le bloc 10 et les titres mesurés sur la planche
    choisie des preuves.
  - Animaux (`disposition-animaux.png`) : mesurées par Claude. Chaque boîte a été posée à l'œil sur la planche à taille
    réelle, puis chaque bord vérifié sur les profils de luminosité moyenne (colonne par colonne, ligne par ligne) et sur
    une image de contrôle avec toutes les cases tracées ; deux corrections après contrôle (la publication portrait
    descend jusqu'en 1568, le bloc 10 commence sous son titre).
  - Recalage : les photos et les publications sont recalées sur les bords de leur panneau, à 30 pixels au plus (le plus
    franc saut de luminosité où le grain est plus fort dedans que dehors, un bord lointain devant être nettement plus
    franc). Les écrans, l'ouverture dans l'écran de l'ordinateur, les tuiles, les blocs du code et les titres gardent leur
    case mesurée (le recalage s'y trompait). Le code refuse une case vide, coupée ou collée au bord.
- **La découpe des aperçus** (`src/lib/syna-agent/planche-en-vrai.ts`), avec sharp, sans aucun appel.
- **L'inventaire** : un seul appel au relecteur le plus fort, avant toute retouche ; il reçoit les 17 aperçus, les blocs
  du code, l'icône et le favicon de la planche, les titres et le logo ; il rend pour chaque case le logo, les textes mot
  pour mot, le produit, la personne, la compréhension des publications, et les noms des deux polices, les couleurs et ce
  que montrent l'icône et le favicon.
- **Les 17 images** (`aiElementDeLaPlanche`, permission `PERMISSION_DE_LA_PLANCHE_EN_VRAI`) : le modèle des preuves, en
  « high », aux tailles des preuves, fond opaque, une image, sans secours ni relance, reçu complet ; images jointes :
  l'aperçu, puis le logo seulement si l'inventaire l'y voit, puis la photo du produit si le client en a une et que
  l'inventaire voit le produit. Texte : la règle des preuves mot pour mot (le nom du client à la place de celui de
  l'essai, la phrase du logo seulement s'il est joint), plus une ligne qui dit ce qu'est l'élément (« Aucune personne
  n'apparaît. » sans accord). Les six images de référence en « high ». Publications demandées en 1088 puis recadrées ;
  ouverture du site demandée en 2048 × 768 puis réduite à 1920 × 720, jamais rognée ; marges généreuses pour les formats
  larges ; avec la photo : « remplace le produit par celui de la photo jointe, garde la mise en scène à l'identique ».
- **Les relectures**, par 4 groupes (publications ; ouvertures et site ; produits et emballage ; références) : chaque
  image face à son aperçu ; textes comparés lettre pour lettre par le code à ceux de l'inventaire ; aucun logo ajouté,
  aucune personne sans accord, logo clair sur fond sombre, produit comparé quand sa photo est jointe, aucun texte coupé
  ou collé au bord, fidélité de 8 au moins. Une reprise à la charge du Studio avec ses raisons ; refusée deux fois,
  l'image n'a pas de fichier en haute définition et l'aperçu agrandi garde sa case.
- **Le code seul** (`planche-en-vrai-code.ts`) : les dix versions du logo à partir du logo au fond retiré ; la
  séparation du symbole et du nom sur le masque d'encre d'`assembler-planche.py` (gardée complète si elle n'est pas
  fiable, et c'est dit ; voir « Les corrections après l'essai réel ») ; favicons 32, 64, 512 et avatar ; la palette (médiane de chaque pastille, rôles donnés par le
  code) ; les polices cherchées dans le catalogue du Studio, la plus proche sinon (et SINA le dit) ; les titres redessinés
  avec les textes de l'inventaire ; le ton et le bloc 10 gardés s'ils passent le contrôle (pas de promesse mesurable ;
  copyright et domaine vérifiés exacts), sinon redessinés corrigés ; le badge refait (anneau, le nom en haut, en bas la
  phrase sous le nom choisie pour ce logo, sinon le métier court).
- **L'assemblage** en 3072 × 4608 : le décor agrandi deux fois, les images dans leurs cases, les écrans et les
  publications entiers ; rangée comme planche de marque (« brand-board »), mention « planche-en-vrai ».
- **La tâche de fond** (`planche-en-vrai-tache.ts`, appelée par `brand-finish.ts`) : points de reprise
  `brand:envrai:inventaire`, `brand:envrai:<case>`, `brand:envrai:relecture:<groupe>`, `brand:envrai:<case>:r1` ;
  l'assemblage est gratuit et se refait. `marqueOuArretee` et `relanceMarqueQuote` les comptent. Si le logo a changé
  depuis la démonstration, SINA dit qu'elle la refait d'abord. Gardés : l'adoption du logo, le fond retiré,
  `logoDetoure`, la charte PDF (nourrie de la palette, des polices, du symbole, des favicons et de la planche en vrai) et
  le calendrier. L'ancien code reste pour les anciens projets et quand le réglage est éteint.
- **Le devis** (`devisDeLaPlancheEnVrai`) remplace la marque finie dans `accordGraphistes` et `proposalQuote` : la carte
  habituelle, le client ne voit jamais d'euros.
- **L'onglet Marque** et la route `src/app/api/projects/[id]/brand/zip/route.ts` (fflate).

## Les prix (calculés par le devis du Studio, pas mesurés)

Mesuré dans l'essai (déjà payé) : les 17 images, 0,83 € au total (0,0475 € à 0,0603 € chacune).

| | Probable | Au plus |
|---|---|---|
| Planche en vrai (inventaire, 17 images, 4 relectures) | 1,50 € | 3,60 € |
| Reprises à la charge du Studio, borne | 1,28 € | 3,09 € |
| Produits refaits avec ses photos (3 produits) | 0,26 € | 0,63 € |

Pour toute l'étape « La marque » (la carte unique) :

| Forfait | Réglage éteint (probable / au plus) | Réglage allumé (probable / au plus) |
|---|---|---|
| 2 planches | 4,52 € / 14,92 € | 4,90 € / 15,85 € |
| 3 planches | 5,30 € / 17,07 € | 5,67 € / 17,99 € |
| 4 planches | 5,83 € / 19,21 € | 6,20 € / 20,14 € |

## Ce qui n'est pas vérifié

- Aucun essai réel : ni l'inventaire, ni les 17 images, ni les relectures n'ont été faits par la vraie IA dans le Studio.
- L'assemblage a été essayé sur les images des preuves (planche choisie, logo fini, éléments refaits de l'essai) : il
  ressemble à la démonstration ; les titres, les typographies, la palette et les logos sont redessinés par le code. Chaque
  version du logo, badge compris, tient entière dans sa tuile avec une petite marge : la rangée des tuiles est effacée
  avant d'être reposée (le badge de la démonstration en dépassait), et chaque version est réduite si besoin, sans être
  déformée ni coupée (vérifié par un test sur les deux dispositions, avec des logos très large, très haut et carré).
- L'ouverture du site (1920 × 720) n'est pas posée sur la planche : l'écran de l'ordinateur la montre déjà ; elle
  sert au site.
- La séparation du symbole et du nom, le recalage des cases et la mesure de la palette n'ont été vérifiés que sur la
  planche des preuves et sur des planches fabriquées par le code.
- Les écrans n'ont pas été regardés dans un navigateur.

## Les corrections après l'essai réel (25 novembre 2026, sans dépense)

L'essai réel de Racine (preuves : `docs/studio/essais-complets/images/racine/planche-en-vrai/`, branche
`claude/essais-complets`) a gardé 14 images sur 17, pour 1,25 € comptés par le Studio. Trois défauts ont été corrigés par
le code, sans aucun appel payant, sur la branche locale `corrections-en-vrai`. Le chef d'orchestre a présenté ces
constats ; le propriétaire n'a pas de mots propres sur ce point.

1. **Les logos.** Toutes les versions montraient le logo complet. La vraie cause : le symbole n'était pris que si
   l'inventaire disait que l'icône de la démonstration reprenait le logo ; sur la planche de Racine, l'icône montre une
   feuille, pas le R, donc le logo complet partout. Cette condition est retirée (le champ reste relevé pour le compte
   rendu). La séparation reprend aussi la méthode d'`assembler-planche.py` : un masque d'encre (le logo posé sur du blanc,
   compté selon sa noirceur : plus clair que 235, rien ; plus foncé que 120, de l'encre pleine), puis la plus grande bande
   vide entre le symbole et le nom, horizontale pour un logo empilé, verticale pour un logo en ligne ; les bandes sont
   essayées de la plus grande à la plus petite, et la première fiable est gardée. Le masque du fond retiré ne sert qu'au
   fond : ses franges presque transparentes pouvaient cacher le blanc entre les deux. Les pixels gardés viennent toujours
   du logo au fond retiré. Résultat sur le vrai logo : le compact, l'icône et le favicon montrent le R seul, l'horizontal
   met le R à gauche de RACINE. Le badge porte en bas la phrase sous le nom choisie pour ce logo ; sans elle, le métier
   court écrit pour la recherche du logo (sans son article) ; à défaut, la signature de la marque ; un texte long est
   écrit plus petit puis coupé à un mot entier. Sans séparation fiable : le symbole complet, et SINA le dit.
2. **La sixième image de référence.** Le logo complet joint poussait le dessinateur à ajouter « RACINE » sous le
   monogramme et à changer sa couleur. L'inventaire dit maintenant, pour chaque case où il voit le logo, `logoVu` :
   « complet » ou « symbole ». Là où il ne voit que le symbole, le symbole seul est joint (tiré de la séparation du point
   1, sur fond blanc), avec la phrase `regleDuSymbole` : sa forme exacte, la couleur et la matière qu'il a sur l'aperçu,
   ni nom ni texte ajouté. Sans séparation fiable, rien n'est joint, jamais le logo complet. Une réponse d'avant ce champ
   se lit toujours et garde la règle d'avant (le logo complet). La séparation se fait désormais avant les retouches.
3. **Le bandeau d'ouverture de la planche.** Demandé en 3 pour 1 avec des marges généreuses, il est revenu deux fois
   avec de larges bandes blanches, refusé deux fois pour elles. Le code les rogne maintenant AVANT la relecture
   (`rognerLesMargesBlanches`). L'essai du chef d'orchestre gardait les lignes dont la moitié droite est plus sombre que
   245 ; la règle est adaptée : une ligne n'est une marge que blanche sur TOUTE sa largeur (moyenne au-dessus de 245 et
   97 % de ses points au-dessus de 240), pour qu'un bandeau au fond clair d'un côté ne soit jamais rogné dans son dessin ;
   seules les marges continues depuis le haut et depuis le bas partent, jamais une ligne du milieu ; un bord n'est pas
   rogné quand l'aperçu a lui-même une bande blanche de ce côté (8 % de sa hauteur au moins) ; rien n'est rogné si les
   marges dépassent la moitié de la hauteur ; la largeur n'est jamais touchée. C'est l'image rognée qui est relue face à
   son aperçu et gardée en haute définition. Dans l'assemblage, elle n'est jamais déformée : en plein cadre si le plein
   cadre n'en coupe pas plus de 1,5 % de chaque côté, sinon entière sur le fond de sa case, pour qu'aucun texte près d'un
   bord ne soit coupé (sur l'essai : 2304 × 582 après rognage, posée entière, deux filets clairs fins en haut et en bas).

Inchangé : les publications 1 et 3, jugées incompréhensibles par l'inventaire, restent sur la planche et hors du
calendrier.

Épreuve ajoutée et scellée : `planche-en-vrai-symbole-seul-et-bandeau-sans-marges` (aucune épreuve scellée n'est
contredite : le logo n'est toujours joint que là où l'inventaire le voit, les versions viennent toujours du logo au fond
retiré, chaque image est toujours relue face à son aperçu). Tests : `tests/planche-en-vrai-corrections.test.ts`, avec le
vrai logo de l'essai réduit en 512 × 512 (`tests/fixtures/planche-en-vrai/esquisse-11-logo-garde-512.png`).

Vérifié sans IA : un assemblage de contrôle avec les 14 images gardées de l'essai, le premier bandeau (refusé à 7 pour
ses seules marges) rogné, et les logos corrigés. Pas vérifié : la nouvelle question de l'inventaire (`logoVu`) et la
phrase du symbole n'ont pas été essayées avec la vraie IA ; on ne sait donc pas encore si la sixième référence et le
bandeau rogné passent la relecture.

## Voir la planche en vrai dans l'écran du Studio (essai, gratuit)

Le script d'essai (`scripts/syna-recette/essai-planche-en-vrai.mts`) enregistre maintenant l'état dans le parcours du
projet comme la vraie tâche (`enregistrerLeParcours` : le fil du projet, l'identité A choisie avec sa planche, la marque
finie avec ce que SINA dit, `plancheEnVrai`, et la marque du projet relue sur la planche en vrai) : l'onglet Marque du
studio privé la montre. L'identité n'a que ce que l'essai connaît ; les textes que la chaîne écrit d'habitude restent
vides, jamais inventés.

Pour une base d'essai déjà faite, `scripts/syna-recette/ecran-planche-en-vrai.mts` (aucun appel à l'IA ni au réseau)
écrit ce parcours depuis l'`etat.json` de l'essai, refuse si un média désigné manque, donne au propriétaire du projet un
compte fictif connu (`planche-en-vrai@example.com`, mot de passe fictif de recette) et affiche l'adresse de la page
Marque (`/studio/<projet>/marque`).

## L'onglet Marque, corrigé après les captures de Racine (25 novembre 2026, sans dépense)

- Aucun identifiant technique de case n'arrive au client : SINA nomme les cases comme sous la planche (« Bandeau de la
  planche, Produit 1, Image de référence 6 »), en français et en anglais (`planche-en-vrai-libelles.ts`) ; une phrase
  déjà enregistrée avec les anciens identifiants est relue avec les noms lisibles (onglet Marque, fil, ce que SINA lit).
- Avec la planche en vrai, une seule section des couleurs (le rôle de chaque couleur sous sa pastille) et une seule des
  polices (le nom de la police écrit dans cette police) ; sans planche en vrai, rien ne change.
- « Tes images en haute définition » : chaque image entière, à ses proportions, sur un fond neutre, jamais recadrée.
- Le bandeau « Ton projet est en construction » et « Étape 2 sur 9 » sont justes : la marque attend la validation du
  client, puis viennent les angles et le site. Le parcours écrit par les scripts d'essai suit maintenant la vraie tâche :
  la charte préparée, l'étape de la marque « à valider », la suite à faire.
- `REFAIRE_LOGOS=1` (gratuit) refait les logos d'une base d'essai avec le code corrigé, à partir du logo fini.

## Identique en visuel : les finitions nettoyées et la police de l'aperçu (26 novembre 2026)

Les mots du chef d'orchestre : « la planche en vrai est identique en visuel » (la règle du propriétaire, « ça doit être à
l'identique en visuel »). Deux écarts vus sur l'essai réel d'Écume (étape 3 reprise), corrigés sans dépense :

- **Une petite finition notée n'arrive jamais dans le Studio du client.** Sur la planche A, l'accent parasite isolé
  « Écume – Savonnerie artisanale |´ » du titre de référencement du bloc 10, noté en petite finition par le relecteur,
  serait resté : le bloc 10 était gardé tel quel quand le copyright et le domaine sont justes. Maintenant, les finitions
  de la planche gardée voyagent avec elle (`planche.finitions`) ; tout texte que le code écrit (titres, haut, ton,
  bloc 10) est nettoyé de ses signes parasites isolés (`nettoyerLesSignesIsoles`) ; le bloc 10 et le ton sont redessinés
  par le code dès qu'une finition y est notée, au verdict ou à l'inventaire. Le texte nettoyé de la finition tient la
  place de sa ligne si l'inventaire ne l'a pas lue. Sans finition, rien ne change.
- **La police suit l'aperçu que le client a vu.** Sur la planche B, « Nunito » était écrite sous un spécimen en écriture
  manuscrite (le relecteur l'a relevé). La planche en vrai posait la vraie Nunito, ronde et sans empattements. Maintenant,
  quand le genre lu sur le spécimen contredit celui de la police nommée (le genre de chaque police est tiré du catalogue,
  `genreDu`), la planche en vrai prend la police du catalogue la plus proche du spécimen dans le genre lu, affiche son vrai
  nom, la compte remplacée, et SINA le dit : « Sur ta planche, la police nommée « Nunito » était montrée en écriture
  manuscrite : j'ai pris celle du catalogue du Studio qui ressemble le plus à ce que tu as vu, « Dancing Script ». » Le
  genre concorde : rien ne change. Le choix se fait par le nom le plus proche dans le genre lu, sinon par la police de base
  du genre (Dancing Script pour l'écriture manuscrite) : le code ne voit pas le dessin du spécimen.

Épreuve : `planche-en-vrai-finitions-nettoyees-et-police-de-l-apercu`.
