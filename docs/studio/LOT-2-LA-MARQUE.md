# Lot 2 : la marque

Compte rendu du 15 novembre 2026. Accord du propriétaire pour construire : « Oui ». **L'essai réel n'est pas encore
fait** : son prix est annoncé juste avant, et rien de payant ne part sans son « oui ».

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

## Vérifié, pas vérifié

- Vérifié : la compilation sans erreur ; les tests de SINA, des logos et du différé (71 fichiers, 759 tests passés) ;
  la construction de l'application (avant les derniers changements d'écran).
- Pas encore vérifié : la suite complète après les dernières corrections (en cours), l'essai réel, les écrans en
  capture, le différé chez le vrai fournisseur (simulé dans les tests).
