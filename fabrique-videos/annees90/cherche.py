import json,os,sys,urllib.request,urllib.parse
K=os.environ['PIXABAY_API_KEY']
Q={'modem':['old computer','retro computer','crt monitor'],'cassette':['cassette tape','cassette','walkman'],'console':['retro video game','arcade','joystick'],
   'telephone':['rotary phone','old telephone','telephone cord'],'photo':['film camera','analog camera','old photos'],'tele':['old television','crt tv','vintage tv'],
   'radio':['radio cassette','boombox','vintage radio'],'rdv':['kids bicycle','children playing outside','friends bicycle'],'ennui':['child summer','kids playing','childhood'],
   'parents':['vintage family','old family photo','parents child'],'vhs':['vhs overlay','vhs']}
out={}
for k,qs in Q.items():
    out[k]=[]
    for q in qs:
        u='https://pixabay.com/api/videos/?'+urllib.parse.urlencode({'key':K,'q':q,'per_page':6,'safesearch':'true'})
        d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'curl/8.5.0'})))
        for h in d['hits']:
            v=h['videos']; m=v.get('medium') or v.get('small')
            out[k].append({'id':h['id'],'q':q,'tags':h['tags'],'duree':h['duration'],'url':m['url'],'vignette':m.get('thumbnail'),'w':m['width'],'h':m['height'],'page':h['pageURL']})
json.dump(out,open('recherche/videos.json','w'),ensure_ascii=False,indent=0)
for k,v in out.items(): print(k,len(v))
