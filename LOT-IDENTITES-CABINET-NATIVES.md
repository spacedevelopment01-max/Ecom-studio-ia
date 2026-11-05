# Cabinet : refus des identités natives ambiguës

Parent : #483 / 0d4432ae16d0750ae61189af597258c45864c687. Lot strictement moteur partagé, sans composant graphique ni branche Claude.

## Défaut démontré

Le moteur conserve les définitions dont les identifiants bruts distincts se normalisent vers un même identifiant. `consult`/`CONSULT` ou `group`/`GROUP` suffisaient : les recherches natives choisissaient arbitrairement la première séance ou le premier atelier. Une inscription pouvait donc prendre un nom, prix, durée ou date différents de la définition visée ; les deux ateliers étaient annoncés ouverts. Six reproductions rouges sur le parent : deux recherches, deux créations, lecture des ateliers et disponibilité d'une séance.

## Correction

`seanceById` et `atelierById` renvoient une définition seulement si son identifiant correspond exactement une fois. `atelierStatus` considère invalide un identifiant répété dans la configuration. Pas de suppression de définition, renumérotation, migration ni écrasement de source. Les erreurs existantes `invalid`/400 restent utilisées ; aucun contrat d'action ni drapeau nouveau.

La reprise idempotente garde la réservation acquise et son prix, sans recréer de jeton. Son annulation native avec le jeton existant reste utilisable même si la source est devenue ambiguë. Les définitions uniques restent réservables.

## Vérifications exécutées

- Parent : six échecs attendus, quatre contrôles non sélectionnés. `/tmp/parity301-native-cabinet-identity-parent-red.log`.
- Correctif : **69 tests distincts, quatre fichiers, tous verts**, dont dix nouveaux : `/tmp/parity301-native-cabinet-identity-green.log`.
- Fichiers : `parity301-native-cabinet-unique-identities.test.ts`, `parenthese-booking.test.ts`, `parity301-cabinet-workshop-availability.test.ts`, `parity301-native-workshop-overlap.test.ts`.
- Types verts : `/tmp/parity301-native-cabinet-identity-types.log` ; `git diff --check` vert.
- Source, lignes acquises, jetons et compteurs financiers comparés avant/après refus ; aucun appel réseau autorisé, aucune dépense ni notification.

## Limites

Il s'agit de tests du vrai moteur et de SQLite isolée, pas d'une nouvelle recette Studio compilée. Le statut natif `invalid` doit être rendu comme non réservable dans la carte de Claude ; ne pas inventer de cible ni de migration automatique. CI complète sur le commit livré à suivre séparément. Aucun workflow ou contrôle obligatoire modifié. Cette correction ne termine pas SYNA ni les réglages date/heure/durée des ateliers.
