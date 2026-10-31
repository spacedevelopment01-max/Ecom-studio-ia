import json
import os
P=os.path.dirname(os.path.abspath(__file__))
W={k:json.load(open(f'{P}/vo/{k}.json'))['words'] for k in ['v1','v2','v3','v4','v5']}
for k in W: W[k]=[w for w in W[k] if w['word'].strip()]
# (voix, début du placement, début du morceau dans le fichier, fin du morceau, groupes [(textes affichés)])
PL=[('v1',0.9,0,99,[["Vous","faites","du"],["travail","exceptionnel."],["Mais","combien","de"],["futurs","clients"],["le","savent ?"]]),
    ('v2',9.1,0,99,[["Créer","un","site,"],["gérer","les","réseaux,"],["préparer","les","publicités…"],["Et","trouver","le","temps"],["de","travailler ?"]]),
    ('v3',17.3,0,99,[["Et","si","tout"],["se","trouvait"],["au","même","endroit ?"]]),
    ('v4',22.5,0,0.84,[["Votre","logo,"]]),
    ('v4',28.7,0.84,1.80,[["votre","site,"]]),
    ('v4',32.3,1.80,2.79,[["vos","visuels,"]]),
    ('v4',34.7,2.79,3.69,[["vos","publicités."]]),
    ('v4',38.9,3.69,99,[["Et","Syna,"],["pour","tout","faire","évoluer"],["par","simple","conversation."]]),
    ('v5',46.8,0,99,[["Votre","savoir-faire"],["mérite","d'être","vu."]])]
caps=[]
for v,at,a,b,groups in PL:
    ws=[w for w in W[v] if w['start']>=a-0.05 and w['start']<b-0.005]
    base=4.0 if (v=='v4' and a==3.69) else a
    # « savoir-faire » et « d'être » : whisper découpe en deux mots
    merged=[];i=0
    flat=[x for g in groups for x in g]
    j=0
    for g in groups:
        out=[]
        for disp in g:
            n=len([p for p in disp.replace("'"," ").replace("-"," ").replace("…","").split(" ") if p and p not in ('?','.',',')])
            seg=ws[j:j+n]; j+=n
            s=max(at,seg[0]['start']-base+at); e=max(s+0.12,seg[-1]['end']-base+at)
            for q in seg: pass
            out.append({'w':disp,'s':round(max(at-0.04,s-0.08),3),'e':round(e,3)})
            if disp=='Et' and v=='v4': out[-1]['s']=round(at+0.02,3); out[-1]['e']=round(at+0.3,3)
        caps.append({'s':out[0]['s'],'e':out[-1]['e'],'w':out})
    assert j==len(ws),(v,at,j,len(ws),[w['word'] for w in ws])
# chaque groupe reste affiché jusqu'au suivant (au plus 0,6 s après son dernier mot)
for i,c in enumerate(caps):
    nxt=caps[i+1]['s'] if i+1<len(caps) else 99
    c['h']=round(min(nxt-0.02,c['e']+0.6),3)
open(P+'/assets/caps.js','w').write('window.CAPS='+json.dumps(caps,ensure_ascii=False)+';')
for c in caps: print(c['s'],c['h'],' '.join(w['w'] for w in c['w']))
