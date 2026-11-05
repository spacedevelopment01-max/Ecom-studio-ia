# Restaurant : jours ouverts et créneaux récurrents depuis SYNA

Reprise du 5 novembre 2026 (Europe/Paris), base main6354f327/#422. Lot empilé après #423/#424/#425. Ce contrat backend reste PARTIEL jusqu’aux cartes et à la recette indépendante Claude. Aucune activation client, publication, réservation cliente ou dépense.

## Périmètre natif

Réutilise restaurantOf/config, readPrestations, previewPrestations et savePrestations avec restaurantPatch strict. Un seul champ change par accord : lunchSlots, dinnerSlots ou openDays. Le déjeuner/dîner s’applique à tous les jours ouverts ; pas de créneau propre à une date ou à mardi, pas de capacité ou disponibilité temps réel. Profil, capacités, autres repas, mode démo/live et réservations acquises conservés. Un service fermé peut être absent du tableau normalisé natif : lecture comme liste vide, sans réouverture implicite.

Phrases exécutées :
- Mets les créneaux de réservation du déjeuner à 12h15, 12h45 et 13h15.
- Peux-tu changer les créneaux réservables du dîner à « 19:15, 20:00 » ?
- Ferme les réservations du déjeuner.
- Ferme les réservations du restaurant le mardi.
- Ouvre les réservations du restaurant le dimanche.
- Change les jours de réservation du restaurant par « mardi, jeudi et samedi ».
- Ferme les réservations du restaurant tous les jours.

Aiguilleur sur outsideQuotes(text), avant l’aiguilleur des horaires salon/cabinet ; ce dernier peut rester fermé. Valeurs citées dans un titre/profil : aucune capture restaurant. Requêtes mélangées, horaires impossibles, doublons, ordre décroissant ou repas pour un seul jour : clarification gratuite, aucune écriture/devis.

## Contrat pour Claude

Drapeau serveur STUDIO_CONVERSATION_RESTAURANT_SETTINGS=1 sous LOT_A/AI/CONTEXT, fermé par défaut. Droits propriétaire + forfait actif + services + onglet rendez-vous + thème restaurant obligatoires ; A1 reste en lecture seule.

Vue restaurantSettingsExecution.enabled, carte restaurantSettings :
- schema syna-restaurant-settings-1 ; state ambiguous/proposed/applied ; projectId/nativeHref.
- field lunchSlots/dinnerSlots/openDays ; timezone natif.
- appliesTo recurring_configuration_not_live_availability.
- diff.before/after natifs exacts : créneaux HH:mm séparés par virgule/espace ; jours 0=dimanche à6=samedi séparés par virgules.
- display.before/after humains : jours français ; vide = Service fermé ou Tous les jours fermés selon champ.
- message/warnings ; confirmationRequired ; financialConsent:false ; costEur:0/providerCalls:0 ; publication:false.
- proposalId/sourceVersionId puis resultVersionId/receiptId=requestId/actionsExecuted:true.

POST confirm-restaurant-settings : confirmation:true littéral + proposition/révisions/requestId ; cancel-restaurant-settings séparé. Carte/verrou commun, aperçu périmé, contrôleur de reprise/reload à intégrer chez Claude ; ajouter le handle à toutes les gardes du panneau pour empêcher un devis. Après reçu, rafraîchir Rendez-vous par studio:booking-changed. Ne pas ouvrir le drapeau avant cette intégration. Pas de composant Claude modifié ici.

Empreinte thème entier/UUID/TTL15min, revalidation vocabulaire et aperçu natifs avant accord ; sauvegarde + reçu conversation atomiques. Conflit manuel, TTL, révocation des droits avant cache et contexte effacé refusés. GET après réponse perdue + rejeu exact ne créent qu’une version. Une autre action efface la proposition.

## Preuves exécutées

24 tests nouveaux verts : 7 phrases avec sauvegarde native exacte et retry ; 6 clarifications ; mots cités ; accord obligatoire/annulation ; conflit/TTL ; retrait drapeau/forfait avant cache ; compte étranger/mauvais onglet ; allocation IA épuisée ; rollback SQLite ; vrais handlers HTTP POST/GET + GET prestations ; réservation confirmée inchangée ; A1/drapeau fermé ; contexte effacé.

Ensemble ciblé : 69 tests uniques /4fichiers verts (65 initiaux puis24 restaurant avec4 ajouts), types tsc --noEmit verts. Fournisseur fetch interdit, garde réseau Node active, fixtures isolées ; aucun appel fournisseur. Logs locaux /tmp/parity301-restaurant-settings-{final,api,types-final}.log. La fermeture déjeuner a réellement échoué avant correction (2tests rouges), puis passé après lecture sûre du service normalisé absent.

CI à suivre sur le SHA publié. Aucun résultat navigateur revendiqué pour cette nouvelle carte : recette compilée attendue préparé/neuf, Encre/Plein ordinateur/tactile, accord après ≥17s, résultat visible dans Rendez-vous, annulation, conflit et perte de réponse. Les captures des anciens lots ne qualifient pas ce nouveau code.
