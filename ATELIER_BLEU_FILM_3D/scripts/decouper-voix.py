"""
Voix fournie (un seul fichier, toutes les phrases dans l'ordre du texte) → narration/phrases.json et audio/phrases/*.wav,
pour que le montage suive sa durée réelle. Les phrases sont séparées aux 12 plus longues pauses (laisser au moins
0,4 s de silence entre deux phrases à l'enregistrement). L'instant des mots-clés est estimé au prorata des lettres.
  python3 scripts/decouper-voix.py audio/voix-fournie.wav
  node scripts/planning.cjs        (puis relancer le rendu, voir LISEZMOI)
"""
import json, os, sys
import numpy as np, soundfile as sf
ICI = os.path.dirname(os.path.abspath(__file__)); PROJET = os.path.dirname(ICI)
sys.path.insert(0, ICI)
from phrases import PHRASES, couper_aux_pauses  # noqa: E402

x, sr = sf.read(sys.argv[1], dtype="float32")
if x.ndim > 1:
    x = x.mean(1)
morceaux = couper_aux_pauses(x, sr, len(PHRASES))
os.makedirs(os.path.join(PROJET, "audio", "phrases"), exist_ok=True)
res = []
for ph, m in zip(PHRASES, morceaux):
    env = np.abs(m) > 0.02 * np.abs(m).max()
    i0, i1 = np.argmax(env), len(m) - np.argmax(env[::-1])
    m = m[max(0, i0 - int(0.04 * sr)):min(len(m), i1 + int(0.12 * sr))]
    f = f"audio/phrases/{ph['id']}.wav"
    sf.write(os.path.join(PROJET, f), m, sr)
    d = len(m) / sr
    rep = {mot: round(0.05 + (d - 0.2) * ph["texte"].find(mot) / len(ph["texte"]), 3) for mot in ph["mots"]}
    res.append({"id": ph["id"], "texte": ph["texte"], "fichier": f, "duree": round(d, 3), "reperes": rep})
    print(f"{ph['id']}  {d:5.2f} s  {ph['texte']}")
json.dump({"source": f"voix fournie : {os.path.basename(sys.argv[1])}", "phrases": res},
          open(os.path.join(PROJET, "narration", "phrases.json"), "w"), ensure_ascii=False, indent=2)
