# Horaires réservables hebdomadaires — contrat moteur pour Claude

Base main6354f327, prérequis #423/bb0f7b49. Le moteur de réservation est réutilisé : readPrestations, previewPrestations et savePrestations. Aucun profil d’activité, rendez-vous client ou mode de réservation n’est remplacé. Fuseau fourni par salonOf/cabinetOf, jamais le fuseau du serveur.

## Parcours et contrat

Drapeau STUDIO_CONVERSATION_BOOKING_HOURS fermé par défaut, sous LOT_A/AI/CONTEXT. Contexte Rendez-vous d’un projet de services, propriété et forfait obligatoires. Un jour hebdomadaire explicite, une ou plusieurs plages ordonnées sans chevauchement, ou fermeture explicite. Phrases exécutées :
- Change les horaires réservables du mardi de 9 h à 12 h et de 14 h à 18 h.
- Peux-tu modifier les créneaux de réservation du jeudi de 09:30 à 17:30 ?
- Mets les horaires de réservation du lundi à « 09:00-12:00, 14:00-18:00 ».
- Ferme les réservations le dimanche.
- Pourrais-tu ouvrir les réservations le mardi de 10h à 18h, s’il te plaît ?

Le nouvel aiguilleur utilise outsideQuotes(text) et un préfixe métier explicite. Une valeur citée de titre/bouton ne devient pas une commande de réservation ; une valeur horaire invalide reste une clarification gratuite, sans passer au stock ou au profil. Une date unique, plusieurs jours, une heure impossible ou une instruction chaînée ne crée aucune proposition.

Vue : bookingHoursExecution.enabled et bookingHours, schéma syna-booking-hours-1. États ambiguous/proposed/applied. Métadonnées :kind salon|cabinet,timezone,recurrence weekly,day mon…sun,dayLabel français,diff.before/after chaînes natives,sourceVersionId UUID,warnings,nativeHref exact. Une chaîne vide signifie fermé, à afficher comme « Fermé », pas comme une valeur inconnue. Pas de spec brut client.

Accord POST conversation : action confirm-booking-hours,proposalId,confirmation:true strict,revision,projectRevision,requestId. Annulation cancel-booking-hours avec proposition/révisions/requestId distinct. L’état proposed a confirmationRequired:true,financialConsent:false,costEur:0,providerCalls:0,publication:false. L’état applied donne receiptId=requestId,resultVersionId et la valeur effectivement relue ;une seule version restaurable.

UUID/empreinte complète du thème, valeur du jour, TTL15min, aperçu natif et consignes de vocabulaire sont revalidés avant écriture. Autres jours,prestations,équipe,profil et rendez-vous confirmés sont conservés. Les règles de prestations/intervenants continuent de limiter les créneaux effectifs : les plages d’ouverture ne sont pas une preuve de disponibilité en temps réel. Le restaurant reçoit une clarification honnête ;ses jours et créneaux midi/soir sont un lot distinct.

Les droits et drapeaux sont contrôlés avant cache. Même requestId et même corps =même reçu sans nouvelle écriture ;autre demande =nouvelle proposition et nouvel accord. Changement de contexte/désignation, photo jointe ou autre demande invalide la proposition. Un retrait du forfait masque la carte et interdit la reprise en écriture. A1 n’acquiert aucun nouveau droit.

## À intégrer et vérifier par Claude

Carte avant/après avec jour, caractère hebdomadaire et fuseau ; avertissements et « Fermé » explicite ; verrou partagé et contrôle des confirmations périmées. Le contrôleur doit reprendre le reçu par GET ou la même requête incertaine, et notifier studio:booking-changed pour que l’écran Rendez-vous se relise (son écouteur existe déjà). Validation de reçu :même conversation/projet,proposalId,receiptId=requestId,applied/actionsExecuted,0coût/appels,aucune publication,resultVersionId distinct de la source.

Ajouter handlesBookingHours dans les gardes du panneau, notamment pour ne jamais présenter le bouton de devis payant à la place de cette nouvelle carte. Ne pas ouvrir le drapeau pour un client ou une démonstration avant ce raccordement. L’annulation/confirmation utilise le mécanisme freeTurnSettled déjà commun.

Recette indépendante demandée :vraie phrase → bonne journée → aperçu → annulation puis nouvel accord≥17s → résultat dans la carte ET l’écran Rendez-vous → rechargement ;réponse perdue après commit puis GET/retry sans seconde version ;modification manuelle entre aperçu et accord→409 sans perte ;préparé/neuf et Encre/Plein ordinateur/tactile. Fournisseurs vides,routage réseau bloqué,données fictives etaucune activation.

## Preuves et périmètre exact

76tests/5fichiers verts, dont30nouveaux cas horaires :5phrases,moteurs salon/cabinet,fermeture/pauses,fuseau Montréal,refus/ambiguïtés/homonymies de domaine,cible exacte et autres champs,accord obligatoire,annulation/TTL/manuel,contexte retiré,droits avantcache,A1fermé,soldeIA nul,rollback,requêtes HTTP conversation POST/GET et lecture native. Le reçu GET et le retry HTTP ne créent qu’une version. Registre services.booking.hours borné,gratuit,fermé par défaut. Régressions natifs/routage de#422/prix-durée conservées ;types vérifiés. Régressions de connaissances Studio/photos préparées/CAS profil vérifiées séparément. Journaux /tmp/parity301-hours-{first,delivery,adjacent,types-final}.log.

Pas de carte ou recette navigateur nouvelle certifiée dans ce commit moteur ;la fonction reste PARTIELLE tant que l’intégration Claude et la recette du SHA commun manquent. Le registre ne déclare pas toute services.booking complète. Aucun test supprimé,coût inventé,fournisseur réel,donnée client,fusion main,déploiement ou activation.
