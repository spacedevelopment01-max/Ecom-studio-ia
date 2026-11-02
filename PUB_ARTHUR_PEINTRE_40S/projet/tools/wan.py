"""Client Alibaba Model Studio (DashScope international) pour Wan image -> vidéo. La clé n'est jamais lue : le proxy l'injecte.
Usage : wan.py <requete.json> <dossier_sortie> <cout_estime_usd> <libelle>
- Aucune relance automatique : en cas d'échec, on affiche et on s'arrête.
- Chaque appel est noté dans ../depenses.csv (coût estimé d'après les tarifs publics relevés, non confirmés par Alibaba)."""
import sys, json, time, os, urllib.request, urllib.error, datetime
reqf, outd, est, label = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
os.makedirs(outd, exist_ok=True)
H = {"Authorization": "Bearer injecte-par-le-proxy", "Content-Type": "application/json"}
BASE = "https://dashscope-intl.aliyuncs.com/api/v1"
ledger = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "depenses.csv")
def call(url, data=None, extra=None):
    h = dict(H, **(extra or {}))
    r = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None, headers=h, method="POST" if data is not None else "GET")
    try:
        with urllib.request.urlopen(r, timeout=120) as f: return f.status, json.loads(f.read() or b"{}")
    except urllib.error.HTTPError as e:
        t = e.read()
        try: return e.code, json.loads(t)
        except Exception: return e.code, {"raw": t[:300].decode(errors="replace")}
def note(rid, status, cost):
    with open(ledger, "a") as f:
        f.write(f"{datetime.datetime.now().isoformat(timespec='seconds')};alibaba;{body['model']};{label};{rid};{status};{cost:.3f}\n")
body = json.load(open(reqf))
t0 = time.time()
c, j = call(f"{BASE}/services/aigc/video-generation/video-synthesis", body, {"X-DashScope-Async": "enable"})
tid = j.get("output", {}).get("task_id")
if not tid:
    print("refus", c, j); note("-", f"refus {c}", 0.0); sys.exit(1)
print("envoyé", tid, flush=True)
while True:
    time.sleep(8)
    c, s = call(f"{BASE}/tasks/{tid}")
    st = s.get("output", {}).get("task_status")
    if st in ("SUCCEEDED", "FAILED", "CANCELED", "UNKNOWN"): break
json.dump(s, open(os.path.join(outd, "reponse.json"), "w"), ensure_ascii=False, indent=1)
if st != "SUCCEEDED":
    print("échec", st, s.get("output", {}).get("code"), s.get("output", {}).get("message")); note(tid, f"échec {st}", 0.0); sys.exit(1)
url = s["output"]["video_url"]
urllib.request.urlretrieve(url, os.path.join(outd, "sortie-1.mp4"))
note(tid, "ok", est)
print(f"reçu {outd}/sortie-1.mp4 | usage {json.dumps(s.get('usage'))} | terminé en {time.time() - t0:.0f} s | coût estimé {est:.3f} $")
