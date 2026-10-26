#!/usr/bin/env bash
# Vérification du thème Shopify, comme la CI GitHub (.github/workflows/ci.yml), lancée en local avant d'envoyer.
#
#   scripts/verify-theme.sh            complet : 30 thèmes FR et EN, multi-produit et niche, services FR et EN, ZIP client
#   scripts/verify-theme.sh --rapide   échantillon : 5 thèmes (produits FR, EN, multi, services FR/EN) + ZIP
#
# Sortie : une ligne par cas (✓ ou ✗) ; le détail des erreurs Theme Check des cas en échec ; code de sortie 1 s'il y en a.
set -u
cd "$(dirname "$0")/.."

ALL="$(npx tsx scripts/list-directions.ts)"
MULTI="atelier brut gourmand flux vitrine lookbook marche tribu"
if [ "${1:-}" = "--rapide" ]; then ALL="atelier pop galerie vitrine cinema"; MULTI="atelier vitrine"; fi

TMP="$(mktemp -d "${TMPDIR:-/tmp}/verify-theme-XXXX")"
FAIL=0
# Documents Shopify de Theme Check figés et servis en local (scripts/theme-docs-local.mjs) : plus de téléchargement à
# chaque cas, ni de cache partagé entre processus parallèles (cause des faux « ValidSchema » intermittents en CI).
node scripts/theme-docs-local.mjs "$TMP/shopify-docs" || { echo "✗ Documents Shopify de Theme Check illisibles"; rm -rf "$TMP"; exit 1; }
export SHOPIFY_TLD_ROOT="$TMP/shopify-docs"
# Cas vérifiés en parallèle (JOBS à la fois, 4 par défaut) ; résultats affichés dans l'ordre à la fin.
JOBS="${JOBS:-4}"
N=0
run() { # numéro, libellé, variables d'environnement…, -- arguments de theme-check.ts
  local n="$1" label="$2"; shift 2
  local envs=(); while [ "$1" != "--" ]; do envs+=("$1"); shift; done; shift
  local log="$TMP/$n.log" out="$TMP/$n.out"
  if env "${envs[@]}" XDG_CACHE_HOME="$TMP/cache-$n" npx tsx scripts/theme-check.ts "$@" >"$log" 2>&1; then
    echo "✓ $label  (aucune erreur, $(grep -o 'Total [0-9]*' "$log" | head -1 | cut -d' ' -f2) avertissement(s))" >"$out"
  else
    touch "$TMP/failed"; { echo "✗ $label"; grep -E "^ERROR|Error|error TS" "$log" | head -20 | sed 's/^/    /'; } >"$out"
    # Sur GitHub Actions, le cas en échec devient aussi une annotation (lisible sur la PR et par l'API, sans le journal).
    if [ -n "${GITHUB_ACTIONS:-}" ]; then
      echo "::error title=Theme Check ${label}::$( (grep -E "^ERROR|Error|error TS" "$log" | head -8; tail -4 "$log") | tr '\n' '|' | sed 's/%/%25/g' | cut -c1-1500)" >>"$out"
    fi
  fi
}
spawn() {
  while [ "$(jobs -rp | wc -l)" -ge "$JOBS" ]; do wait -n; done
  N=$((N + 1)); run "$(printf '%04d' "$N")" "$@" &
}

for d in $ALL; do spawn "$d (fr)" LANG_THEME=fr -- "$TMP/fr-$d" "$d"; done
for d in $ALL; do spawn "$d (en)" LANG_THEME=en -- "$TMP/en-$d" "$d"; done
for d in $MULTI; do for t in multi niche; do spawn "$d / $t" LANG_THEME=fr -- "$TMP/$d-$t" "$d" "$t"; done; done
for d in $ALL; do for l in fr en; do spawn "$d / services ($l)" BUSINESS=services LANG_THEME=$l -- "$TMP/svc-$l-$d" "$d"; done; done
wait
cat "$TMP"/*.out
[ -e "$TMP/failed" ] && FAIL=1

if XDG_CACHE_HOME="$TMP/cache-zip" npx tsx scripts/theme-check-zip.ts "$TMP/zip" >"$TMP/zip.log" 2>&1; then echo "✓ ZIP client (section sur mesure)"; else
  FAIL=1; echo "✗ ZIP client"; tail -20 "$TMP/zip.log" | sed 's/^/    /'
  [ -n "${GITHUB_ACTIONS:-}" ] && echo "::error title=Theme Check ZIP client::$(tail -8 "$TMP/zip.log" | tr '\n' '|' | sed 's/%/%25/g' | cut -c1-1500)"
fi

rm -rf "$TMP"
if [ $FAIL = 0 ]; then echo "Thème : tout est valide."; else echo "Thème : des erreurs sont à corriger (détail ci-dessus)."; fi
exit $FAIL
