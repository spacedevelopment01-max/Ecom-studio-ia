"""Logo de la démo Sonore sans la ligne fautive « SUPRA-AURICUULAIRE » (sans IA, gratuit) : les lettres de cette ligne sont rendues transparentes, l'anneau, « SONORE » et « CASQUE AUDIO » restent intacts.
   python3 -I scripts/demo-sonore-sans-ligne.py public/demo/casque/logo.png reports/marque/sonore-logo-apres.png
N'écrase pas le fichier de démo : le résultat est écrit où on le demande, pour être regardé avant."""
import sys
from collections import deque
import numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = np.array(Image.open(src).convert("RGBA"))
H, W = im.shape[:2]
a = im[:, :, 3]
Y0, Y1 = 600, 820  # bande du bas (sous « SONORE »)
mask = a > 40
seen = np.zeros_like(mask)
comps = []
for y in range(Y0, Y1):
    for x in range(W):
        if mask[y, x] and not seen[y, x]:
            q = deque([(y, x)]); seen[y, x] = True; pts = []
            while q:
                cy, cx = q.popleft(); pts.append((cy, cx))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; q.append((ny, nx))
            comps.append(pts)
removed = 0
gone = np.zeros_like(mask); kept = np.zeros_like(mask)
for pts in comps:
    ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
    keep = lambda: [kept.__setitem__((y, x), True) for y, x in pts]
    if len(pts) > 6000: keep(); continue  # l'anneau (et ce qui y est relié)
    cy, cx = sum(ys) / len(ys), sum(xs) / len(xs)
    if min(ys) < Y0 + 1: keep(); continue  # touche le haut de la bande (« SONORE »)
    if 625 <= cy <= 675 and 195 <= cx <= 545: keep(); continue  # « CASQUE AUDIO »
    for y, x in pts: gone[y, x] = True
    removed += 1
# Halo clair autour des lettres retirées : effacé dans un rayon de 5 px, jamais sur l'anneau ni « CASQUE AUDIO »
# (qui gardent aussi leur propre bord sur 2 px).
def dilate(m, r):
    o = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            o |= np.roll(np.roll(m, dy, 0), dx, 1)
    return o
zone = dilate(gone, 5) & ~dilate(kept, 2)
im[zone, 3] = 0
# Halo d'anticrénelage autour des lettres retirées : pixels semi-transparents isolés de la bande.
Image.fromarray(im).save(out)
print("composantes retirées :", removed, "sur", len(comps))
