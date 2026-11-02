"""Mixage de la publicité Arthur (40,000 s) : voix Simon (voix.wav, posée par montage.py), bruitages calés sur les mots et les plans
(plan.json), musique du compositeur du studio en cinq moments (début entraînant, rupture à la notification, suspense comique du rouleau
avec arrêt net sur « moi ? », énergie du Studio, courte conclusion), baissée automatiquement sous la voix. Sortie -15 LUFS.

Usage : python3 mixer.py          -> film/assets/mix.wav
        python3 mixer.py stems    -> st-voix.wav, st-musique.wav, st-bruitages.wav (pistes séparées)"""
import json, os, re, subprocess, sys
R = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(f"{R}/plan.json")); D = P["duree"]
SH = {s["id"]: s for s in P["segments"]}
S = lambda i: SH[i]["debut"]; E = lambda i: SH[i]["fin"]
M = lambda k, i: P["mots"][k][i]
X, B, A = f"{R}/sfx/pub04/", f"{R}/sfx/pub04/banque/pixabay-", f"{R}/sfx/"   # bruitages repris de la Pub 04, copiés dans le projet
SFX = [  # (fichier, départ, gain dB, début dans le fichier, durée)
  (X + "rouleau.mp3", 0.05, -21, 0, .9),
  (B + "click.mp3", M("p2a", 3)["t"], -15, 0, .3), (B + "pop.mp3", M("p2b", 2)["t"], -17, 0, .4),
  (B + "whoosh-short.mp3", S("W3a") - .08, -18, 0, .45), (X + "rouleau.mp3", S("W3a") + .05, -12, 0, 1.0),
  (A + "cles.mp3", S("W3b") + .1, -13, 0, 1.0), (A + "cles.mp3", S("W3b") + 1.05, -16, 0, .8),
  (A + "notification.mp3", S("A4") + .02, -8, 0, 1.0),
  (B + "whoosh-short.mp3", S("TEL") - .05, -19, 0, .45), (B + "pop.mp3", M("p4b", 1)["t"] - .1, -15, 0, .4), (B + "pop.mp3", M("p4b", 6)["t"] - .12, -15, 0, .4),
  (X + "rouleau.mp3", S("MUR") + .02, -13, 0, 1.0), (B + "sparkle.mp3", M("p5a", 2)["t"], -22, 0, .7),
  (X + "film1-bulle.mp3", M("p6", 8)["t"], -17, 0, .5),
  (B + "whoosh-short.mp3", S("ECRAN") - .05, -16, 0, .45), (X + "film1-logo.mp3", S("ECRAN") + .05, -21, 0, 1.4),
  (B + "click.mp3", M("p7b", 5)["t"] + .05, -12, 0, .3), (B + "whoosh-short.mp3", M("p7b", 7)["t"], -20, 0, .45), (B + "pop.mp3", M("p7b", 10)["t"] + .05, -17, 0, .4),
  (B + "whoosh-short.mp3", M("p7b", 11)["t"] - .05, -18, 0, .45), (B + "click.mp3", M("p7b", 16)["t"] - .08, -12, 0, .3), (B + "sparkle.mp3", M("p7b", 16)["t"], -21, 0, .8),
  (X + "film1-bulle.mp3", S("SYNA") + .02, -15, 0, .5), (X + "film1-clavier.mp3", M("p8a", 0)["t"], -22, 0, 2.1),
  (X + "film1-transformation.mp3", M("p8a", 6)["t"], -20, 0, 1.0), (X + "film1-bulle.mp3", M("p8a", 7)["f"] + .05, -15, 0, .5),
  (A + "ordinateur.mp3", S("A9") - .02, -10, 0, .6), (A + "cles.mp3", S("A9") + .25, -13, 0, 1.0),
  (X + "saut.mp3", S("W9") + .3, -13, 0, .55), (B + "whoosh-short.mp3", S("W9") + .5, -16, 0, .45),
  (X + "film1-logo.mp3", S("FIN") + .02, -14, 0, 1.6),
]
STOP = M("p5b", 8)["f"] + .06          # arrêt net de la musique sur « moi ? »
MUS = [  # (fichier, départ dans le film, fin dans le film, gain dB, fondu d'entrée, fondu de sortie)
  (A + "musique-m1-acoustic.wav", 0.0, S("A4") + .05, -15, .2, .12),        # début entraînant, soulagement ; rupture à la notification
  (A + "musique-m2-calm.wav", S("TEL") + .2, S("MUR"), -23, .6, .3),         # désillusion
  (A + "musique-m3-bistro.wav", S("MUR"), STOP, -18, .15, .04),              # suspense comique du rouleau, arrêt net
  (A + "musique-m3-bistro.wav", S("A6") + .15, S("A7"), -25, .4, .2),        # reprise discrète pendant la question
  (A + "musique-m4-pop.wav", S("A7"), S("W9") + .4, -15, .15, .4),           # énergie retrouvée : le Studio
  (A + "musique-m5-cinematic.wav", S("W9") + .3, D, -16, .3, .25),           # conclusion brève
]

def build(gain, out=None, stems=False):
    inp = ["-i", f"{R}/voix.wav"]; fl = ["[0]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[vo][sc]"]; n = 1; lm = []
    for f, a, b, g, fi, fo in MUS:
        inp += ["-i", f]; d = b - a
        fl.append(f"[{n}]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:{d:.3f},asetpts=PTS-STARTPTS,volume={g}dB,"
                  f"afade=t=in:d={fi},afade=t=out:st={max(0, d - fo):.3f}:d={fo},adelay={int(a * 1000)}|{int(a * 1000)}[m{n}]"); lm.append(f"[m{n}]"); n += 1
    fl.append("".join(lm) + f"amix=inputs={len(lm)}:normalize=0[mus0]")
    fl.append("[mus0][sc]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=250[mus]")
    ls = []
    for f, t, g, ss, du in SFX:
        inp += ["-i", f]
        fl.append(f"[{n}]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start={ss}:duration={du:.3f},asetpts=PTS-STARTPTS,"
                  f"afade=t=out:st={max(0, du - .15):.3f}:d=0.15,volume={g}dB,adelay={int(t * 1000)}|{int(t * 1000)}[s{n}]"); ls.append(f"[s{n}]"); n += 1
    fl.append("".join(ls) + f"amix=inputs={len(ls)}:normalize=0[sfx]")
    if stems:
        fl += [f"[vo]apad=whole_dur={D},atrim=0:{D}[v1]", f"[mus]apad=whole_dur={D},atrim=0:{D}[m1]", f"[sfx]apad=whole_dur={D},atrim=0:{D}[x1]"]
        maps = ["-map", "[v1]", "-c:a", "pcm_s16le", f"{R}/st-voix.wav", "-map", "[m1]", "-c:a", "pcm_s16le", f"{R}/st-musique.wav",
                "-map", "[x1]", "-c:a", "pcm_s16le", f"{R}/st-bruitages.wav"]
    else:
        fl += [f"[vo][mus][sfx]amix=inputs=3:normalize=0,apad=whole_dur={D},atrim=0:{D},afade=t=out:st={D - .15:.2f}:d=0.15[mx]",
               f"[mx]volume={gain}dB,alimiter=limit=0.84:level=false,aresample=48000,atrim=0:{D}[out]"]
        maps = ["-map", "[out]", "-c:a", "pcm_s16le", out]
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inp, "-filter_complex", ";".join(fl), *maps], check=True)

def lufs(f):
    o = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", o)[-1]), float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", o)[-1])

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "stems": build(0, stems=True); sys.exit()
    out = f"{R}/film/assets/mix.wav"
    build(0, out); I, _ = lufs(out); build(-15 - I, out); I2, pk = lufs(out)
    print(f"gain {-15 - I:.2f} dB -> {I2:.1f} LUFS, crête {pk:.1f} dBFS, {len(SFX)} bruitages, {len(MUS)} morceaux de musique")
