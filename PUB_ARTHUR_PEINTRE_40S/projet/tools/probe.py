# Sonde GRATUITE d'un modèle fal : envoie un corps sans champ obligatoire (refusé à la validation, 422, non facturé)
# et des valeurs invalides pour faire lister les valeurs permises. Usage: probe.py <endpoint> '<json>'
import sys, json, time, urllib.request
ep, body = sys.argv[1], json.loads(sys.argv[2])
H = {"Authorization": "Key injecte-par-le-proxy", "Content-Type": "application/json"}
def req(url, data=None, method="GET"):
    r = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None, headers=H, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as f: return f.status, json.loads(f.read())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b"{}")
c, j = req("https://queue.fal.run/" + ep, body, "POST")
if "status_url" not in j: print(c, j); sys.exit()
for _ in range(30):
    c, s = req(j["status_url"])
    if s.get("status") == "COMPLETED": break
    time.sleep(1)
c, out = req(j["response_url"])
for d in out.get("detail", [out]):
    if isinstance(d, dict): print("-", ".".join(map(str, d.get("loc", [])[1:])), "|", d.get("type"), "|", d.get("msg"), "|", json.dumps(d.get("ctx", ""))[:300])
    else: print(d)
