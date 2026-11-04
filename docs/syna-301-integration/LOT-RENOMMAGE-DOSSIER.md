# Renommer un dossier natif — moteur et contrat

## Portée

Une opération native de plus, séparée de folders.create : **folders.rename**. Phrases vérifiées : « Renomme le dossier Photos en Photos clients », « Peux-tu renommer le dossier « Photos » en « Photos clients » ? », « Change le nom du dossier Photos en Photos clients ». Identifiant natif accepté comme source ; nom homonyme/absent/étranger, cible implicite et commande chaînée demandent une clarification. Nom1–120caractères, aucune troncature. Nouveau nom déjà occupé dans le même parent refusé.

Seul le nom change. ID,parent,system_key,created_at,sous-dossiers,fichiers,versions et octets sont conservés. Le moteur natif changeFolderMetadata est partagé avec PATCH /api/folders/[fid] ; sa requête complète est validée avant une seule écriture atomique, donc le correctif#386 reste acquis. Le snapshot de toute l’arborescence,propriétaire,ongletFichiers,forfait,drapeau,révisions etTTL15min sont obligatoires. A1 n’acquiert aucun droit. Un solde IA nul n’empêche pas cette opération gratuite.

## Contrat pour Claude

- Vue :localFolderRename (schema syna-folder-rename-1),état ambiguous/proposed/applied,diff.before/diff.after={id,name,parentId,system},proposalId,result,receiptId,nativeHref. financialConsent:false,costEur:0,providerCalls:0,publication:false.
- Capacité :localFolderRenameExecution.enabled ;utiliser nativeLocalEditAllowed(view),garder le verrou commun busy/interactions des cartes.
- Accord :action confirm-folder-rename,proposalId,confirmation:true,revision,projectRevision,requestId. Annulation :cancel-folder-rename avec mêmesrévisions/proposalId,sansconfirmation implicite.
- Transport :createLocalFolderRenameConfirmation dans src/lib/local-folder-rename-confirmation-client.ts. hasLocalFolderRenameReceipt valide identité exacte,noms,emplacement/type conservés et0effet financier. LOCAL_FOLDER_RENAME_CHANGED_EVENT vaut studio:files-changed.
- Le stockage ne conserve que l’identité de la demande,cléconversation+projet. Réessai légitime du même accord,GET derelecture,reprise aprèsréponseperdue ;nouvelle proposition écarte l’ancien pending. Réponse d’un autre projet/conversation ou arrivée aprèschangementdeprojet ne remplace pas la vue et ne déclenche pas le succès.
- **Ne pas réutiliser telle quelle la carte Nouveau dossier** :aucun dossier créé. Nouvelle carte de renommage/aperçu avant-après,accord,annulation,reçu et actualisationFichiers à intégrer parClaude. Aucun de ses composants n’est modifié ici. La recette navigateur compilée4modes≥17s de ce NOUVEAU domaine reste ouverte ;aucune paritéUI revendiquée.

## Preuves exécutées

57tests ciblés passent,5fichiers :28nouveaux moteur/API/transport +régressions création/dialogue/atomicité etpermissionspréparées. HTTP auth réel,cookies/CSRF/littéraltrue,SQLite/fichiers réels,sentinellefetch,dépenses inchangées,préparationacquiseintacte,homonymes/sourceID/conflits,annulation/TTL/nouveautour,reçu/reload/réponseperdue/ancientpending/projetswitch. Défaillance native simulée partriggerSQLite :transaction des métadonnées ET du reçu annulée,puis même demande légitime réussie aprèsretrait du trigger. Types exit0.

Premier essai :41verts/1rouge surune fixture dont «Montrelesdossiers» initialisait lesdossierssystème aprèsle relevé ;fixture corrigée avec initialisationnative avantbaseline,pas de relaxation d’invariant. 17métier puis23 avecHTTP/transport,puis51 et57 après nouveaux contrôles. Aucun test ni contrôle CI supprimé. CI complète du SHA livré à observer séparément.

Aucun fournisseur réel,client,main,activation,publication ou déploiement.
