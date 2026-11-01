#!/usr/bin/env bash
# Reconstruit le film à partir des plans IA déjà générés (aucun appel payant).
# À lancer depuis ce dossier « projet ». Nécessite ffmpeg, Python 3 + numpy, Node (npx hyperframes).
set -euo pipefail
cd "$(dirname "$0")"
# 1. Voix calée à +0,10 s sur 14 s
ffmpeg -v error -y -f lavfi -t 0.10 -i anullsrc=r=44100:cl=mono -i ../audio/voix-elevenlabs-simon-resserree.wav \
  -filter_complex "[0][1]concat=n=2:v=0:a=1,apad=whole_dur=14[a]" -map "[a]" -ar 44100 -ac 1 -c:a pcm_s16le voix-film.wav
# 2. Montage des 5 plans (Kling + synchro labiale) sur la voix, 1080 × 1920, 24 i/s
mkdir -p montage && python3 montage/assembler.py
# 3. Étalonnage léger, vignettage et grain
ffmpeg -v error -y -i montage/plans.mp4 -vf "eq=contrast=1.05:saturation=1.04:gamma=0.985,colorbalance=rs=-0.015:bs=0.02:rh=0.02:bh=-0.015,vignette=angle=0.5,noise=c0s=5:c0f=t+u" \
  -c:v libx264 -crf 14 -preset slow -pix_fmt yuv420p -r 24 film/assets/plans.mp4
# 4. Mixage (voix, bruitages, musique) à -15 LUFS
python3 montage/mixer.py
# 5. Rendu HyperFrames (typographie, éclairs, secousses)
cd film && HYPERFRAMES_NO_TELEMETRY=1 npx hyperframes render -q delivery --fps 24 -o ../le-dropshipper-dejante-1080x1920.mp4
