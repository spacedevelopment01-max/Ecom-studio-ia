# #211 — D16 : cohérence des reçus des outils natifs

**Fait :** extension du correctif de lecture concurrente #270 aux reçus et registres de 16 autres modules. Code compilé et contrôlé : **`bfa013ca545b8ccbaebce86281bc9e94b747ccda`**, parent #270 `cc4c9f536b9b278fdaf17eaff0deaa9f6c9b9613`.

## Cause et périmètre

Le cas image est **REPRODUIT** avec deux connexions SQLite WAL : ancien devis lu, puis commit du worker, puis job `done` → faux `result_missing` et arrêt du suivi. Ce défaut avait été corrigé pour la conversation et les thèmes dans #270 ; les autres reçus utilisaient encore ce protocole non atomique.

Le même `readSnapshot` synchrone DEFERRED entoure désormais **32 fonctions / 16 modules** : analyse, recherche, marque, catalogue, images, logos, rédaction, exports, captures, montage vidéo, génération de clips, voix, reprise ciblée, brouillons sociaux, production sociale et visuels publicitaires. [Fichiers et fonctions exacts](preuves-211-D16/snapshot-scope.json). Lecture d’un état cohérent avant/après le commit ; aucune preuve de résultat, empreinte, version, fichier, propriétaire ou statut n’est relâchée. Aucun worker, budget, devis, consentement, reprise payante ou moteur de création modifié.

**CONFIRMÉ DANS LE CODE / REPRODUIT :** le catalogue de capacités déclarait `images.correct` absente malgré la retouche native raccordée. Il indique maintenant l’outil réel, sa source et son devis ; drapeau fermé → raccordement désactivé. Cela ne prouve ni disponibilité des clés fournisseur ni qualité d’une retouche réelle. Les contrôles natifs restent requis à l’action.

La concurrence forcée est directement testée sur le reçu image et, dans le parent, conversation/retouche/annulation. Le même défaut potentiel est confirmé par inspection dans les autres modules ; **aucune prétention à avoir forcé chaque interleaving de chacun de leurs reçus**.

## Vérifications exécutées

- **312 tests ciblés / 18 fichiers réussis**, types et build propres réussis. Deux nouveaux rouges initiaux sont conservés : reçu image incohérent et catalogue erroné. [Commandes exactes, dates, sources et résultats](preuves-211-D16/checks.json) · [rouges](preuves-211-D16/race-and-catalogue-red.txt).
- **HTTP réel vers le Studio compilé**, sans worker : 15 registres de 11 familles d’outils relus sur six jeux de résultats synthétiques déjà sauvegardés. Marque, textes, images/retouches, thèmes, exports, social, publicités, clips et voix. Authentification 401 et autre compte 404 vérifiés. [Réponses résumées et états natifs](preuves-211-D16/acquired-http.json).
- **Aucun nouveau job/appel/média/version ; mémoire acquise identique** avant/après. 21 reçus livrés et 10 échecs historiques restent distincts. Erreurs ou livraisons historiques incomplètes restent visibles ; pas de remplacement par un faux succès. Pas de régénération pour obtenir des captures. Montage local, logos, catalogue, recherche et captures natifs : régressions ciblées exécutées ; leurs recettes HTTP complètes restent couvertes par la CI finale, pas toutes rejouées localement dans ce lot.

```bash
node node_modules/vitest/vitest.mjs run tests/conversation211-images.test.ts tests/conversation211-logos.test.ts tests/conversation211-exports.test.ts tests/conversation211-research.test.ts tests/conversation211-tools.test.ts tests/conversation211-video-motion.test.ts tests/conversation211-video-clip.test.ts tests/conversation211-video-voice.test.ts tests/conversation211-video-generation.test.ts tests/conversation211-social-execution.test.ts tests/conversation211-social-production.test.ts tests/conversation211-content.test.ts tests/conversation211-catalogue.test.ts tests/conversation211-brand.test.ts tests/conversation211-brand-review.test.ts tests/conversation211-theme-tools.test.ts tests/conversation211-renders.test.ts tests/conversation211-studio-knowledge.test.ts
node node_modules/typescript/bin/tsc --noEmit
# DATA_DIR temporaire neuf, STOCK_OFFLINE=1 ; aucune configuration client
npm run build
# Recette de lecture locale, fixtures synthétiques existantes, réseau fournisseur interdit
node /workspace/reviews/ecom-211-state/read-D16-acquired.mjs bfa013ca545b8ccbaebce86281bc9e94b747ccda
```

[Source exacte du lecteur](preuves-211-D16/read-acquired.mjs) et [sélection des fixtures](preuves-211-D16/fixture-selection.json). La dernière commande réutilise des bases temporaires conservées dans cet environnement ; elle n’est pas présentée comme une recette autonome disponible sur une autre machine. Les parcours natifs reproductibles à données neuves restent les scripts de CI du dépôt. **Zéro fournisseur réel / 0 € réel**, pas de nouvelle qualification créative. Aucun nouveau CMS installé ou export généré par cette relecture.

## Livraison et limites

[Inventaire des six preuves](211_D16_PREUVES.json). Aucun changement visuel ou nouvelle capture/film dans ce lot ; les captures et films précédents restent datés de leurs builds propres. Une seule CI complète exigée sur la tête finale, brouillon à cette rédaction ; pas de suite complète locale redondante, aucun scénario/assertion/délai de CI retiré. Les CI anciennes en échec restent consultables sur leurs SHA ; le défaut de clic sans POST observé séparément n’est pas déclaré résolu.

**#211 reste partielle** : autres raccordements métier, édition d’identité, critique/qualité créative réelle et intégration finale notamment. Main `70204a7ff83eb2382835a27a37a8465c0851a70a` revérifié inchangé. Aucun merge, déploiement, activation réelle, donnée/média/budget client ou branche/composition Claude modifié. Les drapeaux n’ont été ouverts que dans les serveurs locaux de recette synthétique, arrêtés ensuite.
