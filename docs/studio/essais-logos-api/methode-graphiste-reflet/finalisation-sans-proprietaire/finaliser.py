"""Finalisation sans le propriétaire (24 novembre 2026) : le modèle le plus fort regarde l'esquisse choisie et écrit
seul le texte de finalisation ; ce texte part tel quel à /v1/images/edits (mêmes réglages que la phase 3 de Tenon).
Aucune reprise, aucun contrôleur. Arrêt si le total dépasse 0,20 €. Usage : python3 -I finaliser.py <dossier> [--verifier]"""
import base64, json, os, sys, time, uuid, urllib.request, urllib.error
D = sys.argv[1]; VERIFIER = "--verifier" in sys.argv
NOM, METIER = "Reflet", "une entreprise de nettoyage de voitures, intérieur et extérieur"
EUR, PLAFOND = 0.86, 0.20
CONSIGNE = f"""Tu es la directrice artistique d'un studio de création de marques. Le client {NOM} ({METIER}) a choisi
l'esquisse de logo jointe parmi douze. Tu écris le texte qui sera envoyé tel quel à un modèle d'image pour transformer
cette esquisse en logo fini. Ce texte, en français :
- commence par « Transforme cette esquisse en véritable logo contemporain pour {NOM}, {METIER}. » ;
- nomme précisément l'idée centrale de l'esquisse, celle qui la distingue, et demande de la conserver ;
- demande d'améliorer fortement le dessin : lettres plus soignées et plus distinctives, proportions, espacement,
  équilibre visuel et présence de marque, en restant très lisible ;
- demande de simplifier ce qui fait trop illustration pour que le signe reste graphique ;
- donne une direction de palette adaptée au métier et à l'esquisse ;
- finit par : style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste,
  pas de dégradé excessif ;
- garde une ligne descriptive discrète seulement si elle dit exactement le métier du client ; toute autre phrase est retirée.
N'ajoute aucune idée qui n'est pas dans l'esquisse. Dix phrases au plus.
Réponds uniquement en JSON : {{"idee_centrale": "…", "texte": "…"}}"""
CHAMPS = {"model": "gpt-image-2.6-sunburst", "quality": "high", "size": "auto", "background": "opaque", "output_format": "png", "n": "1"}

def appel(url, data, type_):
    req = urllib.request.Request(url, data=data, headers={"Content-Type": type_, "Authorization": "Bearer x"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=900) as r: texte, statut, ent = r.read().decode(), r.status, dict(r.headers)
    except urllib.error.HTTPError as e: texte, statut, ent = e.read().decode(), e.code, dict(e.headers)
    return statut, texte, round(time.time() - t0, 1), ent.get("X-Request-Id") or ent.get("x-request-id")

def formulaire(champs, fichier):
    b = uuid.uuid4().hex; m = [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in champs.items()]
    m.append(f'--{b}\r\nContent-Disposition: form-data; name="image[]"; filename="{os.path.basename(fichier)}"\r\nContent-Type: image/png\r\n\r\n'.encode() + open(fichier, "rb").read() + b"\r\n")
    m.append(f"--{b}--\r\n".encode()); return b"".join(m), f"multipart/form-data; boundary={b}"

total = 0.0
for n in ("4", "8"):
    esq = os.path.join(D, f"esquisse-{n}.png"); b64 = base64.b64encode(open(esq, "rb").read()).decode()
    corps_texte = {"model": "gpt-6.2-astra", "instructions": CONSIGNE,
                   "input": [{"role": "user", "content": [{"type": "input_text", "text": "Voici l'esquisse choisie."},
                                                          {"type": "input_image", "image_url": "data:image/png;base64," + b64}]}]}
    lisible = json.loads(json.dumps(corps_texte)); lisible["input"][0]["content"][1]["image_url"] = f"(esquisse-{n}.png)"
    json.dump({"endpoint": "POST https://api.openai.com/v1/responses", "corps": lisible}, open(os.path.join(D, f"logo-{n}-1-requete-texte.json"), "w"), ensure_ascii=False, indent=1)
    if VERIFIER: print(n, "requête du texte construite, rien envoyé"); continue
    if total >= PLAFOND: print("plafond atteint, arrêt"); break
    statut, texte, duree, rid = appel("https://api.openai.com/v1/responses", json.dumps(corps_texte).encode(), "application/json")
    open(os.path.join(D, f"logo-{n}-1-reponse-texte.json"), "w").write(texte)
    bilan = {"esquisse": n, "texte": {"statut_http": statut, "duree_s": duree, "x-request-id": rid}}
    if statut != 200:
        bilan["texte"]["erreur"] = texte[:800]; json.dump(bilan, open(os.path.join(D, f"logo-{n}-bilan.json"), "w"), ensure_ascii=False, indent=1)
        print(n, "ERREUR texte", statut); break
    rep = json.loads(texte); u = rep.get("usage", {})
    c = (u.get("input_tokens", 0) * 8e-6 + u.get("output_tokens", 0) * 40e-6) * EUR; total += c
    sortie = "".join(x.get("text", "") for o in rep.get("output", []) if o.get("type") == "message" for x in o.get("content", []))
    ecrit = json.loads(sortie[sortie.find("{"): sortie.rfind("}") + 1])
    bilan["texte"].update({"usage": u, "cout_eur": round(c, 4), "idee_centrale": ecrit["idee_centrale"], "texte_ecrit": ecrit["texte"]})
    open(os.path.join(D, f"logo-{n}-texte-ecrit-par-sina.txt"), "w").write(ecrit["texte"] + "\n")
    champs = dict(CHAMPS, prompt=ecrit["texte"])
    json.dump({"endpoint": "POST https://api.openai.com/v1/images/edits (formulaire multipart)", "champs": champs, "image[]": f"esquisse-{n}.png"},
              open(os.path.join(D, f"logo-{n}-2-requete-image.json"), "w"), ensure_ascii=False, indent=1)
    data, type_ = formulaire(champs, esq)
    statut, texte, duree, rid = appel("https://api.openai.com/v1/images/edits", data, type_)
    bilan["image"] = {"statut_http": statut, "duree_s": duree, "x-request-id": rid}
    try: rep = json.loads(texte)
    except Exception: rep = {}
    lis = json.loads(json.dumps(rep))
    for d in lis.get("data", []):
        if "b64_json" in d: d["b64_json"] = "…(image enregistrée à part)"
    json.dump(lis if rep else {"brut": texte}, open(os.path.join(D, f"logo-{n}-2-reponse-image.json"), "w"), ensure_ascii=False, indent=1)
    if statut == 200 and rep.get("data"):
        open(os.path.join(D, f"logo-{n}-brut.png"), "wb").write(base64.b64decode(rep["data"][0]["b64_json"]))
        u = rep.get("usage") or {}; det = u.get("input_tokens_details") or {}
        c = (det.get("text_tokens", 0) * 5e-6 + det.get("image_tokens", 0) * 8e-6 + u.get("output_tokens", 0) * 30e-6) * EUR; total += c
        bilan["image"].update({"usage": u, "cout_eur": round(c, 4), "taille": rep.get("size")})
    else:
        bilan["image"]["erreur"] = texte[:800]
    bilan["total_cumule_eur"] = round(total, 4)
    json.dump(bilan, open(os.path.join(D, f"logo-{n}-bilan.json"), "w"), ensure_ascii=False, indent=1)
    print(n, "texte", bilan["texte"]["duree_s"], "s", bilan["texte"]["cout_eur"], "€ | image", bilan["image"]["statut_http"], bilan["image"]["duree_s"], "s", bilan["image"].get("cout_eur"), "€ | total", round(total, 3))
    if statut != 200: print("arrêt : pas d'appel suivant après une erreur"); break
