"""Pour chaque plan où il parle : piste audio dans le temps SOURCE du clip Kling (tempo corrigé pour les segments
accélérés), silence ailleurs, coupée 0,3 s après la dernière parole utile."""
import json, subprocess, numpy as np
SR = 44100
plan = json.load(open("montage/plan.json"))
voix = np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i","voix/voix-suite.wav","-f","f32le","-"],capture_output=True).stdout,np.float32)
mots = [w for v in plan["voix"] for w in v["mots"]]
SYNC = ["A","B","D","F","H","I","J","K","L","M","N","P","R","S"]
tot = 0
for shot in SYNC:
    segs = [s for s in plan["segments"] if s["plan"] == shot]
    dur_src = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"anim/{shot}/sortie-1.mp4"],capture_output=True,text=True).stdout)
    out = np.zeros(int(dur_src * SR), np.float32); last = 0.0
    for s in segs:
        a, b = int(s["debut"] * SR), int(s["fin"] * SR); piece = voix[a:b]
        if s["vitesse"] != 1.0:   # ramener au temps source : ralentir de la vitesse du segment, sans changer la hauteur
            piece = np.frombuffer(subprocess.run(["ffmpeg","-v","error","-f","f32le","-ar",str(SR),"-ac","1","-i","-","-af",f"atempo={1/s['vitesse']:.5f}","-f","f32le","-"],input=piece.tobytes(),capture_output=True).stdout,np.float32)
        i0 = int(s["src_in"] * SR); out[i0:i0 + len(piece)] = piece[:len(out) - i0]
        for w in mots:
            if s["debut"] <= w["debut"] < s["fin"]: last = max(last, s["src_in"] + (min(w["fin"], s["fin"]) - s["debut"]) * s["vitesse"])
    L = min(dur_src, last + 0.3); out = out[:int(L * SR)]; tot += L
    subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac","1","-i","-","-c:a","libmp3lame","-b:a","192k",f"lipsync/audio-{shot}.mp3"],input=out.tobytes())
    print(f"{shot}: audio source {L:.2f} s (clip {dur_src:.2f} s)")
print(f"total à synchroniser ≈ {tot:.1f} s -> ≈ {tot*0.05:.2f} $ (3 $/min)")
