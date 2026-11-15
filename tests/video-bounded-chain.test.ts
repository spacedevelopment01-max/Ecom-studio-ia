/** Vrai SDK Anthropic vers loopback + adaptateurs médias natifs à transport injecté.
 * FFmpeg, fichiers, réservations et règlements réels isolés ; clips neutres/tonalité, aucune qualité IA prouvée. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {beforeAll,afterAll,beforeEach,it,expect,vi} from 'vitest';
vi.mock('@/lib/public-download',()=>import('./public-download-double'));
import {account,project} from './conversation209-fixtures';
import {validatedBrand} from './preparation-mission-fixtures';
import {seedCutout} from './image-v2-fixtures';
import {loadProject} from '@/lib/projects';
import {createProduct} from '@/lib/products/catalog';
import {all,id,one} from '@/lib/db';
import {setSetting} from '@/lib/settings';
import {MEDIA_MODELS} from '@/lib/ai/media-models';
import {mediaStatus} from '@/lib/ai/media-routing';
import {DEFAULT_ROUTES} from '@/lib/ai/config';
import {mediaPoll} from '@/lib/ai/media-providers';
import {wanVideoBody} from '@/lib/ai/alibaba';
import {withTrace} from '@/lib/ai/trace';
import {pinImageAsset,type ImageBinding} from '@/lib/image-v2/request-binding';
import {boundedSceneQuote,assertBoundedSceneQuote} from '@/lib/video-v2/bounded-quote';
import {runThreeScenes,realThreeScenesDeps,type ThreeScenesRequest,type ScenePlan} from '@/lib/video-v2/three-scenes';
import {approveVideoScenario,sceneApprovalRequest} from '@/lib/video-v2/approval';
import {assetData,getAsset} from '@/lib/library';
import {rememberPreference} from '@/lib/video-v2/creative-memory';
import {latestVideo} from '@/lib/video-v2/store';
import {tmpDir} from '@/lib/storage';
import {enqueue,claimNext,JobContext,completeJob,failJob} from '@/lib/jobs';
import {videoByteFixture} from './video-byte-fixture';
const model=MEDIA_MODELS.find(m=>m.provider==='alibaba'&&m.caps.textToVideo&&m.caps.imageToVideo&&m.adapter==='alibaba_video')!.model;
const state={mode:'ok',clips:0,checks:0,voices:0,tokenCounts:0,prompts:[]as string[],qcPrompts:[]as string[]};let wave:Buffer;
const complete={score:9,sameProduct:true,foreignBrands:[],textCorrect:null,productAltered:false,characterConsistent:null,offTopic:false,artifacts:false,personVisible:false,issues:[]};
const server=http.createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;const b=JSON.parse(raw||'{}');if(req.url?.endsWith('/count_tokens')){state.tokenCounts++;res.setHeader('content-type','application/json');res.end(JSON.stringify({input_tokens:1000}));return;}state.checks++;state.qcPrompts.push(JSON.stringify(b.messages));res.writeHead(200,{'content-type':'text/event-stream'});const event=(type:string,rest:object)=>res.write(`event: ${type}\ndata: ${JSON.stringify({type,...rest})}\n\n`);event('message_start',{message:{id:'qc-'+state.checks,type:'message',role:'assistant',model:b.model,content:[],stop_reason:null,stop_sequence:null,usage:{input_tokens:1000,output_tokens:0}}});event('content_block_start',{index:0,content_block:{type:'text',text:''}});const review=state.mode==='qc-missing-person'?Object.fromEntries(Object.entries(complete).filter(([key])=>key!=='personVisible')):complete;event('content_block_delta',{index:0,delta:{type:'text_delta',text:JSON.stringify(review)}});event('content_block_stop',{index:0});event('message_delta',{delta:{stop_reason:'end_turn',stop_sequence:null},usage:{output_tokens:300}});event('message_stop',{});res.end();});
let nativeFetch:typeof fetch,baseUrl:string;
beforeAll(async()=>{nativeFetch=fetch;await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const a=server.address();if(!a||typeof a==='string')throw Error('loopback');baseUrl='http://127.0.0.1:'+a.port;vi.stubEnv('ANTHROPIC_BASE_URL',baseUrl);const dir=tmpDir('voice-fixture');try{const file=path.join(dir,'tone.wav');execFileSync('ffmpeg',['-y','-v','error','-f','lavfi','-i','sine=frequency=330:duration=0.5',file]);wave=fs.readFileSync(file);}finally{fs.rmSync(dir,{recursive:true,force:true});}});
afterAll(async()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();await new Promise<void>(resolve=>server.close(()=>resolve()));});
beforeEach(()=>{
 Object.assign(state,{mode:'ok',clips:0,checks:0,voices:0,tokenCounts:0,prompts:[],qcPrompts:[]});
 for(const provider of ['anthropic','alibaba','openai'])setSetting('provider.'+provider+'.disabled',null);
 setSetting('provider.anthropic.apiKey','fake-loopback-not-a-secret');setSetting('provider.alibaba.apiKey','fake-transport-not-a-secret');setSetting('provider.openai.apiKey','fake-audio-not-a-secret');setSetting('ai.routes',JSON.stringify({quality_control:DEFAULT_ROUTES.quality_control}));setSetting('ai.media.models',JSON.stringify({['alibaba:'+model]:{enabled:true,confirmedAt:Date.now()}}));setSetting('ai.media.usage',JSON.stringify({text_video:{mode:'manual',primary:'alibaba:'+model},product_video:{mode:'manual',primary:'alibaba:'+model}}));mediaPoll.wanMs=1;
 vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;if(url.startsWith(baseUrl+'/'))return nativeFetch(input,init);
  if(url==='https://cdn.fixture.invalid/neutral.mp4')return new Response(new Uint8Array(videoByteFixture()),{headers:{'content-type':'video/mp4'}});
  if(url.includes('/services/aigc/video-generation/video-synthesis')){state.clips++;const b=JSON.parse(String(init?.body));state.prompts.push(b.input.prompt);if(state.mode==='second-503'&&state.clips===2)return new Response('{"error":"simulated"}',{status:503});return Response.json({output:{task_id:'fixture-'+state.clips,task_status:'PENDING'}});}
  if(url.includes('/tasks/fixture-'))return Response.json({output:{task_id:'fixture',task_status:'SUCCEEDED',video_url:'https://cdn.fixture.invalid/neutral.mp4'}});
  if(url==='https://api.openai.com/v1/audio/speech'){state.voices++;return new Response(new Uint8Array(wave),{headers:{'content-type':'audio/wav'}});}
  throw Error('External request forbidden in this fixture: '+new URL(url).origin);
 });
});
async function fixture(voiced=false,speech?:'project'|'none'){
 const u=await account(),pid=project(u);validatedBrand(pid);const a=await seedCutout(u.id,pid),item=createProduct(pid,{title:'Presse de linogravure',description_html:'Une presse pour plaques de linoléum.',images:[{assetId:a,alt:''}]});
 const binding:ImageBinding={schema:1,people:'none',references:[pinImageAsset(u.id,pid,a,1)],product:{productId:item.id,version:item.version}};
 if(voiced){rememberPreference(pid,'voice','on');rememberPreference(pid,'voiceConsent','synthetic');rememberPreference(pid,'voiceId','openai:nova');}
 const p=loadProject(pid),request:ThreeScenesRequest&{voice?:'project'|'none'}={...(speech?{voice:speech}:{}),as:'ad',generation:'reference',scenes:2,totalS:10,aspect:'9:16',music:false,binding,request:'Plan entier.\nDeux  espaces.'},plan:ScenePlan={scenes:[0,1].map(k=>({still:`La presse entière sur une table claire, angle ${k+1}.`,motion:'La caméra avance lentement.',title:'',...(voiced?{voice:k===0?'Une phrase entière.':'Une seconde phrase entière.'}:{})})),line:'',cta:''};
 expect(mediaStatus(MEDIA_MODELS.find(m=>m.provider==='alibaba'&&m.model===model)!)).toMatchObject({usable:true,enabled:true});const quote=boundedSceneQuote(p,request,plan);request.quotedGeneration=quote;request.approval=approveVideoScenario(p,sceneApprovalRequest(request),plan,quote.capMicro).approval;
 const job=enqueue({userId:u.id,projectId:pid,type:'video.scenes',label:'FAUX fournisseur — recette',payload:{projectId:pid,request,costCapMicro:quote.capMicro},idempotencyKey:'bounded-fixture:'+id(),maxAttempts:1});const claimed=claimNext(['video.scenes']);expect(claimed?.id).toBe(job.id);const ctx=new JobContext(claimed!);
 const launch=()=>withTrace({jobId:job.id,costCapMicro:quote.capMicro},()=>runThreeScenes(ctx,pid,request,realThreeScenesDeps(ctx,{userId:u.id,projectId:pid},{aiText:true,request})));
 return{u,pid,p,request,plan,quote,job,ctx,launch};
}
it('devis sans HTTP puis deux clips, deux QC stricts et deux audios acquis : vrais fichiers et règlements sous le plafond',async()=>{
 const f=await fixture(true);expect(state.clips+state.checks+state.voices).toBe(0);expect(f.quote.maximumCalls).toBe(6);assertBoundedSceneQuote(JSON.parse(JSON.stringify(f.quote)));const r=await f.launch();completeJob(f.job.id,r);
 expect(state.clips).toBe(2);expect(state.checks).toBe(2);expect(state.voices).toBe(2);expect(state.prompts).toEqual(f.quote.scenes.map(s=>wanVideoBody({model:f.quote.clip!.model,prompt:s.prompt,image:s.reference?'fixture-reference':null,seconds:f.quote.seconds,people:false}).input.prompt));
 const saved=latestVideo(f.pid,r.docKey)!;expect(saved.doc.audio.voice).toHaveLength(2);expect(saved.doc.audio.voice.every(v=>assetData(getAsset(v.assetId!)!).equals(wave))).toBe(true);expect(r.videoAssetId).toBeTruthy();expect(assetData(getAsset(r.videoAssetId!)!).length).toBeGreaterThan(1000);
 const usage=all<{cost:number}>('SELECT cost FROM usage_events WHERE project_id=?',f.pid),reservations=all<{status:string;amount:number;actual:number}>('SELECT status,amount,actual FROM ai_reservations WHERE project_id=?',f.pid);expect(usage).toHaveLength(6);expect(reservations).toHaveLength(6);expect(reservations.every(r=>r.status==='settled'&&r.actual<=r.amount)).toBe(true);expect(reservations.reduce((n,r)=>n+r.amount,0)).toBeLessThanOrEqual(f.quote.capMicro);expect(usage.reduce((n,r)=>n+r.cost,0)).toBeLessThanOrEqual(f.quote.capMicro);
},60000);
it('QC incomplet payé : usage connu réglé, premier clip conservé, aucune acceptation ni relance',async()=>{
 const f=await fixture();state.mode='qc-missing-person';await expect(f.launch()).rejects.toThrow();expect(state.clips).toBe(1);expect(state.checks).toBe(1);expect(all('SELECT id FROM usage_events WHERE project_id=?',f.pid)).toHaveLength(2);expect(all<{status:string}>('SELECT status FROM ai_reservations WHERE project_id=?',f.pid).every(r=>r.status==='settled')).toBe(true);const assets=all<{id:string}>('SELECT id FROM assets WHERE project_id=? AND role=\'clip\'',f.pid);expect(assets).toHaveLength(1);const bytes=assetData(getAsset(assets[0].id)!);expect(bytes.equals(videoByteFixture())).toBe(true);await expect(f.launch()).rejects.toThrow();expect(state.clips).toBe(1);expect(state.checks).toBe(1);expect(assetData(getAsset(assets[0].id)!)).toEqual(bytes);failJob(f.job,new Error('QC fictif refusé'),{permanent:true});
},60000);
it('503 au deuxième clip : acquis conservé, réserve incertaine, aucune génération répétée ou secours',async()=>{
 const f=await fixture();state.mode='second-503';await expect(f.launch()).rejects.toThrow();expect(state.clips).toBe(2);expect(state.checks).toBe(1);expect(all<{status:string}>('SELECT status FROM ai_reservations WHERE project_id=?',f.pid).filter(r=>r.status==='uncertain')).toHaveLength(1);expect(all('SELECT id FROM usage_events WHERE project_id=?',f.pid)).toHaveLength(2);await expect(f.launch()).rejects.toThrow();expect(state.clips).toBe(2);expect(state.checks).toBe(1);failJob(f.job,new Error('503 fictif'),{permanent:true});
},60000);
it('plafond général insuffisant : zéro envoi média, aucun relèvement du devis',async()=>{const f=await fixture();await expect(withTrace({jobId:f.job.id,costCapMicro:1},()=>runThreeScenes(f.ctx,f.pid,f.request,realThreeScenesDeps(f.ctx,{userId:f.u.id,projectId:f.pid},{aiText:true,request:f.request})))).rejects.toThrow();expect(state.clips).toBe(0);expect(state.checks).toBe(0);failJob(f.job,new Error('limite de recette'),{permanent:true});});
it('un devis falsifié ou le mode images intermédiaires ne devient pas un consentement génératif',async()=>{const f=await fixture();expect(()=>assertBoundedSceneQuote({...f.quote,capMicro:f.quote.capMicro+1})).toThrow();expect(()=>boundedSceneQuote(f.p,{...f.request,generation:'staged'},f.plan)).toThrow();expect(state.clips+state.checks).toBe(0);failJob(f.job,new Error('arrêt de recette'),{permanent:true});});
it('sans voix pour cette vidéo : aucun achat vocal, sous-titres intacts et préférence du projet conservée',async()=>{const f=await fixture(true,'none'),before=all("SELECT key,value,status FROM memory WHERE project_id=? AND key LIKE 'video.pref.%' ORDER BY key",f.pid),r=await f.launch();completeJob(f.job.id,r);expect(state.voices).toBe(0);expect(f.quote.maximumCalls).toBe(4);expect(f.quote.voice).toBeNull();const doc=latestVideo(f.pid,r.docKey)!.doc;expect(doc.audio.voice).toEqual([]);expect(doc.subtitles.cues.map(c=>c.text).join(' ')).toBe('Une phrase entière. Une seconde phrase entière.');expect(all("SELECT key,value,status FROM memory WHERE project_id=? AND key LIKE 'video.pref.%' ORDER BY key",f.pid)).toEqual(before);},60000);
it('une voix désactivée ne bloque pas un devis explicitement sans voix',async()=>{const f=await fixture(true);setSetting('provider.openai.disabled','1');const q=boundedSceneQuote(f.p,{...f.request,voice:'none'} as ThreeScenesRequest,f.plan);expect(q.voice).toBeNull();expect(q.maximumCalls).toBe(4);expect(state.clips+state.checks+state.voices).toBe(0);failJob(f.job,new Error('arrêt de recette'),{permanent:true});});

it('reprise native réelle d’un seul clip avec référence : un SDK clip, un QC strict, aucun audio racheté',async()=>{const f=await fixture(true),first=await f.launch();completeJob(f.job.id,first);const before=latestVideo(f.pid,first.docKey)!.doc,{quoteClipRevision,applyClipRevision}=await import('@/lib/video-v2/clip-revision'),request={clipId:before.clips[1].id,generation:'reference' as const,scene:{still:'La presse entière près d’une fenêtre, cadre plus large.',motion:'La caméra avance sans modifier le produit.'},reference:f.request.binding!.references[0]},q=quoteClipRevision(f.pid,before,request,'Remplace uniquement le deuxième clip.\nDeux  espaces.');expect(q.maximumCalls).toBe(2);const job=enqueue({userId:f.u.id,projectId:f.pid,type:'video.v2.render',label:'Reprise native — SDK simulé',payload:{costCapMicro:q.capMicro},maxAttempts:1}),j=claimNext(['video.v2.render'])!;expect(j.id).toBe(job.id);const r=await withTrace({jobId:j.id,costCapMicro:q.capMicro},()=>applyClipRevision(new JobContext(j),f.pid,before,q));completeJob(j.id,{assetId:r.assetId});expect(state.clips).toBe(3);expect(state.checks).toBe(3);expect(state.voices).toBe(2);expect(r.doc.audio).toEqual(before.audio);expect(r.doc.subtitles).toEqual(before.subtitles);expect(r.doc.clips[0]).toEqual(before.clips[0]);const reservations=all<{amount:number;actual:number;status:string}>('SELECT amount,actual,status FROM ai_reservations WHERE job_id=?',j.id);expect(reservations).toHaveLength(2);expect(reservations.every(v=>v.status==='settled'&&v.actual<=v.amount)).toBe(true);expect(reservations.reduce((n,v)=>n+v.amount,0)).toBeLessThanOrEqual(q.capMicro);},60000);
