import {checkedServiceContact,type ServiceContactField} from '../../service-contact-validation';
/** First exact native business-profile field. Never a booking/content-item identity. */
import {unsafeContentReason} from '../../theme/content-security';
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now} from '../../db';
import {stableHash} from '../../brain/hash';
import {loadProject,saveServices} from '../../projects';
import {requirePlan} from '../../plan-gates';
import {activeContextEnabled} from './active-context';
import type {ConversationRow,ConversationState} from './contract';
export type ServiceProfileProposal={id:string;version:number;fingerprint:string;before:string;after:string;expiresAt:number;field?:'service-name'|'service-price'|'service-duration'|'service-description'|ServiceContactField;serviceKey?:string};
export type ServiceProfilePresentation={schema:'syna-service-profile-1';state:'proposed'|'applied'|'ambiguous';field:'hours'|'service-name'|'service-price'|'service-duration'|'service-description'|ServiceContactField|'contact';serviceKey?:string;serviceName?:string;choices?:{key:string;name:string}[];message:string;financialConsent:false;costEur:0;providerCalls:0;confirmationRequired:boolean;actionsExecuted:boolean;publication:false;proposalId?:string;diff?:{before:string;after:string};sourceVersion?:number;resultVersion?:number;receiptId?:string;projectId:string};
export const serviceProfileEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_SERVICE_PROFILE==='1';
/** Catch native scheduling requests before any paid reasoning; an unclear target stays a free question. */
const contactCandidate=(text:string)=>/^(?:mets?|remplace|change|modifie|efface|vide|supprime)\b/iu.test(text.trim())&&/\b(?:t[ée]l[ée]phone|courriel|e-?mail|coordonn[ée]es|zone d[’']intervention|adresse)\b/iu.test(text);
const detailCandidate=(text:string)=>/^(?:mets?|remplace|change|modifie|efface|vide)\b/iu.test(text.trim())&&/\b(?:prix|dur[ée]es?|descriptions?)\b/iu.test(text)&&/\bprestations?\b/iu.test(text);
export const serviceProfileCandidate=(text:string)=>detailCandidate(text)||contactCandidate(text)||/^(?:renomme|rebaptise) (?:cette|la) prestation\b/iu.test(text.trim())||/\b(?:horaires?|cr[ée]neaux|disponibilit[ée]s?)\b/iu.test(text)&&/^(?:remplace|change|modifie|mets?|nos? |les? |mes? )/iu.test(text.trim());
function requestedHours(text:string):string|undefined{
 const match=/^(?:(?:remplace|change|modifie|mets?) (?:les |mes )?horaires (?:du profil(?: d[’']activit[ée])?|d[’']ouverture) (?:par|pour|[àa])\s*:?[ \t]*|(?:nos?|les?|mes?) horaires (?:du profil(?: d[’']activit[ée])?|d[’']ouverture) sont\s*:?[ \t]*)([^\r\n]+)$/iu.exec(text.trim());
 if(!match)return;
 const raw=match[1].trim(),quoted=/^[«“"]([^\r\n]*)[»”"]\s*[.!]?$/u.exec(raw);
 if(!quoted&&(/[«»“”"]|\b(?:puis|ensuite)\b/iu.test(raw)))return;
 const value=(quoted?quoted[1]:raw).trim();return value.length>0&&value.length<=400?value:undefined;
}

const fp=(profile:unknown)=>stableHash('native-business-profile-1',profile);
function profile(user:User,c:ConversationRow,m:ConversationState){if(!serviceProfileEnabled())throw new HttpError(404,'Modification du profil indisponible.');if(!c.project_id)throw new HttpError(409,'Rattachez un projet de services.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);const p=loadProject(c.project_id);if(p.business!=='services'||m.activeContextTab!=='produit')throw new HttpError(409,'Ouvrez Activité pour modifier le profil de ce projet. Les créneaux réservables et le compte sont distincts.');return p;}
const present=(c:ConversationRow,state:ServiceProfilePresentation['state'],message:string,extra:Partial<ServiceProfilePresentation>={}):ServiceProfilePresentation=>({schema:'syna-service-profile-1',state,field:'hours',projectId:c.project_id!,message,financialConsent:false,costEur:0,providerCalls:0,confirmationRequired:false,actionsExecuted:false,publication:false,...extra});
export function proposeServiceProfile(user:User,c:ConversationRow,m:ConversationState,text:string){
 delete m.serviceProfileProposal;
 if(!serviceProfileEnabled())throw new HttpError(404,'Modification du profil indisponible.');
 if(detailCandidate(text)){
  const token=/\b(?:prix|dur[ée]e|description)\b/iu.exec(text)?.[0].toLowerCase(),nativeField:'price'|'duration'|'description'=token==='prix'?'price':token?.startsWith('dur')?'duration':'description',field=`service-${nativeField}` as const,label=nativeField==='price'?'le prix affiché':nativeField==='duration'?'la durée affichée':'la description',limit=nativeField==='description'?1000:60;
  const p=profile(user,c,m),question=(message:string)=>present(c,'ambiguous',message,{field,choices:p.services.services.map(x=>({key:x.key!,name:x.name}))});
  const change=(nativeField==='description'?/^(?:mets?|remplace|change|modifie) (la description) de la prestation du profil [«“"]([^»”"\r\n]+)[»”"] (?:par|pour|[àa]) [«“"]([^»”"]*)[»”"]\s*[.!]?$/iu:/^(?:mets?|remplace|change|modifie) (le prix|la dur[ée]e) de la prestation du profil [«“"]([^»”"\r\n]+)[»”"] (?:par|pour|[àa]) [«“"]([^»”"\r\n]*)[»”"]\s*[.!]?$/iu).exec(text.trim()),clear=/^(?:efface|vide) (le prix|la dur[ée]e|la description) de la prestation du profil [«“"]([^»”"\r\n]+)[»”"]\s*[.!]?$/iu.exec(text.trim());
  if(!change&&!clear)return question(`Précisez ${label} dans le profil d’activité : Mets ${nativeField==='price'?'le prix':nativeField==='duration'?'la durée':'la description'} de la prestation du profil « Nom exact » à « ${nativeField==='price'?'75 €':nativeField==='duration'?'45 min':'Faits fournis'} ». Les tarifs et durées des services réservables sont distincts ;aucun rendez-vous ni achat.`);
  const key=(change??clear)![2].trim(),items=p.services.services.filter(x=>x.key===key||x.name===key);
  if(items.length!==1||!items[0].key||p.services.services.filter(x=>x.key===items[0].key).length!==1)return question('Prestation du profil absente ou ambiguë. Indiquez sa clé native ; aucun premier résultat choisi.');
  const raw=clear?'':change![3],after=raw.trim();if(raw.length>limit||unsafeContentReason(after))return question(`Texte exact attendu :${limit} caractères maximum, sans contenu actif ni troncature. Aucun fait, montant ou créneau ne sera inventé.`);
  const before=items[0][nativeField]??'';if(before===after)return question('Ce texte affiché est déjà enregistré. Aucun changement ni nouvelle version.');
  const proposal:ServiceProfileProposal={id:id(),field,serviceKey:items[0].key,version:p.servicesVersion,fingerprint:fp(p.services),before,after,expiresAt:now()+15*60000};m.serviceProfileProposal=proposal;
  return present(c,'proposed',`Vérifiez ${label} de cette prestation du profil. Après accord gratuit, son texte seul changera ; prestations réservables, paiements, devis clients et contenus acquis restent distincts. Aucun achat ni calcul de taxe ou de créneau.`,{field,serviceKey:proposal.serviceKey,serviceName:items[0].name,proposalId:proposal.id,diff:{before,after},sourceVersion:proposal.version,confirmationRequired:true});
 }
 if(/^(?:renomme|rebaptise) (?:cette|la) prestation\b/iu.test(text.trim())){
  const p=profile(user,c,m),match=/^(?:renomme|rebaptise) la prestation [«“"]([^»”"\r\n]+)[»”"] en [«“"]([^»”"\r\n]+)[»”"]\s*[.!]?$/iu.exec(text.trim());
  const clarify=(message:string)=>present(c,'ambiguous',message,{field:'service-name',choices:p.services.services.map(x=>({key:x.key!,name:x.name}))});
  if(!match)return clarify('Quelle prestation du profil d’activité ? Indiquez son nom exact : Renomme la prestation « Nom actuel » en « Nouveau nom ». Les services réservables ont des identités distinctes ; ils ne seront pas renommés.');
  const name=match[1].trim(),after=match[2].trim(),matches=p.services.services.filter(x=>x.key===name||x.name===name);
  if(matches.length!==1||!matches[0].key||p.services.services.filter(x=>x.key===matches[0].key).length!==1)return clarify('Prestation absente ou ambiguë. Précisez sa clé native dans les choix ; aucun premier résultat ne sera choisi.');
  if(!after||after.length>120||unsafeContentReason(after))return clarify('Nom exact attendu : 120 caractères maximum, sans contenu actif ni troncature.');
  const item=matches[0];if(item.name===after)return clarify('Ce nom est déjà enregistré. Aucun changement ni nouvelle version.');
  const proposal:ServiceProfileProposal={id:id(),version:p.servicesVersion,fingerprint:fp(p.services),field:'service-name',serviceKey:item.key,before:item.name,after,expiresAt:now()+15*60000};m.serviceProfileProposal=proposal;
  return present(c,'proposed','Vérifiez le nom exact de cette prestation du profil. Prix, durée, description et autres prestations conservés. Les réservations, contenus acquis et site existant ne seront pas réécrits.',{field:'service-name',serviceKey:item.key,serviceName:item.name,proposalId:proposal.id,diff:{before:proposal.before,after},sourceVersion:proposal.version,confirmationRequired:true});
 }
 if(contactCandidate(text)){
  const p=profile(user,c,m),question=(message:string)=>present(c,'ambiguous',message,{field:'contact'});
  const label="(?:le |mon |la |ma |l[’'])(t[ée]l[ée]phone|num[ée]ro de t[ée]l[ée]phone|e-?mail|courriel|zone d[’']intervention) du profil";
  const change=new RegExp("^(?:mets?|remplace|change|modifie) "+label+" (?:par|pour|[àa])\\s*:?[ \\t]*(.+)$",'iu').exec(text.trim()),clear=new RegExp("^(?:efface|vide) "+label+"\\s*[.!]?$",'iu').exec(text.trim());
  if(!change&&!clear)return question('Précisez le téléphone, l’e-mail ou la zone d’intervention du PROFIL : Mets le téléphone du profil à « 01 23 45 67 89 ». Les coordonnées du compte et des réservations sont distinctes. L’adresse liée à la réservation du site reste dans son formulaire natif pour ce lot. Aucun devis ni changement.');
  const name=(change??clear)![1],field:ServiceContactField=/t[ée]l[ée]phone/iu.test(name)?'phone':/courriel|mail/iu.test(name)?'email':'area';let raw='';
  if(change){const source=change[2].trim(),quoted=/^[«“"]([^»”"\r\n]*)[»”"]\s*[.!]?$/u.exec(source);if(!quoted&&(/[«»“”"]|\b(?:puis|ensuite)\b|[\r\n]/iu.test(source)))return question('Donnez une seule valeur exacte, ou Efface le champ du profil explicitement. Aucune commande chaînée ne sera appliquée.');raw=quoted?quoted[1]:source;}
  let after:string;try{after=checkedServiceContact(field,raw);}catch(e){if(e instanceof HttpError&&e.status===400)return question(e.message);throw e;}
  const before=p.services[field];if(typeof before!=='string')return question('Le champ natif ne contient pas un texte valide. Rechargez le profil ;aucune autre donnée ne sera normalisée silencieusement.');if(before===after)return question('Cette coordonnée est déjà enregistrée. Aucun changement ni nouvelle version.');
  const proposal:ServiceProfileProposal={id:id(),version:p.servicesVersion,fingerprint:fp(p.services),field,before,after,expiresAt:now()+15*60000};m.serviceProfileProposal=proposal;
  return present(c,'proposed','Vérifiez ce champ exact du profil du projet. Après accord gratuit, les coordonnées du profil peuvent être utilisées par les parcours natifs qui le lisent. Aucun e-mail,appel ou rendez-vous ne sera envoyé ou créé ici ;adresse,autres coordonnées et prestations conservées.',{field,proposalId:proposal.id,diff:{before,after},sourceVersion:proposal.version,confirmationRequired:true});
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
 if(proposal.field==='service-name'||proposal.field==='service-price'||proposal.field==='service-duration'||proposal.field==='service-description'){const items=expected.services.filter(x=>x.key===proposal.serviceKey),key=proposal.field==='service-name'?'name':proposal.field==='service-price'?'price':proposal.field==='service-duration'?'duration':'description';if(items.length!==1||(items[0][key]??'')!==proposal.before)throw new HttpError(409,'La prestation a changé.');if(key==='name'||key==='description')items[0][key]=proposal.after;else items[0][key]=proposal.after||undefined;}else if(proposal.field){expected[proposal.field]=checkedServiceContact(proposal.field,proposal.after);}else expected.hours=proposal.after;
 // saveServices preserves native content aliases so acquired documents keep their identity.
 expected.services=expected.services.map(item=>{const old=p.services.services.find(x=>x.key===item.key)!;return{...item,contentAliases:[...new Set([...(old.contentAliases??[]),...(item.contentAliases??[]),old.name,item.name])]};});
 saveServices(p.id,expected,proposal.version);const read=loadProject(p.id);if(read.servicesVersion!==proposal.version+1||fp(read.services)!==fp(expected))throw new HttpError(409,'Enregistrement natif non confirmé.');delete m.serviceProfileProposal;return present(c,'applied',proposal.field==='service-description'?'Description du profil enregistrée et relue. Aucun contenu acquis ni service réservable réécrit.':proposal.field==='service-duration'?'Durée affichée du profil enregistrée et relue. Aucun créneau ni rendez-vous modifié.':proposal.field==='service-price'?'Prix affiché du profil enregistré et relu. Aucun tarif réservable, paiement ou devis client modifié.':proposal.field&&proposal.field!=='service-name'?'Coordonnée du profil enregistrée et relue. Aucun message,appel ni rendez-vous créé.':proposal.field==='service-name'?'Nom de la prestation enregistré et relu. Identité et alias natifs conservés ; aucune réservation ni création acquise réécrite.':'Horaires du profil enregistrés et relus. Aucun appel IA ni reconstruction du site ou des créneaux réservables.',{...(proposal.field?{field:proposal.field,...(proposal.field==='service-name'||proposal.field==='service-price'||proposal.field==='service-duration'||proposal.field==='service-description'?{serviceKey:proposal.serviceKey,serviceName:read.services.services.find(x=>x.key===proposal.serviceKey)!.name}:{})}:{}),proposalId:proposal.id,diff:{before:proposal.before,after:proposal.after},sourceVersion:proposal.version,resultVersion:read.servicesVersion,receiptId:requestId,actionsExecuted:true});}
