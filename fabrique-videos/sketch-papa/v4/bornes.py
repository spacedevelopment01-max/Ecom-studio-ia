import json,wave,numpy as np
out=[]
for c in range(5):
    w=wave.open(f'm48_{c}.wav');sr=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)
    h=int(0.02*sr);n=len(x)//h;r=np.array([np.sqrt(np.mean(x[i*h:(i+1)*h]**2)) for i in range(n)])
    seuil=max(np.percentile(r,95)*0.05,80);calme=r<seuil
    gaps=[];i=0
    while i<n:
        if calme[i]:
            j=i
            while j<n and calme[j]: j+=1
            if (j-i)*0.02>=0.1: gaps.append((i*0.02,j*0.02))
            i=j
        else: i+=1
    L=json.load(open(f'al_{c}.json'))['lignes']
    cuts=[]
    for k in range(1,len(L)):
        b=L[k]['s']
        cand=[g for g in gaps if g[0]-0.7<=b<=g[1]+0.7]
        g=min(cand,key=lambda g:abs((g[0]+g[1])/2-b)) if cand else None
        cuts.append(((g[0]+g[1])/2 if g else b, g))
    dur=len(x)/sr
    # début/fin de parole réelle
    deb=next(i for i in range(n) if not calme[i])*0.02; fin=(n-next(i for i in range(n) if not calme[n-1-i]))*0.02
    seg=[]; a=max(0,deb-0.05)
    for k,(cpt,g) in enumerate(cuts):
        seg.append((a, cpt, g)); a=cpt
    seg.append((a,min(dur,fin+0.1),None))
    for k,(a,b,g) in enumerate(seg):
        out.append({'c':c,'k':c*7+k,'qui':L[k]['qui'],'a':round(a,3),'b':round(b,3)})
        print(c*7+k,L[k]['qui'],round(a,2),round(b,2),'gap' if g else 'SANS BLANC', round(L[k]['s'],2),round(L[k]['e'],2))
json.dump(out,open('bornes.json','w'))
