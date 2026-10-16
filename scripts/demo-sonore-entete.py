"""Captures de la boutique Sonore : l'ancien logo de l'en-tête est remplacé par le nouveau (sans la ligne fautive),
à la même place et à la même taille, sur le même fond. Rien d'autre n'est touché (sans IA, gratuit).
   python3 -I scripts/demo-sonore-entete.py <dossier de sortie> <logo pour fond sombre.png>
Le logo pour fond sombre est celui du studio (onDarkVersion de src/lib/logo-v2/artwork.ts, appliqué au nouveau
public/demo/casque/logo.png), comme dans l'en-tête sombre de la boutique d'origine.
Les zones viennent de la mesure de l'ancien logo dans chaque capture (16/10/2026)."""
import os, sys
import numpy as np
from PIL import Image

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
logo = Image.open(sys.argv[2]).convert("RGBA")
ZONES = {"boutique-bureau": (134, 38, 171, 84), "boutique-mobile": (154, 53, 190, 94)}
for name, (x0, y0, x1, y1) in ZONES.items():
    for ext in ("jpg", "webp"):
        im = Image.open(f"public/demo/casque/{name}.{ext}").convert("RGB")
        a = np.array(im)
        pad = 2
        ring = np.concatenate([a[y0 - pad - 1, x0 - pad:x1 + pad], a[y1 + pad + 1, x0 - pad:x1 + pad], a[y0 - pad:y1 + pad, x0 - pad - 1], a[y0 - pad:y1 + pad, x1 + pad + 1]])
        bg = tuple(int(v) for v in np.median(ring, axis=0))
        a[y0 - pad:y1 + pad + 1, x0 - pad:x1 + pad + 1] = bg
        im = Image.fromarray(a).convert("RGBA")
        w, h = x1 - x0 + 1, y1 - y0 + 1
        s = min(w / logo.width, h / logo.height)
        lw, lh = max(1, round(logo.width * s)), max(1, round(logo.height * s))
        small = logo.resize((lw, lh), Image.LANCZOS)
        im.alpha_composite(small, (x0 + (w - lw) // 2, y0 + (h - lh) // 2))
        im = im.convert("RGB")
        if ext == "jpg":
            im.save(f"{out}/{name}.jpg", quality=84)
        else:
            im.save(f"{out}/{name}.webp", quality=80)
        print(name, ext, "fond", bg)
