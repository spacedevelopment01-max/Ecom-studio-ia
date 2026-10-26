"""
Contrôle de la voix off : chaque phrase est retranscrite par Whisper (modèle « small » de sherpa-onnx, local, gratuit)
et comparée au texte attendu. Écrit narration/verification-voix.txt.
  python3 scripts/verifier-voix.py --whisper-dir …/sherpa-onnx-whisper-small [fichier.wav …]
"""
import argparse, json, os, sys
import soundfile as sf, numpy as np, sherpa_onnx
ICI = os.path.dirname(os.path.abspath(__file__)); PROJET = os.path.dirname(ICI)
p = argparse.ArgumentParser(); p.add_argument("--whisper-dir", required=True); p.add_argument("fichiers", nargs="*"); a = p.parse_args()
w = a.whisper_dir.rstrip("/") + "/"
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=w + "small-encoder.int8.onnx", decoder=w + "small-decoder.int8.onnx", tokens=w + "small-tokens.txt", language="fr", task="transcribe", num_threads=4)
def lire(f):
    x, sr = sf.read(f, dtype="float32")
    if x.ndim > 1: x = x.mean(1)
    # 0,5 s de silence autour : sans lui, Whisper perd souvent le dernier mot d'un extrait très court.
    x = np.concatenate([np.zeros(sr // 2, np.float32), x.astype(np.float32), np.zeros(sr // 2, np.float32)])
    s = rec.create_stream(); s.accept_waveform(sr, x); rec.decode_stream(s); return s.result.text.strip()
if a.fichiers:
    for f in a.fichiers: print(f, "→", lire(f))
    sys.exit()
ph = json.load(open(os.path.join(PROJET, "narration", "phrases.json")))["phrases"]
lignes = []
for p_ in ph:
    t = lire(os.path.join(PROJET, p_["fichier"]))
    lignes.append(f"{p_['id']}\n  attendu : {p_['texte']}\n  entendu : {t}")
    print(lignes[-1])
open(os.path.join(PROJET, "narration", "verification-voix.txt"), "w").write("Transcription automatique (Whisper small, local) de chaque phrase de la voix off.\n\n" + "\n".join(lignes) + "\n")
