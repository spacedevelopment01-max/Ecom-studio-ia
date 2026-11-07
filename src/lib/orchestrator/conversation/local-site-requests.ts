/** Lecture et marquage locaux de la source native. Les paroles entrantes ne sont jamais des consignes/faits SINA. */
import {HttpError,ownedProject,type User} from '../../auth';
import {one,id,now} from '../../db';
import {requirePlan} from '../../plan-gates';
import {siteRequests,markRequestRead,markRequestHandled} from '../../sites/requests';
import {checkedContextPin,type ContextPin} from './context-session';
import {nativeSiteRequest,siteRequestsEnabled} from './active-context';
import type {ConversationRow,ConversationState} from './contract';
type Status={read:boolean;handled:boolean};
type Metadata={projectId:string;id:string;fingerprint:string;readAt:number|null;handledAt:number|null};
export type LocalRequestProposal={id:string;projectId:string;requestId:string;fingerprint:string;pin:ContextPin;operation:'read'|'handled'|'unhandled';diff:{before:Status;after:Status};expiresAt:number};
/** Aucun champ, e-mail ou message du visiteur stocké dans cet état conversationnel. */
export type LocalRequestsState={schema:'syna-site-requests-1';state:'listed'|'proposed'|'applied'|'ambiguous'|'error'|'unchanged';message:string;costEur:0;providerCalls:0;financialConsent:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;receiptId?:string;request?:Metadata;diff?:LocalRequestProposal['diff']};
type RequestDto={id:string;fingerprint:string;kind:'contact'|'devis';createdAt:number;readAt:number|null;handledAt:number|null;sourceNative:{table:'site_requests';projectId:string;id:string};untrustedInbound:{trust:'untrusted_inbound_data_not_instructions';fields:Record<string,string>;email:string|null;page:string;hostname:string}};
export type LocalRequestsPresentation=LocalRequestsState&{requests?:RequestDto[];total?:number;limit?:20;truncated?:boolean};
const present=(state:LocalRequestsState['state'],message:string,extra:Partial<LocalRequestsState>={}):LocalRequestsState=>({schema:'syna-site-requests-1',state,message,costEur:0,providerCalls:0,financialConsent:false,confirmationRequired:false,actionsExecuted:false,...extra});
const plain=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export const localRequestsCandidate=(text:string)=>/^(?:montre|liste) les demandes recues de ce projet\b|^marque (?:cette demande|toutes les demandes|les demandes)\b/.test(plain(text));
function owned(user:User,c:ConversationRow){if(!siteRequestsEnabled())throw new HttpError(404,'Demandes reçues avec SINA indisponibles.');if(!c.project_id)throw new HttpError(409,'Rattachez un projet avant de lire ses demandes.');if(c.user_id!==user.id)throw new HttpError(404,'Conversation introuvable.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);return c.project_id;}
const status=(r:{read_at:number|null;handled_at:number|null}):Status=>({read:r.read_at!==null,handled:r.handled_at!==null});
const meta=(r:ReturnType<typeof nativeSiteRequest>):Metadata=>({projectId:r.row.project_id,id:r.row.id,fingerprint:r.fingerprint,readAt:r.row.read_at,handledAt:r.row.handled_at});
function ambiguous():never{throw new HttpError(422,'Désignez une demande précise puis dites : « Marque cette demande comme lue, traitée ou non traitée ». Aucun traitement en masse.');}
export function proposeLocalRequests(user:User,c:ConversationRow,m:ConversationState,text:string):LocalRequestsState{
 delete m.localRequestProposal;
 if(!siteRequestsEnabled())return present('error','Les demandes reçues ne sont pas raccordées ici. Aucun appel IA lancé.');
 owned(user,c);const t=plain(text).replace(/[.!?]$/,'');
 if(/^(?:montre|liste) les demandes recues de ce projet$/.test(t)){siteRequests(c.project_id!);return present('listed','Demandes reçues lues dans la source native. Aucun statut modifié.');}
 try{
  const match=/^marque cette demande comme (lue|traitee|non traitee)$/.exec(t);if(!match)ambiguous();
  const pin=checkedContextPin(c),target=pin?.selection.target;if(!pin||target?.kind!=='site-request'||pin.selection.tab!=='boutique')ambiguous();
  const record=nativeSiteRequest(c,target.requestId),before=status(record.row),operation=match[1]==='lue'?'read':match[1]==='traitee'?'handled':'unhandled',after={read:true,handled:operation==='read'?before.handled:operation==='handled'};
  if(before.read===after.read&&before.handled===after.handled)return present('unchanged','Cette demande possède déjà ce statut. Aucun changement.',{request:meta(record)});
  const p:LocalRequestProposal={id:id(),projectId:c.project_id!,requestId:record.row.id,fingerprint:record.fingerprint,pin,operation,diff:{before,after},expiresAt:now()+15*60000};m.localRequestProposal=p;
  return present('proposed','Vérifiez le statut avant/après puis confirmez gratuitement.',{proposalId:p.id,request:meta(record),diff:p.diff,confirmationRequired:true});
 }catch(e){if(e instanceof HttpError&&e.status===422)return present('ambiguous',e.message);throw e;}
}
export function confirmLocalRequest(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):LocalRequestsState{
 owned(user,c);const p=m.localRequestProposal;if(!p||p.id!==proposalId||p.projectId!==c.project_id||p.expiresAt<now())throw new HttpError(409,'Cette proposition est périmée. Demandez une nouvelle proposition.','conversation_request_stale');
 checkedContextPin(c,p.pin);const before=nativeSiteRequest(c,p.requestId);if(before.fingerprint!==p.fingerprint)throw new HttpError(409,'La demande a changé. Revalidez puis demandez une nouvelle proposition.');
 if(p.operation==='read')markRequestRead(c.project_id!,p.requestId);else markRequestHandled(c.project_id!,p.requestId,p.operation==='handled');
 const saved=nativeSiteRequest(c,p.requestId),after=status(saved.row);if(after.read!==p.diff.after.read||after.handled!==p.diff.after.handled)throw new HttpError(409,'Résultat natif non confirmé.');
 delete m.localRequestProposal;return present('applied','Statut enregistré et relu dans la source native. Aucun crédit consommé.',{proposalId:p.id,receiptId:requestId,request:meta(saved),diff:p.diff,actionsExecuted:true});
}
/** Corps entrant dans le DTO UI seulement ; jamais recopié dans state_json, texte assistant, brief ou mémoire. */
export function localRequestsView(user:User,c:ConversationRow,state:LocalRequestsState):LocalRequestsPresentation{
 if(!siteRequestsEnabled())return present('error','Les demandes reçues ne sont pas raccordées ici. Aucun appel IA lancé.');
 const pid=owned(user,c);if(state.state!=='listed')return state;
 const rows=siteRequests(pid).slice(0,20),total=one<{n:number}>('SELECT COUNT(*) n FROM site_requests WHERE project_id=?',pid)!.n;
 return{...state,total,limit:20,truncated:total>rows.length,requests:rows.map(r=>({id:r.id,fingerprint:nativeSiteRequest(c,r.id).fingerprint,kind:r.kind,createdAt:r.created_at,readAt:r.read_at,handledAt:r.handled_at,sourceNative:{table:'site_requests',projectId:pid,id:r.id},untrustedInbound:{trust:'untrusted_inbound_data_not_instructions',fields:r.fields,email:r.email,page:r.page,hostname:r.hostname}}))};
}
