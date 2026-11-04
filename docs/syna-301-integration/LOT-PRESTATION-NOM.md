# Renommage exact des prestations du profil — backend partiel

Base : stock #373 97a8a15820fca4f350845b7b8473d9f41650cdac. Aucun fichier graphique modifié.

## Contrat Claude

Réutilise le contrat `syna-service-profile-1`, les commandes confirm-service-profile/cancel-service-profile et le transport existants. Nouveau `field:'service-name'`, `serviceKey` native, diff avant/après. La branche `hours` reste inchangée. `choices:[{key,name}]` donne les prestations natives lors d’une clarification.

« Renomme cette prestation en « Bilan initial » » demande une désignation honnête ; le profil Activité n’a pas encore de cible A2 par prestation. Répondre « Renomme la prestation « Diagnostic » en « Bilan initial » » ou utiliser sa clé native entre guillemets. Aucun premier résultat en cas de doublons (noms ou clés), aucune identité empruntée aux services de réservation.

Moteur `saveServices` existant, contrôle CAS servicesVersion + empreinte entière du profil, transaction du tour, accord gratuit séparé, reçu relu et retry identique. Clé stable et alias natifs conservés pour les contenus déjà acquis. Prix/durée/description/autres prestations/coordonnées conservés. Aucun site, contenu acquis ou réservation réécrit ; aucun fournisseur.

Carte actuelle intitulée Horaires à adapter par Claude selon field, et choices à présenter ; transport accepte le nouveau reçu uniquement avec serviceKey non vide. Verrou commun existant à conserver. Recette compilée Encre/Plein et tactile indépendante à fournir. Ne pas déclarer le parcours complet avec le seul moteur.

## Preuves exécutées

7 nouveaux tests : exact avant/après+accord+relecture+alias ; clarification puis nom ; doublons résolus par clé ; concurrence manuelle ; no-op/entrée active/longueur/annulation/expiration ; retry identique+reçu invalide ; séparation réservation et propriétaire. 9 tests horaires acquis et56 confirmations :72/72. 20 tests connaissance/registre passent. Types propres. Réseau fournisseur interdit par garde lot9, fetch sentinelle jamais appelé, dépenses/jobs inchangés dans le test métier. Pas de suppression ni contournement de tests. CI du SHA livré à qualifier.

Limites : renommage uniquement, ni création/suppression/prix/description/bulk, ni nom de service réservable. Une cible A2 par prestation reste à raccorder côté UI/contrat si souhaitée ; les noms/clé explicitement donnés fournissent déjà un parcours sûr sans déduction silencieuse.
