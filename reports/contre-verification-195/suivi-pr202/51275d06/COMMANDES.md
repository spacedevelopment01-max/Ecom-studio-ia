# Commandes et attribution des vérifications

Copie détachée : `/tmp/ecs-202-candidat-51275d06`, source `51275d063b6ee93301ea20438a9ee6100515e3f5`. Dépendances du verrou exact, données fictives dans des répertoires temporaires distincts, aucune configuration client. Les scripts `contre-verification-202-*` sont des harnais indépendants non suivis, publiés ici en texte ; le code applicatif suivi reste intact.

## Build et nouveau contrôle officiel

```bash
NODE_OPTIONS='--max-old-space-size=3072 --import=/tmp/ecs-202-candidat-51275d06/scripts/lot9/network-guard.mjs' npm run build
```

Résultat : [build.log](build.log), sortie [0](build.exit). Le secret applicatif utilisé est fictif et propre à l'essai.

```bash
PROBE_202_MODE=deny PROBE_202_DENY_DOC_CACHE=1 \
PROBE_202_TRACE=/tmp/ecs-202-preuves/51275d06/smoke-officiel-trace.jsonl \
NODE_OPTIONS='--max-old-space-size=1536 --import=/tmp/ecs-202-candidat-51275d06/scripts/lot9/network-guard.mjs --import=/tmp/ecs-202-candidat-51275d06/scripts/contre-verification-202-network.mjs' \
./node_modules/.bin/tsx scripts/export-shopify-build-check.ts /tmp/ecs-202-preuves/51275d06/smoke-officiel
```

Le même script officiel a été copié sans modification et exécuté sur le build antérieur `5a372b6c`, avec la seule garde réseau : **sortie 1 attendue**, contrôle absent et `undefined.resolve`. Voir [smoke-comparaison.json](smoke-comparaison.json). Ce témoin négatif n'est pas un échec non résolu de 51275.

## Parcours compilés indépendants

```bash
PROBE_EXPECTED_COMMIT=51275d063b6ee93301ea20438a9ee6100515e3f5 \
PROBE_STAGE=before_merge_candidate \
PROBE_202_MODE=deny PROBE_202_DENY_DOC_CACHE=1 \
PROBE_202_TRACE=/tmp/ecs-202-preuves/51275d06/production-finale-trace.jsonl \
NODE_OPTIONS='--max-old-space-size=1536 --import=/tmp/ecs-202-candidat-51275d06/scripts/lot9/network-guard.mjs --import=/tmp/ecs-202-candidat-51275d06/scripts/contre-verification-202-network.mjs' \
./node_modules/.bin/tsx scripts/contre-verification-202-parcours.mts /tmp/ecs-202-preuves/51275d06/production
```

Le harnais refuse une copie contenant des fichiers d'environnement d'exploitation ou des sélecteurs de base/stockage préexistants. Compte client, forfait fictif, produit et véritable service, clics normaux dans le Studio à 1440/390, route d'export locale réelle, téléchargement du fichier sauvegardé et vérification de son empreinte. Aucune génération ni installation CMS.

## Suite locale exhaustive

```bash
PATH="/tmp/ecs-195-php84-complet/bin:$PATH" \
NODE_OPTIONS='--max-old-space-size=1536 --import=/tmp/ecs-202-candidat-51275d06/scripts/lot9/network-guard.mjs' \
./node_modules/.bin/vitest run --maxWorkers=2 \
  --reporter=default --reporter=json \
  --outputFile=/tmp/ecs-202-preuves/51275d06/suite-complete.json
```

Journal et code de sortie conservés séparément. La garde réseau native suffit ici ; aucune double de `node-fetch` n'est injectée dans cette suite. Les tests fournisseurs utilisent leurs simulations locales. PHP CLI est un outil de vérification du code exporté, pas une connexion CMS.

## Documents, avertissements et CI

- `tsx scripts/contre-verification-202-docs.mts` : 7 ressources et 13 schémas, JSON valide et octets identiques à la dépendance installée ; [résultat](docs-validation.json).
- `tsx scripts/theme-check.ts /tmp/ecs-202-preuves/51275d06/theme-natif atelier`, sous garde réseau et cache interdit : [journal natif](theme-check.log), sortie 0. Témoin du main d2fb avec documentation locale vérifiée, SDK identique, cache privé : [baseline-warnings.log](baseline-warnings.log).
- Le harnais de rendu `contre-verification-202-html.mts` appelle le moteur natif pour les quatre branches du formulaire ; le contrôle porte sur le HTML brut, avant toute réparation par un navigateur.
- La CI [40362506971](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40362506971) est une exécution GitHub indépendante, sur checkout synthétique `d50cd5f0f3e4f1ed30f0e325a86eab553e8d7e7f`, **arbre identique** au candidat. [Identité et résultats](ci-identite.json), [journal principal](ci-principale.log), [Docker](ci-docker.log). Ses 205 contrôles natifs sont attribués à la CI, pas présentés comme une nouvelle matrice locale de 51275.

Les commandes sont documentées pour comprendre et rejouer les preuves dans une copie isolée. Elles ne doivent pas être copiées dans un studio client en production. Aucun accès fournisseur réel n'est nécessaire.
