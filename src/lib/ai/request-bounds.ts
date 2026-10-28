/** Bornes d'une demande d'agent, au-dessus des réservations NATIVES du budget commun.
 * Ne crée aucun crédit. Réservations, reçus, règlements et erreurs restent dans billing.ts.
 */
import {all,id,now,one,run,tx} from '../db';
import {currentTrace} from './trace';
import {UserFacingError} from '../jobs';
import {L} from '../i18n-server';
export class AgentBoundStop extends UserFacingError {
  readonly permanent=true;
  readonly definitelyUnsent=true;
  constructor(readonly code:string){super(L('La limite de cette demande est atteinte. Vos résultats acquis sont conservés ; aucun nouvel appel envoyé.','This request has reached its limit. Acquired results are kept; no new request sent.'));}
}
export type AgentBound={id:string;conversation_id:string;user_id:string;request_key:string;cap_micro:number;max_calls:number;max_depth:number;max_retries:number;deadline_at:number|null;http_attempts:number;created_at:number};
function bound(){const key=currentTrace().agentBoundId;if(!key)return null;const b=one<AgentBound>('SELECT * FROM agent_request_bounds WHERE id=?',key);if(!b)throw new AgentBoundStop('AGENT_REQUEST_MISSING');return b;}
const jobs=(bid:string)=>all<{job_id:string}>('SELECT job_id FROM agent_request_jobs WHERE bound_id=?',bid).map(r=>r.job_id);
export function boundUsage(bid:string){
  const j=jobs(bid);if(!j.length)return{calls:0,engaged:0};const slots=j.map(()=>'?').join(',');
  const calls=one<{n:number}>(`SELECT COUNT(*) n FROM ai_reservations WHERE job_id IN (${slots})`,...j)!.n;
  const engaged=one<{n:number}>(`SELECT
    COALESCE((SELECT SUM(CASE WHEN status='held' THEN amount ELSE COALESCE(actual,amount) END) FROM ai_reservations WHERE job_id IN (${slots}) AND status IN ('held','settled','uncertain','reconciled') AND usage_event_id IS NULL),0)
    +COALESCE((SELECT SUM(billed) FROM usage_events WHERE job_id IN (${slots})),0)
    +COALESCE((SELECT SUM(cost) FROM ai_calls WHERE job_id IN (${slots}) AND usage_event_id IS NULL AND billing_dedup=0 AND status='ok'),0) n`,...j,...j,...j)!.n;
  return{calls,engaged};
}
function assertTime(b:AgentBound){if(b.deadline_at!=null&&now()>b.deadline_at)throw new AgentBoundStop('AGENT_REQUEST_EXPIRED');}
function member(b:AgentBound,user:string,jid:string|null|undefined){const m=jid?one<{depth:number;user_id:string}>('SELECT aj.depth,j.user_id FROM agent_request_jobs aj JOIN jobs j ON j.id=aj.job_id WHERE aj.bound_id=? AND aj.job_id=?',b.id,jid):null;if(!m||m.user_id!==user||b.user_id!==user||m.depth>b.max_depth)throw new AgentBoundStop('AGENT_REQUEST_BINDING');}
/** Appelé DANS la transaction de réserve, avant toute écriture du portefeuille. */
export function assertAgentReservation(user:string,amount:number,jid?:string|null){const b=bound();if(!b)return;assertTime(b);member(b,user,jid);const u=boundUsage(b.id);if(u.calls>=b.max_calls)throw new AgentBoundStop('AGENT_CALL_LIMIT');if(u.engaged+amount>b.cap_micro)throw new AgentBoundStop('AGENT_COST_LIMIT');}
/** Comptabilise chaque essai HTTP de génération texte, y compris saturation et reprise. */
export function beforeAgentTextAttempt(user:string,jid:string|null|undefined,attempt:number){return tx(()=>{const b=bound();if(!b)return;assertTime(b);member(b,user,jid);if(attempt>b.max_retries||b.http_attempts>=b.max_calls*(b.max_retries+1))throw new AgentBoundStop('AGENT_HTTP_LIMIT');run('UPDATE agent_request_bounds SET http_attempts=http_attempts+1 WHERE id=?',b.id);});}
export function createOrReadBound(conversationId:string,user:string,initialCallCap:number){
  // Les Pourquoi/synthèses/retours ne créent pas une nouvelle enveloppe. Seule une intervention client l'ouvre.
  const turn=one<{request_id:string}>("SELECT request_id FROM agent_conversation_turns WHERE conversation_id=? AND json_extract(request_json,'$.action') IN ('message','answer','answer-ai','edit','edit-services','accept-ai-changes') ORDER BY revision DESC LIMIT 1",conversationId);
  if(!turn)throw new AgentBoundStop('AGENT_REQUEST_INPUT_MISSING');
  return tx(()=>{const existing=one<AgentBound>('SELECT * FROM agent_request_bounds WHERE conversation_id=? AND request_key=?',conversationId,turn.request_id);if(existing)return existing;const bid=id();run('INSERT INTO agent_request_bounds(id,conversation_id,user_id,request_key,cap_micro,max_calls,max_depth,max_retries,http_attempts,created_at) VALUES(?,?,?,?,?,4,1,0,0,?)',bid,conversationId,user,turn.request_id,Math.ceil(initialCallCap*4),now());return one<AgentBound>('SELECT * FROM agent_request_bounds WHERE id=?',bid)!;});
}
export function assertBoundQuote(b:AgentBound,cap:number){assertTime(b);const u=boundUsage(b.id),j=one<{n:number}>('SELECT COUNT(*) n FROM agent_request_jobs WHERE bound_id=?',b.id)!.n;if(j>=b.max_calls||u.calls>=b.max_calls)throw new AgentBoundStop('AGENT_CALL_LIMIT');if(u.engaged+cap>b.cap_micro)throw new AgentBoundStop('AGENT_COST_LIMIT');if(one("SELECT 1 FROM ai_reservations r JOIN agent_request_jobs aj ON aj.job_id=r.job_id WHERE aj.bound_id=? AND r.status='uncertain'",b.id))throw new AgentBoundStop('AGENT_UNCERTAIN_RESULT');}
export function bindAgentJob(bid:string,user:string,jid:string,role:string){
  return tx(()=>{const b=one<AgentBound>('SELECT * FROM agent_request_bounds WHERE id=? AND user_id=?',bid,user);if(!b)throw new AgentBoundStop('AGENT_REQUEST_BINDING');assertTime(b);
    const count=one<{n:number}>('SELECT COUNT(*) n FROM agent_request_jobs WHERE bound_id=?',bid)!.n;if(count>=b.max_calls)throw new AgentBoundStop('AGENT_JOB_LIMIT');
    const depth=role==='principal'?0:1;if(depth>b.max_depth)throw new AgentBoundStop('AGENT_DEPTH_LIMIT');
    run('UPDATE agent_request_bounds SET deadline_at=COALESCE(deadline_at,?) WHERE id=?',now()+15*60000,bid);
    run('INSERT INTO agent_request_jobs(bound_id,job_id,role,depth) VALUES(?,?,?,?)',bid,jid,role,depth);
  });
}
export function boundPublic(bid:string){const b=one<AgentBound>('SELECT * FROM agent_request_bounds WHERE id=?',bid);if(!b)return null;const u=boundUsage(bid);return{maxCalls:b.max_calls,remainingCalls:Math.max(0,b.max_calls-u.calls),maxDepth:b.max_depth,maxRetries:b.max_retries,deadlineAt:b.deadline_at,httpAttempts:b.http_attempts};}
