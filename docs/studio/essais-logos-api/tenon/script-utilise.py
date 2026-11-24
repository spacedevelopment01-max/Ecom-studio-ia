"""SINA seule : le moteur de ChatGPT (Responses + outil de dessin), les leçons permanentes du propriétaire,
un relecteur d'un autre modèle, et une reprise « complètement différent » faite par SINA elle-même.
Usage : python3 -I sina-seule.py <sortie> <modele_dessin> <nom> <metier>
"""
import base64, json, os, sys, urllib.request, urllib.error

SORTIE, DESSIN, NOM, METIER = sys.argv[1:5]
os.makedirs(SORTIE, exist_ok=True)
MOTEUR, JUGE = "gpt-6.2-astra", "gpt-6.2-sol"
MAX_IMAGES = 6

LECONS = """Tu crées les logos de petites marques. Tu travailles seul : personne ne te guidera.
Ce que tu sais d'avance :
- Le nom de la marque n'est pas une idée de dessin : on ne dessine pas ce que le nom raconte.
- Chaque logo montre le service du client avec un signe dessiné : on comprend ce qu'il fait sans lire aucun texte.
- Ce signe est simple, net et moderne, comme dans les identités des marques récentes : jamais une illustration détaillée, jamais un rendu brillant, flou ou néon.
- Le logo ne porte aucun autre texte que le nom de la marque : ni métier écrit, ni slogan, ni ville.
- Les logos proposés sont très différents les uns des autres.
- Le nom est écrit exactement, lettre par lettre.
Dessine chaque logo seul, sur sa propre image carrée, sur un fond uni : appelle l'outil de dessin une fois par logo."""

def post(url, corps):
    req = urllib.request.Request(url, data=json.dumps(corps).encode(), headers={"Content-Type": "application/json", "Authorization": "Bearer x"})
    with urllib.request.urlopen(req, timeout=900) as r:
        return json.load(r)

def moteur(texte, precedent=None):
    corps = {"model": MOTEUR, "instructions": LECONS, "input": texte,
             "tools": [{"type": "image_generation", "model": DESSIN, "quality": "high", "size": "1024x1024"}]}
    if precedent: corps["previous_response_id"] = precedent
    rep = post("https://api.openai.com/v1/responses", corps)
    imgs = [o for o in rep.get("output", []) if o.get("type") == "image_generation_call" and o.get("result")]
    return rep, imgs

JUGEMENT = f"""Tu es le relecteur exigeant d'un studio de design. Voici un logo proposé pour la marque « {NOM} » ({METIER}).
Note-le sur 10 comme un directeur de création : un logo qu'on publierait tel quel pour un client exigeant vaut 8 ou plus.
Premier critère : sans lire aucun texte, comprend-on ce que fait le client ? Sinon, la note est 5 au plus. Autres défauts graves : un autre texte que le nom de la marque, rendu daté (années 80 ou 90), illustration détaillée ou petit dessin tout fait, rendu flou ou néon, nom mal écrit, dessin qui illustre le nom au lieu du métier, logo banal.
Réponds en JSON : {{"note": 0-10, "raison": "une phrase en français"}}"""

def juger(chemin):
    b64 = base64.b64encode(open(chemin, "rb").read()).decode()
    rep = post("https://api.openai.com/v1/responses", {"model": JUGE, "input": [{"role": "user", "content": [
        {"type": "input_text", "text": JUGEMENT}, {"type": "input_image", "image_url": f"data:image/png;base64,{b64}"}]}]})
    t = "".join(c.get("text", "") for o in rep.get("output", []) if o.get("type") == "message" for c in o.get("content", []))
    return json.loads(t[t.find("{"): t.rfind("}") + 1])

journal, n = [], 0
rep, imgs = moteur(f"Le nom de mon entreprise c'est {NOM} et {METIER}. Fais-moi 3 logos différents pour que je puisse choisir.")
fil = rep["id"]
gardes, refus = [], []
for o in imgs[:3]:
    n += 1; p = os.path.join(SORTIE, f"logo{n}.png"); open(p, "wb").write(base64.b64decode(o["result"]))
    v = juger(p); journal.append({"logo": n, "tour": 1, "consigne": o.get("revised_prompt"), **v}); print(f"logo {n} : {v}")
    (gardes if v.get("note", 0) >= 8 else refus).append((n, v))
# SINA se corrige seule : un tour « complètement différent » pour chaque refus, dans le même fil.
for (k, v) in refus:
    if n >= MAX_IMAGES: break
    rep, imgs = moteur(f"Le logo n°{k} ne me plaît pas. Fais-m'en un autre complètement différent de tous ceux déjà faits.", fil)
    fil = rep["id"]
    for o in imgs[:1]:
        n += 1; p = os.path.join(SORTIE, f"logo{n}.png"); open(p, "wb").write(base64.b64decode(o["result"]))
        w = juger(p); journal.append({"logo": n, "tour": 2, "remplace": k, "consigne": o.get("revised_prompt"), **w}); print(f"logo {n} (remplace {k}) : {w}")
json.dump({"dessin": DESSIN, "images": n, "journal": journal}, open(os.path.join(SORTIE, "journal.json"), "w"), ensure_ascii=False, indent=1)
print("images dessinées :", n)
