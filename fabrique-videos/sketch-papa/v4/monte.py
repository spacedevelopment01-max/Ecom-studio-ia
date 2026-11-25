import json,wave,numpy as np,subprocess
R=48000;K=1.08
def lire(p): w=wave.open(p); return np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)
D=[lire(f'm48_{c}.wav') for c in range(5)]; Tt=[lire(f't48_{c}.wav') for c in range(5)]
BIP=lire('../bip.wav'); SON=lire('../sonnerie.wav')
B=json.load(open('bornes.json')); AL=[json.load(open(f'al_{c}.json')) for c in range(5)]
y=[];yF=[];pos=0.0;mots=[];lig=[]
f=int(0.012*R)
def add(x,isF):
    global pos
    y.append(x); yF.append(x if isF else np.zeros_like(x)); pos+=len(x)/R
for b in B:
    c,k=b['c'],b['k']; a,e=int(b['a']*R),int(b['b']*R)
    x=(D[c] if b['qui']=='F' else Tt[c])[a:e].copy()
    x[:f]*=np.linspace(0,1,f); x[-f:]*=np.linspace(1,0,f)
    l=AL[c]['lignes'][k-c*7]
    lig.append({'qui':b['qui'],'s':pos+max(0,l['s']-b['a']),'e':pos+min(b['b'],l['e'])-b['a']})
    for m in AL[c]['mots']:
        if m['seg']==k-c*7: mots.append({'w':m['w'],'s':pos+m['s']-b['a'],'e':pos+m['e']-b['a'],'seg':k})
    add(x,b['qui']=='F')
    if k==22:
        z=np.zeros(int(2.0*R),dtype=np.float32); z[int(0.12*R):int(0.12*R)+len(BIP)]+=BIP[:len(z)-int(0.12*R)]
        s0=int(0.9*R); z[s0:s0+len(SON)]+=SON[:len(z)-s0]; add(z,False)
y=np.concatenate(y); yF=np.concatenate(yF)
# raccourcit les vrais silences (> 0,5 s ramenés à 0,36 s), hors bip/sonnerie
h=int(0.02*R);n=len(y)//h;r=np.array([np.sqrt(np.mean(y[i*h:(i+1)*h]**2)) for i in range(n)])
calme=r<max(np.percentile(r,95)*0.04,60); cuts=[];i=0
while i<n:
    if calme[i]:
        j=i
        while j<n and calme[j]: j+=1
        d=(j-i)*0.02
        if d>0.5 and i>0 and j<n: m=(i+j)/2*0.02; q=(d-0.36)/2; cuts.append((m-q,m+q))
        i=j
    else: i+=1
def nt(t): return t-sum(min(max(t-a,0),b-a) for a,b in cuts)
def coupe(x):
    P=[];p=0
    for a,b in cuts:
        s=x[int(p*R):int(a*R)].copy()
        if len(s)>2*f: s[-f:]*=np.linspace(1,0,f); s[:f]*=np.linspace(0,1,f) if p>0 else 1
        P.append(s);p=b
    P.append(x[int(p*R):]); return np.concatenate(P)
y=coupe(y); yF=coupe(yF)
def ecrire(p,x):
    w=wave.open(p,'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(R);w.writeframes(np.clip(x,-32767,32767).astype(np.int16).tobytes());w.close()
ecrire('monte.wav',y); ecrire('fils.wav',yF)
for m in mots: m['s']=round(nt(m['s'])/K,3); m['e']=round(nt(m['e'])/K,3)
for l in lig: l['s']=round(nt(l['s'])/K,3); l['e']=round(nt(l['e'])/K,3)
dur=len(y)/R/K
json.dump({'duree':round(dur,3),'mots':mots,'lignes':lig},open('minutage.json','w'),ensure_ascii=False)
fr=int(dur*30)+30; env=[]
for i in range(fr):
    a=int(i/30*K*R); s=yF[a:a+int(R/30*K)]; env.append(float(np.sqrt(np.mean(s**2))) if len(s) else 0.0)
env=np.array(env); env=np.clip(env/(np.percentile(env[env>0],90) if (env>0).any() else 1),0,1)
env=np.convolve(env,[0.25,0.5,0.25],'same')
json.dump([round(float(v),3) for v in env],open('bouche.json','w'))
print('coupes',len(cuts),'durée',round(dur,2))
