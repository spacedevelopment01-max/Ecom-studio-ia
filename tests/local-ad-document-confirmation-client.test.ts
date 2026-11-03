/** Native HTTP -> explicit shared A2 -> preview -> free job -> atomic version/asset receipt. Synthetic only. */
import{beforeEach,afterEach,it,expect,vi}from'vitest';
const auth=vi.hoisted(()=>({user:null as any,sdk:0}));
vi.mock('@/lib/ai/config',async o=>({...await o<any>(),activeProviderKey:()=> 'SYNTHETIC NEVER REAL'}));
vi.mock('@anthropic-ai/sdk',()=>{class Sentinel{constructor(_o:unknown){}messages={stream:()=>{auth.sdk++;throw Error('SDK forbidden');},countTokens:()=>{auth.sdk++;throw Error('SDK forbidden');}};beta={messages:this.messages};}return{default:Sentinel,Anthropic:Sentinel};});
vi.mock('@/lib/auth',async original=>({...await original<any>(),requireUser:async()=>auth.user,currentUser:async()=>auth.user}));
import{seedAgentUiSite}from'../scripts/agent211-ui-fixtures';
import{themeToolContext}from'@/lib/orchestrator/conversation/theme-tool-context';
import{account,project}from'./conversation209-fixtures';
import{openProjectConversation,conversationView}from'@/lib/orchestrator/conversation';
import{submitContext,contextView}from'@/lib/orchestrator/conversation/context-session';
import{GET as nativeGet}from'@/app/api/projects/[id]/ads/docs/[docKey]/route';
import{POST as conversationPost,GET as conversationGet}from'@/app/api/studio-agent/conversations/[cid]/route';
import{POST,GET}from'@/app/api/studio-agent/conversations/[cid]/ad-documents/route';
import{runAdDocument,adDocumentCandidate}from'@/lib/orchestrator/conversation/ad-document-tool-execution';
import{saveVersion,latestDoc,saveAndRender}from'@/lib/ad-doc/store';
import{all,one,run,id}from'@/lib/db';
import{claimNext,JobContext,completeJob,getJob}from'@/lib/jobs';
import{getAsset,assetData}from'@/lib/library';
import{projectAccountKey}from'@/lib/project-billing';
import{cognitiveContext}from'@/lib/orchestrator/conversation/intelligence-context';
import{assertAiAllowed,aiDisabledReason}from'@/lib/ai/access';
import*as projects from'@/lib/projects';
import*as renderer from'@/lib/ad-doc/server';
import type{AdDocument}from'@/lib/ad-doc/types';
const flags=['STUDIO_CONVERSATION_LOT_A','STUDIO_CONVERSATION_AI','STUDIO_CONVERSATION_SPECIALISTS','STUDIO_CONVERSATION_TOOLS','STUDIO_CONVERSATION_CONTEXT','STUDIO_CONVERSATION_AD_DOCUMENT_LOCAL'];
beforeEach(()=>{auth.sdk=0;flags.forEach(k=>vi.stubEnv(k,'1'));vi.stubGlobal('fetch',vi.fn(()=>{throw Error('No external transport');}));});afterEach(()=>{expect(auth.sdk).toBe(0);vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});
const doc=()=>({version:1,width:800,height:800,background:'#FFFFFF',safe:{top:30,bottom:30,side:30},format:{platform:'instagram',aspect:'1:1'},brand:{palette:{accent:'#000000'},fonts:{heading:'Arial',body:'Arial'},name:'FICTIF'},meta:{source:'user',conceptId:null,createdFrom:null},layers:[{kind:'text',id:'title',name:'Titre',role:'title',x:30,y:50,w:600,h:100,rotation:0,opacity:1,visible:true,locked:false,anchor:{h:'left',v:'top'},text:'CANARY_NATIVE_TITLE_301',font:{family:'Arial',weight:700,size:40,italic:false},color:'#111111',align:'left',lineHeight:1.1,letterSpacing:0,uppercase:false,autoFit:null,shadow:null}]}as AdDocument);
const counts=(pid:string)=>({docs:all('SELECT * FROM ad_documents WHERE project_id=?',pid),assets:all('SELECT * FROM assets WHERE project_id=?',pid),calls:all('SELECT * FROM ai_calls WHERE project_id=?',pid),usage:all('SELECT * FROM usage_events WHERE project_id=?',pid)});
async function fixture(){const u=await account(),pid=project(u),c=openProjectConversation(u,pid),key='ad:'+id();auth.user=u;saveVersion(pid,key,doc());const v=()=>conversationView(u,c.id);const select=()=>submitContext(u,c.id,{action:'select',revision:v().revision,requestId:id(),context:{projectId:pid,tab:'publicites',target:{kind:'ad-document-text',docKey:key,layerId:'title',version:latestDoc(pid,key)!.version.version}}});select();const ctx={params:Promise.resolve({cid:c.id})},send=(b:unknown,origin='http://localhost')=>POST(new Request('http://localhost/api/studio-agent/conversations/'+c.id+'/ad-documents',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(b)}),ctx),propose=(extra={})=>send({action:'propose',revision:v().revision,projectRevision:v().projectRevision,docKey:key,layerId:'title',expectedVersion:latestDoc(pid,key)!.version.version,operation:'title-larger',...extra}),receipt=(qid:string)=>GET(new Request('http://localhost/?receipt='+qid),ctx);return{u,pid,c,key,v,select,send,propose,receipt};}
const confirm=(f:Awaited<ReturnType<typeof fixture>>,p:string,r=id())=>f.send({action:'confirm',proposalId:p,confirmation:true,requestId:r});
async function execute(){const j=claimNext()!;expect(j).toBeTruthy();const result=await runAdDocument(new JobContext(j));completeJob(j.id,result);return{j,result};}
import {createLocalAdDocumentConfirmation,hasAdDocumentReceipt} from '@/lib/local-ad-document-confirmation-client';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
async function clientFixture(){
 const f=await fixture(),v=f.v(),ctx={params:Promise.resolve({cid:f.c.id})};
 const response=await conversationPost(new Request('http://localhost/',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify({action:'message',text:'Agrandis le titre de la création sélectionnée',revision:v.revision,projectRevision:v.projectRevision,requestId:id()})}),ctx);expect(response.status).toBe(200);
 let view=f.v(),lose:''|'before'|'after'='',failureAction='confirm';const bodies:any[]=[],storage=new Map<string,string>(),applied=vi.fn(async()=>{});
 const transport=(async(url:unknown,init?:RequestInit)=>{const u=new URL(String(url),'http://localhost'),cmd=init?.body?JSON.parse(String(init.body)):undefined;
  if(cmd){bodies.push(cmd);if(lose==='before'&&cmd.action===failureAction){lose='';throw new TypeError('request lost before delivery');}}
  const req=new Request(u,cmd?{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify(cmd)}:{});
  const r=u.pathname.endsWith('/ad-documents')?(cmd?await POST(req,ctx):await GET(req,ctx)):await conversationGet(req,ctx);
  if(cmd&&lose==='after'&&cmd.action===failureAction){lose='';throw new TypeError('response lost after commit');}return r;
 }) as typeof fetch;
 const options={conversationId:f.c.id,fetch:transport,view:()=>view,onView:(next:ConversationView)=>{view=next;},onState:vi.fn(),onApplied:applied,storage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,x:string)=>{storage.set(k,x);},removeItem:(k:string)=>{storage.delete(k);}},uuid:id};
 return{f,options,bodies,applied,view:()=>view,client:createLocalAdDocumentConfirmation(options),lose:(when:'before'|'after',action='confirm')=>{lose=when;failureAction=action;}};
}
it('two clicks produce one real job; only a completed verified native receipt triggers applied',async()=>{const t=await clientFixture();await Promise.all([t.client.confirm(),t.client.confirm()]);expect(t.bodies).toHaveLength(1);expect(all('SELECT id FROM jobs WHERE project_id=?',t.f.pid)).toHaveLength(1);expect(t.applied).not.toHaveBeenCalled();const j=claimNext()!,result=await runAdDocument(new JobContext(j));await t.client.refresh();expect(t.view().localAdDocument!.state).toBe('recorded_job_unfinished');expect(hasAdDocumentReceipt(t.view())).toBe(false);expect(t.applied).not.toHaveBeenCalled();completeJob(j.id,result);await t.client.refresh();await t.client.refresh();expect(hasAdDocumentReceipt(t.view())).toBe(true);expect(t.applied).toHaveBeenCalledTimes(1);expect(latestDoc(t.f.pid,t.f.key)!.version.version).toBe(2);});
it('lost committed confirmation survives remount and verifies the original receipt without another POST',async()=>{const t=await clientFixture();t.lose('after');await t.client.confirm();expect(t.client.getState().uncertain).toBe(true);t.client.dispose();const retry=createLocalAdDocumentConfirmation(t.options);await retry.confirm();expect(t.bodies).toHaveLength(1);expect(retry.getState().uncertain).toBe(false);await execute();await retry.refresh();expect(hasAdDocumentReceipt(t.view())).toBe(true);expect(t.applied).toHaveBeenCalledTimes(1);});
it('a request never delivered retries the identical persisted intent and creates just one native version',async()=>{const t=await clientFixture();t.lose('before');await t.client.confirm();t.client.dispose();const retry=createLocalAdDocumentConfirmation(t.options);await retry.confirm();expect(t.bodies).toHaveLength(2);expect(t.bodies[1]).toEqual(t.bodies[0]);await execute();await retry.refresh();expect(latestDoc(t.f.pid,t.f.key)!.version.version).toBe(2);expect(counts(t.f.pid).assets).toHaveLength(1);});
it('lost cancellation is durable after remount, leaves zero jobs/assets and prevents later confirmation',async()=>{const t=await clientFixture(),before=counts(t.f.pid);t.lose('after','cancel');await t.client.cancel();expect(t.client.getState().uncertain).toBe(true);t.client.dispose();const retry=createLocalAdDocumentConfirmation(t.options);await retry.retry();expect(t.bodies).toHaveLength(1);expect(t.view().localAdDocument!.state).toBe('cancelled');expect(retry.getState().uncertain).toBe(false);expect(counts(t.f.pid)).toEqual(before);expect(all('SELECT id FROM jobs WHERE project_id=?',t.f.pid)).toHaveLength(0);await retry.confirm();expect(t.bodies).toHaveLength(1);expect(t.applied).not.toHaveBeenCalled();});
it('an expired native pin can be revoked while a human update stays intact',async()=>{const t=await clientFixture(),human=doc();(human.layers[0]as any).text='Human acquired';saveVersion(t.f.pid,t.f.key,human);await t.client.refresh();expect(t.view().localAdDocument!.state).toBe('stale');const before=counts(t.f.pid);await t.client.cancel();expect(t.view().localAdDocument!.state).toBe('cancelled');expect(counts(t.f.pid)).toEqual(before);expect(latestDoc(t.f.pid,t.f.key)!.doc.layers[0]).toMatchObject({text:'Human acquired'});});
it.each([401,402,403,404])('HTTP%s never triggers another intent or a paid fallback',async status=>{const t=await clientFixture(),fetch=vi.fn(async()=>Response.json({error:'Access refused'},{status})),c=createLocalAdDocumentConfirmation({...t.options,fetch});await c.confirm();expect(c.getState().blocked).toBe(true);expect(fetch).toHaveBeenCalledTimes(1);expect(t.applied).not.toHaveBeenCalled();expect(all('SELECT id FROM jobs WHERE project_id=?',t.f.pid)).toHaveLength(0);});
it('disposal suppresses a new request and an unverified recorded flag never declares success',async()=>{const t=await clientFixture();t.client.dispose();await t.client.confirm();expect(t.bodies).toHaveLength(0);expect(hasAdDocumentReceipt({...t.view(),localAdDocument:{...t.view().localAdDocument!,state:'saved',recorded:true,delivered:false}})).toBe(false);});
