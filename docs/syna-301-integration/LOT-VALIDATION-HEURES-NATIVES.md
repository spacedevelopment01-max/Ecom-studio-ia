# Horaires natifs : refuser une heure impossible avant enregistrement

Base : main6354f327, après lecture de la convergence#422 et des points de reprise. Environnement de session vérifié : connecté, commandes Node et Git opérationnelles ; aucune création d’environnement nécessaire. Aucun fournisseur configuré ni sollicité.

Quatre échecs reproduits par les vraies routes GET/PUT authentifiées : 09:90-18:00, 09:00-17:99, créneaux restaurant12:99 et99:00 étaient acceptés avec200 et enregistrés. Les formats ne vérifiaient que le nombre de chiffres ; pour les horaires, la comparaison numérique ne validait pas les minutes.

Correction minimale des deux expressions natives : heures00–23 et minutes00–59 ;24:00 admis uniquement comme fin de plage, jamais comme début de créneau. Les pauses, le jour fermé explicitement vide et les formats existants valides restent acceptés. Aucun autre champ, prix, abonnement, consentement, mode de réservation ou composant Claude modifié.

58tests sur5fichiers et types réussis, dont7nouveaux tests HTTP :4refus atomiques et3horaires valides (journée complète, pauses, fermeture). Régressions salon/cabinet/restaurant et rendez-vous acquis conservées. Journaux locaux /tmp/parity301-clock-red.log (4échecs/3succès), clock-green.log et clock-delivery.log, clock-types.log. ToutNode/test utilise scripts/lot9/network-guard.mjs ; zéro fournisseur réel et dépense.

Prérequis du raccordement conversationnel des horaires, pas une certification UI. La carte, l’accord, le résultat visible et la recette indépendante restent à qualifier avec Claude. CI sur le commit livré à observer. Aucun client réel, déploiement, activation ou fusion main.
