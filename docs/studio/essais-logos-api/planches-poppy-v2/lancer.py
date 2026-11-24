"""Poppy — Planche d'identité visuelle V2 (24 novembre 2026), hors de SINA. Une seule image, aucune reprise.
GPT Image 2.5 Sunburst, /v1/images/edits, high, 1536x2304, opaque, png ; images : logo validé, planche de l'essai A2."""
import base64, json, os, sys, time, uuid, urllib.request, urllib.error
D = sys.argv[1]
champs = {"model": "gpt-image-2.5-sunburst", "prompt": open(os.path.join(D, "prompt.txt")).read(), "quality": "high", "size": "1536x2304", "background": "opaque", "output_format": "png", "n": "1"}
images = [os.path.join(D, "logo-poppy.png"), os.path.join(D, "planche-essai-A2.png")]
json.dump({"endpoint": "POST https://api.openai.com/v1/images/edits (multipart)", "champs": champs, "image[]": [os.path.basename(f) for f in images]}, open(os.path.join(D, "requete.json"), "w"), ensure_ascii=False, indent=1)
if "--verifier" in sys.argv: print("requête construite, rien envoyé"); sys.exit()
b = uuid.uuid4().hex; m = [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in champs.items()]
for f in images: m.append(f'--{b}\r\nContent-Disposition: form-data; name="image[]"; filename="{os.path.basename(f)}"\r\nContent-Type: image/png\r\n\r\n'.encode() + open(f, "rb").read() + b"\r\n")
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
json.dump(lis if rep else {"brut": tx}, open(os.path.join(D, "reponse-complete.json"), "w"), ensure_ascii=False, indent=1)
bilan = {"statut_http": st, "duree_s": du, "x-request-id": ent.get("X-Request-Id") or ent.get("x-request-id")}
if st == 200 and rep.get("data"):
    open(os.path.join(D, "planche-v2-brute.png"), "wb").write(base64.b64decode(rep["data"][0]["b64_json"]))
    u = rep.get("usage") or {}; det = u.get("input_tokens_details") or {}
    bilan.update({"usage": u, "cout_eur": round((det.get("text_tokens", 0) * 5e-6 + det.get("image_tokens", 0) * 8e-6 + u.get("output_tokens", 0) * 30e-6) * 0.86, 4), "taille": rep.get("size"), "qualite": rep.get("quality")})
else:
    bilan["erreur"] = tx[:800]
json.dump(bilan, open(os.path.join(D, "bilan.json"), "w"), ensure_ascii=False, indent=1)
print(json.dumps({k: bilan.get(k) for k in ("statut_http", "duree_s", "cout_eur", "taille", "erreur")}, ensure_ascii=False))
