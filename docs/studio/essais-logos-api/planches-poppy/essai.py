"""Planches d'identité complètes de Poppy (24 novembre 2026), hors de SINA, à la demande du propriétaire.
Étapes : 1) trois photos simples du client (doublure : Poppy est inventée) ; 2) finalisation des esquisses 4, 6 et 8
(texte écrit par le modèle le plus fort avec la consigne de SINA, puis retouche 2.6 Sunburst) ; 3) trois planches
complètes, une par logo (contenu et consigne d'image écrits par le modèle le plus fort, domaines vérifiés gratuitement,
image faite en une fois avec le logo et les trois photos jointes). Aucune reprise. Arrêt avant tout appel si le total
dépasse PLAFOND. Usage : python3 -I essai.py <dossier>"""
import base64, json, os, sys, time, uuid, urllib.request, urllib.error

D = sys.argv[1]
EUR, PLAFOND = 0.86, 0.70
NOM, METIER = "Poppy", "une entreprise qui vend des accessoires pour chiens, notamment des harnais, des laisses et des colliers"
total = 0.0
journal = []

def note(**k):
    journal.append(k); json.dump({"total_eur": round(total, 4), "journal": journal}, open(os.path.join(D, "journal.json"), "w"), ensure_ascii=False, indent=1)

def garde(prevu):
    if total + prevu > PLAFOND:
        note(arret=f"plafond : {round(total, 3)} € dépensés + {prevu} € prévus > {PLAFOND} €"); print("ARRÊT plafond"); sys.exit(2)

def http(url, data, type_):
    req = urllib.request.Request(url, data=data, headers={"Content-Type": type_, "Authorization": "Bearer x"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=900) as r: texte, statut = r.read().decode(), r.status
    except urllib.error.HTTPError as e: texte, statut = e.read().decode(), e.code
    return statut, texte, round(time.time() - t0, 1)

def cout_image(u):
    d = u.get("input_tokens_details") or {}
    return (d.get("text_tokens", 0) * 5e-6 + d.get("image_tokens", 0) * 8e-6 + u.get("output_tokens", 0) * 30e-6) * EUR

def generer(nom, prompt, quality, size):
    global total
    garde(0.06)
    corps = {"model": "gpt-image-2.6-sunburst", "prompt": prompt, "quality": quality, "size": size, "background": "opaque", "output_format": "png", "n": 1}
    st, tx, du = http("https://api.openai.com/v1/images/generations", json.dumps(corps).encode(), "application/json")
    return fin_image(nom, corps, st, tx, du)

def retoucher(nom, prompt, images, size):
    global total
    garde(0.10)
    champs = {"model": "gpt-image-2.6-sunburst", "prompt": prompt, "quality": "high", "size": size, "background": "opaque", "output_format": "png", "n": "1"}
    b = uuid.uuid4().hex; m = [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in champs.items()]
    for f in images:
        m.append(f'--{b}\r\nContent-Disposition: form-data; name="image[]"; filename="{os.path.basename(f)}"\r\nContent-Type: image/png\r\n\r\n'.encode() + open(f, "rb").read() + b"\r\n")
    m.append(f"--{b}--\r\n".encode())
    st, tx, du = http("https://api.openai.com/v1/images/edits", b"".join(m), f"multipart/form-data; boundary={b}")
    return fin_image(nom, dict(champs, images=[os.path.basename(f) for f in images]), st, tx, du)

def fin_image(nom, corps, st, tx, du):
    global total
    json.dump({"requete": corps}, open(nom + "-requete.json", "w"), ensure_ascii=False, indent=1)
    try: rep = json.loads(tx)
    except Exception: rep = {}
    if st != 200 or not rep.get("data"):
        note(etape=nom, statut=st, duree_s=du, erreur=tx[:600]); print("ERREUR", nom, st, tx[:300]); sys.exit(1)
    open(nom + ".png", "wb").write(base64.b64decode(rep["data"][0]["b64_json"]))
    u = rep.get("usage") or {}; c = cout_image(u); total += c
    note(etape=os.path.basename(nom), statut=st, duree_s=du, usage=u, taille=rep.get("size"), qualite=rep.get("quality"), cout_eur=round(c, 4))
    print(os.path.basename(nom), du, "s", round(c, 4), "€ total", round(total, 3)); return nom + ".png"

def astra(nom, instructions, texte, images=()):
    global total
    garde(0.06)
    contenu = [{"type": "input_text", "text": texte}] + [{"type": "input_image", "image_url": "data:image/png;base64," + base64.b64encode(open(f, "rb").read()).decode()} for f in images]
    corps = {"model": "gpt-6.2-astra", "instructions": instructions, "input": [{"role": "user", "content": contenu}]}
    st, tx, du = http("https://api.openai.com/v1/responses", json.dumps(corps).encode(), "application/json")
    if st != 200:
        note(etape=nom, statut=st, erreur=tx[:600]); print("ERREUR", nom, st, tx[:300]); sys.exit(1)
    rep = json.loads(tx); u = rep.get("usage", {})
    c = (u.get("input_tokens", 0) * 8e-6 + u.get("output_tokens", 0) * 40e-6) * EUR; total += c
    sortie = "".join(x.get("text", "") for o in rep.get("output", []) if o.get("type") == "message" for x in o.get("content", []))
    open(os.path.join(D, nom + "-reponse.txt"), "w").write(sortie)
    note(etape=nom, statut=st, duree_s=du, usage=u, cout_eur=round(c, 4)); print(nom, du, "s", round(c, 4), "€ total", round(total, 3))
    return json.loads(sortie[sortie.find("{"): sortie.rfind("}") + 1])

def domaine_libre(d):
    d = d.strip().lower()
    url = {"fr": f"https://rdap.nic.fr/domain/{d}", "com": f"https://rdap.verisign.com/com/v1/domain/{d}"}.get(d.rsplit(".", 1)[-1])
    if not url: return None
    try:
        urllib.request.urlopen(urllib.request.Request(url, headers={"Accept": "application/rdap+json"}), timeout=20); return False
    except urllib.error.HTTPError as e:
        return True if e.code == 404 else None
    except Exception:
        return None

# 1. Trois photos simples du client (doublure)
PHOTO = ("Photo prise au téléphone par la créatrice d'une petite marque d'accessoires pour chiens, pour montrer son produit : {p}, "
         "posé à plat sur une table en bois clair, près d'une fenêtre, lumière du jour. Photo simple et ordinaire, cadrage centré, "
         "produit entier et bien visible. Aucun chien, aucune personne, aucun texte, aucun logo.")
PRODUITS = {"harnais": "un harnais pour chien en sangle souple couleur corail, avec deux boucles noires et un anneau métallique doré",
            "laisse": "une laisse pour chien en corde tressée vert sapin, avec une poignée et un mousqueton doré",
            "collier": "un collier pour chien en cuir couleur camel, avec une boucle et un anneau dorés"}
photos = []
for k, p in PRODUITS.items():
    photos.append(generer(os.path.join(D, "photos-client", k), PHOTO.format(p=p), "medium", "1024x1024"))

# 2. Les trois logos (consigne de SINA, mot pour mot, avec la ligne d'évolution)
CONSIGNE = f"""Tu es la directrice artistique d'un studio de création de marques. Le client {NOM} ({METIER}) a choisi
l'esquisse de logo jointe parmi les esquisses proposées. Tu écris le texte qui sera envoyé tel quel à un modèle d'image pour transformer
cette esquisse en logo fini. Ce texte, en français :
- commence par « Transforme cette esquisse en véritable logo contemporain pour {NOM}, {METIER}. » ;
- nomme précisément l'idée centrale de l'esquisse, celle qui la distingue, et demande de la conserver ;
- demande de faire évoluer cette idée vers une identité plus aboutie et plus distinctive, jamais de seulement nettoyer ou agrandir l'esquisse ;
- demande d'améliorer fortement le dessin : lettres plus soignées et plus distinctives, proportions, espacement,
  équilibre visuel et présence de marque, en restant très lisible ;
- demande de simplifier ce qui fait trop illustration pour que le signe reste graphique ;
- donne une direction de palette adaptée au métier et à l'esquisse ;
- finit par : style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste,
  pas de dégradé excessif ;
- garde une ligne descriptive discrète seulement si elle dit exactement le métier du client ; toute autre phrase est retirée.
N'ajoute aucune idée qui n'est pas dans l'esquisse. Dix phrases au plus.
Réponds uniquement en JSON : {{"idee_centrale": "…", "texte": "…"}}"""
logos = []
for n in (4, 6, 8):
    esq = os.path.join(D, "esquisses", f"esquisse-{n}.png")
    t = astra(f"logo-{n}-texte", CONSIGNE, "Voici l'esquisse choisie.", [esq])
    open(os.path.join(D, "logos", f"logo-{n}-texte-envoye.txt"), "w").write(t["texte"] + "\n")
    logos.append(retoucher(os.path.join(D, "logos", f"logo-{n}"), t["texte"], [esq], "auto"))

# 3. Les trois planches complètes
PLANCHE = f"""Tu es la directrice artistique d'un studio de création de marques, au niveau des meilleures agences. Tu prépares
trois planches d'identité visuelle complètes pour {NOM}, {METIER}. Chaque planche est construite autour d'UN des trois logos
finis joints (planche 1 : premier logo, planche 2 : deuxième, planche 3 : troisième) ; chacune a son propre univers, très
différent des deux autres (ambiance, couleurs de fond, typographies, mise en page). Les trois dernières images jointes sont
les photos des vrais produits du client : un harnais, une laisse et un collier.

Pour chaque planche, tu écris le contenu, puis la consigne complète de l'image, en français, envoyée telle quelle à un
modèle d'image qui recevra : image 1 = le logo de cette planche, images 2, 3 et 4 = les photos du harnais, de la laisse et du collier.
La planche, au format portrait, contient, bien rangé en blocs titrés :
- un titre : « {NOM} — Planche d'identité visuelle » et le nom du concept ;
- le système de logo : logo principal, version compacte, version empilée, monochrome, version inversée (claire sur fond
  sombre) et icône ou favicon, tous tirés du logo de l'image 1, que le modèle reproduit fidèlement sans jamais le redessiner ;
- la palette (4 couleurs avec leur code hexadécimal, tirées du logo) et deux typographies réelles (titres, texte) ;
- le ton : une phrase d'accroche qui fait ressentir quelque chose, et trois valeurs avec une icône ;
- le référencement et les mentions : titre pour Google, description pour Google, domaine « {{DOMAINE}} — disponible »,
  et « © 2026 {NOM}. Tous droits réservés. » ;
- trois publications pour les réseaux, aux formats carré 1:1, portrait 4:5 et story 9:16 : chacune une vraie scène
  photographique magnifique, lumière travaillée, avec un chien qui porte ou utilise les vrais produits du client tels
  qu'ils sont sur les photos (mêmes couleurs, mêmes formes), un texte court en français posé sur la partie calme de
  l'image, et le logo ;
- l'aperçu du site e-commerce sur ordinateur et sur téléphone : une grande photo d'ouverture avec le vrai produit porté
  par un chien et le titre dessus, puis les trois produits présentés en cartes ;
- un bloc de supports de marque (emballage, étiquette) avec le logo.
Règles absolues : tout le texte en français, sans faute, court et lisible ; aucune personne ; aucun prix, aucune note,
aucun avis, aucune promesse de livraison ou de retour ; jamais un produit qui n'est pas sur les photos ; le logo n'est
jamais déformé ni redessiné ; une planche riche et soignée, au niveau d'une agence haut de gamme.
Pour chaque planche, propose aussi quatre noms de domaine courts en .fr ou .com, sans tiret si possible.
Réponds uniquement en JSON :
{{"planches": [{{"concept": "…", "domaines": ["…", "…", "…", "…"], "consigne_image": "… (avec {{DOMAINE}} à l'endroit du domaine)"}}, …3]}}"""
spec = astra("planches-contenu", PLANCHE, "Voici les trois logos finis, puis les trois photos produits.", logos + photos)
for i, (pl, logo) in enumerate(zip(spec["planches"], logos), 1):
    choix, verifs = None, {}
    for d in pl.get("domaines", []):
        v = domaine_libre(d); verifs[d] = v
        if v is True and not choix: choix = d
    note(etape=f"planche-{i}-domaines", verifications={k: ("libre" if v else "pris" if v is False else "inconnu") for k, v in verifs.items()}, retenu=choix)
    consigne = pl["consigne_image"].replace("{DOMAINE}", choix or "[À compléter : domaine]")
    open(os.path.join(D, "planches", f"planche-{i}-consigne.txt"), "w").write(f"Concept : {pl['concept']}\n\n{consigne}\n")
    retoucher(os.path.join(D, "planches", f"planche-{i}"), consigne, [logo] + photos, "1024x1536")
print("TOTAL", round(total, 4), "€")
