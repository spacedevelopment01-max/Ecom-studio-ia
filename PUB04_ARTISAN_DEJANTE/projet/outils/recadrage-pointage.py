"""Recadrage de précision des images de pointage : détecte le bout de l'index, réduit l'image autour d'un point d'ancrage
pour amener le bout du doigt à (cible_x, cible_y) dans le cadre 1080x1920, bords gris à compléter."""
import subprocess, numpy as np, json, sys
W, H = 768, 1376; S = W / 1080
def load(p): return np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i",p,"-f","rawvideo","-pix_fmt","rgb24","-"],capture_output=True).stdout,np.uint8).reshape(H,W,3)
def tip(im, ty):
    r,g,b = [im[...,i].astype(int) for i in range(3)]
    skin = (r>150)&(g>95)&(b>60)&(r-b>45)&(r>g)&(g>b)
    y0, y1 = int((ty-120)*S), int((ty+120)*S); m = np.zeros_like(skin); m[y0:y1, 560:] = skin[y0:y1, 560:]
    ys, xs = np.where(m); i = np.argmax(xs); return xs[i]/S, ys[i]/S
CIBLES = {"K2": 1004, "K3c": 1121, "K13b": 1292, "K14c": 1292}
TX = 935
MANUEL = {"K2": (1039, 967), "K3c": (1042, 1126)}   # mesurés sur agrandissement quadrillé (le mur beige trompe la détection)
out = {}
for k, ty in CIBLES.items():
    src = f"cles/{k}/propre.png" if k == "K13b" else f"cles/{k}/sortie-1.png"
    im = load(src); xf, yf = MANUEL.get(k) or tip(im, ty)
    s = TX / xf; ay = (ty - s * yf) / (1 - s)
    # image réduite de s, placée de façon que (0, ay) reste fixe
    nw, nh = int(round(W * s)), int(round(H * s)); oy = int(round(ay * S * (1 - s)))
    small = subprocess.run(["ffmpeg","-v","error","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-i","-","-vf",f"scale={nw}:{nh}:flags=lanczos","-f","rawvideo","-pix_fmt","rgb24","-"],input=im.tobytes(),capture_output=True).stdout
    small = np.frombuffer(small,np.uint8).reshape(nh,nw,3)
    canvas = np.full((H,W,3), 128, np.uint8); y0 = max(0, oy); sy0 = y0 - oy; hh = min(nh - sy0, H - y0)
    canvas[y0:y0+hh, 0:nw] = small[sy0:sy0+hh]
    subprocess.run(["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-i","-",f"cles/recadre/{k}-canvas.png"],input=canvas.tobytes())
    out[k] = {"bout_doigt_avant": [round(xf), round(yf)], "echelle": round(s, 4), "zone": [0, y0, nw, y0+hh]}
    print(f"{k}: bout du doigt ({xf:.0f}, {yf:.0f}) -> ({TX}, {ty}) | échelle {s:.3f} | image en x 0-{nw}, y {y0}-{y0+hh} (sur 768x1376)")
json.dump(out, open("cles/recadre/zones.json","w"), indent=1)
