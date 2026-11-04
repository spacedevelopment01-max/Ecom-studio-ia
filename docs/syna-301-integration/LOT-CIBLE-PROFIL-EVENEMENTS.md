# Cible lisible du profil et exports d'événements

Demande Claude #369/commentaire6629774740. `serviceProfile` ajoute le champ optionnel **serviceName**, fourni par le serveur depuis la prestation native liée au serviceKey. Prix/durée/description :nom courant dans l'aperçu et le reçu. Renommage :ancien nom dans l'aperçu,nouveau nom effectivement relu dans le reçu. Une cible ambiguë n'expose aucun faux nom singulier. Le champ n'est jamais accepté comme autorisation dans la commande ;clé/version/empreinte restent les seules liaisons métier existantes.

Pour les cartes :afficher serviceName si présent, conserver la compatibilité des anciens reçus sans ce champ. Aucun composant ou style modifié ici. Six tests passent (cinq rouges avant) :trois champs,nom avant/après renommage,ambiguïté et modification manuelle concurrente refusée. Les29régressions prix/durée/description/nom passent ;types propres. Aucun changement de droits,de coût,d'alias natif ou de cible choisie.

Exports désormais explicites :`LOCAL_CALENDAR_CHANGED_EVENT` et `LOCAL_THEME_CHOICE_CHANGED_EVENT`. Les anciens `LOCAL_STOCK_CHANGED_EVENT` restent des alias rétrocompatibles ;les chaînes d'événement et la fréquence d'émission sont inchangées. Les hooks Claude existants continuent de compiler et fonctionner.

Base :convergence ce6f96a64ab38ab067a957cb88f0b679d5254cfc, vrai merge de la matrice/proof06c35ebf et de Claudeecfaa73d. Ses composants sont tous identiques à ceux de Claude ;11tests ciblés des cartes/projets préparés/union/verrou passent. La prochaine preuve compilée doit porter sur le nouveau descendant intégrant ce complément ;ne pas réattribuer les anciennes recettes a593 à ce SHA.
