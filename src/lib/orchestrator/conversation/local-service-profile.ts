/** First exact native business-profile field. Never a booking/content-item identity. */
import {unsafeContentReason} from '../../theme/content-security';
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now} from '../../db';
import {stableHash} from '../../brain/hash';
import {loadProject,saveServices} from '../../projects';
import {requirePlan} from '../../plan-gates';
import {activeContextEnabled} from './active-context';
import type {ConversationRow,ConversationState} from './contract';
export type ServiceProfileProposal={id:string;version:number;fingerprint:string;before:string;after:string;expiresAt:number;field?:'service-name';serviceKey?:string};
export type ServiceProfilePresentation={schema:'syna-service-profile-1';state:'proposed'|'applied'|'ambiguous';field:'hours'|'service-name';serviceKey?:string;choices?:{key:string;name:string}[];message:string;financialConsent:false;costEur:0;providerCalls:0;confirmationRequired:boolean;actionsExecuted:boolean;publication:false;proposalId?:string;diff?:{before:string;after:string};sourceVersion?:number;resultVersion?:number;receiptId?:string;projectId:string};
export const serviceProfileEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_SERVICE_PROFILE==='1';
/** Catch native scheduling requests before any paid reasoning; an unclear target stays a free question. */
export const serviceProfileCandidate=(text:string)=>/^(?:renomme|rebaptise) (?:cette|la) prestation\b/iu.test(text.trim())||/\b(?:horaires?|cr[ée]neaux|disponibilit[ée]s?)\b/iu.test(text)&&/^(?:remplace|change|modifie|mets?|nos? |les? |mes? )/iu.test(text.trim());
function requestedHours(text:string):string|undefined{
 const match=/^(?:(?:remplace|change|modifie|mets?) (?:les |mes )?horaires (?:du profil(?: d[’']activit[ée])?|d[’']ouverture) (?:par|pour|[àa])\s*:?[ \t]*|(?:nos?|les?|mes?) horaires (?:du profil(?: d[’']activit[ée])?|d[’']ouverture) sont\s*:?[ \t]*)([^\r\n]+)$/iu.exec(text.trim());
 if(!match)return;
 const raw=match[1].trim(),quoted=/^[«“"]([^\r\n]*)[»”"]\s*[.!]?$/u.exec(raw);
 if(!quoted&&(/[«»“”"]|\b(?:puis|ensuite)\b/iu.test(raw)))return;
 const value=(quoted?quoted[1]:raw).trim();return value.length>0&&value.length<=400?value:undefined;
}

const fp=(profile:unknown)=>stableHash('native-business-profile-1',profile);
function profile(user:User,c:ConversationRow,m:ConversationState){if(!serviceProfileEnabled())throw new HttpError(404,'Modification du profil indisponible.');if(!c.project_id)throw new HttpError(409,'Rattachez un projet de services.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);const p=loadProject(c.project_id);if(p.business!=='services'||m.activeContextTab!=='produit')throw new HttpError(409,'Ouvrez Activité pour modifier les horaires du profil de ce projet. Les créneaux réservables sont distincts.');return p;}
const present=(c:ConversationRow,state:ServiceProfilePresentation['state'],message:string,extra:Partial<ServiceProfilePresentation>={}):ServiceProfilePresentation=>({schema:'syna-service-profile-1',state,field:'hours',projectId:c.project_id!,message,financialConsent:false,costEur:0,providerCalls:0,confirmationRequired:false,actionsExecuted:false,publication:false,...extra});
export function proposeServiceProfile(user:User,c:ConversationRow,m:ConversationState,text:string){
 delete m.serviceProfileProposal;
 if(!serviceProfileEnabled())throw new HttpError(404,'Modification du profil indisponible.');
 if(/^(?:renomme|rebaptise) (?:cette|la) prestation\b/iu.test(text.trim())){
  const p=profile(user,c,m),match=/^(?:renomme|rebaptise) la prestation [«“"]([^»”"\r\n]+)[»”"] en [«“"]([^»”"\r\n]+)[»”"]\s*[.!]?$/iu.exec(text.trim());
  const clarify=(message:string)=>present(c,'ambiguous',message,{field:'service-name',choices:p.services.services.map(x=>({key:x.key!,name:x.name}))});
  if(!match)return clarify('Quelle prestation du profil d’activité ? Indiquez son nom exact : Renomme la prestation « Nom actuel » en « Nouveau nom ». Les services réservables ont des identités distinctes ; ils ne seront pas renommés.');
  const name=match[1].trim(),after=match[2].trim(),matches=p.services.services.filter(x=>x.key===name||x.name===name);
  if(matches.length!==1||!matches[0].key||p.services.services.filter(x=>x.key===matches[0].key).length!==1)return clarify('Prestation absente ou ambiguë. Précisez sa clé native dans les choix ; aucun premier résultat ne sera choisi.');
  if(!after||after.length>120||unsafeContentReason(after))return clarify('Nom exact attendu : 120 caractères maximum, sans contenu actif ni troncature.');
  const item=matches[0];if(item.name===after)return clarify('Ce nom est déjà enregistré. Aucun changement ni nouvelle version.');
  const proposal:ServiceProfileProposal={id:id(),version:p.servicesVersion,fingerprint:fp(p.services),field:'service-name',serviceKey:item.key,before:item.name,after,expiresAt:now()+15*60000};m.serviceProfileProposal=proposal;
  return present(c,'proposed','Vérifiez le nom exact de cette prestation du profil. Prix, durée, description et autres prestations conservés. Les réservations, contenus acquis et site existant ne seront pas réécrits.',{field:'service-name',serviceKey:item.key,proposalId:proposal.id,diff:{before:proposal.before,after},sourceVersion:proposal.version,confirmationRequired:true});
 }
 const value=requestedHours(text);
 if(!value){
  if(!c.project_id)throw new HttpError(409,'Rattachez un projet de services.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);
  if(loadProject(c.project_id).business!=='services')throw new HttpError(409,'Ces horaires concernent un projet de services.');
  return present(c,'ambiguous','Parlez-vous des horaires affichés du profil d’activité ou des créneaux réservables ? Aucun changement. Pour remplacer le texte complet du profil, ouvrez Activité et indiquez par exemple : Les horaires du profil sont : Mardi 9 h – 18 h. Les créneaux de réservation sont distincts ; ils ne seront pas modifiés par cet accord.');
 }
 const p=profile(user,c,m);
 if(value===p.services.hours)return present(c,'ambiguous','Ces horaires du profil sont déjà enregistrés. Aucun changement ni nouvelle version. Les créneaux réservables sont distincts.');
 const proposal:ServiceProfileProposal={id:id(),version:p.servicesVersion,fingerprint:fp(p.services),before:p.services.hours,after:value,expiresAt:now()+15*60000};m.serviceProfileProposal=proposal;
 return present(c,'proposed','Vérifiez le remplacement du texte complet des horaires du profil. Ce texte sera utilisé par les prochaines créations ; le site existant et les créneaux de réservation ne sont pas reconstruits.',{proposalId:proposal.id,diff:{before:proposal.before,after:proposal.after},sourceVersion:proposal.version,confirmationRequired:true});
}

export function confirmServiceProfile(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string){const p=profile(user,c,m),proposal=m.serviceProfileProposal;if(!proposal||proposal.id!==proposalId||proposal.expiresAt<now()||proposal.version!==p.servicesVersion||proposal.fingerprint!==fp(p.services))throw new HttpError(409,'Le profil ou la proposition a changé. Relisez et préparez un nouvel accord gratuit.','service_profile_conflict');const expected=structuredClone(p.services);
 if(proposal.field==='service-name'){const items=expected.services.filter(x=>x.key===proposal.serviceKey);if(items.length!==1||items[0].name!==proposal.before)throw new HttpError(409,'La prestation a changé.');items[0].name=proposal.after;}else expected.hours=proposal.after;
 // saveServices preserves native content aliases so acquired documents keep their identity.
 expected.services=expected.services.map(item=>{const old=p.services.services.find(x=>x.key===item.key)!;return{...item,contentAliases:[...new Set([...(old.contentAliases??[]),...(item.contentAliases??[]),old.name,item.name])]};});
 saveServices(p.id,expected,proposal.version);const read=loadProject(p.id);if(read.servicesVersion!==proposal.version+1||fp(read.services)!==fp(expected))throw new HttpError(409,'Enregistrement natif non confirmé.');delete m.serviceProfileProposal;return present(c,'applied',proposal.field==='service-name'?'Nom de la prestation enregistré et relu. Identité et alias natifs conservés ; aucune réservation ni création acquise réécrite.':'Horaires du profil enregistrés et relus. Aucun appel IA ni reconstruction du site ou des créneaux réservables.',{...(proposal.field==='service-name'?{field:'service-name' as const,serviceKey:proposal.serviceKey}:{}),proposalId:proposal.id,diff:{before:proposal.before,after:proposal.after},sourceVersion:proposal.version,resultVersion:read.servicesVersion,receiptId:requestId,actionsExecuted:true});}
