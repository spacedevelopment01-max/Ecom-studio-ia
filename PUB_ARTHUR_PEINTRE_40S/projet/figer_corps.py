"""Fige le corps d'un plan parlant sur une image de référence et garde la tête vivante (bouche, yeux, sourcils d'origine).
Sert quand le modèle déplace ce qui doit rester en place : bras pointé vers la bulle commentaire (A6), rouleau levé et téléphone
écran vers la caméra (A5). Aucun appel payant.

Usage : python3 figer_corps.py SRC R OUT cx cy ax ay [t0 t1]
  t0 t1 : fenêtre où une main passe devant la mâchoire (ce côté de la mâchoire reprend la dernière image propre).
  R : numéro de l'image de référence (corps figé à partir de là) ; cx cy ax ay : ellipse qui contient la tête et le haut du cou.
La tête est recalée sur sa position de l'image R (corrélation, lissée dans le temps), détourée (peau + cheveux + barbe,
sans le décor ni les objets tenus en main) puis fondue dans l'image figée."""
import os, subprocess, sys
import numpy as np, cv2
SRC, R, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]
cx, cy, ax, ay = map(int, sys.argv[4:8])
FENETRE = tuple(map(float, sys.argv[8:10])) if len(sys.argv) > 9 else None   # (début, fin) en secondes
os.makedirs(os.path.dirname(OUT), exist_ok=True)
w, h = map(int, subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height", "-of", "csv=p=0", SRC],
                               capture_output=True, text=True).stdout.strip().split(","))
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", SRC, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
F = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
ref = F[R]
x0, x1, y0, y1 = cx - int(ax * .85), cx + int(ax * .85), cy - int(ay * .9), cy + int(ay * .3)   # cheveux + visage
tpl = cv2.cvtColor(np.ascontiguousarray(ref[y0:y1, x0:x1]), cv2.COLOR_RGB2GRAY)
zone = np.zeros((h, w), np.uint8); cv2.ellipse(zone, (cx, cy), (ax, ay), 0, 0, 360, 255, -1)

def tete(im):
    """Peau, cheveux et barbe dans l'ellipse, trous (yeux, dents) bouchés : la plus grande zone d'un seul tenant."""
    hsv = cv2.cvtColor(np.ascontiguousarray(im), cv2.COLOR_RGB2HSV).astype(np.int16)
    H_, S_, V_ = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    peau = (H_ <= 22) & (S_ > 70) & (V_ > 80)
    poil = (V_ < 105) & (S_ < 200)
    m = ((peau | poil).astype(np.uint8) * 255) & zone
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n <= 1: return m
    k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); m = (lab == k).astype(np.uint8) * 255
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out = np.zeros_like(m); cv2.drawContours(out, cnts, -1, 255, -1)
    return out

M = 70; d = []
for f in F[R:]:
    g = cv2.cvtColor(np.ascontiguousarray(f), cv2.COLOR_RGB2GRAY)
    zy0, zx0 = max(0, y0 - M), max(0, x0 - M)
    res = cv2.matchTemplate(g[zy0:y1 + M, zx0:x1 + M], tpl, cv2.TM_CCOEFF_NORMED)
    _, sc, _, loc = cv2.minMaxLoc(res); d.append((loc[0] + zx0 - x0, loc[1] + zy0 - y0, sc))
d = np.array(d, float)
lis = np.stack([np.convolve(np.pad(d[:, j], 2, mode="edge"), np.ones(5) / 5, mode="valid") for j in (0, 1)], 1)   # déplacement lissé
mref = tete(ref)
proche = cv2.dilate(mref, np.ones((31, 31), np.uint8))
mjoue = np.zeros((h, w), np.uint8); mjoue[cy + 25:, : cx - 28] = 255
mjoue = cv2.GaussianBlur(cv2.bitwise_and(mjoue, cv2.dilate(mref, np.ones((41, 41), np.uint8))).astype(np.float32) / 255, (0, 0), 6)[..., None]
out = list(F[:R]); propre = None
for i, f in enumerate(F[R:]):
    dx, dy = lis[i]
    head = cv2.warpAffine(np.ascontiguousarray(f), np.float32([[1, 0, -dx], [0, 1, -dy]]), (w, h), borderMode=cv2.BORDER_REPLICATE)
    m = cv2.dilate(cv2.bitwise_or(cv2.bitwise_and(tete(head), proche), mref), np.ones((5, 5), np.uint8))   # rien au-delà de 15 px de la tête de référence
    # objets tenus en main qui passent devant le menton (écran blanc, coque noire) : repris de la dernière image propre
    hv = cv2.cvtColor(np.ascontiguousarray(head), cv2.COLOR_RGB2HSV).astype(np.int16)
    objet = (((hv[..., 1] < 38) & (hv[..., 2] > 150)) | ((hv[..., 1] < 45) & (hv[..., 2] < 45))).astype(np.uint8) * 255
    zone_objet = np.zeros_like(objet); zone_objet[cy + 40:, : cx - 35] = 255   # bas de la tête, côté où entre la main (jamais la bouche)
    objet = cv2.bitwise_and(cv2.bitwise_and(objet, zone_objet), cv2.erode(mref, np.ones((13, 13), np.uint8)))
    objet = cv2.dilate(cv2.morphologyEx(objet, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)), np.ones((5, 5), np.uint8))
    m = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 2.5)[..., None]
    comp = (head * m + ref * (1 - m)).astype(np.uint8)
    t = (R + i) / 30
    if FENETRE and FENETRE[0] <= t <= FENETRE[1] and propre is not None:   # la main passe devant la mâchoire : ce côté reprend la dernière image propre
        comp = (propre * mjoue + comp * (1 - mjoue)).astype(np.uint8)
    else: propre = comp
    out.append(comp)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", "30", "-i", "-",
                        "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", OUT], stdin=subprocess.PIPE)
for o in out: enc.stdin.write(np.ascontiguousarray(o).tobytes())
enc.stdin.close(); enc.wait()
cv2.imwrite(OUT.replace(".mp4", "-masque-ref.png"), mref)
print(OUT, len(out), "images ; déplacement max", np.abs(d[:, :2]).max(0).tolist(), "corrélation min", round(d[:, 2].min(), 2))
