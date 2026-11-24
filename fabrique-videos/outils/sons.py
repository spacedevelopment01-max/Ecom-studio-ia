import numpy as np, wave, sys, os
R=44100; out=sys.argv[1]; os.makedirs(out,exist_ok=True)
rng=np.random.default_rng(3)
def save(n,x,vol=0.8):
    x=np.asarray(x,dtype=np.float64); m=np.max(np.abs(x)) or 1; x=x/m*vol
    w=wave.open(f'{out}/{n}.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(R)
    w.writeframes((x*32767).astype(np.int16).tobytes()); w.close()
def T(d): return np.arange(int(R*d))/R
def osc(freq,d):  # freq array or scalar
    t=T(d); f=np.broadcast_to(np.asarray(freq,dtype=float),t.shape) if np.ndim(freq)==0 else freq
    return np.sin(2*np.pi*np.cumsum(f)/R)
def lp(x,a): # simple one-pole lowpass
    y=np.zeros_like(x); s=0
    for i,v in enumerate(x): s+=a*(v-s); y[i]=s
    return y
t=T(0.18); save('pop', osc(500+3500*t,0.18)*np.exp(-t*22))
t=T(0.5); n=rng.standard_normal(len(t)); env=np.sin(np.pi*t/0.5)**2
save('whoosh', (lp(n,0.25)-lp(n,0.04))*env, 0.5)
t=T(0.35); save('tampon', np.sin(2*np.pi*85*t)*np.exp(-t*14)+0.5*rng.standard_normal(len(t))*np.exp(-t*45))
t=T(0.3); save('caisse', np.sin(2*np.pi*65*t)*np.exp(-t*16)+0.35*lp(rng.standard_normal(len(t)),0.3)*np.exp(-t*30),0.7)
# trombone triste
notes=[(392,0.32),(370,0.32),(349,0.32),(330,0.9)]; parts=[]
for i,(f,d) in enumerate(notes):
    t=T(d); fr=f*(1+(0.012*np.sin(2*np.pi*6*t) if i==3 else 0))
    s=osc(fr,d); s=s+0.5*np.sign(s)*np.abs(s)**3+0.3*osc(fr*2,d)
    env=np.minimum(1,t/0.03)*np.minimum(1,(d-t)/0.08); parts.append(s*env)
save('triste', np.concatenate(parts),0.55)
x=np.zeros(int(R*0.5))
for k in range(8):
    i=int(k*0.055*R); t=T(0.05)
    x[i:i+len(t)]+=rng.standard_normal(len(t))*np.exp(-t*90)+np.sin(2*np.pi*110*t)*np.exp(-t*60)
save('rafale',x,0.8)
t=T(0.06); save('clic', (np.sin(2*np.pi*2800*t)+0.6*np.sin(2*np.pi*4100*t))*np.exp(-t*140),0.6)
t=T(0.45); save('boing', osc(170+90*np.exp(-t*5)*np.sin(2*np.pi*14*t)+60*np.exp(-t*8),0.45)*np.exp(-t*6),0.55)
t=T(0.4); save('ping', osc(2600*np.exp(-t*2.2)+900,0.4)*np.exp(-t*9),0.4)
t=T(0.3); save('ampoule', osc(1200+np.where(t<0.12,0,600),0.3)*np.exp(-t*8),0.45)
# musique : petit air pincé façon ukulélé (Karplus-Strong), 104 battements par minute
def pluck(f,d):
    N=int(R/f); buf=rng.uniform(-1,1,N); out=np.zeros(int(R*d))
    for i in range(len(out)):
        out[i]=buf[i%N]; buf[i%N]=0.996*0.5*(buf[i%N]+buf[(i+1)%N])
    return out
bpm=104; e=60/bpm/2
acc=[[261.6,329.6,392.0],[196.0,246.9,392.0],[220.0,261.6,329.6],[174.6,220.0,349.2]]
motif=[0,1,2,1,0,2,1,2]
bars=[]
for a in acc:
    bar=np.zeros(int(R*e*8)+R)
    for k,ix in enumerate(motif):
        s=pluck(a[ix]*(2 if k in (3,6) else 1),0.9)*(1.0 if k%2==0 else 0.7)
        i=int(k*e*R); bar[i:i+len(s)]+=s
        if k==0:
            b=pluck(a[0]/2,1.2); bar[i:i+len(b)]+=0.8*b
    bars.append(bar)
L=int(R*e*8); total=int(R*78); mus=np.zeros(total+2*R)
j=0;k=0
while j<total:
    b=bars[k%4]; mus[j:j+len(b)]+=b; j+=L; k+=1
save('musique',mus[:total],0.9)
print('ok')
