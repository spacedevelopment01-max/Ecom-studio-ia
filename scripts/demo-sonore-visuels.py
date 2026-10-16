"""Visuels Sonore rendus par le studio (gabarits : post-3 à post-7, ad-1, social-1, banner-1) : la ligne fautive
« SUPRA-AURICUULAIRE » du petit logo est effacée, à sa place exacte, et la photo dessous est reconstituée à partir
des pixels voisins. Le reste de l'image n'est pas touché (sans IA, gratuit). Les publications post-1 et post-2,
dessinées par l'IA, ne sont pas concernées.
   python3 -I scripts/demo-sonore-visuels.py <ancien logo.png> <dossier de sortie>
Positions mesurées par corrélation avec l'ancien logo (scripts/demo-sonore-visuels-places.json, 16/10/2026)."""
import json, os, sys
import numpy as np
from PIL import Image

old_path, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
data = json.load(open("scripts/demo-sonore-visuels-places.json"))
bb = tuple(data["bbox"])
old = Image.open(old_path).convert("RGBA").crop(bb)
new = Image.open("public/demo/casque/logo.png").convert("RGBA").crop(bb)


def dilate(m, r):
    o = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            o |= np.roll(np.roll(m, dy, 0), dx, 1)
    return o


for name, (_, x, y, w, h) in data["places"].items():
    oa = np.array(old.resize((w, h), Image.BILINEAR))[:, :, 3] / 255
    na = np.array(new.resize((w, h), Image.BILINEAR))[:, :, 3] / 255
    gone = (oa > 0.02) & (na < 0.15)
    gone[: int(h * 0.55)] = False  # la ligne retirée est sous « SONORE »
    for ext in ("jpg", "webp"):
        src = f"public/demo/casque/{name}.{ext}"
        if not os.path.exists(src):
            continue
        im = np.array(Image.open(src).convert("RGB")).astype(float)
        H, W = im.shape[:2]
        m = np.zeros((H, W), bool)
        m[y:y + h, x:x + w] = gone
        # Marge de 1 px (2 px pour un logo de 48 px et plus) autour des lettres retirées ; « SONORE », « CASQUE AUDIO » et l'anneau protégés (1 px autour).
        m = dilate(m, 1 + (h >= 48)) & ~dilate(np.pad(na > 0.2, ((y, H - y - h), (x, W - x - w))), 1)
        # Remplissage par diffusion : chaque pixel effacé prend la moyenne de ses voisins, jusqu'à stabilité.
        ys, xs = np.where(m)
        y0, y1, x0, x1 = ys.min() - 3, ys.max() + 4, xs.min() - 3, xs.max() + 4
        sub = im[y0:y1, x0:x1].copy()
        sm = m[y0:y1, x0:x1]
        known = ~sm
        sub[sm] = sub[known].mean(axis=0)
        for _ in range(400):
            avg = (np.roll(sub, 1, 0) + np.roll(sub, -1, 0) + np.roll(sub, 1, 1) + np.roll(sub, -1, 1)) / 4
            sub[sm] = avg[sm]
        im[y0:y1, x0:x1] = sub
        res = Image.fromarray(im.clip(0, 255).astype(np.uint8))
        res.save(f"{out}/{name}.{ext}", **({"quality": 84} if ext == "jpg" else {"quality": 80}))
    print(name, "pixels effacés :", int(m.sum()))
