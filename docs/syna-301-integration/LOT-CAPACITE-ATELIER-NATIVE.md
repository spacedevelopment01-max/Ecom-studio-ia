# Capacité d’un atelier natif exact

## Contrat

`workshopCapacityPatch:{id:"identifiant canonique natif",capacity:entier1..500}` strict et exclusif. Bornes effectives du moteur parenthese-core (0/null n’est pas une fermeture native et n’est pas accepté comme capacité). Calendrier cabinet natif unique ; atelier visible exact, identités brutes/canoniques et voisins acquis non ambigus, y compris voisins au titre vide. Normalisation native réutilisée, aucun slug ou identifiant inventé/persisté. Setting capacity number du bloc atelier selon sectionSchema/coerceSetting.

`GET prestations.workshops` : id/title/date/time/capacity, confirmedCount, remaining natif et identityAmbiguous. Comptes SQL des seules inscriptions kind atelier/status confirmed, y compris alias bruts acquis conservés de façon prudente. Le nombre de démonstration est ignoré. Absence exacte de table lazy =0 sans création de table ; autre erreur =refus, pas de capacité autorisée sans vérification.

Aperçu previewPrestations sans version ni écriture d’inscription. Sauvegarde via route PUT ifVersion/transaction natives ; nouvelle lecture sous verrou. Aucune capacité inférieure au nombre confirmé, aucune inscription supprimée/annulée/déplacée/renumérotée ou convertie. Source/date/heure/prix/notes/jetons/mode/voisins/profil inchangés, seul capacity ciblé modifié. Aucun message ou activation automatique. Le raccordement conversationnel devra lier aussi le nombre confirmé à l’aperçu pour afficher des places exactes avant accord.

## Preuves

**21 nouveaux tests,61 cas distincts dans trois fichiers et types verts.** Deux cibles parent rouges, puis14 nouveaux et40 régressions vertes ;7 cas supplémentaires dont deux fixtures initialement rejetées pour adresse participante réutilisée. Adresses fictives distinctes, protection doublon native intacte ;trois cas sensibles requalifiés (capacité égale/refus sur complet, hausse/inscription, concurrence). Aucun test ou garde supprimé.

Aperçu/PUT/GET propriétaire, capacité et vraies places natives relues, voisins/lignes/jetons/finances exacts ;borne1..500/type/fraction/champ/mélange/stale, mauvais moteur/cible/IDraw, collisioncanonique et titre vide refusés. Baisse sous confirmés refusée ;capacité égale =full et nouvelle inscription refusée ;hausse permet de vraies inscriptions fictives sans toucher le voisin. Erreur SQL failclosed, table lazy absente sans mutation, aliasraw acquis compté sans migration, bloc totalement vide n’invente pas d’identité.

Inscription réellement commise immédiatement avant le verrou PUT : compte frais3, baisse2 refusée, nouvelle inscription et source conservées. Ordonnancement intercepté seulement, moteurs/SQL/jetons réels ;pas un test de charge multiprocessus. Les40 régressions délai client et ateliers readonly restent vertes. Une relance intermédiaire a encore exécuté le parent car le script d’application s’était arrêté avant mutation (journal conservé), puis correction effectivement appliquée et requalifiée.

Logs /tmp/parity301-native-workshop-capacity-{parent-red,final,corrected,boundaries,participants-fixed,types-delivery}.log. Parent #477/790f995a3ef04356ca791fd730837922d272adee ;CI exacte du SHA livré à suivre. Aucun nouveau DTO/flag/carte SYNA encore dans ce lot, aucune recette navigateur prétendue. Aucun client réel, fournisseur/dépense, activation, fusion ou déploiement.
