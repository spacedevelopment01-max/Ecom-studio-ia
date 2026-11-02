"""Montage de la publicité « Je suis peintre, pas informaticien ! » (Arthur, 40,000 s, 1080 x 1920, 30 i/s).
Plans parlants : Kling AI Avatar v2 Standard (bouche générée à partir de la voix Simon). Plans d'action : Wan 2.6 Flash (sans son).
Écrans (téléphone, site, publication, Syna) et fin : composition HyperFrames (film/index.html), calée sur film/assets/timing.js.

Usage : python3 montage.py plan    -> plan.json, film/assets/timing.js, voix.wav, sous-titres.srt
        python3 montage.py images  -> film/assets/plans.mp4 (étalonné)"""
import json, os, subprocess, sys
import numpy as np

FPS, W, H, SR, DUREE = 30, 1080, 1920, 44100, 40.0
R = os.path.dirname(os.path.abspath(__file__))
AV = lambda k: f"{R}/av/{k}/sortie-1.mp4"
ACT = lambda k: f"{R}/act/{k}/sortie-1.mp4"
IMG = lambda p: f"{R}/cles/{p}"
VX = lambda k: f"{R}/voix/morceaux/{k}.wav"
MOR = json.load(open(f"{R}/voix/morceaux/morceaux.json"))

# (id, source, début source, durée, [(morceau, décalage dans le plan)], pointage)
# source : vidéo .mp4, ou image fixe .png (plan d'écran : l'image floutée sert de fond à la composition)
PLANS = [
    ("A1",    AV("A1"),   0.00, 3.25, [("p1", 0.03)], None),                 # « Je vais te montrer comment j'évite… ma com'. »
    ("A2a",   AV("A2a"),  0.00, 2.20, [("p2a", 0.0)], "plus"),               # « Moi, c'est Arthur ! Abonne-toi là, » (doigt sur le +)
    ("A2b",   AV("A2b"),  0.00, 1.25, [("p2b", 0.0)], "coeur"),              # « mets un cœur ici… » (doigt sur le cœur)
    ("W3a",   ACT("W3a"), 0.00, 1.30, [("p2c", 0.0), ("p3", 0.48)], None),  # « viens ! » : dernier coup de rouleau ; « Ça y est ! »
    ("W3b",   ACT("W3b"), 0.30, 1.91, [], None),                            # petite danse, clés en main : « Chantier terminé. Je rentre ! »
    ("A4",    AV("A4"),   0.00, 1.65, [("p4a", 0.0)], None),                 # à la porte, notification : « Oh non… » (sourire qui se fige)
    ("TEL",   IMG("KA7/sortie-1.png"), 0.0, 3.50, [("p4b", 0.05)], None),    # gros plan du téléphone : les deux rappels
    ("MUR",   ACT("W5"),  1.00, 1.70, [("p5a", 0.0)], None),                 # gros plan : sa main passe un coup de rouleau parfait : « Un mur nickel ? Facile. »
    ("A5",    AV("A5"),   0.00, 1.78, [("p5b", 0.0)], None),                 # téléphone et rouleau : « Une publication nickel ? »
    ("A5c",   AV("A5c"),  0.00, 1.60, [], None),                            # rouleau levé, face caméra : « Je prends quel rouleau, moi ? » (suite de p5b)
    ("A6",    AV("A6fix"), 0.00, 3.42, [("p6", 0.0)], "com"),                # « Et toi, tu fais quoi comme métier ? Dis-moi juste là ! »
    ("A7",    AV("A7"),   0.00, 0.99, [("p7a", 0.0)], None),                 # « Bon, regarde. »
    ("ECRAN", IMG("KA10b/sans-logo.png"), 0.0, 6.02, [("p7b", 0.0)], None),  # site + publication assortie (voix off), sa main touche l'écran
    ("SYNA",  IMG("KA10b/sans-logo.png"), 0.0, 2.71, [("p8a", 0.0)], None),  # conversation Syna, galerie réordonnée
    ("A8",    AV("A8"),   0.00, 1.50, [("p8b", 0.0)], None),                 # « Ah, là, c'est mieux ! »
    ("A9",    AV("A9"),   0.00, 2.55, [("p9", 0.0)], None),                  # « Allez… cette fois, je rentre. Promis ! »
    ("W9",    ACT("W9"),  0.90, 0.80, [], None),                            # il file par la porte
    ("FIN",   ACT("W9"),  2.95, None, [], None),                            # logo officiel + signature jusqu'à 40,000 s
]


def plans():
    out, t = [], 0.0
    for sid, src, a, d, voix, pt in PLANS:
        if d is None: d = DUREE - t
        out.append({"id": sid, "src": src, "src_in": a, "duree": round(d, 4), "debut": round(t, 4), "fin": round(t + d, 4), "voix": voix, "pointage": pt})
        t += d
    assert abs(t - DUREE) < 1e-6, t
    return out

def plan():
    P = plans(); pos = {}; mots = {}
    for s in P:
        for k, off in s["voix"]:
            pos[k] = round(s["debut"] + off, 4)
            mots[k] = [{"mot": m["mot"], "t": round(pos[k] + m["t"], 3), "f": round(pos[k] + m["f"], 3)} for m in MOR[k]["mots"]]
    n = int(DUREE * SR); y = np.zeros(n + SR, np.float32)
    for k, t0 in pos.items():
        x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", VX(k), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout, np.float32)
        i = int(round(t0 * SR)); y[i:i + len(x)] += x
    y = y[:n]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "pcm_s16le", f"{R}/voix.wav"], input=y.tobytes(), check=True)
    shots = {s["id"]: [s["debut"], s["fin"], s["src_in"], s["pointage"]] for s in P}
    json.dump({"segments": P, "duree": DUREE, "voix": pos, "mots": mots}, open(f"{R}/plan.json", "w"), ensure_ascii=False, indent=1)
    os.makedirs(f"{R}/film/assets", exist_ok=True)
    open(f"{R}/film/assets/timing.js", "w").write("window.T=" + json.dumps({"shots": shots, "mots": mots, "duree": DUREE}, ensure_ascii=False) + ";\n")
    for s in P:
        print(f"{s['id']:5s} {s['debut']:6.2f}-{s['fin']:6.2f}  src {s['src_in']:.2f}  {' '.join(v[0] for v in s['voix'])}")
    print(f"durée {DUREE:.3f} s")

def brouillon(fr):
    """Écran du téléphone (A5, A5c) : brouillon de publication vide posé sur la zone blanche de l'écran, image par image.
    Les doigts qui tiennent le téléphone restent devant (seuls les pixels blancs de l'écran sont remplacés)."""
    import cv2
    ui = cv2.cvtColor(cv2.imread(f"{R}/cles/telephone-brouillon.png"), cv2.COLOR_BGR2RGB)
    out = []
    for f in fr:
        f = f.copy(); hsv = cv2.cvtColor(f, cv2.COLOR_RGB2HSV)
        m = ((hsv[..., 1] < 28) & (hsv[..., 2] > 195)).astype(np.uint8)
        sub = np.zeros_like(m); sub[400:720, 170:420] = m[400:720, 170:420]
        n, lab, st, _ = cv2.connectedComponentsWithStats(sub)
        if n > 1:
            k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); x, y, w, h, a = st[k]
            if a > 9000 and 1.6 < h / w < 2.3:
                zone = (lab == k).astype(np.uint8) * 255
                zone = cv2.morphologyEx(zone, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
                alpha = cv2.GaussianBlur(zone.astype(np.float32) / 255, (0, 0), 0.8)[y:y + h, x:x + w, None]
                u = cv2.resize(ui, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32)
                f[y:y + h, x:x + w] = (u * alpha + f[y:y + h, x:x + w] * (1 - alpha)).astype(np.uint8)
        out.append(f)
    return np.stack(out)

def images():
    P = plans()
    grade = "eq=contrast=1.03:saturation=1.04:gamma=0.995,vignette=angle=0.42,noise=c0s=3:c0f=t+u"
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-vf", grade, "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", f"{R}/film/assets/plans.mp4"], stdin=subprocess.PIPE)
    total = 0
    for s in P:
        n = int(round(s["fin"] * FPS)) - int(round(s["debut"] * FPS))
        cover = f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}"
        if s["src"].endswith(".png"):   # fond flou des écrans
            raw = subprocess.run(["ffmpeg", "-v", "error", "-i", s["src"], "-frames:v", "1", "-vf", cover + ",gblur=sigma=26,eq=brightness=-0.06",
                                  "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        elif s["id"] == "FIN":
            raw = subprocess.run(["ffmpeg", "-v", "error", "-sseof", "-0.05", "-i", s["src"], "-frames:v", "1", "-vf", cover, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        else:
            raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{s['src_in']:.3f}", "-i", s["src"], "-t", f"{n / FPS + 0.2:.3f}", "-vf", f"fps={FPS}," + cover,
                                  "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
        if s["id"] in ("A5", "A5c"): fr = brouillon(fr)
        for i in range(n):
            enc.stdin.write(fr[min(i, len(fr) - 1)].tobytes()); total += 1
        print(f"{s['id']}: {n} images (source {len(fr)})", flush=True)
    enc.stdin.close(); enc.wait()
    print("images :", total, "attendu", int(round(DUREE * FPS)))

if __name__ == "__main__":
    {"plan": plan, "images": images}[sys.argv[1]]()
