#!/usr/bin/env python3
"""
Assemble les captures des sections à tenue en planches à relire (thème sur mesure).

Les captures viennent de : TENUE_OUT=<dossier> npx vitest run tests/tenue-planches.test.ts
(fichiers « <section>[--<construction>]__<tenue>__<tel|ordi>.jpg »).

Usage : python3 scripts/tenue-planche.py <dossier> [prefixe-de-section ...]
Écrit dans <dossier>/planches/ une image par section : une ligne par construction, les trois tenues côte à côte sur
téléphone, puis (si elles existent) les vues ordinateur. Gratuit, sans IA.
"""
import os, sys, collections
from PIL import Image, ImageDraw

def main():
    src = sys.argv[1]
    wanted = sys.argv[2:]
    out = os.path.join(src, "planches")
    os.makedirs(out, exist_ok=True)
    groups = collections.defaultdict(dict)
    for f in sorted(os.listdir(src)):
        if not f.endswith(".jpg") or "__" not in f: continue
        key, tenue, view = f[:-4].split("__")
        section, _, construction = key.partition("--")
        groups[section][(construction, tenue, view)] = os.path.join(src, f)
    tenues = ["calme", "brute", "vive"]
    for section, shots in groups.items():
        if wanted and not any(section.startswith(w.replace("tn-", "")) for w in wanted): continue
        constructions = sorted({c for c, _, _ in shots}, key=lambda c: min(p for (cc, _, _), p in shots.items() if cc == c))
        rows = []
        for c in constructions:
            tel = [Image.open(shots[(c, t, "tel")]).convert("RGB") for t in tenues if (c, t, "tel") in shots]
            if tel:
                h = min(1500, max(i.height for i in tel))
                row = Image.new("RGB", (len(tel) * 400 + 10, h + 24), "#555")
                ImageDraw.Draw(row).text((6, 5), f"{section}  ·  {c or 'construction unique'}  ·  téléphone : " + " | ".join(tenues), fill="#fff")
                for i, im in enumerate(tel): row.paste(im.crop((0, 0, 390, min(h, im.height))), (10 + i * 400, 24))
                rows.append(row)
            ordi = [Image.open(shots[(c, t, "ordi")]).convert("RGB") for t in tenues if (c, t, "ordi") in shots]
            for im in ordi:
                k = 1210 / im.width
                im2 = im.resize((1210, max(1, int(min(im.height, 1700) * k))))
                row = Image.new("RGB", (1210, im2.height + 24), "#555")
                ImageDraw.Draw(row).text((6, 5), f"{section}  ·  {c or 'construction unique'}  ·  ordinateur", fill="#fff")
                row.paste(im2, (0, 24)); rows.append(row)
        if not rows: continue
        w = max(r.width for r in rows)
        sheet = Image.new("RGB", (w, sum(r.height for r in rows) + 6 * len(rows)), "#222")
        y = 0
        for r in rows: sheet.paste(r, (0, y)); y += r.height + 6
        sheet.save(os.path.join(out, f"{section}.jpg"), quality=82)
        print(section, sheet.size)

if __name__ == "__main__":
    main()
