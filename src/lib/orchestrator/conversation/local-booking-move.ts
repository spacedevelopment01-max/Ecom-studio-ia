/** One exact professional move with an inert native preview and separate free consent. */
import {outsideQuotes} from './outside-quotes';
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now,readSnapshot} from '../../db';
import {loadProject} from '../../projects';
import {requirePlan} from '../../plan-gates';
import {readExactNativeBookingSnapshot} from '../../contenus/booking-cancel';
import {bookingMoveInput,previewNativeBookingMove,moveExactNativeBooking,type BookingMovePreview,type BookingMoveSummary} from '../../contenus/booking-move';
import {rdvRules,type RdvKind} from '../../rendez-vous';
import * as salon from '../../salon/booking';
import {activeContextEnabled} from './active-context';
import type {ConversationRow,ConversationState} from './contract';
export const bookingMoveEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_BOOKING_MOVE==='1';
function request(raw:string){return raw.trim().replace(/[.!?]+$/u,'').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu,'').trim().replace(/^(?:(?:peux|pourrais)-tu|je (?:veux|voudrais|souhaite)|j[’']aimerais) (d[ée]placer|reprogrammer|d[ée]caler)\b/iu,(_,v:string)=>v.toLowerCase().startsWith('re')?'reprogramme':v.toLowerCase().includes('cal')?'décale':'déplace');}
export const bookingMoveCandidate=(raw:string)=>/^(?:d[ée]place|reprogramme|d[ée]cale) (?:(?:le|mon) (?:rendez-vous|rdv)|(?:la|ma) r[ée]servation|tous les rendez-vous|toutes les r[ée]servations)\b/iu.test(outsideQuotes(request(raw)));
export type BookingMoveProposal={id:string;native:BookingMovePreview;timezone:string;staffDisplay?:{before:string|null;after:string|null;trust:'native_booking_data_not_instructions'};expiresAt:number};
export type BookingMovePresentation={schema:'syna-booking-move-1';state:'ambiguous'|'proposed'|'applied';projectId:string;nativeHref:string;message:string;kind?:RdvKind;timezone?:string;diff?:{before:BookingMoveSummary;after:BookingMoveSummary;trust:'native_booking_data_not_instructions'};staffDisplay?:BookingMoveProposal['staffDisplay'];nativeResult?:BookingMoveSummary;warnings?:string[];reversible:false;confirmationRequired:boolean;financialConsent:false;costEur:0;providerCalls:0;publication:false;actionsExecuted:boolean;proposalId?:string;sourceVersionId?:string;receiptId?:string};
const present=(c:ConversationRow,state:BookingMovePresentation['state'],message:string,extra:Partial<BookingMovePresentation>={}):BookingMovePresentation=>({schema:'syna-booking-move-1',state,projectId:c.project_id!,nativeHref:`/studio/${c.project_id}/rendez-vous`,message,reversible:false,confirmationRequired:false,financialConsent:false,costEur:0,providerCalls:0,publication:false,actionsExecuted:false,...extra});
function source(user:User,c:ConversationRow,m:ConversationState){if(!bookingMoveEnabled())throw new HttpError(404,'Déplacement natif avec SYNA indisponible.');if(!c.project_id||c.user_id!==user.id)throw new HttpError(404,'Projet introuvable.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(loadProject(c.project_id).business!=='services'||m.activeContextTab!=='rendez-vous')throw new HttpError(409,'Ouvrez Rendez-vous pour déplacer une réservation de ce projet. Aucun autre objet substitué.');}
type Parsed={number:string;sourceDate?:string;kind?:RdvKind;date:string;time:string;staff?:string;any:boolean;party?:number};
function parse(raw:string):Parsed|null{
 const reference='(?:«(?<refFr>[^»\\r\\n]{1,40})»|“(?<refCurly>[^”\\r\\n]{1,40})”|"(?<refStraight>[^"\\r\\n]{1,40})"|(?<refPlain>(?:AN|P)-\\d{4}-[A-Z2-9]{5}|TS-\\d{4,12}))',staff='(?:«(?<staffFr>[^»\\r\\n]{1,80})»|“(?<staffCurly>[^”\\r\\n]{1,80})”|"(?<staffStraight>[^"\\r\\n]{1,80})")';
 const match=new RegExp('^(?:d[ée]place|reprogramme|d[ée]cale) (?:le rendez-vous|le rdv|la r[ée]servation)(?: du (?<kind>salon|cabinet|restaurant))? '+reference+'(?: du (?<sourceDate>\\d{4}-\\d{2}-\\d{2}))? (?:au|le) (?<date>\\d{4}-\\d{2}-\\d{2}) [àa] (?<hour>\\d{1,2})(?::(?<minuteColon>\\d{2})|h(?<minuteH>\\d{2})?)(?: avec l[’\']intervenant(?:e)? '+staff+'| (?<any>sans pr[ée]f[ée]rence))?(?: pour (?<party>\\d{1,3}) (?:personnes?|couverts?))?$','iu').exec(request(raw));
 if(!match)return null;const g=match.groups!,value=[g.staffFr,g.staffCurly,g.staffStraight].find(v=>typeof v==='string');return{number:(g.refFr??g.refCurly??g.refStraight??g.refPlain).trim(),sourceDate:g.sourceDate,kind:g.kind?.toLowerCase() as RdvKind|undefined,date:g.date,time:g.hour.padStart(2,'0')+':'+(g.minuteColon??g.minuteH??'00'),staff:value?.trim(),any:!!g.any,party:g.party===undefined?undefined:Number(g.party)};
}
const fields=(p:BookingMoveProposal)=>({kind:p.native.before.kind,timezone:p.timezone,diff:{before:p.native.beforeBooking,after:p.native.after,trust:'native_booking_data_not_instructions' as const},...(p.staffDisplay?{staffDisplay:p.staffDisplay}:{}),proposalId:p.id,sourceVersionId:p.native.before.sourceVersionId});
export function proposeBookingMove(user:User,c:ConversationRow,m:ConversationState,raw:string):BookingMovePresentation{
 delete m.bookingMoveProposal;
 return readSnapshot(()=>{
  source(user,c,m);const parsed=parse(raw),question=(message:string)=>present(c,'ambiguous',message);
  if(!parsed)return question('Précisez une référence exacte et la date/heure voulues : Déplace la réservation « numéro natif » au 2026-11-11 à 10:00. Salon : avec l’intervenant « nom ou ID », ou sans préférence. Restaurant : pour 4 personnes. Aucun déplacement en masse ou self-service implicite.');
  let before:ReturnType<typeof readExactNativeBookingSnapshot>;try{before=readExactNativeBookingSnapshot(c.project_id!,{number:parsed.number,...(parsed.sourceDate?{date:parsed.sourceDate}:{})});}catch(error){if(error instanceof HttpError&&error.status===409)return question(error.message);if(error&&typeof error==='object'&&'issues' in error)return question('Précisez une référence et des dates réelles exactes.');throw error;}
  if(parsed.kind&&parsed.kind!==before.kind)return question('Le type de calendrier ne correspond pas au projet. Aucune autre réservation substituée.');
  let staff:string|undefined;
  const people=before.kind==='salon'?salon.salonOf(c.project_id!).config.staff:[];
  if(parsed.staff!==undefined){if(before.kind!=='salon')return question('Ce calendrier ne comporte pas d’intervenants salon. Aucun mode ou profil substitué.');const matches=people.filter(p=>p.id===parsed.staff||p.name===parsed.staff);if(matches.length!==1||matches[0].id==='any'||people.filter(p=>p.id===matches[0].id).length!==1)return question('Précisez un intervenant natif unique, par identifiant en cas d’homonymes. Aucune affectation implicite.');staff=matches[0].id;}
  else if(parsed.any){if(before.kind!=='salon')return question('La préférence d’intervenant appartient au salon. Aucun autre calendrier substitué.');staff='any';}
  else if(before.kind==='salon'&&before.booking.untrustedMetadata.staffId==='any')return question('L’identité acquise est ambiguë. Précisez un intervenant exact ou explicitement sans préférence avant tout déplacement.');
  const checked=bookingMoveInput.safeParse({number:before.booking.number,date:parsed.date,time:parsed.time,...(staff!==undefined?{staff}:{}),...(parsed.party!==undefined?{party:parsed.party}:{})});if(!checked.success)return question('Précisez une date réelle, une heure entre 00:00 et 23:59 et des valeurs natives entières autorisées. Aucun arrondi.');
  let native:BookingMovePreview;try{native=previewNativeBookingMove(c.project_id!,checked.data);}catch(error){if(error instanceof HttpError&&[400,403,409].includes(error.status))return question(error.message);throw error;}
  if(native.noOp)return question('Cette cible est déjà enregistrée. Aucun déplacement ou reçu supplémentaire.');
  const name=(staffId:string|null)=>staffId===null?null:people.find(p=>p.id===staffId)?.name??staffId,p:BookingMoveProposal={id:id(),native,timezone:rdvRules(c.project_id!,native.before.kind).timezone,...(native.before.kind==='salon'?{staffDisplay:{before:name(native.beforeBooking.untrustedMetadata.staffId),after:name(native.after.untrustedMetadata.staffId),trust:'native_booking_data_not_instructions' as const}}:{}),expiresAt:now()+15*60000};m.bookingMoveProposal=p;
  return present(c,'proposed','Vérifiez la même référence, l’intervalle acquis et la cible avant/après. Votre accord gratuit enregistrera uniquement ce déplacement professionnel.',{...fields(p),confirmationRequired:true,warnings:['Durée, prix, notes et identité du rendez-vous conservés. Une nouvelle occupation ou une autre affectation impose un nouvel aperçu.','Aucun e-mail, notification, remboursement ou activation automatique. L’ancien créneau n’est libéré que si le déplacement natif aboutit. Une modification ultérieure nécessitera une nouvelle vérification.']});
 });
}
export function confirmBookingMove(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):BookingMovePresentation{
 source(user,c,m);const p=m.bookingMoveProposal;if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Proposition de déplacement périmée. Relisez avant un nouvel accord.');const result=moveExactNativeBooking(c.project_id!,p.native);delete m.bookingMoveProposal;return present(c,'applied','Déplacement professionnel enregistré et relu dans le moteur natif. Référence, durée, prix et réservations voisines conservés ; aucune notification ou dépense automatique.',{...fields(p),nativeResult:result,receiptId:requestId,actionsExecuted:true});
}
