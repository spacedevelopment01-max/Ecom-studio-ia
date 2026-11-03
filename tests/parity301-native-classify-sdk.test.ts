/** Vrai route → handler → aiClassify → routeur/jetons/réservation → SDK Anthropic simulé. HTTP externe interdit. */
vi.mock('@/lib/public-download',()=>import('./public-download-double'));
import {beforeEach,afterEach,expect,it,vi}from'vitest';
import sharp from'sharp';
const fake=vi.hoisted(()=>({user:null as any,sends:0,tokens:0,counts:0,reply:{items:[]}as{items:{id:string;folder:string;name:string}[]}}));
vi.mock('@/lib/auth',async orig=>({...await orig<any>(),currentUser:async()=>fake.user,requireUser:async()=>fake.user}));
vi.mock('@/lib/ai/config',async orig=>({...await orig<any>(),activeProviderKey:(provider:string)=>provider==='anthropic'?'SYNTHETIC SDK NO REAL KEY':null}));
vi.mock('@anthropic-ai/sdk',()=>{
 class APIError extends Error{status?:number;}
 class Anthropic{
  static AuthenticationError=class extends APIError{};static BadRequestError=class extends APIError{};static NotFoundError=class extends APIError{};
  constructor(_opts:unknown){}
  private stream(p:any){fake.sends++;return{finalMessage:async()=>({model:p.model,stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(fake.reply)}],usage:{input_tokens:fake.tokens,output_tokens:200}})};}
  messages={countTokens:async(p:unknown)=>{fake.counts++;fake.tokens=Math.ceil(JSON.stringify(p).length/3);return{input_tokens:fake.tokens};},stream:(p:any)=>this.stream(p)};
  beta={messages:{stream:(p:any)=>this.stream(p)}};
 }
 return{default:Anthropic,Anthropic};
});
import {createUser}from'@/lib/auth';
import{POST}from'@/app/api/projects/[id]/classify/route';
import{seedImageFixture}from'./image-v2-fixtures';
import{grantProjectPlan}from'./communication-choice-fixture';
import{saveAsset,getAsset}from'@/lib/library';
import{enqueue,JobContext,getJob}from'@/lib/jobs';
import{handlers}from'../worker/handlers';
import{all,run}from'@/lib/db';
import{setJsonSetting}from'@/lib/settings';
import{runForUser}from'@/lib/ai/access';
import{withTrace}from'@/lib/ai/trace';
beforeEach(()=>{fake.sends=0;fake.tokens=0;fake.counts=0;fake.reply={items:[]};setJsonSetting('ai.routes',{classification:{provider:'anthropic',model:'claude-haiku-4-5'}});vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Real HTTP forbidden');}));});
afterEach(()=>{run("UPDATE jobs SET status='cancelled' WHERE status IN ('queued','running')");vi.unstubAllGlobals();});
async function fixture(){const u=await createUser(`classify-sdk-${crypto.randomUUID()}@example.invalid`,'synthetic-password','Test');fake.user=u;const pid=seedImageFixture(u.id,'restaurant');grantProjectPlan(pid,'dominer');const a=await saveAsset({userId:u.id,projectId:pid,data:await sharp({create:{width:64,height:64,channels:3,background:'#abc'}}).png().toBuffer(),name:'logo-acquis.png',mime:'image/png',origin:'upload'});run('UPDATE assets SET folder_id=NULL WHERE id=?',a.id);fake.reply={items:[{id:a.id,folder:'docs',name:'sdk-result'}]};return{u,pid,a};}
it('classement natif sans devis : zéro jeton, réservation et SDK, même si le fournisseur est configuré',async()=>{const f=await fixture(),response=await POST(new Request(`http://localhost/api/projects/${f.pid}/classify`,{method:'POST'}),{params:Promise.resolve({id:f.pid})});expect(response.status).toBe(200);const job=getJob((await response.json()).jobId)!;await runForUser(f.u.id,()=>withTrace({jobId:job.id,projectId:f.pid},()=>handlers['files.classify'](new JobContext(job))),'normal',f.pid);expect(fake.sends).toBe(0);expect(fake.counts).toBe(0);expect(all('SELECT id FROM ai_reservations WHERE job_id=?',job.id)).toHaveLength(0);expect(all('SELECT id FROM ai_calls WHERE job_id=?',job.id)).toHaveLength(0);expect(getAsset(f.a.id)!.name).toBe(f.a.name);expect(fetch).not.toHaveBeenCalled();});
it('enfant initial exact conserve vraie réservation/règlement et SDK simulé existants',async()=>{const f=await fixture(),parent=enqueue({userId:f.u.id,projectId:f.pid,type:'pipeline.run',payload:{projectId:f.pid,from:'organize',mode:'autopilot',input:{}}});await handlers['pipeline.run'](new JobContext(parent));const child=all<{id:string}>("SELECT id FROM jobs WHERE project_id=? AND parent_id=? AND type='files.classify'",f.pid,parent.id);expect(child).toHaveLength(1);const job=getJob(child[0].id)!;await runForUser(f.u.id,()=>withTrace({jobId:job.id,projectId:f.pid},()=>handlers['files.classify'](new JobContext(job))),'normal',f.pid);expect(fake.sends).toBe(1);expect(fake.counts).toBeGreaterThan(0);expect(all('SELECT status FROM ai_reservations WHERE job_id=?',job.id)).toEqual([expect.objectContaining({status:'settled'})]);expect(all('SELECT id FROM usage_events WHERE job_id=?',job.id)).toHaveLength(1);expect(getAsset(f.a.id)!.name).toBe('sdk-result.png');expect(fetch).not.toHaveBeenCalled();});
