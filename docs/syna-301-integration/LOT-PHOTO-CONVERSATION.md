# Photo jointe à une conversation rattachée — backend/transport partiels

Base #377 2da4884f4c828e588992f9da3471d3c70132db0c. Aucun fichier graphique modifié. Aucun import automatique, analyse visuelle ou fournisseur.

## Contrat Claude

`ConversationView.photoImport` présent seulement pour une conversation de projet disponible : enabled:true, endpoint `/api/studio-agent/conversations/<cid>/photos`, maxFileBytes:209715200, kind:image, analysis:false. Drapeaux natifs LOT_A/AI/CONTEXT/FILES existants, aucun nouveau drapeau activé. Pas d’upload avant rattachement de projet ;A1 conservé en lecture seule et écrans natifs existants toujours disponibles.

POST multipart : UN `file` (photo), UN requestId stable, folderId optionnel du même projet ;champs inconnus/dupliqués refusés. GET même endpoint ?requestId=… relit le reçu sans importer. Types MIME/octets, signatures, SVG statique/décodage/40M pixels, nom et extensions actives validés avec checkedUpload/saveAsset natifs. 200Mo maximum, même rate limit upload:<user> (60/10min). Documents/vidéos restent dans Fichiers ;pas de limite silencieusement élargie.

Réponse syna-conversation-photo-import-1 : saved ou pending ;conversationId/projectId/receiptId, analysis:false, financialConsent:false, coût0/appels0, publication:false, confirmationRequired:false, actionsExecuted true UNIQUEMENT si enregistré et relu ;asset id/version/name/mime/href/thumbHref/photoId. Le fichier choisi est un geste d’import gratuit, pas un consentement IA. Afficher « importée, non analysée ». Pour joindre la photo au prochain message, envoyer explicitement photoIds:[photoId] avec le texte (contrat conversation existant). Aucune inclusion implicite dans le Brief au simple import.

Transport createConversationPhotoImport : upload(file,folderId),verify(),retry(mêmeFileOptionnel),dispose(). Stockage `syna-photo-import:<cid>:<projectId>` : identité/nom/taille/type/dossier UNIQUEMENT, jamais octets. Après reload,verify() lit le vrai reçu ;si besoin de reprendre,réselection du même fichier et même identifiant. Scope projet/conversation vérifié pour ignorer les réponses tardives. Callback onReceipt puis onImported({projectId,assetId,receiptId}) une seule fois ;événement natif studio:files-changed exporté pour Claude. Une réponse initiale définitivement refusée (400/413/415/429) libère le choix ;une réponse perdue ou un refus ambigu garde l’identité à vérifier, sans nouvel import automatique.

## Persistance et concurrence

Nouvelle table additive agent_conversation_photo_imports. Empreinte du contenu exact/nom/MIME/dossier liée à (conversation,requestId). Rejeu identique retourne le même média ;changement de fichier/destination=409. Reçu asset_id enregistré dans le callback SYNCHRONE de la transaction saveAsset existante. Révocation droits/drapeau/projet ou dossier disparu avant commit =>rollback du média/du reçu et nettoyage UNIQUEMENT des fichiers de la tentative. Acquis jamais supprimés. Deux requêtes identiques concurrentes :une travaille,l’autre lit pending ;aucun doublon. Lease interrompu reprenable après5min par le même fichier ;token de lease empêche l’ancienne tentative de committer. Photo supprimée/rejetée ou octets indisponibles après succès :409,aucun remplacement automatique.

## Preuves exécutées

14 tests avec vraies routes Request/Response et SQLite/fichiers natifs : import HTTP+octets/reçu GET/coût/jobs inchangés ;concurrence/rejeu/réponse perdue ;hash nom/dossier ;types malformés/exécutables/SVG actif/MIME faux/PDF ;propriétaire/dossier/origine ;droit révoqué DANS la transaction asset (rollback) ;photo supprimée/reçu absent ;champs/body200Mo/batch refusés ;lease interrompu ;rate limit ;capability/draft refusé et photoId explicitement joint au vrai message ;transport reload vérifiant sans second POST ;réponse tardive autre projet ;premier fichier rejeté puis valide et faux reçu économique refusé. 14/14 passent. 20 connaissance/registre passent ;types propres,diff-check propre,garde lot9 et fetch sentinelle jamais appelé. Deux assertions initiales comptaient les reçus de toutes les fixtures :corrigées pour le cid testé. Aucun test supprimé.

Limites : bouton fichier/miniature et conservation du photoId dans le composeur,verrou commun et recette compilée Encre/Plein ordinateur/téléphone restent à intégrer par Claude. Ni projet implicite,ni upload projectless,ni vision,ni analyse de documents,ni fournisseur même simulé dans ce lot. Statut PARTIEL ;ne pas annoncer conversation.attachments complet. CI du SHA livré à qualifier.
