/** Weekly native booking opening windows. Never profile hours, live availability or a customer booking. */
import {outsideQuotes} from './outside-quotes';
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now} from '../../db';
import {stableHash} from '../../brain/hash';
import {currentTheme,loadProject,previewThemeVersionSpec} from '../../projects';
import {DAYS,previewPrestations,readPrestations,savePrestations,prestationsInput} from '../../contenus/prestations';
import {salonOf} from '../../salon/booking';
import {cabinetOf} from '../../cabinet/booking';
import {requirePlan} from '../../plan-gates';
import {activeContextEnabled} from './active-context';
import type {ConversationRow,ConversationState} from './contract';
type Day=typeof DAYS[number];
const dayNames={lundi:'mon',mardi:'tue',mercredi:'wed',jeudi:'thu',vendredi:'fri',samedi:'sat',dimanche:'sun'} as const;
export const bookingHoursEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_BOOKING_HOURS==='1';
function request(raw:string){return raw.trim().replace(/[.!?]+$/u,'').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu,'').trim().replace(/^(?:peux|pourrais)-tu (mettre|modifier|changer|remplacer|ouvrir|fermer)\b/iu,(_m,v:string)=>({mettre:'mets',modifier:'modifie',changer:'change',remplacer:'remplace',ouvrir:'ouvre',fermer:'ferme'}[v.toLowerCase()]!));}
const prefix='(?:horaires r[ée]servables|horaires de r[ée]servation|cr[ée]neaux (?:r[ée]servables|de r[ée]servation))';
export const bookingHoursCandidate=(raw:string)=>{const text=outsideQuotes(request(raw));return new RegExp('^(?:mets?|modifie|change|remplace) (?:les |mes )?'+prefix+'\\b','iu').test(text)||/^(?:ouvre|ferme) les r[ée]servations\b/iu.test(text);};
/** On the Activity tab, an incomplete legacy phrase may only clarify profile vs booking. */
export const bookingHoursIncompleteRequest=(raw:string)=>new RegExp('^(?:mets?|modifie|change|remplace) (?:les |mes )?'+prefix+' (?:du |le )(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)s?$','iu').test(outsideQuotes(request(raw)).trim());
export type BookingHoursProposal={id:string;day:Day;dayLabel:string;before:string;after:string;sourceVersionId:string;sourceFingerprint:string;previewFingerprint:string;expiresAt:number};
export type BookingHoursPresentation={schema:'syna-booking-hours-1';state:'ambiguous'|'proposed'|'applied';projectId:string;nativeHref:string;message:string;confirmationRequired:boolean;financialConsent:false;costEur:0;providerCalls:0;actionsExecuted:boolean;publication:false;recurrence:'weekly';kind?:'salon'|'cabinet';timezone?:string;day?:Day;dayLabel?:string;diff?:{before:string;after:string};proposalId?:string;sourceVersionId?:string;resultVersionId?:string;warnings?:string[];receiptId?:string};
const fp=(value:unknown)=>stableHash('native-booking-hours-1',value);
const present=(c:ConversationRow,state:BookingHoursPresentation['state'],message:string,extra:Partial<BookingHoursPresentation>={}):BookingHoursPresentation=>({schema:'syna-booking-hours-1',state,projectId:c.project_id!,nativeHref:`/studio/${c.project_id}/rendez-vous`,message,recurrence:'weekly',confirmationRequired:false,financialConsent:false,costEur:0,providerCalls:0,actionsExecuted:false,publication:false,...extra});
function source(user:User,c:ConversationRow,m:ConversationState){
 if(!bookingHoursEnabled())throw new HttpError(404,'Horaires réservables avec SYNA indisponibles.');
 if(!c.project_id||c.user_id!==user.id)throw new HttpError(404,'Projet introuvable.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);
 if(loadProject(c.project_id).business!=='services'||m.activeContextTab!=='rendez-vous')throw new HttpError(409,'Ouvrez Rendez-vous dans ce projet de services. Le profil d’activité est distinct.');
 const cur=currentTheme(c.project_id),native=readPrestations(c.project_id);if(!cur||!native)throw new HttpError(409,'Aucune réservation native dans ce site. Aucun calendrier ou service inventé.');
 const timezone=native.kind==='salon'?salonOf(c.project_id).config.timezone:native.kind==='cabinet'?cabinetOf(c.project_id).config.timezone:null;
 return{cur,native,timezone};
}
function parse(raw:string):{day:Day;dayLabel:string;after:string}|null{
 const text=request(raw),dayPattern='(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)s?';
 const closing=new RegExp('^ferme les r[ée]servations (?:le |du )'+dayPattern+'$','iu').exec(text);
 const opening=new RegExp('^(?:(?:mets?|modifie|change|remplace) (?:les |mes )?'+prefix+' (?:du |le )|ouvre les r[ée]servations (?:le |du ))'+dayPattern+' (.+)$','iu').exec(text);
 const match=closing??opening;if(!match)return null;
 const dayLabel=match[1].toLowerCase() as keyof typeof dayNames,day=dayNames[dayLabel];if(closing)return{day,dayLabel,after:''};
 let value=opening![2].trim(),after:string;
 const quoted=/^(?:par|[àa])\s+[«“"]([^»”"\r\n]*)[»”"]$/u.exec(value);
 if(quoted)after=quoted[1];else{
  const time='(\\d{1,2})(?:\\s*[:h]\\s*(\\d{2})?)?',range=new RegExp('^(?:de )?'+time+'\\s*[àa]\\s*'+time+'$','iu');
  const parts=value.split(/\s+et\s+|\s*,\s*/iu);if(parts.length>4)return null;const ranges:string[]=[];
  for(const part of parts){const r=range.exec(part.trim());if(!r)return null;const hm=(h:string,m:string|undefined)=>h.padStart(2,'0')+':'+(m??'00');ranges.push(hm(r[1],r[2])+'-'+hm(r[3],r[4]));}after=ranges.join(', ');
 }
 try{const normalized=prestationsInput.parse({hours:{[day]:after}}).hours![day]!;const ranges=normalized.split(',').filter(Boolean).map(r=>r.trim().split('-').map(t=>Number(t.slice(0,2))*60+Number(t.slice(3,5))));for(let i=1;i<ranges.length;i++)if(ranges[i][0]<ranges[i-1][1])return null;}catch{return null;}
 after=after.trim().replace(/\s*-\s*/g,'-').replace(/\s*,\s*/g,', ');return{day,dayLabel,after};
}
const warning='Ces plages hebdomadaires bornent les réservations. Les règles des prestations et intervenants continuent de limiter les créneaux effectifs ; aucune disponibilité en temps réel n’est annoncée. Les rendez-vous déjà confirmés conservent leur horaire, prix et durée.';
export function proposeBookingHours(user:User,c:ConversationRow,m:ConversationState,text:string):BookingHoursPresentation{
 delete m.bookingHoursProposal;const {cur,native,timezone}=source(user,c,m),question=(message:string)=>present(c,'ambiguous',message);
 if(native.kind==='restaurant')return question('Le restaurant utilise ses jours et ses créneaux de midi et du soir. Ils sont distincts des plages du salon/cabinet ;aucune transposition ou réservation effectuée.');
 const parsed=parse(text);if(!parsed)return question('Quel jour et quelles plages hebdomadaires réservables ? Par exemple : Change les horaires réservables du mardi de 9 h à 12 h et de 14 h à 18 h, ou Ferme les réservations le mardi. Une seule journée ;aucun horaire du profil ou rendez-vous client modifié.');
 const before=native.hours[parsed.day];if(before===parsed.after)return question('Ces horaires réservables sont déjà enregistrés. Aucune nouvelle version ni écriture.');
 if(fp(previewThemeVersionSpec(c.project_id!,cur.spec))!==fp(cur.spec))return question('Une consigne de vocabulaire modifierait aussi des textes du site. Vérifiez-la dans le parcours natif avant cet accord limité aux horaires.');
 const preview=previewPrestations(c.project_id!,{hours:{[parsed.day]:parsed.after}}),p:BookingHoursProposal={...parsed,id:id(),before,sourceVersionId:cur.version.id,sourceFingerprint:fp(cur.spec),previewFingerprint:fp(preview.spec),expiresAt:now()+15*60000};m.bookingHoursProposal=p;
 return present(c,'proposed','Vérifiez les plages réservables avant/après pour ce jour, chaque semaine dans le fuseau natif. Après accord gratuit, seule cette journée de configuration sera enregistrée ;profil, autres jours et rendez-vous conservés.',{kind:native.kind,timezone:timezone!,day:p.day,dayLabel:p.dayLabel,diff:{before,after:p.after},proposalId:p.id,sourceVersionId:p.sourceVersionId,warnings:[warning],confirmationRequired:true});
}
export function confirmBookingHours(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):BookingHoursPresentation{
 const {cur,native,timezone}=source(user,c,m),p=m.bookingHoursProposal;if(!p||p.id!==proposalId||p.expiresAt<now()||native.kind==='restaurant'||cur.version.id!==p.sourceVersionId||fp(cur.spec)!==p.sourceFingerprint||native.hours[p.day]!==p.before)throw new HttpError(409,'Les horaires ou la proposition ont changé. Relisez avant un nouvel accord gratuit.');
 const input={hours:{[p.day]:p.after}},preview=previewPrestations(c.project_id!,input);if(fp(preview.spec)!==p.previewFingerprint)throw new HttpError(409,'L’aperçu natif a changé. Aucune écriture.');
 const saved=savePrestations(c.project_id!,input),after=currentTheme(c.project_id!);if(!after||after.version.id!==saved.versionId||fp(after.spec)!==p.previewFingerprint||saved.prestations?.hours[p.day]!==p.after)throw new HttpError(409,'Les horaires natifs enregistrés ne correspondent pas à l’accord.');delete m.bookingHoursProposal;
 return present(c,'applied','Horaires réservables enregistrés et relus dans la version native. Aucun rendez-vous créé ou déplacé ;profil, autres jours et mode de réservation conservés.',{kind:native.kind,timezone:timezone!,day:p.day,dayLabel:p.dayLabel,diff:{before:p.before,after:p.after},proposalId:p.id,sourceVersionId:p.sourceVersionId,resultVersionId:saved.versionId,warnings:[warning],receiptId:requestId,actionsExecuted:true});
}
