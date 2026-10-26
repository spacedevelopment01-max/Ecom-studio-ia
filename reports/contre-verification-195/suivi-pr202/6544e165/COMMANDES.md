# Commandes effectivement utilisées —6544e165

Copie détachée `/tmp/ecs-202-candidat-6544e165`, verrou exact, lien vers les dépendances installées de la précédente contre-vérification, aucun `.env` client. Les harnais `*.txt` de ce dossier ont été copiés sous `scripts/` avec leur extension d'origine ; leurs chemins absolus doivent être adaptés pour une autre expérience. Garde réseau native ET double documentaire préchargées. Valeur APP_SECRET fictive uniquement pour les tests.

```bash
cd /tmp/ecs-202-candidat-6544e165
export NODE_OPTIONS='--max-old-space-size=1536 --import=/tmp/ecs-202-candidat-6544e165/scripts/lot9/network-guard.mjs --import=/tmp/ecs-202-candidat-6544e165/scripts/contre-verification-202-network.mjs'

# Témoin : le vrai Studio ne doit plus télécharger, même sous réponse vide simulée.
PROBE_202_MODE=empty-preset \
PROBE_202_TRACE=/tmp/ecs-202-preuves/6544e165/runtime-valide-trace.jsonl \
XDG_CACHE_HOME=/tmp/ecs-202-preuves/6544e165/cache-valide \
./node_modules/.bin/tsx scripts/contre-verification-202-runtime.ts /tmp/ecs-202-preuves/6544e165/runtime-valide.json

# Défaut : seule lecture du preset embarqué substituée, aucun fichier partagé vidé.
PROBE_202_MODE=deny PROBE_202_CORRUPT_BUNDLED=1 \
PROBE_202_TRACE=/tmp/ecs-202-preuves/6544e165/runtime-bundle-vide-trace.jsonl \
XDG_CACHE_HOME=/tmp/ecs-202-preuves/6544e165/cache-bundle-vide \
./node_modules/.bin/tsx scripts/contre-verification-202-runtime.ts /tmp/ecs-202-preuves/6544e165/runtime-bundle-vide.json

# Trois appels concurrents : deux valides, un Liquid invalide.
PROBE_202_MODE=deny \
PROBE_202_TRACE=/tmp/ecs-202-preuves/6544e165/runtime-concurrence-trace.jsonl \
XDG_CACHE_HOME=/tmp/ecs-202-preuves/6544e165/cache-concurrence \
./node_modules/.bin/tsx scripts/contre-verification-202-concurrence.ts

# Vrai schéma de section invalide, documents complets.
PROBE_202_MODE=deny PROBE_202_INVALID=schema \
PROBE_202_TRACE=/tmp/ecs-202-preuves/6544e165/runtime-schema-invalide-trace.jsonl \
./node_modules/.bin/tsx scripts/contre-verification-202-runtime.ts /tmp/ecs-202-preuves/6544e165/runtime-schema-invalide.json

# Racine documentaire déjà fournie : deux processus, simple chargement sans check/cache écrit.
for n in 1 2; do
  env -u XDG_CACHE_HOME SHOPIFY_TLD_ROOT=/tmp/ecs-202-preuves/docs-valides \
  PROBE_202_PROVIDED=1 PROBE_202_MODE=deny \
  PROBE_202_TRACE=/tmp/ecs-202-preuves/6544e165/cache-explicite-$n-trace.jsonl \
  ./node_modules/.bin/tsx scripts/contre-verification-202-cache.ts /tmp/ecs-202-preuves/6544e165/cache-explicite-$n.json
done

# Suite native ciblée, PHPCLI isolé déjà installé, aucun navigateur concurrent.
APP_SECRET=countercheck-202-fictitious-secret PATH="/tmp/ecs-195-php84-complet/bin:$PATH" \
PROBE_202_MODE=deny PROBE_202_TRACE=/tmp/ecs-202-preuves/6544e165/tests-cibles-trace.jsonl \
./node_modules/.bin/vitest run tests/theme-check-docs-locaux.test.ts tests/theme-v2.test.ts tests/site-reproduce.test.ts tests/cms-v2.test.ts \
  --maxWorkers=2 --reporter=json --outputFile=/tmp/ecs-202-preuves/6544e165/tests-cibles.json

# Types (tas3GiB), sortie0.
PROBE_202_MODE=deny NODE_OPTIONS='--max-old-space-size=3072 --import=/tmp/ecs-202-candidat-6544e165/scripts/lot9/network-guard.mjs --import=/tmp/ecs-202-candidat-6544e165/scripts/contre-verification-202-network.mjs' \
./node_modules/.bin/tsc --noEmit

# Préparation native,20JSON ensuite comparés byte-à-byte à la dépendance installée.
PROBE_202_MODE=deny ./node_modules/.bin/tsx scripts/theme-docs-local.ts /tmp/ecs-202-preuves/6544e165/docs-validation

# Vrai wrapper rapide : un seul fichier temporaire compilé rendu Liquid invalide.
APP_SECRET=countercheck-202-fictitious-secret PROBE_202_MODE=deny PROBE_202_INVALID_EXPORT=1 \
PROBE_202_TRACE=/tmp/ecs-202-preuves/6544e165/shell-erreur-liquid-trace.jsonl \
TMPDIR=/tmp/ecs-202-preuves/6544e165 JOBS=4 GITHUB_ACTIONS=true \
bash scripts/verify-theme.sh --rapide

# Vrai wrapper : document embarqué illisible, sortie1 avant la matrice.
APP_SECRET=countercheck-202-fictitious-secret PROBE_202_MODE=deny PROBE_202_CORRUPT_BUNDLED=1 \
PROBE_202_TRACE=/tmp/ecs-202-preuves/6544e165/shell-doc-vide-trace.jsonl \
TMPDIR=/tmp/ecs-202-preuves/6544e165 bash scripts/verify-theme.sh --rapide

# Contrôle statique d'exportCMS natif, base et ZIP fictifs, aucune installationCMS.
APP_SECRET=countercheck-202-fictitious-secret DATA_DIR=/tmp/ecs-202-preuves/6544e165/cms-data-fictives \
PROBE_202_MODE=deny PROBE_202_CORRUPT_BUNDLED=1 \
PROBE_202_TRACE=/tmp/ecs-202-preuves/6544e165/cms-doc-vide-trace.jsonl \
./node_modules/.bin/tsx scripts/contre-verification-202-cms.ts /tmp/ecs-202-preuves/6544e165/cms-doc-vide.json
```

Chaque commande a été journalisée avec sa sortie réelle dans les `.log`/`.exit` correspondants. Les échecs attendus sont explicitement décrits ; ne pas exécuter ce bloc comme un script qui devrait intégralement sortir0. Les deux sondes de résolution de cache n'appellent pas `check()`. Les réponses HTTP évoquées sont des doubles locales ; aucun test fournisseur réel ni accès client.
