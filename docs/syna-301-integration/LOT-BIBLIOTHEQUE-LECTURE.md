# Bibliothèque naturelle : lecture des métadonnées, pas vision

Base moteur #376 cf159b91358934c3d83bb203a2c011eb1a49360d ; documentation cumulative2691bf2220f9bbf08fe4f2a87004cde1bae27124. Aucun fichier graphique modifié.

## Contrat Claude

Extension de `localFiles`, schéma syna-local-files-1, `command:'read'`, nouvel état `listed`. Champs `projectId`, `nativeHref`, `vision:false`, `items:[{id,name,kind,mime,version,folderId,href,thumbHref,target:{kind:'asset',assetId,version}}]`, ou `folders:[{id,name,parentId}]`, `hasMore`. Toujours confirmationRequired:false/actionsExecuted:false/coût0/appels0 pour cette lecture. Les commandes rename/move et leurs accords existants sont conservés, aucun nouvel exécuteur de mutation.

Phrases : Montre les fichiers de mon projet ; Liste les photos ; Montre les images ; Liste les vidéos ; Montre les dossiers ; Cherche le fichier « nom exact ou identifiant ». Recherche EXACTE native, pas de déduction sémantique ni wildcard. Homonymes = choix explicites, jamais premier résultat. Page de50 résultats maximum, hasMore et lien Fichiers pour le reste ; noms intégraux. Ne pas prétendre avoir vu/compris une image. Ne pas montrer « modification enregistrée » pour listed.

Les items proposent un repère A2 natif pour désignation, pas une permission. Claude doit rendre la liste/liens et un choix explicite pour sélectionner avant rename/move ou remplacement d’image, sans modifier le contrat de confirmation. Toute liste invalide l’ancienne proposition de métadonnées ; un ancien accord ne peut plus agir après la lecture.

Cloisonnement propriétaire/projet, forfait conversationnel existant, drapeau FILES ; mêmes filtres de visibilité stratégique que la route Fichiers native. Supprimés, rejetés et captures internes exclus. Projection limitée aux métadonnées nécessaires : pas de meta brute, chemins disque, texte des fichiers ni vision. Dossiers étrangers non exposés. Aucun réseau ni appel fournisseur.

## Vérifications exécutées

7 nouveaux tests : comparaison des IDs/liens/versions au vrai GET natif authentifié ;aucune mutation/octet/dépense/job ;photos/dossiers ;recherche noms dupliqués/ID et absence de wildcard ;propriétaire/projet,rejetés,supprimés,captures internes ;52 fichiers→50+hasMore ;ancien accord de renommage invalidé ;chaînage/analyse non annoncés,drapeau fermé. Avec20 tests Fichiers acquis :27/27. Registre/connaissance20/20 ;types/diff-check propres. Garde réseau lot9, fetch sentinelle jamais appelé.

Limites : carte de liste/sélection et recette compilée quatre modes restent à intégrer par Claude ;upload direct depuis conversation, upload avant création, vision et contenu des pièces jointes NON raccordés. L’import natif dans Fichiers existe déjà et reste inchangé. Ne pas requalifier conversation.attachments ou images.upload à partir de cette seule lecture.
