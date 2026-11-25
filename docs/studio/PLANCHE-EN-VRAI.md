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

La phrase d'accord attendue pour les épreuves, exacte (pas encore reçue : `ACCORD_A_COMPLETER` tient sa place) :

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
- **Le code seul** (`planche-en-vrai-code.ts`) : les dix versions du logo à partir du masque du logo au fond retiré ; la
  séparation du symbole et du nom (gardée complète si elle n'est pas fiable ou si l'icône de la planche ne reprend pas le
  logo, et c'est dit) ; favicons 32, 64, 512 et avatar ; la palette (médiane de chaque pastille, rôles donnés par le
  code) ; les polices cherchées dans le catalogue du Studio, la plus proche sinon (et SINA le dit) ; les titres redessinés
  avec les textes de l'inventaire ; le ton et le bloc 10 gardés s'ils passent le contrôle (pas de promesse mesurable ;
  copyright et domaine vérifiés exacts), sinon redessinés corrigés ; le badge refait (anneau et texte autour du symbole).
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
