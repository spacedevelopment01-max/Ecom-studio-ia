"""Mixage v2 de la suite : voix (Simon), bruitages calés sur les repères du montage v2, musique du studio (pop puis
cinématique sur la signature) baissée sous la voix. -15 LUFS, comme les 14 s validées."""
import json, re, subprocess, sys
P = json.load(open("build/plan.json")); D = P["duree"]
SH = {s["id"]: s for s in P["segments"]}
S = lambda i: SH[i]["debut"]; E = lambda i: SH[i]["fin"]
SRC = lambda i, ts: SH[i]["debut"] + (ts - SH[i]["src_in"])
def W(k, p):
    return next(m["t"] for m in P["mots"][k] if m["mot"].lower().startswith(p.lower()))
B, X = "../audio/bruitages/pixabay-", "../audio/bruitages/elevenlabs-"
SFX = [  # (fichier, départ, gain dB, début dans le fichier, durée)
  (X+"fusee-film1-repris-des-14s.mp3", 0.0, -16, 1.2, .9), (X+"pouet.mp3", SRC("A", 2.2), -11, 0, 1.0), (B+"pop.mp3", W("s2", "NASA"), -15, 0, .4),
  (X+"claquement.mp3", S("C"), -6, 0, .6), (X+"repli.mp3", S("C") + .1, -10, 0, 1.7), (X+"vague.mp3", S("C") + .25, -12, 0, 1.4),
  (X+"logo.mp3", S("C") + .45, -12, 0, 1.3), (X+"frole.mp3", SRC("C", 1.55), -10, 0, .8),
  (X+"bulle.mp3", S("T3"), -12, 0, .5), (X+"clavier.mp3", S("T3") + .18, -17, 0, 1.3), (X+"bulle.mp3", S("T3") + 1.7, -14, 0, .5), (X+"etincelles.mp3", S("T3") + 1.95, -15, 0, 1.0),
  (X+"savon.mp3", SRC("F", 1.45), -9, 0, 1.0), (X+"tampon.mp3", SRC("F", 2.92), -7, 0, .6), (X+"triomphe.mp3", SRC("F", 3.1), -12, 0, 1.2),
  (X+"grondement.mp3", S("G"), -11, 0, 1.9), (B+"pop.mp3", W("s4x", "site"), -16, 0, .4), (B+"click.mp3", W("s4x", "produits"), -13, 0, .3),
  (X+"caddie.mp3", S("H"), -15, 0, .9), (B+"pop.mp3", W("s4a", "panier"), -16, 0, .4),
  (X+"tasse.mp3", SRC("I", 1.75), -9, 0, 1.0),
  (X+"lancer.mp3", SRC("J", 1.0), -11, 0, 1.2), (X+"plongee.mp3", E("J") - .42, -9, 0, 1.0),
  (X+"coucou.mp3", S("K") + .05, -11, 0, .8), (X+"bulle.mp3", S("K") + .1, -15, 0, .5), (B+"pop.mp3", S("K") + .4, -16, 0, .4),
  (X+"tapis.mp3", S("L"), -17, 0, .85), (B+"sparkle.mp3", W("s5b", "Tout"), -17, 0, 1.0),
  (X+"bulle.mp3", S("T6b"), -12, 0, .5), (X+"clavier.mp3", S("T6b") + .15, -17, 0, 1.6), (X+"bulle.mp3", S("N") + .14, -14, 0, .5), (B+"click.mp3", S("N") + .7, -9, 0, .3),
  (X+"transformation.mp3", S("O") + .1, -10, 0, 2.1), (X+"bloc.mp3", SRC("O", 1.46), -9, 0, 1.0), (X+"bouton.mp3", SRC("O", 2.05), -8, 0, .8),
  (B+"pop.mp3", W("s7", "quinze"), -16, 0, .4), (B+"impact-bass-1.mp3", W("s7", "Studio"), -19, 0, .35),
  (X+"claquement.mp3", SRC("Q", 1.05), -6, 0, .6), (X+"poufs.mp3", SRC("Q", 1.7), -13, 0, 1.6), (X+"coup.mp3", SRC("Q", 2.97), -10, 0, .8),
  (X+"clin.mp3", E("R") - .45, -11, 0, .5),
  (B+"whoosh-cinematic.mp3", S("T9") - .55, -17, 2.0, .9), (X+"logo.mp3", S("T9") + .05, -17, 0, 1.8),
  (X+"glissade.mp3", SRC("GAG1", 1.05), -11, 0, 1.0), (X+"chute-film1-repris-des-14s.mp3", S("GAG2"), -10, 0, .7), (B+"impact-bass-1.mp3", S("GAG2"), -18, 0, .4),
  (B+"pop.mp3", S("GAG3"), -13, 0, .4), (X+"clin.mp3", S("FIN") + .05, -10, 0, .5), (X+"triomphe.mp3", S("FIN") + .15, -11, 0, 1.4),
]
def build(gain, out, stems=False):
    inp = ["-i", "build/voix-suite.wav", "-i", "../audio/musique/compositeur-studio-pop.wav", "-i", "../audio/musique/compositeur-studio-cinematique.wav"]
    t9 = S("T9") - .5
    fl = ["[0]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[vo][sc]",
          f"[1]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:{t9 + 1.2:.2f},volume=-15dB,afade=t=in:d=0.4,afade=t=out:st={t9:.2f}:d=1.2[m1]",
          f"[2]aformat=sample_rates=48000:channel_layouts=stereo,volume=-19dB,afade=t=in:d=0.8,afade=t=out:st={D - t9 - 0.6:.2f}:d=0.55,adelay={int(t9 * 1000)}|{int(t9 * 1000)}[m2]",
          "[m1][m2]amix=inputs=2:normalize=0[mus0]", "[mus0][sc]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=250[mus]"]
    lab = []
    for i, (f, t, g, ss, du) in enumerate(SFX):
        inp += ["-i", f]; n = i + 3
        fl.append(f"[{n}]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start={ss}:duration={du},asetpts=PTS-STARTPTS,afade=t=out:st={max(0, du - .2):.3f}:d=0.2,volume={g}dB,adelay={int(t * 1000)}|{int(t * 1000)}[s{i}]"); lab.append(f"[s{i}]")
    fl.append("".join(lab) + f"amix=inputs={len(lab)}:normalize=0[sfx]")
    if stems:
        fl += [f"[vo]apad=whole_dur={D},atrim=0:{D}[vout]", f"[mus][sfx]amix=inputs=2:normalize=0,apad=whole_dur={D},atrim=0:{D}[bout]"]
        maps = ["-map", "[vout]", "-c:a", "pcm_f32le", "build/st-voix.wav", "-map", "[bout]", "-c:a", "pcm_f32le", "build/st-fond.wav"]
    else:
        fl += [f"[vo][mus][sfx]amix=inputs=3:normalize=0,apad=whole_dur={D},atrim=0:{D},afade=t=out:st={D - .3:.2f}:d=0.3[mixraw]",
               f"[mixraw]volume={gain}dB,alimiter=limit=0.84:level=false,aresample=48000,atrim=0:{D}[out]"]
        maps = ["-map", "[out]", "-c:a", "pcm_s16le", out]
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inp, "-filter_complex", ";".join(fl), *maps], check=True)
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "stems": build(0, None, True); sys.exit()
    build(0, "film/assets/mix-suite.wav")
    o = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", "film/assets/mix-suite.wav", "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", o)[-1]); build(-15 - I, "film/assets/mix-suite.wav"); print(f"gain {-15 - I:.2f} dB")
