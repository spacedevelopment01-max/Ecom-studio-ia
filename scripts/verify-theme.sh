#!/usr/bin/env bash
# Vérification du thème Shopify, comme la CI GitHub (.github/workflows/ci.yml), lancée en local avant d'envoyer.
#
#   scripts/verify-theme.sh            complet : 11 directions FR et EN, multi-produit et niche, services FR et EN, ZIP client
#   scripts/verify-theme.sh --rapide   échantillon : 3 directions (produits FR, EN, multi, services FR/EN) + ZIP
#
# Sortie : une ligne par cas (✓ ou ✗) ; le détail des erreurs Theme Check des cas en échec ; code de sortie 1 s'il y en a.
set -u
cd "$(dirname "$0")/.."

ALL="atelier clinique brut terroir nocturne pop galerie elan flux joaillerie gourmand"
MULTI="atelier brut gourmand flux"
if [ "${1:-}" = "--rapide" ]; then ALL="atelier pop galerie"; MULTI="atelier"; fi

TMP="$(mktemp -d "${TMPDIR:-/tmp}/verify-theme-XXXX")"
FAIL=0
run() { # libellé, variables d'environnement…, -- arguments de theme-check.ts
  local label="$1"; shift
  local envs=(); while [ "$1" != "--" ]; do envs+=("$1"); shift; done; shift
  local log="$TMP/$(echo "$label" | tr ' /' '__').log"
  if env "${envs[@]}" npx tsx scripts/theme-check.ts "$@" >"$log" 2>&1; then
    echo "✓ $label  (aucune erreur, $(grep -o 'Total [0-9]*' "$log" | head -1 | cut -d' ' -f2) avertissement(s))"
  else
    FAIL=1; echo "✗ $label"; grep -E "^ERROR|Error|error TS" "$log" | head -20 | sed 's/^/    /'
  fi
}

for d in $ALL; do run "$d (fr)" LANG_THEME=fr -- "$TMP/fr-$d" "$d"; done
for d in $ALL; do run "$d (en)" LANG_THEME=en -- "$TMP/en-$d" "$d"; done
for d in $MULTI; do for t in multi niche; do run "$d / $t" LANG_THEME=fr -- "$TMP/$d-$t" "$d" "$t"; done; done
for d in $ALL; do for l in fr en; do run "$d / services ($l)" BUSINESS=services LANG_THEME=$l -- "$TMP/svc-$l-$d" "$d"; done; done

if npx tsx scripts/theme-check-zip.ts "$TMP/zip" >"$TMP/zip.log" 2>&1; then echo "✓ ZIP client (section sur mesure)"; else FAIL=1; echo "✗ ZIP client"; tail -20 "$TMP/zip.log" | sed 's/^/    /'; fi

rm -rf "$TMP"
if [ $FAIL = 0 ]; then echo "Thème : tout est valide."; else echo "Thème : des erreurs sont à corriger (détail ci-dessus)."; fi
exit $FAIL
