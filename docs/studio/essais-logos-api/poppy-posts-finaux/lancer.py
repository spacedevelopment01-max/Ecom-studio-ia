"""Poppy : les trois publications finales, générées séparément dans leur vrai format (24 novembre 2026), hors de SINA.
GPT Image 2.5 Sunburst, /v1/images/edits, high, opaque, png ; images : logo validé, planche V2. Aucune reprise. Arrêt à 0,25 €."""
import base64, json, os, sys, time, uuid, urllib.request, urllib.error
D = sys.argv[1]; EUR, PLAFOND = 0.86, 0.25
BASE = ("Crée une publication finale pour les réseaux sociaux de Poppy, une marque de harnais, laisses et colliers pour chiens. "
        "C'est un vrai fichier publiable tel quel, au format exact {fmt}, avec un cadrage pensé pour ce format. "
        "Elle appartient à l'identité visuelle de la planche jointe (deuxième image) : même univers, même palette, même ton, même style photo, même niveau de qualité. "
        "Le logo est celui de la première image, à reproduire sans le redessiner. "
        "Objectif : {obj}. "
        "Textes en français, courts et lisibles. Aucun prix, aucun avis, aucune promesse chiffrée.")
POSTS = {"post-1-1x1": ("1:1 (carré, fil d'actualité)", "créer une émotion autour du lien entre un chien et son humain", "1024x1024"),
         "post-2-4x5": ("4:5 (publication portrait)", "mettre en avant un produit et ses bénéfices pour donner envie d'acheter, avec un appel à l'action", "1088x1360"),
         "post-3-9x16": ("9:16 (story ou reel)", "faire réagir la communauté, avec une interaction propre aux stories", "1152x2048")}
IMAGES = [os.path.join(D, "../planches-poppy-v2/logo-poppy.png"), os.path.join(D, "../planches-poppy-v2/planche-v2-brute.png")]
total, bilans = 0.0, []
for nom, (fmt, obj, size) in POSTS.items():
    if total + 0.08 > PLAFOND: print("ARRÊT plafond"); break
    champs = {"model": "gpt-image-2.5-sunburst", "prompt": BASE.format(fmt=fmt, obj=obj), "quality": "high", "size": size, "background": "opaque", "output_format": "png", "n": "1"}
    json.dump({"endpoint": "POST https://api.openai.com/v1/images/edits (multipart)", "champs": champs, "image[]": ["logo-poppy.png", "planche-v2-brute.png"]}, open(os.path.join(D, nom + "-requete.json"), "w"), ensure_ascii=False, indent=1)
    if "--verifier" in sys.argv: print(nom, "construit"); continue
    b = uuid.uuid4().hex; m = [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in champs.items()]
    for f in IMAGES: m.append(f'--{b}\r\nContent-Disposition: form-data; name="image[]"; filename="{os.path.basename(f)}"\r\nContent-Type: image/png\r\n\r\n'.encode() + open(f, "rb").read() + b"\r\n")
    m.append(f"--{b}--\r\n".encode())
    req = urllib.request.Request("https://api.openai.com/v1/images/edits", data=b"".join(m), headers={"Content-Type": f"multipart/form-data; boundary={b}", "Authorization": "Bearer x"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=900) as r: tx, st, ent = r.read().decode(), r.status, dict(r.headers)
    except urllib.error.HTTPError as e: tx, st, ent = e.read().decode(), e.code, dict(e.headers)
    du = round(time.time() - t0, 1)
    try: rep = json.loads(tx)
    except Exception: rep = {}
    lis = json.loads(json.dumps(rep))
    for d in lis.get("data", []):
        if "b64_json" in d: d["b64_json"] = "…(image enregistrée à part)"
    json.dump(lis if rep else {"brut": tx}, open(os.path.join(D, nom + "-reponse-complete.json"), "w"), ensure_ascii=False, indent=1)
    bl = {"post": nom, "statut_http": st, "duree_s": du, "x-request-id": ent.get("X-Request-Id") or ent.get("x-request-id")}
    if st == 200 and rep.get("data"):
        open(os.path.join(D, nom + ".png"), "wb").write(base64.b64decode(rep["data"][0]["b64_json"]))
        u = rep.get("usage") or {}; det = u.get("input_tokens_details") or {}
        c = (det.get("text_tokens", 0) * 5e-6 + det.get("image_tokens", 0) * 8e-6 + u.get("output_tokens", 0) * 30e-6) * EUR; total += c
        bl.update({"usage": u, "cout_eur": round(c, 4), "taille": rep.get("size")})
    else:
        bl["erreur"] = tx[:800]
    bilans.append(bl); json.dump({"total_eur": round(total, 4), "posts": bilans}, open(os.path.join(D, "bilan.json"), "w"), ensure_ascii=False, indent=1)
    print(nom, st, du, "s", bl.get("cout_eur"), "€", bl.get("taille"), "total", round(total, 3))
    if st != 200: print("arrêt après erreur"); break
