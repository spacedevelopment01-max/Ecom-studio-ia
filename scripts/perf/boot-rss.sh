#!/usr/bin/env bash
# Mémoire du site en production : au démarrage, puis après des requêtes simples (pages publiques et API 401).
dir="$1"; port="$2"
d=$(mktemp -d "${TMPDIR:-/tmp}/rss-XXXX")
cd "$dir" && DATA_DIR="$d" APP_SECRET="$(head -c 32 /dev/urandom | base64)" node_modules/.bin/next start -p "$port" > "$d/log" 2>&1 &
pid=$!
for i in $(seq 1 60); do curl -s -o /dev/null "http://localhost:$port/connexion" && break; sleep 0.5; done
sleep 2
rss() { ps -o rss= --ppid $pid --pid $pid | awk '{s+=$1} END {print int(s/1024)}'; }
echo "après démarrage (1 page) : $(rss) Mo"
t0=$(date +%s%N)
for i in $(seq 1 20); do curl -s -o /dev/null "http://localhost:$port/"; done
t1=$(date +%s%N)
echo "page d'accueil : $(( (t1-t0)/20000000 )) ms en moyenne (20 requêtes)"
for r in /api/projects /api/billing /api/notifications /studio /admin /connexion /inscription; do for i in $(seq 1 5); do curl -s -o /dev/null "http://localhost:$port$r"; done; done
echo "après 55 requêtes variées : $(rss) Mo"
pkill -P $pid 2>/dev/null; kill $pid 2>/dev/null; sleep 1; rm -rf "$d"
