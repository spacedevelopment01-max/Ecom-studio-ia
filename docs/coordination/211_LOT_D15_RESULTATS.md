# #211 — D15 : ne pas perdre une livraison pendant le commit du worker

**Deux défauts applicatifs reproduits et corrigés**, sans assouplir les preuves de livraison : une lecture HTTP pouvait mélanger l’ancien contexte avec une tâche déjà terminée. Le suivi navigateur s’arrêtait alors sur « modification non prouvée », « périmé » ou un nouveau devis, malgré le résultat natif acquis.

Code compilé/servi : **`f561a0ba0121804088662ab0e3c0224370121396`**. Parent #269 `3a47efbab8326a8aa1da0602c6292d167b629bc2`. Le seul changement ultérieur du harnais permet une recette ciblée service ; sources applicatives/worker et build identiques. Aucune dépendance Claude intégrée ni modifiée.

## Cause et correction

- **CONFIRMÉ DANS LE CODE / REPRODUIT :** `themeChangeReceipt` lisait le devis, puis le job et sa version sans snapshot commun. Un commit entre les deux donnait `done` + ancien devis → `result_missing`. La carte ne voyant plus de tâche active cessait ses interrogations. Dans l’artefact CI #266, la version 3 existe réellement et la carte affiche précisément cet état. L’interleaving historique exact n’a pas été journalisé ; le test reproduit sa condition avec une autre connexion SQLite WAL.
- **REPRODUIT également :** `conversationView` lisait la conversation avant le job cognitif. Si le worker terminait entre ces lectures, une première réponse revenait à `requires_quote` ; avec réponse antérieure elle devenait `stale`. Le suivi s’arrêtait avant la nouvelle proposition. Ce défaut peut expliquer des attentes de proposition, mais **la cause historique de chaque ancien échec CI #263/#267 n’est pas prouvée**. L’enregistrement sans POST observé lors d’un autre diagnostic reste distinct/non résolu.
- `db.ts::readSnapshot`, `theme-tool-execution.ts` et `conversation/index.ts` utilisent désormais un snapshot synchrone WAL **DEFERRED** : état avant ou après le commit, jamais un mélange. Pas de réservation d’écriture IMMEDIATE pour ces lectures. Le relevé financier garde sa transaction native séparée, car il peut régulariser une période budgétaire.
- Les exigences restent identiques : propriétaire, droits, version/empreinte native et résultat du bon job `done`. Un vrai `done {}` sans version reste « non prouvé ». Un crash après sauvegarde demeure récupérable et ne devient pas un faux succès. Aucun retry, fournisseur ou nouvelle génération ajouté ; versions, consentement et budgets inchangés.

## Vérifications

**109 tests ciblés / 8 fichiers et types réussis.** Quatre nouveaux tests provoquent le commit concurrent : retouche, annulation, première réponse et réponse avec historique. Quatre échecs avant correction, succès après ; la première lecture reste en cours puis la suivante récupère le résultat exact, sans appel supplémentaire. [Rouges conservés](preuves-211-D15/race-red.txt) · [commandes, sources, dates et résultats](preuves-211-D15/checks.json).

```bash
node node_modules/vitest/vitest.mjs run tests/conversation211-theme-tools.test.ts tests/conversation211-intelligence.test.ts tests/composition211-syna.test.ts tests/composition211-original.test.ts tests/conversation211-renders.test.ts tests/db-migration-race.test.ts tests/conversation211-brand-review.test.ts tests/conversation211-studio-knowledge.test.ts
node node_modules/typescript/bin/tsc --noEmit
# DATA_DIR temporaire neuf, STOCK_OFFLINE=1, aucune configuration client
npm run build
# Garde réseau active, Chromium réel ; aucune API fournisseur réelle
node --import tsx scripts/verify-agent211-build.ts CHEMIN_PREUVE_NEUF --composition-ui --undo-diagnostic-only
```

Build propre réussi. Recette du Studio compilé/worker/SDK/HTTP loopback fictif réussie : dialogues produit/service, puis **entretien de pianos et cartographie de sentiers**. Composition native → aperçu réel → rechargement/reconnexion → accord d’annulation → version 3/restauration exacte/reçu livré. Tous les contrôles du scénario sont conservés, dont quatre largeurs 1440/1024/390/360, pas de débordement, formulaire devis bloqué en aperçu sans envoi, export Shopify et refus d’une source forgée sans perdre les trois versions. Le filtre optionnel limite seulement ce diagnostic aux deux services ; la recette CI normale reste intégrale.

Six requêtes HTTP simulées, **zéro fournisseur réel / 0 € réel**. Les tarifs/coûts fictifs ne prouvent aucune facturation ou qualité créative. La concurrence est forcée dans les tests SQLite, pas artificiellement annoncée forcée dans le navigateur. ZIP Shopify généré ≠ CMS installé ; aucun nouveau contrôle fournisseur ou CMS réel effectué.

## Preuves et limites

[Annulation mobile réellement livrée](preuves-211-D15/01-annulation-mobile.png) · [Composition ordinateur](preuves-211-D15/02-composition-ordinateur.png) · [parcours natifs](preuves-211-D15/native-proof.json) · [inventaire](211_D15_PREUVES.json).

Deux captures ouvertes et retenues. Aucun redesign : le film de #269 reste la référence du choix d’identité, sans le présenter comme une preuve de cette correction. Pas de multiplication de films ni de nouvelles générations de présentation. Les artefacts CI historiques restent consultables dans les exécutions originales ; cette PR ne les repeint pas en vert.

**CI complète sur la tête finale requise, brouillon à cette rédaction** ; pas de suite complète locale redondante. #266/#267 restent rouges sur leurs SHA anciens, #263 conserve ses échecs. Le candidat enfant devra passer l’ensemble des contrôles sans retrait d’assertion. Les autres reçus métiers ne sont pas tous audités pour ce même risque dans ce lot ; pas de revendication de correction exhaustive de SYNA.

**#211 reste partielle** : autres raccordements, édition d’identité, critique visuelle/qualité réelle et intégration finale notamment. Aucun main, merge, déploiement, activation réelle, projet/donnée/budget client ou branche/composition Claude modifié.
