# CI : distinguer verrou de fiche et retrait du droit de lecture

La suite complète de #406/1a728077 a un échec démontré : job126639332100 du run41848828779, 5972 tests réussis, un échec et31exclusions préexistantes. Les tests ciblés initiaux de la convergence n’incluaient pas ce fichier ; l’échec a été reproduit localement :2succès/1échec.

Cause : l’assertion de tests/conversation301-prompts-ui.test.ts changeait seulement readOnlyReason en « Forfait fermé », tout en laissant localEditsWritable:true et la capacité de lecture active. Depuis le contrat préparé #396, le texte du verrou de fiche ne retire pas le droit natif privé de lire les métadonnées. Le composant Claude4780571b respecte cette distinction et la vraie recette de production #406 l’a vérifiée.

## Correction bornée

Aucun composant, moteur, permission, drapeau ou workflow ne change. L’ancienne assertion de retrait de droit indique maintenant aussi localEditsWritable:false. Ses refus de lien javascript et du GET après fermeture du drapeau restent obligatoires.

Deux tests HTTP réels s’ajoutent :
- GET d’un projet réellement préparé : fiche verrouillée, correctionFields vide, droit local actif, métadonnées privées littérales visibles, aucun corps, bouton, script ou image injectée ; Préparation, bibliothèque, baseline IA et dépenses inchangées.
- GET après retrait réel du forfait : localEditsWritable:false, capacité/DTO/carte absents, aucun lecteur natif appelé, bibliothèque et dépenses inchangées.

L’assertion globale d’absence de fetch s’applique désormais à tous les tests de ce fichier. Aucun test supprimé, exclusion ajoutée ou garde financier affaibli. Le quatrième contrôle obligatoire de confirmation gratuite et tous les autres jobs restent identiques.

## Vérifications et limites

56 tests ciblés sur quatre fichiers et types passent, dont les cinq tests de carte (trois existants, deux nouveaux),31 tests de bibliothèque,16 tests A1 etquatre permissions préparées. L’échec historique de #406 reste un échec ; les descendants qui l’ont hérité ne sont pas présentés verts. CI complète à observer sur le nouveau SHA du correctif. Les grandes recettes antérieures peuvent finir sans relance inutile.

Le build/recette A1 en cours garde son SHA #410/1c6ece6b : le correctif de test ne change pas le code produit mais n’autorise pas à réattribuer une preuve à un autre SHA. Aucun fournisseur réel, client, activation, publication, fusion main ou déploiement.
