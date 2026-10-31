#!/bin/bash
# Recette complète #232 sur l'instance isolée (comptes et sites fictifs, proxy HTTPS local).
cd "$(dirname "$0")"
set -o pipefail
step() { local n="logs/$(basename "$1" .mjs)-${@: -1}.txt"; [ "$#" -gt 2 ] && n="logs/$(basename "$1" .mjs)-$4.txt"; echo "=== $*"; timeout 900 node "$@" > "$n" 2>&1 && echo "ok" || { echo "ÉCHEC"; tail -15 "$n"; }; }
mkdir -p logs
step r1-publier.mjs s1
step r2-visiteur.mjs artisan atelier-cle-de-fa.sites.recette.test s1 1
step r6-comparer.mjs artisan atelier-cle-de-fa.sites.recette.test s1 /,/pages/prestations,/pages/contact
step r3-versions.mjs s1
step r4-reservation.mjs s2
step r4b-reserver.mjs s2
step r2-visiteur.mjs reservation cabinet-souffle.sites.recette.test s2 0
step r6-comparer.mjs reservation cabinet-souffle.sites.recette.test s2 /,/pages/prendre-rendez-vous
step r5-publier-simple.mjs agence s3
step r2-visiteur.mjs agence agence-horizon-conseil.sites.recette.test s3 1
step r6-comparer.mjs agence agence-horizon-conseil.sites.recette.test s3 /,/pages/contact
