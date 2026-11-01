"""Assemble les 46,5 s (24 i/s, 1080 × 1920) d'après montage/plan.json, plan par plan (mémoire limitée).
Pour chaque image : plan Kling d'origine, ou version à lèvres synchronisées (lipsync/<plan>/sortie-1.mp4) si elle
existe ET que l'instant est pendant une réplique. Puis étalonnage identique aux 14 s validées."""
import json, os, subprocess, numpy as np
FPS, W, H = 24, 1080, 1920
plan = json.load(open("montage/plan.json"))
N = int(round(plan["duree"] * FPS))
def charger(p):
    raw = subprocess.run(["ffmpeg","-v","error","-i",p,"-vf",f"scale={W}:-2:flags=lanczos,crop={W}:{H}","-f","rawvideo","-pix_fmt","rgb24","-"],capture_output=True).stdout
    return np.frombuffer(raw,np.uint8).reshape(-1,H,W,3)
parole = [(v["debut"] - 0.10, v["fin"] + 0.15) for v in plan["voix"]]
def parle(t): return any(a <= t <= b for a, b in parole)
ffm = subprocess.Popen(["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-",
   "-vf","eq=contrast=1.05:saturation=1.04:gamma=0.985,colorbalance=rs=-0.015:bs=0.02:rh=0.02:bh=-0.015,vignette=angle=0.5,noise=c0s=5:c0f=t+u",
   "-c:v","libx264","-crf","14","-preset","medium","-pix_fmt","yuv420p","film/assets/plans-suite.mp4"], stdin=subprocess.PIPE)
journal, cur, srcA, syncA = [], None, None, None
for f in range(N):
    t = f / FPS
    seg = next((s for s in plan["segments"] if s["debut"] <= t < s["fin"]), plan["segments"][-1])
    k = seg["plan"]
    if k != cur:   # un seul plan en mémoire à la fois
        cur = k; srcA = charger(f"../animations/kling/plan-{k}.mp4")
        syncA = charger(f"../animations/synchro-labiale/plan-{k}.mp4") if os.path.exists(f"../animations/synchro-labiale/plan-{k}.mp4") else None
    ts = min(seg["src_out"], seg["src_in"] + (t - seg["debut"]) * seg["vitesse"]); i = int(np.floor(ts * FPS + 1e-6))
    arr, tag = srcA, "k"
    if syncA is not None and parle(t) and i < len(syncA): arr, tag = syncA, "s"
    i = max(0, min(i, len(arr) - 1)); ffm.stdin.write(arr[i].tobytes()); journal.append(f"{k}{tag}{i}")
ffm.stdin.close(); ffm.wait()
json.dump(journal, open("build/sources-images.json","w"))
print("ok", N, "images,", sum(1 for j in journal if j[1] == "s"), "images synchronisées")
