# Aligner la corbeille SYNA sur la Banque Images native

L’audit de #409 a révélé un écart démontré : Images utilise BANK_IMAGE_ROLES dans son lecteur natif, alors que SYNA filtrait seulement kind=image. Des publicités, logos ou images non classées apparaissaient donc dans cette corbeille et pouvaient être proposés avec un lien Images où ils ne figurent pas.

Six cas initiaux : cinq rouges, un vert. Comparaison avec la vraie API native authentifiée, refus attendu de trois rôles hors banque, lien du contexte Fichiers et restauration gratuite générale conservée.

## Correctif minimal

Le moteur partagé importe BANK_IMAGE_ROLES/isBankImage existants. Depuis Images, liste et proposition utilisent exactement les rôles natifs, avec filtre image. La portée bankScope est conservée dans la proposition et revérifiée avant accord. Changement concurrent de rôle ou passage d’une proposition Fichiers à Images : refus, aucune restauration.

Depuis Fichiers, le moteur général reste disponible pour tous les fichiers acquis autorisés, y compris publicités, logos et images non classées. Une phrase image/photo y garde un lien Fichiers ; aucune portée Banque n’est déduite du seul nom. Les autres métadonnées et octets ne changent pas. Aucun achat ou fournisseur.

Deux fixtures des tests Images ont reçu le rôle original employé par le vrai import de banque, au lieu d’un rôle null. Les assertions de doublons, octets, reçus, droits et A1 sont conservées. Les nouveaux tests couvrent explicitement le rôle null exclu d’Images mais toujours restaurable gratuitement depuis Fichiers : aucune fonctionnalité générale supprimée.

## Contrat Claude

Même carte, DTO localFileRestore, schema syna-local-file-restore-1 et actions confirm-file-restore/cancel-file-restore. Confirmation:true et toutes les protections financières restent obligatoires. Aucun composant ou fichier graphique modifié.

La réponse annonce la Banque Images comme sous-périmètre et renvoie les autres visuels vers Fichiers, sans les substituer. NativeHref suit le contexte natif : Images pour une proposition de banque, Fichiers pour une proposition générale. Les anciennes propositions Images dépourvues de portée de banque ne sont pas réautorisées silencieusement : nouvelle proposition et nouvel accord requis.

Le registre distingue désormais native.images.restore (banque native) de native.files.restore (restauration générale), sans déclarer de purge, génération ou restauration de version de contenu.

## Vérifications

61 tests sur cinq fichiers et types passent :11nouveaux,13Images,15Fichiers et22registre. Après précision du message de périmètre, les11nouveaux repassent. Vraie API native, listes/rôles, identifiants exacts, contexte et reclassification concurrente, acquisition conservée, restauration générale et gratuité vérifiées. Aucun test supprimé, aucun seuil/drapeau ou contrôle obligatoire affaibli.

CI complète et parcours Images réel à qualifier sur le nouveau SHA. Les preuves V10 au SHA1c6ece6b (A1/dossiers/stock) gardent leur source et ne qualifient pas la nouvelle portée Images. Aucune dépense réelle, modification client, activation, publication, fusion main ou déploiement.
