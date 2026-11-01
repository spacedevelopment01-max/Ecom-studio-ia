"""Mixage de la suite (46,52 s) : voix (Simon), bruitages ElevenLabs + banque Pixabay, musique du compositeur du studio
(pop, puis cinématique sur la signature), baissée sous la voix. Normalisé à -15 LUFS comme les 14 s validées."""
import subprocess, re, sys
D = 46.52
B = "../audio/bruitages/pixabay-"
SFX = [  # (fichier, départ s, gain dB, début dans le fichier, durée gardée)
  ("../audio/bruitages/elevenlabs-fusee-film1-repris-des-14s.mp3", 0.00, -16, 1.2, 0.9), ("../audio/bruitages/elevenlabs-pouet.mp3", 1.25, -11, 0, 1.0), (B+"pop.mp3", 1.95, -14, 0, .5),
  ("../audio/bruitages/elevenlabs-claquement.mp3", 5.98, -4, 0, .6), ("../audio/bruitages/elevenlabs-repli.mp3", 6.08, -9, 0, 2.0), ("../audio/bruitages/elevenlabs-frole.mp3", 6.55, -8, 0, .8),
  ("../audio/bruitages/elevenlabs-vague.mp3", 6.45, -10, 0, 1.6), ("../audio/bruitages/elevenlabs-logo.mp3", 6.82, -8, 0, 2.0),
  ("../audio/bruitages/elevenlabs-bulle.mp3", 7.72, -10, 0, .5), ("../audio/bruitages/elevenlabs-clavier.mp3", 7.98, -15, 0, 1.5), ("../audio/bruitages/elevenlabs-bulle.mp3", 9.70, -12, 0, .5), ("../audio/bruitages/elevenlabs-etincelles.mp3", 10.02, -13, 0, 1.2),
  (B+"whoosh-short.mp3", 11.10, -12, 0, .6), ("../audio/bruitages/elevenlabs-savon.mp3", 11.85, -8, 0, 1.0), ("../audio/bruitages/elevenlabs-tampon.mp3", 13.50, -6, 0, .6), ("../audio/bruitages/elevenlabs-triomphe.mp3", 13.72, -11, 0, 1.4),
  ("../audio/bruitages/elevenlabs-grondement.mp3", 14.70, -10, 0, 2.0), (B+"pop.mp3", 15.20, -15, 0, .4), (B+"click.mp3", 16.06, -12, 0, .3), (B+"pop.mp3", 17.04, -15, 0, .4),
  ("../audio/bruitages/elevenlabs-caddie.mp3", 15.90, -16, 0, 1.9), ("../audio/bruitages/elevenlabs-tasse.mp3", 19.10, -8, 0, 1.0), ("../audio/bruitages/elevenlabs-trombone.mp3", 20.80, -10, 0, 1.6),
  ("../audio/bruitages/elevenlabs-lancer.mp3", 21.70, -10, 0, 1.4), ("../audio/bruitages/elevenlabs-plongee.mp3", 22.36, -8, 0, 1.2), ("../audio/bruitages/elevenlabs-coucou.mp3", 23.15, -11, 0, .8),
  ("../audio/bruitages/elevenlabs-bulle.mp3", 23.35, -14, 0, .5), (B+"pop.mp3", 23.75, -15, 0, .4), ("../audio/bruitages/elevenlabs-tapis.mp3", 24.60, -17, 0, 2.6), (B+"sparkle.mp3", 24.85, -16, 0, 1.2),
  ("../audio/bruitages/elevenlabs-bulle.mp3", 30.45, -10, 0, .5), ("../audio/bruitages/elevenlabs-clavier.mp3", 30.62, -15, 0, 0.85), ("../audio/bruitages/elevenlabs-bulle.mp3", 31.60, -12, 0, .5), (B+"click.mp3", 31.86, -8, 0, .3),
  ("../audio/bruitages/elevenlabs-transformation.mp3", 32.70, -9, 0, 2.2), ("../audio/bruitages/elevenlabs-bloc.mp3", 33.04, -8, 0, 1.0), ("../audio/bruitages/elevenlabs-bouton.mp3", 33.70, -7, 0, .8),
  (B+"pop.mp3", 36.30, -15, 0, .4), (B+"impact-bass-1.mp3", 38.68, -18, 0, .35),
  ("../audio/bruitages/elevenlabs-claquement.mp3", 39.26, -5, 0, .6), ("../audio/bruitages/elevenlabs-poufs.mp3", 39.90, -8, 0, 2.0), ("../audio/bruitages/elevenlabs-coup.mp3", 40.60, -6, 0, .8),
  ("../audio/bruitages/elevenlabs-clin.mp3", 42.20, -11, 0, .5), (B+"whoosh-cinematic.mp3", 42.30, -17, 2.0, .9), ("../audio/bruitages/elevenlabs-logo.mp3", 43.18, -17, 0, 2.0),
  ("../audio/bruitages/elevenlabs-glissade.mp3", 44.60, -12, 0, 1.0), ("../audio/bruitages/elevenlabs-chute-film1-repris-des-14s.mp3", 45.05, -14, 0, .6), (B+"pop.mp3", 45.00, -19, 0, .4), ("../audio/bruitages/elevenlabs-fin.mp3", 45.60, -7, 0, .92),
]
def build(gain, out, stems=False):
    inp = ["-i", "build/voix-suite.wav", "-i", "../audio/musique/compositeur-studio-pop.wav", "-i", "../audio/musique/compositeur-studio-cinematique.wav"]
    fl = ["[0]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[vo][sc]",
          "[1]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:42.5,volume=-15dB,afade=t=in:d=0.4,afade=t=out:st=41.2:d=1.3[m1]",
          "[2]aformat=sample_rates=48000:channel_layouts=stereo,volume=-19dB,afade=t=in:d=0.8,adelay=41600|41600[m2]",
          "[m1][m2]amix=inputs=2:normalize=0[mus0]", "[mus0][sc]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=250[mus]"]
    lab = []
    for i, (f, t, g, ss, du) in enumerate(SFX):
        inp += ["-i", f]; n = i + 3
        fl.append(f"[{n}]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start={ss}:duration={du},asetpts=PTS-STARTPTS,afade=t=out:st={max(0, du - 0.2)}:d=0.2,volume={g}dB,adelay={int(t*1000)}|{int(t*1000)}[s{i}]"); lab.append(f"[s{i}]")
    fl.append("".join(lab) + f"amix=inputs={len(lab)}:normalize=0[sfx]")
    if stems:
        fl += [f"[vo]apad=whole_dur={D},atrim=0:{D}[vout]", f"[mus][sfx]amix=inputs=2:normalize=0,apad=whole_dur={D},atrim=0:{D}[bout]"]
        maps = ["-map", "[vout]", "-c:a", "pcm_f32le", "build/st-voix.wav", "-map", "[bout]", "-c:a", "pcm_f32le", "build/st-fond.wav"]
    else:
        fl += [f"[vo][mus][sfx]amix=inputs=3:normalize=0,apad=whole_dur={D},atrim=0:{D}[mixraw]", f"[mixraw]volume={gain}dB,alimiter=limit=0.84:level=false,aresample=48000,atrim=0:{D}[out]"]
        maps = ["-map", "[out]", "-c:a", "pcm_s16le", out]
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inp, "-filter_complex", ";".join(fl), *maps], check=True)
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "stems": build(0, None, stems=True); sys.exit()
    build(0, "film/assets/mix-suite.wav")
    o = subprocess.run(["ffmpeg","-hide_banner","-nostats","-i","film/assets/mix-suite.wav","-af","ebur128","-f","null","-"],capture_output=True,text=True).stderr
    I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", o)[-1]); build(-15 - I, "film/assets/mix-suite.wav"); print(f"gain {-15 - I:.2f} dB")
