"""Racine : la planche complète « en vrai » (25 novembre 2026), assemblée par le code à partir des vrais éléments.
Aucun appel à OpenAI. Échelle 2 (3072 x 4608). Logos tirés du logo fini, palette mesurée sur la planche, polices réelles,
images refaites en haute définition posées à leur place (proportions gardées)."""
import json, os
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageOps
S = 2
POL = "/tmp/claude-0/-home-user-Ecom-studio-ia/2515f498-8713-5c87-b34e-cf2f2e11cea6/scratchpad/polices/"
def police(nom, taille, graisse):
    f = ImageFont.truetype(POL + nom, taille); f.set_variation_by_name(graisse); return f
FOND, PANNEAU, ENCRE = (250, 249, 245), (249, 248, 244), (28, 42, 36)  # mesurés sur la planche
COUL = [("Bordeaux", "#630A29", "Élégance", "Nature"), ("Vert forêt", "#25583B", "Végétal", "Croissance"), ("Sauge", "#A0B79B", "Sérénité", "Équilibre"),
        ("Beige naturel", "#EDDECB", "Douceur", "Authenticité"), ("Lin", "#F7F3EC", "Pureté", "Lumière")]
BORDEAUX = (0x63, 0x0A, 0x29)
plan = Image.open("planche-choisie.png").convert("RGB")
P = plan.resize((plan.width * S, plan.height * S), Image.LANCZOS)
d = ImageDraw.Draw(P)
X = lambda b: tuple(v * S for v in b)

# --- le logo fini : masque d'encre, symbole et nom séparés
L = Image.open("logo-fini.png").convert("L")
encre = L.point(lambda v: 0 if v > 235 else (255 if v < 120 else int((235 - v) * 255 / 115)))
encre = encre.crop(encre.getbbox())
lignes = [max(encre.crop((0, y, encre.width, y + 1)).getdata()) for y in range(encre.height)]
vides = [y for y in range(encre.height) if lignes[y] < 20]
# la plus grande bande vide entre le symbole et le nom
bandes, deb = [], None
for y in range(encre.height + 1):
    v = y < encre.height and lignes[y] < 20
    if v and deb is None: deb = y
    if not v and deb is not None: bandes.append((deb, y)); deb = None
cou = max(bandes, key=lambda b: b[1] - b[0])
symbole = encre.crop((0, 0, encre.width, cou[0])); symbole = symbole.crop(symbole.getbbox())
nom = encre.crop((0, cou[1], encre.width, encre.height)); nom = nom.crop(nom.getbbox())
def teinte(masque, couleur):
    im = Image.new("RGBA", masque.size, couleur + (0,)); im.putalpha(masque); return im
def empile(c, ecart=0.10):
    s, n = teinte(symbole, c), teinte(nom, c); w = max(s.width, n.width); g = int(s.height * ecart)
    im = Image.new("RGBA", (w, s.height + g + n.height), (0, 0, 0, 0)); im.alpha_composite(s, ((w - s.width) // 2, 0)); im.alpha_composite(n, ((w - n.width) // 2, s.height + g)); return im
def horizontal(c):
    n = teinte(nom, c); h = int(n.height * 1.35); s = teinte(symbole, c).resize((round(symbole.width * h / symbole.height), h), Image.LANCZOS)
    g = int(n.height * 0.35); im = Image.new("RGBA", (s.width + g + n.width, h), (0, 0, 0, 0)); im.alpha_composite(s, (0, 0)); im.alpha_composite(n, (s.width + g, (h - n.height) // 2)); return im
def carre(c_fond, c_signe, rayon=0.18, marge=0.2):
    t = 600; im = Image.new("RGBA", (t, t), (0, 0, 0, 0)); ImageDraw.Draw(im).rounded_rectangle((0, 0, t - 1, t - 1), radius=int(t * rayon), fill=c_fond + (255,))
    s = teinte(symbole, c_signe); k = t * (1 - 2 * marge) / max(s.size); s = s.resize((round(s.width * k), round(s.height * k)), Image.LANCZOS)
    im.alpha_composite(s, ((t - s.width) // 2, (t - s.height) // 2)); return im
def inverse():
    l = empile((255, 255, 255)); w, h = int(l.width * 1.35), int(l.height * 1.45)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); ImageDraw.Draw(im).rounded_rectangle((0, 0, w - 1, h - 1), radius=int(w * 0.06), fill=BORDEAUX + (255,))
    im.alpha_composite(l, ((w - l.width) // 2, (h - l.height) // 2)); return im
def badge():
    t = 900; im = Image.new("RGBA", (t, t), (0, 0, 0, 0)); dd = ImageDraw.Draw(im)
    dd.ellipse((8, 8, t - 8, t - 8), outline=BORDEAUX + (255,), width=10)
    s = teinte(symbole, BORDEAUX); k = t * 0.36 / max(s.size); s = s.resize((round(s.width * k), round(s.height * k)), Image.LANCZOS)
    im.alpha_composite(s, ((t - s.width) // 2, (t - s.height) // 2))
    import math
    def arc(texte, rayon, centre_deg, police_, haut=True):
        largeurs = [police_.getlength(ch) for ch in texte]; total = sum(largeurs) + 6 * (len(texte) - 1)
        ang = math.degrees(total / rayon); a = centre_deg - ang / 2 if haut else centre_deg + ang / 2
        for ch, lw in zip(texte, largeurs):
            pas = math.degrees((lw + 6) / rayon); milieu = a + (pas / 2 if haut else -pas / 2)
            r = math.radians(milieu); cx, cy = t / 2 + rayon * math.cos(r), t / 2 + rayon * math.sin(r)
            g = Image.new("RGBA", (120, 120), (0, 0, 0, 0)); ImageDraw.Draw(g).text((60, 60), ch, font=police_, fill=BORDEAUX + (255,), anchor="mm")
            g = g.rotate(-(milieu + 90) if haut else -(milieu - 90), resample=Image.BICUBIC)
            im.alpha_composite(g, (int(cx - 60), int(cy - 60))); a += pas if haut else -pas
    arc("RACINE", t * 0.39, -90, police("Montserrat.ttf", 64, "Bold"))
    arc("PLANTES POUR AUJOURD'HUI ET DEMAIN", t * 0.40, 90, police("Montserrat.ttf", 42, "SemiBold"), haut=False)
    return im
VARIANTES = {"logo-principal": empile(BORDEAUX), "logo-horizontal": horizontal(BORDEAUX), "logo-empile": empile(BORDEAUX, 0.14),
             "logo-compact": teinte(symbole, BORDEAUX), "icone": carre(BORDEAUX, (255, 255, 255)), "favicon": carre(BORDEAUX, (255, 255, 255), 0.22, 0.16),
             "monochrome-fonce": empile((34, 34, 34)), "monochrome-clair": empile((0xA0, 0xB7, 0x9B)), "inverse": inverse(), "badge": badge()}
os.makedirs("logos", exist_ok=True)
for n, im in VARIANTES.items(): im.save(f"logos/{n}.png")
VARIANTES["favicon"].resize((64, 64), Image.LANCZOS).save("logos/favicon-64.png")

def poser(img, boite, marge=0.0, fond=None):
    x0, y0, x1, y1 = boite; W, H = x1 - x0, y1 - y0
    if fond: d.rounded_rectangle(boite, radius=18, fill=fond)
    k = min(W * (1 - 2 * marge) / img.width, H * (1 - 2 * marge) / img.height); r = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    pos = (x0 + (W - r.width) // 2, y0 + (H - r.height) // 2)
    if r.mode == "RGBA": P.paste(r, pos, r)
    else: P.paste(r, pos)
def couvrir(img, boite, rayon=14):
    x0, y0, x1, y1 = boite; W, H = x1 - x0, y1 - y0
    r = ImageOps.fit(img.convert("RGB"), (W, H), Image.LANCZOS)
    m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, W - 1, H - 1), radius=rayon, fill=255); P.paste(r, (x0, y0), m)

# --- haut : logo et signature, puis l'ouverture
d.rectangle(X((0, 0, 478, 282)), fill=FOND)
poser(VARIANTES["logo-principal"], X((70, 22, 410, 205)))
f_sig = police("Montserrat.ttf", 25, "SemiBold")
for i, ligne in enumerate(["PLANTES POUR AUJOURD'HUI", "ET DEMAIN"]):
    d.text((240 * S, (224 + i * 19) * S), ligne, font=f_sig, fill=ENCRE, anchor="mm")
d.line(X((222, 266, 258, 266)), fill=BORDEAUX, width=4)
ouv = Image.open("elements/ouverture-planche.png").convert("RGB")
gris = ouv.convert("L"); lignes = [sum(gris.getpixel((x, y)) for x in range(ouv.width // 2, ouv.width, 8)) / (ouv.width // 16) for y in range(ouv.height)]
utiles = [y for y, v in enumerate(lignes) if v < 245]
ouv = ouv.crop((0, utiles[0], ouv.width, utiles[-1] + 1))  # retire les marges blanches demandées
couvrir(ouv, X((500, 0, 1536, 282)), rayon=0)
# --- 01 : les dix versions du logo
TUILES = [(22, 332, 210, 492), (215, 332, 388, 492), (393, 332, 535, 492), (540, 332, 655, 492), (659, 332, 773, 492), (779, 332, 893, 492),
          (908, 332, 1053, 492), (1059, 332, 1196, 492), (1201, 332, 1362, 492), (1368, 332, 1514, 492)]
d.rectangle(X((1364, 326, 1536, 500)), fill=FOND)
for (n, im), t in zip(VARIANTES.items(), TUILES):
    d.rounded_rectangle(X(t), radius=20, fill=PANNEAU)
    marge = {"favicon": 0.30, "icone": 0.20, "badge": 0.03, "inverse": 0.05}.get(n, 0.14)
    poser(im, X(t), marge)
# --- 02 : la palette, couleurs mesurées sur la planche
d.rectangle(X((22, 605, 568, 800)), fill=PANNEAU)
fn, fc, fd = police("Montserrat.ttf", 26, "Bold"), police("Montserrat.ttf", 24, "Medium"), police("Montserrat.ttf", 23, "Regular")
for (nom_c, hexa, m1, m2), cx in zip(COUL, (81, 188, 294, 402, 510)):
    rgb = tuple(int(hexa[i:i + 2], 16) for i in (1, 3, 5)); r = 44
    d.ellipse(X((cx - r, 657 - r, cx + r, 657 + r)), fill=rgb, outline=(228, 224, 216) if sum(rgb) > 700 else None, width=2)
    d.text((cx * S, 725 * S), nom_c, font=fn, fill=ENCRE, anchor="mm"); d.text((cx * S, 746 * S), hexa, font=fc, fill=(90, 96, 92), anchor="mm")
    d.text((cx * S, 769 * S), m1, font=fd, fill=(90, 96, 92), anchor="mm"); d.text((cx * S, 787 * S), m2, font=fd, fill=(90, 96, 92), anchor="mm")
# --- 03 : les typographies, avec les vraies polices
d.rectangle(X((590, 598, 1110, 820)), fill=PANNEAU)
for x, fichier, titre, desc in ((612, "PlayfairDisplay.ttf", "Playfair Display", "Élégante, naturelle, intemporelle."), (885, "Montserrat.ttf", "Montserrat", "Moderne, lisible, polyvalente.")):
    d.text((x * S, 628 * S), titre, font=police(fichier, 64, "Medium" if "Montserrat" in fichier else "Regular"), fill=ENCRE)
    d.text((x * S, 670 * S), desc, font=police("Montserrat.ttf", 23, "Regular"), fill=(90, 96, 92))
    for i, l in enumerate(["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz", "0123456789"]):
        d.text((x * S, (720 + i * 22) * S), l, font=police(fichier, 25, "Regular"), fill=ENCRE)
d.line(X((860, 620, 860, 805)), fill=(215, 211, 203), width=2)
# --- 05, 06, 07, 08, 09 : les images refaites
B = json.load(open("boites.json"))
for n in ["produit-1", "produit-2", "produit-3", "emballage"] + [f"reference-{i}" for i in range(1, 6)]:
    couvrir(Image.open(f"elements/{n}.png"), X(B[n]))
for n in ("site-ordinateur", "site-telephone"):
    poser(Image.open(f"elements/{n}.png"), X(B[n]), fond=PANNEAU)
POSTS = {"publication-1x1": (777, 1243, 1033, 1510), "publication-4x5": (1048, 1209, 1296, 1535), "publication-9x16": (1317, 1177, 1512, 1535)}
for n, b in POSTS.items():
    poser(Image.open(f"{n}.png"), X(b), fond=PANNEAU)
P.save("planche-complete-en-vrai.png"); print(P.size)
