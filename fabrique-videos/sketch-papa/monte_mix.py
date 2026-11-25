import json,wave
import numpy as np
K=1.12
def lire(p):
    w=wave.open(p); return np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32),w.getframerate()
SRC={'o':(lire('d48.wav')[0],lire('d48_tel.wav')[0]),'n':(lire('n48.wav')[0],lire('n48_tel.wav')[0])}
R=48000; BIP,_=lire('bip.wav'); SON,_=lire('sonnerie.wav')
A=json.load(open('brut_aligne.json')); TX=json.load(open('lignes.json'))
NA=json.load(open('ajout_aligne.json')); NTX=json.load(open('lignes_ajout.json'))
NV=[(0.1,3.25),(3.6,5.65),(6.3,10.2),(10.7,11.4),(12.05,15.7),(16.2,17.25),(17.7,18.9)]
def entree(src,i):
    if src=='o': l=A['lignes'][i]; return dict(src='o',i=i,qui=l['qui'],s=l['s'],e=l['e'],txt=TX[i][1],mots=[m for m in A['mots'] if m['seg']==i])
    s,e=NV[i]; ms=[m for m in NA['mots'] if m['seg']==i]
    if not ms or not all(s-0.35<=m['s']<=e+0.35 for m in ms):
        p=[len(m['w'])+2 for m in ms]; tot=sum(p); t=s; mm=[]
        for m,q in zip(ms,p): d=(e-s)*q/tot; mm.append({'w':m['w'],'s':t,'e':t+d}); t+=d
        ms=mm
    return dict(src='n',i=i,qui=NTX[i][0],s=s,e=e,txt=NTX[i][1],mots=ms)
ORDRE=[('o',k) for k in range(12)]+[('n',0),('n',1)]+[('o',k) for k in range(12,22)]+[('n',2),('n',3)]+[('o',k) for k in range(22,27)]+[('n',4),('n',5),('n',6)]+[('o',27)]
E=[entree(s,i) for s,i in ORDRE]
# bornes : milieu du blanc avec la réplique voisine dans le même fichier
for src in 'on':
    lst=sorted([e for e in E if e['src']==src],key=lambda e:e['s'])
    for k,e in enumerate(lst):
        e['a']=(lst[k-1]['e']+e['s'])/2 if k else max(0,e['s']-0.3)
        e['b']=(e['e']+lst[k+1]['s'])/2 if k+1<len(lst) else e['e']+0.5
N=int(0.02*R)
def morceau(e):
    P,T=SRC[e['src']]; a,b=int(e['a']*R),int(e['b']*R); x=(T if e['qui']=='P' else P)[a:b].copy()
    c=int(0.03*R); x[:c]*=np.linspace(0,1,c); x[-c:]*=np.linspace(1,0,c); return x
def gap(k):
    prev,cur=E[k-1],E[k]
    if prev['src']=='o' and prev['i']==20: return 2.0     # bip puis sonnerie
    if cur['src']=='o' and cur['i'] in (10,26): return 0.35
    if len(cur['txt'])<=22 and cur['qui']!=prev['qui']: return -0.15
    return 0.02
segs=[]; mots=[]; lig=[]; fin_voix=0.0
for k,e in enumerate(E):
    son=morceau(e); lead=e['s']-e['a']
    debut=fin_voix+gap(k) if k else lead
    if k: debut=max(debut,lig[-1]['s']+0.25)
    pos=debut-lead; segs.append((pos,son))
    for m in e['mots']: mots.append({'w':m['w'],'s':round(pos+m['s']-e['a'],3),'e':round(pos+m['e']-e['a'],3),'seg':k})
    lig.append({'qui':'F' if e['qui']=='F' else 'P','s':round(debut,3),'e':round(pos+e['e']-e['a'],3)})
    fin_voix=pos+e['e']-e['a']
    if e['src']=='o' and e['i']==20: segs.append((fin_voix+0.12,BIP)); segs.append((fin_voix+0.95,SON))
fin=max(p+len(s)/R for p,s in segs)+0.9
y=np.zeros(int(fin*R)+R)
for p,s in segs: a=int(max(0,p)*R); y[a:a+len(s)]+=s[:len(y)-a]
y=np.clip(y[:int(fin*R)],-32767,32767).astype(np.int16)
w=wave.open('monte_mix.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(R); w.writeframes(y.tobytes()); w.close()
for m in mots: m['s']=round(m['s']/K,3); m['e']=round(m['e']/K,3)
for l in lig: l['s']=round(l['s']/K,3); l['e']=round(l['e']/K,3)
json.dump({'duree':round(fin/K-0.6,3),'mots':mots,'lignes':lig},open('minutage_mix.json','w'),ensure_ascii=False)
json.dump([[e['src'],e['i']] for e in E],open('ordre.json','w'))
print('monté',round(fin,2),'après accélération',round(fin/K,2),'répliques',len(E))
