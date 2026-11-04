# Coordonnées exactes du profil de services — contrat moteur

Base : d04a5aee7b633e3255dd43f4f5e1b8825775ddb7. Lot distinct des réservations et du compte.

Phrases : `Mets le téléphone du profil à « 01 23 45 67 89 »`, `Change l’e-mail du profil pour « contact@example.test »`, `Remplace la zone d’intervention du profil par « Lyon et alentours »`. Effacement explicite : `Efface le téléphone du profil`. Une valeur exacte, jamais de commande chaînée implicite.

Le transport existant serviceProfile et confirm-service-profile reste identique : schema syna-service-profile-1 ; field ajoute phone/email/area. diff.before/after sont les textes complets, sourceVersion, proposalId et accord gratuit séparé obligatoires. Le reçu vérifié conserve coût 0, providerCalls 0, financialConsent false, publication false et version +1. Utiliser le contrôleur existant, verrou partagé et invalidation des propositions périmées. Les questions imprécises portent field contact et ne constituent jamais un reçu.

Moteur : saveServices natif, version CAS et empreinte du profil entier. Validation des trois champs partagée avec le PATCH natif, mêmes limites et règle e-mail. Les autres champs, prestations, identités et alias restent conservés. Les coordonnées peuvent être lues par les parcours natifs ; aucun message, appel ou rendez-vous n’est créé par cette opération.

L’adresse n’est pas raccordée dans ce lot : son PATCH natif appelle aussi syncBookingAddress et touche le site de réservation. Lien/modes de contact, compte et créneaux restent des fonctions distinctes. Aucun contournement de leur contrat.

Preuves locales : 8 tests du lot réussis (vraies routes/PATCH et conversation, SQLite fictif ; égalité complète du profil, trois champs, effacement, validation, conflit concurrent, annulation/TTL/propriétaire/onglet, forfait Créer sans portefeuille IA, reprise idempotente). Les trois fichiers de régression exécutés avant la seule correction de fixture passent ; 20 tests knowledge passent ensuite ; types vérifiés. Les cartes et les recettes navigateur de ces trois champs doivent encore être intégrées par Claude : aucune qualification UI complète revendiquée.
