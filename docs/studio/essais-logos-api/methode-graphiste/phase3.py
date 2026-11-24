"""Méthode des graphistes, phase 3 : finalisation des esquisses 6 et 11 choisies par le propriétaire (24 novembre 2026).
POST /v1/images/edits, une requête par esquisse, aucune reprise. Usage : python3 -I phase3.py <dossier> [--verifier]"""
import base64, json, os, sys, time, uuid, urllib.request, urllib.error
D = sys.argv[1]; VERIFIER = "--verifier" in sys.argv
URL = "https://api.openai.com/v1/images/edits"
PROMPT = ("Transforme cette esquisse en véritable identité visuelle contemporaine pour Tenon, une entreprise de menuiserie "
          "spécialisée dans les cuisines et dressings sur mesure. Ne te contente pas de l'agrandir. Conserve l'idée "
          "originale de l'esquisse et laisse-toi libre de perfectionner son exécution artistique : une recherche "
          "typographique poussée, des couleurs affirmées, un dessin graphique soigné, et un travail précis du dessin des "
          "lettres, des proportions, de l'espacement et de la composition.")
CHAMPS = {"model": "gpt-image-2.6-sunburst", "prompt": PROMPT, "quality": "high", "size": "auto",
          "background": "opaque", "output_format": "png", "n": "1"}
EUR = 0.86
def formulaire(champs, fichier):
    b = uuid.uuid4().hex; morceaux = []
    for k, v in champs.items():
        morceaux.append(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    morceaux.append(f'--{b}\r\nContent-Disposition: form-data; name="image[]"; filename="{os.path.basename(fichier)}"\r\nContent-Type: image/png\r\n\r\n'.encode()
                    + open(fichier, "rb").read() + b"\r\n")
    morceaux.append(f"--{b}--\r\n".encode())
    return b"".join(morceaux), f"multipart/form-data; boundary={b}"
for n in ("6", "11"):
    esquisse = os.path.join(D, f"esquisse-{n}.png")
    json.dump({"endpoint": "POST " + URL + " (formulaire multipart)", "champs": CHAMPS, "image[]": os.path.basename(esquisse)},
              open(os.path.join(D, f"logo-{n}-requete.json"), "w"), ensure_ascii=False, indent=1)
    corps, type_ = formulaire(CHAMPS, esquisse)
    if VERIFIER: print(n, "requête construite,", len(corps), "octets, rien envoyé"); continue
    req = urllib.request.Request(URL, data=corps, headers={"Content-Type": type_, "Authorization": "Bearer x"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=900) as r: texte, statut, ent = r.read().decode(), r.status, dict(r.headers)
    except urllib.error.HTTPError as e: texte, statut, ent = e.read().decode(), e.code, dict(e.headers)
    bilan = {"esquisse": n, "statut_http": statut, "duree_s": round(time.time() - t0, 1), "x-request-id": ent.get("X-Request-Id") or ent.get("x-request-id")}
    try: rep = json.loads(texte)
    except Exception: rep = {}
    lisible = json.loads(json.dumps(rep))
    for d in lisible.get("data", []):
        if "b64_json" in d: d["b64_json"] = f"…(image, {len(d['b64_json'])} caractères, enregistrée à part)"
    json.dump(lisible if rep else {"brut": texte}, open(os.path.join(D, f"logo-{n}-reponse-complete.json"), "w"), ensure_ascii=False, indent=1)
    if statut == 200 and rep.get("data"):
        open(os.path.join(D, f"logo-{n}-brut.png"), "wb").write(base64.b64decode(rep["data"][0]["b64_json"]))
        u = rep.get("usage") or {}; det = u.get("input_tokens_details") or {}
        bilan.update({"usage": u, "cout_eur": round((det.get("text_tokens", 0) * 5e-6 + det.get("image_tokens", 0) * 8e-6 + u.get("output_tokens", 0) * 30e-6) * EUR, 4),
                      "autres_champs": {k: v for k, v in rep.items() if k not in ("data", "usage")}})
    else:
        bilan["erreur"] = texte[:800]
    json.dump(bilan, open(os.path.join(D, f"logo-{n}-bilan.json"), "w"), ensure_ascii=False, indent=1)
    print(n, json.dumps({k: bilan.get(k) for k in ("statut_http", "duree_s", "cout_eur")}))
    if statut != 200: print("arrêt : pas de deuxième appel après une erreur"); break
