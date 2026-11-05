# Effectifs entiers et disponibilités du restaurant

## Défauts démontrés

Avant le raccordement des disponibilités à SYNA, l’audit du moteur partagé a reproduit trois erreurs :

- `slotsFor` renvoyait des créneaux pour des groupes hors minParty/maxParty, nuls, négatifs, fractionnaires ou NaN. Le véritable GET public reproduit le défaut pour quatre valeurs.
- `validate` utilisait parseInt, mais createReservation enregistrait le nombre d’origine. SQLite a ainsi réellement enregistré **2,5 et 4,5 personnes dans les fixtures**, alors que la limite de groupe et la capacité étaient de **4**. Le test de preuve contrôle les lignes enregistrées, pas seulement une fonction simulée.
- Un effectif numérique sous forme de chaîne était concaténé aux couverts occupés : `4 + "2"` devenait `"42"`, faisant apparaître complet un créneau de six places.

Les **14 nouveaux tests échouent sur le parent**. Le passage ciblé complémentaire montre explicitement les lignes party:2.5 et party:4.5 enregistrées avant correction.

## Correctif

Le fichier partagé `theme-base/assets/table-saison-core.js`, lu aussi par le serveur natif, normalise un nombre fini entier sans troncature. Les chaînes numériques entières déjà utilisées par les brouillons restent acceptées. Les disponibilités et la validation complète réutilisent la même normalisation et respectent les limites de groupe. Aucun créneau n’est proposé pour un groupe invalide.

La capacité reste vérifiée dans la transaction native. Aucun changement de formulaire, graphisme, schéma, jeton, notification, réservation acquise ou activation. Aucune migration ou réécriture des anciennes lignes : les nouveaux effectifs invalides sont refusés, sans arrondir les données historiques.

## Résultats et limites

**14 nouveaux tests ; 64 cas distincts dans 4 fichiers et types verts.** Nouveau fichier, réservations natives TABLE SAISON, retouche SYNA des limites de groupe et capacité. Vraies fixtures SQLite et véritable handler GET public, données fictives, fournisseurs interdits et fetch refusé. Les thèmes de test sont directement simulés comme déjà actifs dans la base isolée ; aucune activation d’un projet client, URL publique ou notification.

Logs locaux : `/tmp/parity301-restaurant-party-availability-parent-red.log`, `/tmp/parity301-restaurant-fractional-native-red.log`, `/tmp/parity301-restaurant-party-availability-final.log`, `/tmp/parity301-restaurant-party-availability-types.log`.

Ce lot est un préalable moteur. Il **n’ajoute pas encore la lecture conversationnelle des disponibilités** et ne revendique aucune nouvelle preuve navigateur. Parent #449 ; aucune dépense, fusion ou mise en production.
