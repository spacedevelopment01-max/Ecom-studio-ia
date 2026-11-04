# Déplacer un dossier natif — moteur et contrat

Le dossier source et sa destination sont explicites et uniques, par nom ou identifiant natif. Phrases testées : « Déplace le dossier Photos dans le dossier Archives », « Peux-tu déplacer le dossier « Photos » vers le dossier « Archives » ? », « Range le dossier Photos dans le dossier Archives ». « Déplace le dossier Photos à la racine » exige bien ce retour explicite ; aucun parent implicite.

Le moteur natif changeFolderMetadata modifie uniquement parent_id. Nom (y compris les espaces des anciens projets), ID, système, sous-dossiers, fichiers, versions et octets sont conservés. Homonymes/étrangers/commandes chaînées demandent une clarification. Les dossiers homonymes ne sont pas fusionnés. Descendants profonds et destination déjà cyclique sont refusés avant accord ; le correctif natif #399 reste obligatoire à la confirmation. Le snapshot de toute l’arborescence, forfait, propriétaire, onglet Fichiers, drapeau, révisions et TTL15min restent obligatoires. A1 n’acquiert aucun droit. Une opération native gratuite reste possible à solde IA nul.

## Contrat transmis à Claude

- Opération : folders.move, distincte de folders.create et folders.rename.
- Vue : localFolderMove, schema syna-folder-move-1, état ambiguous/proposed/applied. diff.before/after={id,name,parentId,system}, parentBefore/parentAfter={id,name} si non racine, proposalId, result, receiptId, nativeHref. Marqueurs : financialConsent:false, costEur:0, providerCalls:0, publication:false.
- Capacité : localFolderMoveExecution.enabled avec nativeLocalEditAllowed(view) et verrou busy partagé. Ne pas afficher cette action dans la carte Nouveau dossier ou la carte Renommage.
- Accord : confirm-folder-move, proposalId, confirmation:true, revision, projectRevision, requestId. Annulation : cancel-folder-move avec les révisions et le proposalId courant.
- Transport : createLocalFolderMoveConfirmation, hasLocalFolderMoveReceipt, LOCAL_FOLDER_MOVE_CHANGED_EVENT (studio:files-changed), fichier src/lib/local-folder-move-confirmation-client.ts. Stockage limité à l’identité de demande, clé conversation+projet. Réponse perdue : GET/reçu puis reprise du même accord, aucun nouveau POST automatique. Une nouvelle proposition écarte l’ancien pending.
- Afficher la source et les emplacements avant/après, l’accord gratuit, l’annulation, le résultat relu et le reçu. Racine = parentId:null. Identité/nom/type restent identiques ; seul le parent change.

## Résultats exécutés et limites

90 tests ciblés réussis sur7fichiers :29nouveaux déplacement et61régressions dossiers/atomicité/cycles/permissions. Types exit0. Vrais SQLite/fichiers, API authentifiée, CSRF et accord littéraltrue ; préparation acquise intégralement conservée, solde nul, A1 inchangé, cycles >64niveaux, déplacement profond valide et boucle héritée, homonymes/IDs, annulation/expiration/nouveautour, concurrence, réponse perdue sans secondPOST, ancienpending remplacé, reçus étrangers refusés, rollback natif du reçu ET des métadonnées puis réessai légitime. Fetch fournisseur interdit et dépenses inchangées.

Aucun composant Claude modifié. Carte et recette indépendante dans le Studio compilé, Encre/Plein ordinateur/toucher mobile,≥17s, encore requises. Aucune parité UI anticipée. CI complète du SHA livré à observer ; ne pas utiliser une ancienne CI comme verdict de cette livraison. Aucun fournisseur réel, projet client, activation, publication, main ou déploiement.
