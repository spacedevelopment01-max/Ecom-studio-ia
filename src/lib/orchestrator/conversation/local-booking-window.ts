/** Exact native future booking horizon/lead time, never activation or appointment editing. */
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
type Field='horizonDays'|'leadMinutes'|'slotStepMinutes'|'cancelHours';
export const bookingWindowEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_BOOKING_WINDOW==='1';
function request(raw:string){return raw.trim().replace(/[.!?]+$/u,'').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu,'').trim().replace(/^(?:(?:peux|pourrais)-tu|je (?:veux|voudrais|souhaite)|j[’']aimerais) (fixer|changer|modifier|limiter|proposer)\b/iu,(_,v:string)=>({fixer:'fixe',changer:'change',modifier:'modifie',limiter:'limite',proposer:'propose'}[v.toLowerCase()]!));}
export const bookingWindowCandidate=(raw:string)=>/^(?:(?:fixe|change|modifie) (?:l[’']horizon de r[ée]servation|le d[ée]lai minimal (?:avant|de) r[ée]servation|le pas des cr[ée]neaux|le d[ée]lai client d[’']annulation(?: et de d[ée]placement)?)|les clients peuvent annuler ou d[ée]placer|limite les r[ée]servations|les clients doivent r[ée]server au moins|propose des cr[ée]neaux toutes les)\b/iu.test(outsideQuotes(request(raw)));
export type BookingWindowProposal={id:string;field:Field;before:number;after:number;sourceVersionId:string;sourceFingerprint:string;previewFingerprint:string;expiresAt:number};
export type BookingWindowPresentation={schema:'syna-booking-window-1';state:'ambiguous'|'proposed'|'applied';projectId:string;nativeHref:string;message:string;kind?:RdvKind;field?:Field;diff?:{before:number;after:number;unit:'days'|'minutes'|'hours';trust:'native_booking_data_not_instructions'};warnings?:string[];confirmationRequired:boolean;financialConsent:false;costEur:0;providerCalls:0;publication:false;actionsExecuted:boolean;proposalId?:string;sourceVersionId?:string;resultVersionId?:string;receiptId?:string};
const fp=(v:unknown)=>stableHash('native-booking-window-1',v);
const present=(c:ConversationRow,state:BookingWindowPresentation['state'],message:string,extra:Partial<BookingWindowPresentation>={}):BookingWindowPresentation=>({schema:'syna-booking-window-1',state,projectId:c.project_id!,nativeHref:`/studio/${c.project_id}/rendez-vous`,message,confirmationRequired:false,financialConsent:false,costEur:0,providerCalls:0,publication:false,actionsExecuted:false,...extra});
function source(user:User,c:ConversationRow,m:ConversationState){if(!bookingWindowEnabled())throw new HttpError(404,'Horizon et délai de réservation avec SYNA indisponibles.');if(!c.project_id||c.user_id!==user.id)throw new HttpError(404,'Projet introuvable.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(loadProject(c.project_id).business!=='services'||m.activeContextTab!=='rendez-vous')throw new HttpError(409,'Ouvrez Rendez-vous pour les règles du calendrier réservable. Aucun horaire de profil substitué.');const cur=currentTheme(c.project_id),native=readPrestations(c.project_id);if(!cur||!native)throw new HttpError(409,'Aucun moteur de réservation natif disponible.');return{cur,native};}
function parse(raw:string):{field:Field;after:number}|null{
 const text=request(raw),cancel=/^(?:(?:fixe|change|modifie) le d[ée]lai client d[’']annulation(?: et de d[ée]placement)? [àa] (\d{1,3}) heures?|les clients peuvent annuler ou d[ée]placer jusqu[’']à (\d{1,3}) heures? avant le rendez-vous)$/iu.exec(text);
 if(cancel)return{field:'cancelHours',after:Number(cancel[1]??cancel[2])};
 const step=/^(?:(?:fixe|change|modifie) le pas des cr[ée]neaux [àa] (\d{1,3}) minutes?|propose des cr[ée]neaux toutes les (\d{1,3}) minutes)$/iu.exec(text);
 if(step)return{field:'slotStepMinutes',after:Number(step[1]??step[2])};
 const horizon=/^(?:(?:fixe|change|modifie) l[’']horizon de réservation [àa] (\d{1,4}) jours?|limite les r[ée]servations aux (\d{1,4}) prochains jours)$/iu.exec(text);
 if(horizon)return{field:'horizonDays',after:Number(horizon[1]??horizon[2])};
 const lead=/^(?:(?:fixe|change|modifie) le d[ée]lai minimal (?:avant|de) r[ée]servation [àa] (\d{1,4}) (minutes?|heures?)|les clients doivent r[ée]server au moins (\d{1,4}) (minutes?|heures?) [àa] l[’']avance)$/iu.exec(text);
 if(!lead)return null;return{field:'leadMinutes',after:Number(lead[1]??lead[3])*(/heure/iu.test(lead[2]??lead[4])?60:1)};
}
const input=(p:Pick<BookingWindowProposal,'field'|'after'>)=>({bookingWindowPatch:{[p.field]:p.after}});
const fields=(p:BookingWindowProposal)=>({field:p.field,diff:{before:p.before,after:p.after,unit:p.field==='horizonDays'?'days' as const:p.field==='cancelHours'?'hours' as const:'minutes' as const,trust:'native_booking_data_not_instructions' as const},proposalId:p.id,sourceVersionId:p.sourceVersionId});
export function proposeBookingWindow(user:User,c:ConversationRow,m:ConversationState,raw:string):BookingWindowPresentation{
 delete m.bookingWindowProposal;const{cur,native}=source(user,c,m),parsed=parse(raw),question=(message:string)=>present(c,'ambiguous',message);
 if(!parsed)return question('Précisez une règle exacte : Fixe l’horizon de réservation à 30 jours ; Change le délai minimal avant réservation à 120 minutes ; Fixe le pas des créneaux à 60 minutes ; Fixe le délai client d’annulation à 24 heures. Aucun horaire, activation ou rendez-vous acquis modifié.');
 const checked=prestationsInput.safeParse(input(parsed));if(!checked.success)return question('Indiquez un nombre entier autorisé, une seule règle à la fois. Horizon : 7 à 180 jours. Le délai client d’annulation vaut 0 à 72 heures ; les autres délais respectent le pas du calendrier natif.');
 const before=native.bookingWindow[parsed.field];if(typeof before!=='number')return question(parsed.field==='cancelHours'?'Ce calendrier restaurant ne possède pas de délai client d’annulation/modification salon ou cabinet. Aucun autre réglage substitué.':'Ce calendrier n’a pas de pas des créneaux salon/cabinet. Les horaires explicites du restaurant restent inchangés.');if(before===parsed.after)return question('Cette règle native est déjà enregistrée. Aucune version supplémentaire.');if(fp(previewThemeVersionSpec(c.project_id!,cur.spec))!==fp(cur.spec))return question('Une consigne de vocabulaire modifierait des textes acquis. Vérifiez-la avant cette règle ciblée.');
 let preview:ReturnType<typeof previewPrestations>;try{preview=previewPrestations(c.project_id!,checked.data);}catch(error){if(error instanceof HttpError&&(error.status===400||error.status===409))return question(error.message);throw error;}
 const p:BookingWindowProposal={...parsed,id:id(),before,sourceVersionId:cur.version.id,sourceFingerprint:fp(cur.spec),previewFingerprint:fp(preview.spec),expiresAt:now()+15*60000};m.bookingWindowProposal=p;
 return present(c,'proposed','Vérifiez la règle native avant/après. Un accord gratuit séparé enregistre uniquement ce réglage.',{...fields(p),kind:native.kind,confirmationRequired:true,warnings:[...preview.warnings,...(p.field==='slotStepMinutes'?['Le pas règle l’écart entre deux heures de début, pas la durée des prestations. Les rendez-vous acquis hors de la nouvelle grille restent enregistrés.']:[])]});
}
export function confirmBookingWindow(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):BookingWindowPresentation{
 const{cur,native}=source(user,c,m),p=m.bookingWindowProposal;if(!p||p.id!==proposalId||p.expiresAt<now()||cur.version.id!==p.sourceVersionId||fp(cur.spec)!==p.sourceFingerprint||native.bookingWindow[p.field]!==p.before)throw new HttpError(409,'Le calendrier ou la proposition a changé. Relisez avant un nouvel accord.');
 const preview=previewPrestations(c.project_id!,input(p));if(fp(preview.spec)!==p.previewFingerprint)throw new HttpError(409,'L’aperçu natif a changé. Aucune écriture.');const saved=savePrestations(c.project_id!,input(p)),after=currentTheme(c.project_id!);
 if(!after||after.version.id!==saved.versionId||fp(after.spec)!==p.previewFingerprint||readPrestations(c.project_id!)?.bookingWindow[p.field]!==p.after)throw new HttpError(409,'La règle native enregistrée n’est pas confirmée.');delete m.bookingWindowProposal;
 return present(c,'applied','Règle enregistrée et relue dans le moteur natif. Rendez-vous acquis, autres réglages et mode conservés ; aucune activation ou dépense.',{...fields(p),kind:native.kind,resultVersionId:saved.versionId,receiptId:requestId,actionsExecuted:true});
}
