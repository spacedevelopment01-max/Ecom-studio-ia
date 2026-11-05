/** Local editorial dates only. Never approves, schedules, resumes or publishes a post. */
import {outsideQuotes} from './outside-quotes';
import {formatInTimeZone} from 'date-fns-tz';
import {findDates} from '../../social-v2/edit-dates';
import {HttpError,ownedProject,type User} from '../../auth';
import {all,one,id,now} from '../../db';
import {loadProject} from '../../projects';
import {requirePlan} from '../../plan-gates';
import {stableHash} from '../../brain/hash';
import {planSocialEdit,movedAt,moveToWeekday} from '../../social-v2/local-edit';
import {editPostV2} from '../../social-v2/engine';
import {moveRefusal} from '../../social-v2/scheduler';
import {conversationSocialEnabled} from './tool-flags';
import type {ConversationRow,ConversationState} from './contract';
type Post={id:string;project_id:string;status:string;scheduled_at:number|null;timezone:string;title:string;[key:string]:unknown};
export type CalendarProposal={id:string;postId:string;fingerprint:string;before:number;after:number;timezone:string;expiresAt:number};
export type CalendarPresentation={schema:'syna-local-calendar-1';state:'ambiguous'|'proposed'|'applied';projectId:string;message:string;financialConsent:false;costEur:0;providerCalls:0;publication:false;scheduling:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;target?:{postId:string;title:string;status:string;timezone:string};diff?:{before:number;after:number};receiptId?:string;nativeHref?:string};
export const localCalendarEnabled=()=>conversationSocialEnabled();
export const localCalendarCandidate=(text:string)=>/^(?:d[ée]place|d[ée]cale|reporte|avance|repousse|change|mets?)\b/iu.test(text.trim())&&/\b(?:publications?|calendrier)\b/iu.test(outsideQuotes(text));
const present=(c:ConversationRow,state:CalendarPresentation['state'],message:string,extra:Partial<CalendarPresentation>={}):CalendarPresentation=>({schema:'syna-local-calendar-1',state,projectId:c.project_id!,message,financialConsent:false,costEur:0,providerCalls:0,publication:false,scheduling:false,confirmationRequired:false,actionsExecuted:false,...extra});
function owned(user:User,c:ConversationRow,m:ConversationState){if(!localCalendarEnabled())throw new HttpError(404,'Calendrier local indisponible.');if(!c.project_id)throw new HttpError(409,'Rattachez un projet.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(m.activeContextTab!=='calendrier')throw new HttpError(409,'Ouvrez Calendrier pour déplacer une date éditoriale locale.');return loadProject(c.project_id);}
const rows=(pid:string)=>all<Post>('SELECT * FROM posts WHERE project_id=? ORDER BY id',pid);
const fingerprint=(pid:string)=>stableHash('native-editorial-calendar-1',{posts:rows(pid),settings:loadProject(pid).settings});
export function proposeLocalCalendar(user:User,c:ConversationRow,m:ConversationState,text:string):CalendarPresentation{
 delete m.localCalendarProposal;owned(user,c,m);
 const question=(message:string)=>present(c,'ambiguous',message);
 if(!/^(?:d[ée]place|d[ée]cale|reporte|avance|repousse|change|mets?) (?:ma|la) prochaine publication\b/iu.test(text.trim())||/\b(?:puis|ensuite|et publie|et programme)\b/iu.test(text))return question('Précisez une seule prochaine publication et sa nouvelle date : Déplace ma prochaine publication au vendredi à 18h. Seules les dates éditoriales des brouillons sont raccordées ici ; aucun envoi ni devis.');
 const at=now(),plan=planSocialEdit(text,c.project_id!,at);
 if(plan.kind!=='local'||!['move_weekday','move_date','shift','set_time'].includes(plan.action)||plan.ids.length!==1)return question('Aucune date unique de brouillon identifiée. Précisez le jour et l’heure ; aucune génération, approbation ou programmation ne sera déduite.');
 const post=one<Post>('SELECT * FROM posts WHERE id=? AND project_id=?',plan.ids[0],c.project_id!);
 if(!post||post.scheduled_at===null)return question('La publication ne possède pas de date éditoriale native.');
 if(!['planned','draft','review'].includes(post.status))return question('Cette publication est déjà approuvée, programmée, en pause, envoyée ou en erreur. Son déplacement pourrait affecter un envoi : utilisez le contrôle natif dédié. Aucun changement.');
 if(rows(c.project_id!).filter(r=>r.engine==='v2'&&r.scheduled_at===post.scheduled_at&&!['published','publishing','uncertain'].includes(r.status)).length!==1)return question('Plusieurs publications partagent cette prochaine date. Désignez-les dans le calendrier natif ; aucun premier résultat choisi silencieusement.');
 const writtenDates=findDates(text,formatInTimeZone(at,post.timezone,'yyyy-MM-dd'));if(writtenDates.some(d=>!Number.isFinite(Date.parse(d+'T00:00:00Z'))||new Date(d+'T00:00:00Z').toISOString().slice(0,10)!==d))return question('Date de calendrier invalide ; précisez une date réelle. Aucun report automatique.');
 const after=plan.action==='move_weekday'?moveToWeekday(post.scheduled_at,post.timezone,plan.weekday!,plan.time):movedAt(post.scheduled_at,post.timezone,{days:plan.days,ymd:plan.ymd,time:plan.time});
 if(plan.time&&(formatInTimeZone(after,post.timezone,'HH:mm')!==plan.time||[-3600000,3600000].some(delta=>formatInTimeZone(after+delta,post.timezone,'yyyy-MM-dd HH:mm')===formatInTimeZone(after,post.timezone,'yyyy-MM-dd HH:mm'))))return question('Cette heure est inexistante ou ambiguë lors du changement d’heure dans ce fuseau. Choisissez une heure non ambiguë ; aucune conversion silencieuse.');
 const why=moveRefusal(c.project_id!,post.id,after);if(why)return question(why+' ; aucune date modifiée.');if(after===post.scheduled_at)return question('Cette date est déjà enregistrée ; aucun changement.');
 const p:CalendarProposal={id:id(),postId:post.id,fingerprint:fingerprint(c.project_id!),before:post.scheduled_at,after,timezone:post.timezone,expiresAt:at+15*60000};m.localCalendarProposal=p;
 return present(c,'proposed','Vérifiez la date et le fuseau de ce brouillon. Après accord gratuit, seule sa date éditoriale locale changera. Aucun contenu approuvé, programmé ou envoyé.',{proposalId:p.id,target:{postId:post.id,title:post.title,status:post.status,timezone:post.timezone},diff:{before:p.before,after:p.after},confirmationRequired:true,nativeHref:`/studio/${c.project_id}/calendrier`});
}
export function confirmLocalCalendar(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):CalendarPresentation{
 const project=owned(user,c,m),p=m.localCalendarProposal;if(!p||p.id!==proposalId||p.expiresAt<now()||p.fingerprint!==fingerprint(project.id))throw new HttpError(409,'Le calendrier ou la proposition a changé. Préparez un nouvel accord gratuit.');
 const before=one<Post>('SELECT * FROM posts WHERE id=? AND project_id=?',p.postId,project.id);if(!before||!['planned','draft','review'].includes(before.status)||before.scheduled_at!==p.before||before.timezone!==p.timezone)throw new HttpError(409,'Ce brouillon a changé.');
 try{editPostV2(project,p.postId,{scheduledAt:p.after});}catch(e){throw new HttpError(409,(e as Error).message);}
 const after=one<Post>('SELECT * FROM posts WHERE id=? AND project_id=?',p.postId,project.id)!;
 if(stableHash('calendar-readback',after)!==stableHash('calendar-readback',{...before,scheduled_at:p.after,updated_at:after.updated_at}))throw new HttpError(409,'Date éditoriale non confirmée.');
 delete m.localCalendarProposal;return present(c,'applied','Date éditoriale du brouillon enregistrée et relue. Contenu, médias, statut et approbation conservés. Aucun appel fournisseur, programmation ni envoi.',{proposalId:p.id,target:{postId:after.id,title:after.title,status:after.status,timezone:after.timezone},diff:{before:p.before,after:p.after},receiptId:requestId,actionsExecuted:true,nativeHref:`/studio/${project.id}/calendrier`});
}
