# Annulation publique : configuration relue sous verrou

## Défaut démontré et correction minimale

Les annulations client salon/cabinet lisaient liveSalon/liveCabinet et le délai cancelHours avant leur transaction d’écriture. Le restaurant lisait liveRestaurant avant le verrou. Une publication du mode demo ou d’un délai devenu plus strict, commise entre cette lecture et le verrou, pouvait être ignorée ; une annulation était alors enregistrée contre la configuration courante.

Cinq cas rouges reproduits avec véritables thèmes/version, SQLite, réservations et jetons fictifs : salon/cabinet × nouveau délai72h/mode demo, plus restaurant mode demo. Seule l’ordonnancement au bord de tx est intercepté : la publication est réellement commise avant la transaction, et toutes lectures/règles/écritures/jetons restent natifs. Ce n’est pas un test de charge multiprocessus.

Correction : déplacer uniquement les trois lectures live* à l’intérieur de leur transaction existante. Trois lignes déplacées dans les trois moteurs. Aucun nouveau délai, droit, token, DTO, flag, composant ou règle métier. L’annulation professionnelle reste distincte et conserve ses droits. Aucun parcours client réel autorisé ni activé.

## Vérifications

**5 nouveaux tests et 82 cas distincts dans six fichiers, types verts** : nouveau mode/délai courant autoritaire, ligne de réservation inchangée après refus, nouvelle source conservée, finances sans changement ; 11 cas acquis de configuration sous verrou et22 du contrat d’annulation professionnelle. 44 régressions clientes natives des trois moteurs également vertes. Fetch et réseau fournisseur interdits.

Le premier passage de4 cas avait un contrôle cabinet déjà refusé par son délai par défaut ; fixture corrigée en fixant explicitement le délai acquis à0, puis les quatre cas deviennent rouges pour le comportement attendu. Le cinquième restaurant est également rouge avant correction. Aucun test/garde supprimé ou relâché.

Logs /tmp/parity301-native-cancel-lock-{parent-red,parent-red-explicit,restaurant-red,final,types}.log. Parent #471/123f21ea2bce4ed7df071128c5992dcf6aac8c5c. CI du commit livré à relever séparément. Aucun client réel, fournisseur, dépense, activation, fusion ou déploiement. Pas de nouvelle carte ou preuve navigateur requise par ce changement interne ; la recette indépendante des parcours SYNA correspondants reste ouverte.
