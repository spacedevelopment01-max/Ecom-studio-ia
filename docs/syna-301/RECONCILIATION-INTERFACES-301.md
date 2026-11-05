# SYNA #301 — rapprochement des preuves d’interface

Cette note complète la matrice canonique sans modifier les documents originaux de Claude ni reprendre leur compteur global `SYNA_OK`.

**Sources examinées :** PR #299, commit documentaire `0bee39ae3ec34a9ce9e1f1be528f4140f8c33bf3`, fichiers `docs/syna-parite-301/{RAPPORT-VAGUE1.md,MATRICE-INTERFACE.md,recettes-operations.json,resultats.json}` et lanceur `scripts/syna-parite-shell.ts` ; assertions des recettes `verify-agent211-*-ui.ts` ; matrice canonique de convergence. Revue documentaire uniquement : aucun nouveau test exécuté pour cette note.

## Quatre attributions à restreindre

| Opération déclarée couverte | Recette citée | Ce que les assertions prouvent réellement |
|---|---|---|
| `research.approve` | `research-ui` | Génération/relecture de cinq hypothèses ; `clientApproved=false`, `selectedId` absent et `fiveHypothesesNotApproved=true`. L’approbation de préparation reste non couverte. |
| `proposal.compare` | `choices-ui` | Comparaison des angles acquis via `strategyChoices`. Pas de preuve du contrat distinct des propositions versionnées. |
| `proposal.choose` | `choices-ui` | Préférence de discussion, rejet, annulation et historique ; `noNativeActivation=true`. Pas de validation native d’une proposition de préparation. |
| `theme.select` | `specialists-tools-theme-ui` | `theme.edit` et annulation sur un site déjà fourni par `seedSite`. Aucune sélection/application d’un thème de galerie. |

Références des assertions : `verify-agent211-research-ui.ts:21–24,32`, `verify-agent211-choices-ui.ts:21–29`, `verify-agent211-theme-ui.ts:27–53`. Conserver les opérations distinctes ; le succès d’une recette voisine ne couvre pas leur contrat.

## Inventaire et limites fonctionnelles

- L’inventaire Claude comporte **80 opérations**, la matrice canonique **83**. Les trois lignes supplémentaires sont `blog.edit`, `native.files.classify` et `native.prompt-run` ; elles ne doivent pas recevoir de preuve par héritage.
- **C21 :** la PR #330 est désormais accessible, source `356b20ab3d2d4ff2bab0a55869a36c35b2c49f31`, fondée sur le correctif backend #310 `f3c1dc151a3916ca3084c8e896cae6e58fad09d6`. Cette interface est en revue ; sa disponibilité ne vaut pas qualification du candidat intégré. Le backend #310 permet de renommer un bien/une réalisation/un plat et de modifier le prix numérique exact d’un plat ; il ne prouve ni création, ni photos/avant-après, ni allergènes, ni CRUD complet.
- **C24 :** la carte est annoncée sur `claude/syna-301-fichiers`, SHA `d71315348e2de18d6197576ae1e07fe39939e7d0`, source distincte de #299. Ses preuves doivent conserver cette provenance.
- **A1 reste PARTIEL côté interface :** la reprise de brouillon après réponse de création perdue dans `ui` ne qualifie pas les cartes gratuites des anciens projets. Le rapport Claude précise que l’adaptation à `recovery.localEdits` reste à faire.
- **C22 reste PARTIEL :** le backend de lecture des demandes existe désormais (#319), mais aucune carte/parcours Claude correspondant n’est qualifié. Le libellé historique « ABSENT » de sa table ne décrit donc pas ce backend plus récent.

## Séparer les sources et les qualifications

Les recettes finales de convergence ont été exécutées sur le build de production propre **`5b6382affdaea3a2d1b01e62f7c4078c7f71d38d`**. Le code applicatif de **`f5e17f1bf5314b85b98a02e91a297f65e707f3fe`** est identique ; ses changements supplémentaires concernent le harnais/tests. Les preuves Catalogue, Blog et Retouches dans les deux modes restent attribuées à leurs scopes exécutés sur5b, sans devenir une preuve de toutes les opérations du Studio ni de `blog.edit`.

Le candidat prévu réunit la dernière coquille Claude **`cdbaa1a91bc394135c228058b48e1d9e80dca041`**, la PR **#328** (Fichiers) et la PR **#330** (Contenus métier). Il n’est **pas encore qualifié** par ces preuves. L’enveloppe iframe stable introduite dans l’interface Claude, les nouvelles cartes et leurs éventuels assemblages demandent une qualification sur leur propre SHA. Aucun statut vert de convergence ne leur est transféré.

`resultats.json` donne seulement mode → recette → résultat ; il ne précise pas le SHA du build de chaque passage ni les assertions natives brutes. Le SHA documentaire0bee ne vaut donc pas automatiquement SHA d’exécution. Pour `brand.correct` et `logo.replace`, les recettes possèdent des branches natives appropriées ; demander les rapports bruts et drapeaux réellement exécutés avant d’attribuer ces scopes. Les anciens rapports5fd restent attachés à5fd : notamment `clientCorrection=false` ne prouve pas une correction de marque.

**Rapprochement recommandé :** conserver les statuts moteur et financiers canoniques, et ajouter un compagnon d’interface par opération indiquant recette, mode, viewport, SHA du build, source backend/interface, preuve brute, assertions exactes et limites. Aucun nouveau total global `SYNA_OK` n’est calculé ici. Aucune dépense fournisseur réelle, modification client, fusion ou mise en production n’a été réalisée pour cette revue.
