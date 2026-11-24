"""Essai B (Tenon avec trois références visuelles). Même configuration que tenon-nu (essai A), avec en plus les trois
images du propriétaire et une phrase qui dit à quoi elles servent. Une seule requête, aucune reprise.
Usage : python3 -I lancer-b.py <dossier>            -> lance
        python3 -I lancer-b.py <dossier> --verifier -> construit et enregistre la requête sans rien envoyer"""
import base64, glob, json, mimetypes, os, sys, time, urllib.request, urllib.error
D = sys.argv[1]; VERIFIER = "--verifier" in sys.argv
A = json.load(open(os.path.join(D, "..", "tenon-nu", "requete.json")))["corps"]   # configuration de l'essai A, telle quelle
DEMANDE = A["input"]
PHRASE = ("Voici trois logos que j'aime, seulement pour le niveau de qualité que j'attends. "
          "Ne reprends ni leurs symboles, ni leurs compositions, ni leurs noms.")
refs = sorted(glob.glob(os.path.join(D, "references", "*")))
assert len(refs) == 3, f"il faut exactement 3 références, trouvé {len(refs)}"
contenu = [{"type": "input_text", "text": DEMANDE + "\n\n" + PHRASE}]
for p in refs:
    t = mimetypes.guess_type(p)[0]; assert t in ("image/png", "image/jpeg", "image/webp"), p
    contenu.append({"type": "input_image", "image_url": f"data:{t};base64," + base64.b64encode(open(p, "rb").read()).decode()})
corps = dict(A); corps["input"] = [{"role": "user", "content": contenu}]
corps["tools"] = [dict(A["tools"][0], action="generate")]
lisible = json.loads(json.dumps(corps))
for c in lisible["input"][0]["content"]:
    if c["type"] == "input_image": c["image_url"] = c["image_url"][:40] + "…(image " + str(len(c["image_url"])) + " caractères)"
json.dump({"endpoint": "POST https://api.openai.com/v1/responses", "references": [os.path.basename(p) for p in refs], "corps": lisible},
          open(os.path.join(D, "requete.json"), "w"), ensure_ascii=False, indent=1)
if VERIFIER: print("requête construite, rien envoyé"); sys.exit()
req = urllib.request.Request("https://api.openai.com/v1/responses", data=json.dumps(corps).encode(),
                             headers={"Content-Type": "application/json", "Authorization": "Bearer x"})
t0 = time.time()
try:
    with urllib.request.urlopen(req, timeout=900) as r: texte, statut, ent = r.read().decode(), r.status, dict(r.headers)
except urllib.error.HTTPError as e: texte, statut, ent = e.read().decode(), e.code, dict(e.headers)
open(os.path.join(D, "reponse-complete.json"), "w").write(texte)
bilan = {"statut_http": statut, "duree_s": round(time.time() - t0, 1), "x-request-id": ent.get("X-Request-Id") or ent.get("x-request-id")}
if statut == 200:
    rep = json.loads(texte); appels = [o for o in rep.get("output", []) if o.get("type") == "image_generation_call"]
    for k, o in enumerate(appels, 1):
        if o.get("result"): open(os.path.join(D, f"logo{k}-brut.png"), "wb").write(base64.b64decode(o["result"]))
    u = rep.get("usage", {})
    bilan.update({"usage_texte": u, "cout_texte_eur": round((u.get("input_tokens", 0) * 8e-6 + u.get("output_tokens", 0) * 40e-6) * 0.86, 4),
                  "nb_images": len(appels), "appels_dessin": [{k: v for k, v in o.items() if k != "result"} for o in appels],
                  "message": ["".join(c.get("text", "") for c in o.get("content", [])) for o in rep.get("output", []) if o.get("type") == "message"]})
else:
    bilan["erreur"] = texte[:800]
json.dump(bilan, open(os.path.join(D, "bilan.json"), "w"), ensure_ascii=False, indent=1)
print(json.dumps({k: bilan.get(k) for k in ("statut_http", "duree_s", "nb_images", "cout_texte_eur")}, ensure_ascii=False))
