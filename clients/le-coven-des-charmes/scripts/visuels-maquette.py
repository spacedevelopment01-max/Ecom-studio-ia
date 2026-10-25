"""Le Coven des Charmes — visuels de CONTRÔLE découpés dans les planches finales (outil de développement).

    python3 -I clients/le-coven-des-charmes/scripts/visuels-maquette.py <dossier de sortie>

Chaque visuel listé dans `planches.json` (rubrique « crops ») est découpé aux pixels natifs de la planche (aucun
agrandissement) ; les textes des maquettes compris dans les zones « erase » sont effacés par retouche (inpainting)
pour qu'aucun texte ni bouton ne soit figé dans une image. Ces visuels servent à mesurer la composition au pixel près
(superpositions à 50 %) et de visuels PROVISOIRES pour les scènes absentes des photos du client : ils ne sont pas des
photographies sources et restent hors du dépôt (dossier de sortie privé). Nécessite numpy, Pillow et OpenCV.
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CLIENT = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(CLIENT))
MAQUETTES = os.path.join(REPO, "docs", "client-briefs", "le-coven-des-charmes", "maquettes")


def retouche(img: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Efface les zones du masque. Avec OpenCV « contrib » (module xphoto), la retouche FSR reconstitue la texture du
    décor ; sinon, retouche par diffusion (plus floue)."""
    if hasattr(cv2, "xphoto") and hasattr(cv2.xphoto, "inpaint"):
        bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        dst = np.zeros_like(bgr)
        cv2.xphoto.inpaint(bgr, 255 - mask, dst, cv2.xphoto.INPAINT_FSR_FAST)
        return cv2.cvtColor(dst, cv2.COLOR_BGR2RGB)
    return cv2.inpaint(img, mask, 6, cv2.INPAINT_TELEA)


def main(out_dir: str) -> None:
    spec = json.load(open(os.path.join(CLIENT, "planches.json"), encoding="utf-8"))
    os.makedirs(out_dir, exist_ok=True)
    sheets: dict = {}
    for name, c in spec["crops"].items():
        panel = spec["panels"][c["panel"]]
        if panel["sheet"] not in sheets:
            sheets[panel["sheet"]] = np.asarray(Image.open(os.path.join(MAQUETTES, panel["sheet"])).convert("RGB"))
        sheet = sheets[panel["sheet"]]
        px0, py0, px1, _ = panel["box"]
        k = (px1 - px0) / panel["width"]  # pixels natifs par pixel du panneau mis à l'échelle
        to = lambda b: [int(round(px0 + b[0] * k)), int(round(py0 + b[1] * k)), int(round(px0 + b[2] * k)), int(round(py0 + b[3] * k))]
        x0, y0, x1, y1 = to(c["box"])
        img = sheet[y0:y1, x0:x1].copy()
        if c.get("erase"):
            mask = np.zeros(img.shape[:2], np.uint8)
            gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
            bg = cv2.medianBlur(gray, 21)
            for e in c["erase"]:
                ex0, ey0, ex1, ey1 = to(e[:4])
                ex0, ey0, ex1, ey1 = max(ex0 - x0, 0), max(ey0 - y0, 0), min(ex1 - x0, img.shape[1]), min(ey1 - y0, img.shape[0])
                if ex1 <= ex0 or ey1 <= ey0:
                    continue
                if len(e) > 4 and e[4] == 2:
                    continue
                if c.get("erase_full") or (len(e) > 4 and e[4]):
                    mask[ey0:ey1, ex0:ex1] = 255
                    continue
                diff = np.abs(gray[ey0:ey1, ex0:ex1].astype(int) - bg[ey0:ey1, ex0:ex1].astype(int))
                mask[ey0:ey1, ex0:ex1] = np.where(diff > c.get("threshold", 28), 255, 0).astype(np.uint8)
            mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=2)
            img = retouche(img, mask)
            # Zones « 2 » : cartes et formulaires dessinés, remplacés par un flou sombre du décor (le site pose
            # ses propres cartes par-dessus ; aucun texte ni champ de la maquette ne reste visible).
            for e in c["erase"]:
                if len(e) > 4 and e[4] == 2:
                    bx0, by0, bx1, by1 = to(e[:4])
                    bx0, by0, bx1, by1 = max(bx0 - x0, 0), max(by0 - y0, 0), min(bx1 - x0, img.shape[1]), min(by1 - y0, img.shape[0])
                    f = 10
                    small = cv2.resize(img, (max(8, img.shape[1] // f), max(8, img.shape[0] // f)), interpolation=cv2.INTER_AREA)
                    m = np.zeros(small.shape[:2], np.uint8)
                    m[by0 // f:by1 // f + 1, bx0 // f:bx1 // f + 1] = 255
                    small = cv2.inpaint(small, m, 12, cv2.INPAINT_TELEA)
                    fill = cv2.GaussianBlur(cv2.resize(small, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC), (0, 0), 14)
                    img[by0:by1, bx0:bx1] = (fill[by0:by1, bx0:bx1] * 0.85).astype(np.uint8)
        Image.fromarray(img).save(os.path.join(out_dir, f"coven-mq-{name}.jpg"), quality=92)
        print(name, x1 - x0, "x", y1 - y0)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("Indiquez le dossier de sortie (privé).")
    main(sys.argv[1])
