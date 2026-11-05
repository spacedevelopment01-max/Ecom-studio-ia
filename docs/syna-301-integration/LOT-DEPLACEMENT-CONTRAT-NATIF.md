# Aperçu natif de déplacement sans écriture, exécution liée à la même cible

## Moteurs partagés

Les trois moteurs partagent désormais leur préparation professionnelle entre leur écriture acquise et un aperçu readSnapshot : previewProMoveAppointment (salon/cabinet), previewProModifyReservation (restaurant). Les validateurs, erreurs, durée acquise (#468), affectation réelle (#469), modes, horaires, délais, capacités et occupation restent natifs. Les aperçus ne retournent que référence et cible horaire/intervenant/couverts, sans contacts ou jetons. Ils n’exécutent jamais un UPDATE suivi de rollback pour simuler une réussite.

booking-move.ts fournit bookingMoveInput strict et previewNativeBookingMove/moveExactNativeBooking. Référence native exacte, date réelle, heure HH:MM ; staff seulement salon, party entier seulement restaurant. Résumés avant/après sans coordonnées/notes/jetons, modalité acquise conservée, noOp explicite. Le lecteur commun de #466 est réutilisé par l’alias readExactNativeBookingSnapshot, sans changer l’annulation.

L’exécution relit source et ligne sous transaction IMMEDIATE, revalide la disponibilité, refuse une autre affectation que celle de l’aperçu, délègue au moteur puis vérifie le résultat et tous les autres champs. Prix, identités, statut confirmé, notes, tokens et voisins restent acquis. Annulation/atelier non déplaçable/mauvais champ/arrondi ou autre réservation ne sont pas substitués. Un reçu englobant peut annuler toute la transaction en cas d’échec. Aucun remboursement, notification, activation ou version de thème.

## Preuves exécutées

**27 nouveaux tests, 105 cas distincts dans sept fichiers et types verts.** Les 78 régressions des trois moteurs/API publiques, deux correctifs de déplacement et verrou passent après extraction des préparateurs. Les 26 premiers nouveaux cas, puis un contrôle additionnel au bord du verrou, passent sans défaut métier annoncé.

Trois moteurs : spy refusant tout UPDATE de réservation pendant l’aperçu, lignes/source/profil/finances exacts, cible identique au vrai déplacement, prix et autres champs conservés. Couverts et professionnel explicites, absence de substitution après changement d’affectation sans préférence, nouvelles occupations, date/note/statut ou configuration/mode acquis modifiés : refus avant un déplacement incohérent. Atelier refusé sans annulation ni nouvelle inscription. Date impossible, heure invalide, fraction, champ d’un autre domaine et permission injectée refusés. No-op sans UPDATE, rollback d’un reçu externe puis reprise, retour natif simulé sans UPDATE refusé par relecture.

Une véritable note manuelle est commitée juste avant le verrou par ordonnancement déterministe : la relecture constate la différence et garde la date initiale. Ce n’est pas un test multiprocessus aléatoire. Les tests utilisent SQLite, comptes/projets/réservations fictifs isolés, horloge fixe, fetch interdit et garde réseau ; aucun client réel, fournisseur ou dépense.

Logs locaux : `/tmp/parity301-native-move-preview-{regressions,first,lock-final,types-delivery}.log`. Parent #469/ceddd3fbbb55e3aa591a15fdf1f783532caa8f94. Aucun moteur parallèle, aucune règle de création ou de self-service changée par l’extraction ; les fonctions professionnelles acquises conservent leur API.

## Suite et limites

Contrat interne uniquement, aucun nouvel endpoint, droit A1, flag, carte ou parcours conversationnel/navigateur revendiqué. Le prochain lot doit ajouter intention naturelle, aperçu, accord gratuit littéral, reçu atomique et reprise sans doublon. Carte et recette Studio compilée indépendante à Claude, aucun composant/style/branche modifié. Déplacements réels de clients toujours BLOQUÉS dans cette mission, aucune activation, fusion ou mise en production ; CI du SHA livré à suivre séparément.
