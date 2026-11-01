"""Montage de la Pub 04 « L'artisan complètement déjanté » (1080 x 1920, 30 i/s).
Chaque réplique est jouée dans un plan parlant (Kling AI Avatar v2 Pro, bouche générée à partir de la voix Simon) ;
les gags muets et les voix off sur plans larges utilisent les plans Kling v3 standard.

Usage : python3 montage.py plan    -> plan.json, film/assets/timing.js, voix.wav
        python3 montage.py images  -> film/assets/plans.mp4 (étalonné)"""
import json, os, subprocess, sys
import numpy as np

FPS, W, H, SR = 30, 1080, 1920, 44100
R = os.path.dirname(os.path.abspath(__file__))
AV = lambda k: f"{R}/av/{k}/sortie-1.mp4"
ACT = lambda k: f"{R}/act/{k}/sortie-1.mp4"
VX = lambda k: f"{R}/voix/morceaux/{k}.wav"
MOR = json.load(open(f"{R}/voix/morceaux/morceaux.json"))

# (id, vidéo, début source, fin source | None = durée de la réplique + 0,04, [(réplique, décalage dans le plan)], pointage)
PLANS = [
    ("A1a", AV("A1a"), 0.0, None, [("1a", 0.0)], None),          # « TOI ! Oui, toi, l'artisan ! »
    ("A1b", AV("A1b"), 0.0, None, [("1b", 0.0)], "plus"),        # « Le petit plus, là ! » (doigt sur le +)
    ("T1c", ACT("T1c"), 1.10, 1.90, [], "geste"),                # le doigt descend vers le cœur
    ("A1d", AV("A1d"), 0.0, None, [("1d", 0.0)], "coeur"),       # « Et le cœur juste dessous ! Clique, j'te vois ! »
    ("A2a", AV("A2a"), 0.0, None, [("2a", 0.0)], None),          # « Moi, les murs, je les fais nickel. »
    ("T2b", ACT("T2b"), 0.50, 1.30, [], None),                   # le chaos envahit le chantier
    ("A2c", AV("A2c2") if os.path.exists(AV("A2c2")) else AV("A2c"), 0.0, None, [("2c", 0.0)], None),   # refait : visage net, rien ne passe devant          # « Mais le site, les pubs, les réseaux… Oh ! J'suis plâtrier-peintre, »
    ("A2d", AV("A2d"), 0.0, None, [("2d", 0.0)], None),          # « pas ministre d'Internet ! » (costume)
    ("POUF", AV("A2c"), 3.60, 3.90, [], None),                   # le costume disparaît (pouf)
    ("A3a", AV("A3a"), 0.0, None, [("3a", 0.0)], None),          # « Et après, on me dit : faut trouver des clients ! »
    ("A3b", AV("A3b"), 0.0, None, [("3b", 0.0)], None),          # « Mon téléphone, lui, il fait la grève ! »
    ("T3c", ACT("T3c"), 0.60, 1.04, [], None),                   # le téléphone saute, pancarte « EN GRÈVE » (images brouillées 1,06-1,30 retirées)
    ("T3d", ACT("T3c"), 1.88, 2.39, [], None),                   # il lève les bras au ciel, le téléphone manifeste à ses pieds
    ("A4a", AV("A4a"), 0.0, None, [("4a", 0.0)], None),          # « Et là, je découvre E-COM STUDIO IA, avec Syna. »
    ("T4b", ACT("T4b"), 1.15, 2.25, [], None),                   # la porte s'ouvre sur l'univers de création
    ("A4c", AV("A4c"), 0.0, None, [("4c", 0.0)], None),          # « Je lui explique mon métier… et regarde ça ! »
    ("A5a1", AV("A5afix") if os.path.exists(AV("A5afix")) else AV("A5a"), 0.0, None, [("5a1", 0.0)], "com"),   # bras figé sur la bulle (av/fix_bras.py)       # « D'ailleurs, toi, tu fais quoi comme métier ? »
    (("A5a2", AV("A5a2fix"), 0.0, None, [("5a2", 0.0)], "com") if os.path.exists(AV("A5a2fix")) else   # bras figé sur la bulle (av/fix_a5a2.py)
     ("A5a2", AV("A5a"), 2.19, None, [("5a2", 0.0)], "com")),  # « Écris-le en commentaire, là, sous le cœur ! » (plan court, bras immobile)
    ("A5b", AV("A5b"), 0.0, None, [("5b", 0.0)], "com"),         # « Je veux savoir ! »
    ("T6a", ACT("T6a"), 0.60, 2.70, [("6v1", 0.04)], None),      # le camion reçoit son identité (voix off)
    ("T6b", ACT("T6b"), 0.10, 2.85, [("6v2", 0.05)], None),      # le site se construit (voix off)
    ("A6c", AV("A6c"), 0.0, None, [("6c", 0.0)], None),          # « tout prend forme ! Mais qui a engagé des lutins ?! »
    ("T6d", ACT("T6d"), 1.45, 2.80, [], None),                   # lutins sous le camion, il sursaute
    ("A7a", AV("A7a"), 0.0, None, [("7a", 0.0)], None),          # « Mes photos deviennent des publications, »
    ("T7b", ACT("T7b"), 0.65, 2.95, [("7v", 0.02)], None),       # la photo devient visuel, publication, publicité (voix off)
    ("A7c", AV("A7c"), 0.0, None, [("7c", 0.0)], None),          # « Et tout garde le même style. »
    ("A7d", AV("A7d"), 0.0, None, [("7d", 0.0)], None),          # « Même moi, j'suis assorti ! »
    ("A8a", AV("A8a"), 0.0, None, [("8a", 0.0)], None),          # « Et si je veux changer ? Je demande à Syna. »
    ("T8b", ACT("T8b"), 0.35, 2.95, [("8v", 0.15)], None),       # le site devient premium (voix off « Hop ! … »)
    ("A8c", AV("A8c"), 0.0, None, [("8c", 0.0)], None),          # « Ça, c'est du travail ! »
    ("A9a", AV("A9a"), 0.0, None, [("9a", 0.0)], None),          # « Bref : je suis artisan, pas agence de communication ! »
    ("A9b", AV("A9b"), 0.0, None, [("9b", 0.0)], None),          # « E-COM STUDIO IA. Tout au même endroit. Maintenant, à toi de jouer ! »
    ("T9c", ACT("T9c"), 0.65, 2.95, [], None),                   # signature : le panneau glisse, il se rattrape
    ("FIN", ACT("T9c"), 2.95, 2.95, [], None),                   # dernière image tenue (regard innocent), puis coupure
]
FIN_TENUE = 0.45

def plans():
    out, t = [], 0.0
    for sid, src, a, b, voix, pt in PLANS:
        if b is None:
            b = a + MOR[voix[0][0]]["duree"] + 0.02
        d = FIN_TENUE if sid == "FIN" else b - a
        out.append({"id": sid, "src": src, "src_in": a, "src_out": b, "debut": round(t, 4), "fin": round(t + d, 4), "voix": voix, "pointage": pt})
        t += d
    return out, round(t, 4)

def plan():
    P, D = plans()
    pos = {}; mots = {}
    for s in P:
        for k, off in s["voix"]:
            pos[k] = s["debut"] + off
            mots[k] = [{"mot": m["mot"], "t": round(pos[k] + m["t"], 3), "f": round(pos[k] + m["f"], 3)} for m in MOR[k]["mots"]]
    n = int(D * SR) + SR; y = np.zeros(n, np.float32)
    for k, t0 in pos.items():
        x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", VX(k), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout, np.float32)
        i = int(round(t0 * SR)); y[i:i + len(x)] += x[:n - i]
    y = y[:int(D * SR)]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "pcm_s16le", f"{R}/voix.wav"], input=y.tobytes(), check=True)
    shots = {s["id"]: [s["debut"], s["fin"], s["src_in"], s["pointage"]] for s in P}
    json.dump({"segments": P, "duree": D, "voix": pos, "mots": mots}, open(f"{R}/plan.json", "w"), ensure_ascii=False, indent=1)
    os.makedirs(f"{R}/film/assets", exist_ok=True)
    open(f"{R}/film/assets/timing.js", "w").write("window.T=" + json.dumps({"shots": shots, "mots": mots, "duree": D}, ensure_ascii=False) + ";\n")
    for s in P:
        print(f"{s['id']:4s} {s['debut']:6.2f}-{s['fin']:6.2f}  ({s['src_in']:.2f}->{s['src_out']:.2f})  {' '.join(v[0] for v in s['voix'])}")
    print(f"durée {D:.2f} s")

def images():
    P, D = plans()
    grade = "eq=contrast=1.04:saturation=1.05:gamma=0.99,vignette=angle=0.45,noise=c0s=4:c0f=t+u"
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-vf", grade, "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", f"{R}/film/assets/plans.mp4"], stdin=subprocess.PIPE)
    total = 0
    for s in P:
        n = int(round(s["fin"] * FPS)) - int(round(s["debut"] * FPS))
        vf = f"fps={FPS},scale={W}:-2:flags=lanczos,crop={W}:{H}"
        if s["id"] == "FIN":
            raw = subprocess.run(["ffmpeg", "-v", "error", "-sseof", "-0.05", "-i", s["src"], "-frames:v", "1", "-vf", f"scale={W}:-2,crop={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        else:
            raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{s['src_in']:.3f}", "-i", s["src"], "-t", f"{n / FPS + 0.2:.3f}", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
        for i in range(n):
            enc.stdin.write(fr[min(i, len(fr) - 1)].tobytes()); total += 1
    enc.stdin.close(); enc.wait()
    print("images :", total, "attendu", int(round(D * FPS)))

if __name__ == "__main__":
    {"plan": plan, "images": images}[sys.argv[1]]()
