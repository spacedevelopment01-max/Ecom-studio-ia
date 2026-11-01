"""Construit la piste voix locale (46,5 s) à partir du plan : chaque réplique posée à son décalage."""
import json, subprocess, numpy as np
SR = 44100
def charger(f):
    return np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i",f,"-ac","1","-ar",str(SR),"-f","f32le","-"],capture_output=True).stdout,np.float32)
def piste(plan):
    n = int(plan["duree"] * SR) + SR; y = np.zeros(n, np.float32)
    for v in plan["voix"]:
        x = charger(f"../audio/voix/replique-{v['replique']}-resserree.wav"); i = int(round(v["decalage"] * SR))
        a = max(0, -i); y[max(0, i):max(0, i) + len(x) - a] += x[a:a + n - max(0, i)][:len(y) - max(0, i)]
    return y[:int(plan["duree"] * SR)]
if __name__ == "__main__":
    plan = json.load(open("montage/plan.json")); y = piste(plan)
    subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac","1","-i","-","-c:a","pcm_s16le","build/voix-suite.wav"],input=y.tobytes())
    print("voix-suite.wav", round(len(y)/SR, 2), "s")
