import numpy as np,wave
R=44100
def ecrire(p,x):
    x=x/np.max(np.abs(x))*0.9; w=wave.open(p,'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(R); w.writeframes((x*32767).astype(np.int16).tobytes()); w.close()
t=lambda d: np.arange(int(d*R))/R
rng=np.random.default_rng(3)
# ---- modem : tonalité, numérotation, réponse, chants de négociation, souffle ----
s=[]
s.append(0.4*(np.sin(2*np.pi*350*t(0.35))+np.sin(2*np.pi*440*t(0.35))))
DT={'1':(697,1209),'3':(697,1477),'6':(770,1477),'0':(941,1336),'8':(852,1336),'2':(697,1336),'4':(770,1209)}
for c in '3612048':
    lo,hi=DT[c]; s.append(0.45*(np.sin(2*np.pi*lo*t(0.07))+np.sin(2*np.pi*hi*t(0.07)))); s.append(np.zeros(int(0.03*R)))
s.append(np.zeros(int(0.12*R)))
s.append(0.6*np.sin(2*np.pi*2100*t(0.45)))                      # réponse
tt=t(0.35); s.append(0.5*np.sin(2*np.pi*(980+200*np.sign(np.sin(2*np.pi*12*tt)))*tt))  # gazouillis
tt=t(0.5); s.append(0.5*np.sin(2*np.pi*np.cumsum(1200+900*np.sin(2*np.pi*3*tt))/R))     # sirène
s.append(0.35*rng.standard_normal(int(0.25*R)))                 # chhhh
tt=t(0.4); s.append(0.4*np.sin(2*np.pi*(1650+150*np.sign(np.sin(2*np.pi*40*tt)))*tt)+0.25*rng.standard_normal(len(tt)))
s.append(0.45*rng.standard_normal(int(0.3*R))*np.linspace(1,0.2,int(0.3*R)))
m=np.concatenate(s)
# son de téléphone : bande étroite
f=np.fft.rfft(m); fr=np.fft.rfftfreq(len(m),1/R); f[(fr<300)|(fr>3400)]=0; m=np.fft.irfft(f,len(m))
ecrire('modem.wav',m); print('modem',round(len(m)/R,2))
# ---- piano doux : la mineur, fa, do, sol, en arpèges ----
def note(fq,d=2.6,v=1.0):
    x=t(d); e=np.exp(-x*2.2)*(1-np.exp(-x*300))
    return v*e*(np.sin(2*np.pi*fq*x)+0.35*np.sin(2*np.pi*2*fq*x)*np.exp(-x*3)+0.12*np.sin(2*np.pi*3*fq*x)*np.exp(-x*5))
mid=lambda n: 440*2**((n-69)/12)
ACC=[[57,60,64,69],[53,57,60,65],[48,55,60,64],[55,59,62,67]]
D=68; y=np.zeros(int((D+4)*R)); beat=60/72
k=0;pos=0.0
while pos<D:
    a=ACC[(k//1)%4]
    for j,n in enumerate([a[0],a[1],a[2],a[3],a[2],a[1]]):
        st=int((pos+j*beat/2)*R); x=note(mid(n+12 if j==3 else n),v=0.7 if j else 1.0); y[st:st+len(x)]+=x[:len(y)-st]
    bas=note(mid(a[0]-12),d=4,v=0.8); st=int(pos*R); y[st:st+len(bas)]+=bas[:len(y)-st]
    pos+=beat*3; k+=1
# petite réverbération
ir=rng.standard_normal(int(1.6*R))*np.exp(-np.arange(int(1.6*R))/R*3.5)*0.02
y=y+np.convolve(y,ir)[:len(y)]
y=y[:int(D*R)]; fo=int(3*R); y[-fo:]*=np.linspace(1,0,fo); y[:int(1.5*R)]*=np.linspace(0,1,int(1.5*R))
ecrire('piano.wav',y); print('piano',D)
