# silences.py <texte propre> <mots whisper.json> <voix.wav> <dossier sortie> <K> [silence min] [silence gardé]
# ne coupe QUE dans le vrai silence (mesuré au son, par tranches de 20 ms) : un silence plus long que <min> est ramené à <gardé>
import json,re,difflib,wave,sys,numpy as np
S=open(sys.argv[1]).read().split(); W=json.load(open(sys.argv[2])); out=sys.argv[4]; K=float(sys.argv[5])
SMIN=float(sys.argv[6]) if len(sys.argv)>6 else 0.6; GARDE=float(sys.argv[7]) if len(sys.argv)>7 else 0.45
w=wave.open(sys.argv[3]);sr=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)
h=int(0.02*sr); n=len(x)//h
rms=np.array([np.sqrt(np.mean(x[i*h:(i+1)*h]**2)) for i in range(n)])
seuil=max(np.percentile(rms,95)*0.04,60)
calme=rms<seuil
cuts=[];i=0
while i<n:
    if calme[i]:
        j=i
        while j<n and calme[j]: j+=1
        d=(j-i)*0.02
        if d>SMIN and i>0 and j<n:
            m=(i+j)/2*0.02; r=(d-GARDE)/2; cuts.append((m-r,m+r))
        i=j
    else: i+=1
def nt(t): return t-sum(min(max(t-a,0),b-a) for a,b in cuts)
parts=[];pos=0;f=int(0.01*sr)
for c0,c1 in cuts:
    seg=x[int(pos*sr):int(c0*sr)].copy();seg[-f:]*=np.linspace(1,0,f)
    if pos>0: seg[:f]*=np.linspace(0,1,f)
    parts.append(seg);pos=c1
seg=x[int(pos*sr):].copy();seg[:f]*=np.linspace(0,1,f);parts.append(seg)
y=np.concatenate(parts)
o=wave.open(out+'/voix_court.wav','w');o.setnchannels(1);o.setsampwidth(2);o.setframerate(sr);o.writeframes(y.astype(np.int16).tobytes());o.close()
norm=lambda w: re.sub(r"[^a-zàâçéèêëîïôûùüÿœ0-9]","",w.lower())
sm=difflib.SequenceMatcher(None,[norm(w) for w in S],[norm(w['w']) for w in W],autojunk=False)
T=[None]*len(S)
for a,b,k in sm.get_matching_blocks():
    for q in range(k): T[a+q]=(W[b+q]['s'],W[b+q]['e'])
for i in range(len(S)):
    if T[i] is None:
        p=next((T[k] for k in range(i-1,-1,-1) if T[k]),(0,0)); q=next((T[k] for k in range(i+1,len(S)) if T[k]),(p[1]+0.3,p[1]+0.6))
        T[i]=(p[1],max(p[1]+0.05,min(q[0],p[1]+0.3)))
json.dump({'duree':round(len(y)/sr/K,3),'mots':[{'w':S[i],'s':round(nt(T[i][0])/K,3),'e':round(nt(T[i][1])/K,3),'seg':0} for i in range(len(S))]},open(out+'/minutage.json','w'),ensure_ascii=False)
print('coupes',len(cuts),'seuil',round(seuil),'court',round(len(y)/sr,2),'final',round(len(y)/sr/K,2))
