# Commandes de la contre-vérification du main final

Copie détachée : `/tmp/ecs-202-main-final-a2d00fcb` ; SHA `a2d00fcbc5c2bdf7d7712a8d34373854dc953619`. Aucune configuration d'exploitation copiée ; données, comptes et abonnements fictifs. Node local 24.19.0, tsx 4.23.15, dépendances du verrou exact. Les harnais sont publiés en texte, pas intégrés au code applicatif.

## Types et build

Avec `APP_SECRET` fictif, garde réseau native et mémoire maximale 3072 Mo :

```bash
export APP_SECRET=countercheck-only-fictitious-test-secret
NODE_OPTIONS='--max-old-space-size=3072 --import=/tmp/ecs-202-main-final-a2d00fcb/scripts/lot9/network-guard.mjs' npm run typecheck
NODE_OPTIONS='--max-old-space-size=3072 --import=/tmp/ecs-202-main-final-a2d00fcb/scripts/lot9/network-guard.mjs' npm run build
```

Résultats séparés : `types.log/types.exit`, `build.log/build.exit`. Les sources applicatives suivies restent intactes.

## Contrôle officiel du build compilé, sans double de transport

```bash
APP_SECRET=countercheck-only-fictitious-production-secret \
NODE_OPTIONS='--max-old-space-size=1536 --import=/tmp/ecs-202-main-final-a2d00fcb/scripts/lot9/network-guard.mjs' \
./node_modules/.bin/tsx scripts/export-shopify-build-check.ts /tmp/ecs-202-preuves/apres-main-final-a2d00fcb/smoke-officiel
```

Version servie contrôlée dans le résultat : a2/compiled-build, export HTTP 200, Theme Check mesuré à 0 erreur et 35 avertissements.

## Parcours client indépendant : produit et service

```bash
APP_SECRET=countercheck-only-fictitious-production-secret \
PROBE_EXPECTED_COMMIT=a2d00fcbc5c2bdf7d7712a8d34373854dc953619 \
PROBE_STAGE=after_merge_final_main \
PROBE_202_MODE=deny PROBE_202_DENY_DOC_CACHE=1 \
PROBE_202_TRACE=/tmp/ecs-202-preuves/apres-main-final-a2d00fcb/production-trace.jsonl \
NODE_OPTIONS='--max-old-space-size=1536 --import=/tmp/ecs-202-main-final-a2d00fcb/scripts/lot9/network-guard.mjs --import=/tmp/ecs-202-main-final-a2d00fcb/scripts/contre-verification-202-network.mjs' \
./node_modules/.bin/tsx scripts/contre-verification-202-parcours.mts /tmp/ecs-202-preuves/apres-main-final-a2d00fcb/production
```

Le harnais refuse des fichiers `.env` d'exploitation et des sélecteurs de base/stockage déjà présents ; il exige le SHA et une version `compiled-build`. Vrai compte de rôle client ; activité explicitement `products` puis `services`, abonnement fictif. Ouverture du Studio à 1440/390, introduction fermée par clic et onglet Aperçu sélectionné normalement sur mobile. La route locale réelle d'export et celle du téléchargement des fichiers sont utilisées ; empreintes des ZIP confrontées, ThemeSpec et versions relus.

## Avertissements et témoin documentaire négatif

`scripts/theme-check.ts /tmp/ecs-202-preuves/apres-main-final-a2d00fcb/theme-natif atelier`, sous la garde réseau et le harnais de refus du cache. Les 35 tuples contrôle/fichier/ligne/message sont confrontés au candidat ; aucun seuil ou contrôle modifié.

Pour le négatif : copie indépendante des documents de `node_modules/@shopify/theme-check-docs-updater/data`, seul son `preset.json` remplacé par le texte invalide simulé `429: Too Many Requests`. Puis même script officiel compilé avec la **seule garde réseau native** et `ES_SHOPIFY_DOCS_DIR` pointant vers cette copie. **Sortie 1 exigée**, version a2, problème « Theme Check arrêté », compteur non mesuré, jamais faux 0 ni indisponibilité. Le JSON et le SHA256 du fichier original du SDK sont vérifiés intacts. Aucune réponse HTTP 429 réelle n'est observée.

## Suite exhaustive sur le SHA final

```bash
APP_SECRET=countercheck-only-fictitious-test-secret \
PATH="/tmp/ecs-195-php84-complet/bin:$PATH" \
NODE_OPTIONS='--max-old-space-size=1536 --import=/tmp/ecs-202-main-final-a2d00fcb/scripts/lot9/network-guard.mjs' \
./node_modules/.bin/vitest run --maxWorkers=2 --reporter=default --reporter=json \
  --outputFile=/tmp/ecs-202-preuves/apres-main-final-a2d00fcb/suite-complete.json
```

Secret applicatif fictif ; aucune double de `node-fetch` injectée dans cette suite. La garde native refuse tout transport fournisseur. Journal, rapport complet et code de sortie sont conservés ; ils ne valent résultat final qu'après fin effective et contrôle de tous les compteurs.

Le cache Webpack de cette seule copie est libéré après le build et les parcours, avant la suite longue ; le serveur compilé est conservé. Aucune base, source ou média client supprimé. Aucune fusion, aucun déploiement et aucun appel fournisseur réel.
