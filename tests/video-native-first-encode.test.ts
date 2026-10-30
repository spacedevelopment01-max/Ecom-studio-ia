/** Reprise locale : vrai MP4 acquis, encodeur injecté ; pas un test de génération ni de qualité créative. */
import {afterEach,it,expect,vi}from 'vitest';
import fs from 'node:fs';import path from 'node:path';
import {createUser}from '@/lib/auth';
import {loadProject}from '@/lib/projects';
import {createProduct}from '@/lib/products/catalog';
import {all,run}from '@/lib/db';
import {imageBindingHash,type ImageBinding}from '@/lib/image-v2/request-binding';
import {sceneSubjectContext}from '@/lib/video-v2/subject-binding';
import {videoContext}from '@/lib/video-v2/editorial';
import {buildSceneDoc,localScenePlan,sceneTiming}from '@/lib/video-v2/three-scenes';
import {renderLatest}from '@/lib/video-v2/engine';
import * as store from '@/lib/video-v2/store';
import {getAsset,assetMeta,assetData}from '@/lib/library';
import {tmpDir}from '@/lib/storage';
import {seedImageFixture}from './image-v2-fixtures';
import {videoByteFixture}from './video-byte-fixture';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it.each([{service:false,legacy:true,invalid:false},{service:false,legacy:false,invalid:false},{service:true,legacy:true,invalid:false},{service:true,legacy:false,invalid:false},{service:false,legacy:true,invalid:true}])('premier encodeur repris conserve l’offre figée : %j',async({service,legacy,invalid})=>{
 vi.stubGlobal('fetch',vi.fn(()=>{throw Error('No provider request in local recovery');}));
 const u=await createUser(`first-binding-${crypto.randomUUID()}@test.invalid`,'motdepasse-test','Fixture'),pid=seedImageFixture(u.id,service?'restaurant':'hightech');
 if(service)run('UPDATE projects SET business_json=? WHERE id=?',JSON.stringify({services:[{key:'ceramique',name:'Réparation de céramiques',description:'Constat et assemblage.'}]}),pid);
 createProduct(pid,{title:'Autre produit sans lien'});const target=createProduct(pid,{title:'Support pour cadres de sérigraphie'}),root=loadProject(pid);
 const binding:ImageBinding={schema:1,...(service?{service:{key:'ceramique',sha256:imageBindingHash(root.services.services[0])}}:{product:{productId:target.id,version:target.version}}),references:[],people:'none'};
 const req={as:'post' as const,generation:'direct' as const,binding,scenes:2,totalS:10,music:false},bound=sceneSubjectContext(root,req),plan=localScenePlan(bound.project,bound.subject,req),doc=buildSceneDoc(bound.project,[0,1].map(k=>({assetId:'acquired-'+k,durationS:5,generated:true})),plan,'9:16','post',sceneTiming(2,10));
 const exact='Ma demande complète.\nDeux  espaces.';doc.meta.editorial={...videoContext(bound.project,'post',exact,legacy?null:bound.subject),nativeBinding:invalid?{...binding,schema:0}:binding};
 const key='first-native-'+crypto.randomUUID();store.saveVideoVersion(pid,key,doc);const before=structuredClone(doc),ledger=()=>Object.fromEntries(['jobs','ai_calls','ai_reservations','usage_events'].map(t=>[t,all('SELECT id FROM '+t+' WHERE project_id=?',pid)])),initial=ledger();
 // Une modification du projet courant n’autorise jamais à réétiqueter l’ancien document.
 run("UPDATE projects SET product_json=json_set(product_json,'$.name','Un autre nom actuel') WHERE id=?",pid);
 const dir=tmpDir('first-native'),file=path.join(dir,'acquired.mp4'),bytes=videoByteFixture();fs.writeFileSync(file,bytes);
 vi.spyOn(store,'renderVideoFile').mockResolvedValue({file,dir,durationS:5,width:160,height:284,audio:{lufs:null,truePeakDb:null,durationS:5,silent:true},srt:'',vtt:'WEBVTT\n\n'});
 if(invalid){await expect(renderLatest(null,pid,key)).rejects.toThrow('Référence native du document invalide');expect(store.listVideoVersions(pid,key)).toHaveLength(1);expect(all("SELECT id FROM assets WHERE project_id=? AND role='video'",pid)).toHaveLength(0);expect(ledger()).toEqual(initial);expect(fetch).not.toHaveBeenCalled();return;}
 const result=await renderLatest(null,pid,key),asset=getAsset(result.videoAssetId)!,meta=assetMeta<any>(asset);
 expect(meta.scenes).toMatchObject({subject:{kind:service?'service':'product',key:service?'ceramique':target.id,name:bound.subject!.name},request:exact,mode:'ai',as:'post'});
 expect(assetData(asset)).toEqual(bytes);expect(store.listVideoVersions(pid,key)).toHaveLength(2);expect(store.latestVideo(pid,key)!.doc.clips).toEqual(before.clips);expect(store.latestVideo(pid,key)!.doc.audio).toEqual(before.audio);expect(ledger()).toEqual(initial);expect(fetch).not.toHaveBeenCalled();
});
