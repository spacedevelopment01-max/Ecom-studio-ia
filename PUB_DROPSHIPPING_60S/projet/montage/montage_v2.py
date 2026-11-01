"""Montage v2 de la suite (temps local 0 = 14,0 s du film).
Chaque réplique est jouée dans un plan « qui parle » (Kling AI Avatar v2 Pro : bouche fabriquée à partir de la voix).
Les gags sans parole gardent les plans Kling Pro, à vitesse normale. Fin : chute du socle -> image de fin tenue.

Usage : python3 montage/montage_v2.py plan   -> écrit build/plan.json + film/assets/timing.js + build/voix-suite.wav
        python3 montage/montage_v2.py images -> écrit film/assets/plans-suite.mp4 (24 i/s, 1080 x 1920, étalonné)"""
import json, os, subprocess, sys
import numpy as np

FPS, W, H, SR = 24, 1080, 1920, 44100
AV = lambda k: f"../animations/plans-parlants/plan-{k}.mp4"
AN = lambda k: f"../animations/kling/plan-{k}.mp4"
AUD = lambda k: f"../audio/voix/morceaux-v2/{k}.wav"

def duree_audio(k):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", AUD(k)],
                                capture_output=True, text=True).stdout)

# (id, source vidéo, début source, fin source, [(réplique, décalage dans le plan)])
# Pour un plan parlant, fin source = durée de sa réplique + petite marge (None -> calculée).
def plans():
    P = [
        ("A",   AN("A"),   0.00, 3.00, []),                              # il pousse la fusée hors du cadre
        ("T2",  "../animations/plans-parlants/plan-T2.mp4", 0.0, None, [("s2", 0.0)]),     # « Bon ! … Regarde ! »
        ("C",   AN("C"),   0.70, 2.45, []),                              # la chambre se replie, logo, il se baisse
        ("T3",  AV("T3"),  0.0, None, [("s3", 0.0)]),                    # conversation Syna n° 1
        ("F",   AN("F"),   1.25, 3.60, []),                              # l'emblème-savonnette, tampon, triomphe
        ("G",   AN("G"),   1.00, 2.95, [("s4x", 0.0)]),                  # la boutique sort de terre (voix off, plan large)
        ("H",   AN("H"),   0.00, 0.85, []),                              # course avec le caddie
        ("T4a", AV("T4a"), 0.0, None, [("s4a", 0.0)]),                   # « mon panier… tout se construit ! »
        ("I",   AN("I"),   0.50, 2.20, []),                              # il boit : la tasse est vide
        ("T4b", AV("T4b"), 0.0, None, [("s4b", 0.0)]),                   # « Moi, j'avais même pas fini mon café ! »
        ("T5a", AV("T5a"), 0.0, None, [("s5a", 0.0)]),                   # « Mes photos, mes publications, »
        ("J",   AN("J"),   0.95, 2.75, [("s5x", 0.10)]),                 # il lance la photo -> affiche géante (de dos)
        ("K",   AN("K"),   0.35, 1.20, []),                              # son double le salue
        ("L",   AN("L"),   0.00, 0.85, []),                              # tapis roulant-calendrier
        ("T5b", AV("T5b"), 0.0, None, [("s5b", 0.0)]),                   # « Tout au même endroit ! C'est pas beau, ça ?! »
        ("T6a", AV("T6a"), 0.0, None, [("s6a", 0.0)]),                   # « Attends… et si je veux changer quelque chose ? »
        ("T6b", AV("T6b"), 0.0, None, [("s6b", 0.0)]),                   # « Bah, je le demande à Syna ! »
        ("N",   AN("N"),   0.55, 1.75, []),                              # conversation Syna n° 2 (devis, valider)
        ("O",   AN("O"),   0.95, 3.75, []),                              # avant / après, bloc de texte, bouton
        ("T7",  AV("T7"),  0.0, None, [("s7", 0.0)]),                    # « Donc… quinze outils… un Studio ?! »
        ("Q",   AN("Q"),   0.80, 3.65, [("s7b", 0.0)]),                 # « Allez, ouste ! Dehors ! … Toi aussi ! » (il crie, poing levé, puis coup de pied)
        ("R",   AV("R"),   0.0, None, [("s8a", 0.0)]),                   # « E-COM STUDIO IA. » + clin d'œil
        ("T9",  AV("T9"),  0.0, None, [("s9", 0.0)]),                    # « Tout ton e-commerce… viens créer ta marque ! »
        ("GAG1", "../animations/kling/plan-GAG-final.mp4", 0.60, 1.56, []),                 # il s'appuie, le socle bascule
        ("GAG2", "../animations/kling/plan-GAG-final.mp4", 1.86, 2.14, []),                 # (images floues retirées) il saute en l'air
        ("GAG3", "../animations/kling/plan-GAG-final.mp4", 2.36, 4.04, []),                 # (images floues retirées) assis sur le socle, pouce levé
        ("FIN", "../animations/kling/plan-GAG-final.mp4", 4.00, 4.00, []),                  # image de fin tenue
    ]
    MARGE = {"R": 0.50, "T9": 0.0}
    FIN_TENUE = 2.0
    out, t = [], 0.0
    for sid, src, a, b, voix in P:
        if b is None:
            b = a + duree_audio(voix[0][0]) + MARGE.get(sid, 0.05)
        d = FIN_TENUE if sid == "FIN" else (b - a)
        out.append({"id": sid, "src": src, "src_in": a, "src_out": b, "debut": round(t, 4), "fin": round(t + d, 4), "voix": voix})
        t += d
    return out, round(t, 4)

def plan():
    P, D = plans()
    fa = {}
    for s in P:
        for (k, off) in s["voix"]:
            fa[k] = s["debut"] + off
    # mots horodatés (alignements forcés existants, recalés sur les morceaux découpés)
    coupe = {"s4x": ("s4", 0.0), "s4a": ("s4", 1.92), "s4b": ("s4", 4.18), "s5a": ("s5", 0.0), "s5x": ("s5", 1.71), "s5b": ("s5", 3.65),
             "s6a": ("s6", 0.0), "s6b": ("s6", 2.95), "s7b1": ("s7b", 0.0), "s7b2": ("s7b", 2.0), "s8a": ("s8", 0.0)}
    mots = {}
    for k, t0 in fa.items():
        base, dec = coupe.get(k, (k, 0.0)); dk = duree_audio(k)
        W_ = [w for w in json.load(open(f"../audio/voix/alignement-{base}.json"))["words"] if w["text"].strip()]
        mots[k] = [{"mot": w["text"], "t": round(t0 + w["start"] - dec, 3)} for w in W_ if dec - 0.02 <= w["start"] < dec + dk]
    # piste voix
    n = int(D * SR) + SR; y = np.zeros(n, np.float32)
    for k, t0 in fa.items():
        x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", AUD(k), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                         capture_output=True).stdout, np.float32)
        i = int(round(t0 * SR)); y[i:i + len(x)] += x[:n - i]
    y = y[:int(D * SR)]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "pcm_s16le", "build/voix-suite.wav"],
                   input=y.tobytes(), check=True)
    shots = {s["id"]: [s["debut"], s["fin"], s["src_in"]] for s in P}
    json.dump({"segments": P, "duree": D, "voix": fa, "mots": mots}, open("build/plan.json", "w"), ensure_ascii=False, indent=1)
    open("film/assets/timing.js", "w").write("window.T=" + json.dumps({"shots": shots, "mots": mots, "duree": D}, ensure_ascii=False) + ";\n")
    for s in P:
        print(f"{s['id']:4s} {s['debut']+14:6.2f}-{s['fin']+14:6.2f} s du film  ({s['src_in']:.2f}->{s['src_out']:.2f})  {' '.join(v[0] for v in s['voix'])}")
    print(f"durée de la suite {D:.2f} s -> film complet {14 + D:.2f} s")

def images():
    P, D = plans()
    N = int(round(D * FPS))
    grade = "eq=contrast=1.05:saturation=1.04:gamma=0.985,colorbalance=rs=-0.015:bs=0.02:rh=0.02:bh=-0.015,vignette=angle=0.5,noise=c0s=5:c0f=t+u"
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-vf", grade, "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", "film/assets/plans-suite.mp4"],
                           stdin=subprocess.PIPE)
    written = 0
    for s in P:
        n = int(round(s["fin"] * FPS)) - int(round(s["debut"] * FPS))
        if s["id"] == "FIN":   # dernière image du gag, tenue
            raw = subprocess.run(["ffmpeg", "-v", "error", "-sseof", "-0.05", "-i", s["src"], "-frames:v", "1", "-vf", f"scale={W}:-2,crop={W}:{H}",
                                  "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
            fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)[-1:]
        else:
            raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{s['src_in']:.3f}", "-i", s["src"], "-t", f"{n / FPS + 0.2:.3f}",
                                  "-vf", f"fps={FPS},scale={W}:-2:flags=lanczos,crop={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                                 capture_output=True).stdout
            fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
        for i in range(n):
            enc.stdin.write(fr[min(i, len(fr) - 1)].tobytes()); written += 1
        print(f"{s['id']}: {n} images (source {len(fr)})")
    enc.stdin.close(); enc.wait()
    print("total", written, "images", "attendu", N)

if __name__ == "__main__":
    {"plan": plan, "images": images}[sys.argv[1]]()
