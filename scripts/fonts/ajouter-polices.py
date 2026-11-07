"""
Ajoute au Studio les polices des « 50 typographies pour tes thèmes » (document du propriétaire, 7 novembre 2026).

Source : dépôt officiel Google Fonts (github.com/google/fonts), licences libres (OFL ou Apache), copiées à côté des
fichiers dans assets/fonts/licenses. Chaque police variable est figée en fichiers statiques par graisse (fontTools),
au format attendu par le thème : assets/fonts/<Famille>-<graisse>.ttf.

Usage (depuis la racine du dépôt, réseau requis, fontTools installé : pip install fonttools) :
    python3 scripts/fonts/ajouter-polices.py
Le script est rejouable : un fichier déjà présent n'est pas retéléchargé.
"""
import io
import os
import re
import sys
import urllib.request

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

RAW = "https://raw.githubusercontent.com/google/fonts/main"
OUT = os.path.join("assets", "fonts")
LIC = os.path.join(OUT, "licenses")

# (Nom affiché, fichier de base, graisses voulues). Les polices déjà présentes dans le Studio ne sont pas listées.
FAMILIES = [
    ("Manrope", "Manrope", [400, 600, 800]),
    ("Plus Jakarta Sans", "PlusJakartaSans", [400, 600, 800]),
    ("Outfit", "Outfit", [400, 600, 800]),
    ("Sora", "Sora", [400, 600, 800]),
    ("Urbanist", "Urbanist", [400, 600, 800]),
    ("Figtree", "Figtree", [400, 600, 800]),
    ("Geist", "Geist", [400, 600, 800]),
    ("Raleway", "Raleway", [400, 600, 800]),
    ("Nunito Sans", "NunitoSans", [400, 600, 800]),
    ("Open Sans", "OpenSans", [400, 600, 700]),
    ("Source Sans 3", "SourceSans3", [400, 600, 700]),
    ("Rubik", "Rubik", [400, 500, 700]),
    ("Barlow", "Barlow", [400, 600, 800]),
    ("Cormorant Garamond", "CormorantGaramond", [400, 500, 600]),
    ("Bodoni Moda", "BodoniModa", [400, 600, 800]),
    ("DM Serif Display", "DMSerifDisplay", [400]),
    ("Prata", "Prata", [400]),
    ("Merriweather", "Merriweather", [400, 700]),
    ("Fraunces", "Fraunces", [400, 600, 800]),
    ("Bebas Neue", "BebasNeue", [400]),
    ("Archivo Black", "ArchivoBlack", [400]),
    ("Unbounded", "Unbounded", [400, 600, 800]),
    ("Syne", "Syne", [400, 600, 800]),
    ("Righteous", "Righteous", [400]),
    ("Abril Fatface", "AbrilFatface", [400]),
    ("Alfa Slab One", "AlfaSlabOne", [400]),
    ("Yeseva One", "YesevaOne", [400]),
    ("Caveat", "Caveat", [400, 700]),
    ("Dancing Script", "DancingScript", [400, 700]),
    ("Pacifico", "Pacifico", [400]),
    ("Sacramento", "Sacramento", [400]),
    ("Satisfy", "Satisfy", [400]),
    ("Allura", "Allura", [400]),
    ("IBM Plex Mono", "IBMPlexMono", [400, 700]),
    ("JetBrains Mono", "JetBrainsMono", [400, 700]),
    ("Roboto Mono", "RobotoMono", [400, 700]),
]


def get(url: str) -> bytes | None:
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            return r.read()
    except Exception:
        return None


def family_dir(name: str) -> tuple[str, bytes] | None:
    slug = re.sub(r"[^a-z0-9]", "", name.lower())
    for lic in ("ofl", "apache", "ufl"):
        meta = get(f"{RAW}/{lic}/{slug}/METADATA.pb")
        if meta:
            return f"{RAW}/{lic}/{slug}", meta
    return None


def fonts_of(meta: str) -> list[dict]:
    out = []
    for block in re.findall(r"fonts \{(.*?)\n\}", meta, re.S):
        f = dict(re.findall(r'(\w+): "?([^"\n]+)"?', block))
        out.append(f)
    return out


def license_of(base: str) -> bytes | None:
    for name in ("OFL.txt", "LICENSE.txt", "UFL.txt"):
        data = get(f"{base}/{name}")
        if data:
            return data
    return None


def main() -> int:
    os.makedirs(LIC, exist_ok=True)
    missing = []
    for name, stem, weights in FAMILIES:
        todo = [w for w in weights if not os.path.exists(os.path.join(OUT, f"{stem}-{w}.ttf"))]
        if not todo:
            print(f"= {name} : déjà présente")
            continue
        found = family_dir(name)
        if not found:
            missing.append(name)
            print(f"! {name} : introuvable dans google/fonts")
            continue
        base, meta = found
        files = [f for f in fonts_of(meta.decode()) if f.get("style") == "normal"]
        variable = [f for f in files if "[" in f["filename"]]
        for w in todo:
            if variable:
                raw = get(f"{base}/{variable[0]['filename']}")
                font = TTFont(io.BytesIO(raw))
                # Toutes les autres dimensions (taille optique, largeur…) à leur valeur par défaut : fichier statique.
                target = {a.axisTag: a.defaultValue for a in font["fvar"].axes}
                ax = {a.axisTag: a for a in font["fvar"].axes}
                if "wght" in ax:
                    target["wght"] = max(ax["wght"].minValue, min(ax["wght"].maxValue, w))
                static = instancer.instantiateVariableFont(font, target)
                static.save(os.path.join(OUT, f"{stem}-{w}.ttf"))
            else:
                exact = [f for f in files if int(f.get("weight", 400)) == w]
                pick = exact[0] if exact else min(files, key=lambda f: abs(int(f.get("weight", 400)) - w))
                data = get(f"{base}/{pick['filename']}")
                if not data:
                    missing.append(f"{name} {w}")
                    continue
                with open(os.path.join(OUT, f"{stem}-{w}.ttf"), "wb") as fh:
                    fh.write(data)
            print(f"+ {name} {w}")
        lic = license_of(base)
        if lic:
            with open(os.path.join(LIC, f"{stem}-{'OFL' if b'Open Font License' in lic else 'LICENSE'}.txt"), "wb") as fh:
                fh.write(lic)
    if missing:
        print("Manquantes :", ", ".join(missing))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
