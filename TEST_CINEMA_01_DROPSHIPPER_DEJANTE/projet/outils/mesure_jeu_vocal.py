import json, sys, subprocess, numpy as np
def load(f):
    raw = subprocess.run(["ffmpeg","-v","error","-i",f,"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True).stdout
    return np.frombuffer(raw, np.float32)
def f0(seg, sr=16000):
    # autocorrélation simple par trames de 40 ms
    out=[]
    for i in range(0, len(seg)-640, 320):
        fr = seg[i:i+640]*np.hanning(640)
        if np.sqrt((fr**2).mean()) < 0.01: continue
        ac = np.correlate(fr, fr, "full")[639:]
        lo, hi = sr//400, sr//70
        k = lo + np.argmax(ac[lo:hi]);
        if ac[k] > 0.3*ac[0]: out.append(sr/k)
    return np.array(out)
groups = {"cri TOI":["Toi,"], "chuchot. dropshipping":["tu","veux","faire","du","dropshipping"], "fierté produit":["Moi,","j'avais","le","produit."], "milliardaire":["J'étais","déjà","milliardaire."], "panique liste":["site,","logo,","photo,","pub,","référencement."], "fusée":["Je","lance","une","boutique","ou","une","fusée"]}
for f in sys.argv[1:]:
    x = load(f); W = [w for w in json.load(open(f+".stt.json"))["words"] if w["type"]=="word"]
    print("==", f)
    allf = f0(x); print(f"  hauteur globale : médiane {np.median(allf):.0f} Hz, étendue p5-p95 {np.percentile(allf,5):.0f}-{np.percentile(allf,95):.0f} Hz")
    used=set()
    for g, words in groups.items():
        idx=[]; j=0
        for i,w in enumerate(W):
            if i in used: continue
            if j < len(words) and w["text"]==words[j]: idx.append(i); j+=1
            if j==len(words): break
        if len(idx)!=len(words): print("  ?", g); continue
        used.update(idx); a, b = W[idx[0]]["start"], W[idx[-1]]["end"]
        seg = x[int(a*16000):int(b*16000)]; rms = 20*np.log10(np.sqrt((seg**2).mean())+1e-9); p = f0(seg)
        print(f"  {g:24s} {a:5.2f}-{b:5.2f}s  volume {rms:6.1f} dB  hauteur méd. {np.median(p) if len(p) else 0:4.0f} Hz  débit {len(words)/(b-a):.1f} mots/s")
