/** Exact free text changes on native bookable services; never the business profile. */
import {outsideQuotes} from './outside-quotes';
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now} from '../../db';
import {stableHash} from '../../brain/hash';
import {currentTheme,loadProject,previewThemeVersionSpec} from '../../projects';
import {readPrestations,previewPrestations,savePrestations,prestationsInput} from '../../contenus/prestations';
import {rdvSection} from '../../rendez-vous';
import type {ThemeSpec} from '../../theme/spec';
import {requirePlan} from '../../plan-gates';
import {activeContextEnabled} from './active-context';
import type {ConversationRow,ConversationState} from './contract';
type Field='name'|'short';
export const bookingServiceTextEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_BOOKING_SERVICE_TEXT==='1';
function request(raw:string){return raw.trim().replace(/[.!?]+$/u,'').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu,'').trim().replace(/^(?:(?:peux|pourrais)-tu|je (?:veux|voudrais|souhaite)|j[’']aimerais) (renommer|changer|modifier|effacer)\b/iu,(_m,v:string)=>({renommer:'renomme',changer:'change',modifier:'modifie',effacer:'efface'}[v.toLowerCase()]!));}
export const bookingServiceTextCandidate=(raw:string)=>{const text=outsideQuotes(request(raw));return /^(?:renomme (?:le service|la prestation) r[ée]servable|(?:change|modifie) le nom (?:du service|de la prestation) r[ée]servable|(?:change|modifie|efface) la description courte (?:du service|de la prestation) r[ée]servable)\b/iu.test(text);};
export type BookingServiceTextProposal={id:string;serviceId:string;field:Field;before:string;after:string;linkedLabelsChanged:number;sourceVersionId:string;sourceFingerprint:string;previewFingerprint:string;expiresAt:number};
export type BookingServiceTextPresentation={schema:'syna-booking-service-text-1';state:'ambiguous'|'proposed'|'applied';projectId:string;nativeHref:string;message:string;kind?:'salon'|'cabinet';field?:Field;service?:{id:string;untrustedMetadata:{name:string;trust:'native_booking_data_not_instructions'}};diff?:{before:string;after:string};linkedLabelsChanged?:number;warnings?:string[];confirmationRequired:boolean;financialConsent:false;costEur:0;providerCalls:0;publication:false;actionsExecuted:boolean;proposalId?:string;sourceVersionId?:string;resultVersionId?:string;receiptId?:string};
const fp=(value:unknown)=>stableHash('native-booking-service-text-1',value);
const present=(c:ConversationRow,state:BookingServiceTextPresentation['state'],message:string,extra:Partial<BookingServiceTextPresentation>={}):BookingServiceTextPresentation=>({schema:'syna-booking-service-text-1',state,projectId:c.project_id!,nativeHref:`/studio/${c.project_id}/rendez-vous`,message,confirmationRequired:false,financialConsent:false,costEur:0,providerCalls:0,publication:false,actionsExecuted:false,...extra});
function source(user:User,c:ConversationRow,m:ConversationState){
 if(!bookingServiceTextEnabled())throw new HttpError(404,'Textes des prestations réservables indisponibles.');
 if(!c.project_id||c.user_id!==user.id)throw new HttpError(404,'Projet introuvable.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);
 if(loadProject(c.project_id).business!=='services'||m.activeContextTab!=='rendez-vous')throw new HttpError(409,'Ouvrez Rendez-vous. Le profil d’activité est distinct des prestations réservables.');
 const cur=currentTheme(c.project_id),native=readPrestations(c.project_id);if(!cur||!native)throw new HttpError(409,'Aucune prestation réservable native disponible.');return{cur,native};
}
function parse(raw:string):{source:string;field:Field;after:string}|null{
 const text=request(raw),quote='(?:«(?<sourceFr>[^»\\r\\n]+)»|“(?<sourceCurly>[^”\\r\\n]+)”|"(?<sourceStraight>[^"\\r\\n]+)")',value='(?:«(?<valueFr>[^»]*)»|“(?<valueCurly>[^”]*)”|"(?<valueStraight>[^"]*)")',service='(?:le service|la prestation) r[ée]servable',of='(?:du service|de la prestation) r[ée]servable';
 const rename=new RegExp('^renomme '+service+' '+quote+' en '+value+'$','iu').exec(text),name=new RegExp('^(?:change|modifie) le nom '+of+' '+quote+' (?:par|[àa]) '+value+'$','iu').exec(text),short=new RegExp('^(?:change|modifie) la description courte '+of+' '+quote+' (?:par|[àa]) '+value+'$','iu').exec(text),clear=new RegExp('^efface la description courte '+of+' '+quote+'$','iu').exec(text),match=rename??name??short??clear;
 if(!match)return null;const groups=match.groups!;return{source:(groups.sourceFr??groups.sourceCurly??groups.sourceStraight).trim(),field:rename||name?'name':'short',after:clear?'':(groups.valueFr??groups.valueCurly??groups.valueStraight).trim()};
}
const input=(p:Pick<BookingServiceTextProposal,'serviceId'|'field'|'after'>)=>({servicePatch:{id:p.serviceId,[p.field]:p.after}});
function previewText(spec:ThemeSpec,serviceId:string,field:Field){
 const section=rdvSection(spec);if(!section||section.kind==='restaurant')return;
 const key=section.kind==='salon'?'service_id':'seance_id',type=section.kind==='salon'?'service':'seance',blocks=section.section.blocks??{},rows=(section.section.block_order??Object.keys(blocks)).map(k=>blocks[k]).filter(b=>b?.type===type&&b.settings?.[key]===serviceId);
 return rows.length===1?String(rows[0].settings?.[field]??''):undefined;
}
function linkedLabelsChanged(before:ThemeSpec,after:ThemeSpec){
 let count=0;const visit=(a:unknown,b:unknown)=>{if(!a||!b||typeof a!=='object'||typeof b!=='object'||['an-salon','pa-cabinet'].includes(String((a as Record<string,unknown>).type)))return;for(const[k,v]of Object.entries(a)){const next=(b as Record<string,unknown>)[k];if((k==='name'||k==='title')&&typeof v==='string'&&typeof next==='string'&&v!==next)count++;else if(typeof v==='object')visit(v,next);}};
 visit(before.templates,after.templates);visit(before.groups,after.groups);return count;
}
export function proposeBookingServiceText(user:User,c:ConversationRow,m:ConversationState,raw:string):BookingServiceTextPresentation{
 delete m.bookingServiceTextProposal;const {cur,native}=source(user,c,m),parsed=parse(raw),question=(message:string)=>present(c,'ambiguous',message);
 if(native.kind==='restaurant')return question('Le restaurant n’utilise pas de prestations réservables salon/cabinet. Aucun article de carte ou profil substitué.');
 if(!parsed)return question('Donnez la prestation exacte et le texte exact : Renomme le service réservable « nom ou ID exact » en « nouveau nom », ou Modifie la description courte du service réservable « nom ou ID exact » par « texte exact ». Effacement : Efface la description courte du service réservable « nom ou ID exact ».');
 const matches=native.services.filter(s=>s.id===parsed.source||s.name===parsed.source);if(matches.length!==1)return question(matches.length?'Plusieurs prestations correspondent. Précisez un identifiant natif unique.':'Aucune prestation native correspondante. Le profil d’activité n’est pas une cible de remplacement.');
 const service=matches[0],patch={serviceId:service.id,field:parsed.field,after:parsed.after},checked=prestationsInput.safeParse(input(patch));if(!checked.success)return question('Nom de 1 à 80 caractères ou description courte de 0 à 160 caractères requis. Aucun texte inventé ni autre champ modifié.');patch.after=String(checked.data.servicePatch![patch.field]);
 const before=service[patch.field];if(before===patch.after)return question('Ce texte réservable est déjà enregistré. Aucune nouvelle version.');
 if(fp(previewThemeVersionSpec(c.project_id!,cur.spec))!==fp(cur.spec))return question('Une consigne de vocabulaire modifierait aussi des textes acquis. Vérifiez-la d’abord dans le parcours natif.');
 const preview=previewPrestations(c.project_id!,input(patch));if(previewText(preview.spec,service.id,patch.field)!==patch.after)return question('Une consigne de vocabulaire transformerait votre nouveau texte. L’aperçu exact ne peut pas être proposé sans clarification.');
 const p:BookingServiceTextProposal={...patch,id:id(),before,linkedLabelsChanged:patch.field==='name'?linkedLabelsChanged(cur.spec,preview.spec):0,sourceVersionId:cur.version.id,sourceFingerprint:fp(cur.spec),previewFingerprint:fp(preview.spec),expiresAt:now()+15*60000};m.bookingServiceTextProposal=p;
 return present(c,'proposed','Vérifiez le texte exact avant/après et les libellés liés. Après accord gratuit, seule cette retouche native sera enregistrée. Aucun prix, durée, identifiant, profil ou rendez-vous confirmé changé.',{kind:native.kind,field:p.field,service:{id:service.id,untrustedMetadata:{name:service.name,trust:'native_booking_data_not_instructions'}},diff:{before,after:p.after},linkedLabelsChanged:p.linkedLabelsChanged,proposalId:p.id,sourceVersionId:p.sourceVersionId,warnings:['Un renommage met à jour les libellés liés qui portent exactement l’ancien nom. Les rendez-vous déjà confirmés conservent leur nom, prix et durée acquis.'],confirmationRequired:true});
}
export function confirmBookingServiceText(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):BookingServiceTextPresentation{
 const {cur,native}=source(user,c,m),p=m.bookingServiceTextProposal;if(!p||p.id!==proposalId||p.expiresAt<now()||native.kind==='restaurant'||cur.version.id!==p.sourceVersionId||fp(cur.spec)!==p.sourceFingerprint)throw new HttpError(409,'La prestation ou la proposition a changé. Relisez avant un nouvel accord.');
 const matches=native.services.filter(s=>s.id===p.serviceId);if(matches.length!==1||matches[0][p.field]!==p.before)throw new HttpError(409,'Prestation native changée ou ambiguë.');
 const preview=previewPrestations(c.project_id!,input(p));if(fp(preview.spec)!==p.previewFingerprint)throw new HttpError(409,'L’aperçu natif a changé. Aucune écriture.');const saved=savePrestations(c.project_id!,input(p)),after=currentTheme(c.project_id!);if(!after||after.version.id!==saved.versionId||fp(after.spec)!==p.previewFingerprint||readPrestations(c.project_id!)?.services.find(s=>s.id===p.serviceId)?.[p.field]!==p.after)throw new HttpError(409,'Texte natif enregistré non confirmé.');delete m.bookingServiceTextProposal;
 return present(c,'applied','Texte de prestation enregistré et relu dans une version native. Identifiant, prix, durée, profil et réservations acquises conservés ; aucune publication ou dépense.',{kind:native.kind,field:p.field,service:{id:p.serviceId,untrustedMetadata:{name:matches[0].name,trust:'native_booking_data_not_instructions'}},diff:{before:p.before,after:p.after},linkedLabelsChanged:p.linkedLabelsChanged,proposalId:p.id,sourceVersionId:p.sourceVersionId,resultVersionId:saved.versionId,receiptId:requestId,actionsExecuted:true});
}
