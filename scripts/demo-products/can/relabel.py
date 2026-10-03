"""
Nouvelle étiquette pour une canette photographiée (produit réel du fournisseur) :
- le métal (haut, bas) vient de la photo d'origine ;
- le corps est redessiné à partir de l'ombrage réel du cylindre, mesuré colonne par colonne
  sur les zones sans impression, puis recoloré pour chaque goût ;
- l'étiquette (marque, goût, illustration) est dessinée à plat puis enroulée sur le cylindre.
Aucun élément graphique de la marque d'origine n'est conservé.

Usage : python relabel.py <canette-detouree.png> <dossier-de-sortie> <dossier-polices>
"""
import math, sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC, OUT, FONTS = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
S = 3  # facteur de rendu (le corps et l'étiquette sont dessinés nativement à cette résolution)

im = Image.open(SRC).convert("RGBA")
a = np.asarray(im).astype(np.float32)
h, w = a.shape[:2]
alpha = a[..., 3]
rgb = a[..., :3]

# Silhouette : bords du cylindre mesurés au milieu de la canette.
rows = range(int(h * 0.3), int(h * 0.7))
lefts, rights = [], []
for y in rows:
    xs = np.where(alpha[y] > 128)[0]
    if len(xs):
        lefts.append(xs.min()); rights.append(xs.max())
xl, xr = int(np.median(lefts)), int(np.median(rights))
cx = (xl + xr) / 2
r = (xr - xl) / 2

# Bas de la photo masqué par un élément d'interface : reconstruit par symétrie du cylindre.
fix_from = int(h * 0.86)
for y in range(fix_from, h):
    for x in range(0, int(cx)):
        xm = int(round(2 * cx - x))
        if 0 <= xm < w:
            alpha[y, x] = alpha[y, xm]
            rgb[y, x] = rgb[y, xm]
alpha[:, : max(0, xl - 3)] = 0
alpha[:, xr + 4 :] = 0
# Contour resserré d'un pixel : supprime le liseré du décor d'origine.
alpha = np.asarray(Image.fromarray(alpha.astype(np.uint8)).filter(ImageFilter.MinFilter(3))).astype(np.float32)
# Métal neutre : le rebord ne garde que sa luminosité (il reflétait la couleur de la canette d'origine).
gray = rgb @ np.array([0.299, 0.587, 0.114])
metal = np.repeat(gray[..., None], 3, axis=2) * np.array([0.98, 0.99, 1.02])
rgb = metal.astype(np.float32)

RGB0 = a[..., :3].copy()
def is_body(px):
    rr, gg, bb = px
    return rr > 120 and rr - bb > 60

# Limites du corps (sous le rebord du haut, au-dessus du fond) pour chaque colonne.
top = np.zeros(w, int); bot = np.zeros(w, int)
for x in range(w):
    col = RGB0[:, x]
    t = next((y for y in range(int(h * 0.01), int(h * 0.12)) if alpha[y, x] > 200 and is_body(col[y])), int(h * 0.05))
    b = next((y for y in range(h - 1, int(h * 0.85), -1) if alpha[y, x] > 200 and is_body(col[y])), int(h * 0.94))
    top[x], bot[x] = t, b
# Lissage des limites (le rebord est une ellipse régulière).
def smooth(v, k=9):
    pad = np.pad(v.astype(float), k, mode="edge")
    return np.convolve(pad, np.ones(2 * k + 1) / (2 * k + 1), mode="same")[k:-k]
inside = (np.arange(w) >= xl) & (np.arange(w) <= xr)
top = np.where(inside, smooth(np.where(inside, top, np.median(top[inside]))), 0)
bot = np.where(inside, smooth(np.where(inside, bot, np.median(bot[inside]))), 0)

# Ombrage réel : couleur médiane du corps par colonne, sur les bandes sans étiquette (haut et bas).
bands = list(range(int(h * 0.06), int(h * 0.14))) + list(range(int(h * 0.72), int(h * 0.86)))
prof = np.zeros((w, 3))
for x in range(xl, xr + 1):
    px = [RGB0[y, x] for y in bands if alpha[y, x] > 200 and is_body(RGB0[y, x])]
    prof[x] = np.median(px, axis=0) if len(px) > 5 else np.nan
for c in range(3):
    v = prof[:, c]
    ok = ~np.isnan(v)
    v[~ok] = np.interp(np.where(~ok)[0], np.where(ok)[0], v[ok])
    prof[:, c] = smooth(v, 3)
lum = prof @ np.array([0.299, 0.587, 0.114])
ref = np.median(prof[int(cx - r * 0.3) : int(cx + r * 0.3)], axis=0)
ref_l = float(ref @ np.array([0.299, 0.587, 0.114]))

# ---------------------------------------------------------------- étiquettes
def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)

BRAND = "VERGER"
FLAVORS = [
    {"key": "peche", "name": "Pêche", "body": (233, 131, 58), "accent": (196, 88, 34), "fruit": "peach"},
    {"key": "citron", "name": "Citron", "body": (236, 196, 52), "accent": (176, 132, 12), "fruit": "lemon"},
    {"key": "fruits-rouges", "name": "Fruits rouges", "body": (178, 38, 64), "accent": (138, 22, 46), "fruit": "berries"},
]

def label_art(f, W, H):
    """Étiquette à plat : W correspond au demi-tour visible, H à sa hauteur."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cream = (251, 245, 233, 255)
    # Panneau crème aux coins arrondis
    d.rounded_rectangle([int(W * 0.2), 0, int(W * 0.8), H], radius=int(W * 0.05), fill=cream)
    ink = (34, 28, 24, 255)
    def center(text, y, fnt, fill, spacing=0):
        if spacing:
            widths = [d.textlength(ch, font=fnt) for ch in text]
            total = sum(widths) + spacing * (len(text) - 1)
            x = (W - total) / 2
            for ch, cw in zip(text, widths):
                d.text((x, y), ch, font=fnt, fill=fill); x += cw + spacing
        else:
            tw = d.textlength(text, font=fnt)
            d.text(((W - tw) / 2, y), text, font=fnt, fill=fill)
    center(BRAND, int(H * 0.06), font("Cormorant-600.ttf", int(H * 0.1)), ink, spacing=int(H * 0.014))
    d.line([(W * 0.38, H * 0.215), (W * 0.62, H * 0.215)], fill=f["accent"] + (255,), width=max(2, int(H * 0.006)))
    center("thé glacé", int(H * 0.24), font("Cormorant-500italic.ttf", int(H * 0.085)), ink)
    fl = font("Jost-600.ttf", int(H * (0.06 if len(f["name"]) > 8 else 0.085)))
    center(f["name"].upper(), int(H * 0.37), fl, f["accent"] + (255,), spacing=int(H * 0.01))
    # Illustration du fruit (formes simples)
    cxa, cya, R = W / 2, H * 0.68, H * 0.13
    if f["fruit"] == "peach":
        d.ellipse([cxa - R * 1.05, cya - R, cxa + R * 0.95, cya + R], fill=(240, 150, 78, 255))
        d.ellipse([cxa - R * 0.35, cya - R * 0.92, cxa + R * 1.1, cya + R * 0.95], fill=(229, 112, 60, 255))
        d.line([(cxa - R * 0.05, cya - R * 0.95), (cxa + R * 0.05, cya + R * 0.9)], fill=(205, 92, 48, 255), width=max(2, int(R * 0.06)))
        d.ellipse([cxa + R * 0.1, cya - R * 1.45, cxa + R * 1.0, cya - R * 0.95], fill=(92, 140, 70, 255))
    elif f["fruit"] == "lemon":
        d.ellipse([cxa - R, cya - R, cxa + R, cya + R], fill=(236, 196, 52, 255))
        d.ellipse([cxa - R * 0.86, cya - R * 0.86, cxa + R * 0.86, cya + R * 0.86], fill=(250, 232, 150, 255))
        for k in range(8):
            ang = k * math.pi / 4
            d.line([(cxa, cya), (cxa + math.cos(ang) * R * 0.84, cya + math.sin(ang) * R * 0.84)], fill=(236, 196, 52, 255), width=max(2, int(R * 0.07)))
        d.ellipse([cxa - R * 0.12, cya - R * 0.12, cxa + R * 0.12, cya + R * 0.12], fill=(250, 240, 200, 255))
    else:
        for dx, dy, rr in [(-0.55, 0.15, 0.55), (0.45, 0.2, 0.6), (-0.02, -0.4, 0.55)]:
            d.ellipse([cxa + R * (dx - rr), cya + R * (dy - rr), cxa + R * (dx + rr), cya + R * (dy + rr)], fill=(170, 30, 58, 255))
            d.ellipse([cxa + R * (dx - rr * 0.45), cya + R * (dy - rr * 0.55), cxa + R * (dx - rr * 0.1), cya + R * (dy - rr * 0.2)], fill=(222, 120, 140, 255))
        d.ellipse([cxa + R * 0.1, cya - R * 1.25, cxa + R * 0.95, cya - R * 0.8], fill=(92, 140, 70, 255))
    center("33 cl", int(H * 0.9), font("Jost-500.ttf", int(H * 0.045)), (90, 80, 70, 255))
    return img

def render(f):
    W2, H2 = w * S, h * S
    base = Image.fromarray(np.dstack([rgb, alpha]).clip(0, 255).astype(np.uint8), "RGBA")
    big = base.resize((W2, H2), Image.LANCZOS)
    out = np.asarray(big).astype(np.float32)
    body = np.array(f["body"], np.float32)
    # Transfert d'ombrage : couleur de chaque colonne = couleur du goût × (couleur réelle / couleur de référence)
    gain = prof / ref  # par colonne et par canal
    label_top, label_bot = h * 0.16, h * 0.70
    LW, LH = int(math.pi * r * S), int((label_bot - label_top) * S)
    art = np.asarray(label_art(f, LW, LH)).astype(np.float32)
    for X in range(int(xl * S), int((xr + 1) * S)):
        x = X / S
        xi = min(w - 1, int(x))
        # Ombrage mesuré : en dessous de la référence il assombrit, au-dessus c'est un reflet qui tire vers le blanc.
        shade = float(np.clip(lum[xi] / ref_l, 0.15, 2.2))
        dark = min(shade, 1.0)
        spec = max(0.0, shade - 1.0) * 0.55
        col = np.clip(body * dark + (255 - body * dark) * spec, 0, 255)
        y0, y1 = int((top[xi] + 2) * S), int((bot[xi] - 1) * S)
        if y1 <= y0:
            continue
        out[y0:y1, X, :3] = col
        # Étiquette enroulée : angle sur le cylindre → colonne de l'étiquette à plat
        t = (x - cx) / r
        if -0.985 < t < 0.985:
            u = (math.asin(t) / math.pi + 0.5) * (LW - 1)
            ly0 = int(label_top * S)
            seg = art[:, int(u)]
            m = seg[:, 3:4] / 255.0
            lit = np.clip(seg[:, :3] * dark + (255 - seg[:, :3] * dark) * spec * 0.6, 0, 255)
            tgt = out[ly0 : ly0 + LH, X, :3]
            out[ly0 : ly0 + LH, X, :3] = tgt * (1 - m) + lit * m
    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
    return img

for f in FLAVORS:
    img = render(f)
    img.save(os.path.join(OUT, f"canette-{f['key']}.png"))
    print("✓", f["key"], img.size)
