/** Fournisseur SDK SIMULÉ ; routeur, devis, réservations, traces, usage et reprise NATIFS. Aucun réseau. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ text: '{}', calls: 0, error: false,status:500 }));
vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error { status?: number; }
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    constructor(_opts: unknown) {}
    private stream(p: { model: string }) {
      fake.calls++;
      if (fake.error) { const e = new APIError('Fournisseur SIMULÉ indisponible'); e.status = fake.status; throw e; }
      return { finalMessage: async () => ({ model: p.model, stop_reason: 'end_turn', content: [{ type: 'text', text: fake.text }], usage: { input_tokens: 800, output_tokens: 300 } }) };
    }
    messages = { countTokens: async (p: unknown) => ({ input_tokens: Math.ceil(JSON.stringify(p).length / 3) }), stream: (p: {model:string}) => this.stream(p) };
    beta = { messages: { stream: (p: {model:string}) => this.stream(p) } };
  }
  return { default: Anthropic, Anthropic };
});
vi.mock('@/lib/ai/config', async orig => ({ ...(await orig() as object), activeProviderKey: () => 'FOURNISSEUR FICTIF SANS SECRET' }));
import { account, project, sender } from './conversation209-fixtures';
import { openDraft,openProjectConversation, conversationView } from '@/lib/orchestrator/conversation';
import { createCognitiveQuote, confirmCognitiveQuote, runCognitiveJob } from '@/lib/orchestrator/conversation/intelligence';
import { claimNext, JobContext, type Job } from '@/lib/jobs';
import { all, id, one, run } from '@/lib/db';
import { balance } from '@/lib/billing';
import { setJsonSetting } from '@/lib/settings';
import { routeFor } from '@/lib/ai/config';

beforeEach(() => { vi.stubEnv('STUDIO_CONVERSATION_LOT_A','1'); vi.stubEnv('STUDIO_CONVERSATION_AI','1'); fake.calls=0; fake.error=false;fake.status=500; vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Aucun réseau #211');})); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
async function setup() {
  const user=await account(), c=openDraft(user), send=sender(user,c.id);
  const text='Je fabrique des capteurs pour les ruches. Aucun chiffre de performance confirmé.';
  await send({action:'message',text});
  fake.text=JSON.stringify({message:'Les caractéristiques techniques restent à confirmer. À qui destinez-vous ces capteurs ?',status:'question',business:'products',businessEvidence:{sourceId:'brief.description',quote:text},question:{id:'clientele-apiculture',field:'target',title:'À qui souhaitez-vous vous adresser ?',why:'Le niveau technique et les textes en dépendent.',multiple:false,choices:[{id:'professionnels',label:'Apiculteurs professionnels'},{id:'other',label:'Autre / préciser'}]},proposedChanges:[],knowledgeSourceIds:[],proposedTools:[],actionsExecuted:false});
  const v=conversationView(user,c.id), q=createCognitiveQuote(user,c.id,{revision:v.revision,projectRevision:v.projectRevision});
  return {user,cid:c.id,q};
}
describe('#211 B — budget natif sous SDK simulé',()=>{
  it('réserve puis règle le coût simulé une seule fois, sous le plafond consenti, avec traces et reçu',async()=>{
    const {user,cid,q}=await setup(),before=balance(user.id);
    const confirmed=confirmCognitiveQuote(user,cid,q.id,id()),job=claimNext(['agent.reason'])!,ctx=new JobContext(job);
    expect(job.id).toBe(confirmed.jobId); const result=await runCognitiveJob(ctx);
    const after=balance(user.id), reservation=one<{status:string;amount:number;actual:number}>('SELECT status,amount,actual FROM ai_reservations WHERE job_id=?',job.id)!;
    expect(reservation.status).toBe('settled'); expect(reservation.actual).toBeGreaterThan(0); expect(reservation.actual).toBeLessThanOrEqual(reservation.amount);
    expect(after.used-before.used).toBeGreaterThan(0); expect(after.reserved).toBe(0);
    expect(all('SELECT * FROM ai_calls WHERE job_id=?',job.id)).toHaveLength(1);
    expect(all('SELECT * FROM usage_events WHERE job_id=?',job.id)).toHaveLength(1);
    await runCognitiveJob(new JobContext(one<Job>('SELECT * FROM jobs WHERE id=?',job.id)!));
    expect(fake.calls).toBe(1); expect(balance(user.id).used).toBe(after.used);
    expect(result.actionsExecuted).toBe(false);
  });
  it('une réponse JSON invalide déjà facturée n’est pas repayée à la reprise',async()=>{
    const {user,cid,q}=await setup(); fake.text='réponse invalide';
    confirmCognitiveQuote(user,cid,q.id,id()); const job=claimNext(['agent.reason'])!;
    await expect(runCognitiveJob(new JobContext(job))).rejects.toThrow();
    const used=balance(user.id).used; expect(fake.calls).toBe(1); expect(used).toBeGreaterThan(0);
    await expect(runCognitiveJob(new JobContext(one<Job>('SELECT * FROM jobs WHERE id=?',job.id)!))).rejects.toThrow();
    expect(fake.calls).toBe(1); expect(balance(user.id).used).toBe(used);
    expect(one<{result:string}>('SELECT result FROM ai_reservations WHERE job_id=?',job.id)?.result).toBeTruthy();
  });
  it('reprend le reçu acquis après expiration du devis et changement de route, sans budget supplémentaire',async()=>{
    const {user,cid,q}=await setup();
    confirmCognitiveQuote(user,cid,q.id,id());const job=claimNext(['agent.reason'])!,original=one<{revision:number;state_json:string}>('SELECT revision,state_json FROM agent_conversations WHERE id=?',cid)!;
    await runCognitiveJob(new JobContext(job));const used=balance(user.id).used;
    // Coupure simulée : le reçu natif a été écrit, mais ni checkpoint ni réponse conversationnelle.
    run('DELETE FROM agent_conversation_turns WHERE conversation_id=? AND revision>?',cid,original.revision);
    run('UPDATE agent_conversations SET revision=?,state_json=? WHERE id=?',original.revision,original.state_json,cid);
    run("UPDATE jobs SET checkpoint='{}' WHERE id=?",job.id);
    run('UPDATE agent_conversation_quotes SET created_at=created_at-3600000 WHERE id=?',q.id);
    const route=routeFor('agent_conversation');setJsonSetting('ai.routes',{agent_conversation:{...route,effort:'high'}});
    try {
      await runCognitiveJob(new JobContext(one<Job>('SELECT * FROM jobs WHERE id=?',job.id)!));
      expect(fake.calls).toBe(1);expect(balance(user.id).used).toBe(used);expect(conversationView(user,cid).intelligence?.state).toBe('reply');
    } finally { setJsonSetting('ai.routes',{}); }
  });
  it('une panne incertaine reste protégée, sans retry SDK ni reprise facturante automatique',async()=>{
    const {user,cid,q}=await setup(); fake.error=true;
    confirmCognitiveQuote(user,cid,q.id,id());const job=claimNext(['agent.reason'])!;
    await expect(runCognitiveJob(new JobContext(job))).rejects.toThrow();
    expect(fake.calls).toBe(1); expect(one<{status:string}>('SELECT status FROM ai_reservations WHERE job_id=?',job.id)?.status).toBe('uncertain');
    await expect(runCognitiveJob(new JobContext(one<Job>('SELECT * FROM jobs WHERE id=?',job.id)!))).rejects.toThrow(); expect(fake.calls).toBe(1);
  });
  it('un changement de route ou de tarif invalide le devis avant l’appel',async()=>{
    const {user,cid,q}=await setup(),route=routeFor('agent_conversation');
    setJsonSetting('ai.routes',{agent_conversation:{...route,effort:route.effort==='high'?'low':'high'}});
    expect(()=>confirmCognitiveQuote(user,cid,q.id,id())).toThrow('changé'); expect(fake.calls).toBe(0);
    setJsonSetting('ai.routes',{});
  });
});
describe('#211 C — rôles à la demande et budget natif partagé (SDK simulé)',()=>{
  async function oneReply(user:Awaited<ReturnType<typeof account>>,cid:string,role:'principal'|'quality'|'site'|'identity'='principal'){
    const v=conversationView(user,cid),q=createCognitiveQuote(user,cid,{revision:v.revision,projectRevision:v.projectRevision,role});
    confirmCognitiveQuote(user,cid,q.id,id());const job=claimNext(['agent.reason'])!;
    const result=await runCognitiveJob(new JobContext(job));run("UPDATE jobs SET status='done',result=? WHERE id=?",JSON.stringify(result),job.id);return{q,job,result};
  }
  it('compare une réponse principale à un avis spécialisé explicite, sans équipe automatique ni portefeuille séparé',async()=>{
    vi.stubEnv('STUDIO_CONVERSATION_SPECIALISTS','1');const {user,cid}=await setup();
    const before=balance(user.id).used;await oneReply(user,cid);const single=balance(user.id).used-before;expect(fake.calls).toBe(1);
    await oneReply(user,cid,'quality');const pair=balance(user.id).used-before;
    expect(fake.calls).toBe(2);expect(pair).toBe(single*2);expect(conversationView(user,cid).intelligence?.lastRole).toBe('quality');
    expect(all('SELECT * FROM agent_request_bounds WHERE conversation_id=?',cid)).toHaveLength(1);
    expect(one<{n:number}>('SELECT COUNT(DISTINCT user_id) n FROM ai_reservations WHERE job_id IN (SELECT job_id FROM agent_request_jobs WHERE bound_id IN (SELECT id FROM agent_request_bounds WHERE conversation_id=?))',cid)!.n).toBe(1);
    // Montants SIMULÉS : aucune conclusion de gain créatif ou d'efficacité réelle.
  });
  it('arrête la cinquième tâche de la même demande, même si chaque appel a son propre accord',async()=>{
    vi.stubEnv('STUDIO_CONVERSATION_SPECIALISTS','1');const {user,cid}=await setup();
    for(const role of ['principal','quality','site','identity']as const)await oneReply(user,cid,role);
    await expect(oneReply(user,cid)).rejects.toThrow('limite');expect(fake.calls).toBe(4);
    expect(conversationView(user,cid).intelligence?.requestBounds?.remainingCalls).toBe(0);
  });
  it('la date limite persistante bloque avant envoi ; aucun débit fictif ni repli local',async()=>{
    vi.stubEnv('STUDIO_CONVERSATION_SPECIALISTS','1');const {user,cid,q}=await setup();
    confirmCognitiveQuote(user,cid,q.id,id());const job=claimNext(['agent.reason'])!,before=balance(user.id).used;
    run('UPDATE agent_request_bounds SET deadline_at=1 WHERE conversation_id=?',cid);
    await expect(runCognitiveJob(new JobContext(job))).rejects.toThrow('limite');expect(fake.calls).toBe(0);expect(balance(user.id).used).toBe(before);
  });
  it('une saturation ne déclenche aucun deuxième essai HTTP sous cette autorisation',async()=>{
    vi.stubEnv('STUDIO_CONVERSATION_SPECIALISTS','1');const {user,cid,q}=await setup();fake.error=true;fake.status=429;
    confirmCognitiveQuote(user,cid,q.id,id());const job=claimNext(['agent.reason'])!;
    await expect(runCognitiveJob(new JobContext(job))).rejects.toThrow('limite');expect(fake.calls).toBe(1);
    expect(one<{status:string}>('SELECT status FROM ai_reservations WHERE job_id=?',job.id)?.status).toBe('released');
  });
  it('refuse le rôle spécialisé quand le drapeau est fermé, sans appel',async()=>{
    const {user,cid}=await setup(),v=conversationView(user,cid);
    expect(()=>createCognitiveQuote(user,cid,{revision:v.revision,projectRevision:v.projectRevision,role:'quality'})).toThrow('conversation_specialists_disabled');expect(fake.calls).toBe(0);
  });
  it('conserve la vraie étape dans le Planner et la portée Brain du projet, avec un seul reçu',async()=>{
    vi.stubEnv('STUDIO_CONVERSATION_SPECIALISTS','1');const user=await account(),pid=project(user,'services'),c=openProjectConversation(user,pid);
    await sender(user,c.id)({action:'message',text:'Je répare les instruments apportés par les clients.'});
    fake.text=JSON.stringify({message:'Les tarifs restent à confirmer ; aucune réalisation n’est déduite des exemples.',status:'answer',business:null,businessEvidence:null,question:null,proposedChanges:[],knowledgeSourceIds:[],proposedTools:[],actionsExecuted:false});
    const {job}=await oneReply(user,c.id,'quality');const plan=one<{id:string;status:string;steps_json:string}>('SELECT id,status,steps_json FROM task_plans WHERE project_id=?',pid)!;
    expect(plan.status).toBe('done');expect(JSON.parse(plan.steps_json)).toHaveLength(1);
    expect(JSON.parse(plan.steps_json)[0]).toMatchObject({kind:'quality_review',task:'agent_conversation',status:'done',attempts:1});
    expect(one('SELECT plan_id,brain_scope FROM ai_calls WHERE job_id=?',job.id)).toMatchObject({plan_id:plan.id,brain_scope:'qc'});expect(fake.calls).toBe(1);
  });
  it('une critique ne peut repartir après un résultat incertain de la même demande',async()=>{
    vi.stubEnv('STUDIO_CONVERSATION_SPECIALISTS','1');const {user,cid,q}=await setup();fake.error=true;
    confirmCognitiveQuote(user,cid,q.id,id());const job=claimNext(['agent.reason'])!;
    await expect(runCognitiveJob(new JobContext(job))).rejects.toThrow('incertain');run("UPDATE jobs SET status='failed' WHERE id=?",job.id);
    const v=conversationView(user,cid);expect(()=>createCognitiveQuote(user,cid,{revision:v.revision,projectRevision:v.projectRevision,role:'quality'})).toThrow('limite');expect(fake.calls).toBe(1);
  });
  it('le devis indique la vraie échéance restante de la demande commune',async()=>{
    vi.stubEnv('STUDIO_CONVERSATION_SPECIALISTS','1');const {user,cid}=await setup();await oneReply(user,cid);
    const deadline=Date.now()+60000;run('UPDATE agent_request_bounds SET deadline_at=? WHERE conversation_id=?',deadline,cid);
    const v=conversationView(user,cid),q=createCognitiveQuote(user,cid,{revision:v.revision,projectRevision:v.projectRevision,role:'quality'});
    expect(q.expiresAt).toBe(deadline);expect(q.requestBounds?.remainingCalls).toBe(3);
  });
  it.each([false,true])('un accord reçu à temps reste traitable après attente du worker (bornes %s)',async enabled=>{
    vi.stubEnv('STUDIO_CONVERSATION_SPECIALISTS',enabled?'1':'0');const {user,cid,q}=await setup(),at=Date.now();
    run('UPDATE agent_conversation_quotes SET created_at=? WHERE id=?',at-14*60000,q.id);
    confirmCognitiveQuote(user,cid,q.id,id());const clock=vi.spyOn(Date,'now').mockReturnValue(at+2*60000);
    try{const job=claimNext(['agent.reason'])!;await runCognitiveJob(new JobContext(job));expect(fake.calls).toBe(1);expect(conversationView(user,cid).intelligence?.reply).toBeTruthy();}finally{clock.mockRestore();}
  });
});
