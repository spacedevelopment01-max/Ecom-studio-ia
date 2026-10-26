import {documentsMatch} from "../preparation/documents";
import {createHash} from 'node:crypto';
import {one} from '../db';
import {canonicalJSON} from '../brain/hash';
import {stateOf,inputHash} from '../preparation/store';
import {analyzed} from '../preparation/understanding';
import {assertSourcedResearch,sourceCoverage} from '../preparation/research-evidence';
import {validateResearch} from '../preparation/research-validation';
import {researchOfferDigest} from './proposals';
import type {Project} from '../projects';
import type {Research,Brief} from '../preparation/types';
import type {MarketingAngle,StrategyState} from './types';
export const researchDigest=({selectedId,...r}:Research)=>createHash('sha256').update(canonicalJSON(r)).digest('hex');
export function marketingResearch(p:Project,acquired?:{brief:Brief;research:Research}):{research:NonNullable<StrategyState['research']>;data?:Research;digest?:string}{
 const s=stateOf(p.id),b=acquired?{status:'approved',data:acquired.brief}:s?.stages.brief;
 const tracked=s?.pending?.step==='research'?s.pending.jobId:s?.error?.step==='research'?s.error.jobId:null;
 const job=tracked?one<{id:string;status:string;progress:number;message:string}>('SELECT id,status,progress,message FROM jobs WHERE id=? AND project_id=?',tracked,p.id):null;
 const result=(status:NonNullable<StrategyState['research']>['status'],message:string,sourceCount=0,simulation=false)=>({research:{status,message,sourceCount,simulation,job}});
 if(b?.status!=='approved'||!analyzed(b.data)||b.data.missing.length)return result('understanding_required','Validez d’abord la compréhension de l’offre, de ses photos et de ses documents dans Préparation. Seules les précisions indispensables manquantes seront demandées.');
 if(!documentsMatch(p.id,b.data.documentStamp))return result("understanding_required","Les documents sources ont changé. Actualisez leur compréhension avant toute recherche, sans effacer vos réponses.");
 const stage=s?.stages.research,r=acquired?.research??stage?.data;
 if(!r)return result('research_required',s?.error?.step==='research'?s.error.message:'Une recherche Internet et son analyse IA sont nécessaires. Aucun angle n’est fabriqué localement.');
 const n=r.sources.filter(s=>s.status==='consulted').length;
 if((!acquired&&(stage?.status==='stale'||stage?.inputHash!==inputHash(s!,'research')))||r.offerDigest!==researchOfferDigest(p))return result('stale','Le contexte a changé ou la recherche est ancienne. Les choix et résultats précédents sont conservés ; préparez une recherche adaptée avant tout nouvel angle.',n);
 try{
  assertSourcedResearch(r);validateResearch(r);
  const call=r.execution&&one<{provider:string;model:string;created_at:number}>("SELECT provider,COALESCE(served_model,requested_model) model,created_at FROM ai_calls WHERE project_id=? AND usage_key=? AND status='ok' ORDER BY rowid DESC LIMIT 1",p.id,r.execution.usageKey);
  if(!call||call.provider!==r.execution!.provider||call.model!==r.execution!.model)throw new Error('Analyse IA sans reçu serveur correspondant : aucun nouvel angle disponible.');
  const simulation=r.sources.some(s=>s.provenance==='simulation')||b.data.provenance==='simulation'||call.provider==='simulated';
  return {...result('research_ready','Recherche acquise et analysée : les propositions peuvent être reprises sans nouvel appel.',sourceCoverage(r).accepted.length,simulation),data:r,digest:researchDigest(r)};
 }catch(error){return result('partial',error instanceof Error?error.message:'Recherche insuffisante : aucun nouvel angle.',n);}
}
/** Projection of actual AI fields; it never invents an audience, motivation or hook. */
export function researchAngles(r:Research,p?:Project):MarketingAngle[]{
 return r.angles.map(a=>({id:a.id as MarketingAngle['id'],title:a.title,audience:a.audience,situation:a.positioning,notPriority:'',tension:a.motivation!,motivation:a.motivation!,benefit:a.arguments.join(' '),promise:a.message!,rationale:a.reason,proofs:p?.product.facts.filter(f=>f.status==='confirmed').map(f=>`${f.label} : ${f.value}`)??[],objections:a.objections,limits:r.coverage?.limits??[],tone:a.tone!,messages:[a.message!],exclusions:[],visualDirection:a.visualDirection!,communicationChange:a.communicationChange!,examples:{hero:a.message!,subtext:a.positioning,cta:'',advertisement:a.message!},source:'creative_hypothesis',researchDigest:researchDigest(r),sources:a.sourceIds.map(id=>{const s=r.sources.find(s=>s.id===id)!;return{kind:'dated_source',label:s.title,value:s.excerpt,date:new Date(s.consultedAt).toISOString(),ref:s.url};})}));
}
