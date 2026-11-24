"""Banc d'essai contrôlé des logos (24 novembre 2026), indépendant de SINA.
Configurations A, B, C (Responses API) et D (Images API directe), 2 générations indépendantes chacune.
Tout est enregistré : requête, réponse complète, en-têtes utiles, durée, consommation, image brute.
Usage : python3 -I banc.py <dossier>
"""
import base64, json, os, sys, time, urllib.request, urllib.error

RACINE = sys.argv[1]
DEMANDE = ("Crée un logo moderne et original pour mon entreprise Tenon. Je suis menuisier et je réalise des cuisines "
           "et des dressings sur mesure. Fond blanc.")
EUR = 0.86          # taux du dollar par défaut du Studio
PLAFOND = 1.00      # euros, arrêt avant de dépasser
# Prix officiels de gpt-image-2.6-sunburst (page du modèle) : texte entrée 5 $/M, image entrée 8 $/M, image sortie 30 $/M.
IMG_TXT_IN, IMG_IMG_IN, IMG_OUT = 5e-6, 8e-6, 30e-6

def outil(quality, complexity):
    return {"type": "image_generation", "model": "gpt-image-2.6-sunburst", "quality": quality, "complexity": complexity,
            "size": "1024x1024", "background": "opaque", "output_format": "png", "action": "generate"}

INSTRUCTIONS_DA = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "INSTRUCTIONS-DIRECTEUR-ARTISTIQUE.md")).read().split("\n", 2)[2].strip()
OUTIL = outil("high", "high")
CONFIGS = {
    # Sans aucune instruction système : seulement la demande naturelle.
    "SANS": ("responses", {"model": "gpt-6.2-astra", "input": DEMANDE, "tools": [OUTIL], "tool_choice": {"type": "image_generation"}}),
    # Avec le prompt système du directeur artistique écrit par le propriétaire, rien d'autre.
    "DA": ("responses", {"model": "gpt-6.2-astra", "instructions": INSTRUCTIONS_DA, "input": DEMANDE, "tools": [OUTIL], "tool_choice": {"type": "image_generation"}}),
}
URL = {"responses": "https://api.openai.com/v1/responses", "images": "https://api.openai.com/v1/images/generations"}

def appel(url, corps):
    req = urllib.request.Request(url, data=json.dumps(corps).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer x"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=900) as r:
            corps_rep, statut, entetes = r.read().decode(), r.status, dict(r.headers)
    except urllib.error.HTTPError as e:
        corps_rep, statut, entetes = e.read().decode(), e.code, dict(e.headers)
    return statut, entetes, corps_rep, round(time.time() - t0, 1)

def cout_image(u):
    d = u.get("input_tokens_details", {}) or {}
    txt = d.get("text_tokens", u.get("input_tokens", 0) - d.get("image_tokens", 0))
    return (txt * IMG_TXT_IN + d.get("image_tokens", 0) * IMG_IMG_IN + u.get("output_tokens", 0) * IMG_OUT) * EUR

total, bilan = 0.0, []
for cle, (porte, corps) in CONFIGS.items():
    for n in (1, 2):
        nom = f"{cle}{n}"
        if total >= PLAFOND:
            bilan.append({"essai": nom, "statut": "non lancé : plafond atteint"}); continue
        dossier = os.path.join(RACINE, nom); os.makedirs(dossier, exist_ok=True)
        json.dump({"endpoint": "POST " + URL[porte], "corps": corps}, open(os.path.join(dossier, "requete.json"), "w"), ensure_ascii=False, indent=1)
        statut, entetes, texte, duree = appel(URL[porte], corps)
        open(os.path.join(dossier, "reponse-complete.json"), "w").write(texte)
        utiles = {k: v for k, v in entetes.items() if k.lower() in ("x-request-id", "openai-processing-ms", "openai-model", "openai-version", "date")}
        ligne = {"essai": nom, "porte": porte, "statut_http": statut, "duree_s": duree, "entetes": utiles}
        try:
            rep = json.loads(texte)
        except Exception:
            rep = {}
        if statut != 200:
            ligne["erreur"] = texte[:800]; bilan.append(ligne); print(nom, "ERREUR", statut, texte[:300]); continue
        if porte == "images":
            data = rep.get("data", [])
            ligne.update({"modele_demande": corps["model"], "usage": rep.get("usage"), "revised_prompt": (data[0].get("revised_prompt") if data else None),
                          "nb_images": len(data), "autres_champs": {k: v for k, v in rep.items() if k not in ("data", "usage")}})
            if data:
                open(os.path.join(dossier, "image-brute.png"), "wb").write(base64.b64decode(data[0]["b64_json"]))
            c = cout_image(rep.get("usage") or {}); ligne["cout_eur"] = round(c, 4); total += c
        else:
            appels = [o for o in rep.get("output", []) if o.get("type") == "image_generation_call"]
            ligne.update({"modele_demande_texte": corps["model"], "modele_retourne_texte": rep.get("model"),
                          "modele_demande_dessin": corps["tools"][0]["model"], "usage_texte": rep.get("usage"),
                          "nb_images": len(appels), "id_reponse": rep.get("id"),
                          "appels_dessin": [{k: v for k, v in o.items() if k != "result"} for o in appels],
                          "message_texte": ["".join(c.get("text", "") for c in o.get("content", [])) for o in rep.get("output", []) if o.get("type") == "message"]})
            for k, o in enumerate(appels, 1):
                if o.get("result"):
                    open(os.path.join(dossier, f"image-brute{'' if k == 1 else '-' + str(k)}.png"), "wb").write(base64.b64decode(o["result"]))
            # Coût du dessin : quand OpenAI ne le détaille pas, on compte la sortie d'image mesurée hier (high 0,046 €, xhigh 0,081 €).
            q = corps["tools"][0]["quality"]
            c = len(appels) * (0.046 if q == "high" else 0.081); ligne["cout_dessin_eur_estime"] = round(c, 4); total += c
        bilan.append(ligne)
        json.dump(ligne, open(os.path.join(dossier, "bilan.json"), "w"), ensure_ascii=False, indent=1)
        print(nom, statut, f"{duree}s", "images:", ligne.get("nb_images"), "total ~", round(total, 3), "€")
json.dump({"demande": DEMANDE, "instructions_da": INSTRUCTIONS_DA, "total_eur_estime": round(total, 4), "essais": bilan}, open(os.path.join(RACINE, "bilan-general.json"), "w"), ensure_ascii=False, indent=1)
