# Profil de services : demandes interrogatives exactes

Neuf reproductions échouaient avant correction : les demandes « Peux-tu modifier… ? » et « Pourrais-tu remplacer… ? » ne rejoignaient pas les intentions natives du profil. Le changement normalise seulement l’enveloppe interrogative, les huit verbes explicitement autorisés et la formule terminale « s’il te plaît ». Les valeurs citées, leur ponctuation et les suffixes métier ne sont pas supprimés.

Les moteurs, droits, versions, empreintes, TTL, confirmation gratuite et reçus restent identiques. Aucun montant réservable, créneau, paiement, site acquis ou identité du service réservable n’est modifié. Les commandes composées restent des clarifications gratuites sans proposition. Le champ et la prestation du profil doivent toujours être explicites ; aucun contexte ou premier résultat n’est deviné.

Exemples :
- Peux-tu modifier le prix de la prestation du profil « Diagnostic » à « 75 € » ?
- Pourrais-tu remplacer la durée de la prestation du profil « Diagnostic » par « 45 min », s’il te plaît ?
- Peux-tu renommer la prestation « Diagnostic » en « Diagnostic précis » ?
- Peux-tu modifier la description de la prestation du profil « Diagnostic » à « Faits fournis » ?
- Peux-tu mettre le téléphone du profil à « 01 23 45 67 89 » ?
- Pourrais-tu remplacer les horaires du profil par « Mardi 10–18 » ?

## Vérifications exécutées

9 cas rouges avant correction. 68 tests / 9 fichiers passent ensuite, couvrant les nouveaux parcours et les régressions de prix, durée, description, coordonnées, nom, horaires, libellés et concurrence native. Après renforcement des assertions, les 9 nouveaux cas passent à nouveau : proposition sans mutation, accord explicite, reçu natif, profil entier relu et comparé, autres champs/alias conservés, une seule révision, thème de réservation et dépenses inchangés. Types vérifiés. Fixtures SQLite isolées ; transport fournisseur interdit.

## Contrat Claude et limites

Aucun DTO, action, client de confirmation, drapeau ou composant ne change. Les phrases nouvelles produisent le même serviceProfile schema syna-service-profile-1 et utilisent confirm-service-profile avec confirmation:true. Réutiliser la carte et le verrou existants. Ce lot ne qualifie pas la recette navigateur compilée de ces formulations et n’ouvre pas les écritures A1. CI complète à observer sur le SHA livré. Aucun fournisseur réel, client, activation, publication, main ou déploiement.
