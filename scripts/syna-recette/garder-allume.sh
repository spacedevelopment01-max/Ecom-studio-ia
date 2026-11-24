#!/usr/bin/env bash
# Gardien du Studio privé d'essai : le relance tout seul s'il s'arrête (la machine d'essai arrête parfois les
# programmes qui tournent en fond). Le vrai Studio en ligne n'en a pas besoin : ce script ne sert qu'aux essais.
#
# Une création coupée reprend toute seule à sa dernière étape faite, sans repayer ce qui est fait (bail des tâches de
# 90 secondes). Un appel payant coupé en plein milieu n'est jamais relancé d'office (règle du propriétaire) : la
# création s'arrête alors avec son explication, et se reprend à la demande.
#
# Usage (depuis la racine du dépôt) :
#   DATA_DIR=<dossier> COMPTES="email:nom:forfait" bash scripts/syna-recette/garder-allume.sh <journal>
# Il tourne jusqu'à ce qu'on l'arrête ; chaque relance est écrite dans le journal.
#
# Garde-fou de dépense d'un essai réel : ajouter STUDIO_ESSAI_PLAFOND_EUROS=1 devant la commande (1 € pour tout
# l'essai). Au-delà, l'appel payant est refusé avant de partir et SINA dit que le plafond de l'essai est atteint. Le
# début de l'essai est gardé dans <DATA_DIR>/essai-debut.txt (les relances continuent la même somme) ; pour un nouvel
# essai, effacer ce fichier. Détail : scripts/syna-recette/lancer-agent.mts et src/lib/ai/plafond-essai.ts.
#   STUDIO_ESSAI_PLAFOND_EUROS=1 DATA_DIR=<dossier> COMPTES="…" bash scripts/syna-recette/garder-allume.sh <journal>
set -u
JOURNAL="${1:-studio-garde.log}"
PORT="${PORT492:-3493}"
: "${DATA_DIR:?DATA_DIR manquant (dossier du Studio privé)}"
export NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS="${NODE_EXTRA_CA_CERTS:-/root/.ccr/ca-bundle.crt}" PORT492="$PORT"
repond() { curl -s -o /dev/null --max-time 5 "http://localhost:${PORT}/"; }
lancer() {
  echo "$(date -u +%H:%M:%S) relance du Studio privé" >> "$JOURNAL"
  pkill -f "next start -p ${PORT}" 2>/dev/null; pkill -f "worker/index.ts" 2>/dev/null
  # Le serveur de Next change de nom en route (« next-server ») : celui qui tient encore le port est arrêté aussi
  # (essai du 19 novembre 2026 : l'ancien serveur gardait le port, la relance échouait en boucle, sans travailleur).
  for pid in $(ss -ltnp 2>/dev/null | grep ":${PORT} " | grep -o "pid=[0-9]*" | cut -d= -f2); do kill "$pid" 2>/dev/null; done
  sleep 2
  setsid nohup node_modules/.bin/tsx scripts/syna-recette/lancer-agent.mts >> "$JOURNAL" 2>&1 < /dev/null &
  for _ in $(seq 1 45); do repond && { echo "$(date -u +%H:%M:%S) Studio privé prêt" >> "$JOURNAL"; return 0; }; sleep 2; done
  echo "$(date -u +%H:%M:%S) le Studio privé ne répond pas après 90 secondes" >> "$JOURNAL"
}
repond || lancer
while true; do
  sleep 15
  # Le site répond, mais le travailleur des tâches de fond doit aussi tourner : sans lui, aucune création n'avance.
  if ! repond || ! pgrep -f "worker/index.ts" > /dev/null; then lancer; fi
done
