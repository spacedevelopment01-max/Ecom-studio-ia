# Interpréter correctement les fins d’horaires de 20 h à minuit

## Défaut démontré

Le test de borne du calendrier conversationnel a révélé une erreur native, commune aux moteurs salon et cabinet. Dans parseHours, l’alternative des heures à un chiffre était essayée avant 20–24 pour l’heure de fin. L’expression pouvait s’arrêter après le premier « 2 » : `18:00-24:00` était donc interprété comme une fin à 2 h et la plage disparaissait ; `00:00-24:00` devenait deux heures.

Les **12 nouveaux tests échouent sur le parent** : cinq fins valides (20, 21, 22, 23 et 24 h) sur les deux moteurs, puis deux véritables PUT authentifiés. Le texte enregistré était correct, mais le moteur ne proposait pas les créneaux du soir attendus.

## Correctif minimal

Deux lignes seulement, dans `atelier-nuance-core.js` et `parenthese-core.js` : essayer l’alternative 20–24 avant celle d’une heure à un chiffre. Le serveur et le site lisent ces mêmes moteurs.

Aucune modification de la grammaire historique des horaires, des validations du formulaire, des pas de réservation, des durées, du mode réel ou de la source enregistrée. Les plages du soir déjà enregistrées sont désormais correctement interprétées. Aucun rendez-vous acquis ni texte modifié.

## Vérification

**12 nouveaux tests ; 54 cas distincts dans 4 fichiers et types verts.** Sont contrôlés le calcul complet des créneaux jusqu’à minuit, un PUT natif en une version avec source exacte, la dernière plage complète à 23 h 30 pour un pas explicite de 30 minutes, les profils et dépenses inchangés, ainsi que les parcours natifs salon, cabinet et éditeur acquis.

Le premier passage après correctif avait 53 cas verts et une attente erronée dans la fixture : le cabinet utilisait son pas acquis de 60 minutes, donnant correctement 23 h. La fixture a été rendue explicite à 30 minutes ; les 12 nouveaux cas sont ensuite verts. Aucun paramètre de production modifié, aucun test supprimé. Les 42 régressions des trois autres fichiers étaient déjà vertes et restent inchangées.

Logs locaux : `/tmp/parity301-native-evening-hours-parent-red.log`, `...-final.log`, `...-fixture-final.log`, `...-types-final.log`. Fixtures strictement isolées, fetch refusé et garde réseau fournisseur. Pas de client, activation, notification, dépense, fusion ou déploiement.

Parent #450. Préalable moteur découvert pendant la lecture des disponibilités ; la carte et la recette navigateur de cette lecture restent ouvertes dans le lot suivant.
