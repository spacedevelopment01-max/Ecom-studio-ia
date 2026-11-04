import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const jar=vi.hoisted(()=>({token:''}));vi.mock('next/headers',()=>({cookies:async()=>({get:()=>jar.token?{value:jar.token}:undefined,set:()=>{},delete:()=>{}})}));
import {account,project,sender,emptySpend} from './conversation209-fixtures';
import {openProjectConversation,submitConversation,conversationView} from '@/lib/orchestrator/conversation';
import {createFolder,listFolders,saveAsset,assetData,getAsset,type Folder} from '@/lib/library';
import {all,id,now,one,run} from '@/lib/db';
import {sha256} from '@/lib/secrets';
import {stateOf} from '@/lib/preparation/store';
import {seedSourcedAnglesForTest} from './sourced-strategy-fixture';
import {historicalProject} from './conversation284-fixtures';
import {projectAccountKey} from '@/lib/project-billing';
import {createLocalFolderMoveConfirmation,hasLocalFolderMoveReceipt} from '@/lib/local-folder-move-confirmation-client';
import * as thread from '@/app/api/studio-agent/conversations/[cid]/route';
beforeEach(()=>{for(const flag of ['LOT_A','AI','CONTEXT','FILES'])vi.stubEnv('STUDIO_CONVERSATION_'+flag,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
async function fixture(){
 const u=await account(),pid=project(u),c=openProjectConversation(u,pid),send=sender(u,c.id);listFolders(pid);
 const folder=createFolder(pid,'Photos',null),child=createFolder(pid,'Enfant',folder.id),parent=createFolder(pid,'Archives',null),asset=await saveAsset({projectId:pid,userId:u.id,name:'source.txt',mime:'text/plain',data:Buffer.from('FICTIF'),origin:'upload',folderId:folder.id});
 return{u,pid,c,send,folder,child,parent,asset,say:(text:string)=>send({action:'message',text,context:{tab:'fichiers',target:null}})};
}
type F=Awaited<ReturnType<typeof fixture>>;
const rows=(f:F)=>all<Folder>('SELECT * FROM folders WHERE project_id=? ORDER BY id',f.pid);
const command=(f:F,v:any)=>({action:'confirm-folder-move',proposalId:v.localFolderMove.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:id()});
const agree=(f:F,v:any)=>submitConversation(f.u,f.c.id,command(f,v));
it.each(['Déplace le dossier Photos dans le dossier Archives','Peux-tu déplacer le dossier « Photos » vers le dossier « Archives » ?','Range le dossier Photos dans le dossier Archives'])('%s: explicit agreement changes only native parent and preserves acquired preparation',async text=>{
 const f=await fixture();seedSourcedAnglesForTest(f.pid);const before=rows(f),asset=getAsset(f.asset.id)!,bytes=assetData(asset),prep=stateOf(f.pid),spend=emptySpend(),v=await f.say(text);
 expect(v.localFolderMove).toMatchObject({state:'proposed',confirmationRequired:true,financialConsent:false,diff:{before:{id:f.folder.id,name:'Photos',parentId:null},after:{id:f.folder.id,name:'Photos',parentId:f.parent.id}},parentAfter:{id:f.parent.id,name:'Archives'}});expect(v.localFolderRename).toBeUndefined();expect(v.localFolders).toBeUndefined();expect(rows(f)).toEqual(before);expect(v.readOnlyReason).toMatch(/préparation engagée/);
 const cmd=command(f,v),saved=await submitConversation(f.u,f.c.id,cmd);expect(hasLocalFolderMoveReceipt(saved)).toBe(true);expect(rows(f)).toEqual(before.map(r=>r.id===f.folder.id?{...r,parent_id:f.parent.id}:r));expect(getAsset(f.asset.id)).toEqual(asset);expect(assetData(getAsset(f.asset.id)!)).toEqual(bytes);expect(stateOf(f.pid)).toEqual(prep);expect(emptySpend()).toEqual(spend);
 expect(await submitConversation(f.u,f.c.id,cmd)).toEqual(saved);expect(conversationView(f.u,f.c.id).localFolderMove).toEqual(saved.localFolderMove);
});
it('return to root requires that explicit destination and preserves a legacy literal name',async()=>{
 const f=await fixture();run('UPDATE folders SET name=?,parent_id=? WHERE id=?',' Photos ancien ',f.parent.id,f.folder.id);const before=rows(f),v=await f.say(`Déplace le dossier ${f.folder.id} à la racine`),saved=await agree(f,v);expect(hasLocalFolderMoveReceipt(saved)).toBe(true);expect(rows(f)).toEqual(before.map(r=>r.id===f.folder.id?{...r,parent_id:null}:r));
});
it('homonyms and foreign IDs require exact source and destination; no first result is chosen',async()=>{
 const f=await fixture(),other=await account(),foreign=createFolder(project(other),'Secret',null);createFolder(f.pid,'Photos',f.parent.id);createFolder(f.pid,'Archives',f.child.id);const before=rows(f);
 for(const text of ['Déplace le dossier Photos dans le dossier Archives',`Déplace le dossier ${f.folder.id} dans le dossier Archives`,`Déplace le dossier ${foreign.id} à la racine`,`Déplace le dossier ${f.folder.id} dans le dossier ${foreign.id}`])expect((await f.say(text)).localFolderMove?.state).toBe('ambiguous');expect(rows(f)).toEqual(before);
 const v=await f.say(`Déplace le dossier ${f.folder.id} dans le dossier ${f.parent.id}`);await agree(f,v);expect(rows(f)).toEqual(before.map(r=>r.id===f.folder.id?{...r,parent_id:f.parent.id}:r));
});
it.each(['Déplace le dossier Photos','Déplace ce dossier dans le dossier Archives','Déplace le dossier Photos dans le dossier Archives puis supprime tout','Déplace le dossier Photos à la racine puis publie','Déplace le dossier « Photos » dans le dossier « Archives','Déplace le dossier Photos à la racine'])('%s clarifies without an implicit target, parent or chained action',async text=>{
 const f=await fixture(),before=rows(f),spend=emptySpend(),v=await f.say(text);expect(v.localFolderMove).toMatchObject({state:'ambiguous',confirmationRequired:false,actionsExecuted:false,costEur:0});expect(rows(f)).toEqual(before);expect(emptySpend()).toEqual(spend);
});
it('self and descendant destinations at more than 64 levels are refused before agreement',async()=>{
 const f=await fixture();let deep=f.child;for(let k=0;k<70;k++)deep=createFolder(f.pid,'Niveau '+k,deep.id);const before=rows(f);
 for(const destination of [f.folder.id,f.child.id,deep.id])expect((await f.say(`Déplace le dossier ${f.folder.id} dans le dossier ${destination}`)).localFolderMove).toMatchObject({state:'ambiguous',confirmationRequired:false});expect(rows(f)).toEqual(before);
});
it('a valid deep destination remains available and an existing malformed destination is clarified',async()=>{
 const f=await fixture();let deep=f.parent;for(let k=0;k<70;k++)deep=createFolder(f.pid,'Niveau '+k,deep.id);let v=await f.say(`Déplace le dossier Photos dans le dossier ${deep.id}`);expect(hasLocalFolderMoveReceipt(await agree(f,v))).toBe(true);
 run('UPDATE folders SET parent_id=NULL WHERE id=?',f.folder.id);run('UPDATE folders SET parent_id=? WHERE id=?',deep.id,f.parent.id);const before=rows(f);v=await f.say(`Déplace le dossier Photos dans le dossier ${deep.id}`);expect(v.localFolderMove).toMatchObject({state:'ambiguous',confirmationRequired:false});expect(rows(f)).toEqual(before);
});
it.each(['rename','move','delete','insert'])('concurrent folder %s invalidates agreement without overwriting manual work',async mode=>{
 const f=await fixture(),v=await f.say('Déplace le dossier Photos dans le dossier Archives');
 if(mode==='rename')run('UPDATE folders SET name=? WHERE id=?','Manuel',f.parent.id);if(mode==='move')run('UPDATE folders SET parent_id=? WHERE id=?',f.child.id,f.parent.id);if(mode==='delete')run('DELETE FROM folders WHERE id=?',f.parent.id);if(mode==='insert')createFolder(f.pid,'Manuel',null);
 const before=rows(f),spend=emptySpend();await expect(agree(f,v)).rejects.toMatchObject({status:409});expect(rows(f)).toEqual(before);expect(emptySpend()).toEqual(spend);
});
it('cancellation, expiry and a later unrelated turn cannot execute the old move',async()=>{
 const f=await fixture(),before=rows(f);let v=await f.say('Déplace le dossier Photos dans le dossier Archives');await f.send({action:'cancel-folder-move',proposalId:v.localFolderMove!.proposalId});await expect(agree(f,{...conversationView(f.u,f.c.id),localFolderMove:v.localFolderMove})).rejects.toMatchObject({status:409});
 v=await f.say('Déplace le dossier Photos dans le dossier Archives');run("UPDATE agent_conversations SET state_json=json_set(state_json,'$.localFolderMoveProposal.expiresAt',0) WHERE id=?",f.c.id);await expect(agree(f,v)).rejects.toMatchObject({status:409});
 v=await f.say('Déplace le dossier Photos dans le dossier Archives');await f.say('Montre les dossiers');await expect(agree(f,{...conversationView(f.u,f.c.id),localFolderMove:v.localFolderMove})).rejects.toMatchObject({status:409});expect(rows(f)).toEqual(before);
});
it('plan, owner, Fichiers context and closed flag still block native writes and cached replay',async()=>{
 const f=await fixture(),v=await f.say('Déplace le dossier Photos dans le dossier Archives'),other=await account(),before=rows(f);await expect(submitConversation(other,f.c.id,command(f,v))).rejects.toMatchObject({status:404});await expect(f.send({action:'message',text:'Déplace le dossier Photos dans le dossier Archives',context:{tab:'produit',target:null}})).rejects.toMatchObject({status:409});
 const cmd=command(f,v);await submitConversation(f.u,f.c.id,cmd);vi.stubEnv('STUDIO_CONVERSATION_FILES','0');await expect(submitConversation(f.u,f.c.id,cmd)).rejects.toMatchObject({status:404});expect(conversationView(f.u,f.c.id).localFolderMoveExecution).toBeUndefined();vi.stubEnv('STUDIO_CONVERSATION_FILES','1');
 run("UPDATE subscriptions SET status='canceled' WHERE user_id=?",f.u.id);await expect(f.say(`Déplace le dossier ${f.folder.id} à la racine`)).rejects.toMatchObject({status:402});expect(rows(f)).toEqual(before.map(r=>r.id===f.folder.id?{...r,parent_id:f.parent.id}:r));
});
it('zero AI balance does not make a free native relocation payant',async()=>{
 const f=await fixture();run("UPDATE subscriptions SET plan='creer' WHERE user_id=?",f.u.id);run('UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0 WHERE user_id=?',projectAccountKey(f.pid));const spend=emptySpend();expect(hasLocalFolderMoveReceipt(await agree(f,await f.say('Déplace le dossier Photos dans le dossier Archives')))).toBe(true);expect(emptySpend()).toEqual(spend);
});
it('A1 acquires no new folder relocation right',async()=>{
 const h=await historicalProject('services'),c=openProjectConversation(h.u,h.pid),v=conversationView(h.u,c.id),before=all('SELECT * FROM folders WHERE project_id=?',h.pid),saved=await submitConversation(h.u,c.id,{action:'message',text:'Déplace le dossier Photos à la racine',revision:v.revision,projectRevision:v.projectRevision,requestId:id()});expect(saved.recovery).toBeTruthy();expect(saved.localFolderMove).toBeUndefined();expect(saved.localFolderMoveExecution).toBeUndefined();expect(all('SELECT * FROM folders WHERE project_id=?',h.pid)).toEqual(before);
});
it('authenticated HTTP requires same origin and literal free agreement',async()=>{
 const f=await fixture(),v=await f.say('Déplace le dossier Photos dans le dossier Archives'),before=rows(f),body=command(f,v);jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),f.u.id,now()+3600000,now());const ctx={params:Promise.resolve({cid:f.c.id})},post=(data:unknown,origin='http://localhost')=>thread.POST(new Request('http://localhost/api/test',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(data)}),ctx);
 expect((await post({...body,confirmation:false})).status).toBe(400);expect((await post(body,'https://foreign.invalid')).status).toBe(403);expect(rows(f)).toEqual(before);const response=await post(body);expect(response.status).toBe(200);expect(hasLocalFolderMoveReceipt(await response.json())).toBe(true);
});
it('controller recovers a lost native response without a second write or success on an unverified receipt',async()=>{
 const f=await fixture();let view=await f.say('Déplace le dossier Photos dans le dossier Archives'),posts=0;const onApplied=vi.fn(),memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>{memory.delete(k);}},transport=(async(_url:unknown,init?:RequestInit)=>{if(init?.body){posts++;await submitConversation(f.u,f.c.id,JSON.parse(String(init.body)));throw Error('Response lost');}return Response.json(conversationView(f.u,f.c.id));}) as typeof fetch;
 const options={conversationId:f.c.id,view:()=>view,fetch:transport,onView:(v:typeof view)=>{view=v;},onState:()=>{},onApplied,storage,uuid:id},first=createLocalFolderMoveConfirmation(options);await first.confirm();expect(first.getState().uncertain).toBe(true);expect(onApplied).not.toHaveBeenCalled();first.dispose();const resumed=createLocalFolderMoveConfirmation(options);await resumed.refresh();expect(resumed.getState()).toMatchObject({uncertain:false,error:''});expect(posts).toBe(1);expect(onApplied).toHaveBeenCalledOnce();await resumed.refresh();expect(onApplied).toHaveBeenCalledOnce();expect(memory.size).toBe(0);
});
it('receipt requires the same identity/name/system, changed exact parent and zero financial effect',async()=>{
 const f=await fixture(),saved=await agree(f,await f.say('Déplace le dossier Photos dans le dossier Archives')),s=saved.localFolderMove!;expect(hasLocalFolderMoveReceipt(saved)).toBe(true);
 for(const patch of [{projectId:'foreign'},{costEur:1},{providerCalls:1},{financialConsent:true},{result:{...s.result,id:'other'}},{result:{...s.result,name:'renamed'}},{result:{...s.result,parentId:null}},{result:{...s.result,system:!s.result!.system}}])expect(hasLocalFolderMoveReceipt({...saved,localFolderMove:{...s,...patch}} as any)).toBe(false);
});
it('catalogue advertises this relocation separately from rename and creation',async()=>{
 const f=await fixture(),{studioOperationCatalogue}=await import('@/lib/orchestrator/conversation/studio-operations');expect(studioOperationCatalogue(f.pid,true).rows.find(r=>r.id==='folders.move')).toMatchObject({implementation:'implemented',connectionEnabled:true,cost:'free',supportedActions:['move-one-exact-folder-or-root'],scope:'native_folder_move_backend_partial_ui_pending'});vi.stubEnv('STUDIO_CONVERSATION_FILES','0');expect(studioOperationCatalogue(f.pid,true).rows.find(r=>r.id==='folders.move')?.connectionEnabled).toBe(false);
});
it.each(['conversation','project'])('controller rejects a foreign %s receipt before updating any view or firing success',async scope=>{
 const f=await fixture(),v=await f.say('Déplace le dossier Photos dans le dossier Archives'),s=v.localFolderMove!,fake={...v,...(scope==='conversation'?{id:'foreign'}:{projectId:'foreign'}),localFolderMove:{...s,projectId:scope==='project'?'foreign':v.projectId,state:'applied',actionsExecuted:true,confirmationRequired:false,receiptId:'pending',result:s.diff!.after}},onView=vi.fn(),onApplied=vi.fn(),before=rows(f);
 const c=createLocalFolderMoveConfirmation({conversationId:f.c.id,view:()=>v,fetch:vi.fn(async(_url:unknown,init?:RequestInit)=>{if(init?.body)fake.localFolderMove.receiptId=JSON.parse(String(init.body)).requestId;return Response.json(fake);}) as any,onView,onState:()=>{},onApplied});await c.confirm();expect(c.getState().uncertain).toBe(true);expect(onView).not.toHaveBeenCalled();expect(onApplied).not.toHaveBeenCalled();expect(rows(f)).toEqual(before);
});
it('a new root proposal replaces a stale persisted move agreement and needs a fresh explicit confirmation',async()=>{
 const f=await fixture();let view=await f.say('Déplace le dossier Photos dans le dossier Archives');const old=command(f,view);await submitConversation(f.u,f.c.id,old);view=await f.say('Déplace le dossier Photos à la racine');const posts:any[]=[],memory=new Map<string,string>([[`syna-free-folder-move:${f.c.id}:${f.pid}`,JSON.stringify(old)]]),transport=(async(_url:unknown,init?:RequestInit)=>{if(init?.body){const cmd=JSON.parse(String(init.body));posts.push(cmd);return Response.json(await submitConversation(f.u,f.c.id,cmd));}return Response.json(conversationView(f.u,f.c.id));}) as typeof fetch;
 const c=createLocalFolderMoveConfirmation({conversationId:f.c.id,view:()=>view,fetch:transport,onView:v=>{view=v;},onState:()=>{},onApplied:()=>{},storage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>{memory.set(k,v);},removeItem:k=>{memory.delete(k);}},uuid:id});expect(c.getState().uncertain).toBe(true);expect(one<Folder>('SELECT * FROM folders WHERE id=?',f.folder.id)?.parent_id).toBe(f.parent.id);await c.confirm();expect(posts).toHaveLength(1);expect(posts[0].proposalId).not.toBe(old.proposalId);expect(posts[0].requestId).not.toBe(old.requestId);expect(one<Folder>('SELECT * FROM folders WHERE id=?',f.folder.id)?.parent_id).toBeNull();expect(memory.size).toBe(0);
});
it('native relocation failure rolls back its receipt and permits retry of the original agreement',async()=>{
 const f=await fixture(),v=await f.say('Déplace le dossier Photos dans le dossier Archives'),cmd=command(f,v),before=rows(f),spend=emptySpend();
 run("CREATE TEMP TRIGGER parity301_abort_folder_move BEFORE UPDATE OF parent_id ON folders WHEN NEW.name='Photos' AND NEW.parent_id IS NOT OLD.parent_id BEGIN SELECT RAISE(ABORT,'synthetic_move_failure'); END");
 try{await expect(submitConversation(f.u,f.c.id,cmd)).rejects.toThrow(/synthetic_move_failure/);expect(rows(f)).toEqual(before);expect(conversationView(f.u,f.c.id).revision).toBe(v.revision);expect(conversationView(f.u,f.c.id).localFolderMove?.state).toBe('proposed');}finally{run('DROP TRIGGER parity301_abort_folder_move');}
 expect(hasLocalFolderMoveReceipt(await submitConversation(f.u,f.c.id,cmd))).toBe(true);expect(emptySpend()).toEqual(spend);
});
