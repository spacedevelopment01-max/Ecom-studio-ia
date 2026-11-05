# Suppression native atomique d’un dossier vide

5 novembre 2026, Europe/Paris. Parent #434, `22889658`. Prérequis du raccordement conversationnel de `native.files.empty-folder-delete`, sans modification d’interface.

Deux courses ont été reproduites avec **deux connexions SQLite réelles** : après les contrôles de dossier vide, une seconde connexion pouvait enregistrer un fichier ou un sous-dossier ; l’API répondait pourtant200 et supprimait le parent. Les clés étrangères peuvent alors déplacer implicitement le fichier vers la racine ou supprimer le sous-dossier en cascade. Les deux tests rouges exigeaient la conservation de tout contenu concurrent effectivement accepté.

Extraction dans `deleteEmptyFolder(projectId,folderId,options)` du moteur natif commun. Relecture de la cible, contrôles système/contenu et suppression dans une seule transaction immédiate ; DELETE borné au projet et résultat relu. La route manuelle réutilise cette primitive. Un writer concurrent ne peut plus insérer entre les contrôles et la suppression. Les tests gardent le même invariant : si son écriture est acceptée, le contenu et son rattachement restent ; si elle est bloquée par le verrou transactionnel, aucun contenu accepté n’est perdu.

La politique manuelle existante reste conservée : dossier système refusé ; fichier actif ou sous-dossier présent refusé ; une référence de fichier déjà dans la corbeille peut perdre son rattachement selon la clé étrangère native, sans suppression du fichier. **La future conversation utilisera le mode plus strict** `requireNoAssetReferences:true` : une référence de corbeille impose aussi un refus, pour ne modifier aucun fichier implicitement. `expectedTree` permet de refuser un aperçu périmé.

**11 nouveaux tests verts, 71 tests /4 fichiers et types verts.** Deux rouges avant correction ; les cinq autres cas étaient seulement filtrés par `-t concurrent` pendant la reproduction, aucun test marqué ignoré ou supprimé. Vérification finale : toutes les restrictions manuelles, arbre voisin conservé, politique corbeille acquise, mode strict, conflit, autre projet et rollback SQLite ; régressions renommage/déplacement/atomicité des dossiers existants.

Logs : `/tmp/parity301-empty-folder-native-{red,green,final,types}.log`. Stockage fictif isolé, garde réseau Node et fetch fournisseur interdit. Aucun fichier client, fournisseur, activation, main ou déploiement. Ce lot ne revendique pas encore une carte ou un parcours conversationnel complet ; CI à suivre au SHA publié.
