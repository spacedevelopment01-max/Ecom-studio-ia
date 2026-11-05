# Protéger les prestations selon le jour du widget

## Défaut démontré

L’éditeur natif comptait les rendez-vous confirmés à venir à partir du jour UTC. Les moteurs salon et cabinet stockent pourtant les dates dans le fuseau du widget.

- À `2026-11-06T01:00Z`, un rendez-vous du 5 novembre à 23 h à Los Angeles était ignoré. La suppression native de sa prestation répondait **200**, alors qu’elle doit répondre **409 service_has_bookings**.
- À `2026-11-05T23:00Z`, un rendez-vous du 5 novembre à Tokyo était déjà passé. Il empêchait encore la suppression (**409** au lieu de **200**).

Les deux défauts ont été reproduits sur salon et cabinet par les véritables handlers GET/PUT authentifiés, avec Session et SQLite isolées. Les quatre parcours échouent sur le parent. Deux cas supplémentaires de changement d’heure échouaient aussi sur le compteur natif.

## Correctif minimal

`futureBookings` reçoit le fuseau de la section déjà lue. Il appelle le `nowIn` du moteur natif correspondant avec l’instant explicite. Les valeurs absentes/vides ou entourées d’espaces suivent la normalisation native (Europe/Paris par défaut) ; le repli d’un fuseau invalide reste celui du moteur natif (UTC).

La politique existante demeure : tous les rendez-vous **confirmés du jour local ou d’un jour ultérieur** empêchent la suppression. Aucun assouplissement à la minute. Les rendez-vous passés ou annulés ne sont ni réécrits ni supprimés. Le verrou de version, les droits, la transaction et les autres paramètres restent inchangés.

## Vérification

- **14 nouveaux tests**, dont frontières UTC dans les deux directions, fuseau normal/absent/avec espaces/invalide et changement d’heure à Los Angeles, sur les deux moteurs.
- **34 tests dans 3 fichiers passent** : nouveau fichier, retouche native de prestation et éditeur natif acquis. Fournisseurs interdits par garde réseau et fetch refusé.
- Vérification des types verte (`tsc --noEmit --incremental false`).
- Les refus conservent la version et les rendez-vous exacts. Une suppression autorisée crée une seule version et conserve les rendez-vous historiques/annulés. Aucun nouvel appel IA, job, usage ou écriture de dépenses.

Preuves locales : `/tmp/parity301-booking-service-local-day-parent-red.log` (6 rouges), `...-native-red.log` (4 réponses HTTP incorrectes), `...-final.log` (34 verts) et `...-types.log`.

## Limites et intégration

Correctif moteur natif seulement, parent #446. Aucun nouveau drapeau, DTO, route ou composant. La suppression de prestation depuis une phrase SYNA reste une lacune de la matrice : ce lot ne prétend pas la raccorder ni la qualifier dans le navigateur. Aucune dépense, activation, fusion ou mise en production.
