"""
Voix off du film ATELIER BLEU : une phrase du texte = un fichier WAV, puis les durées réelles de chaque phrase
(et les petites pauses à l'intérieur, aux virgules) dans narration/phrases.json. Ces durées pilotent le montage.

Voix « Kokoro » (modèle ouvert, licence Apache 2.0, sans service en ligne, gratuit) :
  pip install sherpa-onnx soundfile numpy
  python3 scripts/voix.py --model-dir …/kokoro-multi-lang-v1_0 [--voice ff_siwis] [--speed 0.94]

Avec une voix enregistrée ou générée ailleurs (fichier unique) : python3 scripts/decouper-voix.py audio/voix-fournie.wav
découpe le fichier en phrases et écrit le même narration/phrases.json (le montage suit alors sa durée réelle).
"""
import argparse, json, os, shutil, sys, tempfile
import numpy as np
import soundfile as sf
import sherpa_onnx

ICI = os.path.dirname(os.path.abspath(__file__))
PROJET = os.path.dirname(ICI)
sys.path.insert(0, ICI)
from phrases import PHRASES, GROUPES, prononcer, couper_aux_pauses  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument("--model-dir", required=True)
p.add_argument("--voice", default="ff_siwis")
p.add_argument("--speed", type=float, default=0.94)
p.add_argument("--only", default="")
a = p.parse_args()
d = a.model_dir.rstrip("/") + "/"

NAMES = "af_alloy,af_aoede,af_bella,af_heart,af_jessica,af_kore,af_nicole,af_nova,af_river,af_sarah,af_sky,am_adam,am_echo,am_eric,am_fenrir,am_liam,am_michael,am_onyx,am_puck,am_santa,bf_alice,bf_emma,bf_isabella,bf_lily,bm_daniel,bm_fable,bm_george,bm_lewis,ef_dora,em_alex,ff_siwis,hf_alpha,hf_beta,hm_omega,hm_psi,if_sara,im_nicola,jf_alpha,jf_gongitsune,jf_nezumi,jf_tebukuro,jm_kumo,pf_dora,pm_alex,pm_santa,zf_xiaobei,zf_xiaoni,zf_xiaoxiao,zf_xiaoyi,zm_yunjian,zm_yunxi,zm_yunxia,zm_yunyang,em_santa".split(",")
voices = np.fromfile(d + "voices.bin", dtype=np.float32).reshape(len(NAMES), 510, 256)
parts = [(n.split(":")[0], float(n.split(":")[1]) if ":" in n else 1.0) for n in a.voice.split(",")]
style = sum(w / sum(x for _, x in parts) * voices[NAMES.index(n)] for n, w in parts)

tmp = tempfile.mkdtemp(prefix="kokoro-")
mixed = voices.copy()
mixed[0] = style
mixed.tofile(os.path.join(tmp, "voices.bin"))
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
    kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
        model=d + "model.onnx", voices=os.path.join(tmp, "voices.bin"), tokens=d + "tokens.txt",
        data_dir=d + "espeak-ng-data", dict_dir=d + "dict", lexicon=d + "lexicon-us-en.txt", lang="fr"),
    num_threads=4)))

out_dir = os.path.join(PROJET, "audio", "phrases")
os.makedirs(out_dir, exist_ok=True)
SR_ = 24000


def rogner(x, sr, seuil=0.012, queue=0.12):
    """Retire le silence au début et à la fin (en gardant 40 ms d'attaque et 120 ms de queue)."""
    env = np.convolve(np.abs(x), np.ones(240) / 240, mode="same")
    idx = np.where(env > seuil)[0]
    if len(idx) == 0:
        return x
    a0, a1 = max(0, idx[0] - int(0.04 * sr)), min(len(x), idx[-1] + int(queue * sr))
    return x[a0:a1]


def _spectre(x, sr):
    """Log-spectre en 32 bandes, une trame toutes les 10 ms."""
    hop, n = int(sr * 0.01), 512
    win = np.hanning(n)
    trames = [np.abs(np.fft.rfft(win * x[i:i + n])) for i in range(0, max(1, len(x) - n), hop)]
    S = np.array(trames) + 1e-6
    bords = np.unique(np.geomspace(3, S.shape[1] - 1, 33).astype(int))
    B = np.stack([S[:, bords[k]:bords[k + 1]].mean(1) for k in range(len(bords) - 1)], 1)
    B = np.log(B)
    return (B - B.mean(1, keepdims=True)) / (B.std(1, keepdims=True) + 1e-6)


def _fin_alignee(prefixe, phrase):
    """DTW à fin libre : instant (s) de la phrase complète où se termine la lecture du préfixe."""
    A, B = _spectre(prefixe, SR_), _spectre(phrase, SR_)
    D = np.sqrt(((A[:, None, :] - B[None, :, :]) ** 2).sum(2))
    C = np.full((len(A) + 1, len(B) + 1), np.inf)
    C[0, 0] = 0
    for i in range(1, len(A) + 1):
        for j in range(1, len(B) + 1):
            C[i, j] = D[i - 1, j - 1] + min(C[i - 1, j - 1], C[i - 1, j], C[i, j - 1])
    j = int(np.argmin(C[len(A), 1:] / (len(A) + np.arange(1, len(B) + 1))))
    return (j + 1) * 0.01


def instants_des_mots(ph, phrase):
    """Instant où la voix attaque chaque mot-clé. Le début de la phrase (jusqu'au mot) est lu seul, puis aligné sur la
    phrase complète (DTW sur les spectres) : la fin de cet alignement est le début du mot. Précision ~ 0,1 s."""
    out = {}
    for mot in ph["mots"]:
        i = ph["texte"].find(mot)
        debut = ph["texte"][:i].rstrip(" ,")
        if not debut:
            out[mot] = 0.05
            continue
        audio = tts.generate(prononcer(debut), sid=0, speed=a.speed)
        y = rogner(np.array(audio.samples, dtype=np.float32), audio.sample_rate, queue=0.0)
        out[mot] = round(_fin_alignee(y, phrase), 3)
    return out


resultat = []
only = set(a.only.split(",")) if a.only else None
par_id = {ph["id"]: ph for ph in PHRASES}
groupe_de = {i: g for g in GROUPES for i in g}
for ph in PHRASES:
    wav = os.path.join(out_dir, f"{ph['id']}.wav")
    if (only is None or ph["id"] in only) and ph["id"] in groupe_de and groupe_de[ph["id"]][0] == ph["id"]:
        g = groupe_de[ph["id"]]
        audio = tts.generate(" ".join(prononcer(par_id[i]["texte"]) for i in g), sid=0, speed=a.speed)
        for i, morceau in zip(g, couper_aux_pauses(np.array(audio.samples, dtype=np.float32), audio.sample_rate, len(g))):
            sf.write(os.path.join(out_dir, f"{i}.wav"), rogner(morceau, audio.sample_rate), audio.sample_rate)
    elif (only is None or ph["id"] in only) and ph["id"] not in groupe_de:
        audio = tts.generate(prononcer(ph["texte"]), sid=0, speed=a.speed)
        x = rogner(np.array(audio.samples, dtype=np.float32), audio.sample_rate)
        sf.write(wav, x, audio.sample_rate)
    x, sr = sf.read(wav, dtype="float32")
    dur = len(x) / sr
    resultat.append({"id": ph["id"], "texte": ph["texte"], "fichier": f"audio/phrases/{ph['id']}.wav", "duree": round(dur, 3),
                     "reperes": instants_des_mots(ph, x)})
    print(f"{ph['id']:>4}  {dur:5.2f} s  {ph['texte']}")

shutil.rmtree(tmp, ignore_errors=True)
json.dump({"source": f"Kokoro v1.0 ({a.voice}, vitesse {a.speed})", "phrases": resultat},
          open(os.path.join(PROJET, "narration", "phrases.json"), "w"), ensure_ascii=False, indent=2)
print("total voix :", round(sum(r["duree"] for r in resultat), 2), "s")
