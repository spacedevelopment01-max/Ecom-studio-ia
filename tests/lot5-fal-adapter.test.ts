/** Native adapter, native billing, fake queue/download only. No provider network. */
import {it,expect,vi,afterEach,beforeEach} from 'vitest';
import sharp from 'sharp';
import {createUser} from '@/lib/auth';
import {seedImageFixture} from './image-v2-fixtures';
import {grantProjectPlan} from './communication-choice-fixture';
import {one,run,all} from '@/lib/db';
import {setSetting,setJsonSetting} from '@/lib/settings';
import {runForUser} from '@/lib/ai/access';
import {falClip,mediaPoll} from '@/lib/ai/media-providers';
import {falVideoRequest} from '@/lib/ai/fal-video-request';
const keys=['provider.fal.apiKey','provider.fal.disabled','ai.media.mode','ai.media.usage','ai.media.models','ai.prices'];
let previous:any[]=[],poll:number;
beforeEach(()=>{previous=keys.map(k=>one('SELECT * FROM settings WHERE key=?',k));poll=mediaPoll.falVideoMs;mediaPoll.falVideoMs=1;});
afterEach(()=>{vi.unstubAllGlobals();mediaPoll.falVideoMs=poll;keys.forEach((key,k)=>{const r=previous[k];if(r)run('INSERT INTO settings(key,value,secret,updated_at) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,secret=excluded.secret,updated_at=excluded.updated_at',r.key,r.value,r.secret,r.updated_at);else run('DELETE FROM settings WHERE key=?',key);});});
it.each(['standard','pro'])('Kling v3 %s : premier cadre, durée, son désactivé et réservation native avant envoi',async tier=>{
 const u=await createUser(`fal-${crypto.randomUUID()}@test.invalid`,'motdepasse-test','Fixture'),projectId=seedImageFixture(u.id,'hightech');grantProjectPlan(projectId,'dominer');
 const model=`fal-ai/kling-video/v3/${tier}/image-to-video`;
 setSetting('provider.fal.apiKey','fixture-fal-not-secret');setSetting('provider.fal.disabled',null);
 setJsonSetting('ai.media.usage',{product_video:{mode:'manual',primary:`fal:${model}`,backup:null}});setJsonSetting('ai.media.models',{[`fal:${model}`]:{confirmedAt:Date.now(),enabled:true}});
 setJsonSetting('ai.prices',{[`fal:${model}`]:{unit:'video_second',perSecond:tier==='pro'?.112:.084}});
 const image=await sharp({create:{width:64,height:96,channels:3,background:'#41392a'}}).jpeg().toBuffer();
 const posted:any[]=[];
 const fetch=vi.fn(async(input:any,init:any)=>{
 const url=String(input);
 if(init?.method==='POST'){
 expect(one<any>("SELECT status FROM ai_reservations WHERE project_id=?",projectId)?.status).toBe('held');posted.push(JSON.parse(init.body));
 return Response.json({status_url:'https://queue.fal.run/fixture/status',response_url:'https://queue.fal.run/fixture/result'});
 }
 if(url.endsWith('/status'))return Response.json({status:'COMPLETED'});
 if(url.endsWith('/result'))return Response.json({video:{url:'https://fixture.invalid/clip.mp4'}});
 if(url==='https://fixture.invalid/clip.mp4')return new Response(Buffer.from('SIMULATED CLIP BYTES - not a creative quality test'));
 throw Error('Unexpected network forbidden');
 });vi.stubGlobal('fetch',fetch);
 const ctx={userId:u.id,projectId,usageKey:`fal-contract-${tier}`};
 const first=await runForUser(u.id,()=>falClip(ctx,{image,prompt:'Un plan continu sans personne.',seconds:5,model,usage:'product_video'}),'normal',projectId);
 const second=await runForUser(u.id,()=>falClip(ctx,{image,prompt:'Un plan continu sans personne.',seconds:5,model,usage:'product_video'}),'normal',projectId);
 expect(second).toEqual(first);expect(posted).toHaveLength(1);expect(posted[0]).toMatchObject({duration:'5',generate_audio:false,prompt:'Un plan continu sans personne.'});expect(posted[0].start_image_url).toMatch(/^data:image\/jpeg;base64,/);expect(posted[0]).not.toHaveProperty('image_url');
 expect(all<any>('SELECT * FROM usage_events WHERE project_id=?',projectId)).toHaveLength(1);
 expect(all<any>('SELECT * FROM ai_calls WHERE project_id=?',projectId)[0]).toMatchObject({provider:'fal',requested_model:model,status:'ok',estimated:1});
});
it('ne réécrit ni le contrat des autres routes ni la consigne client',()=>{
 const input={prompt:'Texte exact du client.',image:'fixture:first-frame',seconds:10};expect(falVideoRequest('fal-ai/kling-video/v2.1/pro/image-to-video',input)).toEqual({prompt:input.prompt,image_url:input.image,duration:'10'});
});
