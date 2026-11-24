import json,subprocess,sys
sys.path.insert(0,'.')
SEG=[('voix', 0.0, 3.404, 0.15), ('voix', 3.701, 5.134, 0.15), ('voix', 5.431, 8.141, 0.15), ('voix', 8.856, 17.847, 0.15), ('voix', 18.562, 23.908, 0.15), ('voix', 24.622, 27.298, 0.15), ('voix', 27.501, 30.014, 0.15), ('voix', 30.311, 31.976, 0.15), ('voix', 32.529, 34.136, 0.15), ('voix', 34.34, 40.579, 0.15), ('voix', 40.876, 51.341, 0.15), ('voix', 51.545, 52.897, 0.15), ('voix', 53.739, 60.049, 0.15), ('voix', 60.554, 65.924, 0.15), ('voix', 66.429, 68.908, 0.15), ('voix', 69.274, 71.497, 0.15), ('voix', 72.211, 77.232, 0.15), ('voix', 77.529, 80.668, 0.15), ('voix', 81.081, 85.011, 0.15), ('voix', 85.214, 87.32, 0)]
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
