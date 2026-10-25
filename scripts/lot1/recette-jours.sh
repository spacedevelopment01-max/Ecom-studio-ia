#!/usr/bin/env bash
# Lot 1 (issue #163) — rejoue des tests en fixant la date du jour sur chacun des 7 jours de la semaine, pour débusquer
# les tests (ou les règles) qui dépendent du jour où ils tournent. Aucun fichier suivi n'est modifié : deux fichiers
# temporaires sont créés à la racine puis supprimés.
#
#   scripts/lot1/recette-jours.sh [dossier du code] [fichiers de tests…]
# Sans fichier : tests des publications, du calendrier, des quotas, du blog et des forfaits.
set -euo pipefail
root="$(cd "${1:-$(dirname "$0")/../..}" && pwd)"; shift || true
cd "$root"
files=("$@")
if [ ${#files[@]} -eq 0 ]; then
  mapfile -t files < <(ls tests/*.test.ts | grep -E "social|calendrier|autopilot|publication|planner|scheduler|posts|blog|quota|forfait|mission150" | grep -v "lot1-")
fi
cat > lot1-fake-date.tmp.ts <<'EOF'
import { vi } from "vitest";
const d = process.env.LOT1_FAKE_DATE;
if (d) {
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
  vi.setSystemTime(new Date(d));
}
EOF
cat > vitest.lot1-jours.tmp.config.ts <<'EOF'
import { mergeConfig } from "vitest/config";
import base from "./vitest.config";
export default mergeConfig(base, { test: { setupFiles: ["./lot1-fake-date.tmp.ts"] } });
EOF
trap 'rm -f lot1-fake-date.tmp.ts vitest.lot1-jours.tmp.config.ts' EXIT
failed=0
echo "Code : $(git rev-parse --short=8 HEAD) — ${#files[@]} fichiers"
for d in 2026-10-26 2026-10-27 2026-10-28 2026-10-29 2026-10-30 2026-10-31 2026-11-01; do
  if out=$(LOT1_FAKE_DATE="${d}T09:00:00Z" npx vitest run --config vitest.lot1-jours.tmp.config.ts "${files[@]}" 2>&1); then s=OK; else s=ÉCHEC; failed=1; fi
  echo "$d ($(date -d "$d" +%A)) : $s — $(grep -E '^\s+Tests ' <<<"$out" | tr -s ' ')"
  grep -E "^ FAIL " <<<"$out" | sort -u || true
done
exit "$failed"
