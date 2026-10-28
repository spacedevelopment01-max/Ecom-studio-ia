/** Fournisseur SDK SIMULÉ ; routeur, devis, réservations, traces, usage et reprise NATIFS. Aucun réseau. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ text: '{}', calls: 0, error: false }));
vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error { status?: number; }
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    constructor(_opts: unknown) {}
    private stream(p: { model: string }) {
      fake.calls++;
      if (fake.error) { const e = new APIError('Fournisseur SIMULÉ indisponible'); e.status = 500; throw e; }
      return { finalMessage: async () => ({ model: p.model, stop_reason: 'end_turn', content: [{ type: 'text', text: fake.text }], usage: { input_tokens: 800, output_tokens: 300 } }) };
    }
    messages = { countTokens: async (p: unknown) => ({ input_tokens: Math.ceil(JSON.stringify(p).length / 3) }), stream: (p: {model:string}) => this.stream(p) };
    beta = { messages: { stream: (p: {model:string}) => this.stream(p) } };
  }
  return { default: Anthropic, Anthropic };
});
vi.mock('@/lib/ai/config', async orig => ({ ...(await orig() as object), activeProviderKey: () => 'FOURNISSEUR FICTIF SANS SECRET' }));
import { account, sender } from './conversation209-fixtures';
import { openDraft, conversationView } from '@/lib/orchestrator/conversation';
import { createCognitiveQuote, confirmCognitiveQuote, runCognitiveJob } from '@/lib/orchestrator/conversation/intelligence';
import { claimNext, JobContext, type Job } from '@/lib/jobs';
import { all, id, one, run } from '@/lib/db';
import { balance } from '@/lib/billing';
import { setJsonSetting } from '@/lib/settings';
import { routeFor } from '@/lib/ai/config';

beforeEach(() => { vi.stubEnv('STUDIO_CONVERSATION_LOT_A','1'); vi.stubEnv('STUDIO_CONVERSATION_AI','1'); fake.calls=0; fake.error=false; vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Aucun réseau #211');})); });
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
