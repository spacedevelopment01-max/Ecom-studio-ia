# Corbeille native : protections atomiques et rejeu stable

5 novembre 2026, Europe/Paris. Parent #436, `9b02c829`. Prérequis moteur de la mise à la corbeille depuis SYNA ; aucun nouveau parcours conversationnel ou composant Claude déclaré intégré ici.

Trois défauts reproduits avant correction : deux connexions SQLite permettaient de programmer une publication ou de protéger l’original après le contrôle, puis l’API mettait quand même le média à la corbeille ; un DELETE répété remplaçait aussi la première date de corbeille. Trois tests rouges conservés.

La route manuelle réutilise désormais `trashFileMetadata` dans `library-local-change.ts`. Lecture de la cible et de ses usages, contrôles et UPDATE borné au projet/utilisateur sous une seule transaction immédiate. `readFileTrashState` fournit un snapshot cohérent et son empreinte pour le futur aperçu. `fileTrashBlocker` centralise les restrictions natives : originaux protégés et usages par des publications scheduled/publishing/published restent refusés. Un usage de brouillon autorisé conserve la politique manuelle existante.

Une répétition sur un fichier déjà en corbeille conserve la première date. Après écriture, toutes les colonnes sont comparées à la source, sauf deleted_at. Aucun octet, version, nom, dossier, lien, statut de publication ou métadonnée voisine modifié. Le fichier reste restaurable par le moteur existant.

**13 nouveaux tests verts ; 59 tests /4 fichiers et types verts.** Trois rouges avant correction (les autres cas étaient seulement filtrés pendant cette reproduction, pas marqués ignorés). Concurrence réelle, protections natives, usage de brouillon permis, empreinte périmée après nouveau lien/métadonnée/statut, projet/utilisateur, rollback et restauration native vérifiés. Aucun test supprimé ni garde financier assoupli.

Logs `/tmp/parity301-file-trash-native-{red,first-green,final,types-final}.log`. Vrais handlers HTTP et fichiers fictifs, fetch fournisseur interdit, garde réseau Node, DATA_DIR isolé. Aucun projet client, fournisseur réel, activation, main ou déploiement.

La conversation devra encore fournir une cible précise, un aperçu des usages, un accord gratuit, le résultat natif relu et la reprise sans doublon ; une protection ajoutée après aperçu doit invalider l’accord. CI finale à suivre sur le commit publié. Les fonctions déjà visibles de la bibliothèque peuvent être qualifiées indépendamment pendant les nouvelles cartes de Claude.
