"""Banc d'essai des planches Poppy (24 novembre 2026), demandé par le propriétaire. Hors de SINA.
A : le logo n° 1 de la première planche de logos Poppy + le prompt court du propriétaire.
B : pareil, plus la planche « Concept 03 » de ChatGPT comme référence de niveau, avec la seule précision demandée.
GPT Image 2.5 Sunburst, /v1/images/edits, high, 1024x1536, opaque, png, n 1. Aucune reprise. Arrêt à 0,20 €.
Usage : python3 -I banc.py <dossier> [--verifier]"""
import base64, json, os, sys, time, uuid, urllib.request, urllib.error
D = sys.argv[1]; VERIFIER = "--verifier" in sys.argv
EUR, PLAFOND = 0.86, 0.20
PROMPT = ("Crée une planche complète de présentation d'identité de marque pour Poppy, une marque de harnais, laisses et colliers pour chiens.\n\n"
          "Je veux découvrir ma future marque comme si une agence créative contemporaine me présentait son travail.\n\n"
          "Crée une identité moderne, chaleureuse, expressive et commerciale, qui transmet la complicité entre les chiens et leurs propriétaires.\n\n"
          "Présente le système de logos à partir du logo fourni, la palette de couleurs, les typographies, les accroches commerciales, la direction photographique, trois publications originales aux formats 1:1, 4:5 et 9:16, une boutique e-commerce sur ordinateur et téléphone, ainsi que des exemples de packaging et de supports de marque.\n\n"
          "Ajoute un espace pour le titre SEO, la méta-description et le domaine à vérifier.\n\n"
          "Fais une présentation visuelle immersive et originale, avec une véritable hiérarchie graphique. Les créations doivent donner envie de découvrir et d'acheter les produits Poppy.\n\n"
          "Les textes sont en français.")
PRECISION_B = ("\n\nLa première image est le logo Poppy à respecter. La deuxième image sert uniquement à comprendre le niveau de design, "
               "la hiérarchie visuelle et la mise en scène commerciale attendus : n'en reprends ni le logo, ni les textes, ni les prix, "
               "ni les avis, ni les affirmations commerciales.")
LOGO = os.path.join(D, "references", "logo-1-poppy.png"); REF = os.path.join(D, "references", "planche-chatgpt-concept-03.png")
ESSAIS = {"A": (PROMPT, [LOGO]), "B": (PROMPT + PRECISION_B, [LOGO, REF])}
CHAMPS = {"model": "gpt-image-2.5-sunburst", "quality": "high", "size": "1024x1536", "background": "opaque", "output_format": "png", "n": "1"}
total = 0.0
for nom, (prompt, images) in ESSAIS.items():
    champs = dict(CHAMPS, prompt=prompt)
    json.dump({"endpoint": "POST https://api.openai.com/v1/images/edits (multipart)", "champs": champs, "image[]": [os.path.basename(f) for f in images]},
              open(os.path.join(D, f"essai-{nom}-requete.json"), "w"), ensure_ascii=False, indent=1)
    if VERIFIER: print(nom, "requête construite, rien envoyé"); continue
    if total + 0.09 > PLAFOND: print("ARRÊT plafond"); break
    b = uuid.uuid4().hex; m = [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in champs.items()]
    for f in images:
        m.append(f'--{b}\r\nContent-Disposition: form-data; name="image[]"; filename="{os.path.basename(f)}"\r\nContent-Type: image/png\r\n\r\n'.encode() + open(f, "rb").read() + b"\r\n")
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
    json.dump(lis if rep else {"brut": tx}, open(os.path.join(D, f"essai-{nom}-reponse-complete.json"), "w"), ensure_ascii=False, indent=1)
    bilan = {"essai": nom, "statut_http": st, "duree_s": du, "x-request-id": ent.get("X-Request-Id") or ent.get("x-request-id")}
    if st == 200 and rep.get("data"):
        open(os.path.join(D, f"essai-{nom}-brute.png"), "wb").write(base64.b64decode(rep["data"][0]["b64_json"]))
        u = rep.get("usage") or {}; det = u.get("input_tokens_details") or {}
        c = (det.get("text_tokens", 0) * 5e-6 + det.get("image_tokens", 0) * 8e-6 + u.get("output_tokens", 0) * 30e-6) * EUR; total += c
        bilan.update({"usage": u, "cout_eur": round(c, 4), "taille": rep.get("size"), "qualite": rep.get("quality")})
    else:
        bilan["erreur"] = tx[:800]
    json.dump(bilan, open(os.path.join(D, f"essai-{nom}-bilan.json"), "w"), ensure_ascii=False, indent=1)
    print(nom, st, du, "s", bilan.get("cout_eur"), "€ total", round(total, 3))
    if st != 200: print("arrêt : pas d'appel suivant après une erreur"); break
