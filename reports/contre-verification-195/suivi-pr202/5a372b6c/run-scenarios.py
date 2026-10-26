from pathlib import Path
import os,subprocess,json
root=Path('/tmp/ecs-202-candidat-5a372b6c');out=Path('/tmp/ecs-202-preuves/5a372b6c')
common=dict(os.environ);common['NODE_OPTIONS']='--max-old-space-size=1536 --import='+str(root/'scripts/lot9/network-guard.mjs')+' --import='+str(root/'scripts/contre-verification-202-network.mjs');common['PROBE_202_MODE']='deny';common['PROBE_202_DENY_DOC_CACHE']='1'
cases=[('runtime-bundle-vide',{'PROBE_202_CORRUPT_BUNDLED':'1'}),('runtime-racine-fournie-1',{'SHOPIFY_TLD_ROOT':'/tmp/ecs-202-preuves/docs-corrompus-sortie','PROBE_202_MODE':'empty-preset'}),('runtime-racine-fournie-2',{'SHOPIFY_TLD_ROOT':'/tmp/ecs-202-preuves/docs-corrompus-sortie','PROBE_202_MODE':'empty-preset'}),('runtime-schema-invalide',{'PROBE_202_INVALID':'schema'})]
results=[]
for name,changes in cases:
 env=dict(common);env.pop('XDG_CACHE_HOME',None);env.update(changes);env['PROBE_202_TRACE']=str(out/(name+'-trace.jsonl'))
 args=[str(root/'node_modules/.bin/tsx'),'scripts/contre-verification-202-runtime.ts',str(out/(name+'.json'))]
 with open(out/(name+'.log'),'w') as log:r=subprocess.run(args,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
 (out/(name+'.exit')).write_text(str(r.returncode)+'\n');assert r.returncode==0,name
 d=json.loads((out/(name+'.json')).read_text());assert d['environmentUnchanged'],name
 if name=='runtime-bundle-vide':assert d.get('outcome')=='thrown' and d.get('errorClass')=='ShopifyDocsError',d
 elif name=='runtime-schema-invalide':assert d['available'] and d['errors']==1 and d['validSchemaErrors']==1,d
 else:assert d['available'] and d['errors']==0,d
 rows=[json.loads(l) for l in (out/(name+'-trace.jsonl')).read_text().splitlines()];assert not any(x['event'] in ['forbidden-doc-cache-io','fake-doc-request'] for x in rows),rows
 results.append({'case':name,'passed':True,'exit':r.returncode,'docsDownloads':0,'docsCacheIo':0})
 print(json.dumps(results[-1]),flush=True)
(out/'scenarios-synthese.json').write_text(json.dumps({'source':'5a372b6c87b899bdbf1473386160bed7ff20c847','cases':results,'realProviderCalls':0},indent=2)+'\n')
