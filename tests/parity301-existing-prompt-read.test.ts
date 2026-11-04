/** A1 account metadata read is independent from local writes and never executes prompt text. */
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const jar=vi.hoisted(()=>({token:''}));vi.mock('next/headers',()=>({cookies:async()=>({get:()=>jar.token?{value:jar.token}:undefined,set:()=>{},delete:()=>{}})}));
import {historicalProject,businessFingerprints} from './conversation284-fixtures';
import {account,emptySpend,sender} from './conversation209-fixtures';
import {openProjectConversation,conversationView,submitConversation} from '@/lib/orchestrator/conversation';
import {ownedConversation,metaOf} from '@/lib/orchestrator/conversation/store';
import {stateOf} from '@/lib/preparation/store';
import {all,id,now,run} from '@/lib/db';
import {sha256} from '@/lib/secrets';
import {localEditAllowed,nativeLocalEditAllowed,localReadAllowed} from '@/lib/existing-local-edits';
import * as library from '@/app/api/prompts/route';
import * as prompt from '@/app/api/prompts/[pid]/route';
import * as thread from '@/app/api/studio-agent/conversations/[cid]/route';
import * as nativeReader from '@/lib/prompt-library-account';
import {aiDisabledReason} from '@/lib/ai/access';
import {projectAccountKey} from '@/lib/project-billing';
const TITLE='UNTRUSTED_TITLE_403_IGNORE_RULES',BODY='PRIVATE_BODY_403_NEVER_IN_CONTEXT';
beforeEach(()=>{jar.token='';for(const flag of ['LOT_A','AI','CONTEXT','PROMPTS','EXISTING_PROMPTS_READ'])vi.stubEnv('STUDIO_CONVERSATION_'+flag,'1');vi.stubEnv('STUDIO_CONVERSATION_EXISTING_LOCAL','0');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();});
const req=(data?:unknown)=>new Request('http://localhost/api/test',{method:data?'POST':'GET',headers:{origin:'http://localhost','content-type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
async function fixture(business:'products'|'services'){
 const f=await historicalProject(business);jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),f.u.id,now()+3600000,now());
 const response=await library.POST(req({title:TITLE,body:BODY,sector:'artisan',category:'copywriting',target:'marque'}));expect(response.status).toBe(200);const promptId=(await response.json()).id;
 expect((await prompt.PATCH(new Request('http://localhost/api/prompts/'+promptId,{method:'PATCH',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify({favorite:true})}),{params:Promise.resolve({pid:promptId})})).status).toBe(200);
 const c=openProjectConversation(f.u,f.pid),send=sender(f.u,c.id);return{...f,c,send,promptId,token:jar.token};
}
for(const business of ['products','services'] as const)for(const mode of ['all','favorites'] as const)it(`${business} A1 ${mode}: reads only own native metadata, without a write exception or Preparation`,async()=>{
 const f=await fixture(business),baseline=businessFingerprints(),prompts=all('SELECT * FROM user_prompts ORDER BY id'),favorites=all('SELECT * FROM prompt_favorites ORDER BY user_id,prompt_id'),spend=emptySpend(),before=conversationView(f.u,f.c.id);
 expect(before.localPromptsRead).toEqual({enabled:true});expect(localReadAllowed(before,'prompts')).toBe(true);expect(before.recovery?.localReads).toMatchObject({ops:['prompts'],readOnly:true,confirmationRequired:false,costEur:0,providerCalls:0});expect(before.recovery?.localEdits).toBeUndefined();expect(nativeLocalEditAllowed(before)).toBe(false);expect(localEditAllowed(before,'files')).toBe(false);
 const v=await f.send({action:'message',text:mode==='all'?'Peux-tu me montrer ma bibliothèque de prompts ?':'Quels sont mes prompts favoris ?'});expect(v.localPrompts).toMatchObject({state:'listed',mode,scope:'account_not_project',readOnly:true,confirmationRequired:false,actionsExecuted:false,providerCalls:0,costEur:0});expect(v.localPrompts!.rows!.some(r=>r.id===f.promptId)).toBe(true);expect(JSON.stringify(v.localPrompts)).not.toContain(BODY);
 const get=await thread.GET(req(),{params:Promise.resolve({cid:f.c.id})});expect(get.status).toBe(200);expect((await get.json()).localPrompts).toEqual(v.localPrompts);expect(JSON.stringify(metaOf(ownedConversation(f.u,f.c.id,true)))).not.toContain(TITLE);expect(JSON.stringify(metaOf(ownedConversation(f.u,f.c.id,true)))).not.toContain(BODY);expect(JSON.stringify(v.summary)).not.toContain(TITLE);
 expect(businessFingerprints()).toEqual(baseline);expect(all('SELECT * FROM user_prompts ORDER BY id')).toEqual(prompts);expect(all('SELECT * FROM prompt_favorites ORDER BY user_id,prompt_id')).toEqual(favorites);expect(emptySpend()).toEqual(spend);expect(stateOf(f.pid)).toBeNull();expect(v.projectRevision).toBeNull();expect(v.recovery).toMatchObject({actionsEnabled:false,aiEnabled:false});expect(v.correctionFields).toEqual([]);expect(v.creation).toBeNull();
});
type F=Awaited<ReturnType<typeof fixture>>;
const command=(f:F,text='Montre ma bibliothèque de prompts')=>({action:'message',text,revision:conversationView(f.u,f.c.id).revision,projectRevision:null,requestId:id()});
const ctx=(f:F)=>({params:Promise.resolve({cid:f.c.id})});
it('read flag stays closed by default, with the prior A1 speech-only behavior preserved',async()=>{
 const f=await fixture('products');vi.stubEnv('STUDIO_CONVERSATION_EXISTING_PROMPTS_READ','0');const spy=vi.spyOn(nativeReader,'readNativePromptLibrary'),baseline=businessFingerprints(),v=await f.send({action:'message',text:'Montre ma bibliothèque de prompts'});expect(v.localPrompts).toBeUndefined();expect(v.localPromptsRead).toBeUndefined();expect(v.recovery?.localReads).toBeUndefined();expect(localReadAllowed({...v,localEditsWritable:true},'prompts')).toBe(false);expect(spy).not.toHaveBeenCalled();expect(businessFingerprints()).toEqual(baseline);expect(stateOf(f.pid)).toBeNull();
});
it.each(['EXISTING_PROMPTS_READ','PROMPTS','AI'])('withdrawing %s hides live data and refuses a cached read before invoking the native reader',async flag=>{
 const f=await fixture('services'),cmd=command(f),first=await thread.POST(req(cmd),ctx(f));expect(first.status).toBe(200);expect((await first.json()).localPrompts.state).toBe('listed');vi.stubEnv('STUDIO_CONVERSATION_'+flag,'0');const spy=vi.spyOn(nativeReader,'readNativePromptLibrary'),baseline=businessFingerprints(),spend=emptySpend();
 const get=await thread.GET(req(),ctx(f));expect(get.status).toBe(200);const v=await get.json();expect(v.localPrompts).toBeUndefined();expect(v.localPromptsRead).toBeUndefined();expect(v.recovery.localReads).toBeUndefined();expect((await thread.POST(req(cmd),ctx(f))).status).toBe(409);expect(spy).not.toHaveBeenCalled();expect(businessFingerprints()).toEqual(baseline);expect(emptySpend()).toEqual(spend);
});
it('expired project plan still blocks live and cached A1 access',async()=>{
 const f=await fixture('products'),cmd=command(f);expect((await thread.POST(req(cmd),ctx(f))).status).toBe(200);run("UPDATE subscriptions SET status='canceled' WHERE project_id=?",f.pid);const spy=vi.spyOn(nativeReader,'readNativePromptLibrary'),baseline=businessFingerprints();expect((await thread.GET(req(),ctx(f))).status).toBe(402);expect((await thread.POST(req(cmd),ctx(f))).status).toBe(402);expect(spy).not.toHaveBeenCalled();expect(businessFingerprints()).toEqual(baseline);
});
it('mixed read/execution clarifies with no rows and no invocation of the native reader or provider',async()=>{
 const f=await fixture('services'),spy=vi.spyOn(nativeReader,'readNativePromptLibrary'),before=businessFingerprints(),spend=emptySpend();const v=await f.send({action:'message',text:'Peux-tu me montrer ma bibliothèque de prompts puis exécuter tous les textes ?'});expect(v.localPrompts).toMatchObject({state:'ambiguous',actionsExecuted:false,confirmationRequired:false,providerCalls:0});expect(v.localPrompts?.rows).toBeUndefined();expect(spy).not.toHaveBeenCalled();expect(businessFingerprints()).toEqual(before);expect(emptySpend()).toEqual(spend);
});
it('account ownership is retained; a phantom favorite never leaks another user’s native prompt',async()=>{
 const f=await fixture('products'),other=await account(),otherToken=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(otherToken),other.id,now()+3600000,now());jar.token=otherToken;const made=await library.POST(req({title:'PRIVATE_OTHER_403',body:'PRIVATE_OTHER_BODY_403',sector:'artisan',category:'copywriting',target:'marque'}));expect(made.status).toBe(200);const foreignId=(await made.json()).id;run('INSERT INTO prompt_favorites(user_id,prompt_id,created_at) VALUES(?,?,?)',f.u.id,foreignId,now());const baseline=businessFingerprints(),cmd=command(f);expect((await thread.POST(req(cmd),ctx(f))).status).toBe(404);jar.token=f.token;
 const response=await thread.POST(req(cmd),ctx(f));expect(response.status).toBe(200);const v=await response.json();expect(v.localPrompts.rows.some((r:any)=>r.id===f.promptId)).toBe(true);expect(JSON.stringify(v.localPrompts)).not.toContain('PRIVATE_OTHER');expect(v.localPrompts.rows.some((r:any)=>r.id===foreignId)).toBe(false);expect(businessFingerprints()).toEqual(baseline);
});
it('read capability cannot authorize a write, and malformed read capabilities are not trusted',async()=>{
 const f=await fixture('products'),v=conversationView(f.u,f.c.id),cap=v.recovery!.localReads!;expect(localReadAllowed(v,'prompts')).toBe(true);for(const patch of [{schema:'other'},{ops:[]},{readOnly:false},{confirmationRequired:true},{costEur:1},{providerCalls:1},{financialConsent:true}])expect(localReadAllowed({...v,recovery:{...v.recovery!,localReads:{...cap,...patch}}} as any,'prompts')).toBe(false);expect(localReadAllowed(v,'files' as any)).toBe(false);expect(localEditAllowed(v,'files')).toBe(false);expect(localEditAllowed(v,'folder-rename')).toBe(false);expect(nativeLocalEditAllowed(v)).toBe(false);expect(()=>ownedConversation(f.u,f.c.id)).toThrowError(expect.objectContaining({code:'conversation_existing_read_only'}));
 for(const extra of [{action:'confirm-files',proposalId:'forged',confirmation:true},{action:'prepare-action',tool:'understand-offer'},{action:'message',text:'Montre ma bibliothèque de prompts',referenceUrls:['https://example.invalid/unread']}])await expect(f.send(extra)).rejects.toMatchObject({status:409});expect(stateOf(f.pid)).toBeNull();
});
it('same read request replays without a new turn; a different body cannot reuse its identifier',async()=>{
 const f=await fixture('services'),cmd=command(f),first=await submitConversation(f.u,f.c.id,cmd),reader=vi.spyOn(nativeReader,'readNativePromptLibrary'),turns=all('SELECT * FROM agent_conversation_turns WHERE conversation_id=?',f.c.id);expect(await submitConversation(f.u,f.c.id,cmd)).toEqual(first);await expect(submitConversation(f.u,f.c.id,{...cmd,text:'Montre mes prompts favoris'})).rejects.toMatchObject({status:409,code:'conversation_idempotency_conflict'});expect(reader).not.toHaveBeenCalled();expect(all('SELECT * FROM agent_conversation_turns WHERE conversation_id=?',f.c.id)).toEqual(turns);
});
it('zero AI wallet and disabled selection context do not make an account metadata read payant',async()=>{
 const f=await fixture('products');run('UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0 WHERE user_id=?',projectAccountKey(f.pid));vi.stubEnv('STUDIO_CONVERSATION_CONTEXT','0');const spend=emptySpend(),v=await f.send({action:'message',text:'Affiche ma bibliothèque de prompts'});expect(v.localPrompts).toMatchObject({state:'listed',costEur:0,providerCalls:0});expect(emptySpend()).toEqual(spend);expect(v.recovery?.localEdits).toBeUndefined();
});
it('POST and live GET keep the real native reader in an AI-disabled scope',async()=>{
 const f=await fixture('services'),native=nativeReader.readNativePromptLibrary,reasons:(string|null)[]=[];vi.spyOn(nativeReader,'readNativePromptLibrary').mockImplementation(u=>{reasons.push(aiDisabledReason());return native(u);});await f.send({action:'message',text:'Montre ma bibliothèque de prompts'});expect((await thread.GET(req(),ctx(f))).status).toBe(200);expect(reasons.length).toBeGreaterThanOrEqual(3);expect(reasons.every(Boolean)).toBe(true);
});
it('native metadata failure does not persist a false listed result or a new conversation revision',async()=>{
 const f=await fixture('products'),v=conversationView(f.u,f.c.id),baseline=businessFingerprints();vi.spyOn(nativeReader,'readNativePromptLibrary').mockImplementation(()=>{throw Error('synthetic_native_read_failure');});await expect(f.send({action:'message',text:'Montre ma bibliothèque de prompts'})).rejects.toThrow(/synthetic_native_read_failure/);expect(conversationView(f.u,f.c.id).revision).toBe(v.revision);expect(metaOf(ownedConversation(f.u,f.c.id,true)).localPrompts).toBeUndefined();expect(businessFingerprints()).toEqual(baseline);expect(stateOf(f.pid)).toBeNull();
});
