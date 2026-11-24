# Petite marche comique en cordes pincées (fabriquée par le code, gratuite)
import numpy as np, wave, sys
R=44100; rng=np.random.default_rng(7)
def pizz(f,d,amort=0.985,clair=0.5):
    N=max(2,int(R/f)); buf=rng.uniform(-1,1,N); out=np.zeros(int(R*d))
    for i in range(len(out)):
        out[i]=buf[i%N]; buf[i%N]=amort*(clair*buf[i%N]+(1-clair)*buf[(i+1)%N])
    env=np.exp(-np.arange(len(out))/R*9); return out*env
def note(n): return 440*2**((n-69)/12)
bpm=118; c=60/bpm/2  # croche
# accords (basse, accord) en ré majeur : I V I V | IV I V I
acc=[(50,[62,66,69]),(45,[61,64,69]),(50,[62,66,69]),(45,[61,64,67]),(43,[62,67,71]),(50,[62,66,69]),(45,[61,64,67]),(50,[62,66,69])]
mel=[[74,None,78,None,81,78,None,74],[73,None,76,None,81,None,None,None],[74,None,78,None,81,83,81,78],[76,None,73,None,69,None,None,None],
     [79,None,83,None,79,None,76,None],[78,None,74,None,78,81,None,None],[76,78,76,73,69,None,73,None],[74,None,None,None,62,None,None,None]]
L=int(R*c*8); morceau=np.zeros(L*8+R)
for b,(basse,ac) in enumerate(acc):
    o=b*L
    for k in range(8):
        i=o+int(k*c*R)
        if k in (0,4):
            s=pizz(note(basse-12 if k==0 else basse-5),0.5,0.99,0.5)*0.9; morceau[i:i+len(s)]+=s
        if k in (2,6):
            for n in ac:
                s=pizz(note(n),0.25,0.98,0.5)*0.35; morceau[i:i+len(s)]+=s
        n=mel[b][k]
        if n:
            s=pizz(note(n),0.3,0.985,0.55)*0.6; morceau[i:i+len(s)]+=s
duree=float(sys.argv[2]); total=int(R*duree); out=np.zeros(total)
j=0
while j<total:
    seg=morceau[:min(L*8,total-j)]; out[j:j+len(seg)]+=seg; j+=L*8
out=out/np.max(np.abs(out))*0.9
w=wave.open(sys.argv[1],'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(R); w.writeframes((out*32767).astype(np.int16).tobytes()); w.close()
print('ok', duree)
