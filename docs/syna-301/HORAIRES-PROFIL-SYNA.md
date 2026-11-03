# Premier champ services raccordé : horaires du profil

Parent requis : PR #353 (CAS natif). Même fil, même table de reçus SYNA, même DAO du profil ; ni nouvel item Contenus, ni identifiant de prestation réservée.

Depuis Activité (`/produit` d’un projet services), commande exacte : `Remplace les horaires du profil d’activité par « Mardi 10–18 »`. La proposition affiche avant/après et le vrai compteur business_version lu sur le serveur. Aucun fournisseur, job, devis ou achat. Seule la confirmation explicite gratuite enregistre ; version et empreinte du profil complet sont revérifiées avant le DAO, puis relues avant le reçu persistant. L’ancien site, ses UUID/sections et les créneaux réservables restent identiques. Les prochaines créations utiliseront ce texte, aucune reconstruction n’est déclenchée.

Le transport garde la même confirmation en cas de réponse perdue, vérifie le reçu relu et refuse un reçu étranger/sans nouvelle version/non gratuit. Annulation, autre message ou nouvelle sélection invalident la proposition ; conflit natif/expiration oblige à reformuler. Le brouillon manuel Activité demeure épinglé à sa version pendant l’actualisation.

Drapeau indépendant `STUDIO_CONVERSATION_SERVICE_PROFILE=1`, uniquement recettes isolées ; aucun drapeau client activé. Les anciens projets A1 restent exclus de cette exception. Les autres champs (prestations, prix, coordonnées) et créneaux de réservation ne sont pas annoncés raccordés ; aucun statut global de parité modifié.

65 tests dans 4 suites PASS : nouveau parcours horaires (8 cas), CAS natif, contenus C21 et fichiers existants. Fournisseur/réseau interdits ; types/diff-check PASS. Réponse de confirmation volontairement perdue après commit : même requestId rejoué, une seule nouvelle version et reçu relu. Test de reçu négatif couvre les conditions financières et l’identité du projet. Recette Studio compilé et CI attendues au SHA exact ; ces tests ne valent pas preuve navigateur.
