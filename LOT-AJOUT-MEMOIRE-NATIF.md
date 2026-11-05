# Aperçu sans écriture des effets d’un ajout mémoire natif

Parent #488 / ab0403223817c8f83f5accda312ad00556191176. Aucun composant ou branche Claude modifié.

## Moteur partagé

`projects.readRememberPlan` extrait la lecture qui décide déduplication/renforcement/remplacement. `remember` utilise ce plan DANS sa transaction existante. Même filtre et ordre natifs, même limite pour le choix manuel ; aperçu seul lit aussi les candidats pour refuser une ambiguïté. Branche faits/artefacts, provenance, normalisation, SQL de mutation et comportements manuels conservés. La recherche des opposés passe avant insertion ; l’entrée insérée a forcément une autre clé de polarité et ne pouvait pas appartenir à ces opposés.

`memoryAddInput` extrait exactement le schéma du formulaire/API manuel. Le POST le réutilise avec son comportement préexistant, y compris défaut scope=all et champs inconnus ignorés. Le nouveau contrat d’aperçu est plus strict : kinds decision/correction/preference/goal seulement ; pas de source/origin/status/normKey forgés, clé/valeur non blanches, aucun fait/artefact/historique modifié par implication.

`previewMemoryAdd(projectId,input)` rend :
- effect create/reinforce/replace, before entrées publiques affectées, after kind/key/value/status/source/scope/origin/normKey/evidenceCount ;
- snapshot schema native-memory-add-1,projectId,input,fingerprint du plan natif et toutes les colonnes des candidats affectés ;
- uniquement une transaction de lecture, aucun remember simulé par écriture/rollback.

L’effet est honnête : une préférence équivalente renforce l’entrée acquise et garde sa clé/son texte/sa provenance. Une déduction IA renforcée ne devient pas fictivement une nouvelle provenance user. Une décision/correction de même clé et valeur différente, ou une préférence opposée, annonce son remplacement en historique. Les anciennes preuves restent conservées ; compteurs malformés refusés dans le contrat strict. Pas de promesse Undo.

## Accord natif

`applyMemoryAdd` replanifie sous verrou, refuse si les effets annoncés changent, puis appelle remember. Relit l’identité et les champs, compte de preuves et horodatages réels, états superseded/superseded_by et TOUS les voisins. Seuls les effets annoncés persistent ; anomalie ou erreur → rollback. Les dates d’écriture ne sont pas figées artificiellement à l’aperçu. Une mémoire indépendante écrite entre-temps reste intacte et n’empêche pas cet ajout.

## Vérifications

**25 nouveaux tests,59 distincts/quatre fichiers et types verts.** Régressions Brain mémoire/cohérence/façade/lecture conservées (34 cas). Vrais moteur/SQLite/handlers isolés : produits/services, zéro run lors d’aperçu et lignes inchangées, créations/dédupliquées/opposées/décisions/corrections, provenance IA honnête, preuves une seule fois, confirmation17 001ms plus tard avec vraie date d’écriture, conflits même timestamp et décision réellement commise avant verrou, voisin indépendant conservé, ambiguïtés/internes/compteurs malformés/entrées forgées, mauvais effet voisin injecté et rollback intégral,API manuelle inchangée. Logs `/tmp/parity301-native-memory-add-{first,types}.log`,diff vérifié.

Il s’agit de tests natifs et d’un décalage d’horloge déterministe, PAS d’une attente réelle17s ni d’une recette navigateur. Le raccordement naturel,carte/accord/résultat visible et recette Studio compilée restent le lot suivant. CI complète du commit livré à suivre séparément ;quatrième contrôle obligatoire inchangé. Aucun fournisseur/dépense/client/activation/main/déploiement.
