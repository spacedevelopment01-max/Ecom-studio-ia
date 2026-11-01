# Silences (< -40 dB) de plus de MAXG s ramenés à MAXG ; début/fin coupés à 0,04 s. Fondus 10 ms. Pas d'accélération.
import subprocess, numpy as np, sys
src, out, MAXG = sys.argv[1], sys.argv[2], float(sys.argv[3])
SR=44100; H=int(0.01*SR)
x=np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i",src,"-ac","1","-ar",str(SR),"-f","f32le","-"],capture_output=True).stdout,np.float32).copy()
db=np.array([20*np.log10(np.sqrt((x[i:i+H]**2).mean())+1e-9) for i in range(0,len(x)-H,H)])
loud=np.where(db>-40)[0]; a0=max(0,loud[0]*0.01-0.04); a1=min(len(x)/SR,(loud[-1]+1)*0.01+0.08)
runs=[]; s=None
for i,v in enumerate(db):
    t=i*0.01
    if v<-40 and a0<t<a1:
        if s is None: s=t
    else:
        if s is not None and t-s>MAXG: runs.append((s+MAXG/2, t-MAXG/2))
        s=None
fade=int(0.01*SR); parts=[]; t=a0
for a,b in runs+[(a1,None)]:
    seg=x[int(t*SR):int(a*SR)].copy(); r=np.linspace(0,1,fade); seg[:fade]*=r; seg[-fade:]*=r[::-1]; parts.append(seg)
    if b is None: break
    t=b
y=np.concatenate(parts)
subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac","1","-i","-","-c:a","pcm_s16le",out],input=y.astype(np.float32).tobytes())
print(f"{src}: {len(x)/SR:.2f} s -> {len(y)/SR:.2f} s ({len(runs)} silences raccourcis)")
