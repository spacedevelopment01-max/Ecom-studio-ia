# Régler le délai client d’annulation et déplacement depuis SYNA

## Contrat pour Claude

Réutilise BOOKING_WINDOW fermé par défaut sous LOT_A/AI/CONTEXT, mêmes bookingWindow/Execution, schéma syna-booking-window-1 et confirm/cancel-booking-window. **Nouveau field cancelHours et diff.unit hours** : ne pas afficher cette valeur en minutes. Propriétaire/forfait/projet services/Rendez-vous, aucun droit A1 supplémentaire. Même confirmation gratuite true littéral, source/version/empreinte/TTL, aperçu natif, écriture + reçu atomiques, relecture et reprise sans doublon.

Phrases vérifiées : `Fixe le délai client d’annulation à 48 heures`, `Peux-tu modifier le délai client d’annulation et de déplacement à 24 heures ?`, `Les clients peuvent annuler ou déplacer jusqu’à 72 heures avant le rendez-vous`, `Je voudrais fixer le délai client d’annulation à 12 heures`. Une règle exacte, entier0..72h, aucun arrondi ou conversion implicite d’une valeur non supportée ; restaurant sans cette règle = clarification. OutsideQuotes pour l’aiguilleur ; une phrase citée ne déclenche pas d’action.

**Avertissement natif obligatoire dans l’aperçu** : cette règle régit les futures demandes d’annulation ET de déplacement en ligne des clients, y compris pour leurs rendez-vous déjà enregistrés. Aucun rendez-vous n’est annulé ou déplacé lors du réglage, les professionnels conservent leurs droits natifs ; pas de message automatique. 0 permet le libre-service jusqu’à l’heure du rendez-vous selon les règles natives. Diff heures avant/après, kind, nativeHref et warnings. Résultat appliqué, resultVersionId, receiptId et rafraîchissement Rendez-vous. Ne pas confondre ce réglage avec l’annulation professionnelle exacte #467 ou le déplacement #471.

Carte, handle anti-devis et recette Studio compilée Encre/Plein cadre ordinateur/tactile à Claude sur son SHA intégré ; aucun composant, style ou branche Claude modifié. Registre appointments.window annonce set-exact-native-client-cancel-hours ; la matrice conserve sa ligne et son périmètre partiel.

## Vérifications

**23 nouveaux tests, 86 cas distincts dans quatre fichiers et types verts.** 63 régressions horizon/délai minimal/cadence/anti-devis acquises vertes. Salon/cabinet neuf/préparé, quatre formulations, diff/warnings, source native exacte, profil/préparation/finances préservés, un thème/version au rejeu. Sur vraies réservations et jetons fictifs créés après aperçu : aucun champ modifié à l’accord, demande cliente réellement refusée selon48h. Bornes/champs/type/restaurant/commande combinée clarifiés sans devis. Citations inertes, conflit source, rollback du reçu, reprise ; ancien devis refusé même après abandon/flag fermé ; capability/forfait avant cache, contexte/abandon/expiration et A1 fermés.

Handlers HTTP authentifiés et SQLite isolés : attente monotone réelle ≥17 secondes, GET projet/fil, aperçu identique avant accord ; false/absent/chaîne true refusés ; accord, GET prestations relisant cancelHours48, puis rejeu du résultat avec un reçu et une seule version. **Preuve HTTP, pas recette navigateur compilée.** Fetch et réseau fournisseur interdits, aucun fournisseur réel.

Logs /tmp/parity301-client-cancel-window-{first,boundaries,regressions,types-delivery}.log. Parent #473/a22b369bfd4bb67415c2e812d69fe33fa978203c. CI exacte du SHA livré à relever. Aucun client réel, activation, dépense, fusion ou déploiement. Fuseau, ateliers, cartes et recettes manquantes restent ouverts ; aucune complétude déduite de ce lot.
