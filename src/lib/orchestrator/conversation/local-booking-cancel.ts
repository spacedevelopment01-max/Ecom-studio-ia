/** One exact professional booking cancellation, not client self-service or deletion. */
import {outsideQuotes} from './outside-quotes';
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now} from '../../db';
import {loadProject} from '../../projects';
import {requirePlan} from '../../plan-gates';
import {bookingCancelInput,previewNativeBookingCancel,cancelExactNativeBooking,type BookingCancelSnapshot,type BookingCancelSummary} from '../../contenus/booking-cancel';
import type {RdvKind} from '../../rendez-vous';
import {activeContextEnabled} from './active-context';
import type {ConversationRow,ConversationState} from './contract';
export const bookingCancelEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_BOOKING_CANCEL==='1';
function request(raw:string){return raw.trim().replace(/[.!?]+$/u,'').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu,'').trim().replace(/^(?:(?:peux|pourrais)-tu|je (?:veux|voudrais|souhaite)|j[’']aimerais) (annuler|supprimer)\b/iu,(_,v:string)=>v.toLowerCase()==='annuler'?'annule':'supprime');}
export const bookingCancelCandidate=(raw:string)=>/^(?:annule|supprime) (?:(?:le|mon) (?:rendez-vous|rdv)|(?:la|ma) r[ée]servation|tous les rendez-vous|toutes les r[ée]servations)\b/iu.test(outsideQuotes(request(raw)));
export type BookingCancelProposal={id:string;native:BookingCancelSnapshot;expiresAt:number};
export type BookingCancelPresentation={schema:'syna-booking-cancel-1';state:'ambiguous'|'proposed'|'applied';projectId:string;nativeHref:string;message:string;kind?:RdvKind;diff?:{before:BookingCancelSummary;after:BookingCancelSummary;trust:'native_booking_data_not_instructions'};nativeResult?:BookingCancelSummary;warnings?:string[];destructive:true;reversible:false;confirmationRequired:boolean;financialConsent:false;costEur:0;providerCalls:0;publication:false;actionsExecuted:boolean;proposalId?:string;sourceVersionId?:string;receiptId?:string};
const present=(c:ConversationRow,state:BookingCancelPresentation['state'],message:string,extra:Partial<BookingCancelPresentation>={}):BookingCancelPresentation=>({schema:'syna-booking-cancel-1',state,projectId:c.project_id!,nativeHref:`/studio/${c.project_id}/rendez-vous`,message,destructive:true,reversible:false,confirmationRequired:false,financialConsent:false,costEur:0,providerCalls:0,publication:false,actionsExecuted:false,...extra});
function source(user:User,c:ConversationRow,m:ConversationState){if(!bookingCancelEnabled())throw new HttpError(404,'Annulation native avec SYNA indisponible.');if(!c.project_id||c.user_id!==user.id)throw new HttpError(404,'Projet introuvable.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(loadProject(c.project_id).business!=='services'||m.activeContextTab!=='rendez-vous')throw new HttpError(409,'Ouvrez Rendez-vous pour annuler une réservation de ce projet. Aucun autre objet substitué.');}
function parse(raw:string):{number:string;date?:string;kind?:RdvKind}|null{
 const text=request(raw),m=/^annule (?:le rendez-vous|le rdv|la r[ée]servation)(?: du (?<kind>salon|cabinet|restaurant))? (?:«(?<fr>[^»\r\n]{1,40})»|“(?<curly>[^”\r\n]{1,40})”|"(?<straight>[^"\r\n]{1,40})"|(?<plain>(?:AN|P)-\d{4}-[A-Z2-9]{5}|TS-\d{4,12}))(?: du (?<date>\d{4}-\d{2}-\d{2}))?$/iu.exec(text);if(!m)return null;const g=m.groups!;return{number:(g.fr??g.curly??g.straight??g.plain).trim(),date:g.date,kind:g.kind?.toLowerCase() as RdvKind|undefined};
}
const fields=(p:BookingCancelProposal)=>({kind:p.native.kind,diff:{before:p.native.booking,after:{...p.native.booking,status:'canceled' as const},trust:'native_booking_data_not_instructions' as const},proposalId:p.id,sourceVersionId:p.native.sourceVersionId});
export function proposeBookingCancel(user:User,c:ConversationRow,m:ConversationState,raw:string):BookingCancelPresentation{
 delete m.bookingCancelProposal;source(user,c,m);const parsed=parse(raw),question=(text:string)=>present(c,'ambiguous',text);
 if(!parsed)return question('Précisez une seule référence exacte : Annule la réservation « numéro natif » du 2026-11-10. Le professionnel annule après aperçu et accord gratuit ; l’historique est conservé. Aucune suppression en masse ni annulation de retouche.');
 const checked=bookingCancelInput.safeParse({number:parsed.number,date:parsed.date});if(!checked.success)return question('Précisez une référence native de 1 à 40 caractères et une date réelle si vous en donnez une.');
 let native:BookingCancelSnapshot;try{native=previewNativeBookingCancel(c.project_id!,checked.data);}catch(error){if(error instanceof HttpError&&error.status===409)return question(error.message);throw error;}
 if(parsed.kind&&parsed.kind!==native.kind)return question('Le type de calendrier demandé ne correspond pas à ce projet. Aucune autre réservation substituée.');if(native.booking.status==='canceled')return question('Cette réservation est déjà annulée. Aucune nouvelle annulation ni écriture.');
 const p:BookingCancelProposal={id:id(),native,expiresAt:now()+15*60000};m.bookingCancelProposal=p;
 return present(c,'proposed','Vérifiez la référence, la date, l’heure et la prestation avant votre accord gratuit. Seule cette réservation sera annulée par le professionnel.',{...fields(p),confirmationRequired:true,warnings:['Le créneau, les couverts ou la place d’atelier seront libérés. L’historique et les autres réservations restent en place.','Aucun remboursement, e-mail ou notification automatique. Une nouvelle réservation éventuelle devra être vérifiée séparément ; cette annulation n’est pas une retouche de thème annulable.']});
}
export function confirmBookingCancel(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):BookingCancelPresentation{
 source(user,c,m);const p=m.bookingCancelProposal;if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Proposition d’annulation périmée. Relisez avant un nouvel accord.');const result=cancelExactNativeBooking(c.project_id!,p.native);delete m.bookingCancelProposal;
 return present(c,'applied','Annulation professionnelle enregistrée et relue dans le moteur natif. Historique et réservations voisines conservés ; aucun remboursement ou notification automatique.',{...fields(p),nativeResult:result.booking,receiptId:requestId,actionsExecuted:true});
}
