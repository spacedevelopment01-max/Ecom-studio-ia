import sys, json, subprocess
f = sys.argv[1]
out = subprocess.run(["curl","-sS","-X","POST","https://api.elevenlabs.io/v1/speech-to-text","-H","xi-api-key: injecte-par-le-proxy","-F","model_id=scribe_v1","-F","language_code=fr","-F","timestamps_granularity=word","-F",f"file=@{f}"],capture_output=True,text=True).stdout
d = json.loads(out); json.dump(d, open(f+".stt.json","w"), ensure_ascii=False)
print(d.get("text"))
print(" ".join(f"{w['text']}[{w['start']:.2f}-{w['end']:.2f}]" for w in d.get("words",[]) if w.get("type")=="word"))
