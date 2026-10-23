#!/usr/bin/env bash
# Lot 1 (issue #163, action 03) — rejoue tous les essais de migration et de restauration sur des bases historiques
# SYNTHÉTIQUES, fabriquées avec le code de trois époques :
#   dcfc13b1 : juste avant les forfaits V2 (11 octobre 2026, schéma « par compte », clés étrangères vers users) ;
#   d97e0b95 : main du 20 octobre (dernière version connue du Codespace de Thomas) ;
#   0a6aa1dd : main actuel après l'intégration #162 (angles marketing et stratégie).
# puis les ouvre avec chaque code à tester (par défaut : ce dépôt).
#
#   scripts/lot1/essais-historiques.sh <dossier de travail vide> <rapports> [code à tester…]
#
# Exige l'historique Git complet (`git fetch --unshallow`). Ne touche jamais ./data ni DATA_DIR ; aucun réseau,
# aucun site ni worker lancé.
set -euo pipefail
repo="$(cd "$(dirname "$0")/../.." && pwd)"
work="${1:?dossier de travail}"; reports="${2:?dossier des rapports}"; shift 2
codes=("$@"); [ ${#codes[@]} -gt 0 ] || codes=("$repo")
mkdir -p "$work" "$reports"
[ -z "$(ls -A "$work")" ] || { echo "$work n'est pas vide" >&2; exit 1; }
tsx="$repo/node_modules/.bin/tsx"
for c in dcfc13b1 d97e0b95 0a6aa1dd; do
  wt="$work/code-$c"
  git -C "$repo" worktree add -q --detach "$wt" "$c"
  ln -s "$repo/node_modules" "$wt/node_modules"
  LOT1_COMMIT="$(git -C "$repo" rev-parse "$c")" env -u DATA_DIR -u DATABASE_FILE -u STORAGE_DIR "$tsx" "$repo/scripts/lot1/base-historique.ts" --code "$wt" --out "$work/base-$c" > "$reports/fabrication-$c.json"
  for code in "${codes[@]}"; do
    name="$(git -C "$code" rev-parse --short=8 HEAD)"
    env -u DATA_DIR -u DATABASE_FILE -u STORAGE_DIR "$tsx" "$repo/scripts/lot1/essai-complet.ts" --source "$work/base-$c" --code "$code" \
      --travail "$work/essai-$c-par-$name" --rapport "$reports/essai-base-$c-code-$name.json" | tail -1
  done
  git -C "$repo" worktree remove --force "$wt"
done
