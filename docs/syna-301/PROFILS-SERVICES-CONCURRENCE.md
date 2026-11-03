# Profils services : concurrence native avant raccord SYNA

Base #348 e2d8c8ed, branche indépendante. Trois défauts HTTP/SQLite reproduits rouges puis corrigés : aucun jeton au GET, formulaires concurrents s’écrasant, renommage perdant la clé native.

Le compteur persistant projects.business_version est dédié au business_json. Migration additive, JSON conservé, valeur initiale 0. Chaque écriture DAO incrémente ce compteur, même identique (ABA). PATCH exige la version lue, conserve les clés/alias et refuse les clés inconnues/dupliquées. Transaction complète : un conflit ne modifie ni nom, ni profil, ni adresse de réservation. Les analyses en arrière-plan passent leur version source au DAO ; les écritures internes synchrones sans snapshot incrémentent également le compteur.

Le formulaire Activité garde sa version avec le brouillon pendant les actualisations ; une reconstruction s’arrête si la sauvegarde échoue. Aucun changement graphique.

La réservation conserve son propre UUID de thème, distinct du compteur entier. Son PUT direct exige ifVersion dans une transaction, comme l’API Contenus existante. Le formulaire transmet cet UUID natif. L’adresse reste synchronisée et invalide le profil ouvert dans un autre écran. Aucune identité/version commune inventée.

Tests : parity301-services-profile-cas, contenus-api et prestations-editeur : 21 tests HTTP/SQLite, fixtures uniquement. Versions manquantes/périmées, ABA, atomicité, clés/alias, refus anonyme/intercomptes, indépendance des stores et rendez-vous existants conservés. Réseau/fournisseurs interdits ; aucun job ni appel IA pour ces changements. Vérification élargie : 155 tests dans 7 suites PASS, dont migration d’une base existante et ouverture simultanée par huit processus. La première exécution du test multiprocessus échouait dans le sandbox IPC ; la relance avec IPC local autorisé, garde réseau intact, passe. TypeScript/diff-check PASS ; CI au SHA publié rapportée séparément.

Limites : contrats natifs protégés, pas encore de raccord SYNA dans cette PR. L’analyse complète (produit/assets/notes) n’est pas rendue transactionnelle ici : seul l’écrasement du profil par snapshot périmé est refusé. Recette navigateur à qualifier sur convergence. Aucun RDV réel, coût réel, merge, publication ou déploiement.
