"""Plan de montage des 46 s qui suivent les 14 s validées (temps local 0 = 14,0 s du film).
SEGMENTS : (id, plan Kling, début source, fin source, vitesse). Les temps locaux en découlent.
VOIX : (réplique, mot repère, plan, temps source du plan où doit tomber ce mot) -> décalage de la réplique."""
import json, os
SEGMENTS = [
  ("A1", "A", 0.00, 2.00, 1.8), ("A2", "A", 2.00, 3.90, 1.0), ("B", "B", 0.00, 3.04, 1.0), ("C", "C", 0.55, 3.04, 1.6),
  ("D", "D", 0.00, 4.04, 1.0), ("F", "F", 1.00, 3.90, 1.0),
  ("G", "G", 0.60, 3.04, 1.8), ("H", "H", 0.00, 1.85, 1.0), ("I", "I", 0.35, 3.45, 1.0),
  ("J1", "J", 0.00, 1.45, 1.0), ("J2", "J", 1.95, 2.75, 1.6), ("K", "K", 0.30, 2.10, 1.0), ("L", "L", 0.00, 2.85, 1.0),
  ("M", "M", 2.25, 3.80, 1.0), ("N", "N", 0.00, 3.04, 1.0), ("O1", "O", 0.00, 0.55, 1.0), ("O2", "O", 0.95, 4.04, 1.15),
  ("P1", "P", 0.60, 3.40, 1.25), ("P2", "P", 3.40, 5.04, 1.0), ("Q", "Q", 0.55, 3.70, 1.3),
  ("R", "R", 0.85, 2.35, 1.0), ("S", "S", 1.05, 4.04, 1.0),
]
FIN_TENUE = 0.45   # tenue de la dernière image (lecture de la signature)
VOIX = [  # (réplique, indice du mot repère dans l'alignement, segment, temps source)
  ("s2", "J'allais", "A2", 2.00), ("s3", "et", "D", 3.20), ("s4", "Mon", "G", 1.40), ("s5", "ça", "L", 2.15),
  ("s6", "Attends…", "M", 2.35), ("s7", "Studio", "P2", 4.60), ("s8", "E-COM", "R", 1.70),
]
def construire():
    segs, t = [], 0.0
    for sid, shot, a, b, sp in SEGMENTS:
        d = (b - a) / sp; segs.append({"id": sid, "plan": shot, "src_in": a, "src_out": b, "vitesse": sp, "debut": round(t, 4), "fin": round(t + d, 4)}); t += d
    total = t + FIN_TENUE
    def local(sid, ts):
        s = next(x for x in segs if x["id"] == sid); return s["debut"] + (ts - s["src_in"]) / s["vitesse"]
    voix = []
    for line, mot, sid, ts in VOIX:
        fa = json.load(open(f"../audio/voix/alignement-{line}.json")); W = [w for w in fa["words"] if w["text"].strip()]
        w0 = next(w for w in W if w["text"].startswith(mot)); off = local(sid, ts) - w0["start"]
        voix.append({"replique": line, "decalage": round(off, 4), "debut": round(off + W[0]["start"], 3), "fin": round(off + W[-1]["end"], 3),
                     "mots": [{"mot": w["text"], "debut": round(off + w["start"], 3), "fin": round(off + w["end"], 3)} for w in W]})
    return {"segments": segs, "voix": voix, "duree": round(total, 3)}
if __name__ == "__main__":
    p = construire(); json.dump(p, open("montage/plan.json", "w"), ensure_ascii=False, indent=1)
    for s in p["segments"]: print(f"{s['id']:3s} {s['debut']:6.2f}-{s['fin']:6.2f}  {s['plan']} {s['src_in']:.2f}->{s['src_out']:.2f} ×{s['vitesse']}")
    for v in p["voix"]: print(f"{v['replique']} {v['debut']:6.2f}-{v['fin']:6.2f}  " + " ".join(f"{w['mot']}@{w['debut']:.2f}" for w in v["mots"]))
    print("durée locale", p["duree"], "s -> film total", round(14 + p["duree"], 2), "s")
