import json,subprocess,sys
sys.path.insert(0,'.')
SEG=[('voix',0,3.385,0.6),('voix',3.385,9.2,0.45),('voix',9.2,18.6,0.45),('voix',18.6,22.85,0.8),('voix',22.85,26.1,0.45),('voix',26.1,27.5,0.5),('voix',27.5,37.15,0.5),('voix',37.15,41.24,0.4),('voix',41.24,47.7,0.6),('voix',47.7,49.4,0.4),('voix',49.4,53.85,0.3),('voix',53.85,56.62,0.6),('voix',56.62,57.55,0.7),('voix',57.55,61.7,0)]
('voix',22.68,28.72,0.3),('ajout',0,4.68,0.45),('voix',28.72,33.10,0.7),('voix',33.10,34.60,0.55),
('voix',34.60,42.85,0.5),('voix',42.85,45.80,0.25),('ajout',4.68,10.17,0.6),('voix',45.80,48.50,0.3),
AL={'voix':json.load(open('alignement.json'))}
def words(al):
    out=[];cur='';s=e=0
    for c,a,b in zip(al['characters'],al['character_start_times_seconds'],al['character_end_times_seconds']):
        if c.isspace():
            if cur: out.append([cur,s,e]);cur=''
            continue
        if not cur: s=a
        cur+=c;e=b
    if cur: out.append([cur,s,e])
    return out
W={k:words(v) for k,v in AL.items()}
t=0;parts=[];allw=[];segs=[]
for i,(src,a,b,p) in enumerate(SEG):
    f=f'part{i}.wav'
    subprocess.run(['ffmpeg','-v','error','-y','-i',f'{src}.wav','-ss',str(a),'-to',str(b),'-af','afade=t=in:d=0.01,areverse,afade=t=in:d=0.015,areverse','-ar','44100','-ac','1',f],check=True)
    parts.append(f)
    for w,s,e in W[src]:
        m=(s+e)/2
        if a<=m<b and any(ch.isalnum() for ch in w):
            allw.append({'w':w,'s':round(t+s-a,3),'e':round(t+e-a,3),'seg':i})
    segs.append({'i':i,'s':round(t,3),'e':round(t+b-a,3)})
    t+=b-a
    if p>0:
        f=f'pause{i}.wav'
        subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','anullsrc=r=44100:cl=mono','-t',str(p),f],check=True)
        parts.append(f); t+=p
open('liste.txt','w').write(''.join(f"file '{x}'\n" for x in parts))
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i','liste.txt','-c','pcm_s16le','voix_finale.wav'],check=True)
json.dump({'duree':round(t,3),'mots':allw,'segments':segs},open('minutage.json','w'),ensure_ascii=False,indent=0)
print('durée voix',round(t,2))
for s in segs: print(s['i'],s['s'],s['e'],' '.join(w['w'] for w in allw if w['seg']==s['i']))
