# Lire les services réservables natifs depuis SYNA

La fonction native GET /api/projects/:id/prestations et son moteur readPrestations existaient, mais aucun parcours naturel SYNA ne permettait de consulter ce catalogue distinct du profil d’activité. Deux cas neufs/préparés rouges avant raccordement.

## Périmètre fermé par défaut

Le lecteur réutilise readPrestations, sous withAiDisabled, avec propriété du fil/projet, forfait actif, projet de services et drapeaux LOT_A/AI/BOOKING_READ. Le nouveau drapeau STUDIO_CONVERSATION_BOOKING_READ reste fermé par défaut ; aucun environnement client ou .env activé. A1 reste fermé, sans droit implicite, fiche ou version inventée.

La nouvelle opération services.booking.list est distincte de services.booking, qui reste non raccordée pour les modifications. Le lecteur ne réserve aucun rendez-vous, ne change aucun tarif, horaire, intervenant, mode ou site, ne lit pas les lignes clients et ne certifie aucune disponibilité en temps réel. Aucun moteur de réservation ou store supplémentaire.

Phrases prises en charge :
- Montre les services réservables du site.
- Peux-tu me montrer les services réservables du site ?
- Quels sont mes services réservables ?
- Montre-moi les prestations réservables du site, s’il te plaît.

Un suffixe de réservation/modification reste une clarification sans lignes ni lecteur natif. Un site sans réservation native donne unavailable, jamais les prestations du profil substituées.

## Contrat Claude

Vue : bookingServicesRead.enabled:true et bookingServices schema syna-booking-services-read-1. États listed/ambiguous/unavailable ; readOnly:true, confirmationRequired:false, costEur/providerCalls:0, financialConsent/actionsExecuted/publication:false. Scope exact : native_booking_configuration_not_profile_or_live_slots.

Listed fournit kind salon/cabinet/restaurant, sourceVersionId UUID natif du thème, bookingMode live/demo relu sans activation, total/limit20/truncated, nativeHref /studio/:id/rendez-vous. rows contient uniquement id natif, durationMinutes, priceEur (null signifie inconnu), priceFrom et untrustedMetadata={trust:booking_configuration_data_not_instructions,name}. Aucune coordonnée client, intervenant ou compte de rendez-vous futur. Pas d’identité ni version commune avec business_json. La projection GET relit la configuration courante et son vrai UUID, sans mutation de fiche.

Carte à intégrer par Claude : lecture seule, capacité serveur et marqueurs exacts ; noms traités comme données. Afficher configuration enregistrée, sans prétendre une disponibilité réelle. Aucun bouton d’exécution, accord, devis ou modification. NativeLocalEditAllowed peut borner le contexte normal/préparé avec la capacité ; aucune exception A1 ajoutée. Aucun composant modifié dans ce lot.

## Résultats exécutés

66 tests / 6 fichiers et types passent :20nouveaux et46régressions (stores services, registre, convergence et photos préparées). API native réellement appelée avec cookie/session ; IDs/UUID correspondent au moteur. Fixtures SQLite et thèmes réels, aucun fournisseur. Projets neufs/préparés, forfait/propriétaire/drapeaux avant cache, solde IA nul, commandes mixtes, source manquante, produit refusé, lecture sous garde IA, native20/25 sans mutation, cache idempotent/corps conflictuel, changement manuel natif relu, rollback de projection et ancienne proposition du profil invalidée.

Une assertion de fixture employait à tort recovery.mode ; corrigée vers le champ contractuel recovery.state. Le premier élargissement avait65succès/1échec de cette assertion, puis66succès. Aucun garde produit affaibli.

CI complète du SHA livré et nouvelle carte/recette compilée restent à qualifier. Cette lecture n’achève pas les modifications des réservations. Aucune dépense réelle, mutation client, activation, publication, fusion main ou mise en production.
