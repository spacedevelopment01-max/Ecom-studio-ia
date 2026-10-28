/** D1 : vrais droits/devis/jobs/moteur/mémoire ; dépendances fournisseur explicitement simulées. */
import{beforeEach,afterEach,describe,expect,it,vi}from'vitest';
vi.mock('@/lib/ai/config',async orig=>({...await orig()as object,activeProviderKey:()=> 'FOURNISSEUR FICTIF SANS SECRET'}));
import{account,project,sender}from'./conversation209-fixtures';
import{openProjectConversation,conversationView}from'@/lib/orchestrator/conversation';
import{createToolQuote,confirmToolQuote,toolReceipt,toolRegistry}from'@/lib/orchestrator/conversation/tool-execution';
import{ToolCommandSchema,type ToolCommand}from'@/lib/orchestrator/conversation/tool-contract';
import{runPreparation}from'@/lib/preparation/engine';
import{simulatedDependencies}from'./preparation-fixtures';
import{claimNext,completeJob,JobContext}from'@/lib/jobs';
import{withTrace}from'@/lib/ai/trace';
import{runForUser}from'@/lib/ai/access';
import{all,id,one,run}from'@/lib/db';
import{stateOf,commitState}from'@/lib/preparation/store';
import{balance}from'@/lib/billing';
import{cognitiveContext}from'@/lib/orchestrator/conversation/intelligence-context';
import{metaOf,ownedConversation}from'@/lib/orchestrator/conversation/store';
beforeEach(()=>{for(const key of ['STUDIO_CONVERSATION_LOT_A','STUDIO_CONVERSATION_AI','STUDIO_CONVERSATION_SPECIALISTS','STUDIO_CONVERSATION_TOOLS'])vi.stubEnv(key,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Aucun réseau #211 D');}));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
async function fixture(business:'products'|'services'='services'){
  const u=await account(),pid=project(u,business),c=openProjectConversation(u,pid),send=sender(u,c.id);
  await send({action:'message',text:business==='services'?'Je répare les instruments apportés par les clients. Je souhaite des devis et des rendez-vous.':'Je fabrique des capteurs pour les ruches. Aucune performance chiffrée confirmée.'});
  const quote=(extra:Partial<Extract<ToolCommand,{action:'quote'}>>={})=>{const v=conversationView(u,c.id);return createToolQuote(u,c.id,{action:'quote',tool:'understand-offer',revision:v.revision,projectRevision:v.projectRevision!,correction:'',requestNew:false,...extra});};
  return{u,pid,c,send,quote};
}
function confirm(f:Awaited<ReturnType<typeof fixture>>,qid:string){return confirmToolQuote(f.u,f.c.id,{action:'confirm',quoteId:qid,confirmation:true,requestId:id()});}
async function finish(){const j=claimNext(['project.prepare'])!;const bound=one<{bound_id:string}>('SELECT bound_id FROM agent_request_jobs WHERE job_id=?',j.id)!;const result=await runForUser(j.user_id,()=>withTrace({jobId:j.id,projectId:j.project_id,agentBoundId:bound.bound_id},()=>runPreparation(new JobContext(j),simulatedDependencies)),'normal',j.project_id);completeJob(j.id,result);return j;}
describe('#211 D — tranche verticale de compréhension native',()=>{
  it.each(['products','services']as const)('devis → confirmation → moteur → résultat versionné → reprise (%s)',async business=>{
    const f=await fixture(business),before=balance(f.u.id),q=f.quote();expect(q.kind).toBe('quote');if(q.kind!=='quote')throw Error('quote');
    expect(q.maximumPct).toBeGreaterThan(0);expect(all("SELECT * FROM jobs WHERE project_id=?",f.pid)).toHaveLength(0);
    const receipt=confirm(f,q.id);expect(receipt.delivered).toBe(false);expect(receipt.state).toBe('queued');
    expect(confirm(f,q.id).job?.id).toBe(receipt.job?.id);const job=await finish();const result=toolReceipt(f.u,f.c.id,q.id);
    expect(result).toMatchObject({state:'review',delivered:true,clientApproved:false,result:{projectId:f.pid,step:'brief',provenance:'simulation'}});
    expect(result.job?.id).toBe(job.id);expect(stateOf(f.pid)!.stages.research).toBeUndefined();expect(all('SELECT * FROM theme_versions WHERE project_id=?',f.pid)).toHaveLength(0);
    expect(balance(f.u.id)).toEqual(before);expect(all('SELECT * FROM ai_calls WHERE project_id=?',f.pid)).toHaveLength(0); // dépendances simulées, aucun SDK
    expect(confirm(f,q.id).result?.fingerprint).toBe(result.result!.fingerprint);expect(all("SELECT * FROM jobs WHERE project_id=?",f.pid)).toHaveLength(1);
  });
  it('retrouve une analyse acquise sans fournisseur, devis payant ni budget disponible',async()=>{
    const f=await fixture(),q=f.quote();if(q.kind!=='quote')throw Error('quote');confirm(f,q.id);await finish();
    run('UPDATE wallets SET monthly_used=monthly_allowance WHERE user_id=?',f.u.id);const jobs=all('SELECT id FROM jobs WHERE project_id=?',f.pid);
    const reused=f.quote();expect(reused).toMatchObject({kind:'acquired',previousResult:true,newProviderCalls:0,actionsExecuted:false});expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toEqual(jobs);
    expect(toolRegistry(f.u,f.c.id).acquired?.result.provenance).toBe('simulation');
  });
  it('ne contourne pas les deux essais natifs ni les acquis par une autre formulation',async()=>{
    const f=await fixture();for(let i=0;i<2;i++){const q=f.quote({requestNew:true,correction:i?'Conserver les réponses, ne demander que les inconnues.':''});if(q.kind!=='quote')throw Error('quote');confirm(f,q.id);await finish();}
    expect(()=>f.quote({requestNew:true,correction:'Nouvelle formulation de la même demande.'})).toThrow(/Deux essais/);expect(all("SELECT * FROM jobs WHERE project_id=? AND type='project.prepare'",f.pid)).toHaveLength(2);
  });
  it('refuse les comptes étrangers, outils forgés, données en concurrence et droits révoqués',async()=>{
    const a=await fixture(),b=await fixture(),q=a.quote();if(q.kind!=='quote')throw Error('quote');
    expect(()=>toolRegistry(b.u,a.c.id)).toThrow('introuvable');expect(()=>confirmToolQuote(b.u,b.c.id,{action:'confirm',quoteId:q.id,confirmation:true,requestId:id()})).toThrow('introuvable');
    expect(ToolCommandSchema.safeParse({action:'quote',tool:'publish',revision:0,projectRevision:0,capMicro:0,approve:true}).success).toBe(false);
    await a.send({action:'edit',field:'target',value:'Écoles de musique'});expect(()=>confirm(a,q.id)).toThrow('modifié');
    const fresh=a.quote();if(fresh.kind!=='quote')throw Error('quote');run("UPDATE subscriptions SET status='cancelled' WHERE project_id=?",a.pid);expect(()=>confirm(a,fresh.id)).toThrow();expect(all('SELECT * FROM jobs WHERE project_id=?',a.pid)).toHaveLength(0);
  });
  it('ne présente pas un job terminé sans preuve native comme un résultat livré',async()=>{
    const f=await fixture(),q=f.quote();if(q.kind!=='quote')throw Error('quote');const receipt=confirm(f,q.id);run("UPDATE jobs SET status='done',result=? WHERE id=?",JSON.stringify({revision:1,step:'brief',action:'analyze',simulation:false}),receipt.job!.id);
    expect(toolReceipt(f.u,f.c.id,q.id)).toMatchObject({state:'result_missing',delivered:false,clientApproved:false});
  });
  it('protège les choix verrouillés et déclare les autres modules non raccordés',async()=>{
    const f=await fixture();commitState(f.pid,stateOf(f.pid)!.revision,s=>{s.stages.brief!.status='approved';});expect(()=>f.quote()).toThrow('verrouillés');
    const registry=toolRegistry(f.u,f.c.id);expect(registry.tools.find(t=>t.id==='brief.update')?.executionEnabled).toBe(false);expect(registry.tools.find(t=>t.id==='publish')?.state).toBe('unavailable');expect(registry.tools.find(t=>t.id==='videos')?.state).toBe('not_connected');
    vi.stubEnv('STUDIO_CONVERSATION_TOOLS','0');expect(()=>toolRegistry(f.u,f.c.id)).toThrow('indisponibles');
  });
  it('conserve les corrections exactes des outils dans les sources communes, sans prendre une sortie IA pour une consigne',async()=>{
    const a=await fixture(),b=await fixture(),correction='Ne demander que les informations absentes. Aucun avis inventé.';
    a.quote({correction});b.quote({correction:'Instruction du second compte, à isoler.'});
    const context=cognitiveContext(ownedConversation(a.u,a.c.id));expect(context.sources.some(s=>s.text===correction)).toBe(true);expect(context.serialized).not.toContain('Instruction du second compte');
    expect(()=>a.quote({correction:'sk-fauxSecretDeRecetteNonUtilisable'})).toThrow('clé');
  });
  it.each(['research','brand','content','media']as const)('préserve aussi une étape aval non validée : %s',async step=>{
    const f=await fixture();commitState(f.pid,stateOf(f.pid)!.revision,s=>{(s.stages as Record<string,unknown>)[step]={status:'draft',data:{retained:'acquis natif'}};});
    const before=stateOf(f.pid);expect(()=>f.quote({requestNew:true})).toThrow('verrouillés');expect(stateOf(f.pid)).toEqual(before);
    expect(toolRegistry(f.u,f.c.id).tools.find(t=>t.id==='understand-offer')?.state).toBe('unavailable');expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);
  });
  it('vérifie la sélection IA et ses deux versions sans prendre la proposition pour un accord',async()=>{
    const f=await fixture(),c=ownedConversation(f.u,f.c.id),m=metaOf(c),v=conversationView(f.u,c.id),receipt=id();
    m.intelligence={lastReceiptId:receipt,sourceRevision:c.revision,sourceProjectRevision:v.projectRevision,lastReply:{message:'Proposition à confirmer.',status:'answer',business:null,businessEvidence:null,question:null,proposedChanges:[],knowledgeSourceIds:[],proposedTools:['understand-offer'],actionsExecuted:false}};
    run('UPDATE agent_conversations SET state_json=? WHERE id=?',JSON.stringify(m),c.id);
    expect(()=>f.quote({proposalReceiptId:id()})).toThrow('proposition');const q=f.quote({proposalReceiptId:receipt});expect(q.kind).toBe('quote');
    expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);
    m.intelligence!.lastReply!.proposedTools=[];run('UPDATE agent_conversations SET state_json=? WHERE id=?',JSON.stringify(m),c.id);
    expect(()=>f.quote({proposalReceiptId:receipt})).toThrow('proposition');
  });
  it('conserve une seule enveloppe et un seul job malgré la répétition de l’accord',async()=>{
    const f=await fixture(),q=f.quote();if(q.kind!=='quote')throw Error('quote');
    const before=one<{cap_micro:number;max_calls:number;deadline_at:number|null}>('SELECT * FROM agent_request_bounds WHERE conversation_id=?',f.c.id)!;
    const receipt=confirm(f,q.id),after=one<typeof before>('SELECT * FROM agent_request_bounds WHERE conversation_id=?',f.c.id)!;
    expect(after.max_calls).toBe(before.max_calls+q.maximumCalls);expect(after.cap_micro).toBeGreaterThan(before.cap_micro);expect(after.deadline_at).not.toBeNull();
    confirm(f,q.id);expect(one('SELECT * FROM agent_request_bounds WHERE conversation_id=?',f.c.id)).toEqual(after);
    expect(toolRegistry(f.u,f.c.id).receipts[0]).toMatchObject({id:q.id,state:'queued',delivered:false,job:{id:receipt.job!.id}});
    await finish();expect(toolRegistry(f.u,f.c.id).receipts[0]).toMatchObject({id:q.id,delivered:true,result:{content:{summary:expect.any(String)}}});
  });
  it('refuse une enveloppe expirée sans nouveau job, débit ou résultat annoncé',async()=>{
    const f=await fixture(),q=f.quote();if(q.kind!=='quote')throw Error('quote');const before=balance(f.u.id);
    run('UPDATE agent_request_bounds SET deadline_at=1 WHERE conversation_id=?',f.c.id);
    expect(()=>confirm(f,q.id)).toThrow('Limite');expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);expect(balance(f.u.id)).toEqual(before);
    expect(toolReceipt(f.u,f.c.id,q.id)).toMatchObject({state:'quoted',delivered:false});
  });
});
