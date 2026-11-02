#!/usr/bin/env bash
# Reconstruit la publicité « Je suis peintre, pas informaticien ! » à partir des ressources livrées, SANS aucun appel payant.
# À lancer depuis ce dossier « projet ». Nécessite ffmpeg, Python 3 + numpy + opencv-python-headless, Node (npx hyperframes).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
# 1. Plan « commentaire » : corps figé sur la bulle, tête qui parle (le modèle relevait le bras vers le cœur)
python3 figer_corps.py av/A6/sortie-1.mp4 9 av/A6fix/sortie-1.mp4 235 405 140 195
# 2. Plan de montage (40,000 s), repères de la composition (film/assets/timing.js), piste voix
python3 montage.py plan > build/plan.txt
# 3. Images 1080 × 1920, 30 i/s, étalonnées (brouillon de publication posé sur l'écran du téléphone)
python3 montage.py images
# 4. Mixage voix + bruitages + musique (voix au premier plan, -15 LUFS) et pistes séparées ; sous-titres SRT
python3 mixer.py
python3 mixer.py stems
python3 sous_titres.py build/sous-titres.srt
# 5. Rendu HyperFrames (sous-titres, téléphone, écrans fictifs, Syna, logo officiel)
( cd film && HYPERFRAMES_NO_TELEMETRY=1 npx hyperframes render -q delivery --fps 30 -o ../build/rendu-hyperframes.mp4 )
# 6. Fichier de diffusion (exactement 1200 images = 40,000 s) et prévisualisation légère
ffmpeg -v error -y -i build/rendu-hyperframes.mp4 -frames:v 1200 -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -t 40 -movflags +faststart build/je-suis-peintre-pas-informaticien-1080x1920.mp4
ffmpeg -v error -y -i build/je-suis-peintre-pas-informaticien-1080x1920.mp4 -vf scale=540:960 -c:v libx264 -crf 27 -preset medium \
  -c:a aac -b:a 96k -movflags +faststart build/previsualisation-legere-540x960.mp4
# 7. Prévisualisation de contrôle TikTok : vrais boutons de la capture superposés (jamais dans le film final)
ffmpeg -v error -y -i build/je-suis-peintre-pas-informaticien-1080x1920.mp4 -i ref/boutons.png -i ../controle/pointage/bandeau-controle.png \
  -filter_complex "[0:v][1]overlay=0:0[a];[a][2]overlay=0:0[v]" -map "[v]" -map 0:a -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy \
  -movflags +faststart build/previsualisation-tiktok-1080x1920.mp4
echo "terminé : build/je-suis-peintre-pas-informaticien-1080x1920.mp4"
