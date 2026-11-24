"""Poppy — planche V3 : assemblage par le code, sans aucun appel à OpenAI (24 novembre 2026).
La planche V2 est gardée telle quelle, sauf la rangée 7/8 : le bloc 7 reçoit les trois publications validées (fichiers
originaux, réduits proportionnellement, même hauteur, ratios exacts, aucun recadrage), en pleine largeur ; le bloc 8
(site) est repris tel quel et agrandi en pleine largeur. Usage : python3 -I assembler.py"""
from PIL import Image, ImageDraw, ImageFont
V2 = Image.open("planches-poppy-v2/planche-v2-brute.png").convert("RGB")
POSTS = [("planches-poppy-v2/../poppy-posts-v2/publication-1-emotion.png", "1:1 · Émotion", (1080, 1080)),
         ("poppy-posts-v2/publication-2-produit.png", "4:5 · Produit", (1080, 1350)),
         ("poppy-posts-v2/publication-3-humour.png", "9:16 · Humour", (1080, 1920))]
W, FOND, PANNEAU, ENCRE, GRIS = 1536, (252, 251, 248), (244, 243, 239), (20, 34, 29), (110, 116, 112)
TITRE = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Bold.otf", 27)
LEGENDE = ImageFont.truetype("/usr/share/fonts/opentype/inter/InterDisplay-Medium.otf", 24)
PETIT = ImageFont.truetype("/usr/share/fonts/opentype/inter/InterDisplay-Medium.otf", 19)
H = 560  # hauteur commune : 560 × 560, 448 × 560 et 315 × 560 sont des ratios exacts (1:1, 4:5, 9:16)
GAP, PAD = 44, 16
haut, bas = V2.crop((0, 0, W, 1284)), V2.crop((0, 1780, W, 2304))
site = V2.crop((832, 1288, 1522, 1778))
site = site.resize((W - 2 * PAD, round(site.height * (W - 2 * PAD) / site.width)), Image.LANCZOS)
bande_h = 24 + 60 + H + 18 + 34 + 30 + 28
img = Image.new("RGB", (W, haut.height + bande_h + site.height + 24 + bas.height), FOND)
img.paste(haut, (0, 0))
y0 = haut.height + 8
d = ImageDraw.Draw(img)
d.rounded_rectangle((PAD, y0, W - PAD, y0 + bande_h - 16), radius=14, fill=PANNEAU)
d.text((PAD + 14, y0 + 18), "7. PUBLICATIONS RÉSEAUX SOCIAUX", font=TITRE, fill=ENCRE)
tailles = []
for f, _, (w, h) in POSTS:
    assert (H * w) % h == 0, "ratio non exact"
    tailles.append((H * w // h, H))
total = sum(t[0] for t in tailles) + GAP * 2
x = (W - total) // 2; yp = y0 + 70
for (f, leg, (w, h)), (tw, th) in zip(POSTS, tailles):
    p = Image.open(f).convert("RGB"); assert p.size == (w, h), (f, p.size)
    img.paste(p.resize((tw, th), Image.LANCZOS), (x, yp))
    lw = d.textlength(leg, font=LEGENDE); d.text((x + (tw - lw) / 2, yp + H + 16), leg, font=LEGENDE, fill=ENCRE)
    x += tw + GAP
cap = "Fichiers originaux · proportions conservées"
d.text(((W - d.textlength(cap, font=PETIT)) / 2, yp + H + 56), cap, font=PETIT, fill=GRIS)
ys = y0 + bande_h + 8
img.paste(site, (PAD, ys))
img.paste(bas, (0, ys + site.height + 16))
img.save("planches-poppy-v3/planche-v3.png")
print(img.size, tailles)
