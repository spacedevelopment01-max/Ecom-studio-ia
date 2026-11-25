import json,wave
import numpy as np
def lire(p):
    w=wave.open(p); return np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32),w.getframerate()
P,R=lire('d48.wav'); TL,_=lire('d48_tel.wav'); CRI,_=lire('cri48.wav')
A=json.load(open('brut_aligne.json')); L=A['lignes']; M=A['mots']
ix=lambda t: max(0,int(t*R))
mix=P.copy(); f=int(0.02*R)
for l in L:
    if l['qui']!='C': continue
    a=ix(l['s']-0.1); b=ix(l['e']+0.2); env=np.ones(b-a); env[:f]=np.linspace(0,1,f); env[-f:]=np.linspace(1,0,f)
    mix[a:b]=P[a:b]*(1-env)+TL[a:b]*env
he=[m for m in M if m['seg']==28 and m['w'].lstrip('«').lower().startswith('hé')][0]['s']
a=ix(he-0.05); n=min(len(CRI),len(mix)-a); mix[a:a+n]+=CRI[:n]*0.9
L[28]['e']=max(L[28]['e'],he-0.05+len(CRI)/R)
def serre(x):
    n=int(0.02*R)
    if len(x)<3*n: return x
    e=np.array([np.sqrt(np.mean(x[k:k+n]**2)+1e-9) for k in range(0,len(x)-n,n)])
    seuil=max(250.0,np.percentile(e,90)*0.05); voix=e>seuil; idx=np.where(voix)[0]
    if len(idx)==0: return x
    a=max(0,idx[0]-2); b=min(len(voix),idx[-1]+6); out=[]; calme=0
    for k in range(a,b):
        if voix[k]: calme=0; out.append(x[k*n:(k+1)*n])
        else:
            calme+=1
            if calme<=10: out.append(x[k*n:(k+1)*n])
    return np.concatenate(out)
GAPS={6:0.35,10:0.3,31:0.9,32:0.6,21:0.3}
out=[]; t=0.0
for i,l in enumerate(L):
    if i: g=GAPS.get(i,0.1); out.append(np.zeros(int(g*R))); t+=g
    s=serre(mix[ix(l['s']-0.1):ix(l['e']+0.2)]).copy(); k=int(0.01*R); s[:k]*=np.linspace(0,1,k); s[-k:]*=np.linspace(1,0,k)
    out.append(s); t+=len(s)/R
out.append(np.zeros(int(1.2*R))); t+=1.2
y=np.clip(np.concatenate(out),-32767,32767).astype(np.int16)
w=wave.open('monte.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(R); w.writeframes(y.tobytes()); w.close(); print('monté',round(t,2))
