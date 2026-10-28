import {afterEach,beforeEach,expect,it,vi}from'vitest';
import{account,sender}from'./conversation209-fixtures';
import{openDraft}from'@/lib/orchestrator/conversation';
import{bindAgentJob,createOrReadBound}from'@/lib/ai/request-bounds';
import{withTrace,currentTrace}from'@/lib/ai/trace';
import{reserve,balance}from'@/lib/billing';
import{runForPendingSubscription}from'@/lib/project-billing';
import{enqueue}from'@/lib/jobs';
import{id,one,run}from'@/lib/db';
import{exportAccountData}from'@/lib/privacy';
beforeEach(()=>{vi.stubEnv('STUDIO_CONVERSATION_LOT_A','1');vi.stubEnv('STUDIO_CONVERSATION_AI','1');});afterEach(()=>vi.unstubAllEnvs());
async function setup(){const u=await account(),c=openDraft(u);await sender(u,c.id)({action:'message',text:'Je répare les pompes industrielles.'});const b=createOrReadBound(c.id,u.id,100);return{u,c,b};}
function job(userId:string,bid:string,role='principal'){const j=enqueue({userId,type:'agent.reason',payload:{},idempotencyKey:id()});bindAgentJob(bid,userId,j.id,role);return j;}
it('le plafond commun couvre les engagements de plusieurs jobs, sans doubler leur budget',async()=>{
  const{u,b}=await setup(),a=job(u.id,b.id),c=job(u.id,b.id,'quality');
  const scope=(j:string,amount:number)=>runForPendingSubscription(u.id,u.id,()=>withTrace({jobId:j,agentBoundId:b.id},async()=>reserve(u.id,amount,{task:'agent_conversation',provider:'simulation',model:'sans-modele',usageKey:id(),jobId:j})));
  await scope(a.id,250);const before=balance(u.id);
  await expect(scope(c.id,200)).rejects.toThrow('limite');expect(balance(u.id)).toEqual(before);expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_reservations WHERE job_id=?',c.id)!.n).toBe(0);
});
it('un sous-appel ne peut élargir le plafond ni changer de demande',async()=>{
  await withTrace({costCapMicro:100,agentBoundId:'racine'},async()=>{await withTrace({costCapMicro:1000},async()=>{expect(currentTrace().costCapMicro).toBe(100);});expect(()=>withTrace({agentBoundId:'autre'},async()=>{})).toThrow('scope_conflict');});
});
it('la profondeur et la propriété restent vérifiées même si un ancien payload a été altéré',async()=>{
  const{u,b}=await setup(),j=job(u.id,b.id,'quality'),other=await account();run('UPDATE agent_request_jobs SET depth=2 WHERE job_id=?',j.id);
  await expect(runForPendingSubscription(u.id,u.id,()=>withTrace({jobId:j.id,agentBoundId:b.id},async()=>reserve(u.id,10,{task:'agent_conversation',provider:'simulation',model:'sans-modele',jobId:j.id})))).rejects.toThrow('limite');
  expect(()=>bindAgentJob(b.id,other.id,j.id,'quality')).toThrow('limite');
});
it('les nouvelles traces exportées sont propres au compte et masquent les coûts techniques',async()=>{
  const{u,b}=await setup(),j=job(u.id,b.id),other=await setup();job(other.u.id,other.b.id);
  const data=exportAccountData(u.id);expect(data.tables.agent_request_bounds).toHaveLength(1);expect(data.tables.agent_request_jobs).toHaveLength(1);expect(data.tables.agent_request_jobs[0]).toMatchObject({job_id:j.id});expect(JSON.stringify(data.tables.agent_request_bounds)).not.toContain('cap_micro');expect(JSON.stringify(data)).not.toContain(other.b.id);
});
