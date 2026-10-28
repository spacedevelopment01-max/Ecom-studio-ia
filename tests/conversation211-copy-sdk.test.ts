/** Router, token preflight, reservations and receipts are native; the SDK itself is an explicit in-process double. No HTTP. */
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const fake=vi.hoisted(()=>({calls:[] as {model:string;messages:{content:string|{text?:string}[]}[]}[],reply:null as unknown,tokens:0,tokenizations:0}));
vi.mock('@anthropic-ai/sdk',()=>{
 class APIError extends Error{status?:number;}
 class Anthropic{
  static AuthenticationError=class extends APIError{};static BadRequestError=class extends APIError{};static NotFoundError=class extends APIError{};
  constructor(_opts:unknown){}
  private stream(p:typeof fake.calls[number]){fake.calls.push(structuredClone(p));return{finalMessage:async()=>({model:p.model,stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(fake.reply)}],usage:{input_tokens:fake.tokens,output_tokens:300}})};}
  messages={countTokens:async(p:unknown)=>{fake.tokenizations++;fake.tokens=Math.ceil(JSON.stringify(p).length/3);return{input_tokens:fake.tokens};},stream:(p:typeof fake.calls[number])=>this.stream(p)};
  beta={messages:{stream:(p:typeof fake.calls[number])=>this.stream(p)}};
 }
 return{default:Anthropic,Anthropic};
});
vi.mock('@/lib/ai/config',async original=>({...await original() as object,activeProviderKey:()=> 'FOURNISSEUR FICTIF SANS SECRET'}));
import {longCopyCase,goodCopyReview} from './copy211-fixtures';
import {aiShopCopy,aiQcText,aiCopyReview} from '@/lib/ai/tasks';
import {enqueue,claimNext,completeJob,failJob} from '@/lib/jobs';
import {runForUser} from '@/lib/ai/access';
import {withTrace,CostCapReached} from '@/lib/ai/trace';
import {all,run} from '@/lib/db';
import {balance} from '@/lib/billing';
import {projectAccountKey} from '@/lib/project-billing';
beforeEach(()=>{fake.calls=[];fake.reply=null;fake.tokens=0;fake.tokenizations=0;vi.stubGlobal('fetch',vi.fn(()=>{throw new Error('No real HTTP in E4 SDK tests');}));});
afterEach(()=>vi.unstubAllGlobals());
async function native(f:Awaited<ReturnType<typeof longCopyCase>>,kind:'write'|'qc'|'review',cap=2_000_000){
 const queued=enqueue({userId:f.u.id,projectId:f.p.id,type:'copy.build',label:'E4 SDK SIMULÉ',payload:{},maxAttempts:1}),job=claimNext(['copy.build'])!;expect(job.id).toBe(queued.id);const b={...f.base,jobId:job.id,usageKey:`${job.id}:${kind}`};
 const perform:()=>Promise<unknown>=()=>kind==='write'?aiShopCopy(b,f.p,'Correction ciblée uniquement.',f.previous):kind==='qc'?aiQcText(b,f.p,'Texte complet de recette',f.previous):aiCopyReview(b,f.p,'Texte complet de recette',f.previous);
 try{const result=await runForUser(f.u.id,()=>withTrace({jobId:job.id,projectId:f.p.id,costCapMicro:cap},perform),'normal',f.p.id);completeJob(job.id,result);return{job,result};}catch(error){failJob(job,error,{permanent:true});throw error;}
}
function extract(p:typeof fake.calls[number],tag:string){const text=p.messages.flatMap(m=>typeof m.content==='string'?[m.content]:m.content.map(c=>c.text??'')).join('\n');const start=text.indexOf(`<${tag}>`),end=text.lastIndexOf(`</${tag}>`);expect(start).toBeGreaterThanOrEqual(0);expect(end).toBeGreaterThan(start);return JSON.parse(text.slice(start+tag.length+2,end).trim());}
describe('#211 E4 — transport complet et budget natif sous SDK simulé',()=>{
 it.each(['products','services'] as const)('porte le document entier jusqu’au SDK et règle chaque appel une seule fois (%s)',async business=>{
  const f=await longCopyCase(business),before=balance(f.u.id,f.p.id);for(const kind of ['write','qc','review'] as const){fake.reply=kind==='write'?f.copy:kind==='qc'?{verdict:'ok',issues:[]}:goodCopyReview;const{job,result}=await native(f,kind);expect(result).toEqual(fake.reply);expect(extract(fake.calls.at(-1)!,kind==='write'?'version_precedente':'contenu')).toEqual(f.previous);expect(all<{status:string;amount:number;actual:number}>('SELECT status,amount,actual FROM ai_reservations WHERE job_id=?',job.id)).toEqual([expect.objectContaining({status:'settled',actual:expect.any(Number)})]);expect(all('SELECT id FROM usage_events WHERE job_id=?',job.id)).toHaveLength(1);expect(all("SELECT id FROM ai_calls WHERE job_id=? AND status='ok'",job.id)).toHaveLength(1);}
  const after=balance(f.u.id,f.p.id);expect(fake.calls).toHaveLength(3);expect(fake.tokenizations).toBeGreaterThan(0);expect(after.used).toBeGreaterThan(before.used);expect(after.reserved).toBe(0);
 });
 it('conserve le plafond de tâche et bloque avant toute génération au-delà de ce plafond',async()=>{const f=await longCopyCase('products');fake.reply=goodCopyReview;await expect(native(f,'review',1)).rejects.toBeInstanceOf(CostCapReached);expect(fake.calls).toHaveLength(0);expect(all('SELECT id FROM ai_reservations WHERE project_id=?',f.p.id)).toHaveLength(0);expect(balance(f.u.id,f.p.id).used).toBe(0);});
 it('respecte un budget de projet épuisé sans raccourcir le document pour faire partir l’appel',async()=>{const f=await longCopyCase('services');fake.reply=goodCopyReview;run('UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0 WHERE user_id=?',projectAccountKey(f.p.id));expect(balance(f.u.id,f.p.id).available).toBe(0);await expect(native(f,'review')).rejects.toThrow();expect(fake.calls).toHaveLength(0);expect(all('SELECT id FROM ai_reservations WHERE project_id=?',f.p.id)).toHaveLength(0);});
});
