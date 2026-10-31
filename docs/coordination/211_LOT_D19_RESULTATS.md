# #211 — D19 : vérifier le reçu vidéo réellement confirmé

**Fait / tests ciblés et deux parcours compilés réussis, fournisseurs simulés.** Harnais gelé et testé : `5e3d23280589bb2cf78bb10bfa1d58760557a5e7`, parent #273 `99b52fe4f3be94d67266d15bf87a2da245665587`. Application/worker strictement identiques au build propre D18 `d4fd349242bf2906f0c1530fb4e7eeb91d62dac4`, réutilisé : aucun nouveau code applicatif, compilation ou changement des moteurs/quotas/budgets.

## Cause reproduite et correction

**OBSERVÉ EN CI** #269, tête `3a47efbab8326a8aa1da0602c6292d167b629bc2`, run41127062315/job124308202116 : assertion `failed.delivered` =true au lieu de false. L’artefact ciblé13014841550 a été réellement téléchargé et son SHA256 vérifié ; diagnostic natif : nouveau rendu queued/0%, rendu antérieur done. [Preuve minimale](preuves-211-D19/ci-historical-evidence.json). L’ancien SHA reste rouge, pas requalifié vert.

**CONFIRMÉ DANS LE CODE / REPRODUIT** : le wait du harnais `verify-agent211-voice-ui.ts` excluait seulement le dernier reçu de réemploi. Avant la réponse HTTP de nouvelle confirmation, `.find` pouvait sélectionner le précédent rendu acquis : fausse assertion d’échec, ou faux succès potentiel à une autre étape. Augmenter le timeout ne corrige pas ce choix. Le même motif était présent dans la recette des clips.

- `scripts/agent211-receipt-wait.ts` : sélection de l’ID exact de reçu, puis contrôle de l’ID du job renvoyé par la confirmation ; attendu absent/queued/running/paused/blocked → continuer à attendre, autre job → erreur. Le verdict réel reste intact.
- `scripts/verify-agent211-voice-ui.ts`, `verify-agent211-clip-ui.ts` : attendre la vraie réponse POST confirm, vérifier son quoteId, suivre uniquement ce reçu/job. Génération initiale, correction et réemploi concernés. Aucune assertion de sécurité, coût, fichier, version, qualité, échec ou conservation retirée ; aucun timeout augmenté.
- `tests/agent211-receipt-wait.test.ts` : neuf cas dont ancien résultat visible avant confirmation, nouvelle tâche active, états terminaux et job étranger. La reproduction montre l’ancien filtre renvoyant précisément le mauvais succès.

## Contrôles réellement exécutés

```bash
node node_modules/vitest/vitest.mjs run tests/agent211-receipt-wait.test.ts tests/conversation211-video-voice.test.ts tests/conversation211-video-clip.test.ts
node node_modules/typescript/bin/tsc --noEmit
node --import tsx scripts/verify-agent211-build.ts /workspace/reviews/ecom-211-state/D19-voice-browser-proof --voice-ui
node --import tsx scripts/verify-agent211-build.ts /workspace/reviews/ecom-211-state/D19-clip-browser-proof --clip-ui
```

**23 tests / 3 fichiers réussis**, types réussis. Deux bases temporaires distinctes, Chromium/SDK/worker/FFmpeg natifs vers HTTP loopback fictif uniquement ; `NODE_OPTIONS=--import=./scripts/lot9/network-guard.mjs`, runtime navigateur isolé, `CHROMIUM=/usr/bin/chromium`. Aucune donnée/configuration du Studio réel. [Commandes/statuts/SHA](preuves-211-D19/checks.json), [assertions sélectionnées](preuves-211-D19/native-receipts.json), [manifeste](211_D19_PREUVES.json).

La recette vocale **retarde volontairement de350ms l’envoi de la dernière confirmation**, constate avant l’envoi l’absence du nouveau reçu malgré les anciens acquis, puis attend le reçu/job exact. Il échoue vraiment, delivered=false/progress0, sans reprise automatique. MP4 initial, autres voix/clips/sous-titres et version utilisable conservés ; lecture/décodage/téléchargement, rechargement sans appel, isolation404/CSRF403 et réemploi sans crédit ni nouveau job vérifiés. La recette clip garde les autres clips et toutes les voix ; deuxième tentative payante incertaine refusée. Le contrôle négatif n’est ni sauté ni transformé en succès.

[Capture réellement ouverte : échec et acquis conservés](preuves-211-D19/01-echec-et-acquis-ordinateur.png). Aucun film redondant publié pour un correctif de harnais ; rendu fonctionnel natif existant, mire et voix de test sans qualité créative ou parole naturelle qualifiée. Les compteurs simulés sont dans la preuve, **0 appel fournisseur réel / 0 € réel**.

**CI complète finale requise sur cette tête**, brouillon en attendant ; aucune relance de l’ancien run. Base #273 et chaîne antérieure conservées, aucune CI/recette retirée. #211 reste partielle : outils métier dépendants de Claude, pages/prestations/RDV originaux, critique visuelle et recette finale commune notamment. Aucun main, fusion, déploiement, activation, client ou branche/composition Claude modifié.
