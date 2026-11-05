/** Exact native calendar timezone, with explicit acquired-appointment interpretation warnings. */
import {outsideQuotes} from './outside-quotes';
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now} from '../../db';
import {stableHash} from '../../brain/hash';
import {currentTheme,loadProject,previewThemeVersionSpec} from '../../projects';
import {prestationsInput,readPrestations,previewPrestations,savePrestations} from '../../contenus/prestations';
import type {RdvKind} from '../../rendez-vous';
import {requirePlan} from '../../plan-gates';
import {activeContextEnabled} from './active-context';
import type {ConversationRow,ConversationState} from './contract';
export const bookingTimezoneEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_BOOKING_TIMEZONE==='1';
function request(raw:string){return raw.trim().replace(/[.!?]+$/u,'').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu,'').trim().replace(/^(?:(?:peux|pourrais)-tu|je (?:veux|voudrais|souhaite)|j[’']aimerais) (fixer|changer|modifier|limiter|proposer)\b/iu,(_,v:string)=>({fixer:'fixe',changer:'change',modifier:'modifie',limiter:'limite',proposer:'propose'}[v.toLowerCase()]!));}
export const bookingTimezoneCandidate=(raw:string)=>/^(?:fixe|change|modifie) le fuseau (?:horaire )?(?:du calendrier|de r[ée]servation)\b/iu.test(outsideQuotes(request(raw)));
export type BookingTimezoneProposal={id:string;before:string;after:string;sourceVersionId:string;sourceFingerprint:string;previewFingerprint:string;expiresAt:number};
export type BookingTimezonePresentation={schema:'syna-booking-timezone-1';state:'ambiguous'|'proposed'|'applied';projectId:string;nativeHref:string;message:string;kind?:RdvKind;diff?:{before:string;after:string;trust:'native_booking_data_not_instructions'};warnings?:string[];confirmationRequired:boolean;financialConsent:false;costEur:0;providerCalls:0;publication:false;actionsExecuted:boolean;proposalId?:string;sourceVersionId?:string;resultVersionId?:string;receiptId?:string};
const fp=(v:unknown)=>stableHash('native-booking-timezone-1',v);
const present=(c:ConversationRow,state:BookingTimezonePresentation['state'],message:string,extra:Partial<BookingTimezonePresentation>={}):BookingTimezonePresentation=>({schema:'syna-booking-timezone-1',state,projectId:c.project_id!,nativeHref:`/studio/${c.project_id}/rendez-vous`,message,confirmationRequired:false,financialConsent:false,costEur:0,providerCalls:0,publication:false,actionsExecuted:false,...extra});
function source(user:User,c:ConversationRow,m:ConversationState){if(!bookingTimezoneEnabled())throw new HttpError(404,'Fuseau natif avec SYNA indisponible.');if(!c.project_id||c.user_id!==user.id)throw new HttpError(404,'Projet introuvable.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(loadProject(c.project_id).business!=='services'||m.activeContextTab!=='rendez-vous')throw new HttpError(409,'Ouvrez Rendez-vous pour les règles du calendrier réservable. Aucun horaire de profil substitué.');const cur=currentTheme(c.project_id),native=readPrestations(c.project_id);if(!cur||!native)throw new HttpError(409,'Aucun moteur de réservation natif disponible.');return{cur,native};}
function parse(raw:string):{after:string}|null{
 const m=/^(?:fixe|change|modifie) le fuseau (?:horaire )?(?:du calendrier|de r[ée]servation) (?:[àa]|par) (?:«([^»\r\n]{1,80})»|“([^”\r\n]{1,80})”|"([^"\r\n]{1,80})")$/iu.exec(request(raw));
 return m?{after:m.slice(1).find(v=>typeof v==='string')!.trim()}:null;
}
const input=(p:Pick<BookingTimezoneProposal,'after'>)=>({bookingTimezonePatch:{timezone:p.after}});
const fields=(p:BookingTimezoneProposal)=>({diff:{before:p.before,after:p.after,trust:'native_booking_data_not_instructions' as const},proposalId:p.id,sourceVersionId:p.sourceVersionId});
export function proposeBookingTimezone(user:User,c:ConversationRow,m:ConversationState,raw:string):BookingTimezonePresentation{
 delete m.bookingTimezoneProposal;const{cur,native}=source(user,c,m),parsed=parse(raw),question=(message:string)=>present(c,'ambiguous',message);
 if(!parsed)return question('Précisez un fuseau exact cité : Change le fuseau du calendrier par « America/Los_Angeles ». Aucune ville, date ou migration devinée.');
 const checked=prestationsInput.safeParse(input(parsed));if(!checked.success)return question('Précisez un identifiant UTC ou IANA exact pris en charge. Aucun repli UTC, décalage libre ou autre action implicite.');
 const before=native.bookingTimezone;if(before===parsed.after)return question('Ce fuseau natif est déjà enregistré. Aucune version supplémentaire.');if(fp(previewThemeVersionSpec(c.project_id!,cur.spec))!==fp(cur.spec))return question('Une consigne de vocabulaire modifierait des textes acquis. Vérifiez-la avant le changement de fuseau.');

 let preview:ReturnType<typeof previewPrestations>;try{preview=previewPrestations(c.project_id!,checked.data);}catch(error){if(error instanceof HttpError&&(error.status===400||error.status===409))return question(error.message);throw error;}
 const p:BookingTimezoneProposal={...parsed,id:id(),before,sourceVersionId:cur.version.id,sourceFingerprint:fp(cur.spec),previewFingerprint:fp(preview.spec),expiresAt:now()+15*60000};m.bookingTimezoneProposal=p;
 return present(c,'proposed','Vérifiez le fuseau avant/après et son impact sur les rendez-vous déjà acquis. Un accord gratuit séparé enregistrera ce seul réglage.',{...fields(p),kind:native.kind,confirmationRequired:true,warnings:preview.warnings});
}
export function confirmBookingTimezone(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):BookingTimezonePresentation{
 const{cur,native}=source(user,c,m),p=m.bookingTimezoneProposal;if(!p||p.id!==proposalId||p.expiresAt<now()||cur.version.id!==p.sourceVersionId||fp(cur.spec)!==p.sourceFingerprint||native.bookingTimezone!==p.before)throw new HttpError(409,'Le calendrier ou la proposition a changé. Relisez avant un nouvel accord.');
 const preview=previewPrestations(c.project_id!,input(p));if(fp(preview.spec)!==p.previewFingerprint)throw new HttpError(409,'L’aperçu natif a changé. Aucune écriture.');const saved=savePrestations(c.project_id!,input(p)),after=currentTheme(c.project_id!);
 if(!after||after.version.id!==saved.versionId||fp(after.spec)!==p.previewFingerprint||readPrestations(c.project_id!)?.bookingTimezone!==p.after)throw new HttpError(409,'La règle native enregistrée n’est pas confirmée.');delete m.bookingTimezoneProposal;
 return present(c,'applied','Fuseau enregistré et relu dans le moteur natif. Dates et heures acquises conservées sans conversion ; leur interprétation suit ce fuseau. Aucune notification, activation ou dépense.',{...fields(p),kind:native.kind,resultVersionId:saved.versionId,receiptId:requestId,actionsExecuted:true});
}
