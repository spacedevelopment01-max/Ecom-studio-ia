# raccourcit.py <alignement.json> <voix.wav> <sortie.wav> <minutage.json> <K> [blanc max]
# garde au plus <blanc> secondes de silence entre deux mots, puis divise les temps par K (l'accélération se fait ensuite avec atempo=K)
import json,wave,sys,numpy as np
al=json.load(open(sys.argv[1])); K=float(sys.argv[5]); B=float(sys.argv[6]) if len(sys.argv)>6 else 0.38
W=[];cur='';s=e=0
for c,a,b in zip(al['characters'],al['character_start_times_seconds'],al['character_end_times_seconds']):
    if c.isspace():
        if cur: W.append([cur,s,e]);cur=''
        continue
    if not cur: s=a
    cur+=c;e=b
if cur: W.append([cur,s,e])
w=wave.open(sys.argv[2]);sr=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)
cuts=[]
for (a,_,e1),(b,s2,_) in zip(W,W[1:]):
    if s2-e1>B+0.02:
        m=(e1+s2)/2; r=(s2-e1-B)/2; cuts.append((m-r,m+r))
def nt(t): return t-sum(min(max(t-a,0),b-a) for a,b in cuts)
parts=[];pos=0;f=int(0.015*sr)
for a,b in cuts:
    seg=x[int(pos*sr):int(a*sr)].copy(); seg[-f:]*=np.linspace(1,0,f)
    if pos>0: seg[:f]*=np.linspace(0,1,f)
    parts.append(seg);pos=b
seg=x[int(pos*sr):].copy();seg[:f]*=np.linspace(0,1,f);parts.append(seg)
y=np.concatenate(parts)
o=wave.open(sys.argv[3],'w');o.setnchannels(1);o.setsampwidth(2);o.setframerate(sr);o.writeframes(y.astype(np.int16).tobytes());o.close()
json.dump({'duree':round(len(y)/sr/K,3),'mots':[{'w':a,'s':round(nt(s)/K,3),'e':round(nt(e)/K,3),'seg':0} for a,s,e in W]},open(sys.argv[4],'w'),ensure_ascii=False)
print('court',round(len(y)/sr,2),'final',round(len(y)/sr/K,2))
