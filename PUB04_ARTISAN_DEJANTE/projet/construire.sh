#!/usr/bin/env bash
# Reconstruit la Publicité 04 « L'artisan complètement déjanté » à partir des ressources livrées, SANS aucun appel payant.
# À lancer depuis ce dossier « projet ». Nécessite ffmpeg, Python 3 + numpy + opencv-python-headless, Node (npx hyperframes).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
# 1. Plans « commentaires » : bras figé sur la bulle, tête qui parle (le modèle relevait le bras vers le cœur)
python3 fix_bras.py av/A5a/sortie-1.mp4 8 av/A5afix/sortie-1.mp4
python3 fix_bras.py av/A5a2/sortie-1.mp4 14 av/A5a2fix/sortie-1.mp4
# 2. Plan de montage (34 plans), repères pour l'habillage (film/assets/timing.js), piste voix posée sur les plans
python3 montage.py plan > build/plan.txt
# 3. Images du film, 1080 × 1920, 30 i/s, étalonnées
python3 montage.py images
# 4. Mixage voix + 58 bruitages + musique, voix au premier plan, -15 LUFS
python3 mixer.py
# 5. Rendu HyperFrames (conversations Syna, logo officiel, titres, avant / après, signature)
( cd film && HYPERFRAMES_NO_TELEMETRY=1 npx hyperframes render -q delivery --fps 30 -o ../build/rendu-hyperframes.mp4 )
# 6. Fichier de diffusion : H.264 + AAC, lecture rapide
ffmpeg -v error -y -i build/rendu-hyperframes.mp4 -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -movflags +faststart build/l-artisan-completement-dejante-1080x1920.mp4
# 7. Prévisualisation de contrôle : vrais boutons TikTok de la capture superposés (jamais dans le film final)
ffmpeg -v error -y -i build/l-artisan-completement-dejante-1080x1920.mp4 -i ../controle/pointage/boutons-tiktok-reels-detoures.png \
  -i ../controle/pointage/bandeau-controle.png -filter_complex "[0:v][1]overlay=0:0[a];[a][2]overlay=0:0[v]" -map "[v]" -map 0:a \
  -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p -c:a copy -movflags +faststart build/previsualisation-tiktok-1080x1920.mp4
echo "terminé : build/l-artisan-completement-dejante-1080x1920.mp4 et build/previsualisation-tiktok-1080x1920.mp4"
