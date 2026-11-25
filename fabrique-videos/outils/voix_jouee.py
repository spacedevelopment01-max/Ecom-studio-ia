# voix_jouee.py <texte propre> <mots whisper.json> <voix.wav> <sortie dossier> <K> <blanc max>
# aligne le texte exact sur les mots de whisper, raccourcit les blancs trop longs, écrit voix_court.wav et minutage.json (temps divisés par K)
import json,re,difflib,wave,sys,numpy as np
S=open(sys.argv[1]).read().split(); W=json.load(open(sys.argv[2])); out=sys.argv[4]; K=float(sys.argv[5]); B=float(sys.argv[6])
norm=lambda w: re.sub(r"[^a-zàâçéèêëîïôûùüÿœ0-9]","",w.lower())
sm=difflib.SequenceMatcher(None,[norm(w) for w in S],[norm(w['w']) for w in W],autojunk=False)
T=[None]*len(S)
for i,j,n in sm.get_matching_blocks():
    for k in range(n): T[i+k]=(W[j+k]['s'],W[j+k]['e'])
for i in range(len(S)):
    if T[i] is None:
        p=next((T[k] for k in range(i-1,-1,-1) if T[k]),(0,0)); q=next((T[k] for k in range(i+1,len(S)) if T[k]),(p[1]+0.3,p[1]+0.6))
        T[i]=(p[1],max(p[1]+0.05,min(q[0],p[1]+0.3)))
w=wave.open(sys.argv[3]);sr=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)
cuts=[]
for i in range(len(S)-1):
    e1,s2=T[i][1],T[i+1][0]
    if s2-e1>B+0.02: m=(e1+s2)/2;r=(s2-e1-B)/2;cuts.append((m-r,m+r))
def nt(t): return t-sum(min(max(t-a,0),b-a) for a,b in cuts)
parts=[];pos=0;f=int(0.015*sr)
for c0,c1 in cuts:
    seg=x[int(pos*sr):int(c0*sr)].copy();seg[-f:]*=np.linspace(1,0,f)
    if pos>0: seg[:f]*=np.linspace(0,1,f)
    parts.append(seg);pos=c1
seg=x[int(pos*sr):].copy();seg[:f]*=np.linspace(0,1,f);parts.append(seg)
y=np.concatenate(parts)
o=wave.open(out+'/voix_court.wav','w');o.setnchannels(1);o.setsampwidth(2);o.setframerate(sr);o.writeframes(y.astype(np.int16).tobytes());o.close()
json.dump({'duree':round(len(y)/sr/K,3),'mots':[{'w':S[i],'s':round(nt(T[i][0])/K,3),'e':round(nt(T[i][1])/K,3),'seg':0} for i in range(len(S))]},open(out+'/minutage.json','w'),ensure_ascii=False)
print('court',round(len(y)/sr,2),'final',round(len(y)/sr/K,2))
