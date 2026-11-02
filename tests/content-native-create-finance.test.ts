import {it,expect,vi,beforeEach,afterEach}from 'vitest';
import {account,project}from './conversation209-fixtures';
import {id,all,run}from '@/lib/db';
import {setSetting}from '@/lib/settings';
import type {User}from '@/lib/auth';
const observed=vi.hoisted(()=>({user:null as User|null,sdk:[]as {model:string}[],fetch:0}));
vi.mock('@/lib/auth',async original=>({...await original<object>(),requireUser:async()=>observed.user}));
vi.mock('@anthropic-ai/sdk',async original=>{
 const real=await original<typeof import('@anthropic-ai/sdk')>();
 const stream=(p:any)=>{observed.sdk.push({model:p.model});throw Object.assign(new Error('SENTINELLE_FOURNISSEUR_AUCUN_TRANSPORT'),{status:400});};
 class FakeSDK{messages={countTokens:async()=>({input_tokens:100}),stream};beta={messages:{stream}};}
 Object.assign(FakeSDK,{AuthenticationError:real.default.AuthenticationError,BadRequestError:real.default.BadRequestError,NotFoundError:real.default.NotFoundError});
 return{...real,default:FakeSDK};
});
beforeEach(()=>{observed.sdk=[];observed.fetch=0;vi.stubEnv('ANTHROPIC_API_KEY','synthetic-finance-sentinel-not-a-secret');vi.stubGlobal('fetch',vi.fn(()=>{observed.fetch++;throw Error('NO_NETWORK_PERMITTED');}));setSetting('ai.prices.checkedAt',String(Date.now()));});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
async function fixture(){const u=await account(),pid=project(u);observed.user=u;const {loadProject,saveProduct}=await import('@/lib/projects');saveProduct(pid,{...loadProject(pid).product,name:'Lime fictive',summary:'Une lime pour le travail manuel.',category:'Outillage'});const {validatedBrand}=await import('./preparation-mission-fixtures');validatedBrand(pid);return{u,pid};}
const ctx=(id:string,extra={})=>({params:Promise.resolve({id,...extra})});
const req=(path:string,value:unknown)=>new Request('http://localhost'+path,{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost'},body:JSON.stringify(value)});
import {POST,GET} from '@/app/api/projects/[id]/content/v2/route';
import {runContentEngineV2} from '@/lib/seo-v2/engine';
import {realSeoDeps} from '@/lib/seo-v2/deps';
import {loadProject} from '@/lib/projects';
import {mockSeoDeps} from './seo-v2-mock';
import {latestContent,listContentVersions} from '@/lib/seo-v2/store';
import {saveUserEdit} from '@/lib/seo-v2/engine';
import {withAiDisabled} from '@/lib/ai/access';
import {projectAccountKey} from '@/lib/project-billing';
const input={type:'product_page' as const,pageKey:'product:main',request:null,keyword:null,force:false};
function noSpend(pid:string){expect(observed.sdk).toHaveLength(0);expect(observed.fetch).toBe(0);for(const t of ['jobs','ai_calls','ai_reservations','usage_events'])expect(all(`SELECT * FROM ${t} WHERE project_id=?`,pid)).toHaveLength(0);}
it.each([false,true])('new native paid creation refuses before queue/SDK, even numeric cap and force=%s',async force=>{const f=await fixture(),r=await POST(req('/api/test',{...input,force,maxCostEur:5}),ctx(f.pid)),v=await r.json();expect(r.status,JSON.stringify(v)).toBe(409);expect(v.code).toBe('QUOTE_REQUIRED');expect(v.error).toMatch(/devis|quote/i);expect(v.error).toMatch(/confirm/i);expect(all('SELECT * FROM content_documents WHERE project_id=?',f.pid)).toHaveLength(0);noSpend(f.pid);});
it('exact acquired AI version is reused free; a later client correction stays protected',async()=>{const f=await fixture(),m=mockSeoDeps(),first=await runContentEngineV2(null,f.pid,input,{...m.deps,context:realSeoDeps(null,loadProject(f.pid),true).context});expect(m.log.writes.length).toBeGreaterThan(0);const before=latestContent(f.pid,first.docKey!)!;const r=await POST(req('/api/test',input),ctx(f.pid)),v=await r.json();expect(r.status,JSON.stringify(v)).toBe(200);expect(v).toMatchObject({skipped:true,by:'ai',docKey:first.docKey});expect(listContentVersions(f.pid,first.docKey!)).toHaveLength(1);const manual={...before.doc,meta:{...before.doc.meta,seoTitle:'Titre personnel conservé'}};saveUserEdit(f.pid,first.docKey!,manual);const manualSaved=latestContent(f.pid,first.docKey!)!.doc;const retry=await POST(req('/api/test',input),ctx(f.pid));expect(retry.status).toBe(409);expect(latestContent(f.pid,first.docKey!)!.doc).toEqual(manualSaved);expect(listContentVersions(f.pid,first.docKey!)).toHaveLength(2);noSpend(f.pid);});
it('force cannot rebuy an acquired result or create a quota reservation without confirmation',async()=>{const f=await fixture(),m=mockSeoDeps();await runContentEngineV2(null,f.pid,input,{...m.deps,context:realSeoDeps(null,loadProject(f.pid),true).context});const before=all('SELECT * FROM content_documents WHERE project_id=?',f.pid);const r=await POST(req('/api/test',{...input,force:true}),ctx(f.pid));expect(r.status).toBe(409);expect(all('SELECT * FROM content_documents WHERE project_id=?',f.pid)).toEqual(before);noSpend(f.pid);});
it('AI disabled native creation remains local and free, and GET still reads it',async()=>{const f=await fixture();const r=await withAiDisabled('synthetic disabled scope',()=>POST(req('/api/test',input),ctx(f.pid))),v=await r.json();expect(r.status,JSON.stringify(v)).toBe(200);expect(v.by).toBe('local');expect(latestContent(f.pid,v.docKey)).toBeTruthy();const list=await GET(new Request('http://localhost/api/test'),ctx(f.pid));expect(list.status).toBe(200);noSpend(f.pid);});
it('cross-origin mutation is rejected before any dispatch',async()=>{const f=await fixture(),r=await POST(new Request('http://localhost/api/test',{method:'POST',headers:{'content-type':'application/json',origin:'https://foreign.invalid'},body:JSON.stringify(input)}),ctx(f.pid));expect(r.status).toBe(403);noSpend(f.pid);});
it('paid blog creation refuses before quota reservation',async()=>{const f=await fixture(),r=await POST(req('/api/test',{type:'blog_article'}),ctx(f.pid));expect(r.status).toBe(409);expect(all('SELECT * FROM quota_events WHERE user_id=?',projectAccountKey(f.pid))).toHaveLength(0);noSpend(f.pid);});
it('no configured writing/review tool preserves native local free creation',async()=>{const f=await fixture();vi.stubEnv('ANTHROPIC_API_KEY','');const r=await POST(req('/api/test',input),ctx(f.pid)),v=await r.json();expect(r.status,JSON.stringify(v)).toBe(200);expect(v.by).toBe('local');noSpend(f.pid);});
it('blog plan refusal is preserved without quota writes or AI',async()=>{const f=await fixture();run("UPDATE subscriptions SET plan='creer' WHERE user_id=?",projectAccountKey(f.pid));const r=await POST(req('/api/test',{type:'blog_article'}),ctx(f.pid));expect(r.status).toBe(402);expect(all('SELECT * FROM quota_events WHERE user_id=?',projectAccountKey(f.pid))).toHaveLength(0);noSpend(f.pid);});
it('exhausted AI wallet still allows the native free local product draft',async()=>{const f=await fixture();run('UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0 WHERE user_id=?',projectAccountKey(f.pid));const r=await POST(req('/api/test',input),ctx(f.pid)),v=await r.json();expect(r.status,JSON.stringify(v)).toBe(200);expect(v.by).toBe('local');noSpend(f.pid);});
it('reuses a service acquired with the actual native bound strategy context, not a prefabricated dependency context',async()=>{
 const u=await account(),pid=project(u,'services');observed.user=u;
 const {saveServices,loadProject}=await import('@/lib/projects');
 saveServices(pid,{...loadProject(pid).services,services:[{key:'stores',name:'Reprise de stores textiles',description:'Reprise des coutures après examen.',source:'client'},{key:'garage',name:'Réglage de portes de garage',description:'Réglage mécanique après examen.',source:'client'}]});
 const {validatedBrand}=await import('./preparation-mission-fixtures');validatedBrand(pid);
 const {chooseGeneralistForTest}=await import('./strategy-choice-fixture');chooseGeneralistForTest(pid);
 const depModule=await import('@/lib/seo-v2/deps'),original=depModule.realSeoDeps,m=mockSeoDeps();
 const snapshots:{context:unknown;services:(string|undefined)[]}[]=[];
 const spy=vi.spyOn(depModule,'realSeoDeps').mockImplementation((job,p,active)=>{
   const native=original(job,p,active);snapshots.push({context:native.context,services:p.services.services.map(s=>s.key)});
   return {...native,write:m.deps.write,review:m.deps.review};
 });
 try{
  const request={...input,type:'service_page' as const,pageKey:'service:stores'};
  const first=await runContentEngineV2(null,pid,request); // No injected context or dependencies.
  expect(first.by).toBe('ai');expect(snapshots[0].services).toEqual(['stores']);
  const before=latestContent(pid,first.docKey!)!;const writes=m.log.writes.length,reviews=m.log.reviews;
  const tables=['jobs','ai_calls','ai_reservations','usage_events'];
  const financialBefore=tables.map(t=>all(`SELECT * FROM ${t} WHERE project_id=?`,pid));
  const response=await POST(req('/api/test',request),ctx(pid)),v=await response.json();
  expect(response.status,JSON.stringify(v)).toBe(200);expect(v).toMatchObject({docKey:first.docKey,by:'ai',skipped:true});
  expect(snapshots[1]).toEqual(snapshots[0]);expect(m.log.writes).toHaveLength(writes);expect(m.log.reviews).toBe(reviews);
  expect(latestContent(pid,first.docKey!)).toEqual(before);
  expect(tables.map(t=>all(`SELECT * FROM ${t} WHERE project_id=?`,pid))).toEqual(financialBefore);
  expect(observed.sdk).toHaveLength(0);expect(observed.fetch).toBe(0);
 }finally{spy.mockRestore();}
});
