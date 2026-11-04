# Anciens projets A1 : accès ciblé aux opérations de dossiers

Les moteurs natifs de renommage/déplacement fonctionnent déjà, mais la reprise A1 ne proposait que les exceptions Site et Fichiers. Quatre cas produits/services sous drapeaux explicites reproduisaient le manque. Ce lot raccorde ces mêmes moteurs à la conversation existante, sans nouvelle Préparation, mémoire, table, identifiant ou version synthétique.

## Activation de recette uniquement

Deux nouveaux drapeaux serveur, **fermés par défaut**, indépendants :

- STUDIO_CONVERSATION_EXISTING_FOLDER_RENAME=1 ouvre uniquement folder-rename dans recovery.localEdits.ops.
- STUDIO_CONVERSATION_EXISTING_FOLDER_MOVE=1 ouvre uniquement folder-move.

Ils exigent aussi le drapeau EXISTING_LOCAL et les gardes natifs FILES/CONTEXT/LOT_A/AI. Aucun environnement client, fichier .env ni déploiement n’est modifié dans cette livraison. Les tests utilisent vi.stubEnv sur des données fictives.

ownedConversation(...,true) conserve propriété, visibilité et forfait actif avant toute lecture/reprise ; chaque moteur recontrôle encore ses permissions et son snapshot natif à l’exécution. Le retrait d’un drapeau ou du forfait bloque aussi le rejeu d’un ancien reçu avant retour du cache. Aucun accès général n’est accordé.

## Contrat pour Claude

Les commandes et DTO #398/#400 restent identiques. Sur A1, projectRevision reste **null**, recovery.state reste read-only, actionsEnabled et aiEnabled restent false. correctionFields=[],creation=null et stateOf(projectId)=null restent vrais ; aucune fiche créée pour obtenir un numéro de révision. Les dossiers utilisent leur propre fingerprint d’arborescence native.

Pour les deux nouvelles cartes :

- Renommage : localEditAllowed(view,'folder-rename') ET localFolderRenameExecution.enabled.
- Déplacement : localEditAllowed(view,'folder-move') ET localFolderMoveExecution.enabled.

Les factories existantes utilisent désormais ce contrôle par opération, compatible avec les nouveaux projets préparés et l’exception A1 explicitement déclarée par le serveur. Ne pas rejeter ces deux cartes par un simple if(view.recovery). Garder le verrou commun, la cible exacte, l’aperçu, l’accord gratuit et le reçu. **nativeLocalEditAllowed reste inchangé et refuse A1 pour tous les domaines sans exception** ; ne pas le rendre globalement permissif. Les autres cartes, outils IA, pièces jointes et préparations gardent leurs gardes actuels.

La carte et la recette indépendante compilée A1, produits/services, Encre/Plein ordinateur/toucher mobile,≥17s, restent à intégrer/qualifier. Aucun composant Claude modifié ici et aucune parité UI anticipée.

## Résultats exécutés

Quatre cas manquants reproduits avant raccordement, puis **106 tests ciblés réussis sur cinq fichiers et types exit0** :20nouveaux A1 et86régressions. SQLite/fichiers réels, cookies/auth/HTTP/CSRF,confirmation littérale,projectRevision:null ;drapeaux par opération et plan retirés avant cache,annulation/expiration,nouveau tour,concurrence détectée par la vraie arborescence,récupération de réponse perdue par GET sans secondPOST,aucun succès sur bitclientforgé.

Les produits et services acquis, site, versions, anciennes données métier,shop.chat,actifs/octets,dépenses etabsence de Préparation sont conservés. Les adaptateurs généraux restent refusés même avec les deux drapeaux ouverts. Fetch fournisseur interdit ;aucune réserve ou dépense créée. Tests antérieurs A1 et nouveaux projets conservés. CI complète du SHA livré à observer séparément.

Aucun fournisseur réel, projet client, activation, publication, fusion main ou déploiement.
