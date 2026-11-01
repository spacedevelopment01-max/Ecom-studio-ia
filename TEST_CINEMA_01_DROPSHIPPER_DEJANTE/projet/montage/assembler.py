"""Assemble les 5 plans (24 i/s, 14 s = 336 images) d'après le calage sur la voix.
Chaque image du film pointe vers une image d'une source (Kling d'origine 'k' ou synchronisée 's')."""
import subprocess, numpy as np, json
FPS, N, W, H = 24, 336, 716, 1284
def load(p):
    raw = subprocess.run(["ffmpeg","-v","error","-i",p,"-f","rawvideo","-pix_fmt","rgb24","-"],capture_output=True).stdout
    return np.frombuffer(raw,np.uint8).reshape(-1,H,W,3)
src = {}
for k in ["p1","p2","p3","p4","p5"]:
    src[k+"k"] = load(f"anim/{k}/sortie-1.mp4"); src[k+"s"] = load(f"lipsync/{k}/sortie-1.mp4")
def pick(k, t, synced=True):
    i = int(np.floor(t*FPS + 1e-6)); kind = "s" if synced else "k"
    arr = src[k+kind]
    if i >= len(arr):                       # au-delà de la vidéo synchronisée : image d'origine
        arr = src[k+"k"]; kind = "k"
    i = max(0, min(i, len(arr)-1)); return arr[i], f"{k}{kind}{i}"
CUTS = [0, 75, 130, 181, 260, 336]          # P1..P5 en images (3,125 / 5,417 / 7,542 / 10,833 s)
plan = []
out = subprocess.Popen(["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-",
    "-vf","scale=1080:1937:flags=lanczos,crop=1080:1920:0:8,unsharp=5:5:0.45:5:5:0","-c:v","libx264","-crf","12","-preset","slow","-pix_fmt","yuv420p","montage/plans.mp4"], stdin=subprocess.PIPE)
for f in range(N):
    t = f / FPS
    if f < CUTS[1]: img, tag = pick("p1", t)
    elif f < CUTS[2]:
        kt = t - 2.84; img, tag = pick("p2", kt, synced=not (1.50 <= kt < 1.80))    # éclair doré : image d'origine
    elif f < CUTS[3]: img, tag = pick("p3", t - 4.90)
    elif f < CUTS[4]:
        kt = max(0.0, (t - 7.55) * 1.2242); img, tag = pick("p4", kt, synced=kt < 3.30)  # écrasement dans les papiers : origine
    else:
        # « Je lance une boutique ou une » synchronisé ; recul éclair ; sur « fusée » l'ordinateur décolle ; ralenti
        if t < 11.95: img, tag = pick("p5", t - 10.65)
        elif t < 12.10: img, tag = pick("p5", 1.30 + (t - 11.95) * (1.15 / 0.15), synced=False)
        elif t < 12.40: img, tag = pick("p5", 2.45 + (t - 12.10) * (0.40 / 0.30), synced=False)
        else: img, tag = pick("p5", min(4.0, 2.85 + (t - 12.40) * (1.15 / 1.60)), synced=False)
    plan.append(tag); out.stdin.write(img.tobytes())
out.stdin.close(); out.wait()
json.dump(plan, open("montage/plans-sources.json","w"))
print("ok", len(plan), "images ; exemples :", plan[0], plan[74], plan[75], plan[129], plan[130], plan[180], plan[181], plan[259], plan[260], plan[335])
