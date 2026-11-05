/** Exact native workshop period; acquired enrolments are never moved implicitly. */
import {outsideQuotes} from './outside-quotes';
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now} from '../../db';
import {stableHash} from '../../brain/hash';
import {currentTheme,loadProject,previewThemeVersionSpec} from '../../projects';
import {prestationsInput,readPrestations,previewPrestations,savePrestations} from '../../contenus/prestations';
import {requirePlan} from '../../plan-gates';
import {activeContextEnabled} from './active-context';
import type {ConversationRow,ConversationState} from './contract';
export const workshopScheduleEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_BOOKING_WORKSHOP_SCHEDULE==='1';
function request(raw:string){
 return raw.trim().replace(/[.!?]+$/u,'').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu,'').trim()
  .replace(/^(?:(?:peux|pourrais)-tu|je (?:veux|voudrais|souhaite)|j[’']aimerais) (programmer|reprogrammer|fixer|changer|modifier)\b/iu,(_,v:string)=>({programmer:'programme',reprogrammer:'reprogramme',fixer:'fixe',changer:'change',modifier:'modifie'}[v.toLowerCase()]!));
}
export const workshopScheduleCandidate=(raw:string)=>/^(?:(?:programme|reprogramme) l[’']atelier\b|(?:fixe|change|modifie) (?:la date|l[’']heure|la dur[ée]e) de l[’']atelier\b)/iu.test(outsideQuotes(request(raw)));
type Native=NonNullable<ReturnType<typeof readPrestations>>['workshops'][number];
type Period={date:string;time:string;durationMinutes:number|null};
type Patch={date?:string;time?:string;durationMinutes?:number};
export type WorkshopScheduleProposal={id:string;workshop:Native;patch:Patch;after:Period;timezone:string;sourceVersionId:string;sourceFingerprint:string;previewFingerprint:string;expiresAt:number};
export type WorkshopSchedulePresentation={schema:'syna-workshop-schedule-1';state:'ambiguous'|'proposed'|'applied';projectId:string;nativeHref:string;message:string;workshop?:{id:string;untrustedMetadata:{title:string;trust:'native_booking_data_not_instructions'}};timezone?:string;acquiredEnrolments?:number;diff?:{before:Period;after:Period};warnings?:string[];confirmationRequired:boolean;financialConsent:false;costEur:0;providerCalls:0;publication:false;actionsExecuted:boolean;proposalId?:string;sourceVersionId?:string;resultVersionId?:string;receiptId?:string};
const fp=(value:unknown)=>stableHash('native-workshop-schedule-1',value);
const period=(w:Native):Period=>({date:w.date,time:w.time,durationMinutes:w.durationMinutes});
const present=(c:ConversationRow,state:WorkshopSchedulePresentation['state'],message:string,extra:Partial<WorkshopSchedulePresentation>={}):WorkshopSchedulePresentation=>({schema:'syna-workshop-schedule-1',state,projectId:c.project_id!,nativeHref:`/studio/${c.project_id}/rendez-vous`,message,confirmationRequired:false,financialConsent:false,costEur:0,providerCalls:0,publication:false,actionsExecuted:false,...extra});
function source(user:User,c:ConversationRow,m:ConversationState){
 if(!workshopScheduleEnabled())throw new HttpError(404,'Période atelier avec SYNA indisponible.');
 if(!c.project_id||c.user_id!==user.id)throw new HttpError(404,'Projet introuvable.');
 ownedProject(user,c.project_id);requirePlan(user,c.project_id);
 if(loadProject(c.project_id).business!=='services'||m.activeContextTab!=='rendez-vous')throw new HttpError(409,'Ouvrez Rendez-vous pour la période d’un atelier natif.');
 const cur=currentTheme(c.project_id),native=readPrestations(c.project_id);
 if(!cur||native?.kind!=='cabinet')throw new HttpError(409,'Aucun calendrier cabinet natif disponible. Aucun autre objet substitué.');
 return{cur,native};
}
const quoted=String.raw`(?:«([^»\r\n]{1,120})»|“([^”\r\n]{1,120})”|"([^"\r\n]{1,120})")`;
const hour=String.raw`(?:[01]?\d|2[0-3])(?::[0-5]\d|h(?:[0-5]\d)?)`;
function clock(value:string){const [h,m='00']=value.toLowerCase().split(/[:h]/);return `${h.padStart(2,'0')}:${m||'00'}`;}
function parse(raw:string):{source:string;patch:Patch}|null{
 const text=request(raw),full=new RegExp(String.raw`^(?:programme|reprogramme) l[’']atelier ${quoted} le (\d{4}-\d{2}-\d{2}) [àa] (${hour}) (?:pour|pendant) (\d{1,4})\s*(?:min|minutes?)$`,'iu').exec(text);
 if(full)return{source:full.slice(1,4).find(v=>typeof v==='string')!.trim(),patch:{date:full[4],time:clock(full[5]),durationMinutes:Number(full[6])}};
 const single=new RegExp(String.raw`^(?:fixe|change|modifie) (la date|l[’']heure|la dur[ée]e) de l[’']atelier ${quoted} (?:[àa]|au) (.+)$`,'iu').exec(text);
 if(!single)return null;const source=single.slice(2,5).find(v=>typeof v==='string')!.trim(),field=single[1].toLowerCase(),value=single[5];
 if(field==='la date'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return{source,patch:{date:value}};
 if(/^l[’']heure$/.test(field)&&new RegExp(`^${hour}$`,'iu').test(value))return{source,patch:{time:clock(value)}};
 if(/^la dur[ée]e$/.test(field)&&/^\d{1,4}\s*(?:min|minutes?)$/iu.test(value))return{source,patch:{durationMinutes:Number(value.match(/^\d+/)![0])}};
 return null;
}
const input=(p:Pick<WorkshopScheduleProposal,'workshop'|'patch'>)=>({workshopSchedulePatch:{id:p.workshop.id,...p.patch}});
const fields=(p:WorkshopScheduleProposal)=>({workshop:{id:p.workshop.id,untrustedMetadata:{title:p.workshop.title,trust:'native_booking_data_not_instructions' as const}},timezone:p.timezone,acquiredEnrolments:p.workshop.confirmedCount,diff:{before:period(p.workshop),after:p.after},proposalId:p.id,sourceVersionId:p.sourceVersionId});
export function proposeWorkshopSchedule(user:User,c:ConversationRow,m:ConversationState,raw:string):WorkshopSchedulePresentation{
 delete m.workshopScheduleProposal;
 const{cur,native}=source(user,c,m),parsed=parse(raw),question=(message:string)=>present(c,'ambiguous',message);
 if(!parsed)return question('Précisez un atelier unique : Reprogramme l’atelier « titre ou ID exact » le 2026-11-11 à 15:00 pour 90 minutes. Ou changez sa date, son heure ou sa durée seule. Aucune inscription acquise déplacée.');
 const matches=native.workshops.filter(a=>a.id===parsed.source||a.title===parsed.source);
 if(matches.length!==1||matches[0].identityAmbiguous)return question('Précisez un atelier natif unique, par identifiant canonique en cas d’homonymes. Aucun premier atelier choisi.');
 const workshop=matches[0],checked=prestationsInput.safeParse(input({workshop,patch:parsed.patch}));
 if(!checked.success)return question('Précisez une date civile ISO réelle, une heure exacte et une durée entière native de 5 à 600 minutes. Aucun arrondi ni heure devinée.');
 const after:Period={...period(workshop),...parsed.patch};
 if(fp(after)===fp(period(workshop)))return question('Cette période native est déjà enregistrée. Aucun reçu ou version supplémentaire.');
 if(fp(previewThemeVersionSpec(c.project_id!,cur.spec))!==fp(cur.spec))return question('Une consigne de vocabulaire modifierait des textes acquis. Vérifiez-la avant la période ciblée.');
 let preview:ReturnType<typeof previewPrestations>;
 try{preview=previewPrestations(c.project_id!,checked.data);}catch(error){if(error instanceof HttpError&&[400,409].includes(error.status))return question(error.message);throw error;}
 const p:WorkshopScheduleProposal={id:id(),workshop,patch:parsed.patch,after,timezone:native.bookingTimezone,sourceVersionId:cur.version.id,sourceFingerprint:fp(cur.spec),previewFingerprint:fp(preview.spec),expiresAt:now()+15*60000};
 m.workshopScheduleProposal=p;
 return present(c,'proposed','Vérifiez la date, l’heure, la durée et le fuseau avant/après. L’accord gratuit change uniquement la période de cet atelier, sans déplacer d’inscrit.',{...fields(p),confirmationRequired:true,warnings:[...preview.warnings,...(!native.live?['Le cabinet reste en démonstration. Cette période ne l’active pas.']:[])]});
}
export function confirmWorkshopSchedule(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):WorkshopSchedulePresentation{
 const{cur,native}=source(user,c,m),p=m.workshopScheduleProposal,rows=p?native.workshops.filter(a=>a.id===p.workshop.id):[];
 if(!p||p.id!==proposalId||p.expiresAt<now()||cur.version.id!==p.sourceVersionId||fp(cur.spec)!==p.sourceFingerprint||rows.length!==1||fp(rows[0])!==fp(p.workshop))throw new HttpError(409,'Le calendrier, l’atelier ou ses inscriptions confirmées ont changé. Relisez avant un nouvel accord.');
 const preview=previewPrestations(c.project_id!,input(p));
 if(fp(preview.spec)!==p.previewFingerprint)throw new HttpError(409,'L’aperçu de période a changé. Aucune écriture.');
 const saved=savePrestations(c.project_id!,input(p)),after=currentTheme(c.project_id!),fresh=readPrestations(c.project_id!)?.workshops.filter(a=>a.id===p.workshop.id);
 if(!after||after.version.id!==saved.versionId||fp(after.spec)!==p.previewFingerprint||fresh?.length!==1||fp(period(fresh[0]))!==fp(p.after)||fresh[0].confirmedCount!==p.workshop.confirmedCount)throw new HttpError(409,'La période enregistrée n’est pas confirmée.');
 delete m.workshopScheduleProposal;
 return present(c,'applied','Période enregistrée et relue dans le moteur natif. Aucune inscription déplacée, aucun paiement ou message ; prix, capacités et autres ateliers conservés.',{...fields(p),resultVersionId:saved.versionId,receiptId:requestId,actionsExecuted:true});
}
