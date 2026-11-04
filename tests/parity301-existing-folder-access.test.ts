/** Opt-in local folder actions on acquired A1 projects; no editable brief or general AI access. */
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const jar=vi.hoisted(()=>({token:''}));vi.mock('next/headers',()=>({cookies:async()=>({get:()=>jar.token?{value:jar.token}:undefined,set:()=>{},delete:()=>{}})}));
import {historicalProject,businessFingerprints} from './conversation284-fixtures';
import {emptySpend,sender} from './conversation209-fixtures';
import {openProjectConversation,conversationView,submitConversation} from '@/lib/orchestrator/conversation';
import {createFolder,saveAsset,getAsset,assetData,type Folder} from '@/lib/library';
import {all,id,now,run} from '@/lib/db';
import {sha256} from '@/lib/secrets';
import {ownedConversation} from '@/lib/orchestrator/conversation/store';
import {createLocalFolderRenameConfirmation,hasLocalFolderRenameReceipt} from '@/lib/local-folder-rename-confirmation-client';
import {createLocalFolderMoveConfirmation,hasLocalFolderMoveReceipt} from '@/lib/local-folder-move-confirmation-client';
import * as thread from '@/app/api/studio-agent/conversations/[cid]/route';
import {stateOf} from '@/lib/preparation/store';
import {localEditAllowed,nativeLocalEditAllowed} from '@/lib/existing-local-edits';
beforeEach(()=>{jar.token='';for(const flag of ['LOT_A','AI','CONTEXT','LOCAL_SITE','FILES','EXISTING_LOCAL','SPECIALISTS','TOOLS','THEME_TOOLS'])vi.stubEnv('STUDIO_CONVERSATION_'+flag,'1');for(const flag of ['EXISTING_FOLDER_RENAME','EXISTING_FOLDER_MOVE'])vi.stubEnv('STUDIO_CONVERSATION_'+flag,'0');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
async function fixture(business:'products'|'services'){
 const f=await historicalProject(business),folder=createFolder(f.pid,'Photos',null),parent=createFolder(f.pid,'Archives',null),asset=await saveAsset({projectId:f.pid,userId:f.u.id,name:'ancien.txt',mime:'text/plain',data:Buffer.from('ACQUIS FICTIF'),origin:'upload',folderId:folder.id}),c=openProjectConversation(f.u,f.pid),send=sender(f.u,c.id);
 return{...f,folder,parent,asset,c,send,say:(text:string)=>send({action:'message',text,context:{tab:'fichiers',target:null}})};
}
type F=Awaited<ReturnType<typeof fixture>>;
const rows=(f:F)=>all<Folder>('SELECT * FROM folders WHERE project_id=? ORDER BY id',f.pid);
const stable=()=>{const b=businessFingerprints();delete b.database.folders;return b;};
for(const business of ['products','services'] as const)for(const op of ['folder-rename','folder-move'] as const)it(`${business} A1: opt-in ${op} preserves acquired data and never creates Preparation`,async()=>{
 const f=await fixture(business),flag=op==='folder-rename'?'EXISTING_FOLDER_RENAME':'EXISTING_FOLDER_MOVE';vi.stubEnv('STUDIO_CONVERSATION_'+flag,'1');const baseline=stable(),before=rows(f),asset=getAsset(f.asset.id)!,bytes=assetData(asset),spend=emptySpend(),view=conversationView(f.u,f.c.id);
 expect(view.recovery?.localEdits?.ops).toContain(op);expect(view.recovery).toMatchObject({state:'read-only',actionsEnabled:false,aiEnabled:false,providerCalls:0});expect(view.projectRevision).toBeNull();expect(view.correctionFields).toEqual([]);expect(view.creation).toBeNull();expect(view.localEditsWritable).toBeUndefined();expect(nativeLocalEditAllowed(view)).toBe(false);expect(localEditAllowed(view,op)).toBe(true);
 const other=op==='folder-rename'?'folder-move':'folder-rename';expect(localEditAllowed({...view,localEditsWritable:true},other)).toBe(false);expect(view.recovery?.localEdits?.ops).not.toContain(other);
 const proposed=await f.say(op==='folder-rename'?'Renomme le dossier Photos en Images':'Déplace le dossier Photos dans le dossier Archives'),card=op==='folder-rename'?proposed.localFolderRename:proposed.localFolderMove;expect(card).toMatchObject({state:'proposed',confirmationRequired:true,costEur:0,providerCalls:0});expect(rows(f)).toEqual(before);
 const saved=await f.send({action:op==='folder-rename'?'confirm-folder-rename':'confirm-folder-move',proposalId:card!.proposalId,confirmation:true});expect(op==='folder-rename'?saved.localFolderRename:saved.localFolderMove).toMatchObject({state:'applied',actionsExecuted:true});expect(rows(f)).toEqual(before.map(r=>r.id===f.folder.id?{...r,...(op==='folder-rename'?{name:'Images'}:{parent_id:f.parent.id})}:r));
 expect(stable()).toEqual(baseline);expect(getAsset(f.asset.id)).toEqual(asset);expect(assetData(getAsset(f.asset.id)!)).toEqual(bytes);expect(stateOf(f.pid)).toBeNull();expect(emptySpend()).toEqual(spend);expect(saved.recovery?.actionsEnabled).toBe(false);expect(saved.recovery?.aiEnabled).toBe(false);expect(saved.tools.every(t=>t.executionEnabled===false)).toBe(true);
});
const command=(f:F,op:'folder-rename'|'folder-move',v:any)=>({action:'confirm-'+op,proposalId:(op==='folder-rename'?v.localFolderRename:v.localFolderMove).proposalId,confirmation:true,revision:v.revision,projectRevision:null,requestId:id()});
const phrase=(op:'folder-rename'|'folder-move')=>op==='folder-rename'?'Renomme le dossier Photos en Images':'Déplace le dossier Photos dans le dossier Archives';
const enable=(op:'folder-rename'|'folder-move')=>vi.stubEnv('STUDIO_CONVERSATION_'+(op==='folder-rename'?'EXISTING_FOLDER_RENAME':'EXISTING_FOLDER_MOVE'),'1');
it('new exceptions stay closed by default even if a client forges an editable bit and execution DTO',async()=>{
 const f=await fixture('products'),before=rows(f),spend=emptySpend(),view=conversationView(f.u,f.c.id);expect(view.recovery?.localEdits?.ops).toEqual(['local-site','files']);
 for(const op of ['folder-rename','folder-move'] as const){const fake={...view,localEditsWritable:true,localFolderRenameExecution:{enabled:true as const},localFolderMoveExecution:{enabled:true as const}};expect(localEditAllowed(fake,op)).toBe(false);const fetcher=vi.fn(),create=op==='folder-rename'?createLocalFolderRenameConfirmation:createLocalFolderMoveConfirmation,c=create({conversationId:f.c.id,view:()=>fake,fetch:fetcher as any,onView:()=>{},onState:()=>{},onApplied:()=>{}});await c.confirm();expect(fetcher).not.toHaveBeenCalled();const v=await f.say(phrase(op));expect(v.localFolderRename).toBeUndefined();expect(v.localFolderMove).toBeUndefined();await expect(f.send({action:'confirm-'+op,proposalId:'forged',confirmation:true})).rejects.toMatchObject({status:409});}
 expect(rows(f)).toEqual(before);expect(emptySpend()).toEqual(spend);expect(stateOf(f.pid)).toBeNull();
});
for(const op of ['folder-rename','folder-move'] as const)for(const mode of ['specific','global','native','plan'] as const)it(`${op}: ${mode} withdrawn before cached replay prevents any new authority`,async()=>{
 const f=await fixture('services');enable(op);const proposed=await f.say(phrase(op)),cmd=command(f,op,proposed);await submitConversation(f.u,f.c.id,cmd);
 if(mode==='specific')vi.stubEnv('STUDIO_CONVERSATION_'+(op==='folder-rename'?'EXISTING_FOLDER_RENAME':'EXISTING_FOLDER_MOVE'),'0');if(mode==='global')vi.stubEnv('STUDIO_CONVERSATION_EXISTING_LOCAL','0');if(mode==='native')vi.stubEnv('STUDIO_CONVERSATION_FILES','0');if(mode==='plan')run("UPDATE subscriptions SET status='canceled' WHERE project_id=?",f.pid);
 const before=rows(f),baseline=stable(),spend=emptySpend();await expect(submitConversation(f.u,f.c.id,cmd)).rejects.toMatchObject({status:mode==='plan'?402:409});expect(rows(f)).toEqual(before);expect(stable()).toEqual(baseline);expect(emptySpend()).toEqual(spend);expect(stateOf(f.pid)).toBeNull();
 if(mode!=='plan'){const view=conversationView(f.u,f.c.id);expect(localEditAllowed(view,op)).toBe(false);expect(view.localFolderRename).toBeUndefined();expect(view.localFolderMove).toBeUndefined();}
});
for(const op of ['folder-rename','folder-move'] as const)it(`${op}: cancellation, expiry and unrelated messages preserve the acquired project`,async()=>{
 const f=await fixture('products');enable(op);const before=rows(f),baseline=stable();let p=await f.say(phrase(op)),old=command(f,op,p);await f.send({action:'cancel-'+op,proposalId:old.proposalId});let view=conversationView(f.u,f.c.id);await expect(submitConversation(f.u,f.c.id,{...old,revision:view.revision,requestId:id()})).rejects.toMatchObject({status:409});
 p=await f.say(phrase(op));const key=op==='folder-rename'?'localFolderRenameProposal':'localFolderMoveProposal';run(`UPDATE agent_conversations SET state_json=json_set(state_json,'$.${key}.expiresAt',0) WHERE id=?`,f.c.id);await expect(submitConversation(f.u,f.c.id,command(f,op,p))).rejects.toMatchObject({status:409});
 p=await f.say(phrase(op));old=command(f,op,p);await f.say('Merci');view=conversationView(f.u,f.c.id);await expect(submitConversation(f.u,f.c.id,{...old,revision:view.revision,requestId:id()})).rejects.toMatchObject({status:409});expect(rows(f)).toEqual(before);expect(stable()).toEqual(baseline);expect(stateOf(f.pid)).toBeNull();
});
for(const op of ['folder-rename','folder-move'] as const)it(`${op}: native tree fingerprint blocks a manual concurrent change with no synthetic brief version`,async()=>{
 const f=await fixture('services');enable(op);const p=await f.say(phrase(op));expect(p.projectRevision).toBeNull();run('UPDATE folders SET name=? WHERE id=?','Manuel',f.parent.id);const before=rows(f),baseline=stable();await expect(submitConversation(f.u,f.c.id,command(f,op,p))).rejects.toMatchObject({status:409});expect(rows(f)).toEqual(before);expect(stable()).toEqual(baseline);expect(stateOf(f.pid)).toBeNull();
});
for(const op of ['folder-rename','folder-move'] as const)it(`${op}: real HTTP and controller recover response loss at projectRevision null`,async()=>{
 const f=await fixture('products');enable(op);jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),f.u.id,now()+3600000,now());let view=await f.say(phrase(op)),posts=0;const before=rows(f),baseline=stable(),spend=emptySpend(),ctx={params:Promise.resolve({cid:f.c.id})},cmd=command(f,op,view),post=(data:unknown,origin='http://localhost')=>thread.POST(new Request('http://localhost/api/test',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(data)}),ctx);
 expect((await post({...cmd,confirmation:false})).status).toBe(400);expect((await post(cmd,'https://foreign.invalid')).status).toBe(403);expect(rows(f)).toEqual(before);
 const memory=new Map<string,string>(),transport=(async(_url:unknown,init?:RequestInit)=>{if(init?.body){posts++;const response=await post(JSON.parse(String(init.body)));expect(response.status).toBe(200);throw Error('Response lost');}return thread.GET(new Request('http://localhost/api/test'),ctx);}) as typeof fetch,onApplied=vi.fn(),create=op==='folder-rename'?createLocalFolderRenameConfirmation:createLocalFolderMoveConfirmation,options={conversationId:f.c.id,view:()=>view,fetch:transport,onView:(v:typeof view)=>{view=v;},onState:()=>{},onApplied,storage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>{memory.delete(k);}},uuid:id},first=create(options);
 await first.confirm();expect(first.getState().uncertain).toBe(true);expect(onApplied).not.toHaveBeenCalled();first.dispose();const resumed=create(options);await resumed.refresh();expect(resumed.getState()).toMatchObject({uncertain:false,error:''});expect(posts).toBe(1);expect(onApplied).toHaveBeenCalledOnce();expect(op==='folder-rename'?hasLocalFolderRenameReceipt(view):hasLocalFolderMoveReceipt(view)).toBe(true);await resumed.refresh();expect(onApplied).toHaveBeenCalledOnce();expect(memory.size).toBe(0);expect(stable()).toEqual(baseline);expect(emptySpend()).toEqual(spend);expect(stateOf(f.pid)).toBeNull();
});
it('opt-in folder capabilities grant neither general adapters nor attachments nor paid preparation',async()=>{
 const f=await fixture('services');enable('folder-rename');enable('folder-move');const before=rows(f),baseline=stable(),spend=emptySpend();expect(()=>ownedConversation(f.u,f.c.id)).toThrowError(expect.objectContaining({code:'conversation_existing_read_only'}));
 for(const extra of [{action:'prepare-action',tool:'understand-offer'},{action:'edit',field:'description',value:'Ne pas créer de fiche'},{action:'message',text:phrase('folder-rename'),photoIds:[f.asset.id]}])await expect(f.send(extra)).rejects.toMatchObject({status:409});
 for(const text of ['Publie le site','Achète un nouveau logo','Génère une vidéo']){const saved=await f.say(text);expect(saved.action).toBeNull();expect(saved.recovery?.aiEnabled).toBe(false);expect(saved.localFolderRename).toBeUndefined();expect(saved.localFolderMove).toBeUndefined();}
 expect(rows(f)).toEqual(before);expect(stable()).toEqual(baseline);expect(emptySpend()).toEqual(spend);expect(stateOf(f.pid)).toBeNull();
});
