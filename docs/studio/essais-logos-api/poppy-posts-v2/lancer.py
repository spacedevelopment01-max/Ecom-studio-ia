"""Poppy : trois publications indépendantes, méthode naturelle (24 novembre 2026), hors de SINA.
Même configuration API que l'essai précédent (GPT Image 2.5 Sunburst, /v1/images/edits, high, opaque, png, n 1).
Seule référence : le logo officiel. Aucune planche, aucune photo (Poppy n'a pas de vraie photo produit). Aucune reprise.
Tailles demandées : multiples de 16 les plus proches, puis recadrage central au format final exact, sans déformation."""
import base64, io, json, os, sys, time, uuid, urllib.request, urllib.error
from PIL import Image
D = sys.argv[1]; EUR, PLAFOND = 0.86, 0.20
IDENTITE = ("Identité Poppy à conserver : palette vert forêt #1E3A32, sauge #8CA695, terracotta #D17F6F, sable #ECDECE, nuage #F8F5EE ; "
            "typographies Poppins et Nunito ; ton chaleureux et complice.")
COMMUN = ("Le logo de l'image jointe signe la publication sans monopoliser l'image ; ne le redessine pas. "
          "Un sujet principal, une accroche forte, une hiérarchie visuelle claire. Pas d'accumulation de slogans, de pictogrammes, de blocs de réassurance ni de textes secondaires. "
          "N'invente aucune caractéristique technique, garantie, certification ou performance produit. Textes en français.")
POSTS = {
 "publication-1-emotion": ((1080, 1080), "1088x1088",
   "Crée une publication pour les réseaux sociaux de Poppy, une marque de harnais, laisses et colliers pour chiens. Format carré 1080 × 1080. "
   "Accroche, écrite exactement : « Pour toi, c'est une balade. Pour lui, c'est le meilleur moment de sa journée. » "
   "Crée une scène humaine, naturelle et touchante. L'objectif est de provoquer une véritable émotion chez les propriétaires de chiens. "
   "Tu es libre de choisir la composition, le décor et le traitement graphique."),
 "publication-2-produit": ((1080, 1350), "1088x1360",
   "Crée une publication pour les réseaux sociaux de Poppy, une marque de harnais, laisses et colliers pour chiens. Format portrait 1080 × 1350. "
   "Accroche, écrite exactement : « Le style au bout de la laisse. » "
   "Crée une véritable campagne produit contemporaine pour les accessoires Poppy : une composition audacieuse, un travail graphique recherché et une mise en valeur désirable des produits."),
 "publication-3-humour": ((1080, 1920), "1088x1936",
   "Crée une publication pour les réseaux sociaux de Poppy, une marque de harnais, laisses et colliers pour chiens. Format story 1080 × 1920. "
   "Accroche, écrite exactement : « POV : tu viens de prononcer le mot balade. » "
   "Crée une situation drôle et immédiatement reconnaissable par les propriétaires de chiens. Le contenu doit donner envie de l'envoyer à un ami ou de le partager. "
   "Ce n'est pas une publicité produit traditionnelle."),
}
LOGO = os.path.join(D, "../planches-poppy-v2/logo-poppy.png")
total, bilans = 0.0, []
for nom, ((W, H), size, texte) in POSTS.items():
    if total + 0.07 > PLAFOND: print("ARRÊT plafond"); break
    prompt = f"{texte} {IDENTITE} {COMMUN}"
    champs = {"model": "gpt-image-2.5-sunburst", "prompt": prompt, "quality": "high", "size": size, "background": "opaque", "output_format": "png", "n": "1"}
    json.dump({"endpoint": "POST https://api.openai.com/v1/images/edits (multipart)", "champs": champs, "image[]": ["logo-poppy.png"], "format_final": f"{W}x{H}"}, open(os.path.join(D, nom + "-requete.json"), "w"), ensure_ascii=False, indent=1)
    if "--verifier" in sys.argv: print(nom, "construit"); continue
    b = uuid.uuid4().hex; m = [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in champs.items()]
    m.append(f'--{b}\r\nContent-Disposition: form-data; name="image[]"; filename="logo-poppy.png"\r\nContent-Type: image/png\r\n\r\n'.encode() + open(LOGO, "rb").read() + b"\r\n")
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
    json.dump(lis if rep else {"brut": tx}, open(os.path.join(D, nom + "-reponse-complete.json"), "w"), ensure_ascii=False, indent=1)
    bl = {"publication": nom, "statut_http": st, "duree_s": du, "x-request-id": ent.get("X-Request-Id") or ent.get("x-request-id")}
    if st == 200 and rep.get("data"):
        brut = base64.b64decode(rep["data"][0]["b64_json"]); open(os.path.join(D, nom + "-brute.png"), "wb").write(brut)
        im = Image.open(io.BytesIO(brut)); w, h = im.size
        # Recadrage central au format final exact (aucun agrandissement, aucune déformation).
        if w >= W and h >= H:
            l, t = (w - W) // 2, (h - H) // 2; fin = im.crop((l, t, l + W, t + H))
        else:
            fin = None
        if fin: fin.save(os.path.join(D, nom + ".png"))
        u = rep.get("usage") or {}; det = u.get("input_tokens_details") or {}
        c = (det.get("text_tokens", 0) * 5e-6 + det.get("image_tokens", 0) * 8e-6 + u.get("output_tokens", 0) * 30e-6) * EUR; total += c
        bl.update({"usage": u, "cout_eur": round(c, 4), "taille_recue": f"{w}x{h}", "taille_finale": f"{fin.size[0]}x{fin.size[1]}" if fin else "trop petite, non recadrée"})
    else:
        bl["erreur"] = tx[:800]
    bilans.append(bl); json.dump({"total_eur": round(total, 4), "publications": bilans}, open(os.path.join(D, "bilan.json"), "w"), ensure_ascii=False, indent=1)
    print(nom, st, du, "s", bl.get("cout_eur"), "€", bl.get("taille_recue"), "->", bl.get("taille_finale"), "total", round(total, 3))
    if st != 200: print("arrêt après erreur"); break
