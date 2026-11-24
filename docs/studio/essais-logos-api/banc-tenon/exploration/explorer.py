"""Test d'exploration créative (24 novembre 2026), indépendant de SINA.
1) GPT 6.2 Astra définit 4 concepts (instructions = prompt du directeur artistique + exploration du propriétaire), sans dessin.
2) Chaque concept est dessiné séparément : nouvelle conversation, même outil et mêmes paramètres que le test précédent.
3) gpt-6.2-sol évalue les 4 logos ensemble (similitudes). Aucune régénération.
Usage : python3 -I explorer.py <dossier>
"""
import base64, json, os, sys, time, urllib.request, urllib.error
R = sys.argv[1]; ICI = os.path.dirname(os.path.abspath(__file__))
lire = lambda p: open(p).read().split("\n", 2)[2].strip()
INSTR = lire(os.path.join(ICI, "..", "INSTRUCTIONS-DIRECTEUR-ARTISTIQUE.md")) + "\n\n" + lire(os.path.join(ICI, "INSTRUCTIONS-EXPLORATION.md"))
DEMANDE = ("Crée quatre logos complètement différents, modernes et originaux, pour mon entreprise Tenon. Je suis menuisier "
           "et je réalise des cuisines et des dressings sur mesure. Fond blanc.")
OUTIL = {"type": "image_generation", "model": "gpt-image-2.6-sunburst", "quality": "high", "complexity": "high",
         "size": "1024x1024", "background": "opaque", "output_format": "png", "action": "generate"}

def post(url, corps, nom):
    req = urllib.request.Request(url, data=json.dumps(corps).encode(), headers={"Content-Type": "application/json", "Authorization": "Bearer x"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=900) as r: texte, st, h = r.read().decode(), r.status, dict(r.headers)
    except urllib.error.HTTPError as e: texte, st, h = e.read().decode(), e.code, dict(e.headers)
    d = round(time.time() - t0, 1)
    json.dump({"endpoint": "POST " + url, "corps": corps}, open(os.path.join(R, f"{nom}-requete.json"), "w"), ensure_ascii=False, indent=1)
    open(os.path.join(R, f"{nom}-reponse-complete.json"), "w").write(texte)
    print(nom, st, f"{d}s")
    if st != 200: raise SystemExit(f"{nom} : erreur {st} {texte[:500]}")
    return json.loads(texte), d

texte_de = lambda rep: "".join(c.get("text", "") for o in rep.get("output", []) if o.get("type") == "message" for c in o.get("content", []))
os.makedirs(R, exist_ok=True); bilan = {"instructions": INSTR, "demande": DEMANDE}

# 1. Les concepts, avant toute génération.
rep, d = post("https://api.openai.com/v1/responses", {"model": "gpt-6.2-astra", "instructions": INSTR,
    "input": DEMANDE + "\n\nAvant toute génération, définis les quatre concepts créatifs. Réponds uniquement en JSON : "
             "{\"concepts\":[{\"titre\":\"\",\"concept\":\"\",\"consigne_pour_le_generateur\":\"\"}]}"}, "1-concepts")
t = texte_de(rep); concepts = json.loads(t[t.find("{"): t.rfind("}") + 1])["concepts"]
bilan["concepts"] = {"duree_s": d, "usage": rep.get("usage"), "id": rep.get("id"), "concepts": concepts}

# 2. Chaque concept dessiné séparément, nouvelle conversation, sans image précédente.
bilan["logos"] = []
for i, c in enumerate(concepts[:4], 1):
    rep, d = post("https://api.openai.com/v1/responses", {"model": "gpt-6.2-astra", "instructions": INSTR,
        "input": f"Génère le logo de ce concept pour mon entreprise Tenon (menuisier, cuisines et dressings sur mesure), sur fond blanc :\n\n{json.dumps(c, ensure_ascii=False)}",
        "tools": [OUTIL], "tool_choice": {"type": "image_generation"}}, f"2-logo{i}")
    appels = [o for o in rep.get("output", []) if o.get("type") == "image_generation_call"]
    if appels and appels[0].get("result"):
        open(os.path.join(R, f"logo{i}-brut.png"), "wb").write(base64.b64decode(appels[0]["result"]))
    bilan["logos"].append({"logo": i, "duree_s": d, "id": rep.get("id"), "usage_texte": rep.get("usage"),
        "appel_dessin": {k: v for k, v in (appels[0] if appels else {}).items() if k != "result"}, "nb_images": len(appels)})

# 3. Le contrôleur qualité regarde les quatre ensemble.
contenu = [{"type": "input_text", "text": "Tu es le contrôleur qualité exigeant d'une agence de branding. Voici quatre logos proposés au même client, "
    "Tenon, menuisier qui réalise des cuisines et des dressings sur mesure. On veut quatre véritables identités de marque, pas quatre "
    "variantes du même logo. Compare-les ensemble. Pour chaque paire qui se ressemble, dis en quoi : concept, typographie, composition, "
    "couleur. Puis note chaque logo sur 10 (qualité, originalité, désir) et dis lequel tu présenterais au client. Réponds en français, "
    "en JSON : {\"similitudes\":[{\"logos\":[1,2],\"concept\":\"\",\"typographie\":\"\",\"composition\":\"\",\"couleur\":\"\"}],"
    "\"logos\":[{\"logo\":1,\"note\":0,\"avis\":\"\"}],\"diversite_sur_10\":0,\"conclusion\":\"\"}"}]
for i in range(1, 5):
    p = os.path.join(R, f"logo{i}-brut.png")
    if os.path.exists(p):
        contenu += [{"type": "input_text", "text": f"Logo {i} :"}, {"type": "input_image", "image_url": "data:image/png;base64," + base64.b64encode(open(p, "rb").read()).decode()}]
rep, d = post("https://api.openai.com/v1/responses", {"model": "gpt-6.2-sol", "input": [{"role": "user", "content": contenu}]}, "3-controle")
t = texte_de(rep)
try: bilan["controle"] = json.loads(t[t.find("{"): t.rfind("}") + 1])
except Exception: bilan["controle"] = {"texte_brut": t}
bilan["controle_usage"] = rep.get("usage"); bilan["controle_duree_s"] = d
json.dump(bilan, open(os.path.join(R, "bilan.json"), "w"), ensure_ascii=False, indent=1)
