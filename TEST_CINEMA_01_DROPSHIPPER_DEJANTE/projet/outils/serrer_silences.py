# Resserre d'après l'enveloppe réelle : plages < -40 dB raccourcies selon l'endroit ; respirations de la liste écourtées.
import subprocess, numpy as np, sys
src, out = sys.argv[1], sys.argv[2]
SR=44100; H=int(0.01*SR)
x=np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i",src,"-ac","1","-ar",str(SR),"-f","f32le","-"],capture_output=True).stdout,np.float32).copy()
db=np.array([20*np.log10(np.sqrt((x[i:i+H]**2).mean())+1e-9) for i in range(0,len(x)-H,H)])
def runs(th, lo, hi, minlen):
    r=[]; s=None
    for i,v in enumerate(db):
        t=i*0.01
        if v<th and lo<=t<=hi:
            if s is None: s=t
        else:
            if s is not None and t-s>=minlen: r.append((s,t))
            s=None
    return r
# temps gardés (début de plage -> durée gardée)
RULES=[(0.40,0.18),(1.80,0.16),(3.70,0.20),(4.75,0.10),(6.65,0.16),(9.2,0.24),(10.35,0.30),(14.25,0.18)]
cuts=[]
for a,b in runs(-40,0.3,16.5,0.12):
    keep=next((k for s,k in RULES if abs(a-s)<0.25), None)
    if keep is not None and b-a>keep: cuts.append((a+keep/2,b-keep/2))
for a,b in runs(-22,11.3,13.5,0.12):   # respirations entre « site, logo, photos, pubs, référencement »
    if b-a>0.10: cuts.append((a+0.05,b-0.05))
cuts.sort(); end=16.66
fade=int(0.01*SR); parts=[]; t=0.0
for a,b in cuts+[(end,None)]:
    s=x[int(t*SR):int(a*SR)].copy(); r=np.linspace(0,1,fade); s[:fade]*=r; s[-fade:]*=r[::-1]; parts.append(s)
    if b is None: break
    t=b
y=np.concatenate(parts)
open(out+".cuts.txt","w").write("\n".join(f"{a:.2f}-{b:.2f}" for a,b in cuts))
subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac","1","-i","-","-c:a","pcm_s16le",out],input=y.astype(np.float32).tobytes())
print(f"coupes : {len(cuts)} | {len(x)/SR:.2f} s -> {len(y)/SR:.2f} s")
