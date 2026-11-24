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
