"""Client fal.ai minimal (file d'attente). La clé n'est jamais lue : le proxy l'injecte.
Usage : fal.py <endpoint> <requete.json> <dossier_sortie> <cout_estime_usd> <libelle>
- Les valeurs "@fichier:chemin" sont remplacées par une URL de données (data URI).
- Aucune relance automatique : en cas d'échec (5xx, FAILED), on affiche et on s'arrête.
- Chaque appel est noté dans ../depenses.csv (coût estimé d'après les tarifs publics)."""
import sys, json, time, base64, mimetypes, os, urllib.request, urllib.error, datetime, re
ep, reqf, outd, est, label = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5]
os.makedirs(outd, exist_ok=True)
H = {"Authorization": "Key injecte-par-le-proxy", "Content-Type": "application/json"}
def datauri(p):
    m = mimetypes.guess_type(p)[0] or "application/octet-stream"
    return f"data:{m};base64," + base64.b64encode(open(p, "rb").read()).decode()
def sub(v):
    if isinstance(v, str) and v.startswith("@fichier:"): return datauri(v[9:])
    if isinstance(v, list): return [sub(x) for x in v]
    if isinstance(v, dict): return {k: sub(x) for k, x in v.items()}
    return v
body = sub(json.load(open(reqf)))
def call(url, data=None, method="GET"):
    r = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None, headers=H, method=method)
    try:
        with urllib.request.urlopen(r, timeout=120) as f: return f.status, json.loads(f.read() or b"{}")
    except urllib.error.HTTPError as e:
        t = e.read(); 
        try: return e.code, json.loads(t)
        except Exception: return e.code, {"raw": t[:500].decode(errors="replace")}
ledger = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "depenses.csv")
def log(rid, status, cost):
    new = not os.path.exists(ledger)
    with open(ledger, "a") as f:
        if new: f.write("date;service;modele;libelle;identifiant_requete;statut;cout_estime_usd\n")
        f.write(f"{datetime.datetime.now().isoformat(timespec='seconds')};fal.ai;{ep};{label};{rid};{status};{cost:.3f}\n")
c, j = call("https://queue.fal.run/" + ep, body, "POST")
if "status_url" not in j: print("REFUSÉ À L'ENVOI", c, json.dumps(j)[:800]); log("-", f"refus {c}", 0); sys.exit(1)
rid = j["request_id"]; print("envoyé", rid); t0 = time.time()
while True:
    c, s = call(j["status_url"] + "?logs=0")
    st = s.get("status")
    if st == "COMPLETED": break
    if c >= 500 or st not in ("IN_QUEUE", "IN_PROGRESS"):
        print("ÉTAT INATTENDU", c, json.dumps(s)[:500]); log(rid, f"etat {c} {st}", est); sys.exit(2)
    if time.time() - t0 > 1500: print("TROP LONG — requête laissée en file, identifiant", rid); log(rid, "attente", est); sys.exit(3)
    time.sleep(4)
c, out = call(j["response_url"])
json.dump(out, open(os.path.join(outd, "reponse.json"), "w"), ensure_ascii=False, indent=1)
if c >= 400 or "detail" in out:
    print("ÉCHEC", c, json.dumps(out)[:800]); log(rid, f"echec {c}", 0 if c in (400, 422) else est); sys.exit(4)
urls = re.findall(r'"url": "([^"]+)"', json.dumps(out))
for i, u in enumerate(urls):
    ext = os.path.splitext(u.split("?")[0])[1] or ".bin"
    if u.startswith("data:"):
        ext = "." + u.split(";")[0].split("/")[-1]; data = base64.b64decode(u.split(",", 1)[1])
    else:
        data = urllib.request.urlopen(u, timeout=300).read()
    p = os.path.join(outd, f"sortie-{i+1}{ext}"); open(p, "wb").write(data); print("reçu", p, len(data) // 1024, "Ko")
log(rid, "ok", est); print(f"terminé en {time.time()-t0:.0f} s | coût estimé {est:.3f} $")
