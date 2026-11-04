import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const jar=vi.hoisted(()=>({token:''}));vi.mock('next/headers',()=>({cookies:async()=>({get:()=>jar.token?{value:jar.token}:undefined,set:()=>{},delete:()=>{}})}));
import {POST as nativeCreate} from '@/app/api/projects/[id]/folders/route';
import {sha256} from '@/lib/secrets';
import {account,project,sender,emptySpend} from './conversation209-fixtures';
import {openProjectConversation,submitConversation,conversationView} from '@/lib/orchestrator/conversation';
import {createFolder} from '@/lib/library';
import {projectAccountKey} from '@/lib/project-billing';
import {all,id,run,now} from '@/lib/db';
import {hasLocalFoldersReceipt} from '@/lib/local-folders-confirmation-client';
beforeEach(()=>{for(const flag of ['LOT_A','AI','CONTEXT','FILES'])vi.stubEnv('STUDIO_CONVERSATION_'+flag,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
async function fixture(){const u=await account(),pid=project(u),c=openProjectConversation(u,pid),send=sender(u,c.id);return{u,pid,c,send,say:(text:string)=>send({action:'message',text,context:{tab:'fichiers',target:null}})};}
type F=Awaited<ReturnType<typeof fixture>>;
const rows=(f:F)=>all('SELECT * FROM folders WHERE project_id=? ORDER BY id',f.pid);
const agree=(f:F,v:any)=>submitConversation(f.u,f.c.id,{action:'confirm-folder',proposalId:v.localFolders.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:id()});
it('creates exactly one native empty root folder only after free agreement; retry/reload do not duplicate',async()=>{
 const f=await fixture(),before=rows(f),spend=emptySpend(),v=await f.say('Crée le dossier « Atelier » à la racine');
 expect(v.localFolders).toMatchObject({state:'proposed',confirmationRequired:true,diff:{before:null,after:{name:'Atelier',parentId:null}}});expect(rows(f)).toEqual(before);
 const body={action:'confirm-folder',proposalId:v.localFolders!.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:id()},saved=await submitConversation(f.u,f.c.id,body);
 expect(hasLocalFoldersReceipt(saved)).toBe(true);expect(rows(f)).toHaveLength(before.length+1);expect(saved.localFolders!.result).toMatchObject({name:'Atelier',parentId:null,system:false});
 expect(await submitConversation(f.u,f.c.id,body)).toEqual(saved);expect(conversationView(f.u,f.c.id).localFolders).toEqual(saved.localFolders);expect(rows(f)).toHaveLength(before.length+1);expect(emptySpend()).toEqual(spend);
 for(const patch of [{costEur:1},{providerCalls:1},{financialConsent:true},{publication:true},{projectId:'foreign'},{result:{...saved.localFolders!.result,name:'autre'}}])expect(hasLocalFoldersReceipt({...saved,localFolders:{...saved.localFolders!,...patch}} as any)).toBe(false);
});
it('unique exact parent name or native id is required; assets and parent row remain unchanged',async()=>{
 const f=await fixture(),parent=createFolder(f.pid,'Photos',null),before=rows(f),assets=all('SELECT * FROM assets WHERE project_id=?',f.pid),v=await f.say(`Ajoute un dossier « Retouches » dans le dossier « ${parent.id} »`);
 expect(v.localFolders).toMatchObject({state:'proposed',parent:{id:parent.id,name:'Photos'},diff:{after:{parentId:parent.id}}});await agree(f,v);expect(rows(f)).toEqual(expect.arrayContaining(before));expect(all('SELECT * FROM assets WHERE project_id=?',f.pid)).toEqual(assets);
});
it('duplicate parent names, absent/foreign parents, ambiguous and chained phrases never choose a target',async()=>{
 const f=await fixture();createFolder(f.pid,'Photos',null);createFolder(f.pid,'Photos',null);const other=await account(),foreign=createFolder(project(other),'Secret',null),before=rows(f);
 for(const text of ['Crée un dossier','Crée le dossier « Neuf » dans le dossier « Photos »','Crée le dossier « Neuf » dans le dossier « absent »',`Crée le dossier « Neuf » dans le dossier « ${foreign.id} »`,'Crée le dossier « Neuf » à la racine puis déplace tout','Crée le dossier « '+ 'a'.repeat(121)+' » à la racine']){const v=await f.say(text);expect(v.localFolders).toMatchObject({state:'ambiguous',confirmationRequired:false,actionsExecuted:false});expect(v.action?.state).not.toBe('quote');}
 expect(rows(f)).toEqual(before);
});
it('same-parent duplicate is refused but identical name in a different parent remains explicit',async()=>{
 const f=await fixture(),parent=createFolder(f.pid,'Parent',null);createFolder(f.pid,'Atelier',null);
 expect((await f.say('Crée le dossier « Atelier » à la racine')).localFolders!.state).toBe('ambiguous');const v=await f.say('Crée le dossier « Atelier » dans le dossier « Parent »');expect(v.localFolders!.state).toBe('proposed');await agree(f,v);expect(rows(f).filter((x:any)=>x.name==='Atelier')).toHaveLength(2);
});
for(const change of ['rename','move','delete','insert'] as const)it('concurrent folder '+change+' invalidates agreement without overwriting manual work',async()=>{
 const f=await fixture(),parent=createFolder(f.pid,'Parent',null),v=await f.say('Crée le dossier « Nouveau » dans le dossier « Parent »');
 if(change==='rename')run('UPDATE folders SET name=? WHERE id=?','Manuel',parent.id);if(change==='move')run('UPDATE folders SET parent_id=? WHERE id=?',createFolder(f.pid,'Autre',null).id,parent.id);if(change==='delete')run('DELETE FROM folders WHERE id=?',parent.id);if(change==='insert')createFolder(f.pid,'Autre manuel',null);
 const manual=rows(f);await expect(agree(f,v)).rejects.toMatchObject({status:409});expect(rows(f)).toEqual(manual);
});
it('cancellation, expired proposal and later conversation turn never create the old folder',async()=>{
 const f=await fixture(),before=rows(f);let v=await f.say('Crée le dossier « Nouveau » à la racine');await f.send({action:'cancel-folder',proposalId:v.localFolders!.proposalId});await expect(agree(f,{...conversationView(f.u,f.c.id),localFolders:v.localFolders})).rejects.toMatchObject({status:409});
 v=await f.say('Crée le dossier « Nouveau » à la racine');run("UPDATE agent_conversations SET state_json=json_set(state_json,'$.localFolderProposal.expiresAt',0) WHERE id=?",f.c.id);await expect(agree(f,v)).rejects.toMatchObject({status:409});
 v=await f.say('Crée le dossier « Nouveau » à la racine');await f.say('Montre les fichiers');await expect(agree(f,{...conversationView(f.u,f.c.id),localFolders:v.localFolders})).rejects.toMatchObject({status:409});expect(rows(f)).toEqual(before);
});
it('owner, tab and feature checks prevent writes and never fall back to paid reasoning',async()=>{
 const f=await fixture(),v=await f.say('Crée le dossier « Nouveau » à la racine'),other=await account(),before=rows(f);
 await expect(submitConversation(other,f.c.id,{action:'confirm-folder',proposalId:v.localFolders!.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:id()})).rejects.toMatchObject({status:404});
 await expect(f.send({action:'message',text:'Crée le dossier « Faux » à la racine',context:{tab:'produit',target:null}})).rejects.toMatchObject({status:409});
 vi.stubEnv('STUDIO_CONVERSATION_FILES','0');await expect(agree(f,v)).rejects.toMatchObject({status:404});expect(rows(f)).toEqual(before);
});
it('an exhausted AI wallet does not turn the native free folder into a purchase',async()=>{
 const f=await fixture();run("UPDATE subscriptions SET plan='creer' WHERE user_id=?",f.u.id);run('UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0 WHERE user_id=?',projectAccountKey(f.pid));const spend=emptySpend(),v=await f.say('Crée le dossier « Gratuit » à la racine');expect(hasLocalFoldersReceipt(await agree(f,v))).toBe(true);expect(emptySpend()).toEqual(spend);
});

it('matches the native authenticated folder creation route without generating assets',async()=>{
 const f=await fixture(),parent=createFolder(f.pid,'Parent natif',null),v=await f.say('Crée le dossier « Enfant » dans le dossier « Parent natif »'),saved=await agree(f,v);
 jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),f.u.id,now()+3600000,now());
 const response=await nativeCreate(new Request('http://localhost/api/projects/'+f.pid+'/folders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Enfant',parentId:parent.id})}),{params:Promise.resolve({id:f.pid})});
 expect(response.status).toBe(200);const native=(await response.json()).folder;expect(saved.localFolders!.result).toMatchObject({name:native.name,parentId:native.parentId,system:native.system});expect(native.count).toBe(0);expect(all('SELECT * FROM assets WHERE project_id=?',f.pid)).toHaveLength(0);
});
it('a canceled subscription refuses the pending agreement without creating a folder',async()=>{
 const f=await fixture(),v=await f.say('Crée le dossier « Refusé » à la racine'),before=rows(f);run("UPDATE subscriptions SET status='canceled' WHERE user_id=?",f.u.id);await expect(agree(f,v)).rejects.toBeDefined();expect(rows(f)).toEqual(before);
});
it('capability declares only free empty-folder creation and respects its closed feature flag',async()=>{
 const f=await fixture(),{studioOperationCatalogue}=await import('@/lib/orchestrator/conversation/studio-operations');
 expect(studioOperationCatalogue(f.pid,true).rows.find(r=>r.id==='folders.create')).toMatchObject({implementation:'implemented',connectionEnabled:true,evidence:'isolated_local_execution',cost:'free',confirmation:'separate_explicit_free_confirmation',supportedActions:['create-empty-exact-name-and-parent'],unsupportedActions:['implicit-parent','rename','move','delete','bulk']});
 vi.stubEnv('STUDIO_CONVERSATION_FILES','0');expect(studioOperationCatalogue(f.pid,true).rows.find(r=>r.id==='folders.create')?.connectionEnabled).toBe(false);await expect(f.say('Crée le dossier « Fermé » à la racine')).rejects.toMatchObject({status:404});
});
