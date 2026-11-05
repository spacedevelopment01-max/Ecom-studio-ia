# Mise à la corbeille d'un fichier depuis SYNA

Parent fonctionnel : #438 /69b1756f7e6d7c7f10c7d9b8d5540a264315dc55. Dépend de la primitive atomique native #437 /a0f5ccdf6c4ec426ca581800e6791f29f6689eea. Aucun composant de Claude modifié.

## Contrat exploitable

Drapeau `STUDIO_CONVERSATION_FILE_TRASH=1`, fermé par défaut, sous FILES/LOT_A/AI/CONTEXT. Vue `localFileTrashExecution.enabled` et carte `localFileTrash`, schéma `syna-file-trash-1` :

- `state: ambiguous|proposed|applied`, `projectId`, `nativeHref`, `message` ;
- `destructive:true`, `reversible:true`, `financialConsent:false`, `costEur:0`, `providerCalls:0`, `publication:false` ;
- proposition : `proposalId`, `asset:{id,name,version,folderId}`, `diff.before:{deletedAt:null,folderId}`, `diff.after:{inTrash:true,folderId}`, `usageCount`, `warnings`, `confirmationRequired:true` ;
- résultat serveur : `result:{id,version,deletedAt,folderId}`, `receiptId`, `actionsExecuted:true`.

Actions strictes : `confirm-file-trash` avec `confirmation:true` littéral, ou `cancel-file-trash`, `proposalId`, révisions et requestId. Réessayer une réponse perdue avec le MÊME corps et requestId, ou relire le reçu par GET. Aucun accord financier ni devis.

Phrases : `Mets le fichier « nom ou ID exact » à la corbeille`, `Supprime le fichier « … »`, `Peux-tu mettre… ?`, `Je voudrais supprimer…`. `Supprime ce fichier` nécessite une sélection native de version précise, épinglée et recontrôlée. Homonymes, cible étrangère/absente/invisible, commande chaînée : précision sans exécution. Aiguilleur `outsideQuotes` et priorité de la commande explicite : les mots stock/horaires/restaurant/corbeille cités dans le nom restent des valeurs.

## Moteur et garde-fous

Même `trashFileMetadata` que le DELETE manuel, avec snapshot complet de l'actif/usages/statuts de publications. Originaux protégés et publications scheduled/publishing/published restent refusés. Dossiers, versions, octets et liens acquis conservés ; aucune suppression définitive ou en masse. Un brouillon autorisé par le moteur natif reste autorisé. Empreinte complète, hash des octets, TTL15min, droits, projet/onglet, cible/version et reçu atomiques ; tout conflit refuse sans écraser la modification manuelle. Les octets absents donnent une clarification avant aperçu et un 409 avant accord, sans chemin interne ni régénération.

Le devis cognitif et son acceptation sont refusés avant tout contrôle fournisseur pour ce tour gratuit, y compris clarification, annulation et drapeau retiré (`conversation_free_file_trash_reply`). Une nouvelle question indépendante garde son devis explicite normal. Le drapeau fermé conserve la réponse non exécutante historique des messages ; confirmation forgée refusée. Les tests acquis restent inchangés.

## Vérification exécutée

**29 nouveaux tests ; 129 tests distincts /6 fichiers et types verts**. Garde réseau obligatoire, fetch interdit, comptes/projets et octets fictifs seulement. Les 19 premiers cas démontraient le raccordement absent. Un cas supplémentaire a reproduit le traitement incorrect des octets absents avant correction. Le contrôle de retrait des droits avant reprise était déjà vert ; il n'est pas présenté comme un défaut acquis découvert.

Vrais handlers HTTP : message, 17 secondes réelles, GET projet +conversation, proposition conservée sans écriture, refus de confirmation absente/fausse/chaîne, accord, résultat dans GET natif `files?trash=1`, rejeu identique avec un seul tour, restauration native et octets initiaux identiques. Refus/conflits nom/dossier/version/métadonnées/usages/octets/corbeille/sélection ; droits/TTL/drapeau/onglet/autre compte/fausse proposition ; protections natives ; aucun fournisseur ni nouvelle dépense.

Logs : `/tmp/parity301-file-trash-conversation-{red,missing-red,delivery-final,types-verified}.log`.

**Limite : la carte et son handle sont encore à intégrer par Claude, puis à qualifier dans le Studio compilé.** Les 16 parcours compilés de #438 concernent la lecture ciblée et le renommage existant ; ils ne qualifient pas cette nouvelle carte. Statut PARTIEL.

À l'application : émettre `studio:files-changed` avec l'assetId pour recharger la bibliothèque ; fermer/actualiser la fiche du fichier mis à la corbeille, ne pas afficher un résultat optimiste. Restauration disponible via le contrat acquis `localFileRestore` (phrase exacte : `Restaure le fichier « ID » de la corbeille`). Respecter le verrou de droits, l'accord séparé et les contrôles de reprise des handles existants.

Aucune dépense réelle, modification client, activation, déploiement ou fusion main.
