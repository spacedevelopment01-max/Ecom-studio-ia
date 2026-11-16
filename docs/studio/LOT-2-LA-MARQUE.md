# Lot 2 : la marque

Compte rendu des 15 et 16 novembre 2026. Accord du propriétaire pour construire : « Oui ». **Lot fini le 16 novembre
2026** : SINA a créé seule, avec la vraie IA, la marque de trois clients inventés (un réparateur de vélos, une
maroquinière, une torréfactrice), de la première question à la marque finie. Les anciennes façons sont retirées. Fusion
demandée par le propriétaire (« Lance la fusion juste après »).

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

## Anciennes façons retirées le 16 novembre 2026

Il ne reste qu'une façon de créer une marque : la chaîne (`syna.brand`), le choix du client (`identity.choose`), puis la
fin de marque (`brand.finish`) et sa validation (`brand.kit_validate`).

**Retiré**

- **L'ancienne création en un appel** : la branche « simple » de `tools/identity.ts` et le réglage `sina.brand_method`,
  sa consigne, sa forme et son contrôle de série dans `identities.ts`.
- **L'outil `brand.create`** (marque et « 3 pistes de logo » d'un coup, `tools/commerce.ts`).
- **Les trois logos libres et le logo redessiné** : les outils `logo.propose` et `logo.choose` (`tools/logo.ts`,
  supprimé), la tâche de fond `syna.logos`, et dans `logos.ts` les trois directions, les consignes de dessin, les devis
  et la reprise du logo « à l'étape 2 ». Dans le fil, les cartes des logos à choisir.
- **L'illustratrice** : ses deux consignes (`brand-prompts.ts`), son appel et la pose de ses dessins dans la chaîne
  (`brand-chain.ts`), la relecture en image de ses dessins (`brand-art-review.ts`, supprimé).
- **L'outil `brand.kit` appelé à la main** : la charte est préparée par la fin de marque.
- **Les anciens panneaux de logo de l'écran Marque**, montés nulle part : `logo-v2-panel.tsx`, `full-logo-panel.tsx`,
  et leurs deux voisins qui ne servaient qu'à eux (`native-logo-consent.tsx`, `direction-cards.tsx`).
- **Le téléphone dessiné par le Studio** sur la planche (`PhoneSite` dans `brand-boards.tsx`), ses styles et son petit
  module `brand-site-preview.ts` : la maquette du site est une image créée par OpenAI.
- **Les tests qui ne portaient que sur ces façons** : `sina-logo-unique.test.ts`, `logo-v2-panel-state.test.ts`, et les
  parties concernées de `sina-etape1`, `sina-etape2`, `sina-dessins`, `sina-domaines`. Les autres ont été adaptés.

**Gardé, et pourquoi**

- **`logos.ts`, allégé** : `chosenRoute` (l'identité retenue, lue partout), `saveBoardLogo` (le logo de la planche
  devient le logo de la marque), `savePlancheLogo` (le nom dessiné, secours quand aucun logo n'est validé),
  `singleTerritory` et `freeLogoFacts` (la fiche sous laquelle le moteur de logos range ce logo ; elle est gardée à
  l'identique pour que ce qui est enregistré ne change pas).
- **`identities.ts`, allégé** : la forme d'une identité, les polices et leur caractère, les contrôles de palette et de
  couleurs refusées, la remise en forme tolérante : tout cela sert à la chaîne, aux planches et à l'écran.
- **`brand-art.ts`** : ce n'est pas l'illustratrice mais la liste blanche qui rend sûr un dessin en code. Elle sert
  encore à la forme des planches enregistrées, au nom dessiné (une lettre remplacée par un dessin) et à l'écran.
- **`buildBrandKit` et `brand.kit_validate`** : la charte et sa validation par le client.
- **Le nom dessiné** (`brand-wordmark.ts`) : le secours quand aucun logo ne passe la relecture.
- **Le moteur de logos** (`src/lib/logo-v2`), ses routes d'API et le moteur de marque d'origine (`brand.build`) : ils
  servent à d'autres parties du Studio. Leur sort se décide avec les lots suivants.
- **Laissé de côté par prudence**, à trancher plus tard : la carte `brand-propagation-card.tsx` (montée nulle part,
  mais ce n'est pas un panneau de logo), les anciennes cartes d'identité sans planche du fil (`IdentityCards`), les
  outils du parcours d'origine (`pilot.*`, dont « 3 pistes de logo »), et `referencesForPrompt` (les références du
  propriétaire en texte, qui ne servaient qu'à l'ancienne création).

## Fautes trouvées en écrivant les tests, corrigées

- La charte prenait une image de publication pour « planche de marque » quand le logo était plus ancien que les images
  (logo gardé par le client, ou une seule image refaite).
- À la reprise d'une tâche, les versions détourées du logo étaient rangées deux fois (rien n'était repayé).
- Le devis comptait deux fois la direction artistique et la relecture des images (plafond gonflé d'environ 1 €).
- Avec l'ancienne création en un appel, une fin de marque était mise en file sans pouvoir aboutir : elle ne part plus.

## L'essai réel (15 et 16 novembre 2026)

Accord du propriétaire : « Oui », plafond de 25 €. **Dépensé : 40,06 €** ; le dépassement vient d'essais qu'il a
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
- **Jamais une planche incomplète** (« on ne peut pas donner une identité de marque incomplète ») : une image refusée
  à la relecture est refaite avant d'être montrée, deux fois au plus, avec la raison du refus donnée à OpenAI ; à la
  seconde reprise la consigne est simplifiée ; un logo refait emporte ce qui le porte. Les reprises restent dans le
  plafond accepté par le client. SINA ne commande jamais un texte, une date ou un chiffre dans une image sans donner
  les mots exacts. Écrit et testé avec une IA simulée ; pas encore vu avec la vraie IA.
- **Logo sur fond sombre** (« sur fond sombre, le logo soit clair tout le temps ») : tout ce qui est foncé dans le
  logo passe en clair, même une couleur foncée de la marque ; vu avec la vraie IA sur une planche.
- **Clair d'abord, beau ensuite** (« ça fait plusieurs fois qu'il y a des textes comme ça, un peu difficiles à
  comprendre ») : règle placée au-dessus des autres pour tout texte lu par les clients de la marque. Un lecteur qui
  ne sait rien lit les phrases courtes de chaque planche (signature, titre et bouton du site, publications) sans rien
  connaître de la marque ; ce qu'il ne comprend pas du premier coup est repris avant les images. Écrit et testé avec
  une IA simulée ; pas encore vu avec la vraie IA.
- **Logo joint à une demande d'image** : toujours sur fond blanc plein. Le logo détouré faisait rendre à OpenAI des
  images aux bords troués ; vu corrigé avec la vraie IA.
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

Pas encore vu avec la vraie IA au moment de la fusion : la réécriture des phrases par SINA après les remarques du
lecteur qui ne sait rien (le lecteur lui-même a été essayé pour de vrai sur 60 phrases : 34 renvoyées, dont celles que
le propriétaire n'avait pas comprises), et la forme corrigée de la consigne d'image.

## Vérifié, pas vérifié

- Vérifié le 16 novembre : la compilation sans erreur ; les tests de SINA, des logos et du différé (63 fichiers verts).
- Pas vérifié le 16 novembre : la suite complète des tests ; les règles des publications avec la vraie IA.
