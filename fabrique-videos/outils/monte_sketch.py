# monte_sketch.py : remet les répliques bout à bout, effet téléphone sur une voix, sous-titres calés
import json,wave,re,difflib,unicodedata,sys
import numpy as np
TEL=sys.argv[1] if len(sys.argv)>1 else 'C'
def lire(p):
    w=wave.open(p); a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32); return a,w.getframerate()
P,R=lire('propre.wav'); TL,_=lire('tel.wav')
L=json.load(open('lignes.json')); W=json.load(open('mots.json'))
fins=[]
for i,(sp,tx,s) in enumerate(L):
    nxt=L[i+1][2] if i+1<len(L) else 999
    fins.append(max([w['e'] for w in W if s-0.05<=w['s']<nxt-0.05] or [s+0.5]))
mix=P.copy(); f=int(0.02*R)
for i,(sp,tx,s) in enumerate(L):
    if sp!=TEL: continue
    a=int((s-0.08)*R); b=int((fins[i]+0.12)*R)
    env=np.ones(b-a); env[:f]=np.linspace(0,1,f); env[-f:]=np.linspace(1,0,f)
    mix[a:b]=P[a:b]*(1-env)+TL[a:b]*env
pauses=[]
for i in range(len(L)-1):
    pauses.append(0.6 if i in (5,22) else (0.18 if L[i+1][0]=='S' and len(L[i+1][1])<16 else 0.28))
out=[]; t=0.0; carte=[]
for i,(sp,tx,s) in enumerate(L):
    a=int((s-0.12)*R) if i else int((L[0][2]-0.15)*R); b=int((fins[i]+0.15)*R)
    seg=mix[a:b].copy(); n=int(0.012*R); seg[:n]*=np.linspace(0,1,n); seg[-n:]*=np.linspace(1,0,n)
    carte.append((a/R,b/R,t)); out.append(seg); t+=len(seg)/R
    if i<len(pauses): z=np.zeros(int(pauses[i]*R)); out.append(z); t+=len(z)/R
out.append(np.zeros(int(0.6*R)))
y=np.clip(np.concatenate(out),-32767,32767).astype(np.int16)
w=wave.open('dialogue_monte.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(R); w.writeframes(y.tobytes()); w.close()
def vers(tt):
    for a,b,n in carte:
        if a-0.001<=tt<=b+0.001: return n+(tt-a)
    return None
def nrm(x): x=unicodedata.normalize('NFD',x.lower()); return re.sub(r'[^a-z0-9]','',''.join(c for c in x if unicodedata.category(c)!='Mn'))
mots=[]; lo=[]
for i,(sp,tx,s) in enumerate(L):
    nxt=L[i+1][2] if i+1<len(L) else 999; ww=[]
    for x in W:
        if s-0.05<=x['s']<nxt-0.05:
            if ww and x['w'][:1] in "'.-": ww[-1]['w']+=x['w']; ww[-1]['e']=x['e']
            else: ww.append(dict(x))
    T=[k for k in tx.split() if re.search(r'\w',k)]
    sm=difflib.SequenceMatcher(None,[nrm(k) for k in T],[nrm(x['w']) for x in ww],autojunk=False); tm=[None]*len(T)
    for tag,i1,i2,j1,j2 in sm.get_opcodes():
        if tag=='equal':
            for k in range(i2-i1): tm[i1+k]=(ww[j1+k]['s'],ww[j1+k]['e'])
        elif j2>j1 and i2>i1:
            s0=ww[j1]['s']; e0=ww[j2-1]['e']
            for k in range(i2-i1): tm[i1+k]=(s0+(e0-s0)*k/(i2-i1), s0+(e0-s0)*(k+1)/(i2-i1))
    for k in range(len(T)):
        if tm[k] is None: p=tm[k-1][1] if k and tm[k-1] else s; tm[k]=(p,p+0.2)
    for k,(a,b) in zip(T,tm):
        na,nb=vers(a),vers(b)
        if na is not None: mots.append({'w':k,'s':round(na,3),'e':round(nb if nb else na+0.2,3),'seg':i})
    lo.append({'qui':sp,'s':round(vers(s) if vers(s) is not None else (vers(s+0.05) or 0),3),'e':round(vers(fins[i]) or 0,3)})
json.dump({'duree':round(t,3),'mots':mots,'lignes':lo},open('minutage.json','w'),ensure_ascii=False,indent=0)
print('durée',round(t,2))
