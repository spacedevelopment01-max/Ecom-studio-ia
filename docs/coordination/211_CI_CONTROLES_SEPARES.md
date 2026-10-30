# #211 — CI complète sans coupure cumulative

Le job unique de #264 (`1faf4071`) a été annulé dans la CI [41098085980](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41098085980), vers son plafond de **100 minutes**. Les journaux montrent environ 31,7 minutes pour les tests puis 26,3 pour Theme Check. À 19:01:14 UTC, une recette `--social-reuse-ui` commence ; l’annulation arrive à 19:01:38, sans échec d’assertion de cette recette. Ce n’est pas une validation : les derniers contrôles n’ont pas fini.

**Code CI contrôlé : `611870b1db49f02edf2ded8e6772ae2e98b38874`.** Branche dédiée issue de #266 `60de6499`, aucun changement applicatif.

## Correction

- Types et **suite complète**, d’un côté ; Theme Check, build et recettes natives, de l’autre, sur deux machines indépendantes. Le job Docker existant est conservé.
- Les **26 commandes de recettes compilées**, leur ordre, leurs gardes réseau et leurs artefacts sont identiques. Toutes les autres commandes précédentes sont conservées ; seul le bootstrap `npm ci`/ffmpeg est dupliqué entre machines. **Un seul build hôte**, plus le build Docker déjà existant.
- Le statut requis garde exactement son nom `Typecheck, tests, Theme Check, build`. Il attend les deux branches de vérification **et Docker**. Échec, annulation, saut ou résultat absent : verdict refusé. Aucun `continue-on-error`, contrôle supprimé ou délai augmenté pour faire passer la suite.

Le gain de durée reste une **estimation tirée de l’ancien journal**, pas une durée nouvelle mesurée. Une CI complète sur la tête publiée reste indispensable.

## Vérifications et limites

**6 tests ciblés / 3 fichiers**, types et `git diff --check` réussis. Comparaison YAML avant/après : aucune commande perdue, Docker inchangé, un seul build hôte. Le test du verdict exerce les résultats non réussis sur chacune des trois dépendances. [Preuves](211_CI_CONTROLES_SEPARES_PREUVES.json).

```bash
node node_modules/vitest/vitest.mjs run tests/ci211-verdict-complet.test.ts tests/ci-native-social-placement.test.ts tests/ci-native-production-placement.test.ts
node node_modules/typescript/bin/tsc --noEmit
git diff --check
```

Le code `src/`/`worker/` est inchangé : le build et les preuves E9 `cf6e630e` sont réutilisés, sans refaire ses captures ni ses générations simulées. Pas de seconde suite complète locale ; la nouvelle CI complète reste en attente à la livraison. Le résultat annulé de #264 n’est pas rebaptisé « vert ».

## Incident de test et remise en état

Le premier test local sélectionnait la première commande du workflow lorsqu’il cherchait le nouveau verdict encore absent. Il a exécuté `npm ci` et retiré les dépendances générées partagées de l’environnement de travail. **Aucun code, fichier de verrouillage, donnée, média ou configuration client modifié.** Le test corrigé exige le nom exact du verdict et refuse toute commande autre que les trois comparaisons de statuts avant de lancer le shell.

Les dépendances ont été restaurées aux versions exactes du même verrouillage dans le volume temporaire disposant d’assez de place, puis les liens des copies ont été rétablis. Next, TypeScript, YAML, Sharp, SQLite natif et ONNX CPU se chargent ; aucun modèle ni inférence ONNX lancé, aucune nouvelle activation CUDA. Dépôt principal propre ; **14 tests natifs du mode original repassés** après restauration. Les essais d’installation interrompus et leur cause sont documentés dans les preuves, sans être présentés comme réussis.

**Zéro appel fournisseur IA réel, coût IA réel nul.** Aucun nouveau rendu, merge, déploiement, activation, changement de main ou de branche Claude. Cette PR prépare le contrôle commun du cumul ; elle ne termine ni #211 ni les CI parentes encore en attente.
