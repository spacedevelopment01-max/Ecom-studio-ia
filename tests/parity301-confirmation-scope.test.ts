/** Headless protocol regression: exact displayed proposal, durable retries, no cross-project callbacks. */
import {it,expect,vi} from 'vitest';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalFilesConfirmation} from '@/lib/local-files-confirmation-client';
import {createLocalBusinessContentConfirmation} from '@/lib/local-business-content-confirmation-client';
import {createLocalRequestsConfirmation} from '@/lib/local-site-requests-confirmation-client';
import {createServiceProfileConfirmation} from '@/lib/service-profile-confirmation-client';
import {createLocalAdDocumentConfirmation} from '@/lib/local-ad-document-confirmation-client';
import {createLocalSeoConfirmation} from '@/lib/local-seo-confirmation-client';
import {createLocalPagesConfirmation} from '@/lib/local-pages-confirmation-client';
import {createLocalStockConfirmation} from '@/lib/local-stock-confirmation-client';
import {createLocalCalendarConfirmation} from '@/lib/local-calendar-confirmation-client';
import {createLocalThemeChoiceConfirmation} from '@/lib/local-theme-choice-confirmation-client';
import {createLocalSiteMotionConfirmation} from '@/lib/local-site-motion-confirmation-client';
import {createLocalThemeRestoreConfirmation} from '@/lib/local-theme-restore-confirmation-client';
const domains=[
 {name:'restore',field:'localThemeRestore',flag:'localThemeRestoreExecution',key:'syna-free-restore:',action:'confirm-restore',create:createLocalThemeRestoreConfirmation},
 {name:'motion',field:'localSiteMotion',flag:'localSiteMotionExecution',key:'syna-free-motion:',action:'confirm-motion',create:createLocalSiteMotionConfirmation},
 {name:'theme',field:'localThemeChoice',flag:'localThemeChoiceExecution',key:'syna-free-theme-choice:',action:'confirm-theme-choice',create:createLocalThemeChoiceConfirmation},
 {name:'calendar',field:'localCalendar',flag:'localCalendarExecution',key:'syna-free-calendar:',action:'confirm-calendar',create:createLocalCalendarConfirmation},
 {name:'stock',field:'localStock',flag:'localStockExecution',key:'syna-free-stock:',action:'confirm-stock',create:createLocalStockConfirmation},
 {name:'pages',field:'localPages',flag:'localPagesExecution',key:'syna-free-pages:',action:'confirm-pages',create:createLocalPagesConfirmation},
 {name:'seo',field:'localSeo',flag:'localSeoExecution',key:'syna-free-seo:',action:'confirm-seo',create:createLocalSeoConfirmation},
 {name:'files',field:'localFiles',flag:'localFilesExecution',key:'syna-free-files:',action:'confirm-files',create:createLocalFilesConfirmation},
 {name:'content',field:'localBusinessContent',flag:'localBusinessContentExecution',key:'syna-free-content:',action:'confirm-business-content',create:createLocalBusinessContentConfirmation},
 {name:'requests',field:'localRequests',flag:'localRequestsExecution',key:'syna-free-requests:',action:'confirm-site-request',create:createLocalRequestsConfirmation},
 {name:'hours',field:'serviceProfile',flag:'serviceProfileExecution',key:'syna-free-service-profile:',action:'confirm-service-profile',create:createServiceProfileConfirmation},
 {name:'ad',field:'localAdDocument',flag:'localAdDocumentExecution',key:'syna-free-ad-document:',action:'confirm',create:createLocalAdDocumentConfirmation},
] as const;
type D=typeof domains[number];
function view(d:D,q='new',state='proposed',requestId='request-new'):ConversationView{
 const s:any={schema:'syna-service-profile-1',state,proposalId:q,id:q,field:'hours',projectId:'p',sourceVersion:1,resultVersion:2,
 diff:{before:{read:false,handled:false},after:{read:true,handled:false}},target:{type:'biens',itemId:'item',version:'1'},asset:{id:'asset',name:'name',version:2,folderId:null},item:{id:'item',type:'biens',version:'2',title:'title'},request:{id:'request'},
 actionsExecuted:state==='applied',receiptId:requestId,confirmationRequired:state==='proposed',costEur:0,providerCalls:0,financialConsent:false,publication:false};
 if(d.name==='restore')Object.assign(s,{schema:'syna-local-theme-restore-1',targetVersionId:'v0',version:{id:'v2',parentId:'v1',number:2},previewHref:'/preview/p/v/v2'});
 if(d.name==='motion')Object.assign(s,{schema:'syna-local-site-motion-1',key:'motion_enabled',diff:{before:true,after:false},version:{id:'v2',parentId:'v1',number:2}});
 if(d.name==='theme')Object.assign(s,{schema:'syna-local-theme-choice-1',direction:'rive',version:{id:'v2',parentId:'v1',number:2},previewHref:'/preview/p/v/v2'});
 if(d.name==='calendar')Object.assign(s,{schema:'syna-local-calendar-1',scheduling:false,target:{postId:'post',title:'Title',status:'review',timezone:'Europe/Paris'},diff:{before:100,after:200}});
 if(d.name==='stock')Object.assign(s,{schema:'syna-local-stock-1',synchronization:false,target:{productId:'product',variantId:'variant',productVersion:1,variantVersion:1},result:{productVersion:2,variantVersion:2}});
 if(d.name==='pages')Object.assign(s,{schema:'syna-local-pages-1',version:{id:'v2',parentId:'v1',number:2}});
 if(d.name==='seo')Object.assign(s,{schema:'syna-local-seo-1',field:'title',version:{id:'v2',parentId:'v1',number:2}});
 if(d.name==='ad')Object.assign(s,{state:state==='applied'?'saved':state,recorded:state==='applied',delivered:state==='applied',version:{id:'v2',version:2},exportHref:'/native.png',...(state==='applied'?{job:{id:'job',status:'done'}}:{})});
 return{id:'c',projectId:'p',revision:5,projectRevision:2,[d.flag]:{enabled:true},[d.field]:s,activeContext:{presentation:{state:'valid',selection:{projectId:'p',tab:'fichiers',target:{kind:'asset',assetId:'asset',version:1}}}}} as unknown as ConversationView;
}
function setup(d:D,pending:'stale'|'same'|'none'='stale'){
 let shown=view(d),server=shown;
 const old:any={action:d.action,proposalId:pending==='same'?'new':'old',confirmation:true,requestId:'request-old',...(d.name==='ad'?{}:{revision:3,projectRevision:1})};
 const map=new Map<string,string>();if(pending!=='none')map.set(d.key+'c',JSON.stringify(old));
 const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};
 const bodies:any[]=[],applied=vi.fn(),onView=vi.fn((v:ConversationView)=>{shown=v;}),states:any[]=[];
 let release:(()=>void)|undefined,arrived:(()=>void)|undefined;
 const gate=new Promise<void>(r=>release=r),entered=new Promise<void>(r=>arrived=r);let delay=false;
 const fetch=vi.fn(async(url:unknown,init?:RequestInit)=>{
  const u=new URL(String(url),'http://localhost');
  if(!init?.body){
   if(u.searchParams.has('receipt'))return Response.json({id:u.searchParams.get('receipt'),...(u.searchParams.get('receipt')==='old'||(server as any)[d.field]?.job?{job:{id:'previous'}}:{}),state:(server as any)[d.field]?.state??'proposed'});
   return Response.json(server);
  }
  const body=JSON.parse(String(init.body));bodies.push(body);
  if(body.action.startsWith('cancel')||body.action==='select'){server={...view(d),[d.field]:undefined} as unknown as ConversationView;return Response.json(server);}
  server=view(d,body.proposalId,'applied',body.requestId);
  const response=Response.json(server);if(delay){arrived!();await gate;}return response;
 }) as typeof globalThis.fetch;
 const options:any={conversationId:'c',fetch,view:()=>shown,onView,onState:(s:any)=>states.push(s),onApplied:applied,storage,uuid:()=>'request-new'};
 const client=d.create(options);
 return{client,old,bodies,map,applied,onView,fetch,options,shown:()=>shown,setView:(v:ConversationView)=>{shown=v;server=v;},clientOnly:(v:ConversationView)=>{shown=v;},delay:()=>{delay=true;},entered,release:()=>release!()};
}
for(const d of domains){
 it(d.name+': stale stored confirmation cannot replace the displayed new proposal',async()=>{
  const t=setup(d);await t.client.confirm();expect(t.bodies).toHaveLength(1);expect(t.bodies[0]).toMatchObject({action:d.action,proposalId:'new',requestId:'request-new'});expect(t.map.size).toBe(0);expect(t.client.getState().uncertain).toBe(false);
 });
 it(d.name+': same displayed pending confirmation retries the identical durable request',async()=>{
  const t=setup(d,'same');await t.client.confirm();expect(t.bodies).toEqual([t.old]);expect(t.map.size).toBe(0);
 });
 it(d.name+': stale stored intent cannot block cancellation of the displayed new proposal',async()=>{
  const t=setup(d);await t.client.cancel();expect(t.bodies).toHaveLength(1);expect(t.bodies[0].action).toBe(d.name==='restore'?'cancel-restore':d.name==='motion'?'cancel-motion':d.name==='theme'?'cancel-theme-choice':d.name==='calendar'?'cancel-calendar':d.name==='stock'?'cancel-stock':d.name==='ad'?'cancel':d.name==='hours'?'cancel-service-profile':d.name==='seo'?'cancel-seo':d.name==='pages'?'cancel-pages':'select');if(d.name==='restore'||d.name==='motion'||d.name==='theme'||d.name==='calendar'||d.name==='stock'||d.name==='ad'||d.name==='hours'||d.name==='seo'||d.name==='pages')expect(t.bodies[0].proposalId).toBe('new');expect(t.bodies.every(b=>b.proposalId!=='old')).toBe(true);expect(t.applied).not.toHaveBeenCalled();
 });
 it(d.name+': refresh discards a superseded pending intent without any write',async()=>{
  const t=setup(d);await t.client.refresh();expect(t.bodies).toEqual([]);expect(t.client.getState().uncertain).toBe(false);expect(t.map.size).toBe(0);
 });
 for(const change of ['conversation','project'] as const)it(d.name+': '+change+' switch cannot send the previous project confirmation',async()=>{
  const t=setup(d,'same');t.setView({...view(d),...(change==='conversation'?{id:'other',projectId:'other-project'}:{projectId:'other-project'})});
  await t.client.confirm();expect(t.bodies).toEqual([]);expect(t.applied).not.toHaveBeenCalled();expect(t.onView).not.toHaveBeenCalled();
 });
 it(d.name+': late response from an already agreed old project never overwrites the new displayed project',async()=>{
  const t=setup(d,'none');t.delay();const work=t.client.confirm();await t.entered;
  const other={...view(d),id:'other',projectId:'other-project'};t.clientOnly(other);t.release();await work;
  expect(t.bodies).toHaveLength(1);expect(t.shown()).toBe(other);expect(t.onView).not.toHaveBeenCalled();expect(t.applied).not.toHaveBeenCalled();
 });
}
