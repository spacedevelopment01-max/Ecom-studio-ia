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
| La conversation (toutes les étapes) | Un seul appel fait tout : comprendre, décider, choisir parmi une centaine d'outils, répondre. Petit modèle partout, sauf à l'étape du thème. Aucune relecture de la réponse, seulement des filtres de code. | Une **aiguilleuse** qui comprend la demande et ne donne que les outils de l'étape ; un modèle plus fort aux moments qui comptent (présenter un résultat, annoncer un prix, répondre à un mécontentement) ; une **relectrice** de la réponse à ces moments-là. | À faire (lot 3) |
| 0. Questions de départ | Moteur sans IA, puis le petit modèle rédige. | Rien d'urgent. | Convenable |
| 1. Identités de marque | Chaîne de spécialistes : enquêtrice, stratège, 4 équipes de noms, **juge des noms**, composition, vérificateur, directrice artistique, directeur de création, illustratrice, **directrice artistique des images**, contrôleuse des images. | La relecture des dessins en image ; le logo de la planche choisie comme logo du projet. | Fait, deux finitions (lot 1) |
| 2. Logo | Dessinateur, contrôleur qui lit le nom, second dessinateur en relais, secours du Studio. | Reprendre le logo de la planche choisie au lieu d'en redessiner un. | Lot 1 |
| 3. Image de marque complète | Sans IA. | Rien. | Convenable |
| 4. Cinq angles marketing | Une recherche sur le web, puis **un seul appel** écrit les cinq angles et note lui-même ses sources. Aucune relecture. | Séparer : une **stratège** qui écrit les angles, un **juge des angles** (un concurrent pourrait-il signer cet angle ? l'émotion est-elle vraie ?), une vérification des faits cités. | À faire (lot 4) |
| 5. L'activité complète | Sans IA. | Rien. | Convenable |
| 6. Thème sur mesure | Conception : une conceptrice, puis un directeur commercial qui corrige. Montage : un plan des textes, **un appel par section qui écrit en même temps les textes, les liens et les descriptions de photos**, les photos, un contrôle par photo. **Aucune relecture des textes.** Une photo refusée est seulement signalée. | Un **directeur de création des textes** qui relit TOUT le site (émotion, accroches répétées, ordres donnés au lecteur, promesses non prouvées) et fait reprendre ce qui ne va pas ; une **directrice artistique des photos** séparée de la rédactrice ; une direction artistique globale partagée avec la planche. | À faire (lot 2) |
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
2. **Les textes et les photos du thème sur mesure** : directeur de création des textes, directrice artistique des photos.
3. **La conversation** : aiguilleuse, bon modèle au bon moment, relectrice aux moments qui comptent.
4. **Les cinq angles** : stratège, juge, vérification des faits.
5. **Publications et calendrier** (étapes 9 et 11).
6. **Publicités** (étape 10).
7. **Articles et rangement** (étapes 12 et 13).

Chaque lot : construit, testé avec une IA simulée, vérifié en entier, envoyé sur la branche de travail. Un essai réel
ne se fait qu'après le prix annoncé et l'accord écrit du propriétaire.
