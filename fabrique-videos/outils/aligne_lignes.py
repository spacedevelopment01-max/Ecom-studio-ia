# aligne_lignes.py <lignes.json> <mots.json> <sortie.json> : temps de début/fin de chaque réplique + mots calés
import json,re,difflib,unicodedata,sys
L=json.load(open(sys.argv[1])); W=json.load(open(sys.argv[2]))
ww=[]
for x in W:
    if ww and x['w'][:1] in "'.-": ww[-1]['w']+=x['w']; ww[-1]['e']=x['e']
    else: ww.append(dict(x))
def nrm(x): x=unicodedata.normalize('NFD',x.lower()); return re.sub(r'[^a-z0-9]','',''.join(c for c in x if unicodedata.category(c)!='Mn'))
T=[];Tl=[]
for i,(q,tx) in enumerate(L):
    for k in tx.split():
        if re.search(r'\w',k): T.append(k); Tl.append(i)
sm=difflib.SequenceMatcher(None,[nrm(k) for k in T],[nrm(x['w']) for x in ww],autojunk=False); tm=[None]*len(T)
for tag,i1,i2,j1,j2 in sm.get_opcodes():
    if tag=='equal':
        for k in range(i2-i1): tm[i1+k]=(ww[j1+k]['s'],ww[j1+k]['e'])
    elif j2>j1 and i2>i1:
        s0=ww[j1]['s']; e0=ww[j2-1]['e']
        for k in range(i2-i1): tm[i1+k]=(s0+(e0-s0)*k/(i2-i1), s0+(e0-s0)*(k+1)/(i2-i1))
for k in range(len(T)):
    if tm[k] is None:
        p=tm[k-1][1] if k and tm[k-1] else 0; tm[k]=(p,p+0.2)
mots=[{'w':k,'s':round(a,3),'e':round(b,3),'seg':l} for k,(a,b),l in zip(T,tm,Tl)]
lig=[]
for i,(q,tx) in enumerate(L):
    m=[x for x in mots if x['seg']==i]
    lig.append({'qui':q,'s':min(x['s'] for x in m),'e':max(x['e'] for x in m)})
json.dump({'mots':mots,'lignes':lig},open(sys.argv[3],'w'),ensure_ascii=False,indent=0)
print('écarts',sum(1 for o in sm.get_opcodes() if o[0]!='equal'))
for i,l in enumerate(lig): print(i,l['qui'],round(l['s'],2),round(l['e'],2))
