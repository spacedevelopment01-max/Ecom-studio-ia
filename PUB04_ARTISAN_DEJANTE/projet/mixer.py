"""Mixage de la Pub 04 : voix Simon (voix.wav, posée par montage.py), bruitages calés sur les repères du plan
(plan.json : début des plans et mots horodatés), musique du studio (pop, puis cinématique sur la signature),
baissée automatiquement sous la voix. Sortie : film/assets/mix.wav à -15 LUFS.

Usage : python3 mixer.py          -> film/assets/mix.wav
        python3 mixer.py stems    -> st-voix.wav + st-fond.wav (pistes séparées, livrables)"""
import json, os, re, subprocess, sys
R = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(f"{R}/plan.json")); D = P["duree"]
SH = {s["id"]: s for s in P["segments"]}
S = lambda i: SH[i]["debut"]; E = lambda i: SH[i]["fin"]
SRC = lambda i, ts: SH[i]["debut"] + (ts - SH[i]["src_in"])   # instant ts de la vidéo source, ramené au film
def W(k, p):
    return next(m["t"] for m in P["mots"][k] if m["mot"].lower().startswith(p.lower()))
B, X = f"{R}/sfx/banque/pixabay-", f"{R}/sfx/"
A4C, A8A, T8B, HOP = S("A4c"), S("A8a"), S("T8b"), W("8v", "Hop")
SFX = [  # (fichier, départ, gain dB, début dans le fichier, durée)
  # Scène 1 : interpellation, le +, le doigt descend, le cœur
  (B+"whoosh-short.mp3", 0.0, -17, 0, .5), (X+"rouleau.mp3", 0.05, -16, 0, .9), (B+"impact-bass-1.mp3", W("1a", "TOI"), -19, 0, .4),
  (B+"click.mp3", W("1b", "plus"), -12, 0, .3), (B+"whoosh-short.mp3", S("T1c"), -18, 0, .5),
  (X+"splash.mp3", W("1d", "cœur") + .05, -10, 0, .6), (B+"click.mp3", W("1d", "Clique"), -12, 0, .3),
  # Scène 2 : les murs nickel, le chaos, le costume, le nuage
  (X+"truelle.mp3", S("A2a") + .1, -14, 0, 1.0), (B+"sparkle.mp3", W("2a", "nickel"), -19, 0, .7),
  (B+"whoosh-short.mp3", S("T2b"), -16, 0, .5), (X+"film1-grondement.mp3", S("T2b"), -15, 0, 1.2), (X+"film1-poufs.mp3", S("T2b") + .1, -17, 0, .9),
  (B+"pop.mp3", W("2c", "site"), -15, 0, .4), (B+"pop.mp3", W("2c", "pubs"), -15, 0, .4), (B+"pop.mp3", W("2c", "réseaux"), -15, 0, .4),
  (X+"fanfare.mp3", S("A2d"), -16, 0, 1.4), (X+"film1-poufs.mp3", S("POUF"), -12, 0, .8), (B+"pop.mp3", S("POUF"), -14, 0, .4),
  # Scène 3 : le téléphone en grève
  (X+"telephone.mp3", S("T3c") - .3, -12, 0, 1.0), (X+"pancarte.mp3", S("T3c") + .25, -12, 0, 1.0),
  # Scène 4 : la découverte, la porte, le logo, la conversation Syna n° 1
  (B+"sparkle.mp3", W("4a", "E-COM"), -19, 0, .9), (X+"porte.mp3", S("T4b"), -9, 0, 1.6), (X+"film1-logo.mp3", S("T4b") + .3, -14, 0, 1.6),
  (X+"film1-bulle.mp3", A4C + .08, -13, 0, .5), (X+"film1-clavier.mp3", A4C + .1, -18, 0, 1.25), (X+"film1-bulle.mp3", A4C + 1.62, -14, 0, .5),
  (X+"film1-etincelles.mp3", A4C + 1.75, -18, 0, .9),
  # Scène 5 : la question en commentaire
  (B+"pop.mp3", W("5a1", "tu"), -16, 0, .4), (X+"film1-bulle.mp3", W("5a2", "commentaire"), -15, 0, .5),
  # Scène 6 : identité, camion, site, prestations, devis, lutins
  (B+"pop.mp3", W("6v1", "identité"), -17, 0, .4), (B+"pop.mp3", W("6v1", "camion"), -17, 0, .4), (X+"camion.mp3", W("6v1", "camion") + .38, -17, 0, 1.0),
  (X+"film1-bloc.mp3", S("T6b") + .1, -19, 0, 1.0), (B+"pop.mp3", W("6v2", "site"), -20, 0, .4), (B+"pop.mp3", W("6v2", "prestations"), -20, 0, .4),
  (B+"pop.mp3", W("6v2", "devis"), -20, 0, .4), (B+"impact-bass-1.mp3", W("6c", "lutins"), -20, 0, .35),
  (X+"lutin.mp3", SRC("T6d", 1.50), -10, 0, 1.0), (X+"saut.mp3", SRC("T6d", 2.60), -11, 0, .55),
  # Scène 7 : photos -> publications -> publicités, même style, assorti
  (X+"pose.mp3", W("7a", "photos"), -17, 0, .8), (X+"film1-transformation.mp3", S("T7b") + .1, -19, 0, 2.1),
  (B+"pop.mp3", W("7v", "visuels"), -19, 0, .4), (B+"pop.mp3", W("7v", "publicités"), -19, 0, .4),
  (B+"sparkle.mp3", W("7c", "style"), -19, 0, .8), (X+"pose.mp3", S("A7d"), -11, 0, .8),
  # Scène 8 : demande à Syna, devis validé sur « Hop ! », avant / après
  (X+"film1-bulle.mp3", A8A + .6, -13, 0, .5), (X+"film1-clavier.mp3", A8A + .68, -18, 0, .77),
  (X+"film1-bulle.mp3", A8A + 1.55, -14, 0, .5), (B+"click.mp3", HOP, -12, 0, .3), (X+"film1-transformation.mp3", HOP + .05, -17, 0, 2.1),
  (X+"film1-tampon.mp3", E("T8b") - 1.0, -12, 0, .6), (B+"sparkle.mp3", E("T8b") - .97, -18, 0, .8),
  # Scène 9 : signature, le panneau glisse, il se rattrape, coupure
  (B+"sparkle.mp3", W("9b", "E-COM"), -20, 0, .9),
  (B+"whoosh-cinematic.mp3", S("T9c") - .55, -17, 2.0, .9), (X+"film1-logo.mp3", S("T9c") + .05, -16, 0, 1.8),
  (X+"section.mp3", SRC("T9c", 0.95), -13, 0, .9), (X+"film1-glissade.mp3", SRC("T9c", 1.10), -13, 0, 1.0),
  (B+"pop.mp3", S("FIN"), -15, 0, .4),
]
T9 = S("A9b") - .45   # la musique cinématique de signature prend le relais sur « E-COM STUDIO IA »

def build(gain, out, stems=False):
    inp = ["-i", f"{R}/voix.wav", "-i", f"{R}/sfx/musique-pop.wav", "-i", f"{R}/sfx/musique-signature.wav"]
    fl = ["[0]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[vo][sc]",
          f"[1]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:{T9 + 1.1:.2f},volume=-15dB,afade=t=in:d=0.3,afade=t=out:st={T9:.2f}:d=1.1[m1]",
          f"[2]aformat=sample_rates=48000:channel_layouts=stereo,volume=-19dB,afade=t=in:d=0.8,afade=t=out:st={D - T9 - 0.5:.2f}:d=0.45,adelay={int(T9 * 1000)}|{int(T9 * 1000)}[m2]",
          "[m1][m2]amix=inputs=2:normalize=0[mus0]", "[mus0][sc]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=250[mus]"]
    lab = []
    for i, (f, t, g, ss, du) in enumerate(SFX):
        inp += ["-i", f]; n = i + 3
        fl.append(f"[{n}]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start={ss}:duration={du:.3f},asetpts=PTS-STARTPTS,"
                  f"afade=t=out:st={max(0, du - .2):.3f}:d=0.2,volume={g}dB,adelay={int(t * 1000)}|{int(t * 1000)}[s{i}]"); lab.append(f"[s{i}]")
    fl.append("".join(lab) + f"amix=inputs={len(lab)}:normalize=0[sfx]")
    if stems:
        fl += [f"[vo]apad=whole_dur={D},atrim=0:{D}[vout]", f"[mus][sfx]amix=inputs=2:normalize=0,apad=whole_dur={D},atrim=0:{D}[bout]"]
        maps = ["-map", "[vout]", "-c:a", "pcm_s16le", f"{R}/st-voix.wav", "-map", "[bout]", "-c:a", "pcm_s16le", f"{R}/st-fond.wav"]
    else:
        fl += [f"[vo][mus][sfx]amix=inputs=3:normalize=0,apad=whole_dur={D},atrim=0:{D},afade=t=out:st={D - .12:.2f}:d=0.12[mixraw]",
               f"[mixraw]volume={gain}dB,alimiter=limit=0.84:level=false,aresample=48000,atrim=0:{D}[out]"]
        maps = ["-map", "[out]", "-c:a", "pcm_s16le", out]
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inp, "-filter_complex", ";".join(fl), *maps], check=True)

def lufs(f):
    o = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", o)[-1]), float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", o)[-1])

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "stems": build(0, None, True); sys.exit()
    out = f"{R}/film/assets/mix.wav"
    build(0, out); I, _ = lufs(out); build(-15 - I, out)
    I2, pk = lufs(out); print(f"gain {-15 - I:.2f} dB -> {I2:.1f} LUFS, crête {pk:.1f} dBFS, {len(SFX)} bruitages")
