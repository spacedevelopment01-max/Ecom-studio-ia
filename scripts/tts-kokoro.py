"""
Voix de synthèse « Kokoro » (modèle ouvert, licence Apache 2.0) pour les tutoriels : bien plus naturelle que Piper.
Lit le texte sur l'entrée standard et écrit un fichier WAV. Utilisé par scripts/narrate-tutorials.ts.

  pip install sherpa-onnx soundfile numpy
  echo "Bonjour" | python3 scripts/tts-kokoro.py --model-dir …/kokoro-multi-lang-v1_0 --voice ff_siwis:0.4,am_michael:0.6 --lang fr --out a.wav

Modèle : https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_0.tar.bz2
--voice : une voix du modèle, ou un mélange pondéré de voix (« nom:poids,nom:poids »). Le mélange garde la
prononciation française de la voix française et prend le timbre (grave) de la voix d'homme.
"""
import argparse, os, sys, tempfile, shutil
import numpy as np
import soundfile as sf
import sherpa_onnx

p = argparse.ArgumentParser()
p.add_argument("--model-dir", required=True)
p.add_argument("--voice", required=True)
p.add_argument("--lang", default="fr")
p.add_argument("--speed", type=float, default=1.0)
p.add_argument("--out", required=True)
a = p.parse_args()
d = a.model_dir.rstrip("/") + "/"

# Noms des voix (dans l'ordre du fichier voices.bin du modèle sherpa-onnx Kokoro v1.0).
NAMES = "af_alloy,af_aoede,af_bella,af_heart,af_jessica,af_kore,af_nicole,af_nova,af_river,af_sarah,af_sky,am_adam,am_echo,am_eric,am_fenrir,am_liam,am_michael,am_onyx,am_puck,am_santa,bf_alice,bf_emma,bf_isabella,bf_lily,bm_daniel,bm_fable,bm_george,bm_lewis,ef_dora,em_alex,ff_siwis,hf_alpha,hf_beta,hm_omega,hm_psi,if_sara,im_nicola,jf_alpha,jf_gongitsune,jf_nezumi,jf_tebukuro,jm_kumo,pf_dora,pm_alex,pm_santa,zf_xiaobei,zf_xiaoni,zf_xiaoxiao,zf_xiaoyi,zm_yunjian,zm_yunxi,zm_yunxia,zm_yunyang,em_santa".split(",")
voices = np.fromfile(d + "voices.bin", dtype=np.float32).reshape(len(NAMES), 510, 256)
parts = [(n.split(":")[0], float(n.split(":")[1]) if ":" in n else 1.0) for n in a.voice.split(",")]
total = sum(w for _, w in parts)
style = sum(w / total * voices[NAMES.index(n)] for n, w in parts)

# Le mélange remplace la voix 0 dans une copie de voices.bin (le modèle lit les voix par numéro).
tmp = tempfile.mkdtemp(prefix="kokoro-")
try:
    mixed = voices.copy()
    mixed[0] = style
    mixed.tofile(os.path.join(tmp, "voices.bin"))
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=d + "model.onnx", voices=os.path.join(tmp, "voices.bin"), tokens=d + "tokens.txt",
                data_dir=d + "espeak-ng-data", dict_dir=d + "dict", lexicon=d + "lexicon-us-en.txt", lang=a.lang,
            ),
            num_threads=4,
        )
    )
    tts = sherpa_onnx.OfflineTts(cfg)
    audio = tts.generate(sys.stdin.read().strip(), sid=0, speed=a.speed)
    sf.write(a.out, np.array(audio.samples, dtype=np.float32), audio.sample_rate)
finally:
    shutil.rmtree(tmp, ignore_errors=True)
