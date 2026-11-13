# Les spécialistes de SINA : la carte

Demande du propriétaire du 13 novembre 2026 : « je veux que tu fasses tous les sous agents nécessaires pour le
fonctionnement parfait de SINA, ne néglige rien et fais comme tu considères le mieux pour cela ».

Ce document dit, étape par étape, **qui fait le travail aujourd'hui** (relevé dans le code le 13 novembre 2026) et
**quels spécialistes il faut encore construire**. Il se met à jour à chaque lot fini.

## Le principe (celui qui a marché pour la marque)

1. **Celui qui fait n'est jamais celui qui juge.** Un spécialiste crée, un autre dit oui ou non. (Essai réel : tant que
   la même spécialiste composait les propositions et jugeait ses noms, « Tintamarre » et « Morceaux Choisis » passaient.)
2. **Le juge voit tout, pas un extrait.** (Essai réel : le juge ne voyait que 7 noms sur 178.)
3. **Rien n'est montré sans avoir été relu.** Un travail refusé n'est pas montré ; si quelque chose est montré faute de
   mieux, le doute est dit franchement au client.
4. **Un devis avant, un plafond pendant.** Un appel qui échoue n'est jamais relancé seul.
5. **Le client n'entend que SINA.** Les spécialistes restent en coulisses.
6. **Les retours du propriétaire deviennent la mesure** des juges (ses mots, ses notes), jamais une interprétation
   présentée comme la sienne.

## Étape par étape

| Étape | Qui fait le travail aujourd'hui | Ce qui manque | État |
|---|---|---|---|
| La conversation (toutes les étapes) | Un seul appel comprend, décide, choisit ses outils et répond. Trois aides l'entourent, **construites mais éteintes** (réglage `sina.conversation`) : l'**aiguilleuse**, sans IA, n'envoie que la notice des outils de l'étape et une ligne par autre outil (la notice envoyée à chaque message tombe à 18–53 % de sa taille selon l'étape) ; aux **moments qui comptent** (résultat à présenter, échec à expliquer, client mécontent) un modèle plus fort répond ; une **relectrice** lit alors la réponse avant qu'elle parte et la fait réécrire une fois si elle la refuse. | La décision du propriétaire pour les allumer (le modèle plus fort et la relecture coûtent un peu plus par message) et un essai réel. | **Construit, éteint** (lot 3, 13 novembre) |
| 0. Questions de départ | Moteur sans IA, puis le petit modèle rédige. | Rien d'urgent. | Convenable |
| 1. Identités de marque | Chaîne de spécialistes : enquêtrice, stratège, 4 équipes de noms, **juge des noms**, composition, vérificateur, directrice artistique, directeur de création, illustratrice, **relectrice des dessins en image**, **directrice artistique des images**, contrôleuse des images. | Un essai réel de la planche complète (logo et images), en attente de l'accord du propriétaire. | **Fait** (lot 1, 13 novembre) |
| 2. Logo | Le logo de la planche choisie est repris sans rien repayer ; sinon : dessinateur, contrôleur qui lit le nom, second dessinateur en relais, secours du Studio. | Rien d'urgent. | **Fait** (lot 1, 13 novembre) |
| 3. Image de marque complète | Sans IA. | Rien. | Convenable |
| 4. Cinq angles marketing | Une recherche sur le web, puis une **stratège** écrit les cinq angles ; le Studio contrôle sans IA (sources lues, citations exactes, promesses) ; un **juge des angles** séparé dit « garde » ou « reprendre » pour chacun (un concurrent pourrait-il le signer ? l'émotion vient-elle d'une parole de client ? la personne est-elle précise ?) ; les angles refusés sont réécrits une fois et repassent les contrôles ; un angle refusé qui reste est montré avec le doute de SINA. | Un essai réel. | **Fait** (lot 4, 13 novembre) |
| 5. L'activité complète | Sans IA. | Rien. | Convenable |
| 6. Thème sur mesure | Conception : une conceptrice, puis un directeur commercial qui corrige. Montage : un plan des textes, un appel par section qui écrit les textes, les liens et les descriptions de photos ; puis un **directeur de création des textes** relit TOUT le site et fait reprendre les sections refusées (6 au plus, le reste est dit) ; une **directrice artistique des photos** relit TOUTES les photos prévues AVANT qu'une seule soit payée et fait redécrire celles qu'elle refuse (5 sections au plus) ; chaque photo créée est ensuite contrôlée en image. La direction artistique de la planche choisie est reprise par les photos du site. | Un essai réel sur un vrai projet. Une photo ratée au contrôle reste seulement signalée (décision du propriétaire : refaite avec l'accord du client). | **Fait** (lot 2, 13 novembre) |
| 7. Site codé (anciennes maquettes) | Analyse, écriture, comparaison en image, correction. | Rien (voie ancienne). | Convenable |
| 8. Thème du Studio adapté | Rédacteur et directeur de création (jusqu'à trois tours) ; images créées puis relues. | Rien d'urgent. | Convenable |
| 9. Publications | **Pas construite.** Des outils généraux existent, hors parcours. | Une stratège des contenus, une rédactrice, une directrice artistique, un juge, puis le calendrier. | À faire (lot 5) |
| 10. Publicités | **Pas construite.** | Une stratège publicitaire, une rédactrice, des visuels, un juge, un contrôle des promesses. | À faire (lot 6) |
| 11. Calendrier de publication | **Pas construite.** L'outil de calendrier existe, sans IA. | Brancher l'étape sur l'outil ; une planificatrice. | À faire (lot 5) |
| 12. Articles de blog | **Pas construite.** | Une rédactrice en chef (sujets), une rédactrice, un relecteur (faits, référencement). | À faire (lot 7) |
| 13. Rangement des fichiers | **Pas construite.** | Une rangeuse, sans IA si possible. | À faire (lot 7) |

## Ce qui vaut pour toutes les étapes (à construire une fois, à brancher partout)

- **Le gardien des faits** : aucun chiffre, avis, délai, garantie ou certification absent de la fiche du client. (Existe
  pour la planche de marque : `unprovenClaims` ; à généraliser aux textes du site et aux contenus.)
- **Le gardien du vocabulaire du client** : ce qu'il a corrigé une fois vaut partout (`client-wording.ts`).
- **La direction artistique du projet** : une seule, écrite une fois, relue par tout ce qui crée une image (planche,
  site, publications, publicités).
- **Le dossier du projet** : une seule mémoire que chaque spécialiste lit, au lieu de redemander ou de réinventer.

## Les lots, dans l'ordre

1. **Finir la marque** : le logo de la planche choisie devient le logo du projet ; la relecture des dessins en image.
   **Fait le 13 novembre 2026**, testé avec une IA simulée (`logos.ts` : `boardLogoReady`, `saveBoardLogo` ;
   `brand-art-review.ts` : `reviewBoardArt`). Pas encore essayé pour de vrai.
2. **Les textes et les photos du thème sur mesure** : directeur de création des textes, directrice artistique des photos.
   **Fait le 13 novembre 2026**, testé avec une IA simulée (`custom-theme/brand.ts` : `COPY_REVIEW_SYSTEM`, étapes
   `text-review` et `text-fix:<section>` ; `PHOTO_REVIEW_SYSTEM`, étapes `photo-review` et `photo-fix:<section>` ;
   `boardLook` pour la direction artistique partagée avec la planche ; devis de `custom.build` augmenté d'autant). Les
   relectures sont dans le compte rendu du montage (`relecture`, `relecturePhotos`) et SINA les dit au client. Pas
   encore essayé pour de vrai.
3. **La conversation** : aiguilleuse, bon modèle au bon moment, relectrice aux moments qui comptent.
   **Construit le 13 novembre 2026, éteint par défaut**, testé avec une IA simulée (`conversation.ts`, `tools/open.ts`,
   `loop.ts` : `reviewedReply`). Réglage `sina.conversation` : `{"aiguillage": true, "momentsForts": true,
   "relecture": true}`, chaque aide s'allume à part. Rien ne change tant que le propriétaire ne l'a pas décidé : le
   modèle plus fort et la relecture ajoutent un coût à certains messages, sans carte d'accord.
4. **Les cinq angles** : stratège, juge, vérification des faits.
   **Fait le 13 novembre 2026**, testé avec une IA simulée (`preparation/angles-judge.ts` : `judgeAngles`, branché
   dans la recherche réelle ; avis gardé avec la recherche, `judgement`). Le juge et la réécriture tiennent dans le
   plafond déjà annoncé pour la recherche ; un juge en panne ne bloque jamais l'étape, et c'est dit. Pas encore essayé
   pour de vrai.
5. **Publications et calendrier** (étapes 9 et 11).
6. **Publicités** (étape 10).
7. **Articles et rangement** (étapes 12 et 13).

Chaque lot : construit, testé avec une IA simulée, vérifié en entier, envoyé sur la branche de travail. Un essai réel
ne se fait qu'après le prix annoncé et l'accord écrit du propriétaire.
