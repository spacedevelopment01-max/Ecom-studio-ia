"""Racine : planche complète en xhigh, disposition de la variante 2 de Poppy (24 novembre 2026), hors de SINA. Même configuration que la V2 :
GPT Image 2.5 Sunburst, /v1/images/edits, high, 1536x2304, opaque, png, n 1 ; une seule image jointe : le logo. Aucune reprise. Arrêt à 0,20 €."""
import base64, json, os, sys, time, uuid, urllib.request, urllib.error
D = sys.argv[1]; EUR, PLAFOND = 0.86, 0.30
PROMPT = open(os.path.join(D, sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "prompt.txt")).read()
VARIANTES = {"planche-racine-xhigh": ["logo-racine.png", "disposition-variante-2.png"]}
if "--variantes" in sys.argv: VARIANTES = {"planche-racine-feuille-sur-le-i-xhigh": ["logo-racine-feuille-sur-le-i.png", "disposition-variante-2.png"], "planche-racine-r-bordeaux-xhigh": ["logo-racine-r-bordeaux.png", "disposition-variante-2.png"]}
total = 0.0
for nom, logo in VARIANTES.items():
    if total + (0.15 if "--xhigh" in sys.argv else 0.09) > PLAFOND: print("ARRÊT plafond"); break
    champs = {"model": "gpt-image-2.5-sunburst", "prompt": PROMPT, "quality": "xhigh" if "--xhigh" in sys.argv else "high", "size": "1536x2304", "background": "opaque", "output_format": "png", "n": "1"}
    json.dump({"endpoint": "POST https://api.openai.com/v1/images/edits (multipart)", "champs": champs, "image[]": logo}, open(os.path.join(D, nom + "-requete.json"), "w"), ensure_ascii=False, indent=1)
    if "--verifier" in sys.argv: print(nom, "construit"); continue
    b = uuid.uuid4().hex; m = [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in champs.items()]
    for f in logo: m.append(f'--{b}\r\nContent-Disposition: form-data; name="image[]"; filename="{f}"\r\nContent-Type: image/png\r\n\r\n'.encode() + open(os.path.join(D, f), "rb").read() + b"\r\n")
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
    bl = {"variante": nom, "statut_http": st, "duree_s": du, "x-request-id": ent.get("X-Request-Id") or ent.get("x-request-id")}
    if st == 200 and rep.get("data"):
        open(os.path.join(D, nom + ".png"), "wb").write(base64.b64decode(rep["data"][0]["b64_json"]))
        u = rep.get("usage") or {}; det = u.get("input_tokens_details") or {}
        c = (det.get("text_tokens", 0) * 5e-6 + det.get("image_tokens", 0) * 8e-6 + u.get("output_tokens", 0) * 30e-6) * EUR; total += c
        bl.update({"usage": u, "cout_eur": round(c, 4), "taille": rep.get("size")})
    else:
        bl["erreur"] = tx[:800]
    json.dump(bl, open(os.path.join(D, nom + "-bilan.json"), "w"), ensure_ascii=False, indent=1)
    print(nom, st, du, "s", bl.get("cout_eur"), "€ total", round(total, 3))
    if st != 200: print("arrêt après erreur"); break
