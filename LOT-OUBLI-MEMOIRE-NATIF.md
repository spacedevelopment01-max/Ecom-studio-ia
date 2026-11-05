# Oubli natif d’une entrée de mémoire, lié à son aperçu

Parent #486 / df2f5f3c3270ce3a63c167e80077b83caea44923. Aucun composant ou style Claude modifié.

L’API manuelle oublie déjà une entrée par ID et projet. `deleteProjectMemoryItem` extrait exactement cette suppression SQL ; la route DELETE la réutilise sans changement de contrat (artefacts protégés, ID absent sans effet). POST/remember et sa normalisation, déduplication et provenance restent inchangés.

Pour préparer un accord SYNA sûr, nouveau contrat natif :
- `forgettableProjectMemory(projectId)` : entrées actives visibles dans le panneau natif ; artefacts et faits internes exclus comme dans son affichage.
- `previewMemoryForget(projectId,itemId)` : item public + instantané `{schema:'native-memory-forget-1',projectId,itemId,fingerprint}` de TOUTES les colonnes réelles. Aucune écriture ou version.
- `applyMemoryForget(projectId,snapshot)` : relecture exacte sous transaction, suppression par le moteur natif commun et vérification de disparition. Cible modifiée/disparue/historique/interne ou instantané étranger : refus. Toute erreur après suppression restaure la ligne par la transaction.

Une mémoire voisine ajoutée ou modifiée n’est jamais écrasée et n’invalide pas cette cible indépendante. Les lignes historiques ne sont pas réactivées en oubliant leur remplaçante. Aucune propagation vers les créations existantes, aucun nouvel appel IA, aucune version de thème ni mutation de profil. L’oubli est irréversible dans ce contrat ; ne pas proposer une annulation fictive.

**18 nouveaux tests,29 cas distincts/deux fichiers et types verts.** Vrais moteur/SQLite/handlers/session isolés ; produits/services, aperçu lecture seule, état natif après oubli, lignes voisines/faits/artefacts/historique exacts, compteurs et projet/thème préservés, modification à timestamp égal et écriture réellement commise avant verrou, erreur après DELETE avec rollback, ID/projet étranger et API manuelle inchangée. Onze régressions `brain-memoire-coherence.test.ts` conservées. Logs `/tmp/parity301-native-memory-forget-{first,types}.log` ; diff vérifié.

Le nouveau contrat strict concerne l’oubli conversationnel futur ; l’API manuelle garde ses droits et comportements préexistants, notamment son filtre SQL kind!=artifact. Aucun durcissement rétroactif inventé pour les opérations manuelles.

Intention naturelle/carte/accord/résultat visible/recette Studio compilée restent le lot suivant. Ces tests natifs ne sont pas une recette navigateur. CI complète du commit livré à suivre séparément, quatrième contrôle obligatoire inchangé. Aucun fournisseur, dépense, données clientes, activation, fusion main ni déploiement.
