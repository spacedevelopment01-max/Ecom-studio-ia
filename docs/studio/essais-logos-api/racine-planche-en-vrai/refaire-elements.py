"""Racine : refaire en vrai, à l'identique, les images de la planche choisie (25 novembre 2026), hors de SINA.
Même méthode que lancer.py (aperçu découpé + logo fini, GPT Image 2.5 Sunburst, retouche, high). Arrêt avant 0,60 € au total
de l'essai complet (les 0,196 € des quatre premiers éléments compris). Aucune reprise."""
import base64, io, json, os, sys, time, uuid, urllib.request, urllib.error
from PIL import Image
D = sys.argv[1]; EUR = 0.86
P1 = json.load(open(os.path.join(D, "elements", "bilan-partie-1.json")))
DEJA = P1["total_eur"]; PLAFOND = P1["deja_eur"] + 0.60  # 0,60 € accordés pour cette planche, hors des 4 premiers éléments
REGLE = ("La première image est un aperçu en petit, découpé sur la planche d'identité que le client a choisie. "
         "Refais-la à l'identique, en haute définition : même composition, mêmes couleurs, même photographie, mêmes textes au mot près, "
         "même typographie, mêmes placements. Améliore seulement la netteté et les détails. "
         "La deuxième image est le logo officiel de Racine : là où il apparaît, reproduis-le exactement, sans le redessiner.")
E = [  # (nom, taille demandée, précision)
 ("ouverture-planche", "2304x768", "C'est le bandeau d'ouverture de la planche ; garde des marges généreuses en haut et en bas, rien ne touche les bords."),
 ("produit-1", "912x1088", "C'est la photo produit d'une plante d'intérieur en pot."), ("produit-2", "912x1088", "C'est la photo produit d'un arbuste en pot."),
 ("produit-3", "912x1088", "C'est la photo produit d'un jeune arbre en pot."),
 ("emballage", "1344x1024", "C'est la photo des supports de marque (carton, sac, ruban adhésif, carte de remerciement)."),
 ("site-ordinateur", "1520x1024", "C'est la maquette de la page d'accueil du site sur un ordinateur portable ; tous les textes de l'écran restent nets et lisibles."),
 ("site-telephone", "768x1712", "C'est la maquette de la page d'accueil du site sur un téléphone ; tous les textes de l'écran restent nets et lisibles."),
]
E = [(f"reference-{i}", "1024x912", "C'est une photo d'ambiance de la marque.") for i in range(2, 7)]
total, bilans = DEJA, []
for nom, size, quoi in E:
    if total + (0.02 if nom == "reference-6" else 0.053) > PLAFOND: print("ARRÊT plafond avant", nom); break
    champs = {"model": "gpt-image-2.5-sunburst", "prompt": f"{REGLE} {quoi}", "quality": "medium" if nom == "reference-6" else "high", "size": size, "background": "opaque", "output_format": "png", "n": "1"}
    images = [os.path.join(D, "apercus", nom + ".png"), os.path.join(D, "logo-fini.png")]
    json.dump({"endpoint": "POST https://api.openai.com/v1/images/edits (multipart)", "champs": champs, "image[]": [f"apercus/{nom}.png", "logo-fini.png"]}, open(os.path.join(D, "elements", nom + "-requete.json"), "w"), ensure_ascii=False, indent=1)
    b = uuid.uuid4().hex; m = [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in champs.items()]
    for f in images: m.append(f'--{b}\r\nContent-Disposition: form-data; name="image[]"; filename="{os.path.basename(f)}"\r\nContent-Type: image/png\r\n\r\n'.encode() + open(f, "rb").read() + b"\r\n")
    m.append(f"--{b}--\r\n".encode())
    req = urllib.request.Request("https://api.openai.com/v1/images/edits", data=b"".join(m), headers={"Content-Type": f"multipart/form-data; boundary={b}", "Authorization": "Bearer x"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=900) as r: tx, st, ent = r.read().decode(), r.status, dict(r.headers)
    except urllib.error.HTTPError as e: tx, st, ent = e.read().decode(), e.code, dict(e.headers)
    du = round(time.time() - t0, 1)
    try: rep = json.loads(tx)
    except Exception: rep = {}
    bl = {"element": nom, "statut_http": st, "duree_s": du, "x-request-id": ent.get("X-Request-Id") or ent.get("x-request-id")}
    if st == 200 and rep.get("data"):
        brut = base64.b64decode(rep["data"][0]["b64_json"]); open(os.path.join(D, "elements", nom + ".png"), "wb").write(brut)
        u = rep.get("usage") or {}; det = u.get("input_tokens_details") or {}
        c = (det.get("text_tokens", 0) * 5e-6 + det.get("image_tokens", 0) * 8e-6 + u.get("output_tokens", 0) * 30e-6) * EUR; total += c
        bl.update({"usage": u, "cout_eur": round(c, 4), "taille": Image.open(io.BytesIO(brut)).size})
    else:
        bl["erreur"] = tx[:800]
    bilans.append(bl); json.dump({"deja_eur": DEJA, "total_eur": round(total, 4), "elements": bilans}, open(os.path.join(D, "elements", "bilan-partie-2.json"), "w"), ensure_ascii=False, indent=1)
    print(nom, st, du, "s", bl.get("cout_eur"), "€ total", round(total, 3))
    if st != 200: print("arrêt après erreur"); break
