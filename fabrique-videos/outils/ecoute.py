import sys, wave
import numpy as np
from faster_whisper import WhisperModel
w = wave.open(sys.argv[1]); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)/32768.0
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, info = m.transcribe(a, language="fr", vad_filter=True)
with open(sys.argv[2], "w") as f:
    for s in segs:
        f.write(f"[{s.start:6.1f}] {s.text.strip()}\n"); f.flush()
print("fini")
