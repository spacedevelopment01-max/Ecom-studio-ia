#!/usr/bin/env bash
# Interpréteur de test facultatif : placer un lien « php » vers ce fichier dans un dossier du PATH.
# Précharger l'image indiquée ; le conteneur exécuté ne dispose d'aucun réseau.
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
exec env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
  docker --host=unix:///var/run/docker.sock run --rm -i --pull=never --network=none --read-only \
  --cap-drop=ALL --security-opt=no-new-privileges --memory=256m --cpus=1 --pids-limit=128 \
  --user "$(id -u):$(id -g)" --mount "type=bind,src=$root,dst=$root,readonly" \
  --mount type=bind,src=/tmp,dst=/tmp,readonly --workdir "$root" \
  php@sha256:8dbeb51c352cf1f70d5d50f3642c9fbed311e914475ea2382f5bc1525bef7bb3 php "$@"
