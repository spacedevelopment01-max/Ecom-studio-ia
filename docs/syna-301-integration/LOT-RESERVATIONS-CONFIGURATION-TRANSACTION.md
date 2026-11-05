# Relire les règles natives dans la transaction de réservation

## Défaut démontré

Les trois moteurs lisaient la configuration avant d’acquérir leur verrou d’écriture SQLite. Une fermeture ou une baisse de capacité publiée à cet endroit n’était pas prise en compte par la réservation ou le déplacement qui suivait.

**Onze nouveaux tests échouent sur le parent** : création, déplacement client et déplacement professionnel sur salon/cabinet/restaurant, puis capacité restaurant et atelier collectif. Le moteur pouvait enregistrer une réservation sur un jour venant d’être fermé, un groupe de quatre après réduction à deux places, ou une deuxième inscription après réduction d’un atelier à une seule place déjà occupée.

Les tests imposent un ordonnancement déterministe : une véritable publication native est commitée juste avant l’entrée de la transaction de réservation. Seul cet ordonnancement est intercepté ; configurations, validateurs, jetons clients, comptes de places et écritures SQLite sont réels. Il ne s’agit pas d’un test aléatoire entre deux processus ni d’une simulation du résultat des moteurs.

## Correctif minimal

**Neuf lectures déplacées, aucune règle métier remplacée** : liveSalon, liveCabinet ou liveRestaurant sont désormais appelés à l’intérieur de la transaction, avant les vérifications et l’écriture. La configuration en vigueur est ainsi lue sous le même verrou que l’occupation et le rendez-vous courant.

Les contrôles de disponibilité, capacité, identité, jeton, statut, délai et doublon restent ceux des moteurs existants. Aucun créneau, forfait, mode, prix ou rendez-vous acquis n’est modifié automatiquement. La publication concurrente reste enregistrée ; l’opération incompatible est refusée sans déplacer ou créer de rendez-vous.

## Vérification

**11 nouveaux tests ; 55 cas distincts dans 4 fichiers et types verts.** Les onze cas sont rouges sur le parent, puis passent avec les suites natives acquises des trois moteurs. Les champs requis de la fixture d’inscription à l’atelier (modalité/date/heure) ont été complétés pour respecter CreateInput ; le cas a été revérifié et aucune erreur de type ignorée.

Les helpers natifs sont exécutés directement avec de vrais jetons clients et données fictives en SQLite isolée, sans notification. Chaque test vérifie la publication de la nouvelle version, le refus de l’opération et les rendez-vous exacts avant/après. L’horloge métier est contrôlée pour rester reproductible lors des futures CI. Aucun appel fournisseur, aucune dépense.

Logs locaux : `/tmp/parity301-booking-config-transaction-parent-red.log`, `...-final.log`, `...-workshop-final.log`, `...-types-final.log`. Garde réseau et fetch refusé. **Ce lot ne revendique pas une nouvelle recette HTTP ou navigateur** ; les suites acquises couvrent les autres contrats natifs.

## Intégration et limites

Parent #455, dont la tête est maintenant **2a51db4300769980243186c1719426b3ec314af6** : le code d’identités reste dans 0a538370, suivi d’un test à horloge métier fixe. Aucun nouveau drapeau, DTO ou composant.

Préalable à l’ajout/retrait d’intervenants et aux futures actions de réservation. Les lecteurs SYNA restent non contraignants : aucun créneau retenu ou garanti. Aucun projet client, activation, fournisseur réel, fusion ou déploiement dans cette mission.
