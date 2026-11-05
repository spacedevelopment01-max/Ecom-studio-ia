# Ajout et retrait ciblés de prestations réservables

## Périmètre

Le moteur natif de prestations accepte deux commandes supplémentaires, destinées au raccordement conversationnel suivant :

- `serviceAdd: { name, duration, price, short?, category?, priceFrom?, modes? }` : ajoute une prestation salon ou une séance cabinet ; aucun identifiant fourni n’est accepté.
- `serviceRemove: { id }` : retire exactement une prestation native, à condition qu’elle soit unique et n’ait aucun rendez-vous confirmé du jour local ou ultérieur.

Chaque commande est exclusive de tout autre réglage. Le PUT existant conserve ses contrôles de propriétaire, forfait, version et transaction. Aucun endpoint ni drapeau supplémentaire.

L’ajout utilise les identifiants natifs déterministes existants et réserve les identités acquises, y compris hors de l’ordre explicite. Il ne remplace jamais un bloc dont la clé existe. Il respecte la limite native de 60 prestations. Le retrait supprime uniquement le bloc exact et son entrée d’ordre éventuelle. Les blocs voisins, leurs valeurs vides, champs inconnus, paramètres, ordre et identités restent exacts. Un ordre implicite reste implicite. Les autres textes liés au service retiré ne sont pas supprimés automatiquement.

Les restaurations de version continuent d’utiliser le moteur natif. Les rendez-vous historiques ou annulés ne sont jamais réécrits. Restaurant, identifiant absent/ambigu, corps mal formé ou commande mélangée sont refusés. Le remplacement complet acquis et les retouches ciblées existantes restent disponibles.

## Défaut de protection démontré et corrigé

Le compteur natif avalait toutes les erreurs SQL et renvoyait zéro. Un test renomme temporairement une colonne de la table native isolée : malgré un vrai rendez-vous futur, la suppression répondait 200. Le problème est reproduit sur salon et cabinet.

Une table réellement non initialisée signifie encore « aucune réservation ». Toute autre erreur de lecture refuse maintenant l’opération avec **409 booking_records_unavailable**, sans version ni modification du planning. Le fuseau du widget et la règle conservatrice du jour entier viennent de #447.

## Résultats

**23 nouveaux tests ; 76 cas dans 5 fichiers passent.** Le premier passage sur le parent avait 17 échecs démontrant les commandes absentes ; les deux tests supplémentaires de panne SQLite ont ensuite reproduit le refus manquant sur le nouveau contrat, avant correction.

Les handlers HTTP authentifiés, l’aperçu natif, les sessions et SQLite sont réellement exécutés en processus avec données fictives. Aperçu sans écriture, source après enregistrement identique à l’aperçu, une version, refus de reprise périmée, collisions de clés/identités, limite native, ordre implicite, rendez-vous confirmés/historiques et conservation du profil sont contrôlés. Aucun appel fournisseur ; garde réseau obligatoire et fetch refusé.

Logs locaux : `/tmp/parity301-booking-service-create-remove-parent-red.log`, `/tmp/parity301-booking-service-count-failure-red.log`, `/tmp/parity301-booking-service-create-remove-final.log` et `/tmp/parity301-booking-service-create-remove-types.log`. Les types passent (`tsc --noEmit --incremental false`).

## Limites

**Pas encore de phrase, carte, accord ou reçu SYNA pour ces nouvelles commandes.** Ce lot est uniquement le contrat natif nécessaire pour les raccorder sans reconstruire les prestations voisines. Il ne qualifie pas de parcours Studio compilé ni de disponibilité en temps réel. Aucun travail graphique Claude modifié, aucune dépense, activation, fusion ou mise en production.
