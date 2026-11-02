"""Fichier SRT des sous-titres (mêmes groupes et même calage que les sous-titres intégrés de film/index.html).
Texte exact du script ; horodatage de chaque mot issu de la transcription (plan.json). Usage : python3 sous_titres.py [sortie.srt]"""
import json, os, sys
R = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(f"{R}/plan.json"))
TXT = {
    "p1": [["Je","vais","te","montrer","comment","j'évite"], ["de","passer","mes","soirées","sur","ma","com'."]],
    "p2a": [["Moi,","c'est","Arthur !"], ["Abonne-toi","là,"]], "p2b": [["mets","un","cœur","ici…"]], "p2c": [["viens !"]],
    "p3": [["Ça","y","est !"], ["Chantier","terminé."], ["Je","rentre !"]],
    "p4a": [["Oh","non…",None]], "p4b": [["Le","site,","les","photos…"], ["et","la","publication","de","demain."]],
    "p5a": [["Un","mur","nickel ?",None,"Facile."]], "p5b": [["Une","publication","nickel ?",None], ["Je","prends","quel","rouleau,","moi ?"]],
    "p6": [["Et","toi,","tu","fais","quoi","comme","métier ?",None], ["Dis-moi","juste","là !"]],
    "p7a": [["Bon,","regarde."]], "p7b": [["Avec","E-COM","STUDIO","IA,"], ["je","présente","mes","chantiers","sur","mon","site"], ["et","je","prépare","mes","publications"], ["au","même","endroit."]],
    "p8a": [["Syna,","mets","les","photos"], ["avant-après",None,"en","premier."]], "p8b": [["Ah,","là,","c'est","mieux !"]],
    "p9": [["Allez…","cette","fois,"], ["je","rentre.","Promis !"]],
}
cues = []
for k, groups in TXT.items():
    i = 0
    for g in groups:
        ws = []
        for w in g:
            m = P["mots"][k][i]; i += 1
            if w is None: ws[-1]["f"] = m["f"]; continue
            ws.append({"w": w, "t": m["t"], "f": m["f"]})
        cues.append({"txt": " ".join(x["w"] for x in ws), "t": ws[0]["t"] - .08, "f": ws[-1]["f"]})
cues.sort(key=lambda c: c["t"])
for j, c in enumerate(cues):
    last = c["f"] + .45
    c["e"] = min(last, cues[j + 1]["t"]) if j + 1 < len(cues) else last
def ts(x):
    ms = int(round(x * 1000)); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
out = sys.argv[1] if len(sys.argv) > 1 else f"{R}/sous-titres.srt"
with open(out, "w", encoding="utf-8") as f:
    for j, c in enumerate(cues, 1):
        f.write(f"{j}\n{ts(c['t'])} --> {ts(c['e'])}\n{c['txt']}\n\n")
print(out, len(cues), "sous-titres")
