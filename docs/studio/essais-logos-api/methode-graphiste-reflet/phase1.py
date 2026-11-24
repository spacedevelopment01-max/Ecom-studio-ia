"""Méthode des graphistes, phase 1 pour Reflet : deux planches de recherche (24 novembre 2026), mêmes réglages que Tenon. Images API directe, aucune IA de texte,
aucune reprise. Usage : python3 -I phase1.py <dossier> [--verifier]"""
import base64, json, os, sys, time, urllib.request, urllib.error
D = sys.argv[1]; VERIFIER = "--verifier" in sys.argv
PROMPT = ("Crée une planche de recherche graphique pour Reflet, une entreprise de nettoyage de voitures, intérieur et "
          "extérieur. Présente six esquisses de logos contemporains sur une grille de trois colonnes et deux lignes. "
          "Explore différentes manières de traduire le savoir-faire du nettoyage automobile dans le dessin des lettres et "
          "des signes graphiques. Chaque piste doit pouvoir devenir une véritable marque commerciale. Travaille sur fond "
          "blanc, sans maquette de présentation.")
COMMUN = {"prompt": PROMPT, "size": "1536x1024", "quality": "medium", "background": "opaque", "output_format": "png", "n": 1}
ESSAIS = {"planche-2.5-sunburst": dict(COMMUN, model="gpt-image-2.5-sunburst"),
          "planche-2.6-flare": dict(COMMUN, model="gpt-image-2.6-flare", complexity="medium")}
URL = "https://api.openai.com/v1/images/generations"
PRIX = {"texte": 5e-6, "image_entree": 8e-6, "sortie": 30e-6}; EUR = 0.86
for nom, corps in ESSAIS.items():
    json.dump({"endpoint": "POST " + URL, "corps": corps}, open(os.path.join(D, nom + "-requete.json"), "w"), ensure_ascii=False, indent=1)
    if VERIFIER: continue
    req = urllib.request.Request(URL, data=json.dumps(corps).encode(), headers={"Content-Type": "application/json", "Authorization": "Bearer x"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=900) as r: texte, statut, ent = r.read().decode(), r.status, dict(r.headers)
    except urllib.error.HTTPError as e: texte, statut, ent = e.read().decode(), e.code, dict(e.headers)
    bilan = {"modele": corps["model"], "statut_http": statut, "duree_s": round(time.time() - t0, 1),
             "x-request-id": ent.get("X-Request-Id") or ent.get("x-request-id")}
    try: rep = json.loads(texte)
    except Exception: rep = {}
    lisible = json.loads(json.dumps(rep))
    for d in lisible.get("data", []):
        if "b64_json" in d: d["b64_json"] = f"…(image, {len(d['b64_json'])} caractères, enregistrée à part)"
    json.dump(lisible if rep else {"brut": texte}, open(os.path.join(D, nom + "-reponse-complete.json"), "w"), ensure_ascii=False, indent=1)
    if statut == 200 and rep.get("data"):
        open(os.path.join(D, nom + "-brute.png"), "wb").write(base64.b64decode(rep["data"][0]["b64_json"]))
        u = rep.get("usage") or {}; det = u.get("input_tokens_details") or {}
        cout = (det.get("text_tokens", 0) * PRIX["texte"] + det.get("image_tokens", 0) * PRIX["image_entree"] + u.get("output_tokens", 0) * PRIX["sortie"]) * EUR
        bilan.update({"usage": u, "cout_eur": round(cout, 4), "autres_champs": {k: v for k, v in rep.items() if k not in ("data", "usage")}})
    else:
        bilan["erreur"] = texte[:800]
    json.dump(bilan, open(os.path.join(D, nom + "-bilan.json"), "w"), ensure_ascii=False, indent=1)
    print(nom, json.dumps({k: bilan.get(k) for k in ("statut_http", "duree_s", "cout_eur")}))
    if statut != 200: print("arrêt : pas de deuxième appel après une erreur"); break
if VERIFIER: print("requêtes construites, rien envoyé")
