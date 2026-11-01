"""Mixage 14 s : voix (Simon, calée à +0,10 s), bruitages (ElevenLabs + banque HyperFrames/Pixabay), musique du studio
(style pop) baissée sous la voix. Sortie normalisée à -15 LUFS, crête vraie -1 dBTP."""
import subprocess
D = 14.0
LIB = "../audio/bruitages/pixabay-"
# (fichier, instant en s, gain en dB)
SFX = [  # (fichier, instant de départ en s, gain dB, début dans le fichier, durée gardée)
  (LIB+"whoosh-short.mp3", 0.05, -8, 0, 0.6), (LIB+"impact-bass-1.mp3", 0.20, -14, 0, 0.45),  # « TOI ! »
  (LIB+"pop.mp3", 0.80, -8, 0, 0.5), (LIB+"pop.mp3", 1.30, -8, 0, 0.5),                     # « Oui, toi ! »
  (LIB+"whoosh-short.mp3", 3.00, -12, 0, 0.6),                                              # coupe vers P2
  ("../audio/bruitages/elevenlabs-fanfare.mp3", 4.45, -16, 0, 2.0), (LIB+"sparkle.mp3", 4.50, -14, 0, 1.6),           # la lampe jaillit
  (LIB+"whoosh-cinematic.mp3", 4.62, -18, 2.0, 1.2), ("../audio/bruitages/elevenlabs-caisse.mp3", 5.55, -9, 0, 1.0),  # salle du trône, billets
  ("../audio/bruitages/elevenlabs-pouf.mp3", 7.10, +8, 0, 0.8), ("../audio/bruitages/elevenlabs-chute.mp3", 7.22, -13, 0, 0.6),                 # trône disparu, chute
  (LIB+"impact-bass-2.mp3", 7.50, -22, 0, 0.30), ("../audio/bruitages/elevenlabs-chaos.mp3", 7.62, -24, 0, 3.2),      # chaos
  ("../audio/bruitages/elevenlabs-papiers.mp3", 10.30, -13, 0, 1.5),                                                  # la pile s'effondre
  (LIB+"whoosh-short.mp3", 10.78, -12, 0, 0.6),                                             # coupe vers P5
  (LIB+"whoosh-cinematic.mp3", 11.50, -9, 2.0, 0.9), ("../audio/bruitages/elevenlabs-fusee.mp3", 12.26, -5, 0, 1.75),  # recul, décollage
  ("../audio/bruitages/elevenlabs-sifflet.mp3", 12.42, -9, 0, 1.58),                                                  # la fusée monte : sifflet comique
]
inp = ["-i", "voix-film.wav", "-i", "../audio/musique-compositeur-studio-pop.wav"]
fl = ["[0]aformat=sample_rates=48000:channel_layouts=stereo,volume=0dB,asplit=2[vo][sc]",
      "[1]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:14,volume=-15dB,afade=t=in:d=0.15,afade=t=out:st=12.6:d=1.2[mus0]",
      "[mus0][sc]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=250[mus]"]
lab = []
for i, (f, t, g, ss, du) in enumerate(SFX):
    inp += ["-i", f]; n = i + 2
    fl.append(f"[{n}]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start={ss}:duration={du},asetpts=PTS-STARTPTS,afade=t=out:st={max(0,du-0.25)}:d=0.25,volume={g}dB,adelay={int(t*1000)}|{int(t*1000)}[s{i}]"); lab.append(f"[s{i}]")
fl.append("".join(lab) + f"amix=inputs={len(lab)}:normalize=0[sfx]")
fl.append(f"[vo][mus][sfx]amix=inputs=3:normalize=0,apad=whole_dur={D},atrim=0:{D}[mixraw]")
fl.append(f"[mixraw]volume=-1.20dB,alimiter=limit=0.84:level=false,aresample=48000,atrim=0:{D}[out]")
subprocess.run(["ffmpeg","-v","error","-y",*inp,"-filter_complex",";".join(fl),"-map","[out]","-c:a","pcm_s16le","film/assets/mix.wav"],check=True)
print("ok")
