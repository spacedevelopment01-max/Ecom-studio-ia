/** Comparaisons d'angles acquis, mémoire commune ; aucun moteur de recherche ou d'activation parallèle. */
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now,one} from '../../db';
import {createHash} from 'node:crypto';
import {stableHash,canonicalJSON} from '../../brain/hash';
import {getStrategyState,proposeStrategies,type AngleId,type MarketingAngle} from '../../marketing-strategy';
import {L} from '../../i18n-server';
import type {Command,ConversationRow,ConversationState} from './contract';
import type {StrategyChoiceProposal} from './strategy-choice-contract';
export const strategyChoicesEnabled=()=>['STUDIO_CONVERSATION_LOT_A','STUDIO_CONVERSATION_AI','STUDIO_CONVERSATION_CHOICES'].every(k=>process.env[k]==='1');
type Ref={comparisonId:string;version:string;angleId:AngleId};
type Preference={preferred:Ref|null;rejected:Ref[]};
export type StrategyComparison={id:string;projectId:string;version:string;inputDigest:string;researchDigest:string;createdAt:number;scope:'project'|'service_communication';options:MarketingAngle[];recommendation:{angleId:AngleId;reason:string}|null;simulation:boolean;marketSourcesVerified:boolean;limits:string[]};
export type StrategyDecision={id:string;at:number;comparisonId:string;kind:'prefer'|'reject'|'undo';angleId:AngleId|null;reason:string;reasonSource:'client'|'provider_proposal_confirmed'|'system_undo';before:Preference;after:Preference;undoOf?:string;proposalReceiptId?:string};
export type StrategyChoicesState={activeId:string;comparisons:StrategyComparison[];decisions:StrategyDecision[]};
const empty=():Preference=>({preferred:null,rejected:[]});
function requireProject(c:ConversationRow){
 if(!strategyChoicesEnabled())throw new HttpError(404,L('La comparaison est désactivée.','Comparison is disabled.'),'conversation_choices_disabled');
 if(!c.project_id)throw new HttpError(409,L('Rattachez un projet avant de comparer ses angles.','Link a project before comparing its angles.'),'conversation_choices_project_required');
 const u=one<User>('SELECT * FROM users WHERE id=?',c.user_id);if(!u)throw new HttpError(404,'conversation_owner_missing');ownedProject(u,c.project_id);return c.project_id;
}
function current(c:ConversationRow){const pid=requireProject(c);return getStrategyState(pid);}
function isCurrent(comparison:StrategyComparison,s:ReturnType<typeof getStrategyState>){
 return comparison.projectId===s.projectId&&comparison.inputDigest===s.analysis.currentInputDigest&&comparison.researchDigest===s.analysis.researchDigest&&comparison.options.every(a=>s.angles.some(b=>b.id===a.id&&stableHash('native-angle',a)===stableHash('native-angle',b)));
}
function preference(m:StrategyChoicesState,comparisonId:string){return m.decisions.filter(d=>d.comparisonId===comparisonId).at(-1)?.after??empty();}
export function strategyChoicesView(c:ConversationRow,m:ConversationState){
 const native=current(c),memory=m.strategyChoices;
 if(memory?.comparisons.some(s=>s.projectId!==c.project_id))throw new HttpError(409,'conversation_comparison_project_mismatch');
 const active=memory?.comparisons.find(x=>x.id===memory.activeId);
 return{schema:'strategy-comparisons-1' as const,scope:'acquired_marketing_angles_only' as const,
  available:native.angles.length>=2||native.research?.status==='research_ready',nativeHref:`/studio/${c.project_id}/strategie`,
  message:native.research?.message??L('Aucune recherche acquise vérifiée.','No verified acquired research.'),
  active:active?{...active,isCurrent:isCurrent(active,native),preference:preference(memory!,active.id)}:null,
  history:(memory?.comparisons??[]).map(s=>({id:s.id,version:s.version,at:s.createdAt,scope:s.scope,optionIds:s.options.map(a=>a.id),isCurrent:isCurrent(s,native)})),decisions:memory?.decisions??[],
  cost:{comparisonPct:0,preferencePct:0,regeneration:false,advice:'separate_native_conversation_quote',activation:'not_authorized_by_discussion_preference'},
  coverage:{logos:false,images:false,themes:false,blending:false,vision:false,realProviderTested:false},
 };
}
export function validateStrategyChoiceProposal(p:StrategyChoiceProposal,c:ConversationRow,m:ConversationState){
 const s=m.strategyChoices?.comparisons.find(s=>s.id===p.comparisonId);
 if(!s||s.version!==p.version||s.id!==m.strategyChoices?.activeId||!s.options.some(a=>a.id===p.angleId)||!isCurrent(s,current(c)))throw new HttpError(409,L('La comparaison a changé ou est historique. Relisez les options exactes.','The comparison changed or is historical. Review the exact options.'),'conversation_comparison_stale');
 return s;
}
export function applyStrategyChoice(c:ConversationRow,m:ConversationState,cmd:Command){
 requireProject(c);
 if(cmd.action==='open-strategy-comparison'){const comparison=m.strategyChoices?.comparisons.find(s=>s.id===cmd.comparisonId&&s.projectId===c.project_id);if(!comparison)throw new HttpError(404,L('Comparaison introuvable.','Comparison not found.'),'conversation_comparison_missing');m.strategyChoices!.activeId=comparison.id;return L('Version acquise réouverte sans modification ni génération.','Acquired version reopened without modification or generation.');}
 if(cmd.action==='compare-strategy-options'){
  if(cmd.angleIds){const s=m.strategyChoices?.comparisons.find(s=>s.id===cmd.sourceComparisonId);if(!s||s.version!==cmd.sourceVersion||!isCurrent(s,current(c))||cmd.angleIds.some(id=>!s.options.some(a=>a.id===id)))throw new HttpError(409,L('La comparaison source a changé.','The source comparison changed.'),'conversation_comparison_stale');}
  else if(cmd.sourceVersion||cmd.sourceComparisonId)throw new HttpError(400,'conversation_comparison_reference_incomplete');
  // Seul un ordre explicite reprend la projection native : GET et réflexion ne proposent rien localement.
  const native=proposeStrategies(c.project_id!),ids=cmd.angleIds??native.angles.map(a=>a.id);
  if(ids.length<2||ids.length>5||new Set(ids).size!==ids.length)throw new HttpError(400,L('Choisissez deux à cinq angles distincts.','Choose two to five distinct angles.'),'conversation_comparison_cardinality');
  const options=ids.map(angleId=>{const a=native.angles.find(a=>a.id===angleId);if(!a)throw new HttpError(409,L('Cet angle n’est pas une proposition actuelle du projet.','This angle is not a current proposal of this project.'),'conversation_comparison_missing');return a;});
  if(!native.analysis.researchDigest||native.analysis.inputDigest!==native.analysis.currentInputDigest)throw new HttpError(409,'conversation_comparison_stale');
  const version=createHash('sha256').update(canonicalJSON({schema:'strategy-comparison-1',projectId:c.project_id,inputDigest:native.analysis.inputDigest,researchDigest:native.analysis.researchDigest,options})).digest('hex');
  const memory=m.strategyChoices??{activeId:'',comparisons:[],decisions:[]},previous=memory.comparisons.find(s=>s.version===version);
  if(previous){memory.activeId=previous.id;m.strategyChoices=memory;return L('Comparaison acquise réouverte, sans génération.','Acquired comparison reopened without generation.');}
  if(memory.comparisons.length>=20)throw new HttpError(409,L('Vingt comparaisons sont conservées. Limite atteinte ; aucun historique effacé.','Twenty comparisons are retained. Limit reached; no history erased.'),'conversation_comparison_limit');
  const snapshot:StrategyComparison={id:id(),projectId:c.project_id!,version,inputDigest:native.analysis.inputDigest,researchDigest:native.analysis.researchDigest,createdAt:now(),scope:native.scope,options,recommendation:native.recommendation&&ids.includes(native.recommendation.angleId)?native.recommendation:null,simulation:!!native.analysis.simulation,marketSourcesVerified:native.analysis.marketSourcesVerified,limits:native.analysis.limits};
  if(JSON.stringify(snapshot).length>140000)throw new HttpError(409,L('Ces options dépassent le contexte disponible. Comparez-en moins ; rien n’a été tronqué.','These options exceed the available context. Compare fewer; nothing was truncated.'),'conversation_context_limit');
  memory.comparisons.push(snapshot);memory.activeId=snapshot.id;m.strategyChoices=memory;
  return L('Angles acquis comparés, sans nouvelle recherche ni validation.','Acquired angles compared without new research or approval.');
 }
 const memory=m.strategyChoices;
 if(!memory)throw new HttpError(409,L('Ouvrez une comparaison avant de choisir.','Open a comparison before choosing.'),'conversation_comparison_missing');
 if(memory.decisions.length>=100)throw new HttpError(409,L('Limite de décisions atteinte ; historique conservé.','Decision limit reached; history retained.'),'conversation_decision_limit');
 if(cmd.action==='undo-strategy-preference'){
  const last=memory.decisions.at(-1);if(!last||last.id!==cmd.decisionId||last.kind==='undo')throw new HttpError(409,L('La dernière décision a changé. Relisez son historique.','The latest decision changed. Review its history.'),'conversation_decision_conflict');
  memory.decisions.push({id:id(),at:now(),comparisonId:last.comparisonId,kind:'undo',angleId:null,reason:L('Annulation de la dernière préférence de discussion.','Undo of the latest discussion preference.'),reasonSource:'system_undo',before:structuredClone(last.after),after:structuredClone(last.before),undoOf:last.id});
  return L('Préférence de discussion restaurée ; stratégie active inchangée.','Discussion preference restored; active strategy unchanged.');
 }
 let p:StrategyChoiceProposal,kind:'prefer'|'reject',reasonSource:'client'|'provider_proposal_confirmed',receipt:string|undefined;
 if(cmd.action==='accept-strategy-preference'){
  const a=m.intelligence;if(!a?.lastReply?.strategyChoice||a.lastReceiptId!==cmd.receiptId||a.sourceRevision!==c.revision||(a.sourceProjectRevision??null)!==cmd.projectRevision)throw new HttpError(409,L('La proposition de choix n’est plus actuelle.','The choice proposal is no longer current.'),'conversation_preference_proposal_stale');
  p=a.lastReply.strategyChoice;kind='prefer';reasonSource='provider_proposal_confirmed';receipt=a.lastReceiptId;
 }else if(cmd.action==='decide-strategy-option'){
  p={comparisonId:cmd.comparisonId,version:cmd.version,angleId:cmd.angleId,reason:cmd.reason,sourceId:'',quote:''};kind=cmd.decision;reasonSource='client';
 }else throw new HttpError(400,'conversation_choices_command_unknown');
 validateStrategyChoiceProposal(p,c,m);
 const before=structuredClone(preference(memory,p.comparisonId)),ref={comparisonId:p.comparisonId,version:p.version,angleId:p.angleId},after=structuredClone(before);
 if(kind==='prefer'){after.preferred=ref;after.rejected=after.rejected.filter(r=>r.angleId!==p.angleId);}
 else{if(after.preferred?.angleId===p.angleId)after.preferred=null;if(!after.rejected.some(r=>r.angleId===p.angleId))after.rejected.push(ref);}
 memory.decisions.push({id:id(),at:now(),comparisonId:p.comparisonId,kind,angleId:p.angleId,reason:p.reason,reasonSource,before,after,...receipt?{proposalReceiptId:receipt}:{}});
 return L('Préférence de discussion conservée avec sa raison. Aucun angle activé, quota consommé ou contenu régénéré.','Discussion preference and reason saved. No angle activated, quota consumed or content regenerated.');
}
