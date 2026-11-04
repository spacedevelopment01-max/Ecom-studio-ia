import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const jar=vi.hoisted(()=>({token:''}));
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>jar.token?{value:jar.token}:undefined,set:()=>{},delete:()=>{}})}));
import {account,project,sender,emptySpend} from './conversation209-fixtures';
import {openProjectConversation,submitConversation,conversationView} from '@/lib/orchestrator/conversation';
import {createFolder,listFolders,saveAsset,assetData,getAsset,type Folder} from '@/lib/library';
import {all,id,now,one,run} from '@/lib/db';
import {sha256} from '@/lib/secrets';
import {PATCH} from '@/app/api/folders/[fid]/route';
import {stateOf} from '@/lib/preparation/store';
import {seedSourcedAnglesForTest} from './sourced-strategy-fixture';
import {historicalProject} from './conversation284-fixtures';
import {createLocalFolderRenameConfirmation,hasLocalFolderRenameReceipt} from '@/lib/local-folder-rename-confirmation-client';
import * as thread from '@/app/api/studio-agent/conversations/[cid]/route';
import {projectAccountKey} from '@/lib/project-billing';

beforeEach(()=>{for(const flag of ['LOT_A','AI','CONTEXT','FILES'])vi.stubEnv('STUDIO_CONVERSATION_'+flag,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
async function fixture(){
 const u=await account(),pid=project(u),c=openProjectConversation(u,pid),send=sender(u,c.id);listFolders(pid);const folder=createFolder(pid,'Photos',null),child=createFolder(pid,'Enfant',folder.id);
 const asset=await saveAsset({projectId:pid,userId:u.id,name:'source.txt',mime:'text/plain',data:Buffer.from('FICTIF'),origin:'upload',folderId:folder.id});
 return{u,pid,c,send,folder,child,asset,say:(text:string)=>send({action:'message',text,context:{tab:'fichiers',target:null}})};
}
type F=Awaited<ReturnType<typeof fixture>>;
const rows=(f:F)=>all<Folder>('SELECT * FROM folders WHERE project_id=? ORDER BY id',f.pid);
const command=(f:F,v:any)=>({action:'confirm-folder-rename',proposalId:v.localFolderRename.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:id()});
const agree=(f:F,v:any)=>submitConversation(f.u,f.c.id,command(f,v));

it.each(['Renomme le dossier Photos en Photos clients','Peux-tu renommer le dossier « Photos » en « Photos clients » ?','Change le nom du dossier Photos en Photos clients'])('%s: exact native rename only after agreement; response loss/reload do not duplicate',async text=>{
 const f=await fixture();seedSourcedAnglesForTest(f.pid);const prep=stateOf(f.pid),before=rows(f),asset=getAsset(f.asset.id)!,bytes=assetData(asset),spend=emptySpend();
 const v=await f.say(text);expect(v.readOnlyReason).toMatch(/préparation engagée/);expect(v.localFolderRenameExecution).toEqual({enabled:true});
 expect(v.localFolderRename).toMatchObject({schema:'syna-folder-rename-1',state:'proposed',confirmationRequired:true,diff:{before:{id:f.folder.id,name:'Photos'},after:{id:f.folder.id,name:'Photos clients'}}});expect(v.localFolders).toBeUndefined();expect(rows(f)).toEqual(before);
 const cmd=command(f,v),saved=await submitConversation(f.u,f.c.id,cmd);expect(saved.localFolderRename).toMatchObject({state:'applied',actionsExecuted:true,receiptId:cmd.requestId,result:{id:f.folder.id,name:'Photos clients',parentId:null,system:false}});
 expect(rows(f)).toEqual(before.map(r=>r.id===f.folder.id?{...r,name:'Photos clients'}:r));expect(getAsset(f.asset.id)).toEqual(asset);expect(assetData(getAsset(f.asset.id)!)).toEqual(bytes);
 expect(await submitConversation(f.u,f.c.id,cmd)).toEqual(saved);expect(conversationView(f.u,f.c.id).localFolderRename).toEqual(saved.localFolderRename);expect(stateOf(f.pid)).toEqual(prep);expect(emptySpend()).toEqual(spend);
});
it('homonyms require an exact ID; no cross-project or first-folder selection',async()=>{
 const f=await fixture(),sibling=createFolder(f.pid,'Photos',null),other=await account(),foreign=createFolder(project(other),'Secret',null),before=rows(f);
 for(const source of ['Photos','absent',foreign.id])expect((await f.say(`Renomme le dossier ${source} en Nouveau`)).localFolderRename?.state).toBe('ambiguous');
 expect(rows(f)).toEqual(before);const v=await f.say(`Renomme le dossier ${f.folder.id} en Nouveau`);await agree(f,v);expect(one<Folder>('SELECT * FROM folders WHERE id=?',sibling.id)).toEqual(sibling);
});
it.each(['Renomme ce dossier en Nouveau','Renomme le dossier Photos en Nouveau puis supprime tout','Renomme le dossier « Photos » en « inachevé','Renomme le dossier Photos en '+ 'a'.repeat(121)])('%s clarifies with no effect or economic consent',async text=>{
 const f=await fixture(),before=rows(f),spend=emptySpend(),v=await f.say(text);expect(v.localFolderRename).toMatchObject({state:'ambiguous',confirmationRequired:false,actionsExecuted:false,costEur:0,financialConsent:false});expect(rows(f)).toEqual(before);expect(emptySpend()).toEqual(spend);
});
it('same-name and same-parent collision do not create or overwrite a folder',async()=>{
 const f=await fixture();createFolder(f.pid,'Occupé',null);const before=rows(f);
 for(const name of ['Photos','Occupé'])expect((await f.say(`Renomme le dossier Photos en ${name}`)).localFolderRename?.state).toBe('ambiguous');expect(rows(f)).toEqual(before);
});
it.each(['rename','move','delete','insert'])('concurrent folder %s invalidates the full-tree proposal without overwriting manual work',async mode=>{
 const f=await fixture(),v=await f.say('Renomme le dossier Photos en Nouveau');
 if(mode==='rename')run('UPDATE folders SET name=? WHERE id=?','Manuel',f.child.id);
 if(mode==='move')run('UPDATE folders SET parent_id=NULL WHERE id=?',f.child.id);
 if(mode==='delete')run('DELETE FROM folders WHERE id=?',f.child.id);
 if(mode==='insert')createFolder(f.pid,'Ajout manuel',null);
 const manual=rows(f),spend=emptySpend();await expect(agree(f,v)).rejects.toMatchObject({status:409});expect(rows(f)).toEqual(manual);expect(emptySpend()).toEqual(spend);
});
it('cancellation, expiry and later conversation turn cannot execute the old rename',async()=>{
 const f=await fixture(),before=rows(f);let v=await f.say('Renomme le dossier Photos en Nouveau');
 await f.send({action:'cancel-folder-rename',proposalId:v.localFolderRename!.proposalId});await expect(agree(f,{...conversationView(f.u,f.c.id),localFolderRename:v.localFolderRename})).rejects.toMatchObject({status:409});
 v=await f.say('Renomme le dossier Photos en Nouveau');run("UPDATE agent_conversations SET state_json=json_set(state_json,'$.localFolderRenameProposal.expiresAt',0) WHERE id=?",f.c.id);await expect(agree(f,v)).rejects.toMatchObject({status:409});
 v=await f.say('Renomme le dossier Photos en Nouveau');await f.say('Montre les dossiers');await expect(agree(f,{...conversationView(f.u,f.c.id),localFolderRename:v.localFolderRename})).rejects.toMatchObject({status:409});expect(rows(f)).toEqual(before);
});
it('owner, tab, flag and project plan remain mandatory even for a pending agreement',async()=>{
 const f=await fixture(),v=await f.say('Renomme le dossier Photos en Nouveau'),before=rows(f),other=await account();
 await expect(submitConversation(other,f.c.id,command(f,v))).rejects.toMatchObject({status:404});
 await expect(f.send({action:'message',text:'Renomme le dossier Photos en Faux',context:{tab:'produit',target:null}})).rejects.toMatchObject({status:409});
 vi.stubEnv('STUDIO_CONVERSATION_FILES','0');await expect(agree(f,v)).rejects.toMatchObject({status:404});vi.stubEnv('STUDIO_CONVERSATION_FILES','1');
 run("UPDATE subscriptions SET status='canceled' WHERE user_id=?",f.u.id);await expect(agree(f,v)).rejects.toMatchObject({status:402});expect(rows(f)).toEqual(before);expect(conversationView(f.u,f.c.id).localFolderRenameExecution).toBeUndefined();
});
it('the existing native manual PATCH uses the same atomic metadata engine; system key is retained',async()=>{
 const f=await fixture();run("UPDATE folders SET system_key='uploads' WHERE id=?",f.folder.id);const v=await f.say('Renomme le dossier Photos en Nouveau'),saved=await agree(f,v);expect(saved.localFolderRename?.result?.system).toBe(true);
 jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),f.u.id,now()+3600000,now());
 const r=await PATCH(new Request('http://localhost/api/folders/'+f.folder.id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Nom manuel'})}),{params:Promise.resolve({fid:f.folder.id})});expect(r.status).toBe(200);expect(one<Folder>('SELECT * FROM folders WHERE id=?',f.folder.id)).toEqual({...f.folder,name:'Nom manuel',system_key:'uploads'});
});
it('A1 does not acquire a new folder-edit right',async()=>{
 const h=await historicalProject('services'),c=openProjectConversation(h.u,h.pid),before=all('SELECT * FROM folders WHERE project_id=?',h.pid),v=conversationView(h.u,c.id);
 const loaded=await submitConversation(h.u,c.id,{action:'message',text:'Renomme le dossier Photos en Nouveau',revision:v.revision,projectRevision:v.projectRevision,requestId:id()});expect(loaded.recovery).toBeTruthy();expect(loaded.localFolderRename).toBeUndefined();expect(loaded.localFolderRenameExecution).toBeUndefined();expect(all('SELECT * FROM folders WHERE project_id=?',h.pid)).toEqual(before);
});
it('an exhausted AI wallet still permits this native free rename',async()=>{
 const f=await fixture();run("UPDATE subscriptions SET plan='creer' WHERE user_id=?",f.u.id);run('UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0 WHERE user_id=?',projectAccountKey(f.pid));const spend=emptySpend(),v=await f.say('Renomme le dossier Photos en Gratuit');expect(hasLocalFolderRenameReceipt(await agree(f,v))).toBe(true);expect(emptySpend()).toEqual(spend);
});
it('authenticated HTTP requires a literal free agreement and same origin',async()=>{
 const f=await fixture(),v=await f.say('Renomme le dossier Photos en Nouveau'),before=rows(f);jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),f.u.id,now()+3600000,now());
 const ctx={params:Promise.resolve({cid:f.c.id})},body=command(f,v),post=(data:unknown,origin='http://localhost')=>thread.POST(new Request('http://localhost/api/test',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(data)}),ctx);
 expect((await post({...body,confirmation:false})).status).toBe(400);expect((await post(body,'https://foreign.invalid')).status).toBe(403);expect(rows(f)).toEqual(before);
 const response=await post(body);expect(response.status).toBe(200);expect(hasLocalFolderRenameReceipt(await response.json())).toBe(true);
});
it('real controller recovers a lost response after native commit without a second POST or stale replay',async()=>{
 const f=await fixture();let view=await f.say('Renomme le dossier Photos en Nouveau'),posts=0;const memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>{memory.delete(k);}},onApplied=vi.fn();
 const transport=(async(_url:unknown,init?:RequestInit)=>{if(init?.body){posts++;await submitConversation(f.u,f.c.id,JSON.parse(String(init.body)));throw Error('Response lost');}return Response.json(conversationView(f.u,f.c.id));}) as typeof fetch;
 const options={conversationId:f.c.id,view:()=>view,fetch:transport,onView:(v:typeof view)=>{view=v;},onState:()=>{},onApplied,storage,uuid:id};const first=createLocalFolderRenameConfirmation(options);await first.confirm();expect(first.getState().uncertain).toBe(true);expect(onApplied).not.toHaveBeenCalled();first.dispose();
 const resumed=createLocalFolderRenameConfirmation(options);expect(resumed.getState().uncertain).toBe(true);await resumed.refresh();expect(resumed.getState()).toMatchObject({uncertain:false,error:''});expect(posts).toBe(1);expect(onApplied).toHaveBeenCalledOnce();await resumed.refresh();expect(onApplied).toHaveBeenCalledOnce();expect(memory.size).toBe(0);expect(one<Folder>('SELECT * FROM folders WHERE id=?',f.folder.id)?.name).toBe('Nouveau');
});
it('receipt validates exact identity, unchanged parent/system and zero financial effect',async()=>{
 const f=await fixture(),saved=await agree(f,await f.say('Renomme le dossier Photos en Nouveau')),s=saved.localFolderRename!;expect(hasLocalFolderRenameReceipt(saved)).toBe(true);
 for(const patch of [{projectId:'foreign'},{costEur:1},{providerCalls:1},{financialConsent:true},{publication:true},{confirmationRequired:true},{result:{...s.result,id:'other'}},{result:{...s.result,parentId:'other'}},{result:{...s.result,system:!s.result!.system}},{result:{...s.result,name:'fake'}}])expect(hasLocalFolderRenameReceipt({...saved,localFolderRename:{...s,...patch}} as any)).toBe(false);
});
it.each(['conversation','project'])('controller rejects a foreign %s receipt without changing the current view or firing success',async scope=>{
 const f=await fixture(),v=await f.say('Renomme le dossier Photos en Nouveau'),s=v.localFolderRename!,fake={...v,...(scope==='conversation'?{id:'foreign'}:{projectId:'foreign'}),localFolderRename:{...s,projectId:scope==='project'?'foreign':v.projectId,state:'applied',confirmationRequired:false,actionsExecuted:true,receiptId:'receipt',result:s.diff!.after}},onApplied=vi.fn(),onView=vi.fn(),before=rows(f);
 const c=createLocalFolderRenameConfirmation({conversationId:f.c.id,view:()=>v,fetch:vi.fn(async(_url:unknown,init?:RequestInit)=>{if(init?.body)fake.localFolderRename.receiptId=JSON.parse(String(init.body)).requestId;return Response.json(fake);}) as any,onView,onState:()=>{},onApplied});await c.confirm();expect(onView).not.toHaveBeenCalled();expect(onApplied).not.toHaveBeenCalled();expect(c.getState().uncertain).toBe(true);expect(rows(f)).toEqual(before);
});
it('a response arriving after a project switch cannot update the new conversation or fire success',async()=>{
 const f=await fixture(),other=await fixture();let view=await f.say('Renomme le dossier Photos en Nouveau');const initial=view,s=initial.localFolderRename!,onView=vi.fn(),onApplied=vi.fn(),before=rows(other);
 const transport=vi.fn(async(_url:unknown,init?:RequestInit)=>{const body=JSON.parse(String(init?.body));view=conversationView(other.u,other.c.id);return Response.json({...initial,localFolderRename:{...s,state:'applied',actionsExecuted:true,confirmationRequired:false,receiptId:body.requestId,result:s.diff!.after}});});
 const c=createLocalFolderRenameConfirmation({conversationId:f.c.id,view:()=>view,fetch:transport as any,onView,onState:()=>{},onApplied});await c.confirm();expect(view.id).toBe(other.c.id);expect(onView).not.toHaveBeenCalled();expect(onApplied).not.toHaveBeenCalled();expect(transport).toHaveBeenCalledTimes(1);expect(rows(other)).toEqual(before);
});
it('a new proposal discards a stale persisted confirmation, while an explicit new agreement still works',async()=>{
 const f=await fixture();let view=await f.say('Renomme le dossier Photos en Nouveau');const oldProposal=view.localFolderRename!.proposalId,oldCommand=command(f,view);await submitConversation(f.u,f.c.id,oldCommand);view=await f.say('Renomme le dossier Nouveau en Final');
 const memory=new Map<string,string>([[`syna-free-folder-rename:${f.c.id}:${f.pid}`,JSON.stringify(oldCommand)]]),posts:any[]=[];
 const transport=(async(_url:unknown,init?:RequestInit)=>{if(init?.body){const cmd=JSON.parse(String(init.body));posts.push(cmd);return Response.json(await submitConversation(f.u,f.c.id,cmd));}return Response.json(conversationView(f.u,f.c.id));}) as typeof fetch;
 const c=createLocalFolderRenameConfirmation({conversationId:f.c.id,view:()=>view,fetch:transport,onView:v=>{view=v;},onState:()=>{},onApplied:()=>{},storage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>{memory.set(k,v);},removeItem:k=>{memory.delete(k);}},uuid:id});
 expect(c.getState().uncertain).toBe(true);expect(one<Folder>('SELECT * FROM folders WHERE id=?',f.folder.id)?.name).toBe('Nouveau');await c.confirm();expect(posts).toHaveLength(1);expect(posts[0].proposalId).not.toBe(oldProposal);expect(posts[0].requestId).not.toBe(oldCommand.requestId);expect(one<Folder>('SELECT * FROM folders WHERE id=?',f.folder.id)?.name).toBe('Final');expect(memory.size).toBe(0);
});
it('a native write failure rolls back both metadata and conversation receipt, then permits the legitimate retry',async()=>{
 const f=await fixture(),v=await f.say('Renomme le dossier Photos en Abort parité301'),before=rows(f),cmd=command(f,v);
 run("CREATE TEMP TRIGGER parity301_abort_folder_rename BEFORE UPDATE OF name ON folders WHEN NEW.name='Abort parité301' BEGIN SELECT RAISE(ABORT,'synthetic_native_failure'); END");
 try{await expect(submitConversation(f.u,f.c.id,cmd)).rejects.toThrow(/synthetic_native_failure/);expect(rows(f)).toEqual(before);expect(conversationView(f.u,f.c.id).revision).toBe(v.revision);expect(conversationView(f.u,f.c.id).localFolderRename?.state).toBe('proposed');}finally{run('DROP TRIGGER parity301_abort_folder_rename');}
 expect(hasLocalFolderRenameReceipt(await submitConversation(f.u,f.c.id,cmd))).toBe(true);
});
it('closing the flag refuses even replay of a cached confirmation and hides the live capability',async()=>{
 const f=await fixture(),v=await f.say('Renomme le dossier Photos en Nouveau'),cmd=command(f,v);await submitConversation(f.u,f.c.id,cmd);const before=rows(f),spend=emptySpend();vi.stubEnv('STUDIO_CONVERSATION_FILES','0');await expect(submitConversation(f.u,f.c.id,cmd)).rejects.toMatchObject({status:404});expect(conversationView(f.u,f.c.id).localFolderRenameExecution).toBeUndefined();expect(rows(f)).toEqual(before);expect(emptySpend()).toEqual(spend);
});
it('catalogue declares this one free native rename separately from folder creation',async()=>{
 const f=await fixture(),{studioOperationCatalogue}=await import('@/lib/orchestrator/conversation/studio-operations');expect(studioOperationCatalogue(f.pid,true).rows.find(r=>r.id==='folders.rename')).toMatchObject({implementation:'implemented',connectionEnabled:true,evidence:'isolated_local_execution',cost:'free',confirmation:'separate_explicit_free_confirmation',supportedActions:['rename-one-exact-folder'],scope:'native_folder_rename_backend_partial_ui_pending'});vi.stubEnv('STUDIO_CONVERSATION_FILES','0');expect(studioOperationCatalogue(f.pid,true).rows.find(r=>r.id==='folders.rename')?.connectionEnabled).toBe(false);
});
