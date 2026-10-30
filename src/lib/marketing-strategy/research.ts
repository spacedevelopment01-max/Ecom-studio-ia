import {documentsMatch} from "../preparation/documents";
import {createHash} from 'node:crypto';
import {one,json,now} from '../db';
import {canonicalJSON} from '../brain/hash';
import {stateOf,inputHash} from '../preparation/store';
import {analyzed} from '../preparation/understanding';
import {assertSourcedResearch,sourceCoverage} from '../preparation/research-evidence';
import {validateResearch} from '../preparation/research-validation';
import {researchOfferDigest} from './proposals';
import {remember,type Project} from '../projects';
import type {Research,Brief,State} from '../preparation/types';
import type {Brand} from '../project-types';
import type {MarketingAngle,StrategyState} from './types';
export const researchDigest=({selectedId,...r}:Research)=>createHash('sha256').update(canonicalJSON(r)).digest('hex');
const digest=(v:unknown)=>createHash('sha256').update(canonicalJSON(v)).digest('hex');
// Les informations commerciales restent distinctes de l’identité construite APRÈS leur recherche.
// Le digest complet des communications reste inchangé : aucun ancien visuel/texte n’est réétiqueté.
const offerFactsDigest=(p:Project)=>digest({offer:researchOfferDigest({...p,brand:null}),clientBrief:stateOf(p.id)?.stages.brief?.data.input??null});
const identityContext=(b:Brand|null)=>b?digest({name:b.name,tagline:b.tagline,positioning:b.positioning,audience:b.audience,story:b.story,values:b.values,personality:b.personality,tone:b.tone}):null;
type IdentityResearchBinding={schema:1;projectId:string;researchDigest:string;sourceOfferDigest:string;factsDigest:string;identityContext:string;revision:number;at:number};
const bindingKey=(research:string)=>`marketing.research.identity.${research}`;
function identityResearchCompatible(p:Project,r:Research){
 const rd=researchDigest(r),b=json<IdentityResearchBinding|null>(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=?",p.id,bindingKey(rd))?.value,null);
 if(!b||b.schema!==1||b.projectId!==p.id||b.researchDigest!==rd||b.sourceOfferDigest!==r.offerDigest||b.factsDigest!==offerFactsDigest(p)||b.identityContext!==identityContext(p.brand))return false;
 const version=json<State|null>(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=?",p.id,`preparation.version.${b.revision}`)?.value,null);
 return !!version&&version.projectId===p.id&&version.stages.brand?.data.identityConfirmed===true&&identityContext(version.stages.brand.data.proposal)===b.identityContext&&!!version.stages.research&&researchDigest(version.stages.research.data)===rd;
}
/** Transition native prouvée, sous la transaction de confirmation : conserve la recherche acquise,
 * sans réécrire son reçu ni modifier un angle choisi, un quota ou les contenus des communications. */
export function retainResearchAfterIdentityConfirmation(before:Project,after:Project,version:State){
 if(before.id!==after.id||version.projectId!==after.id||!version.stages.brand?.data.identityConfirmed||identityContext(version.stages.brand.data.proposal)!==identityContext(after.brand)||offerFactsDigest(before)!==offerFactsDigest(after))return false;
 const ready=marketingResearch(before),r=ready.data;if(!r?.offerDigest||!ready.digest||!after.brand)return false;
 const b:IdentityResearchBinding={schema:1,projectId:after.id,researchDigest:ready.digest,sourceOfferDigest:r.offerDigest,factsDigest:offerFactsDigest(after),identityContext:identityContext(after.brand)!,revision:version.revision,at:now()};
 remember(after.id,{kind:'artifact',key:bindingKey(ready.digest),value:JSON.stringify(b),source:'local',origin:'system',status:'inferred'});return true;
}
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
 if((!acquired&&(stage?.status==='stale'||stage?.inputHash!==inputHash(s!,'research')))||r.offerDigest!==researchOfferDigest(p)&&!identityResearchCompatible(p,r))return result('stale','Le contexte a changé ou la recherche est ancienne. Les choix et résultats précédents sont conservés ; préparez une recherche adaptée avant tout nouvel angle.',n);
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
