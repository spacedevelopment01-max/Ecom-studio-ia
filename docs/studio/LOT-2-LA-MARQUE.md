# Lot 2 : la marque

Compte rendu du 15 novembre 2026, complété le 16. Accord du propriétaire pour construire : « Oui ». **L'essai réel
est en cours** (voir « L'essai réel » plus bas) : le lot n'est pas encore fini, les anciennes façons ne sont pas encore
retirées.

## Ce qui est construit

- **Une seule étape « La marque » pour le client.** SINA étudie le marché, trouve l'idée et les noms, les fait juger,
  contrôle le web et l'adresse sur Internet, montre 2, 3 ou 4 planches selon le forfait ; le client choisit ; sa marque
  est finie pour l'identité choisie ; il la regarde, demande ses changements, la valide. Les repères internes 1, 2 et 3
  restent dans le code, mais le client ne voit plus trois étapes (identité, logo, charte).
- **Les images en deux temps** (`brand-images.ts`, `brand-finish.ts`). Chaque planche proposée reçoit son logo et sa
  grande scène (deux images au lieu de sept) ; l'objet qui porte le logo, les signes en photo et les trois publications
  sont créés pour la seule identité choisie. La direction artistique écrite pour la planche ressert, sans être repayée.
- **Un seul accord du client pour toute l'étape.** Le prix montré avant les identités couvre aussi la fin de la marque
  de celle qu'il choisira ; elle part dès son choix. Un mélange de deux identités, un autre logo ou une image à refaire
  passent par `brand.finish`, avec leur prix annoncé avant.
- **Un seul logo** : celui créé par OpenAI pour la planche, relu, fond retiré, adopté comme logo de la marque avec ses
  déclinaisons. Un autre logo se demande avec les mots du client (`brand.finish`, `redo` = logo) : l'objet et les signes
  sont refaits avec lui. Sans logo validé, le nom dessiné (exact à la lettre) sert de secours, et c'est dit. Un logo
  gardé par le client n'est jamais redessiné.
- **Plus d'illustratrice, plus de dessin en code** à la place d'une image (objet, colis, publications, scène). Une image
  refusée à la relecture n'est pas montrée, et c'est dit.
- **Consignes nettoyées** (`brand-prompts.ts`, `brand-references.ts`, `brand-images.ts`, `logos.ts`) : plus aucun nom ni
  exemple tiré des projets d'essai ; les goûts du propriétaire restent, en règles générales (un mot simple et fort qui
  dit la matière ou le métier, l'épreuve du fondateur, aucun sous-entendu, 8 sur 10 pour être gardé).
- **Le travail en différé à moitié prix** pour les textes de la chaîne (`ai/llm.ts`, `deferred`) : l'appel est déposé
  chez Anthropic et compté à 50 % quand il est servi ainsi. L'attente est bornée : 10 minutes par appel et 30 minutes
  par création ; au-delà, le dépôt est annulé (rien n'est facturé) et l'appel part en direct, au prix normal déjà
  réservé. Les images n'en profitent pas : le modèle d'images n'a pas de tarif différé (notes de tarifs du Studio du
  10 novembre 2026). Réglage `sina.differe` (allumé), gardé le temps de comparer avec le direct pendant l'essai.
- **Le client peut parler à SINA pendant une création** (`loop.ts`). Avant, le fil était bloqué jusqu'à la fin de la
  tâche. Maintenant SINA répond, et profite de l'attente pour poser les questions de la suite (produits, prix,
  coordonnées, livraison), qu'elle note ; le résultat de la création arrive dans le fil dès qu'il est prêt.
- **Les équipes de noms cherchent en même temps** (elles ne se voient pas) : une attente au lieu de quatre.
- **SINA regarde ce qu'elle montre** : le logo et la grande scène de chaque planche, puis les images de la marque finie,
  sont joints à sa réflexion avant qu'elle en parle.
- **L'écran « Marque »** (`tab-marque.tsx`, `brand-sheet.ts`) est refait : un écran pour voir, télécharger et demander
  un changement à SINA, au tutoiement ; plus aucun bouton de création payante.
- **Les cartes de l'accueil** affichent « En création avec SINA » au lieu de « À démarrer » pour un projet en cours.

## Devis calculés par le Studio (tarifs prudents, en direct, avant le différé)

| | 2 identités | 3 identités | 4 identités |
|---|---|---|---|
| Avant le lot (sept images par planche) | 5,83 € | 7,92 € | 9,75 € |
| Après le lot (planches, puis marque finie) | 4,51 € | 5,49 € | 6,20 € |
| Plafond jamais dépassé | 9,50 € | 11,22 € | 12,93 € |

Repère : le dernier essai réel d'avant (trois identités, dix-huit images) avait coûté 5,25 € pour un devis de 7,92 €.
Le différé retire encore la moitié du prix des textes servis ainsi ; ce que cela donne vraiment sera mesuré à l'essai.

## Ce qui sera retiré à la fin, une fois l'essai réussi

L'ancienne création en un appel (`identities.ts`, branche « simple »), l'outil `brand.create` et les « 3 pistes de
logo », les trois logos libres et le logo redessiné (`logos.ts`, `tools/logo.ts`), l'illustratrice (`brand-art.ts`,
`brand-art-review.ts`), l'outil `brand.kit` appelé à la main, les anciens panneaux de logo de l'écran Marque
(`logo-v2-panel.tsx`, `full-logo-panel.tsx` et voisins), et leurs tests.

## Fautes trouvées en écrivant les tests, corrigées

- La charte prenait une image de publication pour « planche de marque » quand le logo était plus ancien que les images
  (logo gardé par le client, ou une seule image refaite).
- À la reprise d'une tâche, les versions détourées du logo étaient rangées deux fois (rien n'était repayé).
- Le devis comptait deux fois la direction artistique et la relecture des images (plafond gonflé d'environ 1 €).
- Avec l'ancienne création en un appel, une fin de marque était mise en file sans pouvoir aboutir : elle ne part plus.

## L'essai réel (15 et 16 novembre 2026)

Accord du propriétaire : « Oui », plafond de 25 €. **Dépensé : 30,77 €** ; le dépassement vient d'essais qu'il a
demandés (logos refaits plusieurs fois, maquettes refaites). SINA a travaillé seule ; Claude n'a joué que les clients.

Vu avec la vraie IA :
- la conversation pour connaître le client, les résumés, les cartes de prix, les noms, les planches ;
- le différé : environ 25 % moins cher et deux fois plus long (3,36 € en 15 minutes en direct, 2,53 € en 30 minutes) ;
- parler à SINA pendant une création ;
- une marque finie et validée pour un premier client, puis finie pour un second (identité choisie parmi quatre) :
  logo adopté, symbole et favicon tirés du logo, signes, publications, charte de 11 pages, écran « Marque ».

Ce que le propriétaire a décidé pendant l'essai, et qui est dans le code :
- **Logos.** OpenAI est libre du dessin : aucune direction imposée (« si tu donnes une direction artistique tout le
  monde aura le même résultat »). Il reçoit le métier, les couleurs, la typographie et la direction artistique de la
  marque. Dans une série, le premier logo est créé seul ; chacun des suivants reçoit ceux déjà faits avec « je veux un
  logo complètement différent de celui-là ». Sa réaction devant le résultat : « Voilà ».
- **Maquette du site.** Créée par OpenAI, sur un téléphone et dans le téléphone, belle, différente d'un client à
  l'autre, à l'identité de la planche ; inspirée (jamais recopiée) de son document « 50 accueils mobiles » : cahier
  `docs/sina-savoir/maquettes-accueil-mobile.md`. Un logo refait emporte sa maquette, comptée dans le prix annoncé.
  Sur une identité à fond sombre, la maquette reçoit le logo dans sa version claire.
- **Favicon.** Il reprend le logo (« un vrai favicon qui a une corrélation avec le logo ») : le symbole est tiré du
  logo adopté.
- **Publications.** Chacune se comprend seule par quelqu'un qui ne connaît pas la marque ; la première dit l'offre en
  clair ; chacune porte le logo en petit (« j'ai pas compris l'angle marketing des images »). Écrit et testé avec une
  IA simulée ; **pas encore vu avec la vraie IA**.
- **Relecture des images.** Un titre dessiné sur plusieurs lignes est reconnu ; une date à remplir faite de tirets
  aussi ; le logo d'une maquette est comparé à celui de la planche ; une maquette dont la première lecture a trouvé
  tous les textes n'est plus jetée quand la seconde ne répond pas.
- **Écran « Marque ».** Plus d'encadré des angles, plus de bulle posée sur la marque, logo vectoriel montré.
- **Sa consigne de travail** : « arrête de prendre des initiatives qui nous font perdre du temps et de l'argent ».
  Faire ce qu'il demande, avec ses mots ; une idée se dit en une phrase et attend son oui ; le plus petit essai avant
  toute dépense ; montrer les images tout de suite, y compris celles que SINA refuse.

Défauts connus, dits au propriétaire, pas corrigés :
- la relecture vérifie qu'un mot est dans l'image, pas qu'il est dans le bouton (une maquette gardée avec un bouton vide) ;
- la relecture refuse un logo dont le signe contient une initiale ;
- deux noms déjà pris dans le métier ont été montrés à un client ;
- la consigne du logo reçoit aussi le texte de l'ambiance photo ;
- le devis de fin de marque compte toujours le prix du symbole ; `PhoneSite` est du code mort.

Reste à faire pour finir le lot : une marque créée de zéro pour un nouveau client inventé avec toutes ces règles,
puis le retrait des anciennes façons.

## Vérifié, pas vérifié

- Vérifié le 16 novembre : la compilation sans erreur ; les tests de SINA, des logos et du différé (63 fichiers verts).
- Pas vérifié le 16 novembre : la suite complète des tests ; les règles des publications avec la vraie IA.
