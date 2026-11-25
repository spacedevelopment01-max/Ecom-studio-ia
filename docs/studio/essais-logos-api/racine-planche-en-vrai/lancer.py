"""Racine : refaire en vrai, à l'identique, des éléments de la planche choisie (25 novembre 2026), hors de SINA.
Pour chaque élément : l'aperçu découpé sur la planche + le logo fini, GPT Image 2.5 Sunburst, retouche, high, au vrai format.
Aucune reprise. Arrêt à 0,40 €."""
import base64, io, json, os, sys, time, uuid, urllib.request, urllib.error
from PIL import Image
D = sys.argv[1]; EUR, PLAFOND = 0.86, 0.40
REGLE = ("La première image est un aperçu en petit, découpé sur la planche d'identité que le client a choisie. "
         "Refais-la à l'identique, en haute définition et à son vrai format : même composition, mêmes couleurs, même photographie, "
         "mêmes textes au mot près, même typographie, mêmes placements. Améliore seulement la netteté et les détails. "
         "La deuxième image est le logo officiel de Racine : là où il apparaît, reproduis-le exactement, sans le redessiner.")
ELEMENTS = {
 "publication-1x1": ("apercus/post-1x1.png", "1088x1088", (1080, 1080), "C'est une publication carrée pour les réseaux sociaux, 1080 × 1080."),
 "publication-4x5": ("apercus/post-4x5.png", "1088x1360", (1080, 1350), "C'est une publication portrait pour les réseaux sociaux, 1080 × 1350."),
 "publication-9x16": ("apercus/post-9x16.png", "1088x1936", (1080, 1920), "C'est une story pour les réseaux sociaux, 1080 × 1920."),
 "ouverture-site": ("apercus/ouverture.png", "2048x768", (1920, 720), "C'est la grande image d'ouverture du site, au format bandeau 1920 × 720 ; garde le texte à gauche et le pot à droite."),
}
total, bilans = 0.0, []
for nom, (apercu, size, (W, H), quoi) in ELEMENTS.items():
    if total + 0.08 > PLAFOND: print("ARRÊT plafond"); break
    champs = {"model": "gpt-image-2.5-sunburst", "prompt": f"{REGLE} {quoi}", "quality": "high", "size": size, "background": "opaque", "output_format": "png", "n": "1"}
    images = [os.path.join(D, apercu), os.path.join(D, "logo-fini.png")]
    json.dump({"endpoint": "POST https://api.openai.com/v1/images/edits (multipart)", "champs": champs, "image[]": [apercu, "logo-fini.png"], "format_final": f"{W}x{H}"}, open(os.path.join(D, nom + "-requete.json"), "w"), ensure_ascii=False, indent=1)
    if "--verifier" in sys.argv: print(nom, "construit"); continue
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
        brut = base64.b64decode(rep["data"][0]["b64_json"]); open(os.path.join(D, nom + "-brut.png"), "wb").write(brut)
        im = Image.open(io.BytesIO(brut)); w, h = im.size
        if w >= W and h >= H:
            l, t = (w - W) // 2, (h - H) // 2; im.crop((l, t, l + W, t + H)).save(os.path.join(D, nom + ".png"))
        u = rep.get("usage") or {}; det = u.get("input_tokens_details") or {}
        c = (det.get("text_tokens", 0) * 5e-6 + det.get("image_tokens", 0) * 8e-6 + u.get("output_tokens", 0) * 30e-6) * EUR; total += c
        bl.update({"usage": u, "cout_eur": round(c, 4), "taille_recue": f"{w}x{h}", "taille_finale": f"{W}x{H}"})
    else:
        bl["erreur"] = tx[:800]
    bilans.append(bl); json.dump({"total_eur": round(total, 4), "elements": bilans}, open(os.path.join(D, "bilan.json"), "w"), ensure_ascii=False, indent=1)
    print(nom, st, du, "s", bl.get("cout_eur"), "€", bl.get("taille_recue"), "total", round(total, 3))
    if st != 200: print("arrêt après erreur"); break
