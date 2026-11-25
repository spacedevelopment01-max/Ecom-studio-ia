# accelere.py <minutage.json source> <facteur> <sortie minutage> : divise tous les temps par le facteur
import json,sys
d=json.load(open(sys.argv[1])); K=float(sys.argv[2])
for m in d['mots']: m['s']=round(m['s']/K,3); m['e']=round(m['e']/K,3)
for g in d.get('segments',[]): g['s']=round(g['s']/K,3); g['e']=round(g['e']/K,3)
d['duree']=round(d['duree']/K,3); json.dump(d,open(sys.argv[3],'w'),ensure_ascii=False); print('voix',d['duree'])
