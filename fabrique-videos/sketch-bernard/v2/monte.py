import json,wave
import numpy as np
def lire(p):
    w=wave.open(p); return np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32),w.getframerate()
P,R=lire('d48.wav'); TL,_=lire('d48_tel.wav'); CRI,_=lire('cri48.wav')
A=json.load(open('brut_aligne.json')); L=A['lignes']; M=A['mots']; TX=json.load(open('lignes.json'))
ix=lambda t: max(0,int(t*R))
mix=P.copy(); f=int(0.02*R)
for l in L:
    if l['qui']!='C': continue
    a=ix(l['s']-0.1); b=ix(l['e']+0.25); env=np.ones(b-a); env[:f]=np.linspace(0,1,f); env[-f:]=np.linspace(1,0,f)
    mix[a:b]=P[a:b]*(1-env)+TL[a:b]*env
N=int(0.02*R)
def serre(a0,b0):
    """garde la voix, limite les silences internes à 0,3 s ; renvoie le son et la correspondance des temps"""
    x=mix[ix(a0):ix(b0)]; n=len(x)//N
    e=np.array([np.sqrt(np.mean(x[k*N:(k+1)*N]**2)+1e-9) for k in range(n)])
    seuil=max(250.0,np.percentile(e,90)*0.05); voix=e>seuil; idx=np.where(voix)[0]
    a=max(0,idx[0]-2); b=min(n,idx[-1]+8); garde=[]; calme=0
    for k in range(a,b):
        if voix[k]: calme=0; garde.append(k)
        else:
            calme+=1
            if calme<=15: garde.append(k)
    son=np.concatenate([x[k*N:(k+1)*N] for k in garde])
    def vers(t):
        k=int((t-a0)/0.02); j=np.searchsorted(garde,k)
        return min(j,len(garde))*0.02
    return son,vers
GAP={6:0.3,8:0.2,10:0.25,11:0.35,12:0.2,21:0.45,31:1.0,32:0.6,24:-0.15,25:-0.2}
segs=[]; pos=0.0; mots=[]; lig=[]
for i,l in enumerate(L):
    son,vers=serre(l['s']-0.1,l['e']+0.25)
    if i:
        court=len(TX[i][1])<=22 and TX[i][0]!=TX[i-1][0]
        g=GAP.get(i, -0.18 if court else (0.15 if TX[i][0]==TX[i-1][0] else 0.06))
        pos=max(segs[-1][0]+0.2, segs[-1][0]+len(segs[-1][1])/R+g)
    k=int(0.01*R); son=son.copy(); son[:k]*=np.linspace(0,1,k); son[-k:]*=np.linspace(1,0,k)
    segs.append((pos,son))
    for m in M:
        if m['seg']==i: mots.append({'w':m['w'],'s':round(pos+vers(m['s']),3),'e':round(pos+vers(m['e']),3),'seg':i})
    if i==28:
        he=[m for m in M if m['seg']==28 and m['w'].lstrip('«').lower().startswith('hé')][0]['s']
        segs.append((pos+vers(he)-0.03,CRI*0.9))
    ws=[m for m in mots if m['seg']==i]
    lig.append({'qui':l['qui'],'s':round(min(m['s'] for m in ws),3),'e':round(max(m['e'] for m in ws),3)})
fin=max(p+len(s)/R for p,s in segs)+1.2
y=np.zeros(int(fin*R)+R)
for p,s in segs: a=int(p*R); y[a:a+len(s)]+=s
y=np.clip(y[:int(fin*R)],-32767,32767).astype(np.int16)
w=wave.open('monte.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(R); w.writeframes(y.tobytes()); w.close()
json.dump({'duree':round(fin-0.6,3),'mots':mots,'lignes':lig},open('minutage.json','w'),ensure_ascii=False)
print('durée',round(fin,2))
