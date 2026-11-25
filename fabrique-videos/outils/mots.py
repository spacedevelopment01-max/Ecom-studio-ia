import sys, wave, json
import numpy as np
from faster_whisper import WhisperModel
w=wave.open(sys.argv[1]); a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768.0
m=WhisperModel("small",device="cpu",compute_type="int8")
segs,_=m.transcribe(a,language="fr",word_timestamps=True)
mots=[{'w':x.word.strip(),'s':round(x.start,3),'e':round(x.end,3)} for s in segs for x in s.words]
json.dump(mots,open(sys.argv[2],'w'),ensure_ascii=False); print(len(mots),'mots'); print(' '.join(f"{x['w']}@{x['s']:.1f}" for x in mots))
