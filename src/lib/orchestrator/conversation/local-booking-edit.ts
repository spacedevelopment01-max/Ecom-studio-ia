/** Free targeted native booking configuration. Never business profile, reservation or activation. */
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now} from '../../db';
import {stableHash} from '../../brain/hash';
import {currentTheme,loadProject,previewThemeVersionSpec} from '../../projects';
import {requirePlan} from '../../plan-gates';
import {previewPrestations,readPrestations,savePrestations} from '../../contenus/prestations';
import {activeContextEnabled} from './active-context';
import type {ConversationRow,ConversationState} from './contract';
export const bookingEditEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_BOOKING_EDIT==='1';
function request(raw:string){return raw.trim().replace(/\s*\?\s*$/u,'').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu,'').trim().replace(/^(?:peux|pourrais)-tu (mettre|modifier|changer)\b/iu,(_m,v:string)=>({mettre:'mets',modifier:'modifie',changer:'change'}[v.toLowerCase()]!));}
export const bookingEditCandidate=(raw:string)=>/^(?:mets?|modifie|change)\b/iu.test(request(raw))&&/\b(?:prix|tarif|dur[ée]e)\b/iu.test(raw)&&/\b(?:r[ée]servable|r[ée]servation)\b/iu.test(raw);
export type BookingEditProposal={id:string;serviceId:string;field:'price'|'duration';before:number|null;after:number;sourceVersionId:string;sourceFingerprint:string;previewFingerprint:string;expiresAt:number};
export type BookingEditPresentation={schema:'syna-booking-edit-1';state:'ambiguous'|'proposed'|'applied';projectId:string;nativeHref:string;message:string;confirmationRequired:boolean;financialConsent:false;costEur:0;providerCalls:0;actionsExecuted:boolean;publication:false;proposalId?:string;service?:{id:string;untrustedMetadata:{name:string;trust:'native_booking_data_not_instructions'}};field?:'price'|'duration';diff?:{before:number|null;after:number};sourceVersionId?:string;resultVersionId?:string;warnings?:string[];receiptId?:string};
function source(user:User,c:ConversationRow,m:ConversationState){
 if(!bookingEditEnabled())throw new HttpError(404,'Retouche gratuite des services réservables indisponible.');
 if(!c.project_id||c.user_id!==user.id)throw new HttpError(404,'Projet introuvable.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);
 if(loadProject(c.project_id).business!=='services'||m.activeContextTab!=='rendez-vous')throw new HttpError(409,'Ouvrez les réservations du projet de services. Le profil d’activité reste distinct.');
 const cur=currentTheme(c.project_id),native=readPrestations(c.project_id);if(!cur||!native)throw new HttpError(409,'Aucune réservation native disponible. Aucun service substitué ni activation.');return{cur,native};
}
const present=(c:ConversationRow,state:BookingEditPresentation['state'],message:string,extra:Partial<BookingEditPresentation>={}):BookingEditPresentation=>({schema:'syna-booking-edit-1',state,projectId:c.project_id!,nativeHref:`/studio/${c.project_id}/rendez-vous`,message,confirmationRequired:false,financialConsent:false,costEur:0,providerCalls:0,actionsExecuted:false,publication:false,...extra});
const fp=(spec:unknown)=>stableHash('native-booking-edit-1',spec);
const previewFingerprint=(p:{spec:unknown;warnings:string[]})=>fp({spec:p.spec,warnings:p.warnings});
const input=(p:Pick<BookingEditProposal,'serviceId'|'field'|'after'>)=>({servicePatch:{id:p.serviceId,[p.field]:p.after}});
export function proposeBookingEdit(user:User,c:ConversationRow,m:ConversationState,raw:string):BookingEditPresentation{
 delete m.bookingEditProposal;const {cur,native}=source(user,c,m),text=request(raw);
 const exact=/^(?:mets?|modifie|change) (?:le (prix|tarif) r[ée]servable de|la (dur[ée]e) de r[ée]servation de|le (prix|tarif) du service r[ée]servable|la (dur[ée]e) du service r[ée]servable) [«“"]([^»”"\r\n]+)[»”"] [àa] (\d+(?:[.,]\d{1,2})?)\s*(€|euros?|minutes?|min)\s*[.!]?$/iu.exec(text);
 const question=(message:string)=>present(c,'ambiguous',message);
 if(!exact)return question('Quelle prestation réservable et quel champ exact ? Par exemple : Mets le prix réservable de « nom ou ID exact » à 60 €, ou Change la durée de réservation de « nom ou ID exact » à 45 minutes. Une seule demande ; aucun profil, devis, rendez-vous ou achat modifié.');
 const field=exact[2]||exact[4]?'duration':'price',unit=exact[7].toLowerCase(),value=Number(exact[6].replace(',','.'));
 if(field==='duration'&&!/^(?:minutes?|min)$/.test(unit)||field==='price'&&!/^(?:€|euros?)$/.test(unit)||field==='duration'&&(!Number.isInteger(value)||value<5||value>600)||field==='price'&&(value<0||value>100000))return question('Précisez une durée entière de 5 à 600 minutes ou un prix en euros de 0 à 100000. Aucun changement ni devis.');
 const rows=native.services.filter(s=>s.id===exact[5].trim()||s.name===exact[5].trim());if(rows.length!==1)return question(rows.length?'Plusieurs prestations portent ce nom. Précisez leur identifiant natif exact.':'Aucune prestation réservable native correspondante. Le profil d’activité ne fournit pas une cible de remplacement.');
 const service=rows[0],before=field==='price'?service.price:service.duration;if(before===value)return question('Cette valeur est déjà enregistrée. Aucune version ni action supplémentaire.');
 if(fp(previewThemeVersionSpec(c.project_id!,cur.spec))!==fp(cur.spec))return question('Une consigne de vocabulaire en mémoire modifierait aussi des textes du site. Cette retouche numérique seule ne les autorise pas ; vérifiez d’abord cette consigne dans le parcours natif. Aucun changement ni devis.');
 const patch={serviceId:service.id,field,after:value} as const,preview=previewPrestations(c.project_id!,input(patch));
 const p:BookingEditProposal={...patch,id:id(),before,sourceVersionId:cur.version.id,sourceFingerprint:fp(cur.spec),previewFingerprint:previewFingerprint(preview),expiresAt:now()+15*60000};m.bookingEditProposal=p;
 return present(c,'proposed','Vérifiez la valeur native avant/après. Après accord gratuit, seule cette retouche et ses textes affichés liés seront enregistrés dans une version du site. Les rendez-vous confirmés, le profil et le mode de réservation restent conservés ; aucune publication ni dépense.',{proposalId:p.id,field,service:{id:service.id,untrustedMetadata:{name:service.name,trust:'native_booking_data_not_instructions'}},diff:{before,after:value},sourceVersionId:p.sourceVersionId,warnings:preview.warnings,confirmationRequired:true});
}
export function confirmBookingEdit(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):BookingEditPresentation{
 const {cur,native}=source(user,c,m),p=m.bookingEditProposal;if(!p||p.id!==proposalId||p.expiresAt<now()||cur.version.id!==p.sourceVersionId||fp(cur.spec)!==p.sourceFingerprint)throw new HttpError(409,'La réservation native ou la proposition a changé. Préparez un nouvel accord gratuit.');
 const rows=native.services.filter(s=>s.id===p.serviceId);if(rows.length!==1||rows[0][p.field]!==p.before)throw new HttpError(409,'La prestation native a changé. Aucun remplacement.');
 const preview=previewPrestations(c.project_id!,input(p));if(previewFingerprint(preview)!==p.previewFingerprint)throw new HttpError(409,'L’aperçu natif a changé. Relisez avant de confirmer.');
 const saved=savePrestations(c.project_id!,input(p)),after=currentTheme(c.project_id!);if(!after||after.version.id!==saved.versionId||previewFingerprint({spec:after.spec,warnings:saved.warnings})!==p.previewFingerprint||saved.prestations?.services.find(s=>s.id===p.serviceId)?.[p.field]!==p.after)throw new HttpError(409,'Enregistrement natif exact non confirmé.');delete m.bookingEditProposal;
 return present(c,'applied','Valeur réservable enregistrée et relue dans une nouvelle version native. Aucun rendez-vous confirmé, profil, achat ou mode de réservation modifié.',{proposalId:p.id,field:p.field,service:{id:p.serviceId,untrustedMetadata:{name:rows[0].name,trust:'native_booking_data_not_instructions'}},diff:{before:p.before,after:p.after},sourceVersionId:p.sourceVersionId,resultVersionId:saved.versionId,warnings:saved.warnings,receiptId:requestId,actionsExecuted:true});
}
