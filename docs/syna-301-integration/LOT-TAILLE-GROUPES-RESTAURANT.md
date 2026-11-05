# Taille des groupes réservables au restaurant

Parent #439 /6149e4a3a23b47e5416ab4f7ede64d71d93d82f7. Complète le contrat restaurant #426/#432 ; aucune interface graphique modifiée.

## Périmètre exact

Demande : `Change la taille des groupes du restaurant de 2 à 6 personnes`, `Peux-tu modifier la taille des groupes du restaurant de 2 à 6 personnes ?`, `Mets la taille des groupes du restaurant de 2 à 6 couverts`.

Même drapeau fermé `STUDIO_CONVERSATION_RESTAURANT_SETTINGS`, même carte `restaurantSettings`/schéma `syna-restaurant-settings-1`, actions `confirm-restaurant-settings` avec accord littéral /`cancel-restaurant-settings`. Nouveau `field:partySize`, `diff.before/after` natifs `min,max` (exemple `1,8`→`2,6`), `display` humain `De 2 à 6 personnes par groupe`. La carte doit présenter ces limites comme un couple, distinct de la capacité totale par créneau.

Natif : `restaurantPartyPatch:{minParty,maxParty}`. Deux entiers obligatoires1..50, minimum≤maximum, aucun autre champ, exclusif des autres patches/remplacement restaurant. Le patch ne remplace pas le bloc restaurant : il modifie uniquement `min_party`/`max_party`. Mêmes moteurs d'aperçu/enregistrement/prestations et calcul partagé `table-saison-core.js`. Autres horaires, capacité, fermetures, profil, mode, textes et champs acquis restent exacts. Aucune réservation déjà confirmée modifiée, même de taille désormais hors limites. Aucun état de disponibilité ou activation annoncé.

Cible restaurant services/onglet Rendez-vous obligatoire ; ni salon ni profil substitué. Homologues gardes acquis : version et empreinte complète, TTL, vocabulaire, droits, conflits, reçu atomique et reprise. Aiguilleur `outsideQuotes`. Pas de devis cognitif pour ce tour gratuit (garde de réservation #430 conservé). Demande incomplète, hors limites ou chaînée : clarification ; couple identique : aucune version.

## Preuves

- 19 échecs/20 cas avant raccordement (la valeur citée ne déclenchait déjà pas de route). Les champs natifs inconnus étaient ignorés ; aucune paire ciblée n'était disponible.
- **22 nouveaux tests ;87 tests distincts/5 fichiers et types verts**. Ensembles disjoints54/3 +33/2, ne pas additionner les exécutions de mise au point.
- Vrais PUT/GET natifs : valeurs invalides, incomplètes, champs supplémentaires, mélanges de scopes et salon refusés sans version ; bon patch ne change que deux champs.
- Demandes naturelles→avant/après sans écriture→accord→une version→relecture native→même reçu au rejeu. Zéro devis/appel/dépense.
- Vrai HTTP après17 secondes et GET projet/conversation : aperçu inchangé, annulation sans écriture, faux accord refusé, accord littéral, reçu natif et reprise identique.
- Réservation confirmée acquise de8couverts conservée après limites2..6. Le moteur partagé du site refuse les nouveaux groupes1/7/8 et accepte le domaine2/6 pour son contrôle de taille. Les autres contrôles natifs de disponibilité restent indépendants.
- Conflit manuel de capacité préservé, no-op sans version, valeurs citées hors route, modes voisins exacts.

Logs : `/tmp/parity301-restaurant-party-size-{red,delivery,acquired-regressions,types-delivery}.log`. Un premier test de conservation devait initialiser la table via `bookedCovers`, comme le parcours natif ; erreur de fixture corrigée, aucune garde applicative supprimée.

**Limite : carte/handle restaurant de Claude toujours à intégrer et qualifier en production compilée.** Les preuves navigateur de lecture/renommage #438 ne qualifient pas ce nouveau champ. Statut PARTIEL. Aucun client, fournisseur réel, déploiement, activation ou fusion main.
