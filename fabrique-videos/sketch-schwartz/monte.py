import json,wave
import numpy as np
K=1.06
def lire(p):
    w=wave.open(p); return np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32),w.getframerate()
P,R=lire('d48.wav'); TL,_=lire('d48_tel.wav'); CRI=None
A=json.load(open('brut_aligne.json')); L=A['lignes']; M=A['mots']; TX=json.load(open('lignes.json'))
ix=lambda t: min(len(P),max(0,int(t*R)))
# bornes de coupe : au milieu du blanc entre deux répliques
bornes=[]
for i,l in enumerate(L):
    a=(L[i-1]['e']+l['s'])/2 if i else max(0,l['s']-0.3)
    b=(l['e']+L[i+1]['s'])/2 if i+1<len(L) else l['e']+0.6
    bornes.append((a,b))
# téléphone sur le client, fondu de 40 ms aux bornes
mix=P.copy(); f=int(0.04*R)
for (a,b),l in zip(bornes,L):
    if l['qui']!='C': continue
    A0,B0=ix(a),ix(b); env=np.ones(B0-A0); env[:f]=np.linspace(0,1,f); env[-f:]=np.linspace(1,0,f)
    mix[A0:B0]=P[A0:B0]*(1-env)+TL[A0:B0]*env
N=int(0.02*R)
def raccourcit(a0,b0):
    x=mix[ix(a0):ix(b0)]; n=len(x)//N
    e=np.array([np.sqrt(np.mean(x[k*N:(k+1)*N]**2)+1e-9) for k in range(n)])
    seuil=max(120.0,np.percentile(e,95)*0.02); calme=e<seuil
    garde=np.ones(n,bool); k=0
    while k<n:
        if calme[k]:
            j=k
            while j<n and calme[j]: j+=1
            if (j-k)*0.02>0.7 and k>0 and j<n:   # seulement les longs silences internes
                garde[k+10:j-10]=False             # on garde 0,2 s de chaque côté
            k=j
        else: k+=1
    morceaux=[]; idx=np.where(garde)[0]; d=0
    while d<len(idx):
        g=d
        while g+1<len(idx) and idx[g+1]==idx[g]+1: g+=1
        morceaux.append(x[idx[d]*N:(idx[g]+1)*N].copy()); d=g+1
    c=int(0.03*R)
    for m in morceaux:
        if len(m)>2*c: m[:c]*=np.linspace(0,1,c); m[-c:]*=np.linspace(1,0,c)
    son=np.concatenate(morceaux)+0
    def vers(t):
        k=int((t-a0)/0.02); return np.count_nonzero(garde[:max(0,min(n,k))])*0.02
    return son,vers
GAP={11:0.35,16:0.3,19:0.35,25:0.3,26:0.6,27:0.9,15:-0.1}
segs=[]; mots=[]; lig=[]; fin_voix=0.0
for i,l in enumerate(L):
    a,b=bornes[i]; son,vers=raccourcit(a,b); lead=vers(l['s'])
    if i:
        court=len(TX[i][1])<=22 and TX[i][0]!=TX[i-1][0]
        g=GAP.get(i, -0.18 if court else (0.15 if TX[i][0]==TX[i-1][0] else 0.06))
        debut_voix=max(lig[-1]['s']+0.25, fin_voix+g)
    else: debut_voix=lead
    pos=debut_voix-lead
    segs.append((pos,son))
    for m in M:
        if m['seg']==i: mots.append({'w':m['w'],'s':round(pos+vers(m['s']),3),'e':round(pos+vers(m['e']),3),'seg':i})
    ws=[m for m in mots if m['seg']==i]
    lig.append({'qui':l['qui'],'s':round(min(m['s'] for m in ws),3),'e':round(max(m['e'] for m in ws),3)})
    fin_voix=pos+vers(l['e'])
fin=max(p+len(s)/R for p,s in segs)+0.8
y=np.zeros(int(fin*R)+R)
for p,s in segs:
    a=int(max(0,p)*R); y[a:a+len(s)]+=s[:len(y)-a]
y=np.clip(y[:int(fin*R)],-32767,32767).astype(np.int16)
w=wave.open('monte2.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(R); w.writeframes(y.tobytes()); w.close()
for m in mots: m['s']=round(m['s']/K,3); m['e']=round(m['e']/K,3)
for l in lig: l['s']=round(l['s']/K,3); l['e']=round(l['e']/K,3)
json.dump({'duree':round(fin/K-0.6,3),'mots':mots,'lignes':lig},open('minutage2.json','w'),ensure_ascii=False)
print('monté',round(fin,2),'après accélération',round(fin/K,2))
