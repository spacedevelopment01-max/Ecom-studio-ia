#!/usr/bin/env bash
# Reconstruit la publicité de 60 s à partir des ressources livrées, SANS aucun appel payant.
# À lancer depuis ce dossier « projet ». Nécessite ffmpeg, Python 3 + numpy, Node (npx hyperframes).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
# 1. Plan de montage (temps de chaque plan, calage des répliques sur les mots) et piste voix de la suite
python3 montage/plan.py > build/plan.txt
python3 montage/voix_locale.py
# 2. Montage des 18 plans animés (version synchronisée pendant la parole), 1080 × 1920, 24 i/s, étalonnage
python3 montage/assembler.py
# 3. Mixage voix + bruitages + musique, -15 LUFS
python3 montage/mixer.py
# 4. Rendu HyperFrames de la suite (conversation Syna, logo officiel, textes, signature)
( cd film && HYPERFRAMES_NO_TELEMETRY=1 npx hyperframes render -q delivery --fps 24 -o ../build/suite-1080x1920.mp4 )
# 5. Assemblage avec les 14 premières secondes validées (inchangées)
V14=../../TEST_CINEMA_01_DROPSHIPPER_DEJANTE/le-dropshipper-dejante-1080x1920.mp4
ffmpeg -v error -y -i "$V14" -vn -ac 2 -ar 48000 -c:a pcm_s16le build/a14.wav
ffmpeg -v error -y -i build/suite-1080x1920.mp4 -vn -ac 2 -ar 48000 -c:a pcm_s16le build/a46.wav
ffmpeg -v error -y -i build/a14.wav -i build/a46.wav -filter_complex "[0][1]concat=n=2:v=0:a=1[a]" -map "[a]" -c:a pcm_s16le build/audio-60.wav
ffmpeg -v error -y -i "$V14" -i build/suite-1080x1920.mp4 -i build/audio-60.wav -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -map 2:a -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -r 24 -c:a aac -b:a 192k -movflags +faststart build/le-dropshipper-dejante-60s-1080x1920.mp4
echo "terminé : build/le-dropshipper-dejante-60s-1080x1920.mp4"
