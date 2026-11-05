# Contrat natif d’annulation professionnelle exacte

## Périmètre

Les moteurs salon, cabinet (séance et atelier) et restaurant possèdent déjà l’annulation professionnelle utilisée par la route propriétaire Rendez-vous. Aucun défaut de leur règle métier n’est inventé et aucun de ces moteurs n’est modifié. Ce lot ajoute un contrat interne d’aperçu et d’exécution sûre autour de rendez-vous.proCancel : référence exacte, date facultative cohérente, calendrier unique actif, résumé sans coordonnées/notes/jetons, empreinte de toute la ligne acquise et de la source.

previewNativeBookingCancel ne modifie ni réservation ni schéma. cancelExactNativeBooking relit sous la transaction IMMEDIATE, refuse une source ou une ligne différente, délègue au moteur acquis puis vérifie le résultat réellement enregistré et tous les champs qui devaient rester inchangés. Une exécution ne modifie que status, canceled_at et updated_at. Un statut déjà annulé n’est pas réutilisé comme nouvel accord. Ni notification, remboursement, activation, version de site ni suppression d’historique.

Ce helper reste interne : l’adaptateur SYNA suivant devra contrôler propriétaire/forfait/projet services/onglet, garder A1 fermé, proposer le résumé exact, recueillir l’accord gratuit littéral et rendre atomiques annulation/reçu/reprise. Aucun nouvel endpoint public ni droit client ouvert ici. L’annulation de vrais projets clients reste interdite dans cette mission ; la matrice reste BLOQUÉE pour ce périmètre réel.

## Tests exécutés

**22 nouveaux tests, 22 cas distincts dans un fichier et types verts.** Trois moteurs : aperçu sans écriture, référence normalisée native, date/service/heure/party exacts, annulation native, occupation ou place réellement libérée, voisin et tous les autres champs/notes/identités conservés, source/profil/finances inchangés. Atelier réel fictif : une place est rendue, jetons et configuration acquis exacts. Aucune coordonnée, note ou lien secret dans le résumé.

Modifications concurrentes de date, note ou statut, source manuelle/mode/type, mauvaise date/référence/projet, erreur SQL et table absente : refus sans substitution ni annulation. Une véritable écriture manuelle est commitée juste avant l’acquisition du verrou par un ordonnancement déterministe (pas un test multiprocessus aléatoire) : la relecture la voit et refuse l’ancien aperçu. Numéro dupliqué dans une fixture de table volontairement corrompue et calendriers actifs multiples : aucun premier résultat choisi. Le schéma unique est restauré après ce test.

Échec du reçu externe simulé dans une transaction englobante : l’annulation revient en arrière et une tentative légitime réussit. Retour natif apparemment réussi avec UPDATE artificiellement non exécuté : la relecture refuse et rollback. Aucun nouveau reçu conversationnel ou parcours navigateur encore revendiqué.

Les 18 premiers cas et quatre compléments passent. Le test de table absente a été renforcé : le premier complément dépendait de l’ordre, car la table peut être absente lorsqu’on lance uniquement ce test. Fixture corrigée pour les deux conditions, cas isolé puis fichier complet de 22 cas revérifiés. Aucune protection assouplie et aucun test supprimé.

Logs locaux : `/tmp/parity301-native-booking-cancel-{first,boundaries,lazy-final,final,types-verified}.log`. SQLite, projets et réservations fictifs isolés, horloge fixe, fetch interdit et garde réseau. Parent #465/79fca4ce6825df07136ab5c1b7c230736d7c3ce6. Aucun appel fournisseur, dépense, client réel, activation, fusion ou déploiement ; CI du SHA livré à relever séparément.

## Suite

Raccordement naturel et carte Claude à livrer séparément. Domaines de réservation et matrice toujours incomplets ; une preuve de helper natif ne vaut pas parcours dans le Studio compilé. Aucun composant/style/branche Claude modifié.
