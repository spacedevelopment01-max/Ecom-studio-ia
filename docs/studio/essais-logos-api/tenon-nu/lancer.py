"""Halo, demande nue (24 novembre 2026). Une seule requête, aucune instruction système, aucune reprise.
Enregistre la requête, la réponse complète, les images brutes et le coût. Usage : python3 -I lancer.py <dossier>"""
import base64, json, os, sys, time, urllib.request, urllib.error
D = sys.argv[1]; R = json.load(open(os.path.join(D, "requete.json")))
req = urllib.request.Request("https://api.openai.com/v1/responses", data=json.dumps(R["corps"]).encode(),
                             headers={"Content-Type": "application/json", "Authorization": "Bearer x"})
t0 = time.time()
try:
    with urllib.request.urlopen(req, timeout=900) as r: texte, statut, ent = r.read().decode(), r.status, dict(r.headers)
except urllib.error.HTTPError as e: texte, statut, ent = e.read().decode(), e.code, dict(e.headers)
duree = round(time.time() - t0, 1)
open(os.path.join(D, "reponse-complete.json"), "w").write(texte)
bilan = {"statut_http": statut, "duree_s": duree, "x-request-id": ent.get("X-Request-Id") or ent.get("x-request-id")}
if statut == 200:
    rep = json.loads(texte); appels = [o for o in rep.get("output", []) if o.get("type") == "image_generation_call"]
    for k, o in enumerate(appels, 1):
        if o.get("result"): open(os.path.join(D, f"logo{k}-brut.png"), "wb").write(base64.b64decode(o["result"]))
    u = rep.get("usage", {})
    texte_eur = (u.get("input_tokens", 0) * 8e-6 + u.get("output_tokens", 0) * 40e-6) * 0.86
    bilan.update({"modele_texte_retourne": rep.get("model"), "usage_texte": u, "cout_texte_eur": round(texte_eur, 4),
                  "nb_images": len(appels), "appels_dessin": [{k: v for k, v in o.items() if k != "result"} for o in appels],
                  "message": ["".join(c.get("text", "") for c in o.get("content", [])) for o in rep.get("output", []) if o.get("type") == "message"]})
else:
    bilan["erreur"] = texte[:800]
json.dump(bilan, open(os.path.join(D, "bilan.json"), "w"), ensure_ascii=False, indent=1)
print(json.dumps({k: bilan.get(k) for k in ("statut_http", "duree_s", "nb_images", "cout_texte_eur")}, ensure_ascii=False))
